alter table public.events
  add column if not exists route_description text,
  add column if not exists route_url text;

alter table public.registrations
  add column if not exists run_details_email_sent_at timestamptz;