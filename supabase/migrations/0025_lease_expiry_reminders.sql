-- Lease-renewal push reminders. Scoped to leases.end_date since that's the
-- only expiry-relevant date in the schema — plot/apartment documents have no
-- expiry_date field (they're scanned copies of static deeds/ownership docs,
-- not permits that expire), so this doesn't cover those.
alter table leases add column if not exists expiry_reminder_sent_at timestamptz;
