import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Údržbový cron pro objednávky zaseknuté ve stavu "draft".
 *
 * Pozn.: Provize se NEVYTVÁŘÍ tady - ty spravuje Stripe webhook
 * (/api/webhooks/stripe) až po skutečně potvrzené platbě. Tento cron
 * proto žádné provize nevytváří ani neposílá e-maily, aby nedocházelo
 * ke dvojitému zpracování.
 *
 * Co dělá:
 * - Najde objednávky ve stavu "draft" starší než 24 hodin
 *   (generování náhledu trvá max pár minut -> starší drafty jsou mrtvé)
 * - Označí je jako "expired", aby nezůstávaly viset ve frontě
 */

const STALE_HOURS = 24;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET) {
    console.error('Process-orders cron: CRON_SECRET is not configured in environment variables!');
    return NextResponse.json({ error: 'Server misconfiguration: CRON_SECRET not set' }, { status: 500 });
  }
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000).toISOString();

  // Najdi zaseknuté drafty starší než 24 h
  const fetchQueued = await fetch(
    `${supabaseUrl}/rest/v1/orders?status=eq.draft&created_at=lt.${cutoff}&select=id,company_name,created_at`,
    {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    }
  );

  if (!fetchQueued.ok) {
    const errorText = await fetchQueued.text();
    console.error('Failed to fetch queued orders:', errorText);
    return NextResponse.json({ error: 'Failed to fetch queued orders' }, { status: 500 });
  }

  const staleOrders = await fetchQueued.json();

  if (!staleOrders || staleOrders.length === 0) {
    return NextResponse.json({ message: 'No stale draft orders to clean up' });
  }

  // Označit zastaralé drafty jako expired
  const ids = staleOrders.map((o: { id: string }) => o.id).join(',');
  const updateResponse = await fetch(`${supabaseUrl}/rest/v1/orders?id=in.(${ids})`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ status: 'expired' })
  });

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text();
    console.error('Failed to expire stale draft orders:', errorText);
    return NextResponse.json({ error: 'Failed to expire stale orders' }, { status: 500 });
  }

  console.log(`Expired ${staleOrders.length} stale draft orders`);
  return NextResponse.json({
    message: `Expired ${staleOrders.length} stale draft orders (older than ${STALE_HOURS}h)`
  });
}
