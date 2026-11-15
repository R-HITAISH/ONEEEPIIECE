-- Add the normalized catalog and customer tables while retaining legacy items.
create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(), slug text not null unique,
  name text not null, description text, created_at timestamptz not null default now()
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  slug text not null unique, name text not null, description text not null default '',
  brand text, condition text not null default 'good condition',
  base_price_inr integer not null check (base_price_inr >= 0),
  status text not null default 'draft' check (status in ('draft','active','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null, colour text not null default 'As pictured', sku text not null unique,
  stock integer not null default 0 check (stock >= 0),
  price_override_inr integer check (price_override_inr is null or price_override_inr >= 0),
  created_at timestamptz not null default now(), unique (product_id,size,colour)
);
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null, alt_text text not null default '', position integer not null default 0,
  created_at timestamptz not null default now(), unique (product_id,position)
);
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', phone text,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  recipient_name text not null, phone text not null, address_line text not null, address_extra text,
  city text not null, state text not null, pincode text not null check (pincode ~ '^[0-9]{6}$'),
  is_default boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade,
  guest_token_hash text unique, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (user_id is not null or guest_token_hash is not null)
);
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(), cart_id uuid not null references public.carts(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity integer not null default 1 check (quantity between 1 and 10),
  created_at timestamptz not null default now(), unique (cart_id,variant_id)
);
create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(), unique (user_id,product_id)
);
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5), body text not null check (length(body) between 5 and 3000),
  photos text[] not null default '{}', status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(), unique (user_id,product_id,order_id), check (cardinality(photos) <= 3)
);
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(), code text not null unique,
  discount_type text not null check (discount_type in ('percentage','flat')),
  discount_value integer not null check (discount_value > 0),
  minimum_order_inr integer not null default 0 check (minimum_order_inr >= 0),
  expires_at timestamptz, usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0), active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.stock_notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade,
  email text not null, variant_id uuid not null references public.product_variants(id) on delete cascade,
  notified_at timestamptz, created_at timestamptz not null default now(), unique (email,variant_id)
);
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null,
  name text not null check (length(name) between 1 and 120), email text not null,
  subject text not null check (length(subject) between 1 and 180),
  message text not null check (length(message) between 10 and 5000), created_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists payment_method text check (payment_method in ('razorpay','cod')),
  add column if not exists shipping_cost_inr integer not null default 0 check (shipping_cost_inr >= 0),
  add column if not exists tracking_number text,
  add column if not exists updated_at timestamptz not null default now();
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending','placed','paid','packed','shipped','delivered','cancelled','returned','failed'));

create or replace function public.is_store_admin()
returns boolean language sql stable security definer set search_path = public, auth
as $$ select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'); $$;
revoke all on function public.is_store_admin() from public;
grant execute on function public.is_store_admin() to anon, authenticated;

create or replace function public.handle_new_user_profile()
returns trigger language plpgsql security definer set search_path = public, auth
as $$
begin
  insert into public.profiles (id,full_name,phone)
  values (new.id,coalesce(new.raw_user_meta_data ->> 'full_name',''),new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users
  for each row execute function public.handle_new_user_profile();

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.wishlist enable row level security;
alter table public.reviews enable row level security;
alter table public.coupons enable row level security;
alter table public.stock_notifications enable row level security;
alter table public.contact_messages enable row level security;
alter table public.items enable row level security;
alter table public.cart_locks enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.sell_submissions enable row level security;

-- Remove permissive rules from the original schema before adding owner scopes.
drop policy if exists public_read_items on public.items;
drop policy if exists auth_insert_items on public.items;
drop policy if exists auth_update_items on public.items;
drop policy if exists auth_delete_items on public.items;
drop policy if exists anon_select_cart_locks on public.cart_locks;
drop policy if exists anon_insert_cart_locks on public.cart_locks;
drop policy if exists anon_update_cart_locks on public.cart_locks;
drop policy if exists anon_delete_cart_locks on public.cart_locks;
drop policy if exists auth_select_own_orders on public.orders;
drop policy if exists anon_insert_orders on public.orders;
drop policy if exists auth_update_own_orders on public.orders;
drop policy if exists auth_select_own_order_items on public.order_items;
drop policy if exists anon_insert_order_items on public.order_items;
drop policy if exists anon_insert_sell_submissions on public.sell_submissions;
drop policy if exists auth_select_sell_submissions on public.sell_submissions;
drop policy if exists anon_upload_sell_submissions on storage.objects;
drop policy if exists anon_read_sell_submissions on storage.objects;

create policy categories_public_read on public.categories for select to anon,authenticated using (true);
create policy products_public_read on public.products for select to anon,authenticated using (status = 'active');
create policy variants_public_read on public.product_variants for select to anon,authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'active'));
create policy images_public_read on public.product_images for select to anon,authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'active'));
create policy categories_admin_write on public.categories for all to authenticated
  using (public.is_store_admin()) with check (public.is_store_admin());
create policy products_admin_write on public.products for all to authenticated
  using (public.is_store_admin()) with check (public.is_store_admin());
create policy variants_admin_write on public.product_variants for all to authenticated
  using (public.is_store_admin()) with check (public.is_store_admin());
create policy images_admin_write on public.product_images for all to authenticated
  using (public.is_store_admin()) with check (public.is_store_admin());

create policy profiles_read_own on public.profiles for select to authenticated using (id = auth.uid() or public.is_store_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = 'customer');
create policy addresses_owner_all on public.addresses for all to authenticated
  using (user_id = auth.uid() or public.is_store_admin()) with check (user_id = auth.uid() or public.is_store_admin());
create policy carts_owner_all on public.carts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cart_items_owner_all on public.cart_items for all to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));
create policy wishlist_owner_all on public.wishlist for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy reviews_public_approved on public.reviews for select to anon,authenticated using (status = 'approved');
create policy reviews_owner_create on public.reviews for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid() and o.status = 'delivered'
  ));
create policy reviews_admin_manage on public.reviews for all to authenticated
  using (public.is_store_admin()) with check (public.is_store_admin());
create policy coupons_admin_only on public.coupons for all to authenticated
  using (public.is_store_admin()) with check (public.is_store_admin());
create policy notifications_insert on public.stock_notifications for insert to anon,authenticated with check (true);
create policy notifications_owner_read on public.stock_notifications for select to authenticated
  using (user_id = auth.uid() or public.is_store_admin());
create policy notifications_admin_update on public.stock_notifications for update to authenticated
  using (public.is_store_admin()) with check (public.is_store_admin());
create policy contacts_insert on public.contact_messages for insert to anon,authenticated with check (true);
create policy contacts_admin_read on public.contact_messages for select to authenticated using (public.is_store_admin());

create policy legacy_items_public_read on public.items for select to anon,authenticated using (true);
create policy legacy_items_admin_write on public.items for all to authenticated
  using (public.is_store_admin()) with check (public.is_store_admin());
alter table public.cart_locks add column if not exists user_id uuid references auth.users(id) on delete cascade;
create policy cart_locks_owner_read on public.cart_locks for select to authenticated
  using (user_id = auth.uid() or public.is_store_admin());
create policy cart_locks_owner_insert on public.cart_locks for insert to authenticated with check (user_id = auth.uid());
create policy cart_locks_owner_update on public.cart_locks for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy orders_owner_read on public.orders for select to authenticated using (user_id = auth.uid() or public.is_store_admin());
create policy orders_admin_update on public.orders for update to authenticated
  using (public.is_store_admin()) with check (public.is_store_admin());
create policy order_items_owner_read on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_store_admin())));
create policy sell_submissions_create on public.sell_submissions for insert to anon,authenticated with check (true);
create policy sell_submissions_admin_read on public.sell_submissions for select to authenticated using (public.is_store_admin());
create policy sell_photos_upload on storage.objects for insert to anon,authenticated
  with check (bucket_id = 'sell-submissions');
create policy sell_photos_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'sell-submissions' and public.is_store_admin());
update storage.buckets set public = false where id = 'sell-submissions';

create index if not exists products_category_status_idx on public.products(category_id,status);
create index if not exists variants_product_idx on public.product_variants(product_id);
create index if not exists addresses_user_idx on public.addresses(user_id);
create index if not exists carts_user_idx on public.carts(user_id);
create index if not exists cart_items_cart_idx on public.cart_items(cart_id);
create index if not exists reviews_product_status_idx on public.reviews(product_id,status);
create index if not exists notifications_variant_idx on public.stock_notifications(variant_id,notified_at);

insert into public.categories(slug,name,description) values
  ('jackets','Jackets','One-of-one outerwear with another chapter ahead.'),
  ('shirts','Shirts','Everyday shirts chosen for character and quality.'),
  ('pants','Pants','Hard-wearing bottoms, found once and kept forever.'),
  ('footwear','Footwear','Pre-loved footwear selected for a second life.')
on conflict (slug) do nothing;

insert into public.products(category_id,slug,name,description,brand,condition,base_price_inr,status)
select c.id,p.slug,p.name,p.description,p.brand,p.condition,p.price,'active'
from (values
  ('jackets','indigo-denim-trucker','Indigo Denim Trucker Jacket','A classic denim layer with a natural fade.','Levi''s','good condition',4200),
  ('jackets','canvas-work-jacket','Canvas Work Jacket','Broken-in cotton canvas with practical pockets.','Carhartt','well worn',3500),
  ('jackets','utility-field-jacket','Utility Field Jacket','Lightweight utility jacket with a relaxed fit.','Surplus','good condition',2900),
  ('shirts','checked-cotton-shirt','Checked Cotton Shirt','Soft brushed cotton in a timeless check.','Vintage','good condition',1800),
  ('shirts','oxford-button-shirt','Oxford Button Shirt','A crisp cotton oxford, ready for everyday wear.','Brooks Brothers','like new',2400),
  ('shirts','graphic-tour-tee','Graphic Tour Tee','A faded print and soft cotton with plenty of life.','Vintage','well worn',1600),
  ('shirts','reverse-weave-crewneck','Reverse Weave Crewneck','Heavyweight fleece with a classic relaxed shape.','Champion','good condition',2200),
  ('pants','navy-track-pants','Navy Track Pants','Tapered track pants with an easy elastic waist.','Adidas','good condition',2800),
  ('pants','olive-cargo-trousers','Olive Cargo Trousers','Ripstop cargo trousers with a lived-in finish.','Surplus','well worn',1500),
  ('pants','straight-denim-jeans','Straight Denim Jeans','Straight leg denim with a gently worn wash.','Levi''s','good condition',2600),
  ('footwear','grey-running-shoes','Grey Running Shoes','Neutral mesh runners in clean, wearable condition.','New Balance','like new',8500),
  ('footwear','leather-court-sneakers','Leather Court Sneakers','Minimal leather sneakers with light signs of wear.','Reebok','good condition',3200)
) as p(category_slug,slug,name,description,brand,condition,price)
join public.categories c on c.slug=p.category_slug
on conflict (slug) do nothing;

insert into public.product_variants(product_id,size,colour,sku,stock)
select p.id,s.size,'As pictured',p.slug || '-' || lower(replace(s.size,' ','-')),1
from public.products p
cross join lateral unnest(array['S','M','L','XL']::text[]) as s(size)
where p.slug in (
  'indigo-denim-trucker','canvas-work-jacket','utility-field-jacket','checked-cotton-shirt',
  'oxford-button-shirt','graphic-tour-tee','reverse-weave-crewneck','navy-track-pants',
  'olive-cargo-trousers','straight-denim-jeans','grey-running-shoes','leather-court-sneakers'
)
on conflict (sku) do nothing;

insert into public.product_images(product_id,image_url,alt_text,position)
select p.id,d.image_url,d.name || ' product photo',0
from (values
  ('indigo-denim-trucker','https://images.pexels.com/photos/769733/pexels-photo-769733.jpeg?auto=compress&cs=tinysrgb&w=1000','Indigo Denim Trucker Jacket'),
  ('canvas-work-jacket','https://images.pexels.com/photos/1124468/pexels-photo-1124468.jpeg?auto=compress&cs=tinysrgb&w=1000','Canvas Work Jacket'),
  ('utility-field-jacket','https://images.pexels.com/photos/769749/pexels-photo-769749.jpeg?auto=compress&cs=tinysrgb&w=1000','Utility Field Jacket'),
  ('checked-cotton-shirt','https://images.pexels.com/photos/6046183/pexels-photo-6046183.jpeg?auto=compress&cs=tinysrgb&w=1000','Checked Cotton Shirt'),
  ('oxford-button-shirt','https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg?auto=compress&cs=tinysrgb&w=1000','Oxford Button Shirt'),
  ('graphic-tour-tee','https://images.pexels.com/photos/1656684/pexels-photo-1656684.jpeg?auto=compress&cs=tinysrgb&w=1000','Graphic Tour Tee'),
  ('reverse-weave-crewneck','https://images.pexels.com/photos/6311627/pexels-photo-6311627.jpeg?auto=compress&cs=tinysrgb&w=1000','Reverse Weave Crewneck'),
  ('navy-track-pants','https://images.pexels.com/photos/4219499/pexels-photo-4219499.jpeg?auto=compress&cs=tinysrgb&w=1000','Navy Track Pants'),
  ('olive-cargo-trousers','https://images.pexels.com/photos/1342609/pexels-photo-1342609.jpeg?auto=compress&cs=tinysrgb&w=1000','Olive Cargo Trousers'),
  ('straight-denim-jeans','https://images.pexels.com/photos/1082529/pexels-photo-1082529.jpeg?auto=compress&cs=tinysrgb&w=1000','Straight Denim Jeans'),
  ('grey-running-shoes','https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=1000','Grey Running Shoes'),
  ('leather-court-sneakers','https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=1000','Leather Court Sneakers')
) as d(slug,image_url,name)
join public.products p on p.slug=d.slug
on conflict (product_id,position) do nothing;
