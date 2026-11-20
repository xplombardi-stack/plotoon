-- Vídeo com IA: cada filme é criado do zero (plano + código de cada cena)
create table if not exists public.video_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null default 'Vídeo',
  pedido jsonb not null default '{}'::jsonb,
  plano jsonb,
  cenas jsonb not null default '[]'::jsonb, -- [{code, geracoes}]
  fotos text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists video_projects_user on public.video_projects (user_id, updated_at desc);
alter table public.video_projects enable row level security;
create policy "video_ia: ver os meus" on public.video_projects for select using ((select auth.uid()) = user_id);
create policy "video_ia: apagar os meus" on public.video_projects for delete using ((select auth.uid()) = user_id);

insert into public.settings (key, value) values ('credits_per_custom_video', '15'), ('credits_per_scene_fix', '2')
on conflict (key) do nothing;

-- grava uma cena sem atropelar as outras (várias cenas são escritas ao mesmo tempo)
create or replace function public.video_set_cena(p_id uuid, p_i integer, p_code text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v jsonb; n int;
begin
  select cenas into v from video_projects where id = p_id for update;
  n := coalesce((v -> p_i ->> 'geracoes')::int, 0) + 1;
  while jsonb_array_length(coalesce(v, '[]'::jsonb)) <= p_i loop
    v := coalesce(v, '[]'::jsonb) || '{"code": null, "geracoes": 0}'::jsonb;
  end loop;
  v := jsonb_set(v, array[p_i::text], jsonb_build_object('code', p_code, 'geracoes', n));
  update video_projects set cenas = v, updated_at = now() where id = p_id;
end $function$;
revoke execute on function public.video_set_cena(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.video_set_cena(uuid, integer, text) to service_role;
