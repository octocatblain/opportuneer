import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer-core", "@prisma/client"],
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
};

export default nextConfig;
