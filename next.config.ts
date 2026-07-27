import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    // Tree-shake icon libraries — only the icons actually used get bundled
    optimizePackageImports: ['lucide-react'],
  },
  // Allow access to remote image placeholder.
  images: {
    // Optimisation is on: `output: 'standalone'` runs a Node server and `sharp`
    // is installed, so /_next/image can resize and serve AVIF/WebP. Turning this
    // off shipped every image at full source resolution in its original format.
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
      {
        protocol: 'https',
        hostname: 'raiyansoft.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  /**
   * Security headers and cache lifetimes.
   *
   * The CSP lists exactly the origins this app already talks to: the Tanal API,
   * the image hosts in `remotePatterns`, and the OpenStreetMap tile/geocoding
   * endpoints used by the map picker. Adding a new third party (analytics, a
   * payment iframe, a chat widget) means adding its origin here or it will be
   * blocked at runtime.
   *
   * `unsafe-inline`/`unsafe-eval` on script-src are required by the Next.js
   * runtime, which inlines its bootstrap and hydration payload.
   */
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      // next/font self-hosts the Google fonts at build time, so no font CDN here.
      "img-src 'self' data: blob: https://raiyansoft.com https://portal.tanal.raiyan.cc https://picsum.photos https://*.tile.openstreetmap.org",
      "connect-src 'self' https://portal.tanal.raiyan.cc https://nominatim.openstreetmap.org",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // The map picker asks for the browser's location; nothing else is used.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          // Only meaningful over HTTPS; browsers ignore it on plain http://localhost.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      {
        // Hashed filenames — safe to cache forever.
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/_next/image/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
      {
        source: '/logo.webp',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }],
      },
    ];
  },
  // The clients/events modules were replaced by service orders; keep old
  // bookmarks and deep links working instead of 404ing them.
  async redirects() {
    return [
      { source: '/events', destination: '/service-orders', permanent: false },
      { source: '/events/:path*', destination: '/service-orders', permanent: false },
      { source: '/clients', destination: '/service-orders', permanent: false },
      { source: '/clients/:path*', destination: '/service-orders', permanent: false },
      { source: '/service-requests', destination: '/service-orders', permanent: false },
      { source: '/service-requests/:path*', destination: '/service-orders', permanent: false },
    ];
  },
  webpack: (config, { dev }) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
