-- Atendente WhatsApp: pedidos, orçamentos e agendamentos fechados pela IA
create table if not exists public.whatsapp_pedidos (
  id uuid primary key default gen_random_uuid(),
  codigo bigint generated always as identity,
  user_id uuid not null references auth.users(id) on delete cascade,
  conversa_id uuid references public.whatsapp_conversas(id) on delete set null,
  tipo text not null default 'pedido' check (tipo in ('pedido', 'orcamento', 'agendamento')),
  status text not null default 'aberto' check (status in ('aberto', 'visto', 'concluido', 'cancelado')),
  confirmado boolean not null default false,
  cliente_nome text,
  cliente_numero text,
  itens jsonb not null default '[]'::jsonb,
  total text,
  entrega text,
  endereco text,
  pagamento text,
  observacao text,
  servico text,
  quando timestamptz,
  duracao_min int,
  origem text not null default 'whatsapp' check (origem in ('whatsapp', 'manual')),
  created_at timestamptz not null default now(),
  visto_em timestamptz
);
create index if not exists whatsapp_pedidos_user_idx on public.whatsapp_pedidos (user_id, created_at desc);
create index if not exists whatsapp_pedidos_agenda_idx on public.whatsapp_pedidos (user_id, quando) where tipo = 'agendamento';

alter table public.whatsapp_pedidos enable row level security;
create policy "dono vê seus pedidos" on public.whatsapp_pedidos for select using (user_id = auth.uid());
create policy "dono atualiza seus pedidos" on public.whatsapp_pedidos for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "dono apaga seus pedidos" on public.whatsapp_pedidos for delete using (user_id = auth.uid());
-- o dono pode lançar horário na agenda na mão (a IA lança pelo servidor)
create policy "dono lança na agenda" on public.whatsapp_pedidos for insert with check (user_id = auth.uid() and origem = 'manual');

alter publication supabase_realtime add table public.whatsapp_pedidos;
