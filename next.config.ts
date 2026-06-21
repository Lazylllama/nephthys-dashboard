import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "l4.dunkirk.sh",
      },
      {
        protocol: "https",
        hostname: "cachet.hackclub.com",
      },
      {
        protocol: "https",
        hostname: "avatars.slack-edge.com",
      },
    ],
  },
};

export default nextConfig;
