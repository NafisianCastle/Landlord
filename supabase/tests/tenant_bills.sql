-- Run against a disposable migrated database with psql -v ON_ERROR_STOP=1 -f ...
-- All fixture data and role changes are rolled back. Tests real RLS, not mocks.
begin;
create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %', label; end if; end $$;
create function pg_temp.denied(command text) returns void language plpgsql as $$
begin
  begin execute command;
  exception when insufficient_privilege or check_violation or foreign_key_violation or unique_violation or raise_exception then return;
  end;
  raise exception 'FAIL: statement unexpectedly allowed: %', command;
end $$;

insert into auth.users(id,email) values
 ('10000000-0000-0000-0000-000000000001','owner@example.test'), ('10000000-0000-0000-0000-000000000002','tenant@example.test'),
 ('10000000-0000-0000-0000-000000000003','other@example.test'), ('10000000-0000-0000-0000-000000000004','stranger@example.test');
insert into public.apartments(id,user_id,name,purchase_price,notes) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Tenant-safe label',9000000,'Private owner note'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000004','Unrelated apartment',8000000,'Private');
insert into public.apartment_documents(apartment_id,user_id,storage_path,file_name,file_size_bytes,mime_type) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000001/deed.pdf','deed.pdf',100,'application/pdf');

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select pg_temp.assert_true(public.find_apartment_tenant_account('20000000-0000-0000-0000-000000000001','TENANT@example.test') = '10000000-0000-0000-0000-000000000002','tenant lookup uses Auth email');
select pg_temp.assert_true(public.find_apartment_tenant_account('20000000-0000-0000-0000-000000000002','tenant@example.test') is null,'cannot lookup tenants for another owner');
insert into public.apartment_tenants(id,apartment_id,owner_id,user_id,invited_email,apartment_label) values
 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','tenant@example.test','Tenant-safe label'),
 ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','other@example.test','Tenant-safe label');
insert into public.apartment_bills(id,apartment_id,owner_id,tenant_share_id,tenant_email,title,amount,due_date) values
 ('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','tenant@example.test','Electricity',1200,current_date),
 ('40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','other@example.test','Other tenant bill',1300,current_date);
insert into storage.objects(bucket_id,name) values ('apartment-bills','40000000-0000-0000-0000-000000000001/bill/10000000-0000-0000-0000-000000000001/bill.png');
update public.apartment_bills set storage_path=id::text||'/bill/10000000-0000-0000-0000-000000000001/bill.png',file_name='bill.png';
insert into public.expenses(id,user_id,apartment_id,category,amount,notes,visible_to_tenants) values
 ('50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','repair',100,'Shared note',true),
 ('50000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','tax',200,'Private note',false);
select pg_temp.denied($q$update public.apartment_bills set amount=1$q$);
select pg_temp.denied($q$insert into public.apartment_bills(apartment_id,owner_id,tenant_share_id,tenant_email,title,amount,due_date)
 values ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','tenant@example.test','Forged apartment',1,current_date)$q$);

-- Tenant reads only their assigned bill, their share label and explicitly shared expenses.
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select pg_temp.assert_true((select count(*)=1 from public.apartment_tenants),'only own tenant membership');
select pg_temp.assert_true(public.find_apartment_tenant_account('20000000-0000-0000-0000-000000000001','other@example.test') is null,'tenant cannot enumerate invitation accounts');
select pg_temp.assert_true((select count(*)=1 from public.apartment_bills),'no other tenant bills');
select pg_temp.assert_true((select count(*)=0 from public.apartments),'purchase data remains private');
select pg_temp.assert_true((select count(*)=0 from public.apartment_documents),'deeds remain private');
select pg_temp.assert_true((select count(*)=1 from public.expenses),'private expenses stay private');
select pg_temp.assert_true((select count(*)=1 from storage.objects where bucket_id='apartment-bills'),'only own bill file readable');
select pg_temp.denied($q$insert into public.expenses(user_id,apartment_id,category,amount,visible_to_tenants) values
 ('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','utility',1,true)$q$);
update public.apartment_bills set paid_at=now();
select pg_temp.assert_true((select bool_and(paid_at is null) from public.apartment_bills),'tenant cannot mark paid');
select pg_temp.denied($q$insert into public.apartment_bill_proofs(bill_id,user_id,storage_path,file_name,status,reviewed_at) values
 ('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001/proof/10000000-0000-0000-0000-000000000002/forged.png','forged.png','approved',now())$q$);
insert into storage.objects(bucket_id,name) values ('apartment-bills','40000000-0000-0000-0000-000000000001/proof/10000000-0000-0000-0000-000000000002/proof.png');
insert into public.apartment_bill_proofs(id,bill_id,user_id,storage_path,file_name) values
 ('60000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002',
 '40000000-0000-0000-0000-000000000001/proof/10000000-0000-0000-0000-000000000002/proof.png','proof.png');
select pg_temp.denied($q$select public.review_apartment_bill_proof('60000000-0000-0000-0000-000000000001',true,null)$q$);
select pg_temp.denied($q$insert into public.apartment_bill_proofs(bill_id,user_id,storage_path,file_name) values
 ('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001/proof/10000000-0000-0000-0000-000000000002/duplicate.png','duplicate.png')$q$);

-- Other tenant cannot read a receipt or submit proof for somebody else's bill.
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select pg_temp.assert_true((select count(*)=0 from public.apartment_bill_proofs),'other tenant proof privacy');
select pg_temp.denied($q$insert into public.apartment_bill_proofs(bill_id,user_id,storage_path,file_name) values
 ('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000001/proof/10000000-0000-0000-0000-000000000003/proof.png','proof.png')$q$);

-- Owner can reject, tenant can resubmit, owner approval atomically marks paid.
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select pg_temp.denied($q$select public.review_apartment_bill_proof('60000000-0000-0000-0000-000000000001',false,'')$q$);
select public.review_apartment_bill_proof('60000000-0000-0000-0000-000000000001',false,'Amount is unreadable');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
insert into public.apartment_bill_proofs(id,bill_id,user_id,storage_path,file_name) values
 ('60000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002',
 '40000000-0000-0000-0000-000000000001/proof/10000000-0000-0000-0000-000000000002/proof2.png','proof2.png');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select public.review_apartment_bill_proof('60000000-0000-0000-0000-000000000002',true,null);
select pg_temp.assert_true((select paid_at is not null from public.apartment_bills where id='40000000-0000-0000-0000-000000000001'),'approval marks paid');
select pg_temp.denied($q$select public.review_apartment_bill_proof('60000000-0000-0000-0000-000000000002',false,'Stale review')$q$);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select pg_temp.denied($q$insert into public.apartment_bill_proofs(bill_id,user_id,storage_path,file_name) values
 ('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001/proof/10000000-0000-0000-0000-000000000002/late.png','late.png')$q$);

-- Hiding immediately revokes bill/proof/file access; owners retain evidence.
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
update public.apartment_bills set visible_to_tenant=false where id='40000000-0000-0000-0000-000000000001';
update public.expenses set visible_to_tenants=false where id='50000000-0000-0000-0000-000000000001';
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select pg_temp.assert_true((select count(*)=0 from public.apartment_bills),'hidden bills unavailable');
select pg_temp.assert_true((select count(*)=0 from public.apartment_bill_proofs),'hidden bill proofs unavailable');
select pg_temp.assert_true((select count(*)=0 from public.expenses),'expense revocation');
select pg_temp.assert_true((select count(*)=0 from storage.objects where bucket_id='apartment-bills'),'hidden files unavailable');
delete from storage.objects where bucket_id='apartment-bills';
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select pg_temp.assert_true((select count(*)=2 from storage.objects where bucket_id='apartment-bills'),'tenant cannot erase evidence');
update public.apartment_bills set visible_to_tenant=true where id='40000000-0000-0000-0000-000000000001';
delete from public.apartment_tenants where id='30000000-0000-0000-0000-000000000001';
select pg_temp.assert_true((select count(*)=2 from public.apartment_bill_proofs),'owner retains review history');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select pg_temp.assert_true((select count(*)=0 from public.apartment_bills),'removed tenant loses access');
select pg_temp.assert_true((select count(*)=0 from public.apartment_bill_proofs),'removed tenant loses proof access');
select pg_temp.assert_true((select count(*)=0 from storage.objects where bucket_id='apartment-bills'),'removed tenant loses file access');

-- Anonymous callers have no table privileges even with permissive default grants.
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select pg_temp.denied('select * from public.apartment_bills');
select pg_temp.denied('select * from public.apartment_tenants');
select pg_temp.denied('select * from public.apartment_bill_proofs');
reset role;
rollback;
