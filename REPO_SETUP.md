# GitHub repository setup suggestion

**Description:** A considered unique clothing storefront for ONEPIECE, built with React, TypeScript, Supabase, and Razorpay.

**Suggested topics:** `react`, `typescript`, `vite`, `supabase`, `razorpay`, `ecommerce`, `india`, `clothing`, `tailwindcss`

Set the repository website to the verified production domain when one is configured. Add the storefront screenshot to `docs/storefront-screenshot.png` after capturing the approved design. Keep repository visibility and license selection aligned with the business owner's preference.

## Edge function settings

- Set `ALLOWED_ORIGINS` for browser-facing Supabase Edge Functions to a comma-separated list of exact storefront origins, such as `https://shop.example.com,https://www.example.com`. Do not include paths or a wildcard.
- Set a strong `CRON_SECRET` for `release-expired-locks`. Configure the external scheduler to send it in the `x-cron-secret` request header. The scheduler configuration is managed outside this repository and must be updated in its hosting/control panel.
- The cron endpoint also accepts the Supabase service-role bearer token for trusted server-side callers; never expose that key to the browser.
