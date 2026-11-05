-- The shared demo account is read-only for API callers; other accounts and
-- the service role are unaffected. Rolls back.
begin;
create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %', label; end if; end $$;
create function pg_temp.denied(command text) returns void language plpgsql as $$
begin
  begin execute command;
  exception when insufficient_privilege or check_violation then return;
  end;
  raise exception 'FAIL: statement unexpectedly allowed: %', command;
end $$;

insert into auth.users(id,email) values
 ('d0000000-0000-0000-0000-00000000000d','demo@example.test'),
 ('e0000000-0000-0000-0000-00000000000e','real@example.test');
-- Seeded by the service role (lib/demoSeed.mjs).
set local role service_role;
update public.profiles set is_demo = true where id = 'd0000000-0000-0000-0000-00000000000d';
insert into public.land_plots(id,user_id,name) values
 ('d1000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-00000000000d','Demo plot');
insert into public.leases(id,user_id,plot_id,tenant_name,rent_amount,start_date) values
 ('d3000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-00000000000d','d1000000-0000-0000-0000-000000000001','Demo tenant',100,current_date - 40);
insert into public.lease_payments(id,lease_id,user_id,due_date,amount) values
 ('d4000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-00000000000d',current_date - 10,100);
insert into storage.buckets(id,name) values ('land-documents','land-documents') on conflict do nothing;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','d0000000-0000-0000-0000-00000000000d',true);

-- Reading works.
select pg_temp.assert_true((select count(*) = 1 from public.land_plots), 'demo can browse');

-- Writing doesn't, anywhere.
select pg_temp.denied($q$insert into public.land_plots(user_id,name) values ('d0000000-0000-0000-0000-00000000000d','Spam')$q$);
select pg_temp.denied($q$update public.land_plots set name = 'Defaced' where id = 'd1000000-0000-0000-0000-000000000001'$q$);
select pg_temp.denied($q$delete from public.land_plots where id = 'd1000000-0000-0000-0000-000000000001'$q$);
select pg_temp.denied($q$update public.leases set tenant_name = 'Defaced' where id = 'd3000000-0000-0000-0000-000000000001'$q$);
select pg_temp.denied($q$insert into public.vendors(user_id,name) values ('d0000000-0000-0000-0000-00000000000d','Spam')$q$);
select pg_temp.denied($q$update public.profiles set encryption_enabled = true where id = 'd0000000-0000-0000-0000-00000000000d'$q$);
select pg_temp.denied($q$insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values ('d0000000-0000-0000-0000-00000000000d','https://fcm.googleapis.com/fcm/send/x','k','a')$q$);
select pg_temp.denied($q$insert into storage.objects(bucket_id,name) values ('land-documents','d0000000-0000-0000-0000-00000000000d/d1000000-0000-0000-0000-000000000001/x.pdf')$q$);
-- And the demo can't un-demo itself.
select pg_temp.denied($q$update public.profiles set is_demo = false where id = 'd0000000-0000-0000-0000-00000000000d'$q$);

-- Marking rent paid keeps the demo interactive.
update public.lease_payments set paid = true, paid_date = current_date where id = 'd4000000-0000-0000-0000-000000000001';
select pg_temp.assert_true((select paid from public.lease_payments where id = 'd4000000-0000-0000-0000-000000000001'), 'demo can mark rent paid');

-- A real account is unaffected.
select set_config('request.jwt.claim.sub','e0000000-0000-0000-0000-00000000000e',true);
insert into public.land_plots(user_id,name) values ('e0000000-0000-0000-0000-00000000000e','Real plot');
select pg_temp.assert_true((select count(*) = 1 from public.land_plots), 'real user can write');

-- Visitors can't call the session purge; the service role can.
select pg_temp.denied($q$select public.purge_demo_sessions()$q$);
reset role;
set local role service_role;
select public.purge_demo_sessions();
update public.land_plots set name = 'Reset' where id = 'd1000000-0000-0000-0000-000000000001';

rollback;
