# Supabase Schema (Phase 1)

이 문서는 `/portfolio` 클라우드 동기화 기본 구조를 위한 테이블 설계를 정리합니다.

## 1) `profiles`

사용자 기본 정보 저장용 테이블입니다.

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## 2) `portfolio_holdings`

보유종목 입력값(매수가, 수량, 투자기간 등)을 저장합니다.

```sql
create table if not exists public.portfolio_holdings (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  symbol text not null,
  stock_name text,
  market text,
  data_source text,
  buy_price numeric not null,
  quantity numeric not null,
  investment_horizon text not null,
  risk_profile text not null,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
```

## 3) `portfolio_alert_rules`

사용자 알림 조건(가격, 수익률, MA20, RSI)을 저장합니다.

```sql
create table if not exists public.portfolio_alert_rules (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  holding_id text not null,
  rule_type text not null,
  threshold numeric,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
```

## 4) `portfolio_reports`

일일 요약 리포트 텍스트 또는 메타데이터 저장용 테이블입니다.

```sql
create table if not exists public.portfolio_reports (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  report_date date not null,
  summary text not null,
  payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
```

## RLS (필수)

각 사용자 본인 데이터만 읽고/쓰기 가능하도록 RLS를 활성화하세요.

```sql
alter table public.profiles enable row level security;
alter table public.portfolio_holdings enable row level security;
alter table public.portfolio_alert_rules enable row level security;
alter table public.portfolio_reports enable row level security;
```

예시 정책:

```sql
create policy "profiles owner read"
on public.profiles for select
using (auth.uid() = id);

create policy "profiles owner write"
on public.profiles for all
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "holdings owner read"
on public.portfolio_holdings for select
using (auth.uid() = user_id);

create policy "holdings owner write"
on public.portfolio_holdings for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "alert rules owner read"
on public.portfolio_alert_rules for select
using (auth.uid() = user_id);

create policy "alert rules owner write"
on public.portfolio_alert_rules for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "reports owner read"
on public.portfolio_reports for select
using (auth.uid() = user_id);

create policy "reports owner write"
on public.portfolio_reports for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

## 현재 코드에서 사용 중인 테이블

- Phase 1 구현에서 실제 동기화에 사용하는 테이블: `portfolio_holdings`
- 나머지 테이블(`profiles`, `portfolio_alert_rules`, `portfolio_reports`)은 다음 단계 확장을 위한 구조입니다.
