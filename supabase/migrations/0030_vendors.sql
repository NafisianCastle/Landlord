-- Vendor/contractor directory, owner-scoped (not per-property — a vendor can
-- be reused across many plots/apartments via maintenance_requests.vendor_id).

create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  trade text,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

alter table vendors enable row level security;

drop policy if exists "vendors_select_own" on vendors;
create policy "vendors_select_own" on vendors for select using (auth.uid() = user_id);
drop policy if exists "vendors_insert_own" on vendors;
create policy "vendors_insert_own" on vendors for insert with check (auth.uid() = user_id);
drop policy if exists "vendors_update_own" on vendors;
create policy "vendors_update_own" on vendors for update using (auth.uid() = user_id);
drop policy if exists "vendors_delete_own" on vendors;
create policy "vendors_delete_own" on vendors for delete using (auth.uid() = user_id);

create index if not exists vendors_user_idx on vendors (user_id);

alter table maintenance_requests add column if not exists vendor_id uuid references vendors(id) on delete set null;
create index if not exists maintenance_requests_vendor_idx on maintenance_requests (vendor_id);
