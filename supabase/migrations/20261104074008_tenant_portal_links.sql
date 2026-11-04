-- Tenant billing links let an owner share a read-only bill portal with a
-- tenant who does not have a Landlord account. Raw link secrets never enter
-- the database: the trusted web server stores only a SHA-256 hash.

alter table public.apartment_tenants
  alter column user_id drop not null;

create unique index apartment_tenants_apartment_email_unique
  on public.apartment_tenants (apartment_id, lower(btrim(invited_email)));

drop policy if exists tenant_share_read on public.apartment_tenants;
create policy tenant_share_read on public.apartment_tenants for select to authenticated
  using (owner_id = (select auth.uid()) or user_id = (select auth.uid()));

create table public.tenant_portal_links (
  id uuid primary key default gen_random_uuid(),
  tenant_share_id uuid not null references public.apartment_tenants(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (revoked_at is null or revoked_at >= created_at)
);

alter table public.tenant_portal_links enable row level security;
revoke all on public.tenant_portal_links from public, anon, authenticated;
grant all on public.tenant_portal_links to service_role;

create index tenant_portal_links_active_share_idx
  on public.tenant_portal_links (tenant_share_id, expires_at desc)
  where revoked_at is null;
