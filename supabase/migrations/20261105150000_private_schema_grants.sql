-- Fix for 20261105140000_security_hardening.sql: its triggers run as the
-- caller and call private.is_api_caller(), but only `authenticated` had
-- USAGE on the private schema. Writes by the service role (reminder crons,
-- admin tools, demo seeding) failed with "permission denied for schema
-- private". Tested by supabase/tests/service_role.sql.
grant usage on schema private to service_role;
grant execute on function private.is_api_caller() to service_role, authenticated;
