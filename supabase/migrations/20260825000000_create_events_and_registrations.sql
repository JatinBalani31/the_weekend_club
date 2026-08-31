create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null,
  banner_image_url text not null,
  date timestamptz not null,
  location text not null,
  price numeric(10, 2) not null default 100 check (price >= 0),
  capacity integer not null check (capacity > 0),
  event_type text not null check (event_type in ('run', 'workshop', 'music')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index events_active_date_idx on public.events (date)
where is_active = true;

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null,
  strava_handle text,
  email_updates boolean not null default false,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed')),
  razorpay_order_id text unique,
  payment_id text,
  created_at timestamptz not null default now()
);

create index registrations_event_id_idx on public.registrations (event_id);
create index registrations_created_at_idx on public.registrations (created_at desc);

alter table public.events enable row level security;
alter table public.registrations enable row level security;

create policy "Anyone can view active future events"
on public.events for select
to anon, authenticated
using (is_active = true and date > now());