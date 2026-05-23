import type { Metadata } from "next";
import { Dancing_Script, Cormorant_Garamond, Jost } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import "./globals.css";
import { CookieBanner } from "@/components/ui/CookieBanner";
import { ChatWidget } from "@/components/ui/ChatWidget";
import { UTMCapture } from "@/components/ui/UTMCapture";

const dancing = Dancing_Script({ subsets: ["latin"], variable: "--font-dancing", display: "swap" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400", "500"], style: ["normal", "italic"], variable: "--font-cormorant", display: "swap" });
const jost = Jost({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-jost", display: "swap" });

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://lalumiereco.com'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: { default: "La Lumière & Co. — Luxury Curated Baby Gift Boxes", template: "%s | La Lumière & Co." },
  description: "Build a bespoke luxury baby shower gift box. Choose 5 premium organic items, add a handwritten letter, and deliver an unforgettable unboxing experience.",
  keywords: ["baby gift box", "luxury baby shower gift", "organic baby gifts", "newborn gift basket", "custom baby box"],
  openGraph: {
    type: "website",
    siteName: "La Lumière & Co.",
    title: "La Lumière & Co. — Luxury Curated Baby Gift Boxes",
    description: "Build a bespoke luxury baby shower gift box. Premium organic items, handwritten letter, unforgettable unboxing.",
    url: BASE,
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "La Lumière & Co. gift box" }],
  },
  twitter: { card: "summary_large_image", title: "La Lumière & Co.", description: "Luxury curated organic baby gift boxes." },
  robots: { index: true, follow: true },
};

const GA_ID = process.env.NEXT_PUBLIC_GA_ID
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dancing.variable} ${cormorant.variable} ${jost.variable} h-full antialiased`}>
      <head>
        {/* PWA / iOS home screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="La Lumière" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#383734" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="min-h-full flex flex-col bg-white text-bark-600">
        {children}
        <Suspense fallback={null}><UTMCapture /></Suspense>
        <CookieBanner />
        <ChatWidget />

        {/* Google Analytics */}
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');
            `}</Script>
          </>
        )}

        {/* Meta Pixel */}
        {META_PIXEL_ID && (
          <Script id="meta-pixel" strategy="afterInteractive">{`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
            document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
          `}</Script>
        )}
      </body>
    </html>
  );
}
