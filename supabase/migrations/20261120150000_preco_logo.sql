-- Preço da logo com IA (em créditos)
insert into public.settings (key, value) values ('credits_per_logo', 5) on conflict (key) do nothing;
