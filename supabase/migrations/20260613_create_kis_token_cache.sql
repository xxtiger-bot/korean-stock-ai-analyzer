create table if not exists public.kis_token_cache (
  id text primary key,
  access_token text null,
  expires_at timestamptz null,
  issued_at timestamptz null,
  last_token_request_at timestamptz null,
  last_token_request_status text null,
  last_token_error_type text null,
  last_token_error_message text null,
  next_allowed_token_request_at timestamptz null,
  updated_at timestamptz not null default now()
);

alter table public.kis_token_cache enable row level security;

create or replace function public.set_kis_token_cache_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists kis_token_cache_set_updated_at on public.kis_token_cache;

create trigger kis_token_cache_set_updated_at
before update on public.kis_token_cache
for each row
execute function public.set_kis_token_cache_updated_at();
