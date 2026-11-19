-- Plotoon: estrutura inicial (já aplicada no projeto Supabase "plotoon")

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- PERFIS
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  avatar_url text,
  plan text not null default 'nenhum' check (plan in ('nenhum', 'flow', 'estudio', 'pro')),
  credits integer not null default 0 check (credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ELENCO
create table public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  role text,
  style text not null default 'cinema' check (style in ('cinema', 'fofinho', 'realista')),
  description text,
  photo_path text,
  image_path text,
  face_locked boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index characters_user_id_idx on public.characters (user_id);
create trigger characters_updated_at before update on public.characters for each row execute function public.set_updated_at();

-- HISTORINHAS
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  idea text,
  status text not null default 'rascunho' check (status in ('rascunho', 'gerando', 'pronto', 'erro')),
  mode text not null default 'estudio' check (mode in ('estudio', 'flow')),
  duration_seconds integer check (duration_seconds is null or duration_seconds between 5 and 180),
  music text,
  final_phrase text,
  video_path text,
  thumbnail_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index stories_user_id_idx on public.stories (user_id);
create trigger stories_updated_at before update on public.stories for each row execute function public.set_updated_at();

create table public.story_characters (
  story_id uuid not null references public.stories (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  primary key (story_id, character_id)
);
create index story_characters_character_id_idx on public.story_characters (character_id);

-- CENAS
create table public.scenes (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position integer not null,
  beat text,
  dialogue text,
  caption text,
  flow_prompt text,
  duration_seconds numeric(5, 2),
  status text not null default 'rascunho' check (status in ('rascunho', 'gerando', 'pronta', 'erro')),
  resolution text check (resolution is null or resolution in ('360p', '720p', '1080p')),
  clip_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (story_id, position)
);
create index scenes_user_id_idx on public.scenes (user_id);
create trigger scenes_updated_at before update on public.scenes for each row execute function public.set_updated_at();

-- CONVERSA COM O DIRETOR
create table public.director_messages (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'director')),
  content text not null,
  actions jsonb,
  created_at timestamptz not null default now()
);
create index director_messages_story_id_idx on public.director_messages (story_id);
create index director_messages_user_id_idx on public.director_messages (user_id);

-- CRÉDITOS (só o servidor escreve)
create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null,
  reason text not null,
  story_id uuid references public.stories (id) on delete set null,
  created_at timestamptz not null default now()
);
create index credit_transactions_user_id_idx on public.credit_transactions (user_id);
create index credit_transactions_story_id_idx on public.credit_transactions (story_id);

-- ASSINATURAS CAKTO (só o servidor escreve)
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text,
  provider text not null default 'cakto',
  provider_subscription_id text unique,
  plan text not null check (plan in ('flow', 'estudio', 'pro')),
  status text not null check (status in ('ativa', 'cancelada', 'atrasada')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_user_id_idx on public.subscriptions (user_id);
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

-- AULAS
create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  position integer not null,
  title text not null,
  cover_path text,
  created_at timestamptz not null default now()
);
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules (id) on delete cascade,
  position integer not null,
  title text not null,
  video_url text,
  duration_seconds integer,
  created_at timestamptz not null default now()
);
create index lessons_module_id_idx on public.lessons (module_id);
create table public.lesson_progress (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index lesson_progress_lesson_id_idx on public.lesson_progress (lesson_id);

-- SEGURANÇA (RLS)
alter table public.profiles enable row level security;
alter table public.characters enable row level security;
alter table public.stories enable row level security;
alter table public.story_characters enable row level security;
alter table public.scenes enable row level security;
alter table public.director_messages enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.subscriptions enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;

create policy "perfil: ver o meu" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "perfil: editar o meu" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated, anon;
grant update (name, avatar_url) on public.profiles to authenticated;

create policy "elenco: ver o meu" on public.characters for select to authenticated using (user_id = (select auth.uid()));
create policy "elenco: criar" on public.characters for insert to authenticated with check (user_id = (select auth.uid()));
create policy "elenco: editar o meu" on public.characters for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "elenco: apagar o meu" on public.characters for delete to authenticated using (user_id = (select auth.uid()));

create policy "historinhas: ver as minhas" on public.stories for select to authenticated using (user_id = (select auth.uid()));
create policy "historinhas: criar" on public.stories for insert to authenticated with check (user_id = (select auth.uid()));
create policy "historinhas: editar as minhas" on public.stories for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "historinhas: apagar as minhas" on public.stories for delete to authenticated using (user_id = (select auth.uid()));

create policy "elenco da historinha: ver" on public.story_characters for select to authenticated
using (exists (select 1 from public.stories s where s.id = story_id and s.user_id = (select auth.uid())));
create policy "elenco da historinha: adicionar" on public.story_characters for insert to authenticated
with check (
  exists (select 1 from public.stories s where s.id = story_id and s.user_id = (select auth.uid()))
  and exists (select 1 from public.characters c where c.id = character_id and c.user_id = (select auth.uid()))
);
create policy "elenco da historinha: remover" on public.story_characters for delete to authenticated
using (exists (select 1 from public.stories s where s.id = story_id and s.user_id = (select auth.uid())));

create policy "cenas: ver as minhas" on public.scenes for select to authenticated using (user_id = (select auth.uid()));
create policy "cenas: criar" on public.scenes for insert to authenticated
with check (user_id = (select auth.uid()) and exists (select 1 from public.stories s where s.id = story_id and s.user_id = (select auth.uid())));
create policy "cenas: editar as minhas" on public.scenes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "cenas: apagar as minhas" on public.scenes for delete to authenticated using (user_id = (select auth.uid()));

create policy "diretor: ver a minha conversa" on public.director_messages for select to authenticated using (user_id = (select auth.uid()));
create policy "diretor: mandar mensagem" on public.director_messages for insert to authenticated
with check (user_id = (select auth.uid()) and role = 'user' and exists (select 1 from public.stories s where s.id = story_id and s.user_id = (select auth.uid())));

create policy "créditos: ver o meu extrato" on public.credit_transactions for select to authenticated using (user_id = (select auth.uid()));
create policy "assinatura: ver a minha" on public.subscriptions for select to authenticated using (user_id = (select auth.uid()));

create policy "aulas: ver módulos" on public.course_modules for select to authenticated using (true);
create policy "aulas: ver aulas" on public.lessons for select to authenticated using (true);
create policy "progresso: ver o meu" on public.lesson_progress for select to authenticated using (user_id = (select auth.uid()));
create policy "progresso: marcar" on public.lesson_progress for insert to authenticated with check (user_id = (select auth.uid()));
create policy "progresso: desmarcar" on public.lesson_progress for delete to authenticated using (user_id = (select auth.uid()));

-- ARMAZENAMENTO: pasta privada media/<user_id>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 524288000,
  array['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm', 'audio/mpeg'])
on conflict (id) do nothing;

create policy "media: ver os meus arquivos" on storage.objects for select to authenticated
using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "media: enviar arquivos" on storage.objects for insert to authenticated
with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "media: trocar os meus arquivos" on storage.objects for update to authenticated
using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "media: apagar os meus arquivos" on storage.objects for delete to authenticated
using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- a função de cadastro só roda pelo gatilho do login
revoke execute on function public.handle_new_user() from public, anon, authenticated;
