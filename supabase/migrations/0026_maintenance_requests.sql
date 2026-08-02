-- Repair/maintenance request log, one per plot or apartment (mirrors leases'
-- plot_id/apartment_id subject pattern).

create table if not exists maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plot_id uuid references land_plots(id) on delete cascade,
  apartment_id uuid references apartments(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  cost numeric,
  reported_date date not null default current_date,
  resolved_date date,
  created_at timestamptz not null default now(),
  constraint maintenance_requests_one_subject check (
    (plot_id is not null and apartment_id is null) or
    (plot_id is null and apartment_id is not null)
  )
);

alter table maintenance_requests enable row level security;

drop policy if exists "maintenance_requests_select_own" on maintenance_requests;
create policy "maintenance_requests_select_own" on maintenance_requests for select using (auth.uid() = user_id);
drop policy if exists "maintenance_requests_insert_own" on maintenance_requests;
create policy "maintenance_requests_insert_own" on maintenance_requests for insert with check (auth.uid() = user_id);
drop policy if exists "maintenance_requests_update_own" on maintenance_requests;
create policy "maintenance_requests_update_own" on maintenance_requests for update using (auth.uid() = user_id);
drop policy if exists "maintenance_requests_delete_own" on maintenance_requests;
create policy "maintenance_requests_delete_own" on maintenance_requests for delete using (auth.uid() = user_id);

create index if not exists maintenance_requests_plot_idx on maintenance_requests (plot_id);
create index if not exists maintenance_requests_apartment_idx on maintenance_requests (apartment_id);
