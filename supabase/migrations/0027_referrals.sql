-- Referral codes: every profile gets one at signup; referred_by links a new
-- user back to whoever's code they signed up through. No reward logic here
-- (that's a pricing decision) — just the tracking needed to show it later.

alter table profiles add column if not exists referral_code text;
alter table profiles add column if not exists referred_by uuid references profiles(id) on delete set null;

create unique index if not exists profiles_referral_code_idx on profiles (referral_code);

-- 8 hex chars from the profile's own id — deterministic, no collision retry
-- loop needed, and stable across re-reads.
create or replace function generate_referral_code(p_id uuid)
returns text
language sql
immutable
as $$
  select upper(substr(md5(p_id::text), 1, 8));
$$;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referred_by uuid;
begin
  if new.raw_user_meta_data ? 'referral_code' then
    select id into v_referred_by
    from public.profiles
    where referral_code = upper(new.raw_user_meta_data->>'referral_code')
    limit 1;
  end if;

  insert into public.profiles (id, email, trial_ends_at, referral_code, referred_by)
  values (
    new.id,
    new.email,
    now() + interval '14 days',
    generate_referral_code(new.id),
    v_referred_by
  );
  return new;
end;
$$;

-- profiles_select_own limits a user to their own row, so counting people
-- *they* referred needs a definer function rather than a direct query.
create or replace function get_referral_count()
returns int
language sql
security definer
set search_path = public
as $$
  select count(*)::int from profiles where referred_by = auth.uid();
$$;

revoke all on function get_referral_count() from public;
grant execute on function get_referral_count() to authenticated;

-- Used by the OAuth callback (Google sign-in has no signUp() call to pass
-- referral_code through as user metadata like the email/password path does,
-- so it attributes the referral after the fact instead). No-ops once
-- referred_by is already set, so it's safe to call on every login.
create or replace function attribute_referral(p_referral_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set referred_by = (select id from profiles where referral_code = upper(p_referral_code))
  where id = auth.uid() and referred_by is null and id <> (select id from profiles where referral_code = upper(p_referral_code));
end;
$$;

revoke all on function attribute_referral(text) from public;
grant execute on function attribute_referral(text) to authenticated;

-- Backfill referral codes for existing profiles (created before this migration).
update profiles set referral_code = generate_referral_code(id) where referral_code is null;

alter table profiles alter column referral_code set not null;
