-- Phase: apartment/flat listings, sibling to land_plots (no GPS boundary —
-- a flat isn't walked/drawn like a plot, size is entered directly).
-- Sensitive/encryptable fields mirror land_plots' split (see 0009): building_name,
-- unit_number, purchase_price, purchase_date, current_estimated_value, notes
-- are written either plaintext or as one sensitive_encrypted/sensitive_iv blob,
-- never both — same rule as PlotMetadataForm/sensitiveFieldsFromForm.

create table if not exists apartments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  division text,
  district text,
  upazila text,
  floor text,
  unit_number text,
  building_name text,
  size numeric,
  size_unit text,
  purchase_price numeric,
  purchase_date date,
  current_estimated_value numeric,
  notes text,
  sensitive_encrypted bytea,
  sensitive_iv bytea,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table apartments enable row level security;

drop policy if exists "apartments_select_own" on apartments;
create policy "apartments_select_own" on apartments for select using (auth.uid() = user_id);
drop policy if exists "apartments_insert_own" on apartments;
create policy "apartments_insert_own" on apartments for insert with check (auth.uid() = user_id);
drop policy if exists "apartments_update_own" on apartments;
create policy "apartments_update_own" on apartments for update using (auth.uid() = user_id);
drop policy if exists "apartments_delete_own" on apartments;
create policy "apartments_delete_own" on apartments for delete using (auth.uid() = user_id);

create or replace function set_apartment_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists on_apartment_write on apartments;
create trigger on_apartment_write
  before insert or update on apartments
  for each row execute function set_apartment_timestamp();

create index if not exists apartments_user_id_idx on apartments (user_id);
