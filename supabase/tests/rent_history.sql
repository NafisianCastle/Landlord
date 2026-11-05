-- Run after 0021, 0022, 0023 and the bulk_rent_history migration.
-- Uses isolated fixtures and rolls back all changes.
begin;
create function pg_temp.assert_true(ok boolean, description text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Assertion failed: %', description; end if; end $$;
insert into auth.users(id) values ('f1000000-0000-0000-0000-000000000001'), ('f1000000-0000-0000-0000-000000000002');
insert into public.land_plots(id,user_id) values ('f2000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000001');
insert into public.leases(id,user_id,plot_id,tenant_name,rent_amount,frequency,start_date,end_date) values
 ('f3000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000001','History tenant',22000,'monthly','2022-01-31','2025-12-31'),
 ('f3000000-0000-0000-0000-000000000002','f1000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000001','Quarterly tenant',22000,'quarterly','2022-01-31',null);
set local role authenticated;
select set_config('request.jwt.claim.sub','f1000000-0000-0000-0000-000000000001',true);
select public.ensure_lease_payments('f3000000-0000-0000-0000-000000000001');
-- Preserve a real previously recorded payment, even if its amount differs.
update public.lease_payments set paid=true,paid_amount=999,paid_date='2022-04-03',notes='Original receipt'
 where lease_id='f3000000-0000-0000-0000-000000000001' and due_date='2022-03-28';
do $$ declare result jsonb; begin
 result := public.record_rent_history('f3000000-0000-0000-0000-000000000001',
 '[{"from":"2022-01","to":"2022-12","amount":"15000"},{"from":"2023-01","to":"2025-12","amount":"18000.50"}]');
 perform pg_temp.assert_true(result='{"recorded":47,"skipped":1}'::jsonb,'four years, differing rents, paid skip');
end $$;
select pg_temp.assert_true((select count(*)=48 and bool_and(paid) from public.lease_payments where lease_id='f3000000-0000-0000-0000-000000000001'),'48 inclusive months paid');
select pg_temp.assert_true((select amount=15000 and paid_amount=15000 and paid_date is null from public.lease_payments where lease_id='f3000000-0000-0000-0000-000000000001' and due_date='2022-02-28'),'February matches drifted schedule and unknown paid date');
select pg_temp.assert_true((select paid_amount=999 and paid_date='2022-04-03' and notes='Original receipt' from public.lease_payments where lease_id='f3000000-0000-0000-0000-000000000001' and due_date='2022-03-28'),'existing paid data unchanged');
select pg_temp.assert_true((select amount=18000.50 from public.lease_payments where lease_id='f3000000-0000-0000-0000-000000000001' and due_date='2024-02-28'),'different range amount in leap year');
select pg_temp.assert_true((select rent_amount=22000 from public.leases where id='f3000000-0000-0000-0000-000000000001'),'current rent unchanged');
select pg_temp.assert_true((select received_this_month_amount=0 from public.lease_payment_stats),'history does not inflate this month income');
-- Re-import and later schedule generation must not duplicate or overwrite.
select pg_temp.assert_true(public.record_rent_history('f3000000-0000-0000-0000-000000000001','[{"from":"2022-01","to":"2025-12","amount":"1"}]')='{"recorded":0,"skipped":48}'::jsonb,'idempotent paid imports');
select public.ensure_lease_payments('f3000000-0000-0000-0000-000000000001');
select pg_temp.assert_true((select count(*)=48 from public.lease_payments where lease_id='f3000000-0000-0000-0000-000000000001'),'no duplicate schedule rows');
-- Missing rows use the identical due day, even for a month-end lease.
delete from public.lease_payments where lease_id='f3000000-0000-0000-0000-000000000001' and due_date='2024-02-28';
select pg_temp.assert_true(public.record_rent_history('f3000000-0000-0000-0000-000000000001','[{"from":"2024-02","to":"2024-02","amount":"18000.50"}]')->>'recorded'='1','insert missing historical row');
select public.ensure_lease_payments('f3000000-0000-0000-0000-000000000001');
select pg_temp.assert_true((select count(*)=48 from public.lease_payments where lease_id='f3000000-0000-0000-0000-000000000001'),'generated and imported schedule agree');
-- Forge direct RPC calls: no client validation is trusted.
do $$ declare ranges jsonb; rejected boolean; begin
 for ranges in select value from jsonb_array_elements('[null,{},[],[{"from":"2022-01","to":"2022-02","amount":"0"}],[{"from":"2022-13","to":"2022-14","amount":"1"}],[{"from":"2022-03","to":"2022-02","amount":"1"}],[{"from":"2021-12","to":"2022-01","amount":"1"}],[{"from":"2099-01","to":"2099-02","amount":"1"}],[{"from":"2022-01","to":"2022-02","amount":"1.001"}],[{"from":"2022-01","to":"2022-02","amount":"1"},{"from":"2022-02","to":"2022-03","amount":"2"}]]') loop
   rejected := false;
   begin perform public.record_rent_history('f3000000-0000-0000-0000-000000000001',ranges);
   exception when others then rejected := true; end;
   perform pg_temp.assert_true(rejected,'invalid direct RPC rejected: '||ranges::text);
 end loop;
 rejected := false;
 begin perform public.record_rent_history('f3000000-0000-0000-0000-000000000002','[{"from":"2022-01","to":"2022-02","amount":"1"}]');
 exception when others then rejected:=true; end;
 perform pg_temp.assert_true(rejected,'non-monthly lease rejected');
end $$;
-- A later error rolls back earlier months in the same batch.
update public.lease_payments set paid=false,paid_amount=null where lease_id='f3000000-0000-0000-0000-000000000001' and due_date='2024-01-28';
insert into public.lease_payments(lease_id,user_id,due_date,amount) values ('f3000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000001','2024-02-29',1);
do $$ declare rejected boolean := false; begin
 begin perform public.record_rent_history('f3000000-0000-0000-0000-000000000001','[{"from":"2024-01","to":"2024-02","amount":"123"}]');
 exception when others then rejected:=true; end;
 perform pg_temp.assert_true(rejected,'ambiguous month rejected');
 perform pg_temp.assert_true((select not paid and amount=18000.50 from public.lease_payments where lease_id='f3000000-0000-0000-0000-000000000001' and due_date='2024-01-28'),'earlier change rolled back');
end $$;
select set_config('request.jwt.claim.sub','f1000000-0000-0000-0000-000000000002',true);
do $$ declare rejected boolean := false; begin
 begin perform public.record_rent_history('f3000000-0000-0000-0000-000000000001','[{"from":"2022-01","to":"2022-02","amount":"1"}]');
 exception when insufficient_privilege then rejected:=true; end;
 perform pg_temp.assert_true(rejected,'another owner denied');
end $$;
reset role;
select pg_temp.assert_true(not has_function_privilege('anon','public.record_rent_history(uuid,jsonb)','execute'),'anonymous execution denied');
rollback;
