create table if not exists public.pro_waitlist (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  plan text not null default 'pro',
  source text,
  message text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_pro_waitlist_unique_plan_user
  on public.pro_waitlist(plan, user_id)
  where user_id is not null;

create unique index if not exists idx_pro_waitlist_unique_plan_email
  on public.pro_waitlist(plan, lower(email))
  where email is not null;

alter table public.pro_waitlist enable row level security;

drop policy if exists "pro_waitlist_select_own" on public.pro_waitlist;
create policy "pro_waitlist_select_own"
  on public.pro_waitlist
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "pro_waitlist_insert_own_authenticated" on public.pro_waitlist;
create policy "pro_waitlist_insert_own_authenticated"
  on public.pro_waitlist
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "pro_waitlist_insert_anon" on public.pro_waitlist;
create policy "pro_waitlist_insert_anon"
  on public.pro_waitlist
  for insert
  to anon
  with check (
    user_id is null
    and email is not null
    and length(trim(email)) > 3
  );
