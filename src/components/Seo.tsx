import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const pageCopy: Record<string, { title: string; description: string }> = {
  '/': { title: 'One-of-one clothing, found once | ONEEEPIIECE', description: 'Considered, one-of-one clothing. Found in India and chosen to be lived in again.' },
  '/shop': { title: 'Shop one-of-one clothing | ONEEEPIIECE', description: 'Explore unique pre-loved clothing, carefully selected and never restocked.' },
  '/about': { title: 'Our story | ONEEEPIIECE', description: 'Why we find and share one-of-one clothing from across India.' },
  '/contact': { title: 'Contact us | ONEEEPIIECE', description: 'Questions about a piece or an order? Get in touch with ONEEEPIIECE.' },
};

export function Seo() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  const page = pageCopy[pathname] ?? {
    title: `${lastSegment?.replace(/-/g, ' ') ?? 'Shop'} | ONEEEPIIECE`,
    description: 'One-of-one clothing, found once and chosen to be lived in again.',
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
