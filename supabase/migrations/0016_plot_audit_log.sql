-- Plot audit history: who changed what, visible to the plot's owner. Matters
-- now that editor-collaborators (0015) can change a plot they don't own.
--
-- Visible to the owner only, not collaborators — mirrors the existing
-- owner-only gating on collaborator management (PlotCollaborators.tsx).

create table if not exists plot_audit_log (
  id uuid primary key default gen_random_uuid(),
  -- No FK to land_plots — must survive the plot row being deleted (a cascade
  -- would delete the plot's own "deleted" log entry the instant it's written).
  plot_id uuid not null,
  plot_name text not null, -- snapshot: the plot may later be renamed or deleted
  owner_user_id uuid not null, -- snapshot of land_plots.user_id at event time; what RLS checks
  actor_user_id uuid,
  actor_email text, -- snapshot — profiles RLS is select-own only, actor may not be the viewer
  action text not null check (
    action in (
      'created', 'metadata_updated', 'boundary_updated', 'deleted',
      'collaborator_invited', 'collaborator_removed'
    )
  ),
  detail jsonb,
  created_at timestamptz not null default now()
);

alter table plot_audit_log enable row level security;

drop policy if exists "plot_audit_log_select_owner" on plot_audit_log;
create policy "plot_audit_log_select_owner" on plot_audit_log for select
  using (auth.uid() = owner_user_id);

-- No insert/update/delete policies for regular users — the only writers are
-- the trigger function and RPC below, both security definer.

create index if not exists plot_audit_log_plot_idx on plot_audit_log (plot_id, created_at desc);

create or replace function log_plot_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_plot_id uuid;
  v_plot_name text;
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_owner := new.user_id;
    v_plot_id := new.id;
    v_plot_name := new.name;
    v_action := 'created';
  elsif tg_op = 'DELETE' then
    v_owner := old.user_id;
    v_plot_id := old.id;
    v_plot_name := old.name;
    v_action := 'deleted';
  else
    v_owner := new.user_id;
    v_plot_id := new.id;
    v_plot_name := new.name;
    v_action := case
      when old.boundary is distinct from new.boundary then 'boundary_updated'
      else 'metadata_updated'
    end;
  end if;

  insert into plot_audit_log (plot_id, plot_name, owner_user_id, actor_user_id, actor_email, action)
  values (
    v_plot_id, v_plot_name, v_owner, auth.uid(),
    (select email from profiles where id = auth.uid()),
    v_action
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists on_land_plot_audit on land_plots;
create trigger on_land_plot_audit
  after insert or update or delete on land_plots
  for each row execute function log_plot_audit();

-- Collaborator invite/remove aren't land_plots writes, so they're logged
-- explicitly by the server actions that perform them, via this RPC rather
-- than a trigger on plot_collaborators (clearer action names than inferring
-- intent from row shape).
create or replace function log_plot_collaborator_audit(p_plot_id uuid, p_action text, p_detail jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_name text;
begin
  select user_id, name into v_owner, v_name from land_plots where id = p_plot_id;
  if v_owner is null then
    raise exception 'plot not found';
  end if;

  insert into plot_audit_log (plot_id, plot_name, owner_user_id, actor_user_id, actor_email, action, detail)
  values (
    p_plot_id, v_name, v_owner, auth.uid(),
    (select email from profiles where id = auth.uid()),
    p_action, p_detail
  );
end;
$$;

revoke all on function log_plot_collaborator_audit(uuid, text, jsonb) from public;
grant execute on function log_plot_collaborator_audit(uuid, text, jsonb) to authenticated;
