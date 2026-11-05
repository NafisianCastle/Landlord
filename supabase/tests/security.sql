-- Attacks a signed-in (or anonymous) user can try straight against the REST
-- API, bypassing the app. Each must be refused. Run against a disposable
-- migrated database with psql -v ON_ERROR_STOP=1 -f ...; everything rolls back.
begin;
create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %', label; end if; end $$;
create function pg_temp.denied(command text) returns void language plpgsql as $$
begin
  begin execute command;
  exception when insufficient_privilege or check_violation or foreign_key_violation or unique_violation
    or raise_exception or not_null_violation then return;
  end;
  raise exception 'FAIL: statement unexpectedly allowed: %', command;
end $$;
create function pg_temp.as_user(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, true) $$;

-- Fixtures (as the migration owner): victim A owns a plot, an apartment and a
-- lease; attacker B is an editor on A's plot and apartment; C is a stranger.
insert into auth.users(id,email) values
 ('a0000000-0000-0000-0000-00000000000a','victim@example.test'),
 ('b0000000-0000-0000-0000-00000000000b','attacker@example.test'),
 ('c0000000-0000-0000-0000-00000000000c','stranger@example.test');
insert into public.land_plots(id,user_id,name) values
 ('a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a','Victim plot');
insert into public.apartments(id,user_id,name) values
 ('a2000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a','Victim flat');
insert into public.plot_collaborators(plot_id,user_id,invited_email,role,invited_by) values
 ('a1000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-00000000000b','attacker@example.test','editor','a0000000-0000-0000-0000-00000000000a');
insert into public.apartment_collaborators(apartment_id,user_id,invited_email,role,invited_by) values
 ('a2000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-00000000000b','attacker@example.test','editor','a0000000-0000-0000-0000-00000000000a');
insert into public.leases(id,user_id,plot_id,tenant_name,rent_amount,frequency,start_date) values
 ('a3000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-000000000001','Real tenant',10000,'monthly','2026-01-01');
insert into public.vendors(id,user_id,name) values
 ('a4000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a','Victim plumber');

set local role authenticated;
select pg_temp.as_user('b0000000-0000-0000-0000-00000000000b');

-- 1. Privileged profile columns can't be self-granted.
update public.profiles set is_admin = true, email = 'victim@example.test',
  referred_by = 'a0000000-0000-0000-0000-00000000000a', referral_code = 'VANITY',
  trial_ends_at = now() + interval '100 years'
  where id = 'b0000000-0000-0000-0000-00000000000b';
select pg_temp.assert_true((select not is_admin from public.profiles where id = 'b0000000-0000-0000-0000-00000000000b'), 'is_admin locked');
select pg_temp.assert_true((select email = 'attacker@example.test' from public.profiles where id = 'b0000000-0000-0000-0000-00000000000b'), 'email locked');
select pg_temp.assert_true((select referred_by is null from public.profiles where id = 'b0000000-0000-0000-0000-00000000000b'), 'referred_by locked');
select pg_temp.assert_true((select referral_code <> 'VANITY' from public.profiles where id = 'b0000000-0000-0000-0000-00000000000b'), 'referral_code locked');
select pg_temp.denied($q$update public.profiles set full_name = repeat('x', 5000) where id = 'b0000000-0000-0000-0000-00000000000b'$q$);

-- 2. An editor can't take ownership of a shared plot or apartment.
select pg_temp.denied($q$update public.land_plots set user_id = 'b0000000-0000-0000-0000-00000000000b' where id = 'a1000000-0000-0000-0000-000000000001'$q$);
select pg_temp.denied($q$update public.apartments set user_id = 'b0000000-0000-0000-0000-00000000000b' where id = 'a2000000-0000-0000-0000-000000000001'$q$);
-- ...but can still edit it.
update public.land_plots set notes = 'editor note' where id = 'a1000000-0000-0000-0000-000000000001';
select pg_temp.assert_true((select notes = 'editor note' from public.land_plots where id = 'a1000000-0000-0000-0000-000000000001'), 'editor can still edit');

-- 3. Collaborator invites resolve against Auth, not the editable profile email.
select pg_temp.assert_true(public.find_user_id_by_email('VICTIM@example.test') = 'a0000000-0000-0000-0000-00000000000a', 'lookup by auth email');

-- 4. Rows can't be attached to someone else's property, lease or vendor.
select pg_temp.as_user('c0000000-0000-0000-0000-00000000000c');
select pg_temp.denied($q$insert into public.leases(user_id,plot_id,tenant_name,rent_amount,start_date) values ('c0000000-0000-0000-0000-00000000000c','a1000000-0000-0000-0000-000000000001','x',1,'2026-01-01')$q$);
select pg_temp.denied($q$insert into public.lease_payments(user_id,lease_id,due_date,amount) values ('c0000000-0000-0000-0000-00000000000c','a3000000-0000-0000-0000-000000000001','2026-02-01',1)$q$);
select pg_temp.denied($q$insert into public.maintenance_requests(user_id,plot_id,title) values ('c0000000-0000-0000-0000-00000000000c','a1000000-0000-0000-0000-000000000001','x')$q$);
insert into public.land_plots(id,user_id,name) values ('c1000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-00000000000c','Stranger plot');
select pg_temp.denied($q$insert into public.maintenance_requests(user_id,plot_id,title,vendor_id) values ('c0000000-0000-0000-0000-00000000000c','c1000000-0000-0000-0000-000000000001','x','a4000000-0000-0000-0000-000000000001')$q$);
-- Own property still works.
insert into public.leases(id,user_id,plot_id,tenant_name,rent_amount,start_date) values
 ('c3000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-00000000000c','c1000000-0000-0000-0000-000000000001','Own tenant',1,'2026-01-01');
insert into public.maintenance_requests(user_id,plot_id,title) values ('c0000000-0000-0000-0000-00000000000c','c1000000-0000-0000-0000-000000000001','Own repair');
select pg_temp.denied($q$update public.leases set plot_id = 'a1000000-0000-0000-0000-000000000001' where id = 'c3000000-0000-0000-0000-000000000001'$q$);

-- 5. Rent generation is bounded.
select pg_temp.denied($q$insert into public.leases(user_id,plot_id,tenant_name,rent_amount,start_date) values ('c0000000-0000-0000-0000-00000000000c','c1000000-0000-0000-0000-000000000001','x',1,'0001-01-01')$q$);
select public.ensure_lease_payments('c3000000-0000-0000-0000-000000000001', 100000);
select pg_temp.assert_true((select count(*) <= 40 from public.lease_payments where lease_id = 'c3000000-0000-0000-0000-000000000001'), 'months ahead clamped');

-- 6. Audit logs only accept the owner's own entries.
select pg_temp.denied($q$select public.log_plot_collaborator_audit('a1000000-0000-0000-0000-000000000001','collaborator_invited','{}')$q$);
select pg_temp.denied($q$select public.log_apartment_collaborator_audit('a2000000-0000-0000-0000-000000000001','collaborator_invited','{}')$q$);
select pg_temp.denied($q$select public.log_plot_collaborator_audit('c1000000-0000-0000-0000-000000000001','collaborator_invited', jsonb_build_object('x', repeat('x', 5000)))$q$);

-- 7. Push endpoints must be real push services.
select pg_temp.denied($q$insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values ('c0000000-0000-0000-0000-00000000000c','http://169.254.169.254/latest','k','a')$q$);
select pg_temp.denied($q$insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values ('c0000000-0000-0000-0000-00000000000c','https://internal.example/hook','k','a')$q$);
insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values
 ('c0000000-0000-0000-0000-00000000000c','https://fcm.googleapis.com/fcm/send/abc','k','a');

-- 8. Per-account quotas stop scripted bloat.
insert into public.vendors(user_id,name) select 'c0000000-0000-0000-0000-00000000000c', 'v' || g from generate_series(1, 500) g;
select pg_temp.denied($q$insert into public.vendors(user_id,name) values ('c0000000-0000-0000-0000-00000000000c','one too many')$q$);
insert into public.push_subscriptions(user_id,endpoint,p256dh,auth)
  select 'c0000000-0000-0000-0000-00000000000c', 'https://fcm.googleapis.com/fcm/send/q' || g, 'k', 'a' from generate_series(1, 4) g;
select pg_temp.denied($q$insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values ('c0000000-0000-0000-0000-00000000000c','https://fcm.googleapis.com/fcm/send/over','k','a')$q$);

-- 9. Logged-out callers can't use the privileged functions or PostGIS data.
reset role;
set local role anon;
select pg_temp.denied($q$select public.find_user_id_by_email('victim@example.test')$q$);
select pg_temp.denied($q$select public.increment_coupon_redemptions(gen_random_uuid())$q$);
select pg_temp.denied($q$select public.log_plot_collaborator_audit('a1000000-0000-0000-0000-000000000001','collaborator_invited','{}')$q$);
select pg_temp.denied($q$delete from public.spatial_ref_sys where srid = 4326$q$);
reset role;
set local role authenticated;
select pg_temp.denied($q$select public.increment_coupon_redemptions(gen_random_uuid())$q$);
select pg_temp.denied($q$delete from public.spatial_ref_sys where srid = 4326$q$);

-- The service role (cron, seeding, admin tools) is not limited by any of this.
reset role;
set local role service_role;
update public.profiles set is_admin = true where id = 'c0000000-0000-0000-0000-00000000000c';
select pg_temp.assert_true((select is_admin from public.profiles where id = 'c0000000-0000-0000-0000-00000000000c'), 'service role can grant admin');

rollback;
