import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // nodemailer resolves its transports at runtime; bundling breaks those requires.
  serverExternalPackages: ["nodemailer"],
  // The repository keeps its own agent instructions; don't generate extra ones.
  agentRules: false,
};

export default nextConfig;
