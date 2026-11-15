import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Server actions receive image uploads from the admin panel.
  experimental: { serverActions: { bodySizeLimit: '10mb' } },
  serverExternalPackages: ['transbank-sdk'],
};

export default nextConfig;
