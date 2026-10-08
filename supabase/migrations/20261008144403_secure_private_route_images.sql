update storage.buckets
set public = false
where id = 'route-images';

alter table public.events
  add column if not exists route_image_url text;

update public.events
set route_image_url = split_part(
  regexp_replace(
    route_image_url,
    '^.*?/storage/v1/object/(public|sign)/route-images/',
    ''
  ),
  '?',
  1
)
where route_image_url like '%/storage/v1/object/%/route-images/%';