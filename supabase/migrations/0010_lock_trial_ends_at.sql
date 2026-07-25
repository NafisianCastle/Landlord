-- profiles_update_own (0001) lets a user update any column on their own row,
-- including trial_ends_at, which hasActiveAccess() trusts as the paywall
-- gate — a user could otherwise grant themselves free access forever via
-- `supabase.from("profiles").update({ trial_ends_at: ... })`. Force the
-- column to its previous value on every user-initiated update so only
-- server-side code paths (none currently update it post-signup) can move it.

create function lock_profile_trial_ends_at()
returns trigger
language plpgsql
as $$
begin
  new.trial_ends_at := old.trial_ends_at;
  return new;
end;
$$;

create trigger lock_profile_trial_ends_at_trigger
  before update on profiles
  for each row execute function lock_profile_trial_ends_at();
