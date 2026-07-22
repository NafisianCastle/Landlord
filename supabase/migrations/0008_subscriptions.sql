-- Subscription state + payment audit ledger. RLS grants users read-only
-- access to their own rows; writes only ever happen via the service-role
-- client in the SSLCommerz init/IPN routes, never directly from the client,
-- so subscription status can't be forged by a signed-in user.

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  plan_type text not null default 'lifetime',
  amount_paid numeric,
  currency text not null default 'BDT',
  sslcommerz_val_id text,
  sslcommerz_tran_id text,
  status text not null check (status in ('pending', 'completed', 'failed')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table subscriptions enable row level security;
create policy "subscriptions_select_own" on subscriptions for select using (auth.uid() = user_id);

create table payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tran_id text unique not null,
  val_id text,
  amount numeric not null,
  bank_tran_id text,
  card_type text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  raw_ipn_payload jsonb,
  created_at timestamptz not null default now()
);

alter table payment_transactions enable row level security;
create policy "payment_transactions_select_own" on payment_transactions for select using (auth.uid() = user_id);

create index payment_transactions_user_idx on payment_transactions (user_id);
