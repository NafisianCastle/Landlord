-- Document metadata + private storage bucket for land document PDFs.
-- Storage path convention: {user_id}/{plot_id}/{uuid}-{filename}.pdf

create table plot_documents (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references land_plots(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_size_bytes bigint,
  mime_type text,
  uploaded_at timestamptz not null default now()
);

alter table plot_documents enable row level security;

create policy "plot_documents_select_own" on plot_documents for select using (auth.uid() = user_id);
create policy "plot_documents_insert_own" on plot_documents for insert with check (auth.uid() = user_id);
create policy "plot_documents_delete_own" on plot_documents for delete using (auth.uid() = user_id);

create index plot_documents_plot_idx on plot_documents (plot_id);

insert into storage.buckets (id, name, public)
values ('land-documents', 'land-documents', false)
on conflict (id) do nothing;

-- Storage object paths are prefixed with the owning user's id, so RLS can
-- check ownership from the path alone without a join.
create policy "land_documents_select_own"
  on storage.objects for select
  using (bucket_id = 'land-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "land_documents_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'land-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "land_documents_delete_own"
  on storage.objects for delete
  using (bucket_id = 'land-documents' and (storage.foldername(name))[1] = auth.uid()::text);
