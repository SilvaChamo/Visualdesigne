-- Pedidos de transferência de domínio (de outro registador para nós),
-- para mostrar ao cliente a trajectória: pending -> submitted -> waiting -> completed/rejected.
create table if not exists domain_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  domain_name text not null,
  status text not null default 'pending', -- pending | submitted | waiting | completed | rejected | failed
  dynadot_order_id text,
  error_message text,
  years integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_domain_transfer_requests_user on domain_transfer_requests(user_id);
