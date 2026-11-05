#!/bin/bash
# Applies every migration to a fresh database on a plain Postgres 16 with
# PostGIS (no Supabase stack needed), then runs supabase/tests/*.sql.
#
#   PGHOST=/var/run/postgresql PGPORT=5432 PGUSER=postgres supabase/tests/local/run.sh
#
# supabase_shim.sql stands in for the Supabase-managed pieces the migrations
# use: the anon/authenticated/service_role roles and their default grants,
# auth.users and auth.uid(), and storage.buckets/objects.
set -euo pipefail
cd "$(dirname "$0")/../../.."
DB=${TEST_DB:-landlord_test}
P="psql -q -v ON_ERROR_STOP=1"

$P -d postgres -c "drop database if exists $DB"
$P -d postgres -c "do \$\$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    drop owned by anon, authenticated, service_role cascade;
    drop role anon, authenticated, service_role;
  end if; end \$\$" >/dev/null
$P -d postgres -c "create database $DB"
$P -d "$DB" -f supabase/tests/local/supabase_shim.sql

for f in supabase/migrations/*.sql; do
  $P -d "$DB" -f "$f" >/dev/null || { echo "Migration failed: $f"; exit 1; }
done
echo "Applied $(ls supabase/migrations/*.sql | wc -l) migrations."

status=0
for t in supabase/tests/*.sql; do
  if $P -d "$DB" -f "$t" >/dev/null; then echo "PASS $(basename "$t")"; else echo "FAIL $(basename "$t")"; status=1; fi
done
exit $status
