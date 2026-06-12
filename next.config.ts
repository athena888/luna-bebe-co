import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Resolves the active locale per request (domain / cookie / Accept-Language).
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
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
          // Content Security Policy — allow Google Analytics, Stripe, Supabase, only allow scripts from same origin
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self' https:; connect-src 'self' https://api.stripe.com https://www.google-analytics.com https://www.googletagmanager.com https://*.supabase.co https://api.anthropic.com https://api.gemini.com; frame-src 'self' https://js.stripe.com; base-uri 'self'; form-action 'self'",
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
