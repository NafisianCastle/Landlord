-- Lease/rent tracking, shared by both land_plots and apartments — the
-- tenant/rent/due-date/payment-ledger logic is identical regardless of
-- property type, so one table with a nullable FK to each is used instead of
-- duplicating it per property type (contrast with land_plots/apartments
-- themselves, which do differ enough to warrant separate tables).
--
-- Owner-only for now — not shared with plot/apartment editor-collaborators
-- (see 0015/0019_*_collaborators.sql); rent/tenant data is treated as the
-- owner's own financial record-keeping.

create table if not exists leases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plot_id uuid references land_plots(id) on delete cascade,
  apartment_id uuid references apartments(id) on delete cascade,
  tenant_name text not null,
  tenant_phone text,
  tenant_email text,
  rent_amount numeric not null,
  frequency text not null default 'monthly' check (frequency in ('monthly', 'quarterly', 'yearly')),
  start_date date not null,
  end_date date,
  status text not null default 'active' check (status in ('active', 'ended')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leases_exactly_one_subject check (
    (plot_id is not null and apartment_id is null) or (plot_id is null and apartment_id is not null)
  )
);

alter table leases enable row level security;

drop policy if exists "leases_select_own" on leases;
create policy "leases_select_own" on leases for select using (auth.uid() = user_id);
drop policy if exists "leases_insert_own" on leases;
create policy "leases_insert_own" on leases for insert with check (auth.uid() = user_id);
drop policy if exists "leases_update_own" on leases;
create policy "leases_update_own" on leases for update using (auth.uid() = user_id);
drop policy if exists "leases_delete_own" on leases;
create policy "leases_delete_own" on leases for delete using (auth.uid() = user_id);

create or replace function set_lease_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists on_lease_write on leases;
create trigger on_lease_write
  before insert or update on leases
  for each row execute function set_lease_timestamp();

create index if not exists leases_user_id_idx on leases (user_id);
create index if not exists leases_plot_id_idx on leases (plot_id);
create index if not exists leases_apartment_id_idx on leases (apartment_id);
