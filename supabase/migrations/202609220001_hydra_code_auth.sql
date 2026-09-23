-- Backend para contas com código. Não altere as contas atuais nem suas sessões.
create table if not exists public.hydra_code_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_hash text not null unique,
  recovery_hash text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.hydra_code_access enable row level security;
revoke all on public.hydra_code_access from anon, authenticated;

create table if not exists public.hydra_code_rate_limits (
  key text primary key,
  started_at timestamptz not null default now(),
  attempts integer not null default 0
);
alter table public.hydra_code_rate_limits enable row level security;
revoke all on public.hydra_code_rate_limits from anon, authenticated;

create or replace function public.hydra_code_take_slot(
  p_key text,
  p_max integer,
  p_window_seconds integer
) returns boolean
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  next_attempts integer;
begin
  if length(p_key) < 12 or length(p_key) > 180 or p_max not between 1 and 100 or p_window_seconds not between 30 and 86400 then
    return false;
  end if;
  insert into public.hydra_code_rate_limits as limits (key, started_at, attempts)
  values (p_key, now(), 1)
  on conflict (key) do update
    set started_at = case when limits.started_at <= now() - make_interval(secs => p_window_seconds)
      then now() else limits.started_at end,
        attempts = case when limits.started_at <= now() - make_interval(secs => p_window_seconds)
          then 1 else limits.attempts + 1 end
  returning attempts into next_attempts;
  return next_attempts <= p_max;
end;
$$;
revoke all on function public.hydra_code_take_slot(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hydra_code_take_slot(text, integer, integer) to service_role;
