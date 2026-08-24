import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendAdminDomainPurchaseEmail, sendOrderConfirmationEmail } from '@/lib/emails';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { Database } from '@/types/supabase';

async function processOrder(order: Database['public']['Tables']['orders']['Row']) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  try {
    console.log(`Processing order ${order.id}`);

    // 1. Send emails
    try {
      await Promise.all([
        sendAdminDomainPurchaseEmail(order.id, order.company_name, order.domain, order.company_email),
        order.company_email
          ? sendOrderConfirmationEmail(order.company_email, order.company_name, order.domain, order.id)
          : Promise.resolve(),
      ]);
      console.log(`Emails sent for order ${order.id}`);
    } catch (error) {
      console.error(`Failed to send emails for order ${order.id}:`, error);
      
      await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${order.id}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ status: 'failed_email' })
      });
      return;
    }

    // 2. Create commission
    if (order.ref_code) {
      const partnerFetch = await fetch(`${supabaseUrl}/rest/v1/partners?referral_code=eq.${order.ref_code}&select=id,commission_pct`, {
        method: 'GET',
        headers: {
          'content-type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });

      const partners = await partnerFetch.json();
      const partner = partners[0];

      if (!partner) {
        console.warn(`Partner with ref_code "${order.ref_code}" not found for order ${order.id}`);
      } else {
        const orderAmount = order.price! / 100;
        const commissionAmount = orderAmount * partner.commission_pct;

        const commissionInsert = await fetch(`${supabaseUrl}/rest/v1/commissions`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            influencer_id: partner.id,
            order_id: order.id,
            order_amount: orderAmount,
            commission_pct: partner.commission_pct,
            commission_amount: commissionAmount,
            status: 'pending'
          })
        });

        if (!commissionInsert.ok) {
          const errorText = await commissionInsert.text();
          console.error(`Failed to create commission for order ${order.id}:`, errorText);
          
          await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${order.id}`, {
            method: 'PATCH',
            headers: {
              'content-type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ status: 'failed_email' })
          });
          return;
        } else {
          console.log(`Created pending commission for order ${order.id}`);
        }
      }
    }

    // 3. Mark order as processed
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${order.id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ status: 'paid' })
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error(`Failed to update order status for order ${order.id}:`, errorText);
      
      await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${order.id}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ status: 'failed_email' })
      });
      return;
    }

    console.log(`Finished processing order ${order.id}`);
  } catch (error) {
    console.error(`An unexpected error occurred while processing order ${order.id}:`, error);
    
    await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${order.id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ status: 'failed_email' })
    });
  }
}

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

  const fetchQueued = await fetch(`${supabaseUrl}/rest/v1/orders?status=eq.draft&limit=3&select=*`, {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });

  if (!fetchQueued.ok) {
    const errorText = await fetchQueued.text();
    console.error('Failed to fetch queued orders:', errorText);
    return NextResponse.json({ error: 'Failed to fetch queued orders' }, { status: 500 });
  }

  const orders = await fetchQueued.json();

  if (!orders || orders.length === 0) {
    return NextResponse.json({ message: 'No queued orders to process' });
  }

  // Process orders sequentially
  for (const order of orders) {
    await processOrder(order);
  }

  return NextResponse.json({ message: `Processed ${orders.length} orders` });
}
