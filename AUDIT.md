# Onepeice storefront audit

Audit date: 2026-11-15

This is a code and migration audit of the checked-out repository. Supabase project settings, deployed database state, secrets, live payment credentials, and production behavior were not independently verified.

## Foundation inventory

| Area | Exists | Partial | Missing / risk |
| --- | --- | --- | --- |
| App shell and navigation | `src/App.tsx`, `src/components/Navbar.tsx`, `src/components/Footer.tsx`, `src/components/BagSheet.tsx` | Shared shell, bag drawer, account entry, and footer exist | Custom router instead of `react-router-dom`; requested `/product/:slug`, `/account/orders`, `/wishlist`, `/login`, policy, admin, and order routes do not exist; unknown paths render Home instead of 404; search is absent. |
| Data access | `src/lib/supabase.ts` | Supabase client and types for items, cart locks, orders, order items, and sell submissions | Required product/catalog/account domain tables are absent; no `.env.example`; client throws on missing public env at import time. |
| Auth | `src/context/AuthContext.tsx`, `src/pages/AuthPage.tsx`, `src/services/otpService.ts` | Supabase session, Google OAuth and phone OTP flows | No email/password form or route protection; account page is not a full profile/address/order center; cart is not merged on login. |
| Existing database | `supabase/migrations/20260906182230_create_onepiece_schema.sql`, `supabase/migrations/20260906182704_fix_trigger_security.sql` | Items, cart locks, orders, order items, sell submissions, storage bucket, seed of 8 items, and one trigger hardening migration | Seeds do not meet the requested count; several policies permit broad anonymous/authenticated writes or reads; required categories, variants, images, profiles, addresses, carts, wishlist, reviews, coupons, and notifications tables are absent. |
| Existing checkout | `src/pages/CheckoutPage.tsx`, `supabase/functions/razorpay-create-order/`, `supabase/functions/razorpay-verify/` | Address validation, Razorpay Checkout UI, signature verification, stock/item transition | Server trusts caller amount and pre-created order/items; verification does not bind expected order/payment identifiers to stored order state or perform stock/order transitions atomically; no webhook, COD, robust failure/abandonment handling, or order detail route. |

## Requested feature audit

Statuses describe the repository as inspected; **PARTIAL** means some implementation exists but acceptance requirements are not met.

| # | Requested point | Status | Evidence and gaps |
| --- | --- | --- | --- |
| 1 | Product listing: filters, sorting, URL state, pagination | PARTIAL | `src/pages/ShopPage.tsx` supports category, size, condition and three sorts. Filters are React state only; no color/price/popularity, URL query sync, pagination/infinite scroll, or fetch error state. |
| 2 | Product detail: gallery, zoom, selectors, stock, size chart, wishlist/share/related | PARTIAL | `src/pages/ProductPage.tsx` has multi-photo selection/scroll, condition/size details, sold/locked state, and add-to-bag. Route uses item ID (`/item/:id`), with no zoom, color/variant selection, chart, wishlist, share, related items, or back-in-stock form. |
| 3 | Cart and checkout: guest/account persistence, merge, shipping, payment, confirmation | PARTIAL | `src/context/CartContext.tsx`, `src/components/BagSheet.tsx`, `src/pages/BagPage.tsx`, and `src/pages/CheckoutPage.tsx` use database cart locks and provide a drawer and address form. No localStorage guest cart merge, quantity controls, shipping calculation/method, COD, durable confirmation/order route, or robust failed/abandoned-payment recovery. |
| 4 | Auth and account: email/password + Google, protection, profile, addresses, orders | PARTIAL | `src/context/AuthContext.tsx` supports Google and OTP. No email/password, protected routes, profile editor, saved addresses, or usable account order history. |
| 5 | Order lifecycle, tracking, admin CRUD | PARTIAL | Orders are created/updated during checkout and account RLS limits reads. No full lifecycle/timeline/tracking, admin UI, role model, or product/order/coupon administration. |
| 6 | RLS on every table and authorization proof | PARTIAL | RLS is enabled in `supabase/migrations/20260906182230_create_onepiece_schema.sql`, but item writes, cart-lock access, order creation/update, order-item insertion, sell submission reads, and storage reads are over-permissive. No `supabase/RLS.md` or security checklist/tests. |
| 7 | Indian policy pages and links | PARTIAL | `src/pages/legal/TermsPage.tsx`, `PrivacyPage.tsx`, and `RefundShippingPage.tsx` exist and footer links some policies. No standalone contact page; policies have not been checked for complete, consistent Indian return/refund/shipping terms and checkout links. |
| 8 | Razorpay + COD using trusted Edge Functions | PARTIAL | `supabase/functions/razorpay-create-order/` and `razorpay-verify/` integrate Razorpay. Caller-provided amount is trusted, order integrity is weak, and the sequence is not atomic/idempotent. No COD or `razorpay-webhook`. |
| 9 | Live search, results, wishlist | MISSING | No search UI/results route, suggestion service, wishlist page, or wishlist table. |
| 10 | Server-validated coupons and free-shipping threshold | MISSING | No coupon schema, validation, UI, or shipping-threshold calculation. |
| 11 | Transactional email via Supabase + Resend | MISSING | No email Edge Function, Resend integration, or templates. |
| 12 | Mobile-first shopping/checkout polish | PARTIAL | Existing layouts use responsive Tailwind classes and product images have a mobile scroll strip. No verified 360/768/1280 pass, sticky purchase bar, filter bottom sheet, or documented touch-target/overflow audit. |
| 13 | Responsive optimized images and loading behavior | PARTIAL | Product images use fixed-ratio media containers and the CSS includes fade-in behavior. No Supabase transform variants/WebP, blur-up placeholder, systematic lazy loading, or hero `fetchpriority`. |
| 14 | Verified-purchase reviews with moderation/photos | MISSING | No reviews schema, UI, delivered-order eligibility, photo upload, ratings, or moderation. |
| 15 | Support and engagement features | PARTIAL | Sell submission exists at `src/pages/SellPage.tsx`; no WhatsApp CTA, customer contact form/table, Instagram section, or back-in-stock subscription. |
| 16 | Brand content, homepage, editable copy | PARTIAL | `src/pages/HomePage.tsx` has a hero, new arrivals, and sell CTA; `src/pages/AboutPage.tsx` has brand content. No centralized `src/content/brand.ts`, featured category section, or trust strip. |
| 17 | Empty states and custom 404 | PARTIAL | Shop, product, and bag have some empty/error messaging. Unknown paths fall through to Home in `src/App.tsx`; wishlist/orders/search empty states cannot exist until those features are implemented; async fetch errors are generally not surfaced. |
| 18 | SEO/sharing and repository quality | PARTIAL | No React Helmet, canonical/OG/Twitter metadata, Product JSON-LD, generated sitemap/robots, README setup guide, LICENSE, `REPO_SETUP.md`, or GitHub Actions workflow. No Lighthouse run recorded. |

## Suggested implementation phases

1. Foundation: routes/layout, domain schema and seed, environment example, shared loading/error patterns.
2. Core store: listing/detail, cart/checkout, account/order pages, policy/support content, and RLS repair.
3. Payments: trusted server totals, Razorpay lifecycle/webhook, COD, stock safety, and email notifications.
4. Discovery and polish: search, wishlist, coupons, reviews, mobile/image improvements, brand content, SEO, docs and CI.

The requested live end-to-end payment/email/admin tests require configured Supabase, Google OAuth, Razorpay test credentials, Resend, and provisioned user/admin accounts. None of those external settings were confirmed during this source audit.
