-- Web push subscriptions for rent-due reminders (browser push only — no SMS/email
-- gateway, so this is the only reminder channel available without a paid
-- third-party subscription). One row per browser/device the user has opted in on.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on push_subscriptions;
create policy "push_subscriptions_select_own" on push_subscriptions for select using (auth.uid() = user_id);
drop policy if exists "push_subscriptions_insert_own" on push_subscriptions;
create policy "push_subscriptions_insert_own" on push_subscriptions for insert with check (auth.uid() = user_id);
drop policy if exists "push_subscriptions_update_own" on push_subscriptions;
create policy "push_subscriptions_update_own" on push_subscriptions for update using (auth.uid() = user_id);
drop policy if exists "push_subscriptions_delete_own" on push_subscriptions;
create policy "push_subscriptions_delete_own" on push_subscriptions for delete using (auth.uid() = user_id);

create index if not exists push_subscriptions_user_id_idx on push_subscriptions (user_id);

-- Tracks whether a reminder was already sent for a given payment row, so the
-- daily cron doesn't re-notify for the same due date every run.
alter table lease_payments add column if not exists reminder_sent_at timestamptz;
