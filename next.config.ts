import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the project root so a stray lockfile in a parent folder is ignored.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
