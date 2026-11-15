alter table public.items
  add column if not exists slug text,
  add column if not exists colour text not null default 'As pictured',
  add column if not exists stock integer not null default 1 check (stock >= 0),
  add column if not exists view_count integer not null default 0 check (view_count >= 0);

update public.items
set slug = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) || '-' || left(id::text, 8)
where slug is null;

update public.items
set colour = case
  when name ~* 'black' then 'Black'
  when name ~* 'blue|navy|denim' then 'Blue'
  when name ~* 'brown|tan' then 'Brown'
  when name ~* 'green|olive' then 'Green'
  when name ~* 'grey|gray' then 'Grey'
  when name ~* 'red' then 'Red'
  when name ~* 'white|cream' then 'White'
  else 'As pictured'
end
where colour = 'As pictured';

alter table public.items alter column slug set not null;
create unique index if not exists items_slug_unique_idx on public.items(slug);
