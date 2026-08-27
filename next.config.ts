import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Resolves the active locale per request (domain / cookie / Accept-Language).
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // hersheytext (Cricut card writer) reads its font files with __dirname at
  // runtime — bundling breaks those paths, so load it from node_modules.
  serverExternalPackages: ['hersheytext'],
  // The research routine commits intake files to ops/outreach-intake/; the
  // prospect cron reads them at runtime, so they must be traced into its
  // serverless bundle (nothing imports them statically).
  outputFileTracingIncludes: {
    '/api/cron/outreach-prospect': ['./ops/outreach-intake/**'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Serve modern, smaller formats and cache transforms aggressively.
    // (Only applies to <Image> NOT marked `unoptimized`.)
    formats: ['image/avif', 'image/webp'],
    // Delivery quality (Emily 2026-08-27): the default 75 turned 1200x1600
    // product photos into ~70KB AVIFs that smoothed knit and fabric texture
    // away — "every photo looks lower-res". With 88 as the ONLY allowed
    // quality, every <Image> that omits `quality` is coerced to it (Next
    // snaps to the closest allowed value), so the whole storefront lifts at
    // once; the key product/box images also pass quality={88} explicitly so
    // their URLs change and the 31-day optimizer cache can't serve old 75s.
    qualities: [88],
    minimumCacheTTL: 2678400, // 31 days
  },
  // OpenAI Ads rejected the extensionless feed URL with "Unable to save the
  // hosted URL". Its spec accepts .csv/.tsv/.txt (and gzip variants), so the
  // fetcher appears to read the format from the path. This is an ALIAS, not a
  // second feed: same route, same builder, so the two can never drift.
  async rewrites() {
    return [
      { source: '/api/feeds/openai-products.csv', destination: '/api/feeds/openai-products' },
    ]
  },

  async redirects() {
    return [
      // Canonical host: everything on www permanently redirects to the bare
      // apex (requires www.petitelavande.com to be attached to the Vercel
      // project + a DNS record — without those, www doesn't resolve at all).
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.petitelavande.com' }],
        destination: 'https://petitelavande.com/:path*',
        permanent: true,
      },
      // Box slugs -> keyword URLs (Emily, 2026-07-29)
      { source: '/boxes/signature', destination: '/boxes/signature-baby-gift-box', permanent: true },
      { source: '/boxes/la-collection', destination: '/boxes/themed-baby-gift-box', permanent: true },
      { source: '/boxes/mama', destination: '/boxes/new-mom-gift-box', permanent: true },
      { source: '/boxes/mama-et-bebe', destination: '/boxes/themed-baby-gift-box', permanent: true },
      { source: '/boxes/mom-and-baby-gift-box', destination: '/boxes/themed-baby-gift-box', permanent: true },
      { source: '/boxes/noel', destination: '/boxes/baby-first-christmas-gift-box', permanent: true },
      { source: '/boxes/entry', destination: '/boxes/petite-baby-gift-box', permanent: true },
      // Phase 8b dispositions (Emily-approved 2026-07-29): journal->pSEO
      { source: '/journal/best-organic-baby-shower-gifts-2026', destination: '/gifts/organic-baby-shower-gifts', permanent: true },
      { source: '/journal/new-mom-gift-ideas-that-arent-flowers', destination: '/gifts/new-mom-gift-ideas', permanent: true },
      { source: '/journal/newborn-milestone-photo-ideas', destination: '/gift-guides', permanent: true },
      { source: '/guide', destination: '/gift-guides', permanent: true },
      // Fix "Seep Mask" typo — 301 from the old slug to the corrected one.
      // Run the SQL migration first; then check the actual DB slug with:
      //   SELECT id FROM products WHERE id ILIKE '%seep%';
      // and add any additional slug variants here.
      {
        source: '/products/mulberry-silk-seep-mask',
        destination: '/products/mulberry-silk-sleep-mask',
        permanent: true,
      },
      { source: '/wishlist', destination: '/build', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevent MIME type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent XSS attacks
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Prevent referrer leakage
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Hide server info
          { key: 'X-Powered-By', value: '' },
          // Content Security Policy — allow Google Analytics, Stripe, Supabase,
          // and Crisp live chat (script + websocket relay), scripts otherwise same-origin
          {
            key: 'Content-Security-Policy',
            // Google Customer Reviews (components/ui/GcrOptIn.tsx) needs three
            // extra hosts: apis.google.com serves platform.js, and the survey
            // opt-in itself renders in — and posts back to — www.google.com.
            // Without them the CSP blocks platform.js, window.gapi never
            // exists, and the opt-in silently never renders (it is written to
            // fail quietly, so the block left no trace).
            //
            // Google Ads conversions (2026-08-22) need googleadservices.com and
            // the doubleclick hosts: gtag fires the conversion, then POSTS it to
            // googleadservices.com/pagead/conversion/<id> and ad.doubleclick.net
            // /ccm/s/collect. Both were blocked by connect-src, so the event ran
            // in the browser and never reached Google — the console showed
            // "Refused to connect", and Ads reported "Conversion has never
            // received data". Verified against the real blocked requests.
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://js.stripe.com https://client.crisp.chat https://apis.google.com; style-src 'self' 'unsafe-inline' https://client.crisp.chat; img-src 'self' https: data:; font-src 'self' https: https://client.crisp.chat; media-src 'self' https://client.crisp.chat; connect-src 'self' https://api.stripe.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://stats.g.doubleclick.net https://www.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://ad.doubleclick.net https://*.supabase.co https://api.anthropic.com https://api.gemini.com https://client.crisp.chat wss://client.relay.crisp.chat wss://stream.relay.crisp.chat https://www.google.com; frame-src 'self' blob: https://js.stripe.com https://game.crisp.chat https://www.google.com https://td.doubleclick.net; base-uri 'self'; form-action 'self'",
          },
        ],
      },
      // Block source maps from being served in production
      {
        source: '/:path*.js.map',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex' },
          { key: 'Cache-Control', value: 'private, no-store' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
