import { useEffect, useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useRouter, Link } from '@/router/Router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatINR } from '@/lib/utils';
import { ArrowLeft, Check, AlertTriangle, Loader2, ChevronDown } from 'lucide-react';

type CheckoutStep = 'address' | 'processing' | 'success' | 'failed';

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

type RazorpayCheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: 'INR';
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; contact: string };
  handler: (response: RazorpayCheckoutResponse) => Promise<void>;
  modal: { ondismiss: () => void };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: 'payment.failed', callback: () => void) => void;
};

type CheckoutOrderResponse = {
  order_id: string;
  razorpay_order_id?: string;
  key_id?: string;
  total_inr: number;
  shipping_cost_inr: number;
  cod_fee_inr: number;
  status: string;
  discount_inr?: number;
};
type AppliedCoupon = { code: string; discount_inr: number };

type FormState = {
  name: string;
  phone: string;
  address: string;
  flat: string;
  city: string;
  state: string;
  pincode: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

export function CheckoutPage() {
  const { cartItems, loading: cartLoading, clearCart, refreshCart } = useCart();
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [step, setStep] = useState<CheckoutStep>('address');
  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    address: '',
    flat: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);

  const subtotal = cartItems.reduce((sum, ci) => sum + ci.item.price_inr, 0);
  const discountedSubtotal = Math.max(0, subtotal - (appliedCoupon?.discount_inr ?? 0));
  const shippingCost = discountedSubtotal >= 1999 ? 0 : 99;
  const codFee = paymentMethod === 'cod' ? 49 : 0;
  const total = discountedSubtotal + shippingCost + codFee;
  const validItems = cartItems.filter((ci) => new Date(ci.lock.expires_at) > new Date());

  useEffect(() => {
    if (!cartLoading && cartItems.length === 0 && step !== 'success') {
      navigate('/bag');
    }
  }, [cartLoading, cartItems.length, navigate, step]);

  const validateField = (name: keyof FormState, value: string): string | undefined => {
    const v = value.trim();
    if (!v) {
      if (name === 'flat') return undefined;
      return 'This field is required.';
    }
    if (name === 'pincode' && !/^\d{6}$/.test(v)) return 'Enter a 6-digit pincode.';
    if (name === 'phone' && !/^[6-9]\d{9}$/.test(v.replace(/\D/g, '').replace(/^91/, ''))) return 'Enter a valid 10-digit Indian mobile number.';
    if (name === 'name' && v.length < 2) return 'Enter your full name.';
  };

  const handleBlur = (name: keyof FormState) => {
    const msg = validateField(name, form[name]);
    setErrors((prev) => ({ ...prev, [name]: msg }));
  };

  const setField = (name: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const applyCoupon = async () => {
    if (!user || !couponCode.trim()) return;
    setCouponBusy(true); setCouponError(null); setAppliedCoupon(null);
    const { data, error: validationError } = await supabase.functions.invoke('validate-coupon', {
      body: { code: couponCode.trim(), item_ids: validItems.map((cartItem) => cartItem.item.id) },
    });
    setCouponBusy(false);
    if (validationError || !data || typeof data.discount_inr !== 'number' || typeof data.code !== 'string') {
      setCouponError(data?.error ?? validationError?.message ?? 'That code could not be applied.');
      return;
    }
    setAppliedCoupon({ code: data.code, discount_inr: data.discount_inr });
    setCouponCode(data.code);
  };

  const isFormValid = () => {
    const fields: (keyof FormState)[] = ['name', 'phone', 'address', 'city', 'state', 'pincode'];
    return fields.every((f) => !validateField(f, form[f]));
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) {
      const fields: (keyof FormState)[] = ['name', 'phone', 'address', 'city', 'state', 'pincode'];
      const newErrors: FormErrors = {};
      fields.forEach((f) => { const msg = validateField(f, form[f]); if (msg) newErrors[f] = msg; });
      setErrors(newErrors);
      return;
    }
    setError(null);
    setStep('processing');

    if (!user) {
      navigate(`/auth?returnTo=${encodeURIComponent('/checkout')}`);
      return;
    }

    try {
      const phone = form.phone.replace(/\D/g, '').replace(/^91/, '');
      const { data: orderData, error: createError } = await supabase.functions.invoke('razorpay-create-order', {
        body: {
          item_ids: validItems.map((cartItem) => cartItem.item.id),
          shipping: { name: form.name, phone, address: form.address, extra: form.flat, city: form.city, state: form.state, pincode: form.pincode, coupon_code: appliedCoupon?.code ?? '' },
          payment_method: paymentMethod,
        },
      });
      if (createError || !orderData) throw new Error(createError?.message ?? 'Could not create a secure order.');
      const order = orderData as CheckoutOrderResponse;
      setOrderId(order.order_id);

      if (paymentMethod === 'cod') {
        await clearCart();
        void supabase.functions.invoke('send-order-email', { body: { order_id: order.order_id } });
        setStep('success');
        navigate(`/order/${order.order_id}`);
        return;
      }
      if (!order.razorpay_order_id || !order.key_id || !window.Razorpay) throw new Error('Payment gateway is unavailable. Please return to your bag.');

      const cancelAttempt = async () => {
        await supabase.functions.invoke('razorpay-cancel-order', { body: { order_id: order.order_id } });
        await refreshCart();
      };
      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.total_inr * 100,
        currency: 'INR',
        name: 'ONEEEPIIECE',
        description: 'One-of-one clothing purchase',
        order_id: order.razorpay_order_id,
        prefill: { name: form.name, contact: phone },
        handler: async (response: RazorpayCheckoutResponse) => {
          const { error: verifyError } = await supabase.functions.invoke('razorpay-verify', {
            body: { order_id: order.order_id, ...response },
          });
          if (verifyError) {
            await cancelAttempt();
            setError('Payment confirmation could not be completed. Return to your bag and check availability.');
            setStep('failed');
            return;
          }
          await clearCart();
          void supabase.functions.invoke('send-order-email', { body: { order_id: order.order_id } });
          setStep('success');
          navigate(`/order/${order.order_id}`);
        },
        modal: { ondismiss: () => { void cancelAttempt(); setError('Payment was cancelled and the reservation released.'); setStep('failed'); } },
      });
      rzp.on('payment.failed', () => {
        void cancelAttempt();
        setError('Payment failed and the reservation was released. Return to your bag to check availability.');
        setStep('failed');
      });
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setStep('failed');
    }
  };

  if (cartLoading) {
    return (
      <div className="page py-12">
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--ink-2)' }} />
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="page text-center" style={{ paddingTop: 'clamp(4rem,8vw,8rem)', paddingBottom: 'clamp(4rem,8vw,8rem)' }}>
        <div className="inline-flex items-center justify-center w-14 h-14 mb-6" style={{ background: 'var(--success)', color: 'var(--paper)' }}>
          <Check size={28} />
        </div>
        <h1 style={{ fontWeight: 400 }} className="mb-3">Thank you. Your piece is yours.</h1>
        {orderId && <p className="label mb-2">Order ref: {orderId.slice(0, 8).toUpperCase()}</p>}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          {orderId && <Link to={`/order/${orderId}`} className="btn btn-secondary">Track your order</Link>}
          <Link to="/account/orders" className="text-link">Orders</Link>
          <Link to="/shop" className="text-link">Shop new pieces</Link>
        </div>
      </div>
    );
  }

  if (step === 'failed') {
    return (
      <div className="page text-center" style={{ paddingTop: 'clamp(4rem,8vw,8rem)', paddingBottom: 'clamp(4rem,8vw,8rem)' }}>
        <div className="inline-flex items-center justify-center w-14 h-14 mb-6" style={{ background: 'var(--error)', color: 'var(--paper)' }}>
          <AlertTriangle size={28} />
        </div>
        <h1 style={{ fontWeight: 400 }} className="mb-3">Payment didn't go through.</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-2)' }}>Your reservation has been released. Return to your bag to check availability.</p>
        {error && <p className="text-sm mb-6" style={{ color: 'var(--error)' }}>{error}</p>}
        <div className="flex gap-4 justify-center"><Link to="/bag" className="btn btn-primary">Back to bag</Link></div>
      </div>
    );
  }

  const inputCls = 'input';

  return (
    <div className="page" style={{ paddingTop: 'clamp(2.5rem,5vw,5rem)', paddingBottom: 'clamp(4rem,8vw,8rem)' }}>
      <Link to="/bag" className="inline-flex items-center gap-2 text-sm mb-8" style={{ color: 'var(--ink-2)' }}>
        <ArrowLeft size={15} />
        Back to bag
      </Link>

      <h1 style={{ fontWeight: 400 }} className="mb-10">Checkout</h1>

      <div className="grid md:grid-cols-[1fr_340px] gap-10 lg:gap-16">
        {/* Shipping form */}
        <form onSubmit={handleCheckout} className="space-y-5">
          <h2 className="font-display text-xl mb-4" style={{ fontWeight: 400 }}>Shipping address</h2>

          <div>
            <label className="label-field" htmlFor="co-name">Full name</label>
            <input
              id="co-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              onBlur={() => handleBlur('name')}
              className={inputCls}
              style={errors.name ? { borderColor: 'var(--error)' } : undefined}
            />
            {errors.name && <p className="mt-1 text-sm" style={{ color: 'var(--error)' }}>{errors.name}</p>}
          </div>

          <div>
            <label className="label-field" htmlFor="co-phone">Phone</label>
            <input
              id="co-phone"
              type="tel"
              required
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              onBlur={() => handleBlur('phone')}
              className={inputCls}
              style={errors.phone ? { borderColor: 'var(--error)' } : undefined}
            />
            {errors.phone && <p className="mt-1 text-sm" style={{ color: 'var(--error)' }}>{errors.phone}</p>}
          </div>

          <div>
            <label className="label-field" htmlFor="co-address">Address line</label>
            <textarea
              id="co-address"
              required
              value={form.address}
              onChange={(e) => setField('address', e.target.value)}
              onBlur={() => handleBlur('address')}
              className={inputCls}
              style={{ minHeight: '80px', ...(errors.address ? { borderColor: 'var(--error)' } : {}) }}
            />
            {errors.address && <p className="mt-1 text-sm" style={{ color: 'var(--error)' }}>{errors.address}</p>}
          </div>

          <div>
            <label className="label-field" htmlFor="co-flat">Flat or apartment <span style={{ color: 'var(--ink-2)', fontWeight: 400 }}>(optional)</span></label>
            <input
              id="co-flat"
              type="text"
              value={form.flat}
              onChange={(e) => setField('flat', e.target.value)}
              onBlur={() => handleBlur('flat')}
              className={inputCls}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label-field" htmlFor="co-city">City</label>
              <input
                id="co-city"
                type="text"
                required
                value={form.city}
                onChange={(e) => setField('city', e.target.value)}
                onBlur={() => handleBlur('city')}
                className={inputCls}
                style={errors.city ? { borderColor: 'var(--error)' } : undefined}
              />
              {errors.city && <p className="mt-1 text-sm" style={{ color: 'var(--error)' }}>{errors.city}</p>}
            </div>
            <div>
              <label className="label-field" htmlFor="co-state">State</label>
              <input
                id="co-state"
                type="text"
                required
                value={form.state}
                onChange={(e) => setField('state', e.target.value)}
                onBlur={() => handleBlur('state')}
                className={inputCls}
                style={errors.state ? { borderColor: 'var(--error)' } : undefined}
              />
              {errors.state && <p className="mt-1 text-sm" style={{ color: 'var(--error)' }}>{errors.state}</p>}
            </div>
          </div>

          <div>
            <label className="label-field" htmlFor="co-pin">Pincode</label>
            <input
              id="co-pin"
              type="text"
              required
              inputMode="numeric"
              maxLength={6}
              value={form.pincode}
              onChange={(e) => setField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
              onBlur={() => handleBlur('pincode')}
              className={inputCls}
              style={errors.pincode ? { borderColor: 'var(--error)' } : undefined}
            />
            {errors.pincode && <p className="mt-1 text-sm" style={{ color: 'var(--error)' }}>{errors.pincode}</p>}
          </div>

          <fieldset className="space-y-3 border-t pt-5" style={{ borderColor: 'var(--hairline)' }}>
            <legend className="label-ink mb-3">Payment method</legend>
            <label className="flex items-start gap-3 p-4 border cursor-pointer" style={{ borderColor: paymentMethod === 'razorpay' ? 'var(--brass)' : 'var(--hairline)' }}>
              <input type="radio" name="payment-method" value="razorpay" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} />
              <span><strong className="block text-sm">Pay online</strong><span className="label">UPI, cards and netbanking via Razorpay</span></span>
            </label>
            <label className="flex items-start gap-3 p-4 border cursor-pointer" style={{ borderColor: paymentMethod === 'cod' ? 'var(--brass)' : 'var(--hairline)' }}>
              <input type="radio" name="payment-method" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
              <span><strong className="block text-sm">Cash on delivery</strong><span className="label">Includes a ₹49 COD handling fee</span></span>
            </label>
          </fieldset>

          {error && (
            <div className="flex items-start gap-2 p-3 text-sm" style={{ color: 'var(--error)' }}>
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={step === 'processing' || validItems.length === 0}
            className="btn btn-primary w-full"
          >
            {step === 'processing' ? (
              <><Loader2 size={15} className="animate-spin" /> Processing</>
            ) : (
              <span className="price">{paymentMethod === 'cod' ? 'Place COD order' : 'Pay'} {formatINR(total)}</span>
            )}
          </button>

          {validItems.length === 0 && (
            <p className="text-sm text-center" style={{ color: 'var(--error)' }}>
              All items in your bag have expired. Go back and add items again.
            </p>
          )}
        </form>

        {/* Order summary */}
        <div className="md:sticky md:top-24 md:self-start">
          {/* Mobile: collapsible */}
          <button
            className="md:hidden flex items-center justify-between w-full py-4 hairline-t hairline-b"
            onClick={() => setSummaryOpen(!summaryOpen)}
          >
            <span className="label-ink">Order summary</span>
            <span className="flex items-center gap-2">
              <span className="price text-sm">{formatINR(total)}</span>
              <ChevronDown size={16} style={{ transform: summaryOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms var(--ease-out)' }} />
            </span>
          </button>

          <div className={`hidden md:block ${summaryOpen ? 'block' : 'hidden'}`}>
            <div className="hairline-t hairline-b py-6">
              <p className="label mb-4">Order summary</p>
              <div className="space-y-3">
                {validItems.map((ci) => (
                  <div key={ci.lock.id} className="flex items-start gap-3">
                    <div className="w-12 h-16 product-media shrink-0 overflow-hidden">
                      <img src={ci.item.photos[0] ?? ''} alt={ci.item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate text-ink">{ci.item.name}</p>
                      <p className="label mt-0.5">Size {ci.item.size}</p>
                    </div>
                    <span className="price text-sm text-ink">{formatINR(ci.item.price_inr)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <label className="label-field" htmlFor="checkout-coupon">Coupon code</label>
                <div className="flex gap-2 mt-2"><input id="checkout-coupon" className="input" value={couponCode} onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setAppliedCoupon(null); setCouponError(null); }} placeholder="Enter code" autoComplete="off" /><button type="button" onClick={() => void applyCoupon()} disabled={couponBusy || !couponCode.trim()} className="btn btn-secondary min-h-11 px-4">{couponBusy ? 'Checking…' : appliedCoupon ? 'Applied' : 'Apply'}</button></div>
                {appliedCoupon && <p className="label mt-2" role="status">{appliedCoupon.code} applied · save {formatINR(appliedCoupon.discount_inr)}</p>}
                {couponError && <p className="text-sm mt-2" style={{ color: 'var(--error)' }} role="alert">{couponError}</p>}
              </div>
              <div className="space-y-2 pt-4 mt-4 hairline-t">
                <div className="flex justify-between"><span className="label">Subtotal</span><span className="price">{formatINR(subtotal)}</span></div>
                {appliedCoupon && <div className="flex justify-between"><span className="label">Coupon · {appliedCoupon.code}</span><span className="price">−{formatINR(appliedCoupon.discount_inr)}</span></div>}
                <div className="flex justify-between"><span className="label">Standard shipping</span><span className="price">{shippingCost === 0 ? 'Free' : formatINR(shippingCost)}</span></div>
                {codFee > 0 && <div className="flex justify-between"><span className="label">COD fee</span><span className="price">{formatINR(codFee)}</span></div>}
                <div className="flex items-center justify-between pt-3 hairline-t"><span className="label-ink">Total</span><span className="price font-display text-lg" style={{ fontWeight: 400 }}>{formatINR(total)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
