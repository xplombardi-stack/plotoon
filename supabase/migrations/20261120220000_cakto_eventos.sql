-- Avisos da Cakto guardados como chegaram (pra conferir e processar)
create table if not exists public.cakto_events (
  id uuid primary key default gen_random_uuid(),
  event text,
  valido boolean not null default false,
  raw jsonb not null,
  processado boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.cakto_events enable row level security;
create policy "cakto_events: admin le" on public.cakto_events for select using (public.is_admin());
