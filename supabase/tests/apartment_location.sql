-- Disposable migrated database only: psql -v ON_ERROR_STOP=1 -f this_file
begin;
create function pg_temp.check_location(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; end $$;
create function pg_temp.invalid_location(command text) returns void language plpgsql as $$
begin
  begin execute command; exception when check_violation then return; end;
  raise exception 'FAIL: invalid coordinate write allowed';
end $$;
insert into auth.users(id,email) values
 ('71000000-0000-0000-0000-000000000001','location-owner@example.test'),
 ('71000000-0000-0000-0000-000000000002','location-editor@example.test'),
 ('71000000-0000-0000-0000-000000000003','location-viewer@example.test'),
 ('71000000-0000-0000-0000-000000000004','location-stranger@example.test');
insert into public.apartments(id,user_id,name,purchase_price,notes) values
 ('72000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000001','Location test',100000,'Keep private fields intact');
insert into public.apartment_collaborators(apartment_id,user_id,invited_email,role,invited_by) values
 ('72000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000002','location-editor@example.test','editor','71000000-0000-0000-0000-000000000001'),
 ('72000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000003','location-viewer@example.test','viewer','71000000-0000-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000001',true);
update public.apartments set latitude=23.8103,longitude=90.4125 where id='72000000-0000-0000-0000-000000000001';
select pg_temp.check_location((select latitude=23.8103 and longitude=90.4125 and purchase_price=100000 and notes='Keep private fields intact' from public.apartments where id='72000000-0000-0000-0000-000000000001'),'owner saves pin independently');
select pg_temp.invalid_location($q$update public.apartments set latitude=91 where id='72000000-0000-0000-0000-000000000001'$q$);
select pg_temp.invalid_location($q$update public.apartments set longitude='NaN' where id='72000000-0000-0000-0000-000000000001'$q$);
select pg_temp.invalid_location($q$update public.apartments set latitude='Infinity' where id='72000000-0000-0000-0000-000000000001'$q$);
select pg_temp.invalid_location($q$update public.apartments set latitude=null where id='72000000-0000-0000-0000-000000000001'$q$);
select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000002',true);
update public.apartments set latitude=0,longitude=0 where id='72000000-0000-0000-0000-000000000001';
select pg_temp.check_location((select latitude=0 and longitude=0 from public.apartments where id='72000000-0000-0000-0000-000000000001'),'editor can move pin, including zero coordinates');
select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000003',true);
update public.apartments set latitude=10,longitude=10 where id='72000000-0000-0000-0000-000000000001';
select pg_temp.check_location((select latitude=0 and longitude=0 from public.apartments where id='72000000-0000-0000-0000-000000000001'),'viewer can read but cannot change pin');
select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000004',true);
select pg_temp.check_location((select count(*)=0 from public.apartments where id='72000000-0000-0000-0000-000000000001'),'unrelated account cannot read coordinates');
update public.apartments set latitude=10,longitude=10 where id='72000000-0000-0000-0000-000000000001';
select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000001',true);
select pg_temp.check_location((select latitude=0 and longitude=0 from public.apartments where id='72000000-0000-0000-0000-000000000001'),'unrelated account cannot change coordinates');
update public.apartments set latitude=null,longitude=null where id='72000000-0000-0000-0000-000000000001';
select pg_temp.check_location((select latitude is null and longitude is null from public.apartments where id='72000000-0000-0000-0000-000000000001'),'owner can remove pin');
reset role;
rollback;
