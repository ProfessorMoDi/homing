import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // firebase-admin must NOT be bundled — its dynamic requires crash the route
  // module at runtime on Vercel (works in dev, 500s in prod). Loading it as an
  // external Node package fixes the /api/auth/* and /api/neo4j/user routes.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
