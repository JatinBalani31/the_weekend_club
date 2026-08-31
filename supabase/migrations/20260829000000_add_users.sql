create table public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create index users_email_idx on public.users (lower(email));
create index users_phone_idx on public.users (phone);

alter table public.users enable row level security;
-- No public policies: only the service-role client (from auth API routes) reads/writes this table.

alter table public.registrations
add column if not exists user_id uuid references public.users (id) on delete set null;

create index registrations_user_id_idx on public.registrations (user_id);
