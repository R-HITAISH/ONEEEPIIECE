import { motion, useReducedMotion } from 'motion/react';
import type { Item } from '@/lib/supabase';
import { formatINR } from '@/lib/utils';

function excerpt(story: string | null | undefined) {
  if (!story) return '';
  const clean = story.trim().replace(/\s+/g, ' ');
  if (clean.length <= 90) return clean;
  const boundary = clean.slice(0, 90).lastIndexOf(' ');
  return `${clean.slice(0, boundary > 0 ? boundary : 90).trimEnd()}…`;
}

export function HangTag({ item, animated = false, showPrice = true }: { item: Item; animated?: boolean; showPrice?: boolean }) {
  const reduceMotion = useReducedMotion();
  const Tag = animated && !reduceMotion ? motion.div : 'div';
  const motionProps = animated && !reduceMotion ? {
    initial: { rotate: 8 }, animate: { rotate: 0 },
    transition: { type: 'spring' as const, bounce: 0.2, duration: 0.7 },
    style: { transformOrigin: '50% 0%' },
  } : {};

  return <Tag {...motionProps} className="hang-tag" aria-label={`${item.name}, ${item.size || 'size not listed'}, ${item.condition}, ${formatINR(item.price_inr)}`}>
    <span className="hang-tag-hole" aria-hidden="true" />
    <p className="hang-tag-name">{item.name}</p>
    <p className="hang-tag-meta">{item.size ? `Size ${item.size} · ` : ''}{item.condition}</p>
    {showPrice && <p className="hang-tag-price price">{formatINR(item.price_inr)}</p>}
    {excerpt(item.story) && <p className="hang-tag-story">{excerpt(item.story)}</p>}
  </Tag>;
}
