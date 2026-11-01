import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/docs', destination: 'https://yellow-bird-docs.vercel.app/docs' },
      { source: '/docs/:path*', destination: 'https://yellow-bird-docs.vercel.app/docs/:path*' },
    ];
  },
};

export default nextConfig;
