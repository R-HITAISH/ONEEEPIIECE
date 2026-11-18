import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type EmailRequest = { order_id: string };
type OrderRow = { id: string; user_id: string; status: string; total_inr: number; tracking_number: string | null };
type OrderItemRow = { item_id: string };
type ItemRow = { id: string; name: string };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Sign in to request order updates.' }), { status: 401, headers });
  let claimed: { orderId: string; type: string } | null = null;
  try {
    const body = await req.json() as EmailRequest;
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('STORE_FROM_EMAIL');
    if (!body.order_id || !url || !key || !resendKey || !from) return new Response(JSON.stringify({ error: 'Order email is not configured.' }), { status: 503, headers });
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await admin.auth.getUser(authorization.slice(7));
    if (authError || !authData.user) return new Response(JSON.stringify({ error: 'Your session expired.' }), { status: 401, headers });
    const { data: order, error: orderError } = await admin.from('orders').select('id,user_id,status,total_inr,tracking_number').eq('id', body.order_id).maybeSingle() as { data: OrderRow | null; error: unknown };
    if (orderError || !order) return new Response(JSON.stringify({ error: 'Order was not found.' }), { status: 404, headers });
    const isOwner = order.user_id === authData.user.id;
    const { data: profile } = await admin.from('profiles').select('role').eq('id', authData.user.id).maybeSingle();
    const isAdmin = profile?.role === 'admin';
    if (!isOwner && !isAdmin) return new Response(JSON.stringify({ error: 'Order was not found.' }), { status: 404, headers });
    const type = order.status === 'shipped' ? 'shipped' : order.status === 'cancelled' ? 'cancelled' : ['paid', 'placed'].includes(order.status) ? 'confirmed' : null;
    if (!type || (type !== 'confirmed' && !isAdmin)) return new Response(JSON.stringify({ error: 'This order has no sendable update.' }), { status: 409, headers });
    const { error: claimError } = await admin.from('order_email_events').insert({ order_id: order.id, event_type: type });
    if (claimError) return new Response(JSON.stringify({ sent: false, duplicate: true }), { status: 200, headers });
    claimed = { orderId: order.id, type };
    const { data: authUser, error: userError } = await admin.auth.admin.getUserById(order.user_id);
    if (userError || !authUser.user?.email) throw new Error('Customer email is unavailable.');
    const { data: orderItems } = await admin.from('order_items').select('item_id').eq('order_id', order.id) as { data: OrderItemRow[] | null };
    const itemIds = (orderItems ?? []).map((entry) => entry.item_id);
    const { data: pieces } = itemIds.length ? await admin.from('items').select('id,name').in('id', itemIds) as { data: ItemRow[] | null } : { data: [] as ItemRow[] };
    const names = (pieces ?? []).map((piece) => `<li>${escapeHtml(piece.name)}</li>`).join('');
    const subject = type === 'shipped' ? `Your ONEPIECE order has shipped` : type === 'cancelled' ? `Your ONEPIECE order was cancelled` : `Your ONEPIECE order is confirmed`;
    const statusText = type === 'shipped' ? `Tracking number: ${escapeHtml(order.tracking_number ?? 'Please contact us for tracking details.')}` : type === 'cancelled' ? 'We have cancelled this order. Any eligible refund will be processed to the original payment method.' : 'Your pieces are being prepared.';
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [authUser.user.email], subject, html: `<div style="font-family:Arial,sans-serif;color:#40352b;max-width:560px;margin:auto"><p style="letter-spacing:.18em;color:#9a7540">ONEPIECE</p><h1 style="font-family:Georgia,serif;font-weight:400">${escapeHtml(subject)}</h1><p>${statusText}</p><p>Order ${escapeHtml(order.id)}</p><ul>${names}</ul><p>Total: ₹${order.total_inr.toLocaleString('en-IN')}</p><p>Found once. Kept forever.</p></div>` }),
    });
    if (!response.ok) throw new Error(`Email provider returned ${response.status}.`);
    claimed = null;
    return new Response(JSON.stringify({ sent: true }), { status: 200, headers });
  } catch {
    if (claimed) {
      const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (url && key) await createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).from('order_email_events').delete().eq('order_id', claimed.orderId).eq('event_type', claimed.type);
    }
    console.error('send-order-email failed');
    return new Response(JSON.stringify({ error: 'Order email could not be sent.' }), { status: 502, headers });
  }
});
