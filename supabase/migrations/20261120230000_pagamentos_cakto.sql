-- Pagamentos da Cakto: créditos entram e saem sozinhos

alter table public.payments add column if not exists creditos integer not null default 0;
alter table public.payments add column if not exists evento text;
-- plano: start | estudio | pro (é o que fica no perfil)
alter table public.offers add column if not exists slug text;

-- entrada de créditos (compra, renovação, bônus)
create or replace function public.add_credits(p_user uuid, p_amount integer, p_reason text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if p_amount <= 0 then return; end if;
  update public.profiles set credits = credits + p_amount where id = p_user;
  insert into public.credit_transactions (user_id, amount, reason) values (p_user, p_amount, p_reason);
end $$;
revoke execute on function public.add_credits(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.add_credits(uuid, integer, text) to service_role;

-- saída por reembolso/chargeback: tira o que dá (nunca deixa negativo)
create or replace function public.remove_credits(p_user uuid, p_amount integer, p_reason text)
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare tirar integer;
begin
  select least(credits, greatest(p_amount, 0)) into tirar from public.profiles where id = p_user for update;
  if coalesce(tirar, 0) <= 0 then return 0; end if;
  update public.profiles set credits = credits - tirar where id = p_user;
  insert into public.credit_transactions (user_id, amount, reason) values (p_user, -tirar, p_reason);
  return tirar;
end $$;
revoke execute on function public.remove_credits(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.remove_credits(uuid, integer, text) to service_role;

-- quem pagou antes de ter conta: os créditos entram quando a pessoa entra com o mesmo e-mail
create or replace function public.claim_payments()
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare uid uuid := (select auth.uid()); mail text; r record; total integer := 0;
begin
  if uid is null then return 0; end if;
  select lower(email) into mail from auth.users where id = uid;
  for r in select * from public.payments where user_id is null and status = 'pendente_conta' and lower(email) = mail for update loop
    update public.payments set user_id = uid, status = 'pago' where id = r.id;
    perform public.add_credits(uid, r.creditos, coalesce(r.descricao, 'Compra na Cakto'));
    if r.offer_id is not null then
      update public.profiles p set plan = o.slug from public.offers o where o.id = r.offer_id and o.tipo = 'plano' and o.slug is not null and p.id = uid;
    end if;
    total := total + r.creditos;
  end loop;
  return total;
end $$;
revoke execute on function public.claim_payments() from public, anon;
grant execute on function public.claim_payments() to authenticated;

-- o webhook acha a conta pelo e-mail do comprador
create or replace function public.user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path to ''
as $$ select id from auth.users where lower(email) = lower(trim(p_email)) limit 1 $$;
revoke execute on function public.user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.user_id_by_email(text) to service_role;
