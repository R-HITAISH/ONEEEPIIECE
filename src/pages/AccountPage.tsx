import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Link, useRouter } from '@/router/Router';
import { supabase, type Order, type OrderItem } from '@/lib/supabase';
import { formatINR, timeAgo, productPath } from '@/lib/utils';
import { Loader2, Package } from 'lucide-react';
import { useCallback } from 'react';

type OrderWithItems = Order & {
  order_items: (OrderItem & { item: { id: string; name: string; photos: string[] } | null })[];
};
type SavedAddress = { id: string; recipient_name: string; phone: string; address_line: string; address_extra: string | null; city: string; state: string; pincode: string; is_default: boolean };

export function AccountPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { navigate } = useRouter();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [addressDraft, setAddressDraft] = useState({ recipient_name: '', phone: '', address_line: '', address_extra: '', city: '', state: '', pincode: '' });

  const loadAddresses = useCallback(async () => {
    if (!user) return;
    const [{ data: profile }, { data: savedAddresses }] = await Promise.all([
      supabase.from('profiles').select('full_name,phone').eq('id', user.id).maybeSingle(),
      supabase.from('addresses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    setProfileName(profile?.full_name || (user.email ?? '').split('@')[0].replace(/[._-]/g, ' '));
    setProfilePhone(profile?.phone ?? user.phone ?? '');
    setAddresses((savedAddresses ?? []) as SavedAddress[]);
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth?returnTo=/account');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from('orders')
      .select('*, order_items(*, item:item_id(id, name, photos))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setOrders(data as OrderWithItems[]);
        setLoading(false);
      });
  }, [user]);

  useEffect(() => { void loadAddresses(); }, [loadAddresses]);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setProfileError(null); setProfileMessage(null);
    const { error } = await supabase.from('profiles').update({ full_name: profileName.trim(), phone: profilePhone.trim() || null }).eq('id', user.id);
    if (error) setProfileError('Your profile could not be saved.');
    else setProfileMessage('Profile saved.');
  };

  const saveAddress = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setProfileError(null); setProfileMessage(null);
    const { error } = await supabase.from('addresses').insert({ ...addressDraft, user_id: user.id, address_extra: addressDraft.address_extra || null, is_default: addresses.length === 0 });
    if (error) setProfileError('Address could not be saved. Check your phone number and six-digit pincode.');
    else { setAddressDraft({ recipient_name: '', phone: '', address_line: '', address_extra: '', city: '', state: '', pincode: '' }); setProfileMessage('Address saved.'); await loadAddresses(); }
  };

  const removeAddress = async (addressId: string) => {
    const { error } = await supabase.from('addresses').delete().eq('id', addressId);
    if (error) setProfileError('Address could not be removed.');
    else setAddresses((current) => current.filter((address) => address.id !== addressId));
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="page py-12">
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--ink-2)' }} />
      </div>
    );
  }

  if (!user) return null;

  const firstName = profileName || (user.email ?? '').split('@')[0].replace(/[._-]/g, ' ').trim() || 'Account';
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  // Derive phone from user metadata if available
  const email = user.email ?? '—';

  return (
    <div className="page" style={{ paddingTop: 'clamp(2.5rem,5vw,5rem)', paddingBottom: 'clamp(4rem,8vw,8rem)' }}>
      <h1 style={{ fontWeight: 400 }}>Account</h1>
      <p className="font-display text-2xl mt-2" style={{ fontWeight: 400 }}>{displayName}</p>

      {/* Orders */}
      <section className="mt-12 hairline-t pt-8">
        <h2 className="font-display text-xl mb-6" style={{ fontWeight: 400 }}>Orders</h2>

        {loading ? (
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--ink-2)' }} />
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package size={32} className="mx-auto mb-3" style={{ color: 'var(--ink-2)' }} />
            <p className="label mb-4">No orders yet.</p>
            <Link to="/shop" className="text-link">Shop new pieces</Link>
          </div>
        ) : (
          <div className="space-y-0">
            {orders.map((order, idx) => (
              <div key={order.id} className={`py-6 ${idx !== orders.length - 1 ? 'hairline-b' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                  <Link to={`/order/${order.id}`} className="label-ink">Order {order.id.slice(0, 8).toUpperCase()} · View details</Link>
                    <p className="label mt-1">{timeAgo(order.created_at)}</p>
                  </div>
                  <span
                    className="label px-2 py-1"
                    style={
                      order.status === 'paid'
                        ? { background: 'var(--success)', color: 'var(--paper)' }
                        : { background: 'var(--sunken)', color: 'var(--ink-2)' }
                    }
                  >
                    {order.status}
                  </span>
                </div>
                <div className="space-y-3">
                  {order.order_items.map((oi) => (
                    <Link key={oi.id} to={productPath(oi.item?.name ?? 'piece', oi.item_id)} className="flex items-center gap-3">
                      {oi.item?.photos?.[0] && (
                        <div className="w-12 h-16 product-media shrink-0 overflow-hidden">
                          <img src={oi.item.photos[0]} alt={oi.item?.name ?? ''} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate text-ink">{oi.item?.name ?? 'Item removed'}</p>
                        <p className="label price mt-0.5">{formatINR(oi.price_inr)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-4 mt-4 hairline-t">
                  <span className="label">Total</span>
                  <span className="price font-display text-lg" style={{ fontWeight: 400 }}>{formatINR(order.total_inr)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Details */}
      <section className="mt-12 hairline-t pt-8">
        <h2 className="font-display text-xl mb-6" style={{ fontWeight: 400 }}>Profile</h2>
        <form onSubmit={(event) => void saveProfile(event)} className="space-y-4 max-w-[440px]">
          <label className="label-field">Name<input value={profileName} onChange={(event) => setProfileName(event.target.value)} required className="input mt-2" /></label>
          <label className="label-field">Phone<input value={profilePhone} onChange={(event) => setProfilePhone(event.target.value)} inputMode="tel" className="input mt-2" /></label>
          <label className="label-field">Email<input type="email" value={email} readOnly className="input mt-2" style={{ color: 'var(--ink-2)' }} /></label>
          <button className="btn btn-secondary">Save profile</button>
        </form>
        <Link className="text-link inline-block mt-5" to="/contact?subject=Account%20deletion%20request">Request account deletion</Link>
      </section>

      <section className="mt-12 hairline-t pt-8">
        <h2 className="font-display text-xl mb-6" style={{ fontWeight: 400 }}>Saved addresses</h2>
        {addresses.map((address) => <article key={address.id} className="max-w-xl border-b py-4 flex justify-between gap-4" style={{ borderColor: 'var(--hairline)' }}>
          <div><p>{address.recipient_name} · {address.phone}</p><p className="text-sm mt-1">{address.address_line}{address.address_extra ? `, ${address.address_extra}` : ''}<br />{address.city}, {address.state} {address.pincode}</p></div>
          <button className="text-link self-start" onClick={() => void removeAddress(address.id)}>Remove</button>
        </article>)}
        <form onSubmit={(event) => void saveAddress(event)} className="grid sm:grid-cols-2 gap-4 max-w-2xl mt-6">
          {([
            ['recipient_name','Full name'],['phone','Mobile number'],['address_line','Address'],['address_extra','Flat / landmark'],['city','City'],['state','State'],['pincode','6-digit pincode'],
          ] as const).map(([key,label]) => <label key={key} className="label-field">{label}<input className="input mt-2" required={key !== 'address_extra'} inputMode={key === 'phone' || key === 'pincode' ? 'numeric' : undefined} maxLength={key === 'pincode' ? 6 : undefined} value={addressDraft[key]} onChange={(event) => setAddressDraft((current) => ({ ...current, [key]: key === 'pincode' ? event.target.value.replace(/\D/g, '').slice(0, 6) : event.target.value }))} /></label>)}
          <button className="btn btn-primary sm:col-span-2">Add address</button>
        </form>
        {profileMessage && <p role="status" className="label mt-4">{profileMessage}</p>}{profileError && <p role="alert" className="mt-4" style={{ color: 'var(--error)' }}>{profileError}</p>}
      </section>

      {/* Sign out */}
      <section className="mt-12 hairline-t pt-8">
        <button
          onClick={() => { signOut(); navigate('/'); }}
          className="text-sm underline"
          style={{ color: 'var(--ink-2)' }}
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
