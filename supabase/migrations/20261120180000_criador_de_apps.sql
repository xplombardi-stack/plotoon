-- Criador de Apps: apps de uma página criados com o Claude, com link público quando publicados.
create table if not exists public.apps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default 'Meu app' check (char_length(name) <= 80),
  slug text not null unique default lower(substr(md5(gen_random_uuid()::text), 1, 10)),
  html text not null default '' check (char_length(html) <= 400000),
  messages jsonb not null default '[]'::jsonb,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists apps_user on public.apps (user_id, updated_at desc);
alter table public.apps enable row level security;
create policy "apps: ver os meus" on public.apps for select to authenticated using (user_id = (select auth.uid()));
create policy "apps: editar os meus" on public.apps for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "apps: apagar os meus" on public.apps for delete to authenticated using (user_id = (select auth.uid()));

-- página pública: só devolve app publicado, por slug
create or replace function public.app_publico(p_slug text)
returns table (name text, html text)
language sql stable security definer set search_path = ''
as $$ select a.name, a.html from public.apps a where a.slug = p_slug and a.published $$;
revoke all on function public.app_publico(text) from public;
grant execute on function public.app_publico(text) to anon, authenticated;

insert into public.settings (key, value) values ('credits_per_app', 8) on conflict (key) do nothing;
