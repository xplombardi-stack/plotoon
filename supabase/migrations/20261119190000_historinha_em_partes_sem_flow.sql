-- Gera só dentro do Plotoon (sai o modo Flow) e historinha passa a ser em partes
alter table public.scenes rename column flow_prompt to prompt;
comment on table public.scenes is 'Partes da historinha (Parte 1, Parte 2...). position = número da parte.';
comment on column public.scenes.prompt is 'Prompt da parte, escrito pelo Diretor (Claude).';

alter table public.stories drop column mode;
alter table public.stories add column tone text;
alter table public.stories add column parts_count integer check (parts_count is null or parts_count between 1 and 12);

alter table public.profiles drop constraint profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check check (plan in ('nenhum', 'start', 'estudio', 'pro'));

alter table public.subscriptions drop constraint subscriptions_plan_check;
alter table public.subscriptions add constraint subscriptions_plan_check check (plan in ('start', 'estudio', 'pro'));
