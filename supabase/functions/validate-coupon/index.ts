import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type CouponRequest = { code: string; item_ids: string[] };

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Sign in to use a coupon.' }), { status: 401, headers });
  try {
    const body = await req.json() as CouponRequest;
    if (typeof body.code !== 'string' || !Array.isArray(body.item_ids) || body.item_ids.length < 1 || body.item_ids.length > 10) {
      return new Response(JSON.stringify({ error: 'Enter a valid coupon and bag.' }), { status: 400, headers });
    }
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return new Response(JSON.stringify({ error: 'Coupon service is not configured.' }), { status: 500, headers });
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await admin.auth.getUser(authorization.slice(7));
    if (authError || !authData.user) return new Response(JSON.stringify({ error: 'Your session expired.' }), { status: 401, headers });
    const { data: rows, error: itemsError } = await admin.from('items').select('id,price_inr').in('id', body.item_ids).eq('status', 'locked');
    if (itemsError || !rows || rows.length !== new Set(body.item_ids).size) return new Response(JSON.stringify({ error: 'Your bag changed. Refresh and try again.' }), { status: 409, headers });
    const { data: locks, error: locksError } = await admin.from('cart_locks').select('item_id').in('item_id', body.item_ids).eq('user_id', authData.user.id).eq('status', 'active').gt('expires_at', new Date().toISOString());
    if (locksError || !locks || locks.length !== body.item_ids.length) return new Response(JSON.stringify({ error: 'Your reservation expired. Return to your bag.' }), { status: 409, headers });
    const subtotal = rows.reduce((sum, row) => sum + row.price_inr, 0);
    const { data, error } = await admin.rpc('validate_checkout_coupon', { p_code: body.code, p_subtotal: subtotal });
    if (error || !data) return new Response(JSON.stringify({ error: 'Coupon could not be validated.' }), { status: 400, headers });
    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch {
    console.error('validate-coupon failed');
    return new Response(JSON.stringify({ error: 'Coupon could not be validated.' }), { status: 500, headers });
  }
});
