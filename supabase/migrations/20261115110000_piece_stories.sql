alter table public.items add column if not exists story text;
alter table public.products add column if not exists story text;
alter table public.sell_submissions add column if not exists story text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'items_story_length') then
    alter table public.items add constraint items_story_length check (story is null or char_length(story) <= 1200);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_story_length') then
    alter table public.products add constraint products_story_length check (story is null or char_length(story) <= 1200);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sell_story_length') then
    alter table public.sell_submissions add constraint sell_story_length check (story is null or char_length(story) <= 600);
  end if;
end $$;
