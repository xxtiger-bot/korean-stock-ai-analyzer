alter table if exists public.profiles
add column if not exists referral_code text;

alter table if exists public.profiles
add column if not exists pro_expires_at timestamptz;

create unique index if not exists idx_profiles_referral_code_unique
  on public.profiles (referral_code)
  where referral_code is not null;

create table if not exists public.referrals (
  id text primary key,
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null references auth.users(id) on delete cascade,
  referral_code text not null,
  status text not null default 'completed',
  reward_days integer not null default 3,
  created_at timestamptz not null default now(),
  rewarded_at timestamptz,
  constraint referrals_no_self_referral check (referrer_user_id <> referred_user_id)
);

create unique index if not exists idx_referrals_referred_user_unique
  on public.referrals (referred_user_id);

create index if not exists idx_referrals_referrer_created_at
  on public.referrals (referrer_user_id, created_at desc);

alter table public.referrals enable row level security;

drop policy if exists "referrals_select_own" on public.referrals;
create policy "referrals_select_own"
  on public.referrals
  for select
  to authenticated
  using (auth.uid() = referrer_user_id or auth.uid() = referred_user_id);

drop policy if exists "referrals_insert_referred_user" on public.referrals;
create policy "referrals_insert_referred_user"
  on public.referrals
  for insert
  to authenticated
  with check (auth.uid() = referred_user_id and referrer_user_id <> referred_user_id);

