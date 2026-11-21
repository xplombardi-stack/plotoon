-- Atendente WhatsApp: remarketing automático (pós-pedido, quem não fechou, chamar de volta)
create table if not exists public.whatsapp_remarketing (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversa_id uuid not null references public.whatsapp_conversas(id) on delete cascade,
  gatilho text not null check (gatilho in ('pos_pedido', 'sem_resposta', 'voltar')),
  ref text not null default '',
  texto text,
  enviado_em timestamptz not null default now(),
  unique (conversa_id, gatilho, ref)
);
create index if not exists whatsapp_remarketing_user_idx on public.whatsapp_remarketing (user_id, enviado_em desc);
alter table public.whatsapp_remarketing enable row level security;
create policy "dono vê seus envios" on public.whatsapp_remarketing for select using (user_id = auth.uid());

-- segredos internos (só o servidor lê; nenhuma política = ninguém pelo app)
create table if not exists public.app_segredos (chave text primary key, valor text not null);
alter table public.app_segredos enable row level security;
insert into public.app_segredos (chave, valor) values ('cron_whatsapp', encode(gen_random_bytes(24), 'hex')) on conflict (chave) do nothing;

-- a cada 10 minutos o servidor vê quem precisa receber mensagem
create extension if not exists pg_cron;
select cron.unschedule('whatsapp-remarketing') where exists (select 1 from cron.job where jobname = 'whatsapp-remarketing');
select cron.schedule(
  'whatsapp-remarketing',
  '*/10 * * * *',
  $$select net.http_post(
      url := 'https://unjwtgplrrmjahrdgjim.supabase.co/functions/v1/whatsapp?cron=1',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron', (select valor from public.app_segredos where chave = 'cron_whatsapp')),
      body := '{"acao":"remarketing"}'::jsonb,
      timeout_milliseconds := 5000
  )$$
);
