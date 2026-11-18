import { useEffect, useRef, useState } from 'react';
import type { Item } from '@/lib/supabase';
import { formatINR, productPath, responsiveImageUrl } from '@/lib/utils';
import { Link } from '@/router/Router';

export function ItemCard({ item }: { item: Item; index?: number }) {
  const sold = item.status === 'sold';
  const locked = item.status === 'locked';
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  const altText = `${item.name}, size ${item.size || 'not listed'}, ${item.condition}`;
  const storyExcerpt = item.story?.trim().replace(/\s+/g, ' ');
  const excerpt = storyExcerpt && (storyExcerpt.length > 90 ? `${storyExcerpt.slice(0, Math.max(1, storyExcerpt.slice(0, 90).lastIndexOf(' ')))}…` : storyExcerpt);

  return (
    <Link to={productPath(item.name, item.id)} className="product-card block">
      <div className="product-media aspect-[4/5] relative">
        {item.photos[0] ? <img
          ref={imgRef}
          src={item.photos[0] ? responsiveImageUrl(item.photos[0], 640) : ''}
          srcSet={item.photos[0] ? `${responsiveImageUrl(item.photos[0], 360)} 360w, ${responsiveImageUrl(item.photos[0], 640)} 640w, ${responsiveImageUrl(item.photos[0], 960)} 960w` : undefined}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          alt={altText}
          className={`product-img w-full h-full object-cover ${loaded ? 'is-loaded' : ''} ${sold ? 'grayscale opacity-60' : ''}`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        /> : <div className="w-full h-full" aria-hidden="true" />}
        {sold && (
          <span className="absolute top-3 left-3 px-2 py-1 bg-ink text-paper text-xs font-medium uppercase tracking-wider">
            Sold
          </span>
        )}
        {locked && !sold && (
          <span className="absolute top-3 left-3 px-2 py-1 bg-paper text-ink text-xs font-medium uppercase tracking-wider">
            Reserved
          </span>
        )}
      </div>
      <div className="pt-3">
        <h3 className="text-sm leading-snug truncate text-ink">{item.name}</h3>
        <p className="item-card-meta mt-1">{item.size ? `Size ${item.size} · ` : ''}{item.condition}</p>
        {excerpt && <p className="item-card-story">{excerpt}</p>}
        <p className="price text-sm text-ink mt-2">{formatINR(item.price_inr)}</p>
      </div>
    </Link>
  );
}
