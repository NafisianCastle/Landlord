-- Import historical monthly rent in one transaction. Preserve paid entries and
-- match the existing schedule's day-of-month recurrence (including Feb drift).
create or replace function public.record_rent_history(p_lease_id uuid, p_ranges jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_lease public.leases%rowtype;
  v_range jsonb;
  v_from date;
  v_to date;
  v_amount numeric;
  v_month text;
  v_months jsonb := '{}'::jsonb;
  v_due date;
  v_existing public.lease_payments%rowtype;
  v_count int;
  v_changed int;
  v_recorded int := 0;
  v_skipped int := 0;
begin
  select * into v_lease from public.leases
    where id = p_lease_id and user_id = (select auth.uid()) for update;
  if not found then raise exception 'Lease not found' using errcode = '42501'; end if;
  if v_lease.frequency <> 'monthly' then raise exception 'Monthly leases only'; end if;
  if p_ranges is null or jsonb_typeof(p_ranges) <> 'array' then raise exception 'Invalid ranges'; end if;
  if jsonb_array_length(p_ranges) not between 1 and 50 then raise exception 'Invalid ranges'; end if;

  for v_range in select value from jsonb_array_elements(p_ranges) loop
    if jsonb_typeof(v_range) <> 'object'
       or coalesce(v_range->>'from', '') !~ '^(19|[2-9][0-9])[0-9]{2}-(0[1-9]|1[0-2])$'
       or coalesce(v_range->>'to', '') !~ '^(19|[2-9][0-9])[0-9]{2}-(0[1-9]|1[0-2])$'
       or coalesce(v_range->>'amount', '') !~ '^[0-9]{1,13}(\.[0-9]{1,2})?$'
    then raise exception 'Invalid range'; end if;
    v_from := ((v_range->>'from') || '-01')::date;
    v_to := ((v_range->>'to') || '-01')::date;
    v_amount := (v_range->>'amount')::numeric;
    if v_from > v_to or v_from < date_trunc('month', v_lease.start_date)::date
       or v_to > date_trunc('month', current_date)::date
       or (v_lease.end_date is not null and v_to > date_trunc('month', v_lease.end_date)::date)
       or v_amount <= 0 or v_amount > 1000000000000
    then raise exception 'Range outside lease or invalid amount'; end if;
    while v_from <= v_to loop
      v_month := to_char(v_from, 'YYYY-MM');
      if v_months ? v_month then raise exception 'Overlapping ranges'; end if;
      v_months := v_months || jsonb_build_object(v_month, v_amount);
      if (select count(*) from jsonb_object_keys(v_months)) > 600 then raise exception 'Too many months'; end if;
      v_from := (v_from + interval '1 month')::date;
    end loop;
  end loop;

  -- Bound the walk as well as the submitted months, including legacy leases.
  if v_lease.start_date < date '1900-01-01' then raise exception 'Invalid lease start'; end if;
  v_due := v_lease.start_date;
  while v_due <= current_date + interval '1 month' loop
    v_month := to_char(v_due, 'YYYY-MM');
    if v_months ? v_month then
      if v_lease.end_date is not null and v_due > v_lease.end_date then
        raise exception 'Month has no scheduled rent within this lease';
      end if;
      v_amount := (v_months->>v_month)::numeric;
      -- Legacy schedules may use a different day. Match by month to avoid a
      -- second bill, but reject ambiguous ledgers instead of guessing.
      select count(*) into v_count from public.lease_payments
        where lease_id = p_lease_id and due_date >= date_trunc('month', v_due)::date
          and due_date < date_trunc('month', v_due)::date + interval '1 month';
      if v_count > 1 then raise exception 'Multiple payments exist in a selected month'; end if;
      select * into v_existing from public.lease_payments
        where lease_id = p_lease_id and due_date >= date_trunc('month', v_due)::date
          and due_date < date_trunc('month', v_due)::date + interval '1 month' for update;
      if found then
        if v_existing.paid then
          v_skipped := v_skipped + 1;
        else
          update public.lease_payments set amount = v_amount, paid = true,
            paid_amount = v_amount, paid_date = null
            where id = v_existing.id and user_id = (select auth.uid());
          get diagnostics v_changed = row_count;
          if v_changed <> 1 then raise exception 'Payment ownership mismatch'; end if;
          v_recorded := v_recorded + 1;
        end if;
      else
        insert into public.lease_payments(lease_id, user_id, due_date, amount, paid, paid_amount, paid_date)
          values(p_lease_id, v_lease.user_id, v_due, v_amount, true, v_amount, null)
          on conflict (lease_id, due_date) do update
            set amount = excluded.amount, paid = true, paid_amount = excluded.paid_amount, paid_date = null
            where not lease_payments.paid and lease_payments.user_id = (select auth.uid());
        get diagnostics v_changed = row_count;
        v_recorded := v_recorded + v_changed;
        v_skipped := v_skipped + (1 - v_changed);
      end if;
    end if;
    v_due := (v_due + interval '1 month')::date;
  end loop;
  return jsonb_build_object('recorded', v_recorded, 'skipped', v_skipped);
end;
$$;

revoke all on function public.record_rent_history(uuid, jsonb) from public, anon;
grant execute on function public.record_rent_history(uuid, jsonb) to authenticated;
