import type { Metadata } from "next";
import { Dancing_Script, Cormorant_Garamond, Jost, Fraunces, Pinyon_Script, Playfair_Display } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import "./globals.css";
import { CookieBanner } from "@/components/ui/CookieBanner";
import { ChatWidget } from "@/components/ui/ChatWidget";
import { UTMCapture } from "@/components/ui/UTMCapture";
import { JsonLd } from "@/components/ui/JsonLd";
import { getSiteImage } from "@/lib/site-images";
import { CONTACT_EMAIL } from "@/lib/site-config";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { MarketGate } from "@/components/ui/MarketGate";

const dancing = Dancing_Script({ subsets: ["latin"], variable: "--font-dancing", display: "swap" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400", "500"], style: ["normal", "italic"], variable: "--font-cormorant", display: "swap" });
const jost = Jost({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-jost", display: "swap" });
// Brand wordmark font (header lockup).
const fraunces = Fraunces({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-fraunces", display: "swap" });
// Formal copperplate script (Ginori-style panel headings).
const pinyon = Pinyon_Script({ subsets: ["latin"], weight: "400", variable: "--font-pinyon", display: "swap" });
// High-contrast didone serif (Ginori-style panel body copy).
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--font-playfair", display: "swap" });

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'

// Cache the OG-image lookup so we don't hit the DB on every page render
// (it rarely changes). 5-minute TTL, shared per server instance.
let ogCache: { at: number; val: { public_url: string; alt_text: string } | null } | null = null
async function cachedOgImage() {
  if (ogCache && Date.now() - ogCache.at < 300_000) return ogCache.val
  const val = await getSiteImage('global.og_image')
  ogCache = { at: Date.now(), val }
  return val
}

export async function generateMetadata(): Promise<Metadata> {
  // Owner-managed social-share image (portal → Site Images), else default.
  const og = await cachedOgImage()
  const ogImage = og?.public_url || '/og-image.jpg'
  const ogAlt = og?.alt_text || 'Petite Lavande gift box'
  return {
    metadataBase: new URL(BASE),
    title: { default: "Petite Lavande — Luxury Curated Baby Gift Boxes", template: "%s | Petite Lavande" },
    description: "Build a bespoke luxury baby shower gift box. Choose 5 premium organic items, add a personalized printed card, and deliver an unforgettable unboxing experience.",
    keywords: ["baby gift box", "luxury baby shower gift", "organic baby gifts", "newborn gift basket", "custom baby box"],
    openGraph: {
      type: "website",
      siteName: "Petite Lavande",
      title: "Petite Lavande — Luxury Curated Baby Gift Boxes",
      description: "Build a bespoke luxury baby shower gift box. Premium organic items, personalized printed card, unforgettable unboxing.",
      url: BASE,
      images: [{ url: ogImage, width: 1200, height: 630, alt: ogAlt }],
    },
    twitter: { card: "summary_large_image", title: "Petite Lavande", description: "Luxury curated organic baby gift boxes.", images: [ogImage] },
    robots: { index: true, follow: true },
    // Site verification, all env-gated (omitted when unset). Rendered
    // server-side, so both the NEXT_PUBLIC_ and plain env names work:
    //  · Google Search Console  → [NEXT_PUBLIC_]GOOGLE_SITE_VERIFICATION
    //  · Bing Webmaster Tools   → [NEXT_PUBLIC_]BING_SITE_VERIFICATION
    //  · Pinterest (Rich Pins)  → NEXT_PUBLIC_PINTEREST_VERIFICATION
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || process.env.GOOGLE_SITE_VERIFICATION || undefined,
      other: {
        ...(process.env.NEXT_PUBLIC_PINTEREST_VERIFICATION
          ? { 'p:domain_verify': process.env.NEXT_PUBLIC_PINTEREST_VERIFICATION } : {}),
        ...((process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || process.env.BING_SITE_VERIFICATION)
          ? { 'msvalidate.01': (process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || process.env.BING_SITE_VERIFICATION)! } : {}),
      },
    },
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} className={`${dancing.variable} ${cormorant.variable} ${jost.variable} ${fraunces.variable} ${pinyon.variable} ${playfair.variable} h-full antialiased`}>
      <head>
        {/* PWA / iOS home screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Petite Lavande" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#383734" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="min-h-full flex flex-col bg-white text-bark-600">
        {/* Site-wide structured data */}
        <JsonLd data={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Petite Lavande',
          url: BASE,
          logo: `${BASE}/apple-touch-icon.png`,
          description: 'Luxury curated organic baby gift boxes.',
          email: CONTACT_EMAIL,
        }} />
        <JsonLd data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Petite Lavande',
          url: BASE,
        }} />
        <NextIntlClientProvider messages={messages}>
          <MarketGate />
          {children}
        </NextIntlClientProvider>
        <Suspense fallback={null}><UTMCapture /></Suspense>
        <CookieBanner />
        {/* On-brand AI chat widget (instant answers + email handoff). Crisp was
            dropped for its unstyleable window — components/ui/CrispChat.tsx
            still exists if live human chat is ever wanted back. */}
        <ChatWidget />

        {/* Google Analytics */}
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">{`
              // Respect the cookie banner: a visitor who clicked Decline is not
              // configured/tracked (script noop). Undecided or accepted → track.
              var __declined = false;
              try { __declined = localStorage.getItem('cookie_consent') === 'declined'; } catch(e){}
              if (!__declined) {
                // Own-traffic exclusion: visiting ?internal=1 (or logging into the
                // portal) flags this browser so GA tags it traffic_type=internal.
                try {
                  var u = new URL(window.location.href);
                  if (u.searchParams.get('internal') === '1') localStorage.setItem('pl_internal','1');
                  if (u.searchParams.get('internal') === '0') localStorage.removeItem('pl_internal');
                } catch(e){}
                var __internal = false;
                try { __internal = localStorage.getItem('pl_internal') === '1'; } catch(e){}
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = window.gtag || gtag;
                gtag('js', new Date());
                gtag('config', '${GA_ID}', __internal ? { traffic_type: 'internal' } : {});
              }
            `}</Script>
          </>
        )}

        {/* Meta Pixel */}
        {META_PIXEL_ID && (
          <Script id="meta-pixel" strategy="afterInteractive">{`
            // Respect the cookie banner (same rule as GA above).
            var __plxDeclined = false;
            try { __plxDeclined = localStorage.getItem('cookie_consent') === 'declined'; } catch(e){}
            if (!__plxDeclined) {
              !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
              n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
              document,'script','https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${META_PIXEL_ID}');
              fbq('track', 'PageView');
            }
          `}</Script>
        )}
      </body>
    </html>
  );
}
