# Onepeice storefront audit

Audit date: 2026-11-15

This is a code and migration audit of the checked-out repository. Supabase project settings, deployed database state, secrets, live payment credentials, and production behavior were not independently verified.

## Foundation inventory

| Area | Exists | Partial | Missing / risk |
| --- | --- | --- | --- |
| App shell and navigation | `src/App.tsx`, `src/components/Navbar.tsx`, `src/components/Footer.tsx`, `src/components/BagSheet.tsx`, `src/router/Router.tsx` | Shared shell, browser-history routing via `react-router-dom`, category and product routes, account menu, mobile nav, bag drawer, footer and 404 exist | Some routes currently lead to implementation placeholders; hosting fallback for direct client routes still needs deployment configuration. |
| Data access | `src/lib/supabase.ts` | Supabase client and types for items, cart locks, orders, order items, and sell submissions | Required product/catalog/account domain tables are absent; no `.env.example`; client throws on missing public env at import time. |
| Auth | `src/context/AuthContext.tsx`, `src/pages/AuthPage.tsx`, `src/pages/AccountPage.tsx`, `src/services/otpService.ts` | Supabase session, Google OAuth, phone OTP, email/password signup/sign-in, protected account access, editable profile, saved addresses, and guest-cart merge exist | Auth provider configuration and confirmation emails still require live Supabase settings; guest cart is stored locally and validated at checkout. |
| Existing database | `supabase/migrations/20260906182230_create_onepiece_schema.sql`, `supabase/migrations/20260906182704_fix_trigger_security.sql` | Items, cart locks, orders, order items, sell submissions, storage bucket, seed of 8 items, and one trigger hardening migration | Seeds do not meet the requested count; several policies permit broad anonymous/authenticated writes or reads; required categories, variants, images, profiles, addresses, carts, wishlist, reviews, coupons, and notifications tables are absent. |
| Existing checkout | `src/pages/CheckoutPage.tsx`, `supabase/functions/razorpay-create-order/`, `supabase/functions/razorpay-verify/`, `src/pages/OrderPage.tsx` | Address validation, Razorpay Checkout UI, signature verification, guest cart and order detail/timeline surfaces exist | Server trusts caller amount and pre-created order/items; verification does not bind expected order/payment identifiers to stored order state or perform stock/order transitions atomically; no webhook, COD, or robust failure/abandonment handling yet. |

## Requested feature audit

Statuses describe the repository as inspected; **PARTIAL** means some implementation exists but acceptance requirements are not met.

| # | Requested point | Status | Evidence and gaps |
| --- | --- | --- | --- |
| 1 | Product listing: filters, sorting, URL state, pagination | PARTIAL | `src/pages/ShopPage.tsx` now supports category, size, condition, colour, price range, newest/price/popular sorting, query-string state, pagination, skeletons, and fetch errors. Popularity depends on meaningful `view_count` data and the filter layout still needs small-screen QA. |
| 2 | Product detail: gallery, zoom, selectors, stock, size chart, wishlist/share/related | PARTIAL | `src/pages/ProductPage.tsx` has photo gallery/zoom, stock messaging, fit guidance, wishlist, share, related items, and back-in-stock requests. The one-piece item model has no selectable variants or numeric category charts. |
| 3 | Cart and checkout: guest/account persistence, merge, shipping, payment, confirmation | PARTIAL | `src/context/CartContext.tsx`, `BagSheet.tsx`, `BagPage.tsx`, and `CheckoutPage.tsx` support local guest carts, sign-in merge, cart drawer, and address validation. Cart quantities are one per unique find; shipping methods/costs, COD, and trusted order creation are still pending. |
| 4 | Auth and account: email/password + Google, protection, profile, addresses, orders | PARTIAL | `src/context/AuthContext.tsx`, `AuthPage.tsx`, `AccountPage.tsx`, and `OrderPage.tsx` now support email/password, Google, OTP, profile editing, saved addresses, and order history/detail. OAuth and email confirmation need live provider configuration. |
| 5 | Order lifecycle, tracking, admin CRUD | PARTIAL | `src/pages/OrderPage.tsx` shows a status timeline and tracking number; `src/pages/AdminPage.tsx` updates legacy products, normalized variant stock, order status/tracking, and coupons. Product creation/editing across both catalog models and status notifications remain incomplete. |
| 6 | RLS on every table and authorization proof | PARTIAL | `supabase/migrations/20261115090000_store_foundation.sql`, `20261115092000_product_engagement.sql`, and `supabase/RLS.md` install owner/admin policies and manual checks. They are not yet applied or exercised against a live Supabase project; guest database writes are restricted to trusted endpoints. |
| 7 | Indian policy pages and links | PARTIAL | `src/pages/legal/TermsPage.tsx`, `PrivacyPage.tsx`, and `RefundShippingPage.tsx` plus footer links cover policy routes. Their exact operational promises and checkout links still need a consistency review. |
| 8 | Razorpay + COD using trusted Edge Functions | PARTIAL | `supabase/functions/razorpay-create-order/` and `razorpay-verify/` integrate Razorpay. Caller-provided amount is trusted, order integrity is weak, and the sequence is not atomic/idempotent. No COD or `razorpay-webhook`. |
| 9 | Live search, results, wishlist | PARTIAL | `src/components/Navbar.tsx`, `src/pages/ShopPage.tsx`, and `src/pages/WishlistPage.tsx` provide live name suggestions, URL-backed name search, and an authenticated wishlist. Search results do not yet search full descriptions/brand or category suggestions. |
| 10 | Server-validated coupons and free-shipping threshold | MISSING | No coupon schema, validation, UI, or shipping-threshold calculation. |
| 11 | Transactional email via Supabase + Resend | MISSING | No email Edge Function, Resend integration, or templates. |
| 12 | Mobile-first shopping/checkout polish | PARTIAL | Existing layouts use responsive Tailwind classes and product images have a mobile scroll strip. No verified 360/768/1280 pass, sticky purchase bar, filter bottom sheet, or documented touch-target/overflow audit. |
| 13 | Responsive optimized images and loading behavior | PARTIAL | Product images use fixed-ratio media containers and the CSS includes fade-in behavior. No Supabase transform variants/WebP, blur-up placeholder, systematic lazy loading, or hero `fetchpriority`. |
| 14 | Verified-purchase reviews with moderation/photos | MISSING | No reviews schema, UI, delivered-order eligibility, photo upload, ratings, or moderation. |
| 15 | Support and engagement features | PARTIAL | `src/pages/ContactPage.tsx` saves contact messages; `ProductPage.tsx` saves stock notifications; footer links Instagram and existing sell submissions remain. WhatsApp CTA and notification emails are pending. |
| 16 | Brand content, homepage, editable copy | PARTIAL | `src/pages/HomePage.tsx` has a hero, new arrivals, and sell CTA; `src/pages/AboutPage.tsx` has brand content. No centralized `src/content/brand.ts`, featured category section, or trust strip. |
| 17 | Empty states and custom 404 | PARTIAL | `src/App.tsx`, `src/pages/SimplePage.tsx`, `WishlistPage.tsx`, `OrderPage.tsx`, and the shop/product/bag pages provide a custom 404 and key empty/error states. Error and retry coverage still needs a full async-state sweep. |
| 18 | SEO/sharing and repository quality | PARTIAL | No React Helmet, canonical/OG/Twitter metadata, Product JSON-LD, generated sitemap/robots, README setup guide, LICENSE, `REPO_SETUP.md`, or GitHub Actions workflow. No Lighthouse run recorded. |

## Suggested implementation phases

1. Foundation: routes/layout, domain schema and seed, environment example, shared loading/error patterns.
2. Core store: listing/detail, cart/checkout, account/order pages, policy/support content, and RLS repair.
3. Payments: trusted server totals, Razorpay lifecycle/webhook, COD, stock safety, and email notifications.
4. Discovery and polish: search, wishlist, coupons, reviews, mobile/image improvements, brand content, SEO, docs and CI.

The requested live end-to-end payment/email/admin tests require configured Supabase, Google OAuth, Razorpay test credentials, Resend, and provisioned user/admin accounts. None of those external settings were confirmed during this source audit.
