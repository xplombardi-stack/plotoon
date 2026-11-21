-- Um só "tipo de negócio" por conta: Meu Negócio e o treino do Atendente ficam sempre iguais,
-- e o que a pessoa ensina no Atendente completa o perfil que todos os módulos usam.
alter table public.business_profiles add column if not exists tipo text;

create or replace function public.tipo_nome(t text, outro text) returns text language sql immutable as $$
  select case t
    when 'alimentacao' then 'Alimentação e delivery'
    when 'varejo' then 'Loja e varejo'
    when 'fabrica' then 'Fábrica e encomendas'
    when 'servicos' then 'Serviços com horário'
    when 'digital' then 'Digital e infoprodutos'
    when 'outro' then nullif(trim(coalesce(outro, '')), '')
    else null end
$$;

-- treino do atendente -> perfil do negócio
create or replace function public.sync_treino_para_perfil() returns trigger language plpgsql security definer set search_path = public as $$
declare
  t text := nullif(new.treino->>'nicho', '');
  prod text := nullif(trim(coalesce(new.treino->>'produtos', '')), '');
begin
  if t is null then return new; end if;
  insert into business_profiles (user_id, tipo) values (new.user_id, t)
  on conflict (user_id) do nothing;
  update business_profiles set
    tipo = t,
    niche = case when coalesce(trim(niche), '') = '' then coalesce(left(public.tipo_nome(t, new.treino->>'nicho_outro'), 60), niche) else niche end,
    sells = case when coalesce(trim(sells), '') = '' and prod is not null then left(prod, 400) else sells end
  where user_id = new.user_id and (tipo is distinct from t or coalesce(trim(niche), '') = '' or (coalesce(trim(sells), '') = '' and prod is not null));
  return new;
end $$;
drop trigger if exists treino_para_perfil on public.whatsapp_bots;
create trigger treino_para_perfil after insert or update of treino on public.whatsapp_bots
  for each row execute function public.sync_treino_para_perfil();

-- perfil do negócio -> treino do atendente
create or replace function public.sync_perfil_para_treino() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.tipo is null or new.tipo is not distinct from old.tipo then return new; end if;
  update whatsapp_bots set treino = jsonb_set(coalesce(treino, '{}'::jsonb), '{nicho}', to_jsonb(new.tipo))
  where user_id = new.user_id and coalesce(treino->>'nicho', '') is distinct from new.tipo;
  return new;
end $$;
drop trigger if exists perfil_para_treino on public.business_profiles;
create trigger perfil_para_treino after update of tipo on public.business_profiles
  for each row execute function public.sync_perfil_para_treino();

-- quem já tinha treinado o atendente
update business_profiles b set tipo = w.treino->>'nicho'
from whatsapp_bots w where w.user_id = b.user_id and coalesce(w.treino->>'nicho', '') <> '' and b.tipo is null;
