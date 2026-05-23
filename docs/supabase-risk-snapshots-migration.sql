create table if not exists public.portfolio_risk_snapshots (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  snapshot_date date not null,
  symbol text not null,
  holding_id text,
  stock_name text,
  risk_status text,
  ai_score numeric,
  return_rate numeric,
  current_price numeric,
  buy_price numeric,
  quantity numeric,
  alert_near_count integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists idx_portfolio_risk_snapshots_user_date
  on public.portfolio_risk_snapshots(user_id, snapshot_date desc);

alter table public.portfolio_risk_snapshots enable row level security;

drop policy if exists "portfolio_risk_snapshots_select_own" on public.portfolio_risk_snapshots;
create policy "portfolio_risk_snapshots_select_own"
  on public.portfolio_risk_snapshots
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "portfolio_risk_snapshots_insert_own" on public.portfolio_risk_snapshots;
create policy "portfolio_risk_snapshots_insert_own"
  on public.portfolio_risk_snapshots
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "portfolio_risk_snapshots_update_own" on public.portfolio_risk_snapshots;
create policy "portfolio_risk_snapshots_update_own"
  on public.portfolio_risk_snapshots
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "portfolio_risk_snapshots_delete_own" on public.portfolio_risk_snapshots;
create policy "portfolio_risk_snapshots_delete_own"
  on public.portfolio_risk_snapshots
  for delete
  to authenticated
  using (auth.uid() = user_id);

