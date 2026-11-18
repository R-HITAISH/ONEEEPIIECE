# Recommended security headers

Configure these response headers at the production host/CDN after replacing `<SUPABASE_URL>` and `<SUPABASE_STORAGE_HOST>` with the deployed project's exact HTTPS origin and storage hostname. Do not put an enforcing CSP in `index.html`; CSP must be sent as an HTTP response header.

```text
Content-Security-Policy: default-src 'self'; script-src 'self' https://checkout.razorpay.com; connect-src 'self' <SUPABASE_URL> https://lumberjack.razorpay.com; img-src 'self' data: blob: <SUPABASE_STORAGE_HOST>; frame-src https://api.razorpay.com https://checkout.razorpay.com; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Vercel supports headers in `vercel.json` and project configuration ([Vercel headers](https://vercel.com/docs/project-configuration/vercel-json)); Netlify supports `_headers` and `netlify.toml` ([Netlify headers](https://docs.netlify.com/manage/routing/headers/)); Cloudflare Pages supports a `public/_headers` file ([Cloudflare Pages headers](https://developers.cloudflare.com/pages/configuration/headers/)). Check the active host's behavior for redirects and cached responses.

## Deployment test plan

1. Open Razorpay checkout in test mode and confirm its iframe/script loads and payment completion/cancellation returns to the storefront.
2. Browse home, shop, product, account, bag and checkout; confirm Supabase auth, database and Edge Function requests succeed from the configured origin.
3. Confirm product and user-uploaded images load from the configured Supabase storage host, and local/remote fonts load without CSP violations.
4. Inspect response headers in the browser network panel and check the console for CSP violations before enforcing the policy broadly.

This policy is a starting point. Add any verified production asset hosts only when the browser console and network panel show they are required.
