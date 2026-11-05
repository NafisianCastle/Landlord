-- The service role (crons, admin tools, demo seeding) must be able to write
-- through the security triggers. Runs first thing in a fresh session, so no
-- plan cached from an authenticated call can hide a missing grant.
begin;
create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %', label; end if; end $$;
insert into auth.users(id,email) values ('5e000000-0000-0000-0000-000000000001','svc@example.test');
insert into public.land_plots(id,user_id,name) values
 ('5e100000-0000-0000-0000-000000000001','5e000000-0000-0000-0000-000000000001','Plot');
insert into public.leases(id,user_id,plot_id,tenant_name,rent_amount,start_date) values
 ('5e300000-0000-0000-0000-000000000001','5e000000-0000-0000-0000-000000000001','5e100000-0000-0000-0000-000000000001','T',100,current_date);
insert into public.lease_payments(id,lease_id,user_id,due_date,amount) values
 ('5e400000-0000-0000-0000-000000000001','5e300000-0000-0000-0000-000000000001','5e000000-0000-0000-0000-000000000001',current_date,100);

set local role service_role;
-- What the reminder crons do.
update public.lease_payments set reminder_sent_at = now() where id = '5e400000-0000-0000-0000-000000000001';
update public.leases set expiry_reminder_sent_at = now() where id = '5e300000-0000-0000-0000-000000000001';
-- What admin tools and the demo seed do.
update public.profiles set is_admin = true where id = '5e000000-0000-0000-0000-000000000001';
insert into public.vendors(user_id,name) values ('5e000000-0000-0000-0000-000000000001','Vendor');
select pg_temp.assert_true((select is_admin from public.profiles where id = '5e000000-0000-0000-0000-000000000001'), 'service role writes through triggers');
rollback;
