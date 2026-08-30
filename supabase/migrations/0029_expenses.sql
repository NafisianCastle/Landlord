-- Non-repair expense log per plot or apartment (mirrors maintenance_requests'
-- plot_id/apartment_id subject pattern). Repair costs live on
-- maintenance_requests.cost; this table covers everything else so profit
-- calculations (see 0030_financial_stats.sql) don't double-count repairs.

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plot_id uuid references land_plots(id) on delete cascade,
  apartment_id uuid references apartments(id) on delete cascade,
  category text not null check (
    category in ('tax', 'insurance', 'utility', 'repair', 'management_fee', 'other')
  ),
  amount numeric not null,
  expense_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  constraint expenses_one_subject check (
    (plot_id is not null and apartment_id is null) or
    (plot_id is null and apartment_id is not null)
  )
);

alter table expenses enable row level security;

drop policy if exists "expenses_select_own" on expenses;
create policy "expenses_select_own" on expenses for select using (auth.uid() = user_id);
drop policy if exists "expenses_insert_own" on expenses;
create policy "expenses_insert_own" on expenses for insert with check (auth.uid() = user_id);
drop policy if exists "expenses_update_own" on expenses;
create policy "expenses_update_own" on expenses for update using (auth.uid() = user_id);
drop policy if exists "expenses_delete_own" on expenses;
create policy "expenses_delete_own" on expenses for delete using (auth.uid() = user_id);

create index if not exists expenses_plot_idx on expenses (plot_id);
create index if not exists expenses_apartment_idx on expenses (apartment_id);
create index if not exists expenses_user_idx on expenses (user_id);
