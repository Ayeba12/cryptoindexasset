import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // A 2 MB portrait becomes about 2.7 MB when encoded in the editor payload.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  // Keep verification builds separate from an already-running dev preview.
  distDir: process.env.CA_ISOLATED_BUILD === "1" ? ".next-public-check" : ".next",
  output: "standalone", // Ensures friction-free zero-code migration to Hostinger KVM 2 VPS (Docker / Node)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/deposit",
        destination: "/dashboard/deposit",
        permanent: false,
      },
      {
        source: "/withdraw",
        destination: "/dashboard/withdraw",
        permanent: false,
      },
      {
        source: "/transactions",
        destination: "/dashboard/activity",
        permanent: false,
      },
      {
        source: "/settings",
        destination: "/dashboard/settings/profile",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
