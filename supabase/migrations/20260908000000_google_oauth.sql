-- Allow Google-authenticated users who have no password.
alter table public.users alter column password_hash drop not null;

-- Link a user to their Google account for OAuth login.
alter table public.users add column if not exists google_id text unique;
create index if not exists users_google_id_idx on public.users (google_id) where google_id is not null;
