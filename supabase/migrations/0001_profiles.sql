-- Phase 0: extensions + profiles + trial window

create extension if not exists postgis;

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  preferred_language text not null default 'bn' check (preferred_language in ('bn','en')),
  trial_ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
-- no insert/delete policy: rows are only ever created by the trigger below (as the
-- definer), and are never deleted by end users.

create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, trial_ends_at)
  values (new.id, new.email, now() + interval '14 days');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
