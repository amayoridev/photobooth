import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    root: path.resolve(__dirname),
  },
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
