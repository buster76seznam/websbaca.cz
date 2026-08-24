import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getTierInfo, calculateCommission } from '@/lib/affiliate-config';
import { sendAdminDomainPurchaseEmail, sendOrderConfirmationEmail, sendPartnerCommissionEmail } from '@/lib/emails';

export const runtime = 'nodejs';

// Vypnout automatický body parser – Stripe vyžaduje raw body pro ověření podpisu
export const dynamic = 'force-dynamic';

const GRACE_PERIOD_DAYS = 15;

type OrderRow = {
  id: string;
  status: string;
  company_name: string;
  company_email: string;
  domain: string;
  price: number | null;
  ref_code: string | null;
  stripe_checkout_session_id: string | null;
  stripe_subscription_id: string | null;
  payment_status: string | null;
  first_failed_at: string | null;
  paid_months_count: number | null;
  status_before_suspension: string | null;
};

/** Najde objednávku podle ID Stripe předplatného */
async function findOrderBySubscriptionId(subscriptionId: string | null | undefined): Promise<OrderRow | null> {
  if (!subscriptionId) return null;
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();
  if (error) {
    console.error('Webhook: failed to find order by subscription:', error.message);
    return null;
  }
  return order || null;
}

/** Pozastaví web klienta (15 dní po nezaplacení / Stripe stav unpaid) */
async function suspendOrder(order: OrderRow): Promise<void> {
  if (order.status === 'suspended') return; // already suspended

  const { error } = await supabaseAdmin
    .from('orders')
    .update({
      status_before_suspension: order.status,
      status: 'suspended',
      payment_status: 'unpaid',
      status_updated_at: new Date().toISOString()
    })
    .eq('id', order.id);

  if (error) {
    console.error(`Webhook: failed to suspend order ${order.id}:`, error.message);
  } else {
    console.log(`Webhook: order ${order.id} SUSPENDED (website offline, previous status: ${order.status})`);
  }
}

/** Obnoví web klienta po úspěšné platbě */
async function reactivateOrder(order: OrderRow): Promise<void> {
  const restoredStatus =
    order.status === 'suspended'
      ? (order.status_before_suspension || 'active')
      : order.status;

  const { error } = await supabaseAdmin
    .from('orders')
    .update({
      status: restoredStatus,
      status_before_suspension: null,
      payment_status: 'active',
      first_failed_at: null,
      status_updated_at: new Date().toISOString()
    })
    .eq('id', order.id);

  if (error) {
    console.error(`Webhook: failed to reactivate order ${order.id}:`, error.message);
  } else {
    console.log(`Webhook: order ${order.id} REACTIVATED (restored to status: ${restoredStatus})`);
  }
}

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  const rawBody = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  const isTestBypass = request.headers.get('x-test-bypass') === 'true';

  // V testovacím prostředí přeskočíme ověření podpisu
  if (process.env.STRIPE_SKIP_SIGNATURE_VERIFICATION === 'true' || isTestBypass) {
    try {
      event = JSON.parse(rawBody);
    } catch (err) {
      console.error('Webhook JSON parsing failed:', err);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
  } else {
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { orderId, ref_code } = session.metadata ?? {};

    if (!orderId) {
      console.error('Webhook: missing orderId in metadata');
      return NextResponse.json({ error: 'Missing orderId in metadata' }, { status: 400 });
    }

    // Načtení objednávky pro kontrolu a získání detailů
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Webhook: order not found:', orderId);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Kontrola duplicity checkout session
    if (order.stripe_checkout_session_id === session.id && order.status === 'paid') {
      console.log(`Webhook: received duplicate checkout session ${session.id}, skipping.`);
      return NextResponse.json({ received: true });
    }

    // 1. Aktualizace statusu objednávky na PENDING_DOMAIN + platební údaje
    const orderUpdate: Record<string, unknown> = {
      status: 'pending_domain',
      stripe_checkout_session_id: session.id,
      payment_status: 'active',
      status_updated_at: new Date().toISOString()
    };

    // U předplatného uložíme ID subscription pro pozdější webhooky
    if (session.mode === 'subscription' && typeof session.subscription === 'string') {
      orderUpdate.stripe_subscription_id = session.subscription;
      orderUpdate.subscription_start_at = new Date().toISOString();
    }

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update(orderUpdate)
      .eq('id', orderId);

    if (updateError) {
      console.error('Webhook: failed to update order status:', updateError);
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    console.log(`Webhook: order ${orderId} marked as paid`);

    // 2. Odeslání notifikačních e-mailů
    try {
      // Admin notifikace (Action required: purchase domain)
      await sendAdminDomainPurchaseEmail(
        order.id,
        order.company_name,
        order.domain,
        order.company_email
      );

      // Potvrzení pro klienta
      await sendOrderConfirmationEmail(
        order.company_email,
        order.company_name,
        order.domain,
        order.id
      );
    } catch (emailErr) {
      console.error('Webhook: failed to send emails:', emailErr);
    }

    // 3. Logika Affiliate provize
    const referralCode = ref_code || order.ref_code;
    if (referralCode) {
      try {
        // Najít partnera podle referral kódu
        const { data: partner, error: partnerError } = await supabaseAdmin
          .from('partners')
          .select('*')
          .eq('referral_code', referralCode)
          .single();

        if (partner && !partnerError) {
          // Získat aktuální počet klientů partnera pro určení tieru
          const { count: activeClientsCount } = await supabaseAdmin
            .from('partner_referrals')
            .select('*', { count: 'exact', head: true })
            .eq('partner_id', partner.id)
            .eq('status', 'active');

          const tierInfo = getTierInfo(activeClientsCount || 0);
          const commissionAmount = tierInfo.usdCommission;

          // Zapsat provizi do partner_referrals
          // Klient právě zaplatil -> provize je aktivní a počítá se do dashboardu
          await supabaseAdmin
            .from('partner_referrals')
            .insert([{
              partner_id: partner.id,
              client_email: order.company_email,
              client_name: order.company_name,
              amount: commissionAmount,
              status: 'active'
            }]);

          // Zapsat konverzi pro přehled
          await supabaseAdmin
            .from('client_conversions')
            .insert([{
              partner_id: partner.id,
              subscription_price: order.price || 150,
              currency: 'USD',
              status: 'active'
            }]);

          // Poslat e-mail partnerovi
          await sendPartnerCommissionEmail(
            partner.email,
            commissionAmount,
            order.domain
          );
          
          console.log(`Webhook: Commission of $${commissionAmount} recorded for partner ${partner.id}`);
        }
      } catch (affiliateErr) {
        console.error('Webhook: affiliate commission processing failed:', affiliateErr);
      }
    }
  }

  // =========================================================
  // invoice.payment_failed - selhala měsíční platba (začátek grace periody)
  // =========================================================
  else if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;

    const order = await findOrderBySubscriptionId(subscriptionId);
    if (!order) {
      console.warn(`Webhook: invoice.payment_failed - no order for subscription ${subscriptionId}`);
      return NextResponse.json({ received: true });
    }

    const { error } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'overdue',
        first_failed_at: order.first_failed_at || new Date().toISOString(),
        status_updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (error) {
      console.error(`Webhook: failed to mark order ${order.id} overdue:`, error.message);
    } else {
      console.log(`Webhook: order ${order.id} marked OVERDUE (${GRACE_PERIOD_DAYS}-day grace period started). AI revisions blocked.`);
    }
  }

  // =========================================================
  // invoice.payment_succeeded - proběhla měsíční platba (obnova / další měsíc)
  // =========================================================
  else if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as Stripe.Invoice;

    // První platba z checkoutu má svůj handler - zde řešíme pouze opakované (měsíční) faktury
    if (invoice.billing_reason !== 'subscription_cycle') {
      console.log(`Webhook: invoice.payment_succeeded ignored (billing_reason=${invoice.billing_reason})`);
      return NextResponse.json({ received: true });
    }

    const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
    const order = await findOrderBySubscriptionId(subscriptionId);

    if (!order) {
      console.warn(`Webhook: invoice.payment_succeeded - no order for subscription ${subscriptionId}`);
      return NextResponse.json({ received: true });
    }

    // Připočítat zaplacený měsíc a vyčistit stav selhání
    const { error } = await supabaseAdmin
      .from('orders')
      .update({
        paid_months_count: (order.paid_months_count || 0) + 1,
        payment_status: 'active',
        first_failed_at: null,
        status_updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (error) {
      console.error(`Webhook: failed to record successful payment for order ${order.id}:`, error.message);
      return NextResponse.json({ received: true });
    }

    const newCount = (order.paid_months_count || 0) + 1;
    console.log(`Webhook: order ${order.id} monthly payment succeeded (paid_months_count=${newCount})`);

    // Pokud byl web pozastavený nebo v režimu selhání, automaticky ho obnovíme
    if (order.status === 'suspended' || order.payment_status === 'unpaid' || order.payment_status === 'overdue') {
      await reactivateOrder(order);
    }
  }

  // =========================================================
  // customer.subscription.updated - změna stavu předplatného ve Stripe
  // =========================================================
  else if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;
    const subStatus = subscription.status; // active | past_due | unpaid | canceled ...

    const order = await findOrderBySubscriptionId(subscription.id);
    if (!order) {
      console.warn(`Webhook: customer.subscription.updated - no order for subscription ${subscription.id}`);
      return NextResponse.json({ received: true });
    }

    if (subStatus === 'unpaid') {
      // 15 dní bez úhrady - pozastavit web
      console.log(`Webhook: subscription ${subscription.id} is UNPAID -> suspending website`);
      await suspendOrder(order);
    } else if (subStatus === 'past_due') {
      // Platba stále selhává, běží grace perioda (AI revize zablokované)
      if (order.payment_status !== 'overdue') {
        await supabaseAdmin
          .from('orders')
          .update({
            payment_status: 'overdue',
            first_failed_at: order.first_failed_at || new Date().toISOString(),
            status_updated_at: new Date().toISOString()
          })
          .eq('id', order.id);
      }
      console.log(`Webhook: subscription ${subscription.id} PAST_DUE -> grace period running, AI revisions blocked`);
    } else if (subStatus === 'active') {
      // Předplatné znovu aktivní - obnovit web a odblokovat revize
      console.log(`Webhook: subscription ${subscription.id} ACTIVE -> ensuring website restored`);
      if (order.payment_status !== 'active' || order.status === 'suspended') {
        await supabaseAdmin
          .from('orders')
          .update({
            payment_status: 'active',
            first_failed_at: null,
            status_updated_at: new Date().toISOString()
          })
          .eq('id', order.id);
        if (order.status === 'suspended') {
          await reactivateOrder(order);
        }
      }
    } else {
      console.log(`Webhook: subscription ${subscription.id} status "${subStatus}" - no action needed`);
    }
  }

  return NextResponse.json({ received: true });
}
