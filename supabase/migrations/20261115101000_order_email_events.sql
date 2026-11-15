create table if not exists public.order_email_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null check (event_type in ('confirmed','shipped','cancelled')),
  sent_at timestamptz not null default now(),
  unique (order_id,event_type)
);
alter table public.order_email_events enable row level security;
