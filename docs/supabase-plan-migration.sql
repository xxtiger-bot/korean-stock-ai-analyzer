alter table if exists public.profiles
add column if not exists plan text default 'free';

update public.profiles
set plan = 'free'
where plan is null;
