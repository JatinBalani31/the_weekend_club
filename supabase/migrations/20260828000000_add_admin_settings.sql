create table public.admin_settings (
  id boolean primary key default true check (id),
  totp_secret text,
  totp_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.admin_settings (id) values (true);

alter table public.admin_settings enable row level security;
-- No public policies: this table is only ever read/written by the service-role client
-- from admin API routes, never from the browser.
