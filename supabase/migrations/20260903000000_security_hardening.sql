-- Security hardening: revocable sessions, rate limiting, and capacity enforcement.
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Revocable sessions
--
-- Session tokens are stateless and were previously valid forever: signing out
-- only dropped the cookie, so a token captured beforehand still worked, and a
-- password change did not invalidate anything.
--
-- Tokens now carry their issue time, and anything issued before this timestamp
-- is refused. Bumping it logs every device out.
-- ---------------------------------------------------------------------------
alter table public.users
add column if not exists sessions_valid_from timestamptz not null default now();

-- Same idea for the shared admin login, which previously could only be revoked
-- by changing ADMIN_PASSWORD and redeploying.
alter table public.admin_settings
add column if not exists sessions_valid_from timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- 2. Rate limiting
--
-- Backed by Postgres rather than a separate service so it holds across all
-- serverless instances. The counter is incremented inside the function under a
-- row lock, so concurrent attempts cannot race past the limit.
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 0,
  window_start timestamptz not null default now()
);

alter table public.rate_limits enable row level security;
-- No policies: only the service-role client touches this.

create or replace function public.check_rate_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer
)
returns table(allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.rate_limits%rowtype;
  window_ends timestamptz;
begin
  insert into public.rate_limits (key, count, window_start)
  values (p_key, 0, now())
  on conflict (key) do nothing;

  -- Serialises concurrent attempts for this key.
  select * into rec from public.rate_limits where key = p_key for update;

  window_ends := rec.window_start + make_interval(secs => p_window_seconds);

  -- Window expired: start a fresh one and count this attempt.
  if now() >= window_ends then
    update public.rate_limits set count = 1, window_start = now() where key = p_key;
    return query select true, 0;
    return;
  end if;

  if rec.count >= p_max then
    return query select false, greatest(0, ceil(extract(epoch from (window_ends - now())))::integer);
    return;
  end if;

  update public.rate_limits set count = rec.count + 1 where key = p_key;
  return query select true, 0;
end;
$$;

-- Housekeeping helper: drops counters whose window closed long ago.
create or replace function public.prune_rate_limits()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from public.rate_limits where window_start < now() - interval '1 day';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Capacity enforcement
--
-- Nothing previously stopped a 40-person event taking 400 registrations. This
-- is a trigger rather than an application check so it holds no matter which
-- code path inserts, and it locks the event row so two simultaneous
-- registrations cannot both see the last free spot.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_registration_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_capacity integer;
  tier_capacity integer;
  taken integer;
begin
  -- Only confirmed registrations occupy a spot.
  if new.payment_status is distinct from 'paid' then
    return new;
  end if;

  select capacity into event_capacity from public.events where id = new.event_id for update;
  if event_capacity is null then
    return new;
  end if;

  select count(*) into taken
  from public.registrations
  where event_id = new.event_id and payment_status = 'paid';

  if taken >= event_capacity then
    raise exception 'EVENT_FULL' using errcode = 'P0001';
  end if;

  if new.ticket_tier_id is not null then
    select capacity into tier_capacity from public.ticket_tiers where id = new.ticket_tier_id for update;
    if tier_capacity is not null then
      select count(*) into taken
      from public.registrations
      where ticket_tier_id = new.ticket_tier_id and payment_status = 'paid';

      if taken >= tier_capacity then
        raise exception 'TIER_FULL' using errcode = 'P0001';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists registrations_enforce_capacity on public.registrations;
create trigger registrations_enforce_capacity
before insert on public.registrations
for each row execute function public.enforce_registration_capacity();
