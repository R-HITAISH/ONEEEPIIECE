alter table public.wishlist alter column product_id drop not null;
alter table public.wishlist add column if not exists item_id uuid references public.items(id) on delete cascade;
alter table public.wishlist add constraint wishlist_target_check
  check ((product_id is not null)::integer + (item_id is not null)::integer = 1);
create unique index if not exists wishlist_user_item_unique_idx
  on public.wishlist(user_id,item_id) where item_id is not null;

alter table public.stock_notifications alter column variant_id drop not null;
alter table public.stock_notifications add column if not exists item_id uuid references public.items(id) on delete cascade;
alter table public.stock_notifications add constraint stock_notification_target_check
  check ((variant_id is not null)::integer + (item_id is not null)::integer = 1);
create unique index if not exists stock_notifications_email_item_unique_idx
  on public.stock_notifications(email,item_id);
drop policy if exists notifications_insert on public.stock_notifications;
create policy notifications_insert on public.stock_notifications for insert to anon,authenticated
  with check (user_id is null or user_id = auth.uid());
drop policy if exists contacts_insert on public.contact_messages;
create policy contacts_insert on public.contact_messages for insert to anon,authenticated
  with check (user_id is null or user_id = auth.uid());
