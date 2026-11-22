import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer-core", "@prisma/client"],
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
    // Keep visited pages in the client router cache so moving between sidebar items (and back) is instant;
    // server actions and redirects still refresh it.
    staleTimes: { dynamic: 30, static: 180 },
  },
};

export default nextConfig;
