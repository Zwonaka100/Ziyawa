import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vavjhffuaublqzltohwz.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        // /wallet became /earnings. Notification emails already delivered to
        // users (payouts, refunds, dispute resolutions) link to /wallet, so
        // this has to keep working indefinitely rather than 404 in someone's
        // inbox months from now.
        source: '/wallet',
        destination: '/earnings',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
