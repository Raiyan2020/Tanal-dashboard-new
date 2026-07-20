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
    unoptimized: true,
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
