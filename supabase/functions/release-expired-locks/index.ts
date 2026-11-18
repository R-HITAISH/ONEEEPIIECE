import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (payload: Record<string, unknown>, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

function logFailure(error: unknown) {
  let detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  detail = detail.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .slice(0, 500);
  for (const secret of [Deno.env.get('CRON_SECRET'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')]) {
    if (secret) detail = detail.replaceAll(secret, '[redacted]');
  }
  console.error('release-expired-locks failed', detail);
}

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get('CRON_SECRET');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const cronHeader = req.headers.get('x-cron-secret');
  const bearer = req.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const authorized = Boolean((cronSecret && cronHeader === cronSecret) || (serviceRoleKey && bearer === serviceRoleKey));
  if (!authorized) return json({ error: 'Unauthorized' }, 401);

  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Internal error' }, 500);
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find all active locks that have expired.
    const { data: expiredLocks, error: findErr } = await supabase
      .from('cart_locks')
      .select('id, item_id')
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString());

    if (findErr) {
      logFailure(findErr);
      return json({ error: 'Internal error' }, 500);
    }

    if (!expiredLocks || expiredLocks.length === 0) return json({ released: 0 });

    const lockIds = expiredLocks.map((lock) => lock.id);
    const itemIds = [...new Set(expiredLocks.map((lock) => lock.item_id))];

    // Expired payment attempts must fail as one unit so their reserved items and stock are released together.
    const { data: pendingItems, error: pendingErr } = await supabase
      .from('order_items')
      .select('order_id, orders!inner(status)')
      .in('item_id', itemIds)
      .eq('orders.status', 'pending');
    if (pendingErr) {
      logFailure(pendingErr);
      return json({ error: 'Internal error' }, 500);
    }
    const pendingOrderIds = [...new Set((pendingItems ?? []).map((row) => row.order_id))];
    for (const orderId of pendingOrderIds) {
      const { error: releaseError } = await supabase.rpc('release_checkout_order', {
        p_order_id: orderId,
        p_final_status: 'failed',
      });
      if (releaseError) {
        logFailure(releaseError);
        return json({ error: 'Internal error' }, 500);
      }
    }

    // The existing trigger restores item availability when locks expire.
    const { error: updateErr } = await supabase
      .from('cart_locks')
      .update({ status: 'expired' })
      .in('id', lockIds);

    if (updateErr) {
      logFailure(updateErr);
      return json({ error: 'Internal error' }, 500);
    }

    return json({ released: lockIds.length, item_ids: itemIds });
  } catch (error) {
    logFailure(error);
    return json({ error: 'Internal error' }, 500);
  }
});
