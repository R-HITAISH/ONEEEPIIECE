import { createClient } from 'npm:@supabase/supabase-js@2';

type VerifyRequest = { order_id: string; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('SITE_URL') ?? '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Content-Type': 'application/json',
};
const respond = (payload: Record<string, unknown>, status = 200) => new Response(JSON.stringify(payload), { status, headers: corsHeaders });

function equalHex(left: string, right: string): boolean {
  if (!/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right) || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return respond({ error: 'Sign in to confirm this payment.' }, 401);

  try {
    const body = await req.json() as VerifyRequest;
    if (!body.order_id || !body.razorpay_order_id || !body.razorpay_payment_id || !body.razorpay_signature) {
      return respond({ error: 'Payment response is incomplete.' }, 400);
    }
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!url || !serviceKey || !keySecret) return respond({ error: 'Payment verification is not configured.' }, 500);
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await admin.auth.getUser(authorization.slice('Bearer '.length));
    if (authError || !authData.user) return respond({ error: 'Your session expired. Please sign in again.' }, 401);

    const { data: order, error: orderError } = await admin.from('orders')
      .select('id,user_id,status,payment_method,razorpay_order_id,razorpay_payment_id')
      .eq('id', body.order_id).eq('user_id', authData.user.id).maybeSingle();
    if (orderError || !order) return respond({ error: 'Order was not found for this account.' }, 404);
    if (order.status === 'paid' && order.razorpay_payment_id === body.razorpay_payment_id) {
      return respond({ verified: true, order_id: order.id, status: 'paid' });
    }
    if (order.status !== 'pending' || order.payment_method !== 'razorpay' || order.razorpay_order_id !== body.razorpay_order_id) {
      return respond({ error: 'This payment does not match the current order.' }, 409);
    }

    const hmacKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(keySecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(`${body.razorpay_order_id}|${body.razorpay_payment_id}`));
    const expectedSignature = Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
    if (!equalHex(expectedSignature, body.razorpay_signature)) return respond({ error: 'Payment verification failed.' }, 400);

    const { data: completed, error: completeError } = await admin.rpc('complete_checkout_order', {
      p_order_id: body.order_id,
      p_razorpay_order_id: body.razorpay_order_id,
      p_razorpay_payment_id: body.razorpay_payment_id,
      p_razorpay_signature: body.razorpay_signature,
    });
    if (completeError || !completed) return respond({ error: completeError?.message ?? 'Could not complete the order.' }, 409);
    return respond({ verified: true, order_id: body.order_id, status: 'paid' });
  } catch (error) {
    console.error('razorpay-verify failed', error);
    return respond({ error: 'Payment verification failed.' }, 500);
  }
});
