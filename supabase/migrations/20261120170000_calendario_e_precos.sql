-- Fase 4 (parte): calendário de posts planejado pelo Mentor, e preços de imagem e planejamento.
create table if not exists public.calendar_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  kind text not null default 'video' check (kind in ('video', 'post', 'copy', 'story')),
  channel text not null default 'Instagram' check (char_length(channel) <= 30),
  title text not null check (char_length(title) <= 160),
  idea text not null default '' check (char_length(idea) <= 1000),
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists calendar_posts_user_day on public.calendar_posts (user_id, day);
alter table public.calendar_posts enable row level security;
create policy "calendario: ver os meus" on public.calendar_posts for select to authenticated using (user_id = (select auth.uid()));
create policy "calendario: criar os meus" on public.calendar_posts for insert to authenticated with check (user_id = (select auth.uid()));
create policy "calendario: editar os meus" on public.calendar_posts for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "calendario: apagar os meus" on public.calendar_posts for delete to authenticated using (user_id = (select auth.uid()));

insert into public.settings (key, value) values ('credits_per_image', 2), ('credits_per_plan', 3)
on conflict (key) do nothing;
