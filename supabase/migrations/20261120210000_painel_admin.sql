-- Painel Admin: quem é admin, custos das APIs, uso real de IA, planos/pacotes e leitura geral pro admin

-- 1) admins (tabela fechada: ninguém lê nem escreve pelo app; só o servidor)
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select exists (select 1 from public.admins where user_id = (select auth.uid())) $$;
grant execute on function public.is_admin() to authenticated;

-- o Felipe é o admin
insert into public.admins (user_id)
select id from auth.users where lower(email) = 'lombardimsp@gmail.com'
on conflict do nothing;

-- 2) custo de cada API por geração (editável no painel)
create table if not exists public.api_costs (
  key text primary key,
  label text not null,
  unidade text not null default 'por geração',
  custo_brl numeric(12, 4) not null default 0,
  acao text, -- chave do preço em créditos (settings) que essa geração usa
  updated_at timestamptz not null default now()
);
alter table public.api_costs enable row level security;
create policy "api_costs: admin le" on public.api_costs for select using (public.is_admin());
create policy "api_costs: admin edita" on public.api_costs for update using (public.is_admin()) with check (public.is_admin());
create policy "api_costs: admin cria" on public.api_costs for insert with check (public.is_admin());
create policy "api_costs: admin apaga" on public.api_costs for delete using (public.is_admin());

insert into public.api_costs (key, label, unidade, custo_brl, acao) values
  ('mentor', 'Mentor (Claude)', 'por mensagem', 0.12, 'credits_per_mentor'),
  ('mentor_prints', 'Mentor lendo prints (Claude)', 'por mensagem', 0.25, 'credits_per_mentor_images'),
  ('copy', 'Copy (Claude)', 'por geração', 0.06, 'credits_per_copy'),
  ('calendario', 'Calendário do mês (Claude)', 'por geração', 0.30, 'credits_per_plan'),
  ('app', 'Criador de apps (Claude)', 'por geração', 0.90, 'credits_per_app'),
  ('imagem', 'Imagem (Gemini)', 'por imagem', 0.25, 'credits_per_image'),
  ('logo', 'Logo (Gemini)', 'por geração', 0.50, 'credits_per_logo'),
  ('boneco', 'Boneco 3D (Gemini)', 'por geração', 0.50, 'credits_per_character'),
  ('video_produto', 'Vídeo modelo (Claude)', 'por geração', 0.15, 'credits_per_product_video'),
  ('video_ia', 'Vídeo do produto feito do zero (Claude)', 'por segundo de vídeo', 0.17, 'credits_per_video_second'),
  ('video_ia_ajuste', 'Ajuste de cena (Claude)', 'por ajuste', 0.70, 'credits_per_scene_fix'),
  ('historinha', 'Historinha com boneco (vídeo)', 'por segundo de vídeo', 0.90, 'credits_per_second')
on conflict (key) do nothing;

-- 3) uso real de IA (as funções do servidor registram tokens e custo de verdade)
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  modulo text not null,
  ref text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  custo_usd numeric(12, 5) not null default 0,
  creditos integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_data on public.ai_usage (created_at desc);
alter table public.ai_usage enable row level security;
create policy "ai_usage: admin le" on public.ai_usage for select using (public.is_admin());

-- 4) planos e pacotes (preço e créditos) pra calcular a margem
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('plano', 'pacote')),
  nome text not null,
  preco_brl numeric(10, 2) not null default 0,
  creditos integer not null default 0,
  cakto_id text,
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.offers enable row level security;
create policy "offers: todos veem os ativos" on public.offers for select using (ativo or public.is_admin());
create policy "offers: admin edita" on public.offers for update using (public.is_admin()) with check (public.is_admin());
create policy "offers: admin cria" on public.offers for insert with check (public.is_admin());
create policy "offers: admin apaga" on public.offers for delete using (public.is_admin());

-- 5) pagamentos (a Cakto preenche quando estiver ligada)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  provider text not null default 'cakto',
  provider_id text,
  offer_id uuid references public.offers(id) on delete set null,
  descricao text,
  valor_brl numeric(10, 2) not null default 0,
  status text not null default 'pago',
  created_at timestamptz not null default now()
);
create unique index if not exists payments_provider_id on public.payments (provider, provider_id) where provider_id is not null;
alter table public.payments enable row level security;
create policy "payments: admin le" on public.payments for select using (public.is_admin());
create policy "payments: dono le" on public.payments for select using ((select auth.uid()) = user_id);

-- 6) admin lê tudo que precisa e edita os preços
create policy "profiles: admin le" on public.profiles for select using (public.is_admin());
create policy "credit_transactions: admin le" on public.credit_transactions for select using (public.is_admin());
create policy "subscriptions: admin le" on public.subscriptions for select using (public.is_admin());
create policy "settings: admin edita" on public.settings for update using (public.is_admin()) with check (public.is_admin());

-- novos preços: vídeo feito do zero cobra por segundo; ajuste de cena 3; bônus de indicação; valor de referência do crédito
insert into public.settings (key, value, description) values
  ('credits_per_video_second', 1, 'Vídeo do produto feito do zero: créditos por segundo'),
  ('referral_bonus', 50, 'Indique e ganhe: créditos pra quem indicou, quando o indicado paga'),
  ('credit_value_cents', 20, 'Valor de referência de 1 crédito, em centavos (usado quando não há pacote cadastrado)')
on conflict (key) do nothing;
update public.settings set value = 3 where key = 'credits_per_scene_fix';
update public.settings set description = coalesce(description, initcap(replace(key, '_', ' ')));

-- 7) resumo pro painel
create or replace function public.admin_users()
returns table (id uuid, email text, name text, plan text, credits integer, gasto bigint, comprado bigint, created_at timestamptz, ultimo_uso timestamptz, admin boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'sem_permissao'; end if;
  return query
  select p.id, u.email::text, p.name, p.plan, p.credits,
    coalesce((select -sum(t.amount) from credit_transactions t where t.user_id = p.id and t.amount < 0), 0)::bigint,
    coalesce((select sum(t.amount) from credit_transactions t where t.user_id = p.id and t.amount > 0), 0)::bigint,
    p.created_at,
    (select max(t.created_at) from credit_transactions t where t.user_id = p.id),
    exists (select 1 from admins a where a.user_id = p.id)
  from profiles p join auth.users u on u.id = p.id
  order by p.created_at desc;
end $$;
revoke execute on function public.admin_users() from public, anon;
grant execute on function public.admin_users() to authenticated;

-- módulo de cada lançamento de crédito, pelo motivo
create or replace function public.credit_module(r text)
returns text
language sql
immutable
as $$
  select case
    when r ilike 'Vídeo com IA%' then 'Vídeo do produto'
    when r ilike 'Vídeo do produto%' then 'Vídeo modelo'
    when r ilike 'Mentor%' then 'Mentor'
    when r ilike 'Logo%' then 'Logo'
    when r ilike 'Imagem%' then 'Imagem'
    when r ilike 'Copy%' then 'Copy'
    when r ilike 'Calendário%' then 'Calendário'
    when r ilike 'App%' then 'Criador de apps'
    when r ilike 'Boneco%' or r ilike 'Personagem%' then 'Boneco 3D'
    when r ilike '%parte%' then 'Historinha'
    else 'Outros'
  end
$$;

create or replace function public.admin_consumo(p_dias integer default 30)
returns table (dia date, modulo text, creditos bigint, usos bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'sem_permissao'; end if;
  return query
  select (t.created_at at time zone 'America/Sao_Paulo')::date, public.credit_module(t.reason),
    sum(-t.amount)::bigint, -- devolução (positiva) desconta do gasto
    count(*) filter (where t.amount < 0)
  from credit_transactions t
  where t.created_at > now() - make_interval(days => greatest(1, least(p_dias, 365)))
    and (t.amount < 0 or t.reason ilike '%devolvid%')
  group by 1, 2
  order by 1 desc, 3 desc;
end $$;
revoke execute on function public.admin_consumo(integer) from public, anon;
grant execute on function public.admin_consumo(integer) to authenticated;

insert into public.settings (key, value, description) values ('usd_brl_cents', 550, 'Câmbio: quanto vale 1 dólar, em centavos de real (pra converter o custo real das IAs)') on conflict (key) do nothing;
