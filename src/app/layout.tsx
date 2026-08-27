import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/site";
import { CountryProvider } from "@/contexts/CountryContext";
import { AffiliateProvider } from "@/contexts/AffiliateContext";
import { Analytics } from "@vercel/analytics/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteTitle = "Webs Bača – Custom Websites & Web Design in 10 Minutes";
const siteDescription = "Professional Websites for $150/month";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: siteTitle,
    template: "%s | Webs Bača",
  },
  description: siteDescription,
  applicationName: "Webs Bača",
  authors: [{ name: "Webs Bača", url: SITE_URL }],
  creator: "Webs Bača",
  keywords: [
    "custom websites",
    "web design",
    "web hosting",
    "Webs Bača",
    "fast websites",
    "website design in 10 minutes",
    "professional websites",
    "USA",
  ],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Webs Bača",
    title: siteTitle,
    description: siteDescription,
    images: [{ url: "/Logo.png", width: 1200, height: 1200, alt: "Webs Bača – logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/Logo.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#030303",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Webs Bača",
      description: siteDescription,
      inLanguage: "en-US",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Webs Bača",
      url: SITE_URL,
      logo: `${SITE_URL}/Logo.png`,
      email: "info@websbaca.cz",
    },
    {
      "@type": "ProfessionalService",
      name: "Webs Bača – Custom Websites & Web Design",
      url: SITE_URL,
      image: `${SITE_URL}/Logo.png`,
      areaServed: { "@type": "Country", name: "United States" },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased w-full max-w-full overflow-x-hidden`}>
      <head>
        <link rel="icon" href="/favicon.ico?v=2" sizes="any" />
        <link rel="icon" href="/icon.png?v=2" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col w-full max-w-full overflow-x-hidden">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <CountryProvider>
          <AffiliateProvider>
            {children}
          </AffiliateProvider>
        </CountryProvider>
        <Analytics />
      </body>
    </html>
  );
}
