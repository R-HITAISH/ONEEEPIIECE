# ONEEEPIIECE storefront

A mobile-first storefront for curated, one-of-one clothing in India. The interface uses a restrained warm-neutral palette and keeps the existing ONEEEPIIECE identity.

![Storefront screenshot placeholder](docs/storefront-screenshot.png)

## Stack

React 18, TypeScript, Vite, Tailwind CSS, Supabase Auth/Database/Edge Functions, Razorpay, and `react-helmet-async`.

## Local setup

1. Install Node.js 20 or newer.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_RAZORPAY_KEY_ID`, and `VITE_SITE_URL`.
4. Run `npm run dev`.

The Razorpay key ID is public. Never put a Razorpay secret or Supabase service-role key in a `VITE_` variable.

## Supabase setup

- Link the Supabase project and run `supabase db push` to apply the migrations in `supabase/migrations/`.
- Migrations add normalized catalog/customer tables, RLS, sample catalog products, engagement support, trusted checkout, and coupon enforcement. The storefront's current one-off catalog remains in `items` for compatibility.
- Set Edge Function secrets with `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=... RAZORPAY_WEBHOOK_SECRET=... RESEND_API_KEY=... STORE_FROM_EMAIL=... SITE_URL=...`.
- Deploy the functions with `supabase functions deploy razorpay-create-order`, `razorpay-verify`, `razorpay-cancel-order`, `razorpay-webhook`, `validate-coupon`, and `send-order-email`.
- Configure the Razorpay webhook URL to `/functions/v1/razorpay-webhook` and subscribe to `payment.captured`, `payment.failed`, and `order.paid`.
- Review `supabase/RLS.md` and provision the first admin by trusted server-side SQL after verifying the account.

## Checks

`npm run typecheck`, `npm run lint`, and `npm run build`. The build generates `public/sitemap.xml` and `public/robots.txt`; set the public Vite variables at build time to include product URLs and the canonical domain. Without Supabase credentials it emits the public route list only.

## Deploy

Deploy to Netlify or Vercel with the build command `npm run build` and output directory `dist`. Configure SPA rewrites so direct visits to product, account, and policy routes serve `index.html`. Add the same public build variables and Supabase Edge Function secrets in the hosting/Supabase dashboards. GitHub Actions runs the checks for pushes and pull requests.

## Known external setup

Production payment, OAuth, mail delivery, domain metadata, and live account isolation depend on the deployment's Supabase, Razorpay, and provider settings. Apply migrations and follow the acceptance steps in `CHECKLIST.md` before launch.
