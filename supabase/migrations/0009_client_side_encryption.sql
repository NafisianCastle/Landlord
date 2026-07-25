-- Opt-in client-side (zero-knowledge) encryption for sensitive plot fields.
--
-- Scheme: each user has one random AES-256-GCM data encryption key (DEK),
-- generated client-side and never sent to the server in plaintext. The DEK
-- is wrapped twice — once with a key derived (PBKDF2) from the user's
-- encryption passphrase, once with a key derived from a one-time recovery
-- code shown at setup — so either secret alone can unwrap it. Only the
-- wrapped blobs + salts + IVs are stored server-side.
--
-- Server-side plaintext columns (village, mutation_number, purchase_price,
-- purchase_date, current_estimated_value, notes) are kept as a fallback for
-- users who never opt in; once encryption is enabled the app writes to
-- `sensitive_encrypted`/`sensitive_iv` instead and leaves the plaintext
-- columns null going forward. Existing plaintext rows are left as-is —
-- migrating them requires the user's passphrase and happens client-side,
-- not in this migration.
--
-- Geometry (`boundary`) and documents are NOT covered by `sensitive_encrypted`:
-- boundary stays plaintext (PostGIS needs it for area/ST_Contains/map
-- rendering — encrypting it would break core map features) and documents get
-- their own per-file IV since each is encrypted independently.

alter table profiles
  add column encryption_enabled boolean not null default false,
  add column dek_salt bytea,
  add column dek_wrapped_by_passphrase bytea,
  add column dek_wrapped_by_passphrase_iv bytea,
  add column recovery_salt bytea,
  add column dek_wrapped_by_recovery bytea,
  add column dek_wrapped_by_recovery_iv bytea;

alter table land_plots
  add column sensitive_encrypted bytea,
  add column sensitive_iv bytea;

alter table plot_documents
  add column is_encrypted boolean not null default false,
  add column encryption_iv bytea;
