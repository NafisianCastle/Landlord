-- Tenant invitations deliberately do NOT grant access to apartments or deeds.
-- The label is an owner-approved display name, not a join exposing private fields.
create schema if not exists private;
-- Profile email is user-editable. Resolve invitations against Auth instead.
-- The privileged lookup is private and requires ownership of the target apartment.
create function private.find_apartment_tenant_account(p_apartment_id uuid, p_email text)
returns uuid language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u where lower(u.email) = lower(btrim(p_email))
    and u.deleted_at is null and auth.uid() is not null
    and exists (select 1 from public.apartments a where a.id = p_apartment_id and a.user_id = auth.uid())
  limit 1;
$$;
revoke all on function private.find_apartment_tenant_account(uuid, text) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.find_apartment_tenant_account(uuid, text) to authenticated;
create function public.find_apartment_tenant_account(p_apartment_id uuid, p_email text)
returns uuid language sql stable security invoker set search_path = '' as $$
  select private.find_apartment_tenant_account(p_apartment_id, p_email);
$$;
revoke all on function public.find_apartment_tenant_account(uuid, text) from public, anon;
grant execute on function public.find_apartment_tenant_account(uuid, text) to authenticated;

create table public.apartment_tenants (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  invited_email text not null check (length(invited_email) between 3 and 254),
  apartment_label text not null check (length(btrim(apartment_label)) between 1 and 200),
  created_at timestamptz not null default now(),
  unique(apartment_id, user_id),
  unique(id, apartment_id, owner_id),
  check (owner_id <> user_id)
);
alter table public.apartment_tenants enable row level security;
revoke all on public.apartment_tenants from public, anon, authenticated;
grant select, insert, delete on public.apartment_tenants to authenticated;
create index apartment_tenants_user_idx on public.apartment_tenants(user_id);
create index apartment_tenants_owner_idx on public.apartment_tenants(owner_id);
create policy tenant_share_read on public.apartment_tenants for select to authenticated
  using ((select auth.uid()) in (owner_id, user_id));
create policy tenant_share_invite on public.apartment_tenants for insert to authenticated
  with check (owner_id = (select auth.uid()) and exists (
    select 1 from public.apartments a where a.id = apartment_id and a.user_id = (select auth.uid())
  ));
create policy tenant_share_remove on public.apartment_tenants for delete to authenticated
  using (owner_id = (select auth.uid()));

create table public.apartment_bills (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  tenant_share_id uuid references public.apartment_tenants(id) on delete set null,
  tenant_email text not null check (length(tenant_email) between 3 and 254),
  title text not null check (length(btrim(title)) between 1 and 200),
  amount numeric(15,2) not null check (amount > 0 and amount <= 1000000000000),
  due_date date not null check (due_date between date '1900-01-01' and date '9999-12-31'),
  visible_to_tenant boolean not null default true,
  storage_path text unique,
  file_name text check (length(file_name) between 1 and 180),
  paid_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (tenant_share_id, apartment_id, owner_id)
    references public.apartment_tenants(id, apartment_id, owner_id),
  check ((storage_path is null and file_name is null) or
    (storage_path is not null and file_name is not null and
     storage_path like id::text || '/bill/' || owner_id::text || '/%'))
);
alter table public.apartment_bills enable row level security;
revoke all on public.apartment_bills from public, anon, authenticated;
grant select, insert, delete on public.apartment_bills to authenticated;
-- Issued amounts, recipients, and dates cannot be silently changed after proof submission.
grant update(storage_path, file_name, visible_to_tenant, paid_at) on public.apartment_bills to authenticated;
grant all on public.apartment_tenants, public.apartment_bills to service_role;
create index apartment_bills_apartment_idx on public.apartment_bills(apartment_id);
create index apartment_bills_share_idx on public.apartment_bills(tenant_share_id, apartment_id, owner_id);
create index apartment_bills_owner_idx on public.apartment_bills(owner_id);
create index apartment_bills_due_idx on public.apartment_bills(due_date)
  where paid_at is null and visible_to_tenant and storage_path is not null;
create policy bill_read on public.apartment_bills for select to authenticated using (
  owner_id = (select auth.uid()) or (visible_to_tenant and storage_path is not null and exists (
    select 1 from public.apartment_tenants t where t.id = tenant_share_id and t.user_id = (select auth.uid())
  ))
);
create policy bill_create on public.apartment_bills for insert to authenticated with check (
  owner_id = (select auth.uid()) and exists (
    select 1 from public.apartments a where a.id = apartment_id and a.user_id = (select auth.uid())
  ) and exists (
    select 1 from public.apartment_tenants t where t.id = tenant_share_id
      and t.apartment_id = apartment_id and t.owner_id = (select auth.uid())
  )
);
create policy bill_edit on public.apartment_bills for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy bill_remove on public.apartment_bills for delete to authenticated
  using (owner_id = (select auth.uid()) and storage_path is null);

create table public.apartment_bill_proofs (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.apartment_bills(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  storage_path text not null unique,
  file_name text not null check (length(file_name) between 1 and 180),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text check (length(review_note) <= 1000),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (storage_path like bill_id::text || '/proof/' || user_id::text || '/%'),
  check ((status = 'pending' and reviewed_at is null and review_note is null)
    or (status <> 'pending' and reviewed_at is not null))
);
alter table public.apartment_bill_proofs enable row level security;
revoke all on public.apartment_bill_proofs from public, anon, authenticated;
grant select, insert on public.apartment_bill_proofs to authenticated;
grant update(status, review_note, reviewed_at) on public.apartment_bill_proofs to authenticated;
grant all on public.apartment_bill_proofs to service_role;
create index apartment_bill_proofs_bill_idx on public.apartment_bill_proofs(bill_id);
create index apartment_bill_proofs_user_idx on public.apartment_bill_proofs(user_id);
create unique index one_pending_bill_proof on public.apartment_bill_proofs(bill_id) where status = 'pending';
create policy proof_read on public.apartment_bill_proofs for select to authenticated using (
  exists (select 1 from public.apartment_bills b where b.id = bill_id
    and (b.owner_id = (select auth.uid()) or user_id = (select auth.uid())))
);
create policy proof_submit on public.apartment_bill_proofs for insert to authenticated with check (
  user_id = (select auth.uid()) and status = 'pending' and reviewed_at is null and review_note is null
  and exists (select 1 from public.apartment_bills b join public.apartment_tenants t on t.id = b.tenant_share_id
    where b.id = bill_id and t.user_id = (select auth.uid()) and b.visible_to_tenant
      and b.storage_path is not null and b.paid_at is null)
);
create policy proof_review on public.apartment_bill_proofs for update to authenticated
  using (exists (select 1 from public.apartment_bills b where b.id = bill_id and b.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.apartment_bills b where b.id = bill_id and b.owner_id = (select auth.uid())));

-- Serialize proof submission with approval so a racing submission cannot leave
-- an approved bill with a new pending proof. Invoker security retains caller RLS.
create schema if not exists private;
create function private.check_bill_proof_submission() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.bill_id::text, 1));
  if not exists (select 1 from public.apartment_bills b
    join public.apartment_tenants t on t.id = b.tenant_share_id
    where b.id = new.bill_id and b.paid_at is null and b.visible_to_tenant
      and b.storage_path is not null and t.user_id = auth.uid()) then
    raise exception 'Bill is unavailable or already paid';
  end if;
  return new;
end;
$$;
revoke all on function private.check_bill_proof_submission() from public, anon, authenticated;
create trigger check_bill_proof_submission before insert on public.apartment_bill_proofs
  for each row execute function private.check_bill_proof_submission();

-- Both writes happen in one transaction; concurrent reviews cannot override one another.
create function public.review_apartment_bill_proof(p_proof_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_bill_id uuid; v_owner uuid; v_status text;
begin
  if p_approve is null then raise exception 'A review decision is required'; end if;
  select bill_id into v_bill_id from public.apartment_bill_proofs where id = p_proof_id;
  if v_bill_id is null or auth.uid() is null then raise exception 'Proof not found'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_bill_id::text, 1));
  select owner_id into v_owner from public.apartment_bills where id = v_bill_id for update;
  if v_owner is distinct from auth.uid() then raise exception 'Owner access required'; end if;
  select status into v_status from public.apartment_bill_proofs where id = p_proof_id for update;
  if v_status <> 'pending' then raise exception 'This proof has already been reviewed'; end if;
  if not p_approve and length(btrim(coalesce(p_note, ''))) = 0 then raise exception 'A rejection reason is required'; end if;
  update public.apartment_bill_proofs set status = case when p_approve then 'approved' else 'rejected' end,
    reviewed_at = now(), review_note = nullif(btrim(p_note), '') where id = p_proof_id;
  if p_approve then update public.apartment_bills set paid_at = now() where id = v_bill_id; end if;
end;
$$;
revoke all on function public.review_apartment_bill_proof(uuid, boolean, text) from public, anon;
grant execute on function public.review_apartment_bill_proof(uuid, boolean, text) to authenticated;

-- Default private. Only the apartment owner can publish expenses, including notes.
alter table public.expenses add column visible_to_tenants boolean not null default false;
drop policy expenses_select_own on public.expenses;
create policy expenses_select_access on public.expenses for select to authenticated using (
  user_id = (select auth.uid()) or (visible_to_tenants and exists (select 1 from public.apartment_tenants t
    where t.apartment_id = expenses.apartment_id and t.owner_id = expenses.user_id and t.user_id = (select auth.uid()))
  )
);
-- An expense cannot be attached to somebody else's property to impersonate its owner.
drop policy expenses_insert_own on public.expenses;
create policy expenses_insert_own on public.expenses for insert to authenticated with check (
  user_id = (select auth.uid()) and (
    (apartment_id is not null and exists (select 1 from public.apartments a where a.id = apartment_id and a.user_id = (select auth.uid())))
    or (plot_id is not null and exists (select 1 from public.land_plots p where p.id = plot_id and p.user_id = (select auth.uid())))
  )
);
drop policy expenses_update_own on public.expenses;
create policy expenses_update_own on public.expenses for update to authenticated
  using (user_id = (select auth.uid())) with check (
    user_id = (select auth.uid()) and (
      (apartment_id is not null and exists (select 1 from public.apartments a where a.id = apartment_id and a.user_id = (select auth.uid())))
      or (plot_id is not null and exists (select 1 from public.land_plots p where p.id = plot_id and p.user_id = (select auth.uid())))
    )
  );
drop policy expenses_delete_own on public.expenses;
create policy expenses_delete_own on public.expenses for delete to authenticated using (user_id = (select auth.uid()));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('apartment-bills', 'apartment-bills', false, 10485760,
  array['image/jpeg','image/png','image/webp','application/pdf']);
-- No UPDATE/upsert: a submitted receipt is immutable evidence. Random object keys.
create policy bill_file_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'apartment-bills' and (storage.foldername(name))[3] = (select auth.uid())::text
  and exists (select 1 from public.apartment_bills b where b.id::text = (storage.foldername(name))[1]
    and ((b.owner_id = (select auth.uid()) and (storage.foldername(name))[2] = 'bill' and b.storage_path is null)
      or ((storage.foldername(name))[2] = 'proof' and b.paid_at is null and b.visible_to_tenant and b.storage_path is not null
        and exists (select 1 from public.apartment_tenants t where t.id = b.tenant_share_id and t.user_id = (select auth.uid())))))
);
create policy bill_file_read on storage.objects for select to authenticated using (
  bucket_id = 'apartment-bills' and (
    exists (select 1 from public.apartment_bills b where b.storage_path = name)
    or exists (select 1 from public.apartment_bill_proofs p where p.storage_path = name)
  )
);
-- No client DELETE: hiding a bill must not let tenants erase payment evidence.
-- Failed uploads may leave unreferenced private objects for administrator cleanup.
