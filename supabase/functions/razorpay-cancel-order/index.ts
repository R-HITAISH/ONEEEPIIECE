import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type CancelRequest = { order_id: string };
Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Sign in to update this order.' }), { status: 401, headers });
  try {
    const { order_id } = await req.json() as CancelRequest;
    if (!order_id) return new Response(JSON.stringify({ error: 'Order id is required.' }), { status: 400, headers });
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return new Response(JSON.stringify({ error: 'Order service is not configured.' }), { status: 500, headers });
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await admin.auth.getUser(authorization.slice('Bearer '.length));
    if (authError || !authData.user) return new Response(JSON.stringify({ error: 'Your session expired.' }), { status: 401, headers });
    const { data: order, error: orderError } = await admin.from('orders').select('id,status,user_id').eq('id', order_id).eq('user_id', authData.user.id).maybeSingle();
    if (orderError || !order) return new Response(JSON.stringify({ error: 'Order was not found.' }), { status: 404, headers });
    const { data, error } = await admin.rpc('release_checkout_order', { p_order_id: order_id, p_final_status: 'cancelled' });
    if (error) return new Response(JSON.stringify({ error: 'Could not release this order.' }), { status: 409, headers });
    return new Response(JSON.stringify({ cancelled: Boolean(data), status: order.status === 'pending' ? 'cancelled' : order.status }), { status: 200, headers });
  } catch {
    console.error('razorpay-cancel-order failed');
    return new Response(JSON.stringify({ error: 'Could not cancel this payment attempt.' }), { status: 500, headers });
  }
});
