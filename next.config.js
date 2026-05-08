/** @type {import('next').NextConfig} */
const path = require('path');

/**
 * Allow next/image when the product card display asset is served from R2 or another absolute URL.
 * @param {string | undefined} urlString
 * @returns {{ protocol: string; hostname: string; pathname: string } | null}
 */
function remotePatternFromAbsoluteUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return null;
  }
  const trimmed = urlString.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return null;
    }
    return {
      protocol: u.protocol.replace(':', ''),
      hostname: u.hostname,
      pathname: '/**',
    };
  } catch {
    return null;
  }
}

const productCardDisplayRemotePattern = remotePatternFromAbsoluteUrl(
  process.env.NEXT_PUBLIC_PRODUCT_CARD_DISPLAY_IMAGE_URL
);

const r2PublicRemotePattern = remotePatternFromAbsoluteUrl(
  process.env.R2_PUBLIC_URL
);

/**
 * Next.js dev blocks /_next/* when Origin hostname is not allowlisted (block-cross-site-dev).
 * - Dotted IPv4 private ranges (below) do not match single-label hosts like http://MY-PC:3000.
 * - Wildcard `**` matches any hostname segment pattern used by Next's isCsrfOriginAllowed (dev only).
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
 */
const IS_PRODUCTION_CONFIG = process.env.NODE_ENV === 'production';

const DEFAULT_LAN_DEV_ORIGIN_PATTERNS = [
  '127.0.0.1',
  '192.168.*.*',
  '10.*.*.*',
  '172.*.*.*',
  '169.254.*.*',
  '100.*.*.*',
  '*.local',
];

/**
 * @returns {string[]}
 */
function parseAllowedDevOriginsFromEnv() {
  const raw = process.env.NEXT_DEV_ALLOWED_ORIGINS;
  if (!raw || typeof raw !== 'string') {
    return [];
  }
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const nextConfig = {
  reactStrictMode: true,
  /**
   * Prisma client is generated to shared/db/generated/client (not node_modules/.prisma).
   * Serverless output tracing can omit engines; keys use picomatch on route paths.
   * `'/*'` matches only one segment (e.g. `/x`), not `/api/v1/...` — use `'/**'` for all routes.
   */
  outputFileTracingIncludes: {
    '/**': ['./shared/db/generated/client/**/*'],
  },
  serverExternalPackages: ['@prisma/client', 'prisma'],
  /**
   * Admin UI files live under `src/app/admin` but are only exposed at `/supersudo`.
   * `beforeFiles` runs before filesystem matching, so `/admin` never resolves to that tree.
   */
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/admin', destination: '/__admin_path_disabled' },
        { source: '/admin/:path*', destination: '/__admin_path_disabled' },
      ],
      afterFiles: [
        { source: '/supersudo', destination: '/admin' },
        { source: '/supersudo/:path*', destination: '/admin/:path*' },
      ],
    };
  },
  // Скрыть индикатор "Compiling..." в углу в dev — не мешает на экране
  devIndicators: false,
  transpilePackages: ['@shop/ui', '@shop/design-tokens'],
  /**
   * Standalone is for self-hosted / Docker images. Vercel bundles Serverless functions separately;
   * standalone + wrong outputDirectory can omit Prisma engines (rhel-openssl-3.0.x).
   */
  output: process.env.VERCEL ? undefined : 'standalone',
  // Security headers (P1-SEC-07)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https:",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
  // typescript.ignoreBuildErrors removed - build will fail on TypeScript errors
  // This ensures type safety in production builds
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn-icons-png.flaticon.com',
        pathname: '/**',
      },
      ...(productCardDisplayRemotePattern ? [productCardDisplayRemotePattern] : []),
      ...(r2PublicRemotePattern ? [r2PublicRemotePattern] : []),
    ],
    // Allow unoptimized images for development (images will use unoptimized prop)
    // Ensure image optimization is enabled for production
    formats: ['image/avif', 'image/webp'],
    // In development, disable image optimization globally to allow any local IP
    // Components can still use unoptimized prop, but this ensures all images work
    unoptimized: process.env.NODE_ENV === 'development',
  },
  // Fix for HMR issues in Next.js 15
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    
    // Resolve workspace packages and path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      '@shop/ui': path.resolve(__dirname, 'shared/ui'),
      '@shop/design-tokens': path.resolve(__dirname, 'shared/design-tokens'),
    };
    
    return config;
  },
  // Turbopack configuration for monorepo
  // Required when webpack config is present - Next.js 16 requires explicit turbopack config
  // Set root to project root where Next.js is installed in node_modules (monorepo workspace)
  turbopack: {
    root: path.resolve(__dirname, '.'),
  },
  allowedDevOrigins: [
    ...(IS_PRODUCTION_CONFIG ? [] : ['**']),
    ...DEFAULT_LAN_DEV_ORIGIN_PATTERNS,
    ...parseAllowedDevOriginsFromEnv(),
  ],
};

module.exports = nextConfig;

