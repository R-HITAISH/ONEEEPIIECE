import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Loader2, Package } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Link, useRouter } from '@/router/Router';
import { supabase, type Item, type Order } from '@/lib/supabase';
import { formatINR, timeAgo } from '@/lib/utils';

type OrderDetail = Order & { order_items: { id: string; price_inr: number; item: Item | null }[] };
const TIMELINE = ['placed', 'paid', 'packed', 'shipped', 'delivered'] as const;

export function OrderPage() {
  const { id = '' } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { navigate } = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate(`/auth?returnTo=${encodeURIComponent(`/order/${id}`)}`);
  }, [authLoading, user, navigate, id]);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    supabase.from('orders').select('*,order_items(*,item:item_id(*))').eq('id', id).eq('user_id', user.id).maybeSingle()
      .then(({ data, error: loadError }) => {
        if (!active) return;
        setError(loadError ? 'We could not load this order.' : null);
        setOrder(data as unknown as OrderDetail | null);
        setLoading(false);
      });
    return () => { active = false; };
  }, [id, user]);

  if (authLoading || loading) return <div className="page py-16"><Loader2 className="animate-spin" aria-label="Loading order" /></div>;
  if (error || !order) return <div className="page py-20 text-center" role="alert"><h1 className="font-display" style={{ fontWeight: 400 }}>Order not found</h1><p className="label mt-4 mb-7">{error ?? 'This order is unavailable to this account.'}</p><Link className="btn btn-secondary" to="/account/orders">Back to orders</Link></div>;
  const terminal = ['cancelled', 'failed', 'returned'].includes(order.status);
  const currentIndex = TIMELINE.indexOf(order.status as typeof TIMELINE[number]);

  return <div className="page py-12 md:py-20 max-w-4xl">
    <Link to="/account/orders" className="inline-flex items-center gap-2 text-sm mb-8">← All orders</Link>
    <div className="flex flex-wrap justify-between items-start gap-5"><div><p className="label mb-2">Order {order.id.slice(0, 8).toUpperCase()}</p><h1 className="font-display" style={{ fontWeight: 400 }}>Order details</h1><p className="label mt-2">Placed {timeAgo(order.created_at)}</p></div><span className="chip chip-active">{order.status}</span></div>

    {terminal ? <div className="mt-10 p-5 bg-[color:var(--sunken)]"><p className="font-medium">This order is {order.status}.</p></div> : <ol className="mt-12 grid grid-cols-2 sm:grid-cols-5 gap-3" aria-label="Order status timeline">{TIMELINE.map((status, index) => <li key={status} className="border-t-2 pt-3" style={{ borderColor: index <= currentIndex ? 'var(--brass)' : 'var(--hairline)' }}><span className="flex items-center gap-2 label">{index < currentIndex && <Check size={13} />}{status}</span></li>)}</ol>}

    {order.tracking_number && <section className="mt-8 border p-5" style={{ borderColor: 'var(--hairline)' }}><p className="label mb-2">Tracking number</p><p>{order.tracking_number}</p></section>}
    <section className="mt-12"><h2 className="font-display text-2xl mb-5" style={{ fontWeight: 400 }}>Items</h2>{order.order_items.map((entry) => <div key={entry.id} className="flex items-center gap-4 py-4 border-b" style={{ borderColor: 'var(--hairline)' }}>
      {entry.item?.photos[0] ? <img src={entry.item.photos[0]} alt={entry.item.name} className="w-16 aspect-[4/5] object-cover" loading="lazy" /> : <Package size={28} />}
      <div className="flex-1"><p>{entry.item?.name ?? 'Store item'}</p><p className="label mt-1">{entry.item?.size}</p></div><span className="price">{formatINR(entry.price_inr)}</span>
    </div>)}<div className="flex justify-between pt-5"><span className="label">Total</span><strong className="price">{formatINR(order.total_inr)}</strong></div></section>
    <section className="mt-10 grid sm:grid-cols-2 gap-8 border-t pt-6" style={{ borderColor: 'var(--hairline)' }}><div><h2 className="label mb-3">Delivering to</h2><p>{order.shipping_name}</p><p className="text-sm mt-1">{order.shipping_address}<br />{order.shipping_city}, {order.shipping_state} {order.shipping_pincode}</p></div><div><h2 className="label mb-3">Payment</h2><p>{order.payment_method === 'cod' ? 'Cash on delivery' : 'Razorpay'}</p></div></section>
  </div>;
}
