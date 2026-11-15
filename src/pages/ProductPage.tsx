import { useEffect, useState } from 'react';
import { supabase, type Item } from '@/lib/supabase';
import { Link, useRouter } from '@/router/Router';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { ItemCard } from '@/components/ItemCard';
import { formatINR, productPath } from '@/lib/utils';
import { ArrowLeft, ShoppingBag, AlertTriangle, ChevronDown, Heart, Share2, Ruler, X } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export function ProductPage({ itemId }: { itemId: string }) {
  const { navigate } = useRouter();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inBag, setInBag] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [relatedItems, setRelatedItems] = useState<Item[]>([]);
  const [notifyEmail, setNotifyEmail] = useState(user?.email ?? '');
  const [notifyMessage, setNotifyMessage] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    let active = true;
    supabase
      .from('items')
      .select('*')
      .eq('id', itemId)
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (!active) return;
        setFetchError(loadError ? 'We could not load this piece. Please try again.' : null);
        setItem(data);
        setLoading(false);
      });
    return () => { active = false; };
  }, [itemId]);

  useEffect(() => {
    setNotifyEmail(user?.email ?? '');
  }, [user?.email]);

  useEffect(() => {
    if (!user || !item) {
      setWishlisted(false);
      return;
    }
    let active = true;
    supabase.from('wishlist').select('id').eq('user_id', user.id).eq('item_id', item.id).maybeSingle()
      .then(({ data }) => { if (active) setWishlisted(Boolean(data)); });
    return () => { active = false; };
  }, [item, user]);

  useEffect(() => {
    if (!item) return;
    let active = true;
    supabase.from('items').select('*').eq('category', item.category).eq('status', 'available').neq('id', item.id)
      .order('created_at', { ascending: false }).limit(4)
      .then(({ data }) => { if (active) setRelatedItems(data ?? []); });
    return () => { active = false; };
  }, [item]);

  useEffect(() => {
    if (!item) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('items')
        .select('status')
        .eq('id', itemId)
        .maybeSingle();
      if (data && data.status !== item.status) {
        setItem({ ...item, status: data.status });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [item, itemId]);

  const handleAddToCart = async () => {
    if (!item) return;
    setAdding(true);
    setError(null);
    setInBag(false);
    const result = await addToCart(item.id);
    setAdding(false);
    if (result.success) {
      setInBag(true);
    } else {
      setError(result.error);
    }
  };

  const toggleWishlist = async () => {
    if (!user) {
      navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!item || wishlistBusy) return;
    setWishlistBusy(true);
    const result = wishlisted
      ? await supabase.from('wishlist').delete().eq('user_id', user.id).eq('item_id', item.id)
      : await supabase.from('wishlist').insert({ user_id: user.id, item_id: item.id });
    setWishlistBusy(false);
    if (result.error) setError('We could not update your wishlist. Please try again.');
    else setWishlisted(!wishlisted);
  };

  const shareProduct = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: item?.name, url });
      else {
        await navigator.clipboard.writeText(url);
        setNotifyMessage('Product link copied.');
      }
    } catch {
      setError('Could not share this product link.');
    }
  };

  const notifyWhenAvailable = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!item || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail)) {
      setNotifyMessage('Enter a valid email address.');
      return;
    }
    const { error: notifyError } = await supabase.from('stock_notifications').upsert({
      item_id: item.id,
      user_id: user?.id ?? null,
      email: notifyEmail.trim(),
    }, { onConflict: 'email,item_id' });
    setNotifyMessage(notifyError ? 'Could not save your request. Please try again.' : 'We’ll email you if this piece becomes available.');
  };

  if (loading) {
    return (
      <div className="page" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
          <div className="aspect-[4/5] animate-pulse" style={{ background: 'var(--sunken)' }} />
          <div className="space-y-4">
            <div className="h-8 animate-pulse w-3/4" style={{ background: 'var(--sunken)' }} />
            <div className="h-6 animate-pulse w-1/2" style={{ background: 'var(--sunken)' }} />
            <div className="h-32 animate-pulse" style={{ background: 'var(--sunken)' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="page text-center py-24">
        <h1 style={{ fontWeight: 400 }}>Item not found</h1>
        <p className="label mt-4 mb-6">This piece doesn't exist or was removed.</p>
        <Link to="/shop" className="btn btn-secondary">Back to shop</Link>
      </div>
    );
  }

  if (fetchError) return <div className="page py-20 text-center" role="alert"><p>{fetchError}</p><button className="btn btn-secondary mt-5" onClick={() => window.location.reload()}>Try again</button></div>;

  const sold = item.status === 'sold' || item.stock === 0;
  const locked = item.status === 'locked';
  const availableStock = item.stock ?? (sold ? 0 : 1);
  const canonicalUrl = `${(import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') ?? window.location.origin}${productPath(item.name, item.id)}`;
  const productSchema = {
    '@context': 'https://schema.org', '@type': 'Product', name: item.name,
    description: item.description ?? `${item.condition} ${item.category} from ONEEEPIIECE`, image: item.photos,
    brand: { '@type': 'Brand', name: item.brand ?? 'ONEEEPIIECE' }, sku: item.id,
    itemCondition: 'https://schema.org/UsedCondition', url: canonicalUrl,
    offers: { '@type': 'Offer', priceCurrency: 'INR', price: item.price_inr, availability: sold ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock', url: canonicalUrl },
  };

  return (
    <div className="page" style={{ paddingTop: '1.5rem', paddingBottom: '4rem' }}>
      <Helmet>
        <title>{item.name} | ONEEEPIIECE</title>
        <meta name="description" content={`${item.condition} ${item.category}. One of one, found once and never restocked.`} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="product" /><meta property="og:title" content={`${item.name} | ONEEEPIIECE`} />
        <meta property="og:description" content={item.description ?? `${item.condition} ${item.category} — one of one.`} />
        {item.photos[0] && <meta property="og:image" content={item.photos[0]} />}
        {item.photos[0] && <meta name="twitter:image" content={item.photos[0]} />}
        <meta property="product:price:amount" content={String(item.price_inr)} /><meta property="product:price:currency" content="INR" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(productSchema)}</script>
      </Helmet>
      <Link to="/shop" className="inline-flex items-center gap-2 text-sm mb-8" style={{ color: 'var(--ink-2)' }}>
        <ArrowLeft size={15} />
        Back to shop
      </Link>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
        {/* Gallery */}
        <div>
          {/* Desktop: stacked gallery */}
          <div className="hidden md:block space-y-4">
            <button type="button" onClick={() => setZoomOpen(true)} className="product-media aspect-[4/5] w-full cursor-zoom-in" aria-label="Zoom product image">
              <img
                src={item.photos[activePhoto] ?? item.photos[0] ?? ''}
                alt={item.name}
                className={`w-full h-full object-cover ${sold ? 'grayscale opacity-60' : ''}`}
                fetchPriority="high"
              />
            </button>
            {item.photos.length > 1 && (
              <div className="flex gap-3">
                {item.photos.map((photo, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePhoto(i)}
                    className={`product-media w-20 h-20 overflow-hidden border-2 ${i === activePhoto ? '' : 'opacity-60'}`}
                    style={{ borderColor: i === activePhoto ? 'var(--ink)' : 'transparent' }}
                  >
                    <img src={photo} alt={`${item.name} photo ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mobile: horizontal scroll-snap strip */}
          <div className="md:hidden scroll-snap-x flex gap-2 -mx-[clamp(1.25rem,4vw,3rem)] px-[clamp(1.25rem,4vw,3rem)]">
            {item.photos.length > 0 ? item.photos.map((photo, i) => (
              <button type="button" key={i} onClick={() => { setActivePhoto(i); setZoomOpen(true); }} className="scroll-snap-item product-media aspect-[3/4] w-[75vw] cursor-zoom-in" aria-label={`Zoom ${item.name} photo ${i + 1}`}>
                <img
                  src={photo}
                  alt={`${item.name} photo ${i + 1}`}
                  className={`w-full h-full object-cover ${sold ? 'grayscale opacity-60' : ''}`}
                />
              </button>
            )) : (
              <div className="scroll-snap-item product-media aspect-[3/4] w-[75vw]" />
            )}
          </div>
        </div>

        {/* Info column */}
        <div className="md:sticky md:top-24 md:self-start">
          <p className="label mb-2" style={{ color: 'var(--brass-text)' }}>1 of 1</p>
          <h1 className="font-display text-3xl md:text-4xl mb-4" style={{ fontWeight: 400 }}>
            {item.name}
          </h1>

          <div className="flex flex-wrap gap-3 mb-5">
            <button className="btn btn-secondary" onClick={() => void toggleWishlist()} disabled={wishlistBusy} aria-pressed={wishlisted}>
              <Heart size={15} fill={wishlisted ? 'currentColor' : 'none'} /> {wishlisted ? 'Saved' : 'Save to wishlist'}
            </button>
            <button className="btn btn-secondary" onClick={() => void shareProduct()}><Share2 size={15} /> Share</button>
          </div>

          {!sold && (
            <p className="price text-xl text-ink mb-8">{formatINR(item.price_inr)}</p>
          )}

          {!sold && availableStock <= 3 && <p className="label mb-5" role="status">Only {availableStock} left</p>}
          {!sold && availableStock > 3 && <p className="label mb-5" role="status">In stock</p>}

          {/* Info table */}
          <div className="hairline-t hairline-b mb-8">
            <div className="grid grid-cols-2">
              <div className="py-4 pr-4 hairline-r hairline-b">
                <div className="flex items-center justify-between gap-2">
                  <p className="label mb-1">Size</p>
                  <button onClick={() => setChartOpen(true)} className="label inline-flex items-center gap-1 text-link"><Ruler size={12} /> Guide</button>
                </div>
                <p className="text-sm text-ink">{item.size}</p>
              </div>
              <div className="py-4 pl-4 hairline-b">
                <p className="label mb-1">Brand</p>
                <p className="text-sm text-ink">{item.brand ?? '—'}</p>
              </div>
              <div className="py-4 pr-4 hairline-r">
                <p className="label mb-1">Condition</p>
                <p className="text-sm text-ink">{item.condition}</p>
              </div>
              <div className="py-4 pl-4">
                <p className="label mb-1">Measurements</p>
                <p className="text-sm text-ink">{item.measurements ?? '—'}</p>
              </div>
            </div>
          </div>

          {item.description && (
            <div className="mb-8">
              <p className="text-sm leading-relaxed text-ink">{item.description}</p>
            </div>
          )}

          {/* Action area */}
          <div className="mb-8">
            {sold ? (
              <div className="space-y-4">
                <p className="font-display text-2xl" style={{ fontWeight: 400, color: 'var(--ink-2)' }}>Sold</p>
                <Link to="/shop" className="text-link">See similar pieces</Link>
                <form onSubmit={notifyWhenAvailable} className="max-w-md space-y-3 pt-3">
                  <label htmlFor="stock-notify-email" className="label-field">Get an email if this piece becomes available</label>
                  <div className="flex gap-2"><input id="stock-notify-email" type="email" required value={notifyEmail} onChange={(event) => setNotifyEmail(event.target.value)} className="input" placeholder="Email address" /><button className="btn btn-primary shrink-0" type="submit">Notify me</button></div>
                  {notifyMessage && <p className="label" role="status">{notifyMessage}</p>}
                </form>
              </div>
            ) : inBag ? (
              <button
                onClick={() => navigate('/checkout')}
                className="btn btn-success w-full md:w-[320px]"
              >
                In your bag — Checkout
              </button>
            ) : locked ? (
              <div className="space-y-3">
                <button disabled className="btn btn-secondary w-full md:w-[320px]">
                  Reserved by another shopper
                </button>
                <Link to="/shop" className="text-link block">Back to shop</Link>
              </div>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={adding}
                className="btn btn-primary w-full md:w-[320px]"
              >
                {adding ? 'Reserving…' : (
                  <>
                    <ShoppingBag size={15} />
                    Add to bag
                  </>
                )}
              </button>
            )}

            {error && (
              <p className="mt-4 text-sm" style={{ color: 'var(--error)' }}>
                <AlertTriangle size={14} className="inline mr-1" />
                {error}
              </p>
            )}

            {!sold && !locked && !inBag && (
              <p className="label mt-4">Adding to bag reserves this item for 10 minutes.</p>
            )}
            {notifyMessage && <p className="label mt-3" role="status">{notifyMessage}</p>}
          </div>

          {/* Accordion: Delivery and returns */}
          <div className="hairline-t">
            <button
              onClick={() => setAccordionOpen(!accordionOpen)}
              className="flex items-center justify-between w-full py-4 text-sm font-medium text-ink"
            >
              Delivery and returns
              <ChevronDown
                size={16}
                style={{ transform: accordionOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms var(--ease-out)' }}
              />
            </button>
            <div className="accordion-content" data-open={accordionOpen}>
              <div className="pb-4 text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                <p className="mb-2">We ship across India within 2–7 business days. 7-day returns for items that arrive damaged or don't match the description.</p>
                <Link to="/refund-shipping" className="text-link">Read the full policy</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {relatedItems.length > 0 && <section className="mt-16 md:mt-24" aria-labelledby="related-title">
        <h2 id="related-title" className="font-display text-2xl mb-6" style={{ fontWeight: 400 }}>Similar pieces</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">{relatedItems.map((related, index) => <ItemCard key={related.id} item={related} index={index} />)}</div>
      </section>}

      {zoomOpen && <div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`${item.name} image`} onClick={() => setZoomOpen(false)}>
        <button className="absolute right-4 top-4 text-white p-3" aria-label="Close image zoom"><X size={24} /></button>
        <img src={item.photos[activePhoto] ?? item.photos[0] ?? ''} alt={item.name} className="max-h-[92vh] max-w-full object-contain" />
      </div>}

      {chartOpen && <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="size-guide-title" onClick={() => setChartOpen(false)}>
        <section className="bg-paper p-6 md:p-8 max-w-lg w-full" onClick={(event) => event.stopPropagation()}>
          <div className="flex justify-between items-start gap-4"><div><p className="label mb-2">{item.category}</p><h2 id="size-guide-title" className="font-display text-2xl" style={{ fontWeight: 400 }}>Finding your fit</h2></div><button className="p-2" onClick={() => setChartOpen(false)} aria-label="Close size guide"><X size={20} /></button></div>
          <p className="text-sm mt-4" style={{ color: 'var(--ink-2)' }}>Vintage sizing varies by brand and era. Use the exact garment measurements listed on this page and compare them with a similar piece you own. Contact us if you would like help with fit.</p>
          <button className="btn btn-primary mt-6" onClick={() => setChartOpen(false)}>Got it</button>
        </section>
      </div>}
      {!sold && !locked && <div className="md:hidden fixed z-40 bottom-0 inset-x-0 border-t bg-paper/95 backdrop-blur-sm px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-4" style={{ borderColor: 'var(--hairline)' }}>
        <div className="min-w-0"><p className="label truncate">One of one</p><p className="price">{formatINR(item.price_inr)}</p></div>
        <button onClick={inBag ? () => navigate('/checkout') : handleAddToCart} disabled={adding} className="btn btn-primary flex-1 min-h-11">{inBag ? 'Go to checkout' : adding ? 'Reserving…' : 'Add to bag'}</button>
      </div>}
    </div>
  );
}
