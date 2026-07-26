-- Document metadata + private storage bucket for apartment document PDFs.
-- Mirrors 0006_plot_documents.sql. Storage path convention:
-- {user_id}/{apartment_id}/{uuid}-{filename}.pdf

create table if not exists apartment_documents (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references apartments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_size_bytes bigint,
  mime_type text,
  is_encrypted boolean not null default false,
  encryption_iv bytea,
  uploaded_at timestamptz not null default now()
);

alter table apartment_documents enable row level security;

drop policy if exists "apartment_documents_select_own" on apartment_documents;
create policy "apartment_documents_select_own" on apartment_documents for select using (auth.uid() = user_id);
drop policy if exists "apartment_documents_insert_own" on apartment_documents;
create policy "apartment_documents_insert_own" on apartment_documents for insert with check (auth.uid() = user_id);
drop policy if exists "apartment_documents_delete_own" on apartment_documents;
create policy "apartment_documents_delete_own" on apartment_documents for delete using (auth.uid() = user_id);

create index if not exists apartment_documents_apartment_idx on apartment_documents (apartment_id);

insert into storage.buckets (id, name, public)
values ('apartment-documents', 'apartment-documents', false)
on conflict (id) do nothing;

drop policy if exists "apartment_documents_select_own" on storage.objects;
create policy "apartment_documents_select_own"
  on storage.objects for select
  using (bucket_id = 'apartment-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "apartment_documents_insert_own" on storage.objects;
create policy "apartment_documents_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'apartment-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "apartment_documents_delete_own" on storage.objects;
create policy "apartment_documents_delete_own"
  on storage.objects for delete
  using (bucket_id = 'apartment-documents' and (storage.foldername(name))[1] = auth.uid()::text);
