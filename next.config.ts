import type { NextConfig } from 'next';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

const API_ORIGIN = 'https://portal.tanal.raiyan.cc';
const NOMINATIM_ORIGIN = 'https://nominatim.openstreetmap.org';

/**
 * Content Security Policy
 *
 * Keep external domains synchronized with:
 * - images.remotePatterns
 * - API integrations
 * - map providers
 * - any future analytics, payment or chat services
 */
const contentSecurityPolicy = [
  "default-src 'self'",

  /*
   * Next.js uses inline bootstrap scripts.
   * `unsafe-eval` is needed during development, but should not be enabled
   * in production unless a specific dependency requires it.
   */
  `script-src 'self' 'unsafe-inline'${
    isDevelopment ? " 'unsafe-eval'" : ''
  }`,

  // Required by the current Tailwind/Next.js runtime setup.
  "style-src 'self' 'unsafe-inline'",

  // next/font normally serves fonts from the same application.
  "font-src 'self' data:",

  [
    "img-src 'self' data: blob:",
    'https://raiyansoft.com',
    API_ORIGIN,
    'https://picsum.photos',
    'https://i.vgy.me',
    'https://*.tile.openstreetmap.org',
  ].join(' '),

  [
    "connect-src 'self'",
    API_ORIGIN,
    NOMINATIM_ORIGIN,

    // Allow development WebSocket connections used by HMR.
    ...(isDevelopment ? ['ws:', 'wss:'] : []),
  ].join(' '),

  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",

  /*
   * Do not upgrade localhost HTTP requests while developing.
   * Production should always run over HTTPS.
   */
  ...(isProduction ? ['upgrade-insecure-requests'] : []),
].join('; ');

/**
 * Shared application security headers.
 */
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: contentSecurityPolicy,
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    /*
     * CSP frame-ancestors is the main protection.
     * X-Frame-Options remains for older browser compatibility.
     */
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    /*
     * The map picker can request browser location.
     * Camera and microphone access are disabled.
     */
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self)',
  },
  {
    /*
     * Allows OAuth or payment popups without fully isolating the opener.
     */
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin-allow-popups',
  },

  /*
   * HSTS must only be returned over production HTTPS.
   */
  ...(isProduction
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  /**
   * Helps identify unsafe side effects during development.
   */
  reactStrictMode: true,

  /**
   * Prevent exposing the framework through the X-Powered-By header.
   */
  poweredByHeader: false,

  /**
   * Next.js 15 setting.
   *
   * Builds will continue even if ESLint errors exist.
   * Keep a separate lint command in CI:
   *
   * npm run lint
   *
   * Change this to false after all existing lint issues are resolved.
   */
  eslint: {
    ignoreDuringBuilds: true,
  },

  /**
   * Never allow a production build containing TypeScript errors.
   */
  typescript: {
    ignoreBuildErrors: false,
  },

  /**
   * External image configuration used by next/image.
   */
  images: {
    formats: ['image/avif', 'image/webp'],

    /**
     * Cache optimized images for at least one day.
     */
    minimumCacheTTL: 86_400,

    /**
     * Only explicitly approved external image hosts are allowed.
     *
     * The `search` property is intentionally omitted, which means URLs with
     * or without query parameters can be used.
     */
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'raiyansoft.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.vgy.me',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'portal.tanal.raiyan.cc',
        port: '',
        pathname: '/storage/images/**',
      },
    ],
  },

  /**
   * Generate a minimal self-hosted production bundle under:
   *
   * .next/standalone
   */
  output: 'standalone',

  /**
   * Keep Motion transpiled for compatibility with the project setup.
   */
  transpilePackages: ['motion'],

  /**
   * Application response headers.
   */
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },

      /**
       * Disable static chunk caching during development.
       *
       * Production Next.js chunks have hashed filenames and Next.js handles
       * their caching automatically.
       */
      ...(isDevelopment
        ? [
            {
              source: '/_next/static/:path*',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'no-cache, no-store, must-revalidate',
                },
              ],
            },
          ]
        : []),

      /**
       * Cache the application logo for seven days.
       *
       * Rename or version the file whenever the logo content changes.
       */
      {
        source: '/logo.webp',
        headers: [
          {
            key: 'Cache-Control',
            value:
              'public, max-age=604800, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },

  /**
   * Redirect removed modules to the replacement service-orders module.
   */
  async redirects() {
    return [
      {
        source: '/events',
        destination: '/service-orders',
        permanent: false,
      },
      {
        source: '/events/:path*',
        destination: '/service-orders',
        permanent: false,
      },
      {
        source: '/clients',
        destination: '/service-orders',
        permanent: false,
      },
      {
        source: '/clients/:path*',
        destination: '/service-orders',
        permanent: false,
      },
      {
        source: '/service-requests',
        destination: '/service-orders',
        permanent: false,
      },
      {
        source: '/service-requests/:path*',
        destination: '/service-orders',
        permanent: false,
      },
    ];
  },

  /**
   * Custom development Webpack behavior.
   */
  webpack: (config, { dev }) => {
    /**
     * AI Studio can disable HMR through DISABLE_HMR.
     *
     * Preserve existing Webpack watch options instead of replacing them.
     */
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ...(config.watchOptions ?? {}),
        ignored: /.*/,
      };
    }

    return config;
  },
};

export default nextConfig;