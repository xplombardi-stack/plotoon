-- Vídeo do produto (roteiro pelo Claude, vídeo montado no navegador) e diagnóstico do Instagram no Mentor.
insert into public.settings (key, value) values ('credits_per_product_video', 3)
on conflict (key) do update set value = excluded.value;

alter table public.mentor_messages add column if not exists diagnostico jsonb;
