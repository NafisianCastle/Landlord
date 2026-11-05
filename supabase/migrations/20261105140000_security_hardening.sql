-- Security hardening. Every signed-in user can call PostgREST directly with
-- the public key, so these rules, not the app UI, are the security boundary.
-- Tested by supabase/tests/security.sql.
--
-- "API caller" below means current_user is anon or authenticated. Server code
-- using the service role, security definer functions (owned by postgres) and
-- migrations are not API callers and are not limited by these checks.

create or replace function private.is_api_caller() returns boolean
language sql stable set search_path = '' as $$
  select current_user in ('anon', 'authenticated')
$$;

-- 1. Privileged profile columns. profiles_update_own (0001) allows updating
--    every column of your own row; only trial_ends_at was locked (0010).
--    is_admin (0028) is trusted by the admin pages, email by invites, and
--    referred_by/referral_code by referral credit.
create or replace function public.lock_profile_privileged_columns() returns trigger
language plpgsql set search_path = '' as $$
begin
  if private.is_api_caller() then
    new.is_admin := old.is_admin;
    new.trial_ends_at := old.trial_ends_at;
    new.email := old.email;
    new.referred_by := old.referred_by;
    new.referral_code := old.referral_code;
  end if;
  return new;
end;
$$;
drop trigger if exists lock_profile_trial_ends_at_trigger on public.profiles;
drop function if exists public.lock_profile_trial_ends_at();
create trigger lock_profile_privileged_columns
  before update on public.profiles
  for each row execute function public.lock_profile_privileged_columns();

alter table public.profiles add constraint profiles_input_limits check (
  coalesce(length(full_name), 0) <= 200
  and coalesce(length(phone), 0) <= 32
  and coalesce(octet_length(dek_salt), 0) <= 64
  and coalesce(octet_length(dek_wrapped_by_passphrase), 0) <= 256
  and coalesce(octet_length(dek_wrapped_by_passphrase_iv), 0) <= 64
  and coalesce(octet_length(recovery_salt), 0) <= 64
  and coalesce(octet_length(dek_wrapped_by_recovery), 0) <= 256
  and coalesce(octet_length(dek_wrapped_by_recovery_iv), 0) <= 64
) not valid;

-- 2. Owners can't be changed through the API. Without a WITH CHECK, the
--    collaborator update policies (0015, 0019) let an editor set user_id to
--    themselves and take a plot or apartment from its owner.
create or replace function private.prevent_owner_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  if private.is_api_caller() and new.user_id is distinct from old.user_id then
    raise exception 'The owner of a record cannot be changed.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
do $$
declare t text;
begin
  foreach t in array array['land_plots', 'apartments', 'leases', 'lease_payments', 'expenses',
                           'vendors', 'maintenance_requests', 'plot_documents', 'apartment_documents',
                           'plot_boundary_points']
  loop
    execute format('drop trigger if exists prevent_owner_change on public.%I', t);
    execute format('create trigger prevent_owner_change before update on public.%I
                    for each row execute function private.prevent_owner_change()', t);
  end loop;
end $$;

-- 3. Collaborator invites resolve against Auth emails. profiles.email used to
--    be editable, so an attacker could claim someone else's address and
--    receive their invites (tenant invites were already moved to Auth).
create or replace function public.find_user_id_by_email(p_email text) returns uuid
language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u
  where lower(u.email) = lower(btrim(p_email)) and u.deleted_at is null and auth.uid() is not null
  limit 1;
$$;

-- 4. Rows must point at the caller's own property, lease and vendor (the same
--    fix expenses got in 20261021150040). Otherwise reminders sent by the
--    service role leak another owner's tenant and property names.
drop policy if exists leases_insert_own on public.leases;
drop policy if exists leases_update_own on public.leases;
create policy leases_insert_own on public.leases for insert to authenticated with check (
  user_id = (select auth.uid()) and (
    (plot_id is not null and exists (select 1 from public.land_plots p where p.id = plot_id and p.user_id = (select auth.uid())))
    or (apartment_id is not null and exists (select 1 from public.apartments a where a.id = apartment_id and a.user_id = (select auth.uid())))
  )
);
create policy leases_update_own on public.leases for update to authenticated
  using (user_id = (select auth.uid())) with check (
    user_id = (select auth.uid()) and (
      (plot_id is not null and exists (select 1 from public.land_plots p where p.id = plot_id and p.user_id = (select auth.uid())))
      or (apartment_id is not null and exists (select 1 from public.apartments a where a.id = apartment_id and a.user_id = (select auth.uid())))
    )
  );

drop policy if exists lease_payments_insert_own on public.lease_payments;
drop policy if exists lease_payments_update_own on public.lease_payments;
create policy lease_payments_insert_own on public.lease_payments for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.leases l where l.id = lease_id and l.user_id = (select auth.uid()))
);
create policy lease_payments_update_own on public.lease_payments for update to authenticated
  using (user_id = (select auth.uid())) with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.leases l where l.id = lease_id and l.user_id = (select auth.uid()))
  );

drop policy if exists maintenance_requests_insert_own on public.maintenance_requests;
drop policy if exists maintenance_requests_update_own on public.maintenance_requests;
create policy maintenance_requests_insert_own on public.maintenance_requests for insert to authenticated with check (
  user_id = (select auth.uid())
  and (
    (plot_id is not null and exists (select 1 from public.land_plots p where p.id = plot_id and p.user_id = (select auth.uid())))
    or (apartment_id is not null and exists (select 1 from public.apartments a where a.id = apartment_id and a.user_id = (select auth.uid())))
  )
  and (vendor_id is null or exists (select 1 from public.vendors v where v.id = vendor_id and v.user_id = (select auth.uid())))
);
create policy maintenance_requests_update_own on public.maintenance_requests for update to authenticated
  using (user_id = (select auth.uid())) with check (
    user_id = (select auth.uid())
    and (
      (plot_id is not null and exists (select 1 from public.land_plots p where p.id = plot_id and p.user_id = (select auth.uid())))
      or (apartment_id is not null and exists (select 1 from public.apartments a where a.id = apartment_id and a.user_id = (select auth.uid())))
    )
    and (vendor_id is null or exists (select 1 from public.vendors v where v.id = vendor_id and v.user_id = (select auth.uid())))
  );

-- 5. Bounded rent generation. A lease starting in year 1, or a huge
--    p_months_ahead, made one call insert tens of thousands of rows and
--    crowded everyone else out of the rent-reminder cron.
alter table public.leases add constraint leases_date_bounds check (
  start_date >= date '1900-01-01'
  and (end_date is null or end_date <= start_date + interval '100 years')
) not valid;

create or replace function public.ensure_lease_payments(p_lease_id uuid, p_months_ahead int default 3)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lease leases%rowtype;
  v_due date;
  v_horizon date;
  v_rows int := 0;
begin
  select * into v_lease from leases where id = p_lease_id;
  if v_lease.id is null or v_lease.status <> 'active' then
    return;
  end if;

  v_horizon := (current_date + make_interval(months => least(greatest(coalesce(p_months_ahead, 3), 0), 24)))::date;
  if v_lease.end_date is not null and v_lease.end_date < v_horizon then
    v_horizon := v_lease.end_date;
  end if;

  v_due := greatest(v_lease.start_date, date '1900-01-01');
  while v_due <= v_horizon and v_rows < 2000 loop
    insert into lease_payments (lease_id, user_id, due_date, amount)
    values (p_lease_id, v_lease.user_id, v_due, v_lease.rent_amount)
    on conflict (lease_id, due_date) do nothing;
    v_rows := v_rows + 1;

    v_due := case v_lease.frequency
      when 'monthly' then v_due + interval '1 month'
      when 'quarterly' then v_due + interval '3 months'
      when 'yearly' then v_due + interval '1 year'
    end;
  end loop;
end;
$$;

-- 6. Audit loggers only record the caller's own collaborator changes. They
--    are security definer and used to accept any plot or apartment id.
create or replace function public.log_plot_collaborator_audit(p_plot_id uuid, p_action text, p_detail jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_name text;
  v_email text := (select email from auth.users where id = auth.uid());
begin
  if p_action not in ('collaborator_invited', 'collaborator_removed') or octet_length(coalesce(p_detail, '{}')::text) > 2048 then
    raise exception 'Invalid audit entry.' using errcode = 'check_violation';
  end if;
  select user_id, name into v_owner, v_name from land_plots where id = p_plot_id;
  -- The owner logs invites and removals; a collaborator may log leaving.
  if v_owner is null or not (
    v_owner = auth.uid()
    or (p_action = 'collaborator_removed' and lower(p_detail ->> 'email') = lower(v_email))
  ) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;

  insert into plot_audit_log (plot_id, plot_name, owner_user_id, actor_user_id, actor_email, action, detail)
  values (p_plot_id, v_name, v_owner, auth.uid(), v_email, p_action, p_detail);
end;
$$;

create or replace function public.log_apartment_collaborator_audit(p_apartment_id uuid, p_action text, p_detail jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_name text;
  v_email text := (select email from auth.users where id = auth.uid());
begin
  if p_action not in ('collaborator_invited', 'collaborator_removed') or octet_length(coalesce(p_detail, '{}')::text) > 2048 then
    raise exception 'Invalid audit entry.' using errcode = 'check_violation';
  end if;
  select user_id, name into v_owner, v_name from apartments where id = p_apartment_id;
  if v_owner is null or not (
    v_owner = auth.uid()
    or (p_action = 'collaborator_removed' and lower(p_detail ->> 'email') = lower(v_email))
  ) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;

  insert into apartment_audit_log (apartment_id, apartment_name, owner_user_id, actor_user_id, actor_email, action, detail)
  values (p_apartment_id, v_name, v_owner, auth.uid(), v_email, p_action, p_detail);
end;
$$;

-- 7. Explicit grants. "revoke ... from public" leaves Supabase's default
--    EXECUTE grant to anon in place, so logged-out callers could map emails
--    to user ids or bump coupon counters.
do $$
declare f text;
begin
  foreach f in array array[
    'public.find_user_id_by_email(text)',
    'public.log_plot_collaborator_audit(uuid,text,jsonb)',
    'public.log_apartment_collaborator_audit(uuid,text,jsonb)',
    'public.is_plot_collaborator(uuid,boolean)',
    'public.is_apartment_collaborator(uuid,boolean)',
    'public.get_referral_count()',
    'public.attribute_referral(text)',
    'public.ensure_lease_payments(uuid,integer)',
    'public.ensure_all_lease_payments(integer)',
    'public.upsert_plot_boundary(uuid,jsonb)',
    'public.increment_coupon_redemptions(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    if f <> 'public.increment_coupon_redemptions(uuid)' then
      execute format('grant execute on function %s to authenticated', f);
    end if;
  end loop;
end $$;
revoke all on function public.increment_coupon_redemptions(uuid) from authenticated;
grant execute on function public.increment_coupon_redemptions(uuid) to service_role;

-- PostGIS keeps its projection table in public. Deleting SRID 4326 would break
-- area calculation for everyone. On Supabase this table is owned by
-- supabase_admin, so the revoke may be refused; that's fine, it's best effort.
do $$
begin
  revoke insert, update, delete, truncate on public.spatial_ref_sys from anon, authenticated;
exception when insufficient_privilege then
  raise notice 'spatial_ref_sys is not owned by this role; leaving its grants unchanged.';
end $$;

-- 8. Per-account quotas, so one account can't bloat the database.
--    Arguments: owner column, limit, and an optional scope column (count per
--    property instead of per account).
-- Runs as the caller (not security definer) so private.is_api_caller() sees
-- the API role; the counts only cover rows the caller can already see.
create or replace function private.enforce_row_quota() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_owner_col text := tg_argv[0];
  v_limit int := tg_argv[1]::int;
  v_scope_col text := nullif(tg_argv[2], '');
  v_new jsonb := to_jsonb(new);
  v_count int;
begin
  if not private.is_api_caller() then
    return new;
  end if;
  if v_scope_col is null then
    execute format('select count(*) from %I.%I where %I::text = $1', tg_table_schema, tg_table_name, v_owner_col)
      into v_count using v_new ->> v_owner_col;
  else
    execute format('select count(*) from %I.%I where %I::text = $1 and %I::text = $2',
                   tg_table_schema, tg_table_name, v_owner_col, v_scope_col)
      into v_count using v_new ->> v_owner_col, v_new ->> v_scope_col;
  end if;
  if v_count >= v_limit then
    raise exception 'Limit reached: at most % % per account.', v_limit, replace(tg_table_name, '_', ' ')
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

do $$
declare q record;
begin
  for q in select * from (values
    ('land_plots', 'user_id', 250, ''),
    ('apartments', 'user_id', 250, ''),
    ('leases', 'user_id', 2500, ''),
    ('expenses', 'user_id', 10000, ''),
    ('vendors', 'user_id', 500, ''),
    ('maintenance_requests', 'user_id', 2500, ''),
    ('plot_documents', 'user_id', 500, ''),
    ('apartment_documents', 'user_id', 500, ''),
    ('plot_collaborators', 'invited_by', 25, 'plot_id'),
    ('apartment_collaborators', 'invited_by', 25, 'apartment_id'),
    ('apartment_tenants', 'owner_id', 10, 'apartment_id'),
    ('push_subscriptions', 'user_id', 5, ''),
    ('device_push_tokens', 'user_id', 5, ''),
    ('plot_boundary_points', 'user_id', 50000, '')
  ) as t(tbl, owner_col, lim, scope_col)
  loop
    execute format('drop trigger if exists enforce_row_quota on public.%I', q.tbl);
    execute format('create trigger enforce_row_quota before insert on public.%I
                    for each row execute function private.enforce_row_quota(%L, %L, %L)',
                   q.tbl, q.owner_col, q.lim, q.scope_col);
  end loop;
end $$;

-- Leases are also capped per property (a lease history, not a flood).
create or replace function private.enforce_lease_quota() returns trigger
language plpgsql set search_path = '' as $$
begin
  if private.is_api_caller() and (
    select count(*) from public.leases l
    where (new.plot_id is not null and l.plot_id = new.plot_id)
       or (new.apartment_id is not null and l.apartment_id = new.apartment_id)
  ) >= 100 then
    raise exception 'Limit reached: at most 100 leases per property.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_lease_quota on public.leases;
create trigger enforce_lease_quota before insert on public.leases
  for each row execute function private.enforce_lease_quota();

-- Stored files: at most 500 objects per account, across all buckets.
create or replace function private.storage_object_count(p_owner uuid) returns bigint
language sql stable security definer set search_path = '' as $$
  select count(*) from storage.objects where owner = p_owner
$$;
revoke all on function private.storage_object_count(uuid) from public, anon;
grant execute on function private.storage_object_count(uuid) to authenticated;
drop policy if exists storage_object_quota on storage.objects;
create policy storage_object_quota on storage.objects as restrictive for insert to authenticated
  with check (private.storage_object_count((select auth.uid())) < 500);

-- 9. Push subscriptions must be real browser push services. The cron POSTs
--    to the stored endpoint, so an arbitrary URL is a server-side request to
--    any host, and an unbounded string is bloat.
alter table public.push_subscriptions add constraint push_subscriptions_endpoint_check check (
  length(endpoint) <= 1000
  and endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com|[a-z0-9.-]+\.push\.apple\.com)/'
  and length(p256dh) <= 200
  and length(auth) <= 100
) not valid;
alter table public.device_push_tokens add constraint device_push_tokens_input_limits check (
  length(token) <= 4096 and length(platform) <= 16
) not valid;
