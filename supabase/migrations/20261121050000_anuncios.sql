-- Anúncios: conexão com a Meta (token só o servidor lê) e análises salvas
create table if not exists public.anuncios_conexoes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  meta_nome text,
  contas jsonb not null default '[]'::jsonb,
  conta_id text,
  conta_nome text,
  moeda text,
  expira_em timestamptz,
  atualizado_em timestamptz not null default now()
);
alter table public.anuncios_conexoes enable row level security;
create policy "dono vê sua conexão" on public.anuncios_conexoes for select using (user_id = auth.uid());

create table if not exists public.anuncios_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token text not null,
  criado_em timestamptz not null default now()
);
alter table public.anuncios_tokens enable row level security; -- sem políticas: ninguém lê pelo app

create table if not exists public.anuncios_analises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  origem text not null check (origem in ('meta', 'arquivo')),
  periodo text,
  conta_nome text,
  resultado jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists anuncios_analises_user_idx on public.anuncios_analises (user_id, created_at desc);
alter table public.anuncios_analises enable row level security;
create policy "dono vê suas análises" on public.anuncios_analises for select using (user_id = auth.uid());
create policy "dono apaga suas análises" on public.anuncios_analises for delete using (user_id = auth.uid());

insert into public.settings (key, value) values ('credits_per_ads_analysis', 5) on conflict (key) do nothing;
