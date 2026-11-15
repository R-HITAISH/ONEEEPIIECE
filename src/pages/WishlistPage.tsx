import { useEffect, useState } from 'react';
import { Heart, Loader2, Trash2 } from 'lucide-react';
import { ItemCard } from '@/components/ItemCard';
import { useAuth } from '@/context/AuthContext';
import { Link, useRouter } from '@/router/Router';
import { supabase, type Item } from '@/lib/supabase';

type WishRow = { id: string; item: Item | null };

export function WishlistPage() {
  const { user, loading: authLoading } = useAuth();
  const { navigate } = useRouter();
  const [items, setItems] = useState<WishRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth?returnTo=/wishlist');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    supabase.from('wishlist').select('id,item:item_id(*)').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data, error: loadError }) => {
        if (!active) return;
        setError(loadError ? 'We could not load your wishlist. Please try again.' : null);
        setItems((data ?? []) as unknown as WishRow[]);
        setLoading(false);
      });
    return () => { active = false; };
  }, [user]);

  const removeItem = async (itemId: string) => {
    if (!user) return;
    const { error: deleteError } = await supabase.from('wishlist').delete().eq('user_id', user.id).eq('item_id', itemId);
    if (deleteError) setError('Could not remove that piece. Please try again.');
    else setItems((current) => current.filter((row) => row.item?.id !== itemId));
  };

  if (authLoading || (!user && !authLoading) || loading) return <div className="page py-16"><Loader2 className="animate-spin" aria-label="Loading wishlist" /></div>;

  return <div className="page py-12 md:py-20">
    <p className="label mb-2">Your saved pieces</p>
    <h1 className="font-display mb-8" style={{ fontWeight: 400 }}>Wishlist</h1>
    {error && <p role="alert" className="mb-6" style={{ color: 'var(--error)' }}>{error}</p>}
    {items.length === 0 ? <div className="text-center py-16"><Heart size={32} className="mx-auto mb-4" /><p className="font-display text-2xl mb-3" style={{ fontWeight: 400 }}>Nothing saved yet.</p><p className="label mb-6">Keep the pieces you love close at hand.</p><Link to="/shop" className="btn btn-primary">Explore the collection</Link></div>
      : <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">{items.filter((row): row is { id: string; item: Item } => Boolean(row.item)).map((row, index) => <article key={row.id} className="relative"><ItemCard item={row.item} index={index} /><button onClick={() => void removeItem(row.item.id)} className="absolute right-2 top-2 bg-paper p-3" aria-label={`Remove ${row.item.name} from wishlist`}><Trash2 size={16} /></button></article>)}</div>}
  </div>;
}
