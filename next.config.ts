import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['ssh2'],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
