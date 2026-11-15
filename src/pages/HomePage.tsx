import { useEffect, useMemo, useState } from 'react';
import { supabase, type Item } from '@/lib/supabase';
import { Link } from '@/router/Router';
import { ItemCard } from '@/components/ItemCard';
import { HangTag } from '@/components/HangTag';
import { brand } from '@/content/brand';
import { Helmet } from 'react-helmet-async';
import { getDevMode } from '@/lib/devMode';
import { productPath } from '@/lib/utils';

export function HomePage() {
  const [featured, setFeatured] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const devMode = getDevMode();

  useEffect(() => {
    if (import.meta.env.DEV && devMode) {
      let active = true;
      void import('@/lib/devFixtures').then(({ generate300Items, worstCaseItems }) => {
        if (!active) return;
        const rows = devMode === '300' ? generate300Items() : devMode === 'one' ? worstCaseItems.slice(0, 1) : devMode === 'empty' ? [] : worstCaseItems.filter((item) => item.status === 'available');
        setFeatured(rows.slice(0, 4));
        setLoading(false);
      });
      return () => { active = false; };
    }
    let active = true;
    supabase.from('items').select('*').eq('status', 'available').order('created_at', { ascending: false }).limit(12)
      .then(({ data }) => { if (active && data) setFeatured(data); if (active) setLoading(false); });
    return () => { active = false; };
  }, [devMode]);

  const heroItem = useMemo(() => featured.find((item) => item.photos?.some(Boolean)) ?? featured[0], [featured]);
  const heroPhoto = heroItem?.photos?.find(Boolean);
  const stories = featured.filter((item) => item.story).slice(0, 3);

  return <div>
    <Helmet>{heroPhoto && <><meta property="og:image" content={heroPhoto} /><meta name="twitter:image" content={heroPhoto} /></>}</Helmet>
    <section className="page home-hero" aria-labelledby="home-title">
      <div className="home-hero-copy">
        <p className="label mb-5">Second-hand, thoughtfully found</p>
        <h1 id="home-title" className="home-display">Every piece<br /><em>has a story.</em></h1>
        <p className="home-hero-subline">Second-hand pieces, checked by hand and told honestly. Read where each one came from before you wear it.</p>
        <Link to="/shop" className="btn btn-primary">Shop pieces</Link>
        <p className="home-hero-note">Found in India · Checked by hand</p>
      </div>
      <div className="home-hero-visual">
        <div className="home-hero-image product-media">
          {heroPhoto ? <img src={heroPhoto} alt={`${heroItem?.name ?? 'Second-hand piece'}${heroItem ? `, size ${heroItem.size}, ${heroItem.condition}` : ''}`} fetchPriority="high" /> : <div className="hero-empty" role="img" aria-label="A quiet space for the next piece" />}
        </div>
        {heroItem && <HangTag item={heroItem} animated />}
        <span className="hero-image-caption">{heroItem?.name ?? 'A story waiting to be found'}</span>
      </div>
    </section>

    <section className="page home-stories" aria-labelledby="stories-title">
      <div className="section-heading"><div><p className="label mb-2">A little more than what you see</p><h2 id="stories-title">Pieces with a past</h2></div><Link to="/shop" className="text-link">Explore pieces</Link></div>
      {stories.length > 0 ? <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">{stories.map((item) => <article key={item.id} className="story-teaser">
        <Link to={productPath(item.name, item.id)} className="story-teaser-image product-media aspect-[4/5]">{item.photos[0] ? <img src={item.photos[0]} alt={`${item.name}, size ${item.size}, ${item.condition}`} loading="lazy" /> : <span className="hero-empty" />}</Link>
        <h3 className="mt-4 mb-2">{item.name}</h3><p>{item.story?.split(/(?<=[.!?])\s/)[0]}</p>
      </article>)}</div> : <p className="quiet-note">Each piece has a story. We’ll share it here when one is available.</p>}
    </section>

    <section className="home-qualities" aria-label="How we find and share pieces"><div className="page home-qualities-inner">
      {[['Found.', 'Every piece is sourced second-hand and checked by hand.'], ['Checked.', 'Condition and details are shown honestly.'], ['Yours to wear.', 'Good clothes deserve another life.']].map(([title, body]) => <div key={title}><h3>{title}</h3><p>{body}</p></div>)}
    </div></section>

    <section className="page home-new" aria-labelledby="new-title">
      <div className="section-heading"><div><p className="label mb-2">A fresh find</p><h2 id="new-title">New in</h2></div><Link to="/shop" className="text-link">View all pieces</Link></div>
      {loading ? <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[4/5]" style={{ background: 'var(--sunken)' }} />)}</div> : featured.length === 0 ? <p className="quiet-note">The collection is quiet for now. Check back soon.</p> : <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">{featured.slice(0, 4).map((item) => <ItemCard key={item.id} item={item} />)}</div>}
    </section>

    <section className="page home-categories" aria-label="Browse categories">{brand.categories.map((category) => <Link key={category.slug} to={`/shop/${category.slug}`} className="home-category">{category.title}</Link>)}</section>

    <section className="page sell-invitation"><div><p className="label mb-3">A good piece deserves another life</p><h2>Have something to sell?</h2><p className="mt-4">Tell us what you have. We’ll take it from there.</p></div><Link to="/sell" className="btn btn-primary">Sell to us</Link></section>
  </div>;
}
