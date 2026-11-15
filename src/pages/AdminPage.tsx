import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Link, useRouter } from '@/router/Router';
import { CATEGORIES, CONDITIONS, SIZES, supabase, type Item, type Order } from '@/lib/supabase';
import { formatINR } from '@/lib/utils';

type AdminOrder = Order & { tracking_number: string | null };
type AdminVariant = { id: string; sku: string; size: string; colour: string; stock: number; product: { name: string } | null };
type CouponDraft = { code: string; discount_type: 'percentage' | 'flat'; discount_value: string; minimum_order_inr: string };

export function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { navigate } = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [variants, setVariants] = useState<AdminVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ name: '', category: 'shirts', size: 'M', condition: 'good condition', price: '', photo: '', story: '' });
  const [coupon, setCoupon] = useState<CouponDraft>({ code: '', discount_type: 'percentage', discount_value: '', minimum_order_inr: '0' });

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth?returnTo=/admin');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle().then(({ data }) => {
      if (active) { setIsAdmin(data?.role === 'admin'); setCheckingRole(false); }
    });
    return () => { active = false; };
  }, [user]);

  const loadAdminData = useCallback(async () => {
    if (!user || !isAdmin) return;
    setLoading(true);
    const [itemResult, orderResult, variantResult] = await Promise.all([
      supabase.from('items').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('product_variants').select('id,sku,size,colour,stock,product:products(name)').order('created_at', { ascending: false }).limit(250),
    ]);
    setError(itemResult.error || orderResult.error || variantResult.error ? 'Some store data could not be loaded.' : null);
    setItems((itemResult.data ?? []) as Item[]);
    setOrders((orderResult.data ?? []) as AdminOrder[]);
    setVariants((variantResult.data ?? []) as unknown as AdminVariant[]);
    setLoading(false);
  }, [user, isAdmin]);

  useEffect(() => { void loadAdminData(); }, [loadAdminData]);

  const createProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null); setError(null);
    const slugBase = newItem.name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'piece';
    const result = await supabase.from('items').insert({
      name: newItem.name.trim(), category: newItem.category, size: newItem.size,
      condition: newItem.condition, price_inr: Number(newItem.price), photos: newItem.photo ? [newItem.photo] : [],
      status: 'available', stock: 1, view_count: 0, colour: 'As pictured', slug: `${slugBase}-${crypto.randomUUID().slice(0, 8)}`,
      story: newItem.story.trim() || null,
    });
    if (result.error) setError('Product could not be created. Check all fields and try again.');
    else { setMessage('Product created.'); setNewItem({ name: '', category: 'shirts', size: 'M', condition: 'good condition', price: '', photo: '', story: '' }); await loadAdminData(); }
  };

  const updateProduct = async (item: Item) => {
    const { error: updateError } = await supabase.from('items').update({ stock: item.stock, status: item.status, price_inr: item.price_inr, story: item.story?.trim() || null }).eq('id', item.id);
    if (updateError) setError(`Could not update ${item.name}.`);
    else setMessage(`${item.name} updated.`);
  };

  const updateVariant = async (variant: AdminVariant) => {
    const { error: updateError } = await supabase.from('product_variants').update({ stock: variant.stock }).eq('id', variant.id);
    if (updateError) setError(`Could not update ${variant.sku}.`);
    else setMessage(`${variant.sku} stock updated.`);
  };

  const updateOrder = async (order: AdminOrder, status: string, trackingNumber: string) => {
    const { error: updateError } = await supabase.from('orders').update({ status, tracking_number: trackingNumber || null, updated_at: new Date().toISOString() }).eq('id', order.id);
    if (updateError) setError(`Could not update order ${order.id.slice(0, 8)}.`);
    else {
      if (status === 'shipped' || status === 'cancelled') void supabase.functions.invoke('send-order-email', { body: { order_id: order.id } });
      setMessage('Order updated.'); await loadAdminData();
    }
  };

  const createCoupon = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage(null); setError(null);
    const { error: couponError } = await supabase.from('coupons').insert({ code: coupon.code.trim().toUpperCase(), discount_type: coupon.discount_type, discount_value: Number(coupon.discount_value), minimum_order_inr: Number(coupon.minimum_order_inr) });
    if (couponError) setError('Coupon could not be created. Check the code and values.');
    else { setMessage('Coupon created.'); setCoupon({ code: '', discount_type: 'percentage', discount_value: '', minimum_order_inr: '0' }); }
  };

  if (authLoading || checkingRole) return <div className="page py-16"><Loader2 className="animate-spin" aria-label="Checking access" /></div>;
  if (!user || !isAdmin) return <div className="page py-20 text-center"><h1 className="font-display" style={{ fontWeight: 400 }}>Store access only</h1><p className="label mt-3 mb-6">This account does not have administrator access.</p><Link className="btn btn-secondary" to="/">Return to the store</Link></div>;

  return <div className="page py-12 md:py-20 space-y-14">
    <header><p className="label mb-2">ONEPIECE</p><h1 className="font-display" style={{ fontWeight: 400 }}>Store administration</h1></header>
    {message && <p role="status" className="p-3" style={{ background: 'var(--sunken)' }}>{message}</p>}{error && <p role="alert" style={{ color: 'var(--error)' }}>{error}</p>}
    {loading ? <Loader2 className="animate-spin" aria-label="Loading store records" /> : <>
      <section><h2 className="font-display text-2xl mb-5" style={{ fontWeight: 400 }}>Products and stock</h2>
        <form onSubmit={(event) => void createProduct(event)} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 border p-5 mb-6" style={{ borderColor: 'var(--hairline)' }}>
          <input className="input" required aria-label="Product name" placeholder="Name" value={newItem.name} onChange={(event) => setNewItem({ ...newItem, name: event.target.value })} />
          <select className="input" aria-label="Category" value={newItem.category} onChange={(event) => setNewItem({ ...newItem, category: event.target.value })}>{CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select>
          <select className="input" aria-label="Size" value={newItem.size} onChange={(event) => setNewItem({ ...newItem, size: event.target.value })}>{SIZES.map((value) => <option key={value}>{value}</option>)}</select>
          <select className="input" aria-label="Condition" value={newItem.condition} onChange={(event) => setNewItem({ ...newItem, condition: event.target.value })}>{CONDITIONS.map((value) => <option key={value}>{value}</option>)}</select>
          <input className="input" required min="1" type="number" aria-label="Price in rupees" placeholder="Price ₹" value={newItem.price} onChange={(event) => setNewItem({ ...newItem, price: event.target.value })} />
          <input className="input" type="url" aria-label="Product image URL" placeholder="Image URL" value={newItem.photo} onChange={(event) => setNewItem({ ...newItem, photo: event.target.value })} />
          <div className="sm:col-span-2 lg:col-span-3"><label className="label-field" htmlFor="new-item-story">Story</label><textarea id="new-item-story" maxLength={1200} className="input" style={{ minHeight: '100px' }} value={newItem.story} onChange={(event) => setNewItem({ ...newItem, story: event.target.value })} />{newItem.story.length > 1000 && <p className="label mt-1 text-right">{newItem.story.length}/1200</p>}</div>
          <button className="btn btn-primary sm:col-span-2 lg:col-span-3"><Plus size={15} /> Add product</button>
        </form>
        <div className="space-y-3">{items.map((item) => <div key={item.id} className="grid md:grid-cols-[1fr_110px_150px_130px_auto] gap-3 items-center border-b py-3" style={{ borderColor: 'var(--hairline)' }}>
          <div className="min-w-0"><p className="truncate">{item.name}</p><p className="label">{formatINR(item.price_inr)}</p></div>
          <input type="number" min="0" className="input" aria-label={`${item.name} stock`} value={item.stock ?? 0} onChange={(event) => setItems((current) => current.map((row) => row.id === item.id ? { ...row, stock: Number(event.target.value) } : row))} />
          <select className="input" aria-label={`${item.name} status`} value={item.status} onChange={(event) => setItems((current) => current.map((row) => row.id === item.id ? { ...row, status: event.target.value } : row))}><option value="available">Available</option><option value="locked">Reserved</option><option value="sold">Sold</option></select>
          <input type="number" min="0" className="input" aria-label={`${item.name} price`} value={item.price_inr} onChange={(event) => setItems((current) => current.map((row) => row.id === item.id ? { ...row, price_inr: Number(event.target.value) } : row))} />
          <button className="btn btn-secondary" onClick={() => void updateProduct(item)} aria-label={`Save ${item.name}`}><Save size={15} /></button>
          <div className="md:col-span-5 w-full"><label className="label-field" htmlFor={`item-story-${item.id}`}>Story</label><textarea id={`item-story-${item.id}`} maxLength={1200} className="input" style={{ minHeight: '100px' }} value={item.story ?? ''} onChange={(event) => setItems((current) => current.map((row) => row.id === item.id ? { ...row, story: event.target.value } : row))} />{(item.story?.length ?? 0) > 1000 && <p className="label mt-1 text-right">{item.story?.length}/1200</p>}</div>
        </div>)}</div>
      </section>
      <section><h2 className="font-display text-2xl mb-5" style={{ fontWeight: 400 }}>Catalog variant stock</h2><div className="space-y-2">{variants.map((variant) => <div key={variant.id} className="grid sm:grid-cols-[1fr_120px_auto] gap-3 items-center border-b py-3" style={{ borderColor: 'var(--hairline)' }}>
        <div><p>{variant.product?.name ?? 'Catalog product'}</p><p className="label">{variant.size} · {variant.colour} · {variant.sku}</p></div>
        <input type="number" min="0" className="input" aria-label={`${variant.sku} stock`} value={variant.stock} onChange={(event) => setVariants((current) => current.map((row) => row.id === variant.id ? { ...row, stock: Number(event.target.value) } : row))} />
        <button className="btn btn-secondary" onClick={() => void updateVariant(variant)} aria-label={`Save ${variant.sku} stock`}><Save size={15} /></button>
      </div>)}</div></section>
      <section><h2 className="font-display text-2xl mb-5" style={{ fontWeight: 400 }}>Orders</h2><div className="space-y-5">{orders.map((order) => <OrderEditor key={order.id} order={order} onSave={updateOrder} />)}</div></section>
      <section><h2 className="font-display text-2xl mb-5" style={{ fontWeight: 400 }}>Create a coupon</h2><form onSubmit={(event) => void createCoupon(event)} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <input className="input" required aria-label="Coupon code" placeholder="CODE" value={coupon.code} onChange={(event) => setCoupon({ ...coupon, code: event.target.value })} />
        <select className="input" aria-label="Discount type" value={coupon.discount_type} onChange={(event) => setCoupon({ ...coupon, discount_type: event.target.value as CouponDraft['discount_type'] })}><option value="percentage">Percentage</option><option value="flat">Flat ₹</option></select>
        <input className="input" min="1" type="number" required aria-label="Discount value" placeholder="Discount" value={coupon.discount_value} onChange={(event) => setCoupon({ ...coupon, discount_value: event.target.value })} />
        <input className="input" min="0" type="number" aria-label="Minimum order" placeholder="Minimum order ₹" value={coupon.minimum_order_inr} onChange={(event) => setCoupon({ ...coupon, minimum_order_inr: event.target.value })} />
        <button className="btn btn-primary sm:col-span-2 lg:col-span-4"><Plus size={15} /> Create coupon</button>
      </form></section>
    </>}
  </div>;
}

function OrderEditor({ order, onSave }: { order: AdminOrder; onSave: (order: AdminOrder, status: string, tracking: string) => Promise<void> }) {
  const [status, setStatus] = useState(order.status);
  const [tracking, setTracking] = useState(order.tracking_number ?? '');
  return <form onSubmit={(event) => { event.preventDefault(); void onSave(order, status, tracking); }} className="grid md:grid-cols-[1fr_180px_1fr_auto] gap-3 items-center border-b py-4" style={{ borderColor: 'var(--hairline)' }}>
    <div><Link to={`/order/${order.id}`} className="label-ink">Order {order.id.slice(0, 8).toUpperCase()}</Link><p className="label mt-1">{formatINR(order.total_inr)}</p></div>
    <select className="input" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Order status">{['placed','paid','packed','shipped','delivered','cancelled','returned','failed'].map((value) => <option key={value}>{value}</option>)}</select>
    <input className="input" value={tracking} onChange={(event) => setTracking(event.target.value)} placeholder="Tracking number" aria-label="Tracking number" />
    <button className="btn btn-secondary"><Save size={15} /> Save</button>
  </form>;
}
