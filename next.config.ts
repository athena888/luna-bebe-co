import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Resolves the active locale per request (domain / cookie / Accept-Language).
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // The lookbook PDF renderer reads fonts AND brand art (lavender divider,
  // botanical illustration) from assets/ at runtime — make sure the serverless
  // bundles for those routes include them.
  outputFileTracingIncludes: {
    '/api/portal/lookbook/render': ['./assets/**/*'],
    '/api/portal/lookbook/publish': ['./assets/**/*'],
  },
  // hersheytext (Cricut card writer) reads its font files with __dirname at
  // runtime — bundling breaks those paths, so load it from node_modules.
  serverExternalPackages: ['hersheytext'],
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
    minimumCacheTTL: 2678400, // 31 days
  },
  async redirects() {
    return [
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
      { source: '/guide', destination: '/gifts', permanent: true },
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
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://js.stripe.com https://client.crisp.chat; style-src 'self' 'unsafe-inline' https://client.crisp.chat; img-src 'self' https: data:; font-src 'self' https: https://client.crisp.chat; media-src 'self' https://client.crisp.chat; connect-src 'self' https://api.stripe.com https://www.google-analytics.com https://www.googletagmanager.com https://*.supabase.co https://api.anthropic.com https://api.gemini.com https://client.crisp.chat wss://client.relay.crisp.chat wss://stream.relay.crisp.chat; frame-src 'self' blob: https://js.stripe.com https://game.crisp.chat; base-uri 'self'; form-action 'self'",
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
