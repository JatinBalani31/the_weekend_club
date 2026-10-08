create table if not exists public.event_run_details (
  event_id uuid primary key references public.events(id) on delete cascade,
  route_description text,
  route_url text,
  route_image_path text,
  updated_at timestamptz not null default now()
);

alter table public.event_run_details enable row level security;
revoke all on table public.event_run_details from public, anon, authenticated;
grant all on table public.event_run_details to service_role;

insert into public.event_run_details (
  event_id,
  route_description,
  route_url,
  route_image_path
)
select
  id,
  route_description,
  route_url,
  route_image_url
from public.events
where route_description is not null
   or route_url is not null
   or route_image_url is not null
on conflict (event_id) do update
set route_description = excluded.route_description,
    route_url = excluded.route_url,
    route_image_path = excluded.route_image_path,
    updated_at = now();

alter table public.events
  drop column if exists route_description,
  drop column if exists route_url,
  drop column if exists route_image_url;
