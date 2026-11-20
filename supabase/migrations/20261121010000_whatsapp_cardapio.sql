-- Atendente WhatsApp: preço da leitura de foto do cardápio
insert into settings(key, value) values ('credits_per_menu_photo', 2) on conflict (key) do nothing;
