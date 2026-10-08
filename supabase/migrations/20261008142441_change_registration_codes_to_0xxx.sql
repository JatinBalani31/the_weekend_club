do $$
begin
  if (select count(*) from public.registrations) > 1000 then
    raise exception 'Cannot assign four-digit registration codes: more than 1,000 registrations already exist.';
  end if;
end;
$$;

update public.registrations
set registration_code = 'LEGACY-' || id::text;

with numbered_registrations as (
  select id, row_number() over (order by random()) as slot
  from public.registrations
),
randomized_codes as (
  select lpad(value::text, 4, '0') as code, row_number() over (order by random()) as slot
  from generate_series(0, 999) as codes(value)
)
update public.registrations as registrations
set registration_code = 'TWC-' || randomized_codes.code
from numbered_registrations
join randomized_codes using (slot)
where registrations.id = numbered_registrations.id;