-- The shared "Try the live demo" account is read-only. Every visitor signs in
-- as the same user, so any write would be visible to everyone (defacement) or
-- could bloat the database and storage. Visitors may still mark rent
-- paid/unpaid: lease_payments rows can't grow (they come from the frozen
-- leases) and the nightly reset (app/api/cron/demo-reset) restores them.
-- Tested by supabase/tests/demo.sql.

alter table public.profiles add column if not exists is_demo boolean not null default false;

-- is_demo joins the privileged columns API callers can't change
-- (20261105140000_security_hardening.sql).
create or replace function public.lock_profile_privileged_columns() returns trigger
language plpgsql set search_path = '' as $$
begin
  if private.is_api_caller() then
    new.is_admin := old.is_admin;
    new.trial_ends_at := old.trial_ends_at;
    new.email := old.email;
    new.referred_by := old.referred_by;
    new.referral_code := old.referral_code;
    new.is_demo := old.is_demo;
  end if;
  return new;
end;
$$;

create or replace function private.is_demo_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select is_demo from public.profiles where id = auth.uid()), false)
$$;
revoke all on function private.is_demo_user() from public, anon;
-- The service role passes through block_demo_writes too (it's not an API
-- caller, so it's never blocked), and the trigger evaluates both checks.
grant execute on function private.is_demo_user() to authenticated, service_role;

create or replace function private.block_demo_writes() returns trigger
language plpgsql set search_path = '' as $$
begin
  if private.is_api_caller() and private.is_demo_user() then
    raise exception 'The demo is read-only. Create a free account to save changes.'
      using errcode = 'insufficient_privilege';
  end if;
  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'land_plots', 'plot_boundary_points', 'plot_documents', 'plot_collaborators',
    'plot_audit_log', 'apartments', 'apartment_documents', 'apartment_collaborators',
    'apartment_audit_log', 'leases', 'expenses', 'vendors', 'maintenance_requests',
    'apartment_tenants', 'apartment_bills', 'apartment_bill_proofs', 'tenant_portal_links',
    'push_subscriptions', 'device_push_tokens', 'coupon_redemptions', 'subscriptions',
    'payment_transactions'
  ] loop
    execute format('drop trigger if exists block_demo_writes on public.%I', t);
    execute format('create trigger block_demo_writes before insert or update or delete on public.%I
                    for each row execute function private.block_demo_writes()', t);
  end loop;
end $$;

-- No uploads, overwrites or deletes in storage from the demo.
drop policy if exists demo_no_storage_insert on storage.objects;
create policy demo_no_storage_insert on storage.objects as restrictive for insert to authenticated
  with check (not private.is_demo_user());
drop policy if exists demo_no_storage_update on storage.objects;
create policy demo_no_storage_update on storage.objects as restrictive for update to authenticated
  using (not private.is_demo_user());
drop policy if exists demo_no_storage_delete on storage.objects;
create policy demo_no_storage_delete on storage.objects as restrictive for delete to authenticated
  using (not private.is_demo_user());

-- Signs out every demo visitor session; called by the nightly reset so
-- sessions from repeated demo sign-ins don't accumulate.
create or replace function public.purge_demo_sessions() returns void
language sql security definer set search_path = '' as $$
  delete from auth.sessions where user_id in (select id from public.profiles where is_demo)
$$;
revoke all on function public.purge_demo_sessions() from public, anon, authenticated;
grant execute on function public.purge_demo_sessions() to service_role;
