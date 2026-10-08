alter table public.events
  add column if not exists route_image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'route-images',
  'route-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if (select count(*) from public.registrations) > 1000 then
    raise exception 'Cannot migrate registration codes: more than 1,000 registrations already exist.';
  end if;
end;
$$;

update public.registrations
set registration_code = 'LEGACY-' || id::text;

with randomized_codes as (
  select id, 'TWC-' || (99 + row_number() over (order by md5(id::text)))::text as registration_code
  from public.registrations
)
update public.registrations as registrations
set registration_code = randomized_codes.registration_code
from randomized_codes
where registrations.id = randomized_codes.id;