-- Track when attendees check in at the venue.
alter table public.registrations
  add column if not exists checked_in_at timestamptz;

-- Track when the pre-event participant list was emailed to the admin,
-- so the cron does not send it twice.
alter table public.events
  add column if not exists notified_at timestamptz;

-- Sequential registration number within an event (TWC-001, TWC-002, ...).
-- Computed on insert from the count of existing registrations for the same event.
alter table public.registrations
  add column if not exists seq_number integer;
