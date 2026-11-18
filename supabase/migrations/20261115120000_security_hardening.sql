-- Add input bounds for new writes without blocking existing rows during deployment.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'sell-submissions';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sell_submissions_photos_max_8' and conrelid = 'public.sell_submissions'::regclass) then
    alter table public.sell_submissions add constraint sell_submissions_photos_max_8
      check (photos is null or cardinality(photos) <= 8) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'contact_messages_email_format' and conrelid = 'public.contact_messages'::regclass) then
    alter table public.contact_messages add constraint contact_messages_email_format
      check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'stock_notifications_email_format' and conrelid = 'public.stock_notifications'::regclass) then
    alter table public.stock_notifications add constraint stock_notifications_email_format
      check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sell_submissions_email_format' and conrelid = 'public.sell_submissions'::regclass) then
    alter table public.sell_submissions add constraint sell_submissions_email_format
      check (submitter_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sell_submissions_name_max_120' and conrelid = 'public.sell_submissions'::regclass) then
    alter table public.sell_submissions add constraint sell_submissions_name_max_120
      check (submitter_name is null or char_length(submitter_name) <= 120) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sell_submissions_phone_max_20' and conrelid = 'public.sell_submissions'::regclass) then
    alter table public.sell_submissions add constraint sell_submissions_phone_max_20
      check (submitter_phone is null or char_length(submitter_phone) <= 20) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sell_submissions_category_max_60' and conrelid = 'public.sell_submissions'::regclass) then
    alter table public.sell_submissions add constraint sell_submissions_category_max_60
      check (category is null or char_length(category) <= 60) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sell_submissions_size_max_20' and conrelid = 'public.sell_submissions'::regclass) then
    alter table public.sell_submissions add constraint sell_submissions_size_max_20
      check (size is null or char_length(size) <= 20) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sell_submissions_condition_max_600' and conrelid = 'public.sell_submissions'::regclass) then
    alter table public.sell_submissions add constraint sell_submissions_condition_max_600
      check (condition is null or char_length(condition) <= 600) not valid;
  end if;
end $$;
