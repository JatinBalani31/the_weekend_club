-- Makes "one paid registration per person per event" a database guarantee
-- rather than an application-level check.
--
-- The application already checked for an existing registration before
-- inserting a new one, but that check-then-insert is not atomic: concurrent
-- requests (a double-click, two open tabs, a retried submission) can all pass
-- the check before any of them commits, each creating its own row. Confirmed
-- with 10 truly concurrent submissions for one email producing 7 rows.
--
-- A unique index makes the database itself refuse the second insert, and the
-- application catches the resulting unique_violation (23505) to return the
-- existing registration instead of an error - the same idempotency pattern
-- already used for razorpay_order_id.
--
-- Partial (payment_status = 'paid' only): a still-pending row must never block
-- someone from actually completing a paid registration.

-- Collapse any duplicates already present, so the index can be created. Keeps
-- the earliest row per (event_id, email) and removes the rest.
delete from public.registrations a
using public.registrations b
where a.payment_status = 'paid'
  and b.payment_status = 'paid'
  and a.event_id = b.event_id
  and a.email = b.email
  and a.created_at > b.created_at;

create unique index if not exists registrations_one_paid_per_email_per_event
on public.registrations (event_id, email)
where payment_status = 'paid';
