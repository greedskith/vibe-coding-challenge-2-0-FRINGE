import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: "/presentation",
        destination: "/presentation/index.html",
      },
    ];
  },
};

export default nextConfig;
