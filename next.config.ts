import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output standalone build for Heroku
  output: 'standalone',

  // Environment variables validation
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
      },
    ],
  },

  // Disable x-powered-by header
  poweredByHeader: false,

  // Enable strict mode
  reactStrictMode: true,

  // Empty turbopack config to suppress webpack warning
  turbopack: {},
};

export default nextConfig;
