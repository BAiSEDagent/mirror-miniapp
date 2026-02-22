import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { hostname: 'res.cloudinary.com' },
      { hostname: 'ipfs.io' },
      { hostname: 'i.imgur.com' },
    ],
  },
};

export default nextConfig;
