import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  webpack(config) {
    config.optimization.concatenateModules = false;
    return config;
  },
};

export default nextConfig;
