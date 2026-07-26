-- Apartment audit history, mirrors 0016_plot_audit_log.sql. Visible to the
-- apartment's owner only, not collaborators.

create table if not exists apartment_audit_log (
  id uuid primary key default gen_random_uuid(),
  -- No FK to apartments — must survive the apartment row being deleted.
  apartment_id uuid not null,
  apartment_name text not null,
  owner_user_id uuid not null,
  actor_user_id uuid,
  actor_email text,
  action text not null check (
    action in (
      'created', 'metadata_updated', 'deleted',
      'collaborator_invited', 'collaborator_removed'
    )
  ),
  detail jsonb,
  created_at timestamptz not null default now()
);

alter table apartment_audit_log enable row level security;

drop policy if exists "apartment_audit_log_select_owner" on apartment_audit_log;
create policy "apartment_audit_log_select_owner" on apartment_audit_log for select
  using (auth.uid() = owner_user_id);

create index if not exists apartment_audit_log_apartment_idx on apartment_audit_log (apartment_id, created_at desc);

create or replace function log_apartment_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_apartment_id uuid;
  v_apartment_name text;
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_owner := new.user_id;
    v_apartment_id := new.id;
    v_apartment_name := new.name;
    v_action := 'created';
  elsif tg_op = 'DELETE' then
    v_owner := old.user_id;
    v_apartment_id := old.id;
    v_apartment_name := old.name;
    v_action := 'deleted';
  else
    v_owner := new.user_id;
    v_apartment_id := new.id;
    v_apartment_name := new.name;
    v_action := 'metadata_updated';
  end if;

  insert into apartment_audit_log (apartment_id, apartment_name, owner_user_id, actor_user_id, actor_email, action)
  values (
    v_apartment_id, v_apartment_name, v_owner, auth.uid(),
    (select email from profiles where id = auth.uid()),
    v_action
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists on_apartment_audit on apartments;
create trigger on_apartment_audit
  after insert or update or delete on apartments
  for each row execute function log_apartment_audit();

create or replace function log_apartment_collaborator_audit(p_apartment_id uuid, p_action text, p_detail jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_name text;
begin
  select user_id, name into v_owner, v_name from apartments where id = p_apartment_id;
  if v_owner is null then
    raise exception 'apartment not found';
  end if;

  insert into apartment_audit_log (apartment_id, apartment_name, owner_user_id, actor_user_id, actor_email, action, detail)
  values (
    p_apartment_id, v_name, v_owner, auth.uid(),
    (select email from profiles where id = auth.uid()),
    p_action, p_detail
  );
end;
$$;

revoke all on function log_apartment_collaborator_audit(uuid, text, jsonb) from public;
grant execute on function log_apartment_collaborator_audit(uuid, text, jsonb) to authenticated;
