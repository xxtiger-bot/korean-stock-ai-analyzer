create table if not exists public.user_feedback (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  page text,
  rating integer,
  category text,
  message text not null,
  created_at timestamptz default now()
);

alter table public.user_feedback enable row level security;

create policy "insert feedback for everyone"
on public.user_feedback
for insert
to anon, authenticated
with check (
  user_id is null or auth.uid() = user_id
);

create policy "select own feedback only"
on public.user_feedback
for select
to authenticated
using (auth.uid() = user_id);
