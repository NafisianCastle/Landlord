-- Payment ledger/schedule for leases. Rows are generated on demand by
-- ensure_lease_payments (idempotent, called on every relevant page load) —
-- this app has no background job runner, so there's no cron seeding the
-- schedule ahead of time.

create table if not exists lease_payments (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references leases(id) on delete cascade,
  -- Denormalized from leases.user_id at generation time, for simple RLS
  -- (avoids a join back to leases on every select).
  user_id uuid not null references auth.users(id) on delete cascade,
  due_date date not null,
  amount numeric not null,
  paid boolean not null default false,
  paid_date date,
  paid_amount numeric,
  notes text,
  created_at timestamptz not null default now(),
  unique (lease_id, due_date)
);

alter table lease_payments enable row level security;

drop policy if exists "lease_payments_select_own" on lease_payments;
create policy "lease_payments_select_own" on lease_payments for select using (auth.uid() = user_id);
drop policy if exists "lease_payments_insert_own" on lease_payments;
create policy "lease_payments_insert_own" on lease_payments for insert with check (auth.uid() = user_id);
drop policy if exists "lease_payments_update_own" on lease_payments;
create policy "lease_payments_update_own" on lease_payments for update using (auth.uid() = user_id);
drop policy if exists "lease_payments_delete_own" on lease_payments;
create policy "lease_payments_delete_own" on lease_payments for delete using (auth.uid() = user_id);

create index if not exists lease_payments_lease_id_idx on lease_payments (lease_id, due_date);

-- Idempotent: walks due dates from the lease's start_date by its frequency
-- step, inserting any row missing up to least(end_date, today + months_ahead).
-- security invoker: RLS on leases/lease_payments already scopes this to the
-- caller's own rows, so a lease belonging to someone else simply isn't found.
create or replace function ensure_lease_payments(p_lease_id uuid, p_months_ahead int default 3)
returns void
language plpgsql
security invoker
as $$
declare
  v_lease leases%rowtype;
  v_due date;
  v_horizon date;
begin
  select * into v_lease from leases where id = p_lease_id;
  if v_lease.id is null or v_lease.status <> 'active' then
    return;
  end if;

  v_horizon := (current_date + (p_months_ahead || ' months')::interval)::date;
  if v_lease.end_date is not null and v_lease.end_date < v_horizon then
    v_horizon := v_lease.end_date;
  end if;

  v_due := v_lease.start_date;
  while v_due <= v_horizon loop
    insert into lease_payments (lease_id, user_id, due_date, amount)
    values (p_lease_id, v_lease.user_id, v_due, v_lease.rent_amount)
    on conflict (lease_id, due_date) do nothing;

    v_due := case v_lease.frequency
      when 'monthly' then v_due + interval '1 month'
      when 'quarterly' then v_due + interval '3 months'
      when 'yearly' then v_due + interval '1 year'
    end;
  end loop;
end;
$$;

revoke all on function ensure_lease_payments(uuid, int) from public;
grant execute on function ensure_lease_payments(uuid, int) to authenticated;

create or replace function ensure_all_lease_payments(p_months_ahead int default 3)
returns void
language plpgsql
security invoker
as $$
declare
  r record;
begin
  for r in select id from leases where user_id = auth.uid() and status = 'active' loop
    perform ensure_lease_payments(r.id, p_months_ahead);
  end loop;
end;
$$;

revoke all on function ensure_all_lease_payments(int) from public;
grant execute on function ensure_all_lease_payments(int) to authenticated;
