create table if not exists public.watchlist_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  symbol text not null,
  stock_name text,
  market text,
  created_at timestamptz not null default now(),
  primary key (user_id, symbol)
);

create index if not exists idx_watchlist_items_user_created_at
  on public.watchlist_items(user_id, created_at desc);

alter table public.watchlist_items enable row level security;

drop policy if exists "watchlist_items_select_own" on public.watchlist_items;
create policy "watchlist_items_select_own"
  on public.watchlist_items
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "watchlist_items_insert_own" on public.watchlist_items;
create policy "watchlist_items_insert_own"
  on public.watchlist_items
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "watchlist_items_delete_own" on public.watchlist_items;
create policy "watchlist_items_delete_own"
  on public.watchlist_items
  for delete
  to authenticated
  using (auth.uid() = user_id);
