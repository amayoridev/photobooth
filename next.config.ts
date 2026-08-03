import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['113.23.100.161', '192.168.1.251', 'localhost', '127.0.0.1', '*'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
      allowedOrigins: ['*'],
    },
  },
};

export default nextConfig;
