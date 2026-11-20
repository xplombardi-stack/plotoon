-- Fase 2: conversas com o Mentor e preços do Mentor e da Copy.

create table if not exists public.mentor_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default 'Nova conversa' check (char_length(title) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mentor_threads_user on public.mentor_threads (user_id, updated_at desc);

create table if not exists public.mentor_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.mentor_threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '' check (char_length(content) <= 20000),
  images text[] not null default '{}' check (cardinality(images) <= 4),
  actions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists mentor_messages_thread on public.mentor_messages (thread_id, created_at);

alter table public.mentor_threads enable row level security;
alter table public.mentor_messages enable row level security;

-- a pessoa vê, renomeia e apaga as próprias conversas; as mensagens são gravadas pela função do Mentor
create policy "mentor: ver minhas conversas" on public.mentor_threads for select to authenticated using (user_id = (select auth.uid()));
create policy "mentor: renomear minhas conversas" on public.mentor_threads for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "mentor: apagar minhas conversas" on public.mentor_threads for delete to authenticated using (user_id = (select auth.uid()));
create policy "mentor: ver minhas mensagens" on public.mentor_messages for select to authenticated using (user_id = (select auth.uid()));

insert into public.settings (key, value) values
  ('credits_per_mentor', 1),
  ('credits_per_mentor_images', 2),
  ('credits_per_copy', 1)
on conflict (key) do nothing;
