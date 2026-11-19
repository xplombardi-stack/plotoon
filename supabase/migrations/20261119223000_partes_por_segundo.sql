-- Partes de 10s ou 15s, até 10 partes, crédito cobrado por segundo de vídeo.
insert into public.settings (key, value, description) values
  ('credits_per_second', 3, 'Créditos por segundo de vídeo gerado'),
  ('max_seconds_per_part', 15, 'Máximo de segundos por parte')
on conflict (key) do update set value = excluded.value, description = excluded.description;
update public.settings set value = 10 where key = 'max_parts';

alter table public.stories drop constraint if exists stories_parts_count_check;
alter table public.stories add constraint stories_parts_count_check check (parts_count is null or parts_count between 1 and 20);

drop function if exists public.create_story(text, text, text, uuid[], jsonb);

create or replace function public.create_story(p_title text, p_idea text, p_tone text, p_character_ids uuid[], p_parts jsonb, p_seconds integer default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  n integer := jsonb_array_length(p_parts);
  secs integer := coalesce(p_seconds, public.setting('seconds_per_part'));
  per_second integer := coalesce(public.setting('credits_per_second'), 3);
  sid uuid;
  p jsonb;
  i integer := 0;
begin
  if uid is null then raise exception 'nao_autenticado'; end if;
  if n < 1 or n > public.setting('max_parts') then raise exception 'partes_invalidas'; end if;
  if secs < 4 or secs > coalesce(public.setting('max_seconds_per_part'), 15) then raise exception 'duracao_invalida'; end if;
  if coalesce(array_length(p_character_ids, 1), 0) = 0 then raise exception 'sem_elenco'; end if;
  if exists (
    select 1 from unnest(p_character_ids) as c(id)
    where not exists (select 1 from public.characters ch where ch.id = c.id and ch.user_id = uid)
  ) then raise exception 'personagem_invalido'; end if;

  insert into public.stories (user_id, title, idea, tone, status, parts_count, duration_seconds)
  values (uid, left(coalesce(nullif(trim(p_title), ''), 'Nova historinha'), 120), left(p_idea, 600), p_tone, 'gerando', n, n * secs)
  returning id into sid;

  perform public.spend_credits(uid, n * secs * per_second, n || ' partes de ' || secs || 's · ' || left(coalesce(p_title, ''), 60), sid);

  insert into public.story_characters (story_id, character_id) select sid, c from unnest(p_character_ids) as c;

  for p in select value from jsonb_array_elements(p_parts) loop
    i := i + 1;
    insert into public.scenes (story_id, user_id, position, beat, description, dialogue, caption, prompt, backdrop, duration_seconds, status)
    values (sid, uid, i, left(p ->> 'beat', 40), left(p ->> 'scene', 600), left(p ->> 'fala', 300), left(p ->> 'fala', 300), left(p ->> 'prompt', 4000), p ->> 'backdrop', secs, 'gerando');
  end loop;
  return sid;
end;
$$;

-- refazer custa o mesmo que a parte (segundos x créditos por segundo)
create or replace function public.redo_part(p_story uuid, p_position integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  secs numeric;
begin
  if uid is null then raise exception 'nao_autenticado'; end if;
  select duration_seconds into secs from public.scenes where story_id = p_story and position = p_position and user_id = uid;
  if not found then raise exception 'parte_invalida'; end if;
  perform public.spend_credits(uid, (ceil(coalesce(secs, public.setting('seconds_per_part'))) * coalesce(public.setting('credits_per_second'), 3))::integer, 'Refazer parte ' || p_position, p_story);
  update public.scenes set status = 'gerando' where story_id = p_story and position = p_position;
  update public.stories set status = 'gerando' where id = p_story;
end;
$$;

revoke execute on function public.create_story(text, text, text, uuid[], jsonb, integer) from public, anon;
grant execute on function public.create_story(text, text, text, uuid[], jsonb, integer) to authenticated;
revoke execute on function public.redo_part(uuid, integer) from public, anon;
grant execute on function public.redo_part(uuid, integer) to authenticated;
