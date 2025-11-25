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
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**'
      }
    ]
  }
};

export default withPWA(config);
