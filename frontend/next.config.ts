import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "customer-assets-39nsmqrw.emergentagent.net",
      },
      {
        protocol: "https",
        hostname: "customer-assets.emergentagent.com",
      },
    ],
  },
};

export default nextConfig;
