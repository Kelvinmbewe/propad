import createPWA from '@ducanh2912/next-pwa';
import process from 'process';

const isDev = process.env.NODE_ENV !== 'production';

const withPWA = createPWA({
  dest: 'public',
  disable: isDev,
  register: true,
  skipWaiting: true
});

const config = {
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true
  },
  transpilePackages: ['@propad/sdk', '@propad/ui'],
  images: {
    // Allow both same-origin images (including /uploads/*) and remote HTTPS images.
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001'
      },
      {
        protocol: 'https',
        hostname: '**'
      }
    ]
  },
  async rewrites() {
    // Proxy media URLs to the API so that /uploads/* on the web host is served from the API service.
    const apiBase =
      process.env.NEXT_PUBLIC_API_BASE_URL && process.env.NEXT_PUBLIC_API_BASE_URL.length > 0
        ? process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/+$/, '')
        : 'http://localhost:3001';

    return [
      {
        source: '/uploads/:path*',
        destination: `${apiBase}/uploads/:path*`
      }
    ];
  }
};

export default withPWA(config);
