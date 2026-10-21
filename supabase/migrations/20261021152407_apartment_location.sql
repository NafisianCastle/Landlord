-- A building pin is independent of an apartment's floor area and ownership data.
alter table public.apartments add column latitude double precision;
alter table public.apartments add column longitude double precision;
alter table public.apartments add constraint apartments_location_valid check (
  (latitude is null and longitude is null) or
  (latitude is not null and longitude is not null and
   latitude between -90 and 90 and longitude between -180 and 180)
);
-- Existing apartment RLS allows owners/editors to write and viewers to read.
-- Tenant billing invitations do not grant access to the apartments table.
