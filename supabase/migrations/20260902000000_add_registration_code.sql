-- Human-readable registration number shown to the attendee and encoded in their
-- QR code, e.g. "TWC-K4M2P9". Short enough to read aloud or type at check-in.
alter table public.registrations
add column if not exists registration_code text;

-- Backfill rows created before this column existed so every registration has a
-- number. Derived from the row id, so re-running this changes nothing.
update public.registrations
set registration_code = 'TWC-' || upper(substring(md5(id::text) from 1 for 6))
where registration_code is null;

create unique index if not exists registrations_registration_code_idx
on public.registrations (registration_code);
