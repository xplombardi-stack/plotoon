-- Boneco gerado por IA: os créditos são cobrados na geração (pela função "boneco"), salvar no elenco é grátis.

-- a função do servidor pode cobrar e devolver créditos
grant execute on function public.spend_credits(uuid, integer, text, uuid) to service_role;

create or replace function public.refund_credits(p_user uuid, p_amount integer, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_amount <= 0 then return; end if;
  update public.profiles set credits = credits + p_amount where id = p_user;
  insert into public.credit_transactions (user_id, amount, reason) values (p_user, p_amount, p_reason);
end;
$$;
revoke execute on function public.refund_credits(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.refund_credits(uuid, integer, text) to service_role;

-- salvar personagem: agora com a imagem do boneco e sem cobrar
drop function if exists public.save_character(text, text, jsonb, text);

create or replace function public.save_character(p_name text, p_style text, p_look jsonb, p_photo_path text default null, p_image_path text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
begin
  if uid is null then raise exception 'nao_autenticado'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'nome_vazio'; end if;
  if p_photo_path is not null and split_part(p_photo_path, '/', 1) <> uid::text then raise exception 'foto_invalida'; end if;
  if p_image_path is not null and split_part(p_image_path, '/', 1) <> uid::text then raise exception 'imagem_invalida'; end if;
  insert into public.characters (user_id, name, style, look, photo_path, image_path)
  values (uid, upper(left(trim(p_name), 40)), p_style, p_look, p_photo_path, p_image_path)
  returning id into new_id;
  return new_id;
end;
$$;
revoke execute on function public.save_character(text, text, jsonb, text, text) from public, anon;
grant execute on function public.save_character(text, text, jsonb, text, text) to authenticated;

update public.settings set description = 'Créditos pra gerar 1 boneco' where key = 'credits_per_character';
