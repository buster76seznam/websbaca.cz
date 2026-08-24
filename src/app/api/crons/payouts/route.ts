import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

type ActiveReferral = {
  id: string;
  partner_id: string;
  client_email: string;
  client_name: string | null;
  amount: number;
  status: string;
  created_at: string;
  paid_at?: string | null;
};

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  global: {
    fetch: (url, options) => {
      const headers = new Headers();
      if (options?.headers) {
        const incomingHeaders = options.headers instanceof Headers 
          ? Object.fromEntries(options.headers.entries())
          : options.headers as Record<string, string>;

        const allowedHeaders = ['apikey', 'authorization', 'content-type', 'prefer', 'accept'];

        Object.entries(incomingHeaders).forEach(([key, value]) => {
          const lowerKey = key.toLowerCase();
          if (allowedHeaders.includes(lowerKey)) {
            const safeValue = String(value).replace(/[^\x00-\x7F]/g, '');
            headers.set(lowerKey, safeValue);
          }
        });
      }
      return fetch(url, { ...options, headers });
    }
  }
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-07-29.dahlia',
});

/**
 * Ověří, že klient může dostat provizi:
 * 1. V DB má platba za daný měsíc stav paid/active (neprobíhá grace perioda)
 * 2. Klient úspěšně prošel grace periodou (není overdue ani unpaid)
 * 3. Stripe potvrzuje, že checkout session je complete & paid
 */
async function verifyStripePayment(orderId: string): Promise<boolean> {
  const { data: order, error } = await supabase
    .from('orders')
    .select('stripe_checkout_session_id, status, payment_status, first_failed_at')
    .eq('id', orderId)
    .single();

  if (error || !order) {
    console.warn(`Payout verify: order ${orderId} not found`);
    return false;
  }

  // Objednávka musí být ve stavu po úspěšné platbě
  const paidStatuses = ['pending_domain', 'active', 'completed'];
  if (!paidStatuses.includes(order.status || '')) {
    console.warn(`Payout verify: order ${orderId} has status "${order.status}" - not paid`);
    return false;
  }

  // Platba za daný měsíc musí mít stav "paid" (active) - klient prošel grace periodou.
  // Provize se nevyplácí klientům v grace periodě (overdue) nebo s pozastaveným webem (unpaid).
  const payStatus = order.payment_status;
  if (payStatus === 'overdue' || payStatus === 'unpaid') {
    console.warn(`Payout verify: order ${orderId} has payment_status "${payStatus}" - commission skipped until payment is restored`);
    return false;
  }

  // Dvojitá kontrola přímo u Stripe API
  if (!order.stripe_checkout_session_id) {
    console.warn(`Payout verify: order ${orderId} has no checkout session id`);
    return false;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);
    if (session.payment_status !== 'paid' || session.status !== 'complete') {
      console.warn(`Payout verify: Stripe says session ${order.stripe_checkout_session_id} is not paid (payment_status=${session.payment_status}, status=${session.status})`);
      return false;
    }
    return true;
  } catch (stripeErr) {
    console.error(`Payout verify: failed to retrieve session for order ${orderId}:`, stripeErr);
    return false;
  }
}

/**
 * Vrátí true pokud provize ještě nebyla v tomto měsíci vyplacena.
 * Umožňuje opakované měsíční výplaty dokud je klient aktivní.
 */
function isDueForMonthlyPayout(referral: ActiveReferral): boolean {
  if (!referral.paid_at) return true;
  const paidDate = new Date(referral.paid_at);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return paidDate < monthStart;
}

export async function GET(req: NextRequest) {
  try {
    // Ochrana cron endpointu - vyžaduje Authorization: Bearer CRON_SECRET
    const authHeader = req.headers.get('authorization');
    if (!process.env.CRON_SECRET) {
      console.error('Payouts cron: CRON_SECRET is not configured in environment variables!');
      return NextResponse.json({ error: 'Server misconfiguration: CRON_SECRET not set' }, { status: 500 });
    }
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // 1. Vyhledej všechny AKTIVNÍ provize (klienti, kteří platí)
    const fetchResponse = await fetch(`${supabaseUrl}/rest/v1/partner_referrals?status=eq.active&select=*`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Accept': 'application/json'
      }
    });

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      console.error('Error fetching active referrals (direct fetch):', errorText);
      return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 });
    }

    const allReferrals: ActiveReferral[] = await fetchResponse.json();

    // 2. Filtrovat jen ty, které jsou tentokrát na řadě (ještě nevyplaceny tento měsíc)
    const dueReferrals = (allReferrals || []).filter(isDueForMonthlyPayout);

    if (dueReferrals.length === 0) {
      return NextResponse.json({ message: 'No commissions due for payout this month.' });
    }

    // 3. Pro každou provizi ověř, že klient skutečně zaplatil na Stripe,
    //    a teprve poté ji schval pro výplatu
    const verifiedByInfluencer: Record<string, ActiveReferral[]> = {};
    let skippedCount = 0;

    for (const referral of dueReferrals) {
      // Najdi odpovídající objednávku (podle ref kódu partnera + e-mailu klienta)
      const { data: partner } = await supabase
        .from('partners')
        .select('id, referral_code')
        .eq('id', referral.partner_id)
        .single();

      if (!partner) {
        console.warn(`Payout: partner ${referral.partner_id} not found for referral ${referral.id}`);
        skippedCount++;
        continue;
      }

      const { data: order } = await supabase
        .from('orders')
        .select('id')
        .eq('ref_code', partner.referral_code)
        .eq('company_email', referral.client_email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!order) {
        console.warn(`Payout: no matching order found for referral ${referral.id} (${referral.client_email})`);
        skippedCount++;
        continue;
      }

      // Klíčová kontrola: klient musí mít potvrzenou platbu na Stripe
      const isPaid = await verifyStripePayment(order.id);
      if (!isPaid) {
        console.warn(`Payout: Stripe payment NOT verified for referral ${referral.id}, skipping.`);
        skippedCount++;
        continue;
      }

      if (!verifiedByInfluencer[referral.partner_id]) {
        verifiedByInfluencer[referral.partner_id] = [];
      }
      verifiedByInfluencer[referral.partner_id].push(referral);
    }

    // 4. Projdi každého influencera s ověřenými provizmi a proveď výplatu
    for (const influencerId in verifiedByInfluencer) {
      const referrals = verifiedByInfluencer[influencerId];

      const partnerFetchResponse = await fetch(`${supabaseUrl}/rest/v1/partners?id=eq.${influencerId}&select=stripe_connect_account_id,status`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Accept': 'application/json'
        }
      });

      if (!partnerFetchResponse.ok) {
        console.warn(`Failed to fetch partner info for ${influencerId}`);
        continue;
      }

      const partners = await partnerFetchResponse.json();
      const influencer = partners[0];

      if (!influencer || !influencer.stripe_connect_account_id || influencer.status !== 'active') {
        console.warn(`Skipping payout for influencer ${influencerId}: No active Stripe account or influencer is not active.`);
        continue;
      }

      try {
        const totalPayout = referrals.reduce((sum, r) => sum + Number(r.amount), 0);

        if (totalPayout <= 0) {
          console.log(`Skipping payout for influencer ${influencerId}: No amount to pay out.`);
          continue;
        }

        // 5. Proveď převod přes Stripe
        const transfer = await stripe.transfers.create({
          amount: Math.round(totalPayout * 100), // v centech
          currency: 'usd',
          destination: influencer.stripe_connect_account_id,
          description: `Affiliate payout for ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        });

        // 6. Označ datum výplaty (status zůstává 'active' -> příští měsíc se vyplatí znovu)
        const referralIds = referrals.map(r => r.id);
        let updateResponse = await fetch(`${supabaseUrl}/rest/v1/partner_referrals?id=in.(${referralIds.join(',')})`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            paid_at: new Date().toISOString(),
            stripe_transfer_id: transfer.id,
          })
        });

        // Fallback: pokud sloupce paid_at/stripe_transfer_id ještě neexistují
        // (migrace 016 nebyla spuštěna), nelze označit datum výplaty
        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.warn(`Payout patch with full fields failed (${errorText}). Run migration 016 to enable monthly payout tracking!`);
        } else {
          console.log(`Successfully paid $${totalPayout} to influencer ${influencerId}.`);
        }

      } catch (payoutError) {
        console.error(`Payout failed for influencer ${influencerId}:`, payoutError);
      }
    }

    return NextResponse.json({
      message: 'Payout process completed.',
      totalActive: allReferrals.length,
      dueThisMonth: dueReferrals.length,
      processed: dueReferrals.length - skippedCount,
      skippedUnverified: skippedCount
    });

  } catch (error) {
    console.error('Cron job for payouts failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}