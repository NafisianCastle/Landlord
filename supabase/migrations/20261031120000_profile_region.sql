-- Per-account region settings for the mobile app's global audience. Null
-- means "use the country's default" (and a null country means "use the
-- device's region"), so existing rows keep today's Bangladesh behaviour.
-- Stored amounts and areas don't change meaning: these only affect display
-- and which units the forms offer.
alter table public.profiles
  add column country_code text check (country_code ~ '^[A-Z]{2}$'),
  add column currency_code text check (currency_code ~ '^[A-Z]{3}$'),
  add column area_unit text check (area_unit ~ '^[a-z_]{1,20}$'),
  add column measurement_system text check (measurement_system in ('metric', 'imperial'));
-- profiles_update_own (0001) already lets users update their own row.
