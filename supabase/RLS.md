# Row Level Security policy map

The baseline policies below are installed by `migrations/20261115090000_store_foundation.sql`; later migrations add protection for new tables and columns.
Service-role access is reserved for Edge Functions and is not exposed to the browser.
The previous schema's broad client policies are dropped by that migration.

| Table | Public/customer access | Admin/service access |
| --- | --- | --- |
| `categories` | Anyone can read categories | Admin can manage |
| `products` | Anyone can read active products | Admin can manage all |
| `product_variants`, `product_images` | Read only when parent product is active | Admin can manage all |
| `profiles` | Authenticated user can read own profile; user may edit own name/phone but role remains `customer` | Admin can read; role assignment must use trusted service access |
| `addresses` | Authenticated owner only | Admin can manage |
| `carts`, `cart_items` | Authenticated owner only; anonymous guest carts are not exposed through direct table access | Trusted Edge Functions can resolve guest carts using a hashed token |
| `wishlist` | Authenticated owner only | No separate admin access required |
| `reviews` | Anyone can read approved reviews; delivered-order owner can create pending review | Admin can moderate |
| `coupons` | No direct public/client access | Admin and trusted Edge Functions |
| `stock_notifications` | Anonymous/authenticated may submit an email request; authenticated user may read own request | Admin can read and update notification state |
| `contact_messages` | Anyone may submit a validated message; no client reads | Admin can read |
| `order_email_events` | No client access; RLS is enabled without anon/authenticated policies | Service role only, through the mail Edge Function |
| `items` | Anyone can read listings | Admin can manage listings |
| `cart_locks` | Authenticated owner only; anonymous clients cannot read/write lock rows | Admin can read; application mutations should move to trusted functions |
| `orders` | Authenticated owner can read own orders | Admin can update; creation/status/payment changes must use trusted functions |
| `order_items` | Authenticated owner can read items for own order | Trusted functions write rows |
| `sell_submissions` | Anonymous/authenticated may submit; clients cannot list submissions | Admin can read |
| `storage.objects` (`sell-submissions`) | Submission upload only; bucket is private | Admin can read uploaded objects |

`is_store_admin()` is a `SECURITY DEFINER` predicate with a fixed search path. The profile trigger creates a customer profile for new Supabase Auth users. Never grant the browser the service-role key. Admin role assignment must happen through trusted operator tooling; users cannot promote themselves.

## Manual authorization checklist

Run these checks against a staging Supabase project after applying migrations:

1. With the anon key and no user session, query `profiles`, `addresses`, `carts`, `wishlist`, `orders`, and `order_items`: reads must return no private rows. Attempts to write product, coupon, order, cart, or review moderation data must be denied.
2. Create users A and B. As A, create an address, wishlist row, cart, and order. As B, attempt to select/update/delete those rows by their IDs: no rows should be returned or changed.
3. As an ordinary authenticated user, attempt to change `profiles.role`, insert/update a product, change a variant's stock, or update an order's status: all attempts must be denied.
4. As a customer, submit a review for an order that is not `delivered`: it must be denied. A delivered order may create a `pending` review; public reads must not expose it until an admin approves it.
5. As anon, verify that active products and categories are readable, inactive products and their variants/images are hidden, and sell-submission storage objects cannot be downloaded.

These are manual checks, not an executed Supabase test suite. The live database's migration state and grants must be verified when the target Supabase project is available.
