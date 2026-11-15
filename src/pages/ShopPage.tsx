import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase, type Item, CATEGORIES, CONDITIONS, SIZES } from '@/lib/supabase';
import { ItemCard } from '@/components/ItemCard';
import { X } from 'lucide-react';

type SortOption = 'newest' | 'price-low' | 'price-high' | 'popular';
const PAGE_SIZE = 12;
const COLOURS = ['Black', 'Blue', 'Brown', 'Green', 'Grey', 'Red', 'White'] as const;

export function ShopPage({ initialCategory = null }: { initialCategory?: string | null }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<Item[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);

  const category = searchParams.get('category') ?? initialCategory;
  const size = searchParams.get('size');
  const condition = searchParams.get('condition');
  const colour = searchParams.get('colour');
  const minPrice = searchParams.get('min') ?? '';
  const maxPrice = searchParams.get('max') ?? '';
  const searchText = searchParams.get('q')?.trim() ?? '';
  const rawSort = searchParams.get('sort');
  const sort: SortOption = rawSort === 'price-low' || rawSort === 'price-high' || rawSort === 'popular' ? rawSort : 'newest';
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const queryKey = searchParams.toString();

  const updateFilter = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  };

  useEffect(() => {
    let active = true;
    const loadItems = async () => {
      setLoading(true);
      setError(null);
      let query = supabase.from('items').select('*', { count: 'exact' });
      query = query.eq('status', showArchive ? 'sold' : 'available');
      if (category) query = query.eq('category', category);
      if (size) query = query.eq('size', size);
      if (condition) query = query.eq('condition', condition);
      if (colour) query = query.ilike('colour', `%${colour}%`);
      if (searchText) query = query.ilike('name', `%${searchText}%`);
      const min = Number(minPrice);
      const max = Number(maxPrice);
      if (minPrice && Number.isFinite(min)) query = query.gte('price_inr', min);
      if (maxPrice && Number.isFinite(max)) query = query.lte('price_inr', max);
      if (sort === 'price-low') query = query.order('price_inr', { ascending: true });
      else if (sort === 'price-high') query = query.order('price_inr', { ascending: false });
      else if (sort === 'popular') query = query.order('view_count', { ascending: false });
      else query = query.order('created_at', { ascending: false });

      const { data, count, error: queryError } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (!active) return;
      if (queryError) setError('We could not load the collection. Please try again.');
      setItems(data ?? []);
      setTotalCount(count ?? 0);
      setLoading(false);
    };
    void loadItems();
    return () => { active = false; };
  }, [category, size, condition, colour, minPrice, maxPrice, searchText, sort, page, showArchive, queryKey]);

  const activeFilters = useMemo(
    () => [
      { key: 'category', label: category },
      { key: 'size', label: size },
      { key: 'condition', label: condition },
      { key: 'colour', label: colour },
      { key: 'q', label: searchText ? `Search: ${searchText}` : null },
      { key: 'min', label: minPrice ? `From ₹${Number(minPrice).toLocaleString('en-IN')}` : null },
      { key: 'max', label: maxPrice ? `Up to ₹${Number(maxPrice).toLocaleString('en-IN')}` : null },
    ].filter((filter): filter is { key: string; label: string } => Boolean(filter.label)),
    [category, size, condition, colour, searchText, minPrice, maxPrice]
  );

  const clearAll = () => {
    const next = new URLSearchParams(searchParams);
    ['category', 'size', 'condition', 'colour', 'q', 'min', 'max', 'page'].forEach((key) => next.delete(key));
    setSearchParams(next);
  };

  const filterChips = (options: readonly string[], value: string | null, key: string) => (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button key={option} onClick={() => updateFilter(key, value === option ? null : option)} className={`chip ${value === option ? 'chip-active' : ''}`}>
          {option}
        </button>
      ))}
    </div>
  );

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="page" style={{ paddingTop: 'clamp(2.5rem, 5vw, 5rem)', paddingBottom: 'clamp(4rem, 8vw, 8rem)' }}>
      <div className="mb-8 md:mb-12">
        <h1 style={{ fontWeight: 400 }}>Shop</h1>
        <p className="label mt-2">{loading ? 'Loading pieces…' : `${totalCount} ${totalCount === 1 ? 'piece' : 'pieces'}`}</p>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 hairline-b">
        <label className="flex items-center gap-3"><span className="label">Sort</span>
          <select value={sort} onChange={(event) => updateFilter('sort', event.target.value)} className="input" style={{ width: 'auto', minHeight: '40px', padding: '0.375rem 0.75rem' }}>
            <option value="newest">Newest</option><option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option><option value="popular">Popular</option>
          </select>
        </label>
        <label className="flex items-center gap-3"><span className="label">Category</span>
          <select value={category ?? ''} onChange={(event) => updateFilter('category', event.target.value || null)} className="input" style={{ width: 'auto', minHeight: '40px', padding: '0.375rem 0.75rem' }}>
            <option value="">All</option>{CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <button onClick={() => setShowArchive((value) => !value)} className={`chip ${showArchive ? 'chip-active' : ''}`}>{showArchive ? 'Available' : 'Archive (sold)'}</button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-5 mb-6">
        <label className="label-field">Size{filterChips(SIZES, size, 'size')}</label>
        <label className="label-field">Condition{filterChips(CONDITIONS, condition, 'condition')}</label>
        <label className="label-field">Colour{filterChips(COLOURS, colour, 'colour')}</label>
        <fieldset className="min-w-0"><legend className="label-field">Price range</legend>
          <div className="flex gap-2">
            <input aria-label="Minimum price in rupees" className="input" inputMode="numeric" placeholder="Min ₹" value={minPrice} onChange={(event) => updateFilter('min', event.target.value.replace(/\D/g, ''))} />
            <input aria-label="Maximum price in rupees" className="input" inputMode="numeric" placeholder="Max ₹" value={maxPrice} onChange={(event) => updateFilter('max', event.target.value.replace(/\D/g, ''))} />
          </div>
        </fieldset>
      </div>

      {activeFilters.length > 0 && <div className="flex flex-wrap gap-2 mb-8">
        {activeFilters.map((filter) => <button key={filter.key} onClick={() => updateFilter(filter.key, null)} className="chip chip-active flex items-center gap-1">{filter.label}<X size={12} /></button>)}
        <button onClick={clearAll} className="text-link text-sm">Clear all</button>
      </div>}

      {error ? <div className="py-20 text-center" role="alert"><p className="mb-4">{error}</p><button onClick={() => setSearchParams(new URLSearchParams(searchParams))} className="btn btn-secondary">Try again</button></div>
        : loading ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[14px] md:gap-6">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[4/5] animate-pulse" style={{ background: 'var(--sunken)' }} />)}</div>
        : items.length === 0 ? <div className="text-center py-24"><p className="font-display text-2xl mb-2" style={{ fontWeight: 400 }}>Nothing matches.</p><p className="label mb-6">Try clearing your filters or check back when the next drop lands.</p>{activeFilters.length > 0 && <button onClick={clearAll} className="btn btn-secondary">Clear filters</button>}</div>
        : <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[14px] md:gap-6">{items.map((item, i) => <ItemCard key={item.id} item={item} index={i} />)}</div>}

      {!loading && !error && pageCount > 1 && <nav className="mt-10 flex items-center justify-center gap-5" aria-label="Collection pages">
        <button className="btn btn-secondary" disabled={page <= 1} onClick={() => updateFilter('page', String(page - 1))}>Previous</button>
        <span className="label">Page {page} of {pageCount}</span>
        <button className="btn btn-secondary" disabled={page >= pageCount} onClick={() => updateFilter('page', String(page + 1))}>Next</button>
      </nav>}
    </div>
  );
}
