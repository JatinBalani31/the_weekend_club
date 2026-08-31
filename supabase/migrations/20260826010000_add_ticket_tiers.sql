create table public.ticket_tiers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  capacity integer not null check (capacity > 0),
  sale_ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index ticket_tiers_event_id_idx on public.ticket_tiers (event_id);
create index ticket_tiers_sale_ends_at_idx on public.ticket_tiers (sale_ends_at);

alter table public.registrations
add column if not exists ticket_tier_id uuid references public.ticket_tiers (id) on delete set null,
add column if not exists charged_price numeric(10, 2) check (charged_price is null or charged_price >= 0),
add column if not exists email_updates boolean not null default false;

alter table public.ticket_tiers enable row level security;

create policy "Anyone can view active future ticket tiers"
on public.ticket_tiers for select
to anon, authenticated
using (
  is_active = true
  and (sale_ends_at is null or sale_ends_at > now())
  and exists (select 1 from public.events where events.id = ticket_tiers.event_id and events.is_active = true and events.date > now())
);