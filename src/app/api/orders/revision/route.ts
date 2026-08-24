import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendRevisionCompleteEmail } from '@/lib/emails';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export async function POST(request: NextRequest) {
  try {
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 });
    }

    const { orderId, prompt: feedback } = await request.json();

    if (!orderId || !feedback) {
      return NextResponse.json({ error: 'orderId and prompt are required' }, { status: 400 });
    }

    // Fetch order from Supabase using supabaseAdmin
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      console.error('Error fetching order:', fetchError);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.revision_count >= 3) {
      return NextResponse.json({ error: 'Maximální počet revizí byl vyčerpán.' }, { status: 400 });
    }

    // Blokace AI revizí při nezaplaceném předplatném
    const billingBlocked =
      order.payment_status === 'overdue' ||
      order.payment_status === 'unpaid' ||
      order.status === 'suspended';

    if (billingBlocked) {
      return NextResponse.json(
        {
          error: 'Your subscription payment is unpaid. New AI revisions are blocked until the payment is completed. Please update your payment method to restore access.',
          payment_status: order.payment_status || 'unpaid'
        },
        { status: 402 }
      );
    }

    // Update feedback history
    const history = Array.isArray(order.feedback_history) ? order.feedback_history : [];
    const newHistory = [...history, { date: new Date().toISOString(), feedback }];

    // Build revision prompt
    const currentJson = JSON.stringify(order.generated_site_json, null, 2);
    const systemPrompt = `You are a web designer expert. You will receive a website content JSON and a user feedback. Your task is to update the JSON based on the feedback. Respond strictly with raw JSON. Do NOT wrap the JSON in markdown code blocks like \`\`\`json. 
CRITICAL: System MUST generate ALL JSON content strictly in the language specified in the order.
If order.language is 'en', all text MUST be 100% in English.
If order.language is 'cs', all text MUST be 100% in Czech.
Never fallback to Czech unless language is explicitly 'cs'. Do NOT use emoji. Do NOT use Czech characters š, č, and ř (use s, c, r instead) ONLY IF it is necessary for headers (but preferably use standard UTF-8 if the client supports it, however here we follow the previous constraint for safety).`;
    
    const userPrompt = `
Update the JSON to reflect the user's feedback while maintaining the structure. Output the full updated JSON.
CRITICAL: All generated content MUST be strictly in ${order.language === 'en' ? 'English' : 'Czech'}.
Current Website JSON:
${currentJson}

User Feedback for Changes:
"${(feedback || '').normalize('NFC')}"

Business Context:
Company: ${(order.company_name || '').normalize('NFC')}
Industry: ${(order.industry || '').normalize('NFC')}
Description: ${(order.description || '').normalize('NFC')}

Update the JSON to reflect the user's feedback while maintaining the structure. Output the full updated JSON.
Structure must be exactly:
{
  "hero": { "title": "...", "subtitle": "...", "ctaText": "..." },
  "about": { "title": "...", "text": "..." },
  "services": [ { "title": "...", "description": "..." } ],
  "contact": { "address": "...", "phone": "...", "hours": "..." },
  "theme": { "primaryColor": "#...", "secondaryColor": "#..." }
}`;

    // Call Anthropic Claude API
    console.log("🤖 CLAUDE MODEL SENT: claude-sonnet-4-5-20250929");
    let anthropicResponse;
    try {
      const cleanHeaders = new Headers();
      cleanHeaders.set('content-type', 'application/json');
      cleanHeaders.set('x-api-key', (ANTHROPIC_API_KEY || '').trim());
      cleanHeaders.set('anthropic-version', '2023-06-01');

      anthropicResponse = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: cleanHeaders,
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userPrompt,
            },
          ],
        }),
      });
    } catch (claudeErr: any) {
      console.error("❌ ANTHROPIC API ERROR:", claudeErr?.message);
      return NextResponse.json(
        { error: 'Claude API call failed', details: claudeErr?.message },
        { status: 502 }
      );
    }

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error('Anthropic API error:', errorText);
      return NextResponse.json({ error: 'AI processing failed' }, { status: 502 });
    }

    const anthropicData = await anthropicResponse.json();
    const rawContent = anthropicData?.content?.[0]?.text;

    if (!rawContent) {
      return NextResponse.json({ error: 'No content returned from Claude' }, { status: 502 });
    }

    // Parse JSON
    let updatedJson;
    try {
      const cleanedJsonText = rawContent
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
      updatedJson = JSON.parse(cleanedJsonText);
    } catch (parseError) {
      console.error('Failed to parse Claude JSON response:', rawContent);
      return NextResponse.json({ error: 'Invalid JSON returned by AI' }, { status: 502 });
    }

    // Save updated JSON and increment revision count using supabaseAdmin
    // Dynamically handle feedback_history if it doesn't exist in DB
    const updateData: any = {
      generated_site_json: updatedJson,
      status: 'preview_ready',
      revision_count: (order.revision_count || 0) + 1,
    };

    // Only add feedback_history if it exists in the order object (which means it's in the DB)
    if ('feedback_history' in order) {
      updateData.feedback_history = newHistory;
    }

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (updateError || !updatedOrder) {
      console.error('Error updating order after revision:', updateError);
      // Fallback for cases where column might still be missing despite 'in' check
      if (updateError?.message?.includes('feedback_history')) {
        delete updateData.feedback_history;
        const { data: retryOrder, error: retryError } = await supabaseAdmin
          .from('orders')
          .update(updateData)
          .eq('id', orderId)
          .select()
          .single();
        
        if (retryError || !retryOrder) {
          return NextResponse.json({ error: 'Failed to update order on retry', details: retryError }, { status: 500 });
        }
        return NextResponse.json({
          success: true,
          generated_site_json: updatedJson,
          revision_count: retryOrder.revision_count,
          revisions_remaining: 3 - retryOrder.revision_count,
          warning: 'feedback_history column missing in DB'
        });
      }
      return NextResponse.json({ error: 'Failed to update order', details: updateError }, { status: 500 });
    }

    // Trigger instant live update (revalidate preview page)
    try {
      revalidatePath(`/preview/${orderId}`);
      revalidatePath(`/preview/${orderId}/page`);
    } catch (revalidateErr) {
      console.error('Revalidation error:', revalidateErr);
    }

    // Send revision complete email
    if (order.company_email) {
      const previewUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL}/preview/${orderId}`;
      sendRevisionCompleteEmail(order.company_email, previewUrl, orderId).catch((err) =>
        console.error('Failed to send revision complete email:', err)
      );
    }

    return NextResponse.json({
      success: true,
      generated_site_json: updatedJson,
      revision_count: updatedOrder.revision_count,
      revisions_remaining: 3 - updatedOrder.revision_count
    });

  } catch (error) {
    console.error('Server error in /api/orders/revision:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
