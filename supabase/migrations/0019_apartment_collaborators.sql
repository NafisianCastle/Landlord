-- Apartment sharing (MVP), mirrors 0015_plot_collaborators.sql. Two roles:
-- 'viewer' (read-only) and 'editor' (can edit metadata, upload/delete
-- documents — cannot delete the apartment itself or manage other
-- collaborators; only the owner can do those).

create table if not exists apartment_collaborators (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references apartments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invited_email text not null,
  role text not null default 'editor' check (role in ('viewer', 'editor')),
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (apartment_id, user_id)
);

alter table apartment_collaborators enable row level security;

create index if not exists apartment_collaborators_apartment_idx on apartment_collaborators (apartment_id);
create index if not exists apartment_collaborators_user_idx on apartment_collaborators (user_id);

-- find_user_id_by_email (0015) is already generic — reused unchanged.

create or replace function is_apartment_collaborator(p_apartment_id uuid, p_require_editor boolean default false)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from apartments a where a.id = p_apartment_id and a.user_id = auth.uid()
  ) or exists (
    select 1 from apartment_collaborators c
    where c.apartment_id = p_apartment_id
      and c.user_id = auth.uid()
      and (not p_require_editor or c.role = 'editor')
  );
$$;

revoke all on function is_apartment_collaborator(uuid, boolean) from public;
grant execute on function is_apartment_collaborator(uuid, boolean) to authenticated;

drop policy if exists "apartment_collaborators_select" on apartment_collaborators;
create policy "apartment_collaborators_select" on apartment_collaborators for select
  using (
    auth.uid() = user_id
    or exists (select 1 from apartments a where a.id = apartment_id and a.user_id = auth.uid())
  );

drop policy if exists "apartment_collaborators_insert_owner" on apartment_collaborators;
create policy "apartment_collaborators_insert_owner" on apartment_collaborators for insert
  with check (
    exists (select 1 from apartments a where a.id = apartment_id and a.user_id = auth.uid())
  );

drop policy if exists "apartment_collaborators_delete" on apartment_collaborators;
create policy "apartment_collaborators_delete" on apartment_collaborators for delete
  using (
    auth.uid() = user_id
    or exists (select 1 from apartments a where a.id = apartment_id and a.user_id = auth.uid())
  );

-- Extend apartments so collaborators can see/edit shared apartments. Delete
-- stays owner-only (untouched, see 0017_apartments.sql).
drop policy if exists "apartments_select_own" on apartments;
create policy "apartments_select_own" on apartments for select
  using (is_apartment_collaborator(id));

drop policy if exists "apartments_update_own" on apartments;
create policy "apartments_update_own" on apartments for update
  using (is_apartment_collaborator(id, true));

drop policy if exists "apartment_documents_select_own" on apartment_documents;
create policy "apartment_documents_select_own" on apartment_documents for select
  using (is_apartment_collaborator(apartment_id));

drop policy if exists "apartment_documents_insert_own" on apartment_documents;
create policy "apartment_documents_insert_own" on apartment_documents for insert
  with check (auth.uid() = user_id and is_apartment_collaborator(apartment_id, true));

drop policy if exists "apartment_documents_delete_own" on apartment_documents;
create policy "apartment_documents_delete_own" on apartment_documents for delete
  using (is_apartment_collaborator(apartment_id, true));

-- Storage objects for documents are stored at {uploader_id}/{apartment_id}/{...},
-- so folder segment 2 is what determines apartment-based access.
drop policy if exists "apartment_documents_select_own" on storage.objects;
create policy "apartment_documents_select_own"
  on storage.objects for select
  using (bucket_id = 'apartment-documents' and is_apartment_collaborator(((storage.foldername(name))[2])::uuid));

drop policy if exists "apartment_documents_insert_own" on storage.objects;
create policy "apartment_documents_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'apartment-documents' and is_apartment_collaborator(((storage.foldername(name))[2])::uuid, true));

drop policy if exists "apartment_documents_delete_own" on storage.objects;
create policy "apartment_documents_delete_own"
  on storage.objects for delete
  using (bucket_id = 'apartment-documents' and is_apartment_collaborator(((storage.foldername(name))[2])::uuid, true));
