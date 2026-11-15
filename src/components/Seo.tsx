import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const pageCopy: Record<string, { title: string; description: string }> = {
  '/': { title: 'Second-hand pieces with a story | ONEPIECE', description: 'Second-hand pieces, checked by hand and told honestly.' },
  '/shop': { title: 'Shop second-hand pieces | ONEPIECE', description: 'Pre-loved pieces, checked by hand and never restocked.' },
  '/about': { title: 'Our story | ONEPIECE', description: 'Why we find and share second-hand pieces from across India.' },
  '/contact': { title: 'Contact us | ONEPIECE', description: 'Questions about a piece or an order? Get in touch with ONEPIECE.' },
};

export function Seo() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  const page = pageCopy[pathname] ?? {
    title: `${lastSegment?.replace(/-/g, ' ') ?? 'Shop'} | ONEPIECE`,
    description: 'Second-hand pieces, checked by hand and told honestly.',
  };
  const baseUrl = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') ?? window.location.origin;
  const canonical = `${baseUrl}${pathname}`;
  return <Helmet>
    <title>{page.title}</title>
    <meta name="description" content={page.description} />
    <link rel="canonical" href={canonical} />
    <meta property="og:title" content={page.title} />
    <meta property="og:description" content={page.description} />
    <meta property="og:url" content={canonical} />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={page.title} />
    <meta name="twitter:description" content={page.description} />
  </Helmet>;
}
