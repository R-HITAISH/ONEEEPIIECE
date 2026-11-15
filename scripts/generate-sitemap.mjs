import { mkdir, writeFile } from 'node:fs/promises';

const site = (process.env.VITE_SITE_URL || 'https://oneeepiiece.example').replace(/\/$/, '');
const paths = ['/', '/shop', '/about', '/contact', '/shipping', '/returns', '/privacy', '/terms'];
const escapeXml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const urls = new Set(paths.map((path) => `${site}${path}`));
const apiUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (apiUrl && anonKey) {
  for (const [table, pathFor] of [
    ['items?select=slug&status=eq.available', (row) => `/product/${row.slug}`],
    ['products?select=slug&status=eq.active', (row) => `/product/${row.slug}`],
  ]) {
    try {
      const response = await fetch(`${apiUrl}/rest/v1/${table}`, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
      if (response.ok) for (const row of await response.json()) if (row.slug) urls.add(`${site}${pathFor(row)}`);
    } catch (error) {
      console.warn(`Sitemap product fetch skipped: ${error instanceof Error ? error.message : 'request failed'}`);
    }
  }
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls].map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n')}\n</urlset>\n`;
await mkdir('public', { recursive: true });
await writeFile('public/sitemap.xml', xml, 'utf8');
await writeFile('public/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n`, 'utf8');
