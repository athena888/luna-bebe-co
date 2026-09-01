import type { Metadata } from "next";
import { headers } from "next/headers";
import { LanguageBanner } from '@/components/ui/LanguageBanner'
import { Jost, Pinyon_Script, Playfair_Display } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import "./globals.css";
import { CookieBanner } from "@/components/ui/CookieBanner";
import { ChatWidget } from "@/components/ui/ChatWidget";
import { UTMCapture } from "@/components/ui/UTMCapture";
import { JsonLd } from "@/components/ui/JsonLd";
import { getSiteImage } from "@/lib/site-images";
import { BUSINESS_ADDRESS, BUSINESS_LEGAL_NAME, BUSINESS_PHONE, CONTACT_EMAIL } from "@/lib/site-config";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { MarketGate } from "@/components/ui/MarketGate";

const jost = Jost({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-jost", display: "swap" });
// Formal copperplate script (Ginori-style panel headings).
const pinyon = Pinyon_Script({ subsets: ["latin"], weight: "400", variable: "--font-pinyon", display: "swap" });
// Two working faces: Playfair Display for headings, Jost for everything
// else. Pinyon stays for the rare script accent. Dancing Script, Cormorant
// and Fraunces were retired 2026-08-17 — six loaded families was five too
// many, and each duplicated a job one of these already did.
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
    description: "French-inspired newborn & postpartum gift boxes — organic cotton, hand-packed with care. Thoughtful luxury for new mothers and babies.",
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
// Google Ads destination. Configured on the SAME gtag.js the GA4 property
// already loads — one tag, two destinations — because Google Ads does not read
// GA4 events: a conversion only counts when a gtag `conversion` event carries
// send_to: AW-XXXXXXXXX/LABEL. Unset = nothing changes.
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();
  // getLocale() answers the MARKET locale (en-US / en-GB / fr-FR), which is a
  // different axis from the /es/ content locale and has no es-US member. The
  // lang attribute must follow the URL instead — see middleware.ts.
  const pathname = (await headers()).get('x-pathname') ?? '';
  const htmlLang = pathname === '/es' || pathname.startsWith('/es/') ? 'es-US' : locale;
  return (
    <html lang={htmlLang} className={`${jost.variable} ${pinyon.variable} ${playfair.variable} h-full antialiased`}>
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
          // The entity behind the brand, and where it operates from. An
          // anonymous storefront is the commonest misrepresentation finding;
          // this is the machine-readable half of the footer identity line.
          legalName: BUSINESS_LEGAL_NAME,
          url: BASE,
          logo: `${BASE}/apple-touch-icon.png`,
          // Describes the MIX a box actually holds. "Organic baby gift boxes"
          // claimed the whole box was organic, which no box is.
          description: 'Curated gift boxes for newborns and new mothers — organic-cotton textiles, natural-material baby items, and gifts for the mother.',
          email: CONTACT_EMAIL,
          areaServed: 'US',
          // Rendered only when configured; a fabricated address or phone is
          // worse than none at all (see lib/site-config).
          ...(BUSINESS_PHONE ? { telephone: BUSINESS_PHONE } : {}),
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Seattle',
            addressRegion: 'WA',
            addressCountry: 'US',
            ...(BUSINESS_ADDRESS ? { streetAddress: BUSINESS_ADDRESS } : {}),
          },
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
        <LanguageBanner />
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
            {/* beforeInteractive: the gtag()/dataLayer stub, the gate and the
                kill switch must exist BEFORE React hydrates. As afterInteractive
                they ran after hydration, so view_item fired by a mounting
                island found no window.gtag and was silently dropped (page_view
                survived only because gtag.js sends it itself). Everything in
                here only queues commands; gtag.js drains the queue in order. */}
            <Script id="ga4" strategy="beforeInteractive">{`
              // Mirror of lib/analytics-gate.ts — the loader-time gate. GA is
              // configured ONLY on the production storefront, outside /portal,
              // in a browser that is neither flagged internal nor declined the
              // cookie banner. Everything else gets Google's official kill
              // switch so even the loaded gtag.js (and its enhanced-measurement
              // page_views) sends nothing. localhost, 127.0.0.1 and Vercel
              // preview hosts all fail the host check — dev and preview traffic
              // can no longer reach the production property.
              var __allowed = false;
              try {
                var __host = location.hostname.toLowerCase();
                var __prodHost = __host === 'petitelavande.com' || __host === 'www.petitelavande.com';
                var __portal = location.pathname.indexOf('/portal') === 0;
                var __internal = false, __declined = false;
                try {
                  __internal = localStorage.getItem('pl_internal_analytics') === '1'
                            || localStorage.getItem('pl_internal') === '1';
                  __declined = localStorage.getItem('cookie_consent') === 'declined';
                } catch(e){}
                __allowed = __prodHost && !__portal && !__internal && !__declined;
              } catch(e){}
              if (!__allowed) {
                window['ga-disable-${GA_ID}'] = true;
                ${GOOGLE_ADS_ID ? `window['ga-disable-${GOOGLE_ADS_ID}'] = true;` : ''}
              } else {
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = window.gtag || gtag;
                gtag('js', new Date());
                // ONE page_view strategy: gtag's automatic page_view covers the
                // initial load; SPA route changes are covered by GA4 enhanced
                // measurement (history events). No manual page_view anywhere,
                // so nothing can double-fire. UTM/gclid attribution is read by
                // gtag.js from the landing URL — untouched.
                gtag('config', '${GA_ID}');
                ${GOOGLE_ADS_ID ? `gtag('config', '${GOOGLE_ADS_ID}');` : ''}
              }
            `}</Script>
          </>
        )}

        {/* Meta Pixel */}
        {META_PIXEL_ID && (
          <Script id="meta-pixel" strategy="beforeInteractive">{`
            // Same gate as GA above (mirror of lib/analytics-gate.ts).
            var __plxAllowed = false;
            try {
              var __plxHost = location.hostname.toLowerCase();
              var __plxProd = __plxHost === 'petitelavande.com' || __plxHost === 'www.petitelavande.com';
              var __plxPortal = location.pathname.indexOf('/portal') === 0;
              var __plxInternal = false, __plxDeclined = false;
              try {
                __plxInternal = localStorage.getItem('pl_internal_analytics') === '1'
                             || localStorage.getItem('pl_internal') === '1';
                __plxDeclined = localStorage.getItem('cookie_consent') === 'declined';
              } catch(e){}
              __plxAllowed = __plxProd && !__plxPortal && !__plxInternal && !__plxDeclined;
            } catch(e){}
            if (__plxAllowed) {
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
