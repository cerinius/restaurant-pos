const path = require('path');

const enablePWA =
  process.env.NODE_ENV === 'production' &&
  process.env.ENABLE_PWA === 'true';

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: !enablePWA,
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pos-cache',
        expiration: { maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 },
        networkTimeoutSeconds: 10,
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'via.placeholder.com', 'images.unsplash.com'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
  },
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../..'),
  },
};

module.exports = withPWA(nextConfig);