import { createClient } from 'npm:@supabase/supabase-js@2';

type RazorpayEvent = {
  event: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; status?: string } };
  };
};
const headers = { 'Content-Type': 'application/json' };

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
function equalHex(left: string, right: string): boolean {
  if (!/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right) || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  try {
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const signature = req.headers.get('x-razorpay-signature');
    if (!webhookSecret || !url || !serviceKey || !signature) return new Response('Webhook is not configured', { status: 500 });
    const rawBody = await req.text();
    const hmacKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(webhookSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const expected = hex(new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(rawBody))));
    if (!equalHex(expected, signature)) return new Response('Invalid signature', { status: 401 });

    const event = JSON.parse(rawBody) as RazorpayEvent;
    const payment = event.payload?.payment?.entity;
    if (!payment?.order_id || !payment.id) return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200, headers });

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: order, error: lookupError } = await admin.from('orders').select('id,status').eq('razorpay_order_id', payment.order_id).maybeSingle();
    if (lookupError) throw lookupError;
    if (!order) return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200, headers });

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const { error } = await admin.rpc('complete_checkout_order', {
        p_order_id: order.id,
        p_razorpay_order_id: payment.order_id,
        p_razorpay_payment_id: payment.id,
        p_razorpay_signature: null,
      });
      if (error) throw error;
    } else if (event.event === 'payment.failed') {
      const { error } = await admin.rpc('release_checkout_order', { p_order_id: order.id, p_final_status: 'failed' });
      if (error) throw error;
    }
    return new Response(JSON.stringify({ received: true }), { status: 200, headers });
  } catch {
    console.error('razorpay-webhook failed');
    return new Response('Webhook processing failed', { status: 500 });
  }
});
