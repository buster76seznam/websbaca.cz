import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

/**
 * Žádost o zrušení předplatného (Terms sekce 3.3):
 * - Měsíce 1-10: zamítnuto - povinná 10měsíční vazba
 * - Od 11. měsíce: oficiální žádost s 30denní výpovědní lhůtou
 *
 * Body: { orderId: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, company_name, company_email, stripe_subscription_id, paid_months_count, subscription_start_at')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Počet zaplacených měsíců; fallback: odhad z data začátku předplatného
    let paidMonths = order.paid_months_count || 0;
    if (paidMonths === 0 && order.subscription_start_at) {
      const start = new Date(order.subscription_start_at);
      const monthsElapsed = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
      paidMonths = Math.max(paidMonths, monthsElapsed);
    }

    // Měsíce 1-10: povinná 10měsíční vazba - žádost zamítnuta
    if (paidMonths < 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'Early termination is not permitted during the mandatory 10-month initial term. Please contact support at webs.baca.support@gmail.com.',
          paid_months_count: paidMonths,
          months_remaining: 10 - paidMonths
        },
        { status: 403 }
      );
    }

    // Od 11. měsíce: oficiální žádost s 30denní výpovědní lhůtou (Terms 3.3)
    const effectiveDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const { error: insertError } = await supabaseAdmin
      .from('cancellation_requests')
      .insert([{
        order_id: orderId,
        effective_date: effectiveDate.toISOString(),
        status: 'pending'
      }]);

    if (insertError) {
      console.error('Failed to create cancellation request:', insertError);
      return NextResponse.json({ error: 'Failed to submit cancellation request' }, { status: 500 });
    }

    // Best effort: naplánovat zrušení ve Stripe na konec fakturačního období
    if (order.stripe_subscription_id) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-07-29.dahlia' });
        await stripe.subscriptions.update(order.stripe_subscription_id, {
          cancel_at_period_end: true
        });
        console.log(`Stripe subscription ${order.stripe_subscription_id} scheduled to cancel at period end`);
      } catch (stripeErr) {
        console.error('Failed to schedule Stripe cancellation:', stripeErr);
        // Nenarušujeme žádost - administrátor může ručně dokončit v Stripe dashboardu
      }
    }

    return NextResponse.json({
      success: true,
      message: `Your cancellation request has been submitted. Per section 3.3 of our Terms of Service, a 30-day notice period applies. Your service will remain active until ${effectiveDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`,
      paid_months_count: paidMonths,
      effective_date: effectiveDate.toISOString()
    });

  } catch (error) {
    console.error('Cancellation request error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
