import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type ShippingAddress = {
  name: string;
  phone: string;
  address: string;
  extra?: string;
  city: string;
  state: string;
  pincode: string;
};
type CreateOrderRequest = { item_ids: string[]; shipping: ShippingAddress; payment_method: 'razorpay' | 'cod' };
type CheckoutOrder = { order_id: string; subtotal_inr: number; shipping_cost_inr: number; cod_fee_inr: number; total_inr: number; status: string };
type RazorpayOrderResponse = { id: string; error?: { description?: string } };

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req);
  const respond = (payload: Record<string, unknown>, status = 200) => new Response(JSON.stringify(payload), { status, headers });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return respond({ error: 'Sign in before checkout.' }, 401);

  try {
    const request = await req.json() as CreateOrderRequest;
    if (!Array.isArray(request.item_ids) || request.item_ids.length < 1 || request.item_ids.length > 10
      || request.item_ids.some((id) => typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id))
      || !request.shipping || !['razorpay', 'cod'].includes(request.payment_method)) {
      return respond({ error: 'Invalid checkout request.' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) return respond({ error: 'Checkout service is not configured.' }, 500);
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const token = authorization.slice('Bearer '.length);
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return respond({ error: 'Your session expired. Please sign in again.' }, 401);

    const normalizedShipping: ShippingAddress = {
      ...request.shipping,
      phone: request.shipping.phone.replace(/\D/g, '').replace(/^91/, ''),
      pincode: request.shipping.pincode.replace(/\D/g, ''),
    };

    const { data: orderData, error: orderError } = await admin.rpc('create_checkout_order', {
      p_user_id: authData.user.id,
      p_item_ids: request.item_ids,
      p_shipping: normalizedShipping,
      p_payment_method: request.payment_method,
    });
    if (orderError || !orderData) return respond({ error: 'Could not reserve these pieces.' }, 409);
    const order = orderData as CheckoutOrder;

    if (request.payment_method === 'cod') {
      return respond({ order_id: order.order_id, total_inr: order.total_inr, shipping_cost_inr: order.shipping_cost_inr, cod_fee_inr: order.cod_fee_inr, status: 'placed' });
    }

    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) {
      await admin.rpc('release_checkout_order', { p_order_id: order.order_id, p_final_status: 'failed' });
      return respond({ error: 'Payment service is not configured.' }, 500);
    }

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}` },
      body: JSON.stringify({ amount: order.total_inr * 100, currency: 'INR', receipt: order.order_id, notes: { onepiece_order_id: order.order_id } }),
    });
    const razorpayOrder = await razorpayResponse.json() as RazorpayOrderResponse;
    if (!razorpayResponse.ok || !razorpayOrder.id) {
      await admin.rpc('release_checkout_order', { p_order_id: order.order_id, p_final_status: 'failed' });
      return respond({ error: 'Could not start payment. Please try again.' }, 502);
    }

    const { error: saveError } = await admin.from('orders').update({ razorpay_order_id: razorpayOrder.id, updated_at: new Date().toISOString() }).eq('id', order.order_id);
    if (saveError) {
      await admin.rpc('release_checkout_order', { p_order_id: order.order_id, p_final_status: 'failed' });
      return respond({ error: 'Could not save the payment session.' }, 500);
    }
    return respond({ order_id: order.order_id, razorpay_order_id: razorpayOrder.id, key_id: keyId, total_inr: order.total_inr, shipping_cost_inr: order.shipping_cost_inr, cod_fee_inr: 0, status: 'pending' });
  } catch {
    console.error('razorpay-create-order failed');
    return respond({ error: 'Could not start checkout.' }, 500);
  }
});
