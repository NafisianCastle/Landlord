-- Admin dashboard support: an is_admin flag, a singleton settings row
-- (price/trial length, editable from /admin instead of env/hardcoded
-- constants), and discount coupons.
--
-- Everything here is read/written exclusively through createAdminClient()
-- (service role) from server code that has already checked is_admin —
-- mirrors the existing payment routes' pattern of trusted-server-context
-- writes — so RLS on the new tables stays fully closed (no policies) rather
-- than trying to encode "is admin" as a client-facing policy.

alter table profiles add column if not exists is_admin boolean not null default false;

create table if not exists app_settings (
  id int primary key default 1 check (id = 1),
  lifetime_price_bdt numeric not null,
  trial_days int not null,
  updated_at timestamptz not null default now()
);

-- Singleton row, seeded from the current hardcoded defaults. Readable by
-- anyone (anon included — the landing page shows the price pre-login), only
-- writable via the admin client.
insert into app_settings (id, lifetime_price_bdt, trial_days)
values (1, 2000, 14)
on conflict (id) do nothing;

alter table app_settings enable row level security;
drop policy if exists "app_settings_select_all" on app_settings;
create policy "app_settings_select_all" on app_settings for select using (true);

create table if not exists referral_coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric not null,
  active boolean not null default true,
  max_redemptions int,
  times_redeemed int not null default 0,
  expires_at date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table referral_coupons enable row level security;

create table if not exists coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references referral_coupons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tran_id text,
  redeemed_at timestamptz not null default now(),
  unique (coupon_id, user_id)
);

alter table coupon_redemptions enable row level security;

create or replace function increment_coupon_redemptions(p_coupon_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update referral_coupons set times_redeemed = times_redeemed + 1 where id = p_coupon_id;
$$;

revoke all on function increment_coupon_redemptions(uuid) from public;
grant execute on function increment_coupon_redemptions(uuid) to service_role;

-- Discount actually applied to a given payment attempt, for the admin
-- ledger view and refund bookkeeping.
alter table payment_transactions add column if not exists coupon_code text;
alter table payment_transactions add column if not exists discount_amount numeric not null default 0;

-- Trial length now comes from app_settings so admin changes apply to new
-- signups going forward (existing users' trial_ends_at is untouched).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referred_by uuid;
  v_trial_days int;
begin
  if new.raw_user_meta_data ? 'referral_code' then
    select id into v_referred_by
    from public.profiles
    where referral_code = upper(new.raw_user_meta_data->>'referral_code')
    limit 1;
  end if;

  select trial_days into v_trial_days from app_settings where id = 1;
  v_trial_days := coalesce(v_trial_days, 14);

  insert into public.profiles (id, email, trial_ends_at, referral_code, referred_by)
  values (
    new.id,
    new.email,
    now() + (v_trial_days || ' days')::interval,
    generate_referral_code(new.id),
    v_referred_by
  );
  return new;
end;
$$;
