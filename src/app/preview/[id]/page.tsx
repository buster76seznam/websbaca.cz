import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import PreviewClient from './PreviewClient';
import Link from 'next/link';
import { Metadata } from 'next';

// Ořezání bílých znaků a neplatných symbolů z env proměnných
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim() || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

interface GeneratedSiteJson {
  hero: { title: string; subtitle: string; ctaText: string };
  about: { title: string; text: string };
  services: Array<{ title: string; description: string }>;
  contact: { address: string; phone: string; hours: string };
  theme: { primaryColor: string; secondaryColor: string };
}

interface OrderRow {
  id: string;
  company_name: string;
  status: string;
  generated_site_json: GeneratedSiteJson | null;
  primary_color: string | null;
  language: string | null;
  google_maps_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_address: string | null;
  revision_count: number | null;
  working_hours: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { data: order } = await supabase
    .from('orders')
    .select('company_name, domain, description')
    .eq('id', id)
    .single();

  if (!order) return { title: 'Web Preview' };

  const domain = order.domain || 'websbaca.cz';
  const url = `https://${domain}`;

  return {
    title: `${order.company_name} | Official Website`,
    description: order.description || `Welcome to the official website of ${order.company_name}.`,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: order.company_name,
      description: order.description || `Official website of ${order.company_name}`,
      url: url,
      siteName: order.company_name,
      images: [
        {
          url: '/og-image.jpg', // Fallback, could be dynamic if we have site screenshots
          width: 1200,
          height: 630,
        },
      ],
      locale: 'cs_CZ',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: order.company_name,
      description: order.description,
    },
  };
}

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error("❌ SUPABASE FETCH ERROR:", error.message);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Chyba při načítání náhledu</h1>
          <p className="text-gray-500 mb-6">{error.message}</p>
          <Link 
            href="/"
            className="inline-block bg-indigo-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Zpět na úvod
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Objednávka nenalezena</h1>
          <p className="text-gray-500 mb-6">Omlouváme se, ale požadovaný náhled nebyl nalezen. Zkontrolujte prosím správnost odkazu.</p>
          <Link 
            href="/"
            className="inline-block bg-indigo-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Zpět na úvod
          </Link>
        </div>
      </div>
    );
  }

  // ===== Pozastavení služeb z důvodu nezaplacení =====
  // Web je pozastavený, pokud: status = 'suspended' (Stripe unpaid)
  // NEBO platba selhala (overdue) a uplynula 15denní grace perioda
  const GRACE_MS = 15 * 24 * 60 * 60 * 1000;
  const graceExpired =
    !!order.first_failed_at &&
    Date.now() - new Date(order.first_failed_at).getTime() > GRACE_MS;
  const isSuspended =
    order.status === 'suspended' ||
    ((order.payment_status === 'unpaid' || order.payment_status === 'overdue') && graceExpired);

  if (isSuspended) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center max-w-lg bg-gray-900 border border-gray-800 p-10 rounded-2xl shadow-xl">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Services Temporarily Suspended</h1>
          <p className="text-gray-400 leading-relaxed mb-2">
            This website is currently suspended due to an unpaid invoice.
          </p>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            To restore your website, please update your payment method or contact our support at{' '}
            <a href="mailto:webs.baca.support@gmail.com" className="text-indigo-400 hover:text-indigo-300 underline">
              webs.baca.support@gmail.com
            </a>
            . Your website will be automatically restored after the payment is completed.
          </p>
          <Link
            href="mailto:webs.baca.support@gmail.com"
            className="inline-block bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Contact Support
          </Link>
        </div>
      </div>
    );
  }
  // Ošetření načítání dat v komponentě - parsování generated_site_json
  const siteJson = typeof order.generated_site_json === 'string' 
    ? JSON.parse(order.generated_site_json) 
    : order.generated_site_json;

  // Check if status is preview_ready or if we have the content
  const isReady = order.status === 'preview_ready' || siteJson;

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Připravujeme váš náhled...</h1>
          <p className="text-gray-500">
            Náš AI model právě vytváří obsah pro váš nový web. Tato operace obvykle trvá 30-60 sekund.
          </p>
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-400">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Zpracovávání dat
          </div>
        </div>
      </div>
    );
  }

  const isPaid = order.status === 'paid' || order.status === 'active';

  return (
    <PreviewClient
      order={order}
      siteJson={siteJson as GeneratedSiteJson}
      isPaid={isPaid}
      revisionCount={order.revision_count ?? 0}
    />
  );
}
