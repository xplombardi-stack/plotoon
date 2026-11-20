-- Atendente WhatsApp: um número por conta (QR code via Evolution API), treino, conversas e mensagens

create table if not exists public.whatsapp_bots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  instance text not null unique,
  status text not null default 'desconectado' check (status in ('desconectado', 'aguardando_qr', 'conectado')),
  numero text,
  nome_perfil text,
  qr text,
  ativo boolean not null default true, -- IA respondendo
  treino jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.whatsapp_bots enable row level security;
create policy "whatsapp_bots: dono le" on public.whatsapp_bots for select using ((select auth.uid()) = user_id);
create policy "whatsapp_bots: dono edita" on public.whatsapp_bots for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table if not exists public.whatsapp_conversas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  jid text not null,
  nome text,
  ultima_msg text,
  ultima_em timestamptz not null default now(),
  ia_pausada boolean not null default false,
  precisa_dono boolean not null default false,
  nao_lidas integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, jid)
);
create index if not exists whatsapp_conversas_lista on public.whatsapp_conversas (user_id, ultima_em desc);
alter table public.whatsapp_conversas enable row level security;
create policy "whatsapp_conversas: dono le" on public.whatsapp_conversas for select using ((select auth.uid()) = user_id);
create policy "whatsapp_conversas: dono edita" on public.whatsapp_conversas for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table if not exists public.whatsapp_mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.whatsapp_conversas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  de text not null check (de in ('cliente', 'ia', 'dono')),
  texto text not null default '',
  tipo text not null default 'texto',
  wa_id text,
  created_at timestamptz not null default now()
);
create index if not exists whatsapp_mensagens_conversa on public.whatsapp_mensagens (conversa_id, created_at);
create unique index if not exists whatsapp_mensagens_wa on public.whatsapp_mensagens (user_id, wa_id) where wa_id is not null;
alter table public.whatsapp_mensagens enable row level security;
create policy "whatsapp_mensagens: dono le" on public.whatsapp_mensagens for select using ((select auth.uid()) = user_id);

-- tempo real na caixa de conversas
do $$ begin
  alter publication supabase_realtime add table public.whatsapp_conversas;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.whatsapp_mensagens;
exception when others then null; end $$;

-- preço e custo
insert into public.settings (key, value, description) values ('credits_per_whatsapp_reply', 1, 'Atendente WhatsApp: créditos por resposta da IA')
on conflict (key) do nothing;
insert into public.api_costs (key, label, unidade, custo_brl, acao) values ('whatsapp', 'Atendente WhatsApp (Claude)', 'por resposta', 0.07, 'credits_per_whatsapp_reply')
on conflict (key) do nothing;

-- o dono pode criar o próprio atendente (pra treinar e testar antes de conectar)
create policy "whatsapp_bots: dono cria" on public.whatsapp_bots for insert
  with check ((select auth.uid()) = user_id and instance = 'pl' || substr(replace(user_id::text, '-', ''), 1, 22));
