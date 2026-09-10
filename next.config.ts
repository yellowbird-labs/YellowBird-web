import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: '/api/backend/:path*', destination: 'https://api.amaanworks.me/api/v1/:path*' }];
  },
};

export default nextConfig;
