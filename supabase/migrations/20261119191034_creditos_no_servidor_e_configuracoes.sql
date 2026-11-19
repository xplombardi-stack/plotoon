-- Tabela de configurações (preços em créditos). Edite os valores aqui.
create table public.settings (
  key text primary key,
  value integer not null,
  description text
);
alter table public.settings enable row level security;
create policy "configurações: qualquer um lê" on public.settings for select to anon, authenticated using (true);

insert into public.settings (key, value, description) values
  ('seconds_per_part', 10, 'Segundos por parte do vídeo'),
  ('max_parts', 6, 'Máximo de partes por historinha'),
  ('credits_per_part', 30, 'Créditos pra gerar 1 parte'),
  ('credits_redo_part', 30, 'Créditos pra refazer 1 parte'),
  ('credits_per_character', 5, 'Créditos pra criar 1 personagem'),
  ('welcome_credits', 0, 'Créditos que toda conta nova ganha');

create or replace function public.setting(k text)
returns integer language sql stable set search_path = '' as $$
  select value from public.settings where key = k
$$;

-- campos novos
alter table public.characters add column look jsonb;
alter table public.scenes add column description text;
alter table public.scenes add column backdrop text;

-- gasta créditos de forma segura (só outras funções do servidor chamam)
create or replace function public.spend_credits(p_user uuid, p_amount integer, p_reason text, p_story uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_amount <= 0 then return; end if;
  update public.profiles set credits = credits - p_amount where id = p_user and credits >= p_amount;
  if not found then
    raise exception 'creditos_insuficientes';
  end if;
  insert into public.credit_transactions (user_id, amount, reason, story_id) values (p_user, -p_amount, p_reason, p_story);
end;
$$;
revoke execute on function public.spend_credits(uuid, integer, text, uuid) from public, anon, authenticated;

-- criar personagem (desconta créditos)
create or replace function public.save_character(p_name text, p_style text, p_look jsonb, p_photo_path text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
begin
  if uid is null then raise exception 'nao_autenticado'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'nome_vazio'; end if;
  if p_photo_path is not null and split_part(p_photo_path, '/', 1) <> uid::text then raise exception 'foto_invalida'; end if;
  perform public.spend_credits(uid, public.setting('credits_per_character'), 'Personagem ' || upper(trim(p_name)), null);
  insert into public.characters (user_id, name, style, look, photo_path)
  values (uid, upper(left(trim(p_name), 40)), p_style, p_look, p_photo_path)
  returning id into new_id;
  return new_id;
end;
$$;

-- criar historinha em partes (desconta créditos de todas as partes)
create or replace function public.create_story(p_title text, p_idea text, p_tone text, p_character_ids uuid[], p_parts jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  n integer := jsonb_array_length(p_parts);
  secs integer := public.setting('seconds_per_part');
  sid uuid;
  p jsonb;
  i integer := 0;
begin
  if uid is null then raise exception 'nao_autenticado'; end if;
  if n < 1 or n > public.setting('max_parts') then raise exception 'partes_invalidas'; end if;
  if coalesce(array_length(p_character_ids, 1), 0) = 0 then raise exception 'sem_elenco'; end if;
  if exists (
    select 1 from unnest(p_character_ids) as c(id)
    where not exists (select 1 from public.characters ch where ch.id = c.id and ch.user_id = uid)
  ) then raise exception 'personagem_invalido'; end if;

  insert into public.stories (user_id, title, idea, tone, status, parts_count, duration_seconds)
  values (uid, left(coalesce(nullif(trim(p_title), ''), 'Nova historinha'), 120), left(p_idea, 600), p_tone, 'gerando', n, n * secs)
  returning id into sid;

  perform public.spend_credits(uid, n * public.setting('credits_per_part'), n || ' partes · ' || left(coalesce(p_title, ''), 60), sid);

  insert into public.story_characters (story_id, character_id) select sid, c from unnest(p_character_ids) as c;

  for p in select value from jsonb_array_elements(p_parts) loop
    i := i + 1;
    insert into public.scenes (story_id, user_id, position, beat, description, dialogue, caption, prompt, backdrop, duration_seconds, status)
    values (sid, uid, i, left(p ->> 'beat', 40), left(p ->> 'scene', 600), left(p ->> 'fala', 300), left(p ->> 'fala', 300), left(p ->> 'prompt', 4000), p ->> 'backdrop', secs, 'gerando');
  end loop;
  return sid;
end;
$$;

-- refazer uma parte (desconta créditos)
create or replace function public.redo_part(p_story uuid, p_position integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'nao_autenticado'; end if;
  if not exists (select 1 from public.scenes where story_id = p_story and position = p_position and user_id = uid) then
    raise exception 'parte_invalida';
  end if;
  perform public.spend_credits(uid, public.setting('credits_redo_part'), 'Refazer parte ' || p_position, p_story);
  update public.scenes set status = 'gerando' where story_id = p_story and position = p_position;
  update public.stories set status = 'gerando' where id = p_story;
end;
$$;

revoke execute on function public.save_character(text, text, jsonb, text) from public, anon;
revoke execute on function public.create_story(text, text, text, uuid[], jsonb) from public, anon;
revoke execute on function public.redo_part(uuid, integer) from public, anon;
grant execute on function public.save_character(text, text, jsonb, text) to authenticated;
grant execute on function public.create_story(text, text, text, uuid[], jsonb) to authenticated;
grant execute on function public.redo_part(uuid, integer) to authenticated;

-- conta nova ganha os créditos de boas-vindas (se tiver)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  bonus integer := coalesce(public.setting('welcome_credits'), 0);
begin
  insert into public.profiles (id, name, avatar_url, credits)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    bonus
  );
  if bonus > 0 then
    insert into public.credit_transactions (user_id, amount, reason) values (new.id, bonus, 'Boas-vindas');
  end if;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
