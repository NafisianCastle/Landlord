-- Plot sharing (MVP): let a plot's owner invite other accounts to view/edit
-- it. Two roles: 'viewer' (read-only) and 'editor' (can edit metadata, walk/
-- redraw the boundary, upload/delete documents — cannot delete the plot
-- itself or manage other collaborators; only the owner can do those).
--
-- Scope cuts (see plan): no pending-invite-before-signup (the invited email
-- must already have an account), no shared decryption of client-side
-- encrypted sensitive fields (those stay owner-only-readable — the DEK is
-- derived per-user from their own passphrase, see lib/crypto/session.ts).

create table if not exists plot_collaborators (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references land_plots(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Denormalized for display without joining `profiles` (whose RLS is
  -- select-own only, see 0001_profiles.sql).
  invited_email text not null,
  role text not null default 'editor' check (role in ('viewer', 'editor')),
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (plot_id, user_id)
);

alter table plot_collaborators enable row level security;

create index if not exists plot_collaborators_plot_idx on plot_collaborators (plot_id);
create index if not exists plot_collaborators_user_idx on plot_collaborators (user_id);

-- Looks up a Landlord account by email for invites, without exposing the
-- `profiles` table itself (whose RLS only allows selecting your own row).
create or replace function find_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from profiles where lower(email) = lower(p_email) limit 1;
$$;

revoke all on function find_user_id_by_email(text) from public;
grant execute on function find_user_id_by_email(text) to authenticated;

-- True if the caller owns the plot, or is a collaborator on it (optionally
-- requiring the 'editor' role). security definer so this can be called from
-- other tables' RLS policies without recursing back into land_plots' own
-- select policy (which itself calls this function) — the inner queries here
-- run as the (trusted) function owner, so RLS doesn't re-apply to them, while
-- auth.uid() still correctly resolves to the real calling user.
create or replace function is_plot_collaborator(p_plot_id uuid, p_require_editor boolean default false)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from land_plots p where p.id = p_plot_id and p.user_id = auth.uid()
  ) or exists (
    select 1 from plot_collaborators c
    where c.plot_id = p_plot_id
      and c.user_id = auth.uid()
      and (not p_require_editor or c.role = 'editor')
  );
$$;

revoke all on function is_plot_collaborator(uuid, boolean) from public;
grant execute on function is_plot_collaborator(uuid, boolean) to authenticated;

drop policy if exists "plot_collaborators_select" on plot_collaborators;
create policy "plot_collaborators_select" on plot_collaborators for select
  using (
    auth.uid() = user_id
    or exists (select 1 from land_plots p where p.id = plot_id and p.user_id = auth.uid())
  );

-- Only the plot's owner can invite collaborators.
drop policy if exists "plot_collaborators_insert_owner" on plot_collaborators;
create policy "plot_collaborators_insert_owner" on plot_collaborators for insert
  with check (
    exists (select 1 from land_plots p where p.id = plot_id and p.user_id = auth.uid())
  );

-- The owner can remove any collaborator; a collaborator can remove themselves (leave).
drop policy if exists "plot_collaborators_delete" on plot_collaborators;
create policy "plot_collaborators_delete" on plot_collaborators for delete
  using (
    auth.uid() = user_id
    or exists (select 1 from land_plots p where p.id = plot_id and p.user_id = auth.uid())
  );

-- Extend land_plots so collaborators can see/edit shared plots. Delete stays
-- owner-only (untouched, see 0002_land_plots.sql) — deleting a shared plot
-- is a decision only the owner should be able to make.
drop policy if exists "land_plots_select_own" on land_plots;
create policy "land_plots_select_own" on land_plots for select
  using (is_plot_collaborator(id));

drop policy if exists "land_plots_update_own" on land_plots;
create policy "land_plots_update_own" on land_plots for update
  using (is_plot_collaborator(id, true));

-- upsert_plot_boundary previously hardcoded `user_id = auth.uid()`, which
-- would still block editor-collaborators even after the RLS change above
-- (this WHERE clause runs regardless of RLS, since it's `security invoker`
-- and the condition is literal SQL, not merely relying on the table's
-- policy). Swap it for the same collaborator check.
create or replace function upsert_plot_boundary(p_plot_id uuid, p_geojson jsonb)
returns void
language plpgsql
security invoker
as $$
begin
  update land_plots
  set boundary = ST_SetSRID(ST_GeomFromGeoJSON(p_geojson::text), 4326)::geography
  where id = p_plot_id and is_plot_collaborator(id, true);
end;
$$;

-- plot_documents / plot_boundary_points: these tables' own `user_id` column
-- records who uploaded/captured the row (which may be a collaborator, not
-- the plot owner), so visibility must be based on access to the referenced
-- plot, not a match against that column.
drop policy if exists "plot_documents_select_own" on plot_documents;
create policy "plot_documents_select_own" on plot_documents for select
  using (is_plot_collaborator(plot_id));

drop policy if exists "plot_documents_insert_own" on plot_documents;
create policy "plot_documents_insert_own" on plot_documents for insert
  with check (auth.uid() = user_id and is_plot_collaborator(plot_id, true));

drop policy if exists "plot_documents_delete_own" on plot_documents;
create policy "plot_documents_delete_own" on plot_documents for delete
  using (is_plot_collaborator(plot_id, true));

drop policy if exists "plot_boundary_points_select_own" on plot_boundary_points;
create policy "plot_boundary_points_select_own" on plot_boundary_points for select
  using (is_plot_collaborator(plot_id));

drop policy if exists "plot_boundary_points_insert_own" on plot_boundary_points;
create policy "plot_boundary_points_insert_own" on plot_boundary_points for insert
  with check (auth.uid() = user_id and is_plot_collaborator(plot_id, true));

drop policy if exists "plot_boundary_points_delete_own" on plot_boundary_points;
create policy "plot_boundary_points_delete_own" on plot_boundary_points for delete
  using (is_plot_collaborator(plot_id, true));

-- Storage objects for documents are stored at {uploader_id}/{plot_id}/{...},
-- so folder segment 2 (not 1) is what determines plot-based access now.
drop policy if exists "land_documents_select_own" on storage.objects;
create policy "land_documents_select_own"
  on storage.objects for select
  using (bucket_id = 'land-documents' and is_plot_collaborator(((storage.foldername(name))[2])::uuid));

drop policy if exists "land_documents_insert_own" on storage.objects;
create policy "land_documents_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'land-documents' and is_plot_collaborator(((storage.foldername(name))[2])::uuid, true));

drop policy if exists "land_documents_delete_own" on storage.objects;
create policy "land_documents_delete_own"
  on storage.objects for delete
  using (bucket_id = 'land-documents' and is_plot_collaborator(((storage.foldername(name))[2])::uuid, true));
