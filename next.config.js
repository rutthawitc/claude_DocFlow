
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  serverExternalPackages: ['bcryptjs'],
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https://unpkg.com; connect-src 'self' https://*.vercel-postgres.com https://api.telegram.org https://unpkg.com; object-src 'none'; media-src 'self'; frame-src 'self'; base-uri 'self'; form-action 'self'",
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN',
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
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), bluetooth=(), autoplay=(), fullscreen=(self)',
        },
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'off',
        },
        {
          key: 'X-Download-Options',
          value: 'noopen',
        },
        {
          key: 'X-Permitted-Cross-Domain-Policies',
          value: 'none',
        },
      ],
    },
    {
      source: '/api/(.*)',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: "default-src 'none'",
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'no-referrer',
        },
        {
          key: 'Cache-Control',
          value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
        {
          key: 'Pragma',
          value: 'no-cache',
        },
        {
          key: 'Expires',
          value: '0',
        },
      ],
    },
  ],
};

export default nextConfig;
