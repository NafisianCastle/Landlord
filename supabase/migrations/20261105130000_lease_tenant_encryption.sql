-- Opt-in client-side encryption for lease tenant details, same scheme as
-- land_plots/apartments (0009): when the owner has encryption unlocked, the
-- client writes tenant name, phone, email and notes as one AES-GCM blob in
-- sensitive_encrypted/sensitive_iv and leaves the plaintext columns null.
--
-- Rent amount, frequency and dates stay plaintext: payment scheduling
-- (ensure_lease_payments), reminders and stats run on the server and need
-- them. Push reminders fall back to the property name when the tenant name
-- is encrypted.

alter table leases
  add column if not exists sensitive_encrypted bytea,
  add column if not exists sensitive_iv bytea;

alter table leases alter column tenant_name drop not null;

alter table leases drop constraint if exists leases_input_limits;
alter table leases add constraint leases_input_limits check (
  (
    (sensitive_encrypted is null and sensitive_iv is null
      and tenant_name is not null and length(btrim(tenant_name)) between 1 and 200)
    or
    (sensitive_encrypted is not null and octet_length(sensitive_encrypted) between 16 and 32768
      and sensitive_iv is not null and octet_length(sensitive_iv) = 12
      and tenant_name is null and tenant_phone is null and tenant_email is null and notes is null)
  )
  and coalesce(length(tenant_email), 0) <= 254
  and coalesce(length(tenant_phone), 0) <= 32
  and coalesce(length(notes), 0) <= 10000
  and rent_amount > 0 and rent_amount <= 1000000000000
  and (end_date is null or end_date >= start_date)
) not valid;
