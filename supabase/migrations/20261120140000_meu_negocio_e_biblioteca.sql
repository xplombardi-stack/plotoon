-- Fase 1 do Estúdio: perfil do negócio (lido por todos os módulos) e Biblioteca (tudo que for gerado).

create table if not exists public.business_profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 80),
  niche text not null default '' check (char_length(niche) <= 60),
  sells text not null default '' check (char_length(sells) <= 400),
  audience text not null default '' check (char_length(audience) <= 400),
  tone text not null default '' check (char_length(tone) <= 40),
  logo_path text check (logo_path is null or char_length(logo_path) <= 300),
  colors text[] not null default '{}' check (cardinality(colors) <= 6),
  socials jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_profiles enable row level security;

create policy "negocio: ver o meu" on public.business_profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "negocio: criar o meu" on public.business_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "negocio: editar o meu" on public.business_profiles
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger business_profiles_touch before update on public.business_profiles
  for each row execute function public.touch_updated_at();

-- Biblioteca: cada coisa gerada por qualquer módulo vira um item aqui.
create table if not exists public.library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('video', 'historinha', 'imagem', 'corte', 'copy', 'personagem', 'avatar')),
  module text not null default '' check (char_length(module) <= 40),
  title text not null default '' check (char_length(title) <= 160),
  preview_path text check (preview_path is null or char_length(preview_path) <= 300),
  file_path text check (file_path is null or char_length(file_path) <= 300),
  body text check (body is null or char_length(body) <= 20000),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists library_items_user_created on public.library_items (user_id, created_at desc);

alter table public.library_items enable row level security;

create policy "biblioteca: ver os meus" on public.library_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "biblioteca: criar os meus" on public.library_items
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "biblioteca: editar os meus" on public.library_items
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "biblioteca: apagar os meus" on public.library_items
  for delete to authenticated using (user_id = (select auth.uid()));
