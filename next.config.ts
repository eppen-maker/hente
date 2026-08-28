import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // The repository keeps its own agent instructions; don't generate extra ones.
  agentRules: false,
};

export default nextConfig;
