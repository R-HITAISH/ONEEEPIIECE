# Acceptance checklist

Status reflects what is implemented in this checkout. External-service flows remain PARTIAL until exercised against a configured staging project.

| # | Status | Implementation | Manual test |
|---|---|---|---|
| 1 | PARTIAL | `src/pages/ShopPage.tsx` | At `/shop`, set size/colour/price, change sort/page, refresh and confirm URL state remains selected. Repeat at mobile widths. |
| 2 | PARTIAL | `src/pages/ProductPage.tsx`, `src/lib/utils.ts` | Open a product URL, switch photos, zoom, share, wishlist it and check stock/fit details. Verify color/size variant behavior after catalog unification. |
| 3 | PARTIAL | `src/context/CartContext.tsx`, `src/components/BagSheet.tsx`, `src/pages/CheckoutPage.tsx` | Add as guest, refresh, sign in and confirm merge; complete a COD test order and verify fee/shipping/confirmation. |
| 4 | PARTIAL | `src/context/AuthContext.tsx`, `src/pages/AuthPage.tsx`, `src/pages/AccountPage.tsx` | Test email signup/sign-in, Google and OTP on Supabase staging; edit profile/address and verify account history. |
| 5 | PARTIAL | `src/pages/AdminPage.tsx`, `src/pages/OrderPage.tsx` | As admin, edit stock, mark an order shipped with tracking, then open that order as its owner. |
| 6 | PARTIAL | `supabase/migrations/`, `supabase/RLS.md` | Apply migrations; run every manual RLS check in `supabase/RLS.md` with anon, customer A, customer B and admin sessions. |
| 7 | PARTIAL | `src/pages/legal/`, `src/pages/ContactPage.tsx`, `src/components/Footer.tsx` | Open each policy link from footer and checkout; submit a staging contact request and confirm it is stored/admin-visible. |
| 8 | PARTIAL | `supabase/functions/razorpay-*`, `supabase/migrations/20261115093000_secure_checkout.sql` | Deploy functions and test Razorpay test-mode success, failure, dismissal, webhook replay, expired reservation and COD stock decrement. |
| 9 | PARTIAL | `src/components/Navbar.tsx`, `src/pages/ShopPage.tsx`, `src/pages/WishlistPage.tsx` | Search a product, choose a suggestion, verify URL results, then add/remove a wishlist item while signed in. |
| 10 | PARTIAL | `src/pages/CheckoutPage.tsx`, `supabase/functions/validate-coupon/`, `supabase/migrations/20261115100000_checkout_coupons.sql` | Create valid/expired/used/minimum-value coupons as admin; apply each and confirm the server rejects invalid codes and computes final totals. |
| 11 | PARTIAL | `supabase/functions/send-order-email/`, `supabase/migrations/20261115101000_order_email_events.sql` | Configure verified Resend sender; place COD/test payment, mark shipped and cancel a test order; verify one email per event. |
| 12 | PARTIAL | `src/pages/ProductPage.tsx`, `src/pages/ShopPage.tsx` | At 360, 768 and 1280 pixels check actual catalog pages, sticky add button, filter usability, checkout reachability, tap targets and horizontal overflow. |
| 13 | PARTIAL | `src/lib/utils.ts`, `src/components/ItemCard.tsx`, `src/pages/HomePage.tsx` | Serve a Supabase Storage image and inspect WebP widths/srcset, lazy load below fold and hero priority; verify external images remain usable. |
| 14 | PARTIAL | `src/pages/ContactPage.tsx`, `src/pages/ProductPage.tsx`, `src/components/WhatsAppButton.tsx`, `supabase/migrations/20261115090000_store_foundation.sql` | Configure WhatsApp number; test contact and back-in-stock forms. Review submission/photo upload/average-rating UI remains to be built. |
| 15 | PARTIAL | `src/content/brand.ts`, `src/pages/HomePage.tsx`, `src/pages/AboutPage.tsx` | Edit brand copy in `brand.ts`, verify category links, trust strip and existing logo/colors on homepage and About. |
| 16 | PARTIAL | `src/pages/SimplePage.tsx`, `src/pages/ShopPage.tsx`, `src/pages/BagPage.tsx`, `src/pages/WishlistPage.tsx`, `src/pages/OrderPage.tsx` | Visit an unknown route and empty bag/wishlist/orders/search results; verify clear next-step links and retry states. |
| 17 | PARTIAL | `src/components/Seo.tsx`, `src/pages/ProductPage.tsx`, `scripts/generate-sitemap.mjs`, `vite.config.ts` | Build with production URL and Supabase env; inspect canonical/product share tags, Product JSON-LD, and sitemap URLs; then run Lighthouse on mobile. |
| 18 | PARTIAL | `README.md`, `REPO_SETUP.md`, `LICENSE`, `.env.example`, `.github/workflows/ci.yml` | Follow README from a clean checkout; run checks and confirm GitHub Actions passes. Add a real screenshot and verified repository metadata. |

## Requested end-to-end run

**Not run.** This checkout has no `.env.local`, applied Supabase deployment, Razorpay test credentials, Resend sender/API key, or provisioned customer/admin test accounts. The preview therefore displays the setup instructions instead of querying live products. Do not treat the payment, email, admin-shipping or cross-user isolation scenarios as passed until run in staging.

When staging is available, execute the requested sequence: guest browse/filter/add, sign in and merge, Razorpay test payment, receive confirmation email, view order history; mark shipped as admin and confirm owner timeline/email; sign in as a second customer and verify the first order is inaccessible.

Latest local checks: `npm run typecheck` passes; `npm run lint` passes with three existing Fast Refresh warnings; `npm run build` passes. The build reports a Browserslist data update notice. The installed dependency audit reported 22 advisories (2 low, 6 moderate, 14 high); review with `npm audit` before launch. The preview setup page was checked at 360/768/1280 and had no horizontal overflow; the data-backed storefront was not available for those visual checks.
