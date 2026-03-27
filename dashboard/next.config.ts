import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { hostname: 'cdn.prod.website-files.com' },
      { hostname: 'lh3.googleusercontent.com' },
      { hostname: 's.gravatar.com' },
    ],
  },
};

export default nextConfig;
