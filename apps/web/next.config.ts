import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@coloring/config", "@coloring/db"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "pub-0341730fb521423fbce717522fc92e5f.r2.dev",
      },
    ],
  },
};

export default nextConfig;
