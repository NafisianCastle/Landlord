-- Native push tokens (Firebase Cloud Messaging) for the Flutter app in
-- mobile/. Browser Web Push stays in push_subscriptions; the reminder cron
-- routes send to both. One row per app install the user has opted in on.

create table if not exists device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique check (char_length(token) between 1 and 4096),
  platform text not null check (platform in ('android', 'ios')),
  created_at timestamptz not null default now()
);

alter table device_push_tokens enable row level security;

drop policy if exists "device_push_tokens_select_own" on device_push_tokens;
create policy "device_push_tokens_select_own" on device_push_tokens for select using (auth.uid() = user_id);
drop policy if exists "device_push_tokens_insert_own" on device_push_tokens;
create policy "device_push_tokens_insert_own" on device_push_tokens for insert with check (auth.uid() = user_id);
drop policy if exists "device_push_tokens_update_own" on device_push_tokens;
create policy "device_push_tokens_update_own" on device_push_tokens for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "device_push_tokens_delete_own" on device_push_tokens;
create policy "device_push_tokens_delete_own" on device_push_tokens for delete using (auth.uid() = user_id);

create index if not exists device_push_tokens_user_id_idx on device_push_tokens (user_id);
