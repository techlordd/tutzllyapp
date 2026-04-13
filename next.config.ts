import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent pg, bcryptjs, jsonwebtoken from being bundled — they need Node.js runtime
  serverExternalPackages: ['pg', 'bcryptjs', 'jsonwebtoken'],

  // Include schema.sql in the Vercel build output so the setup route can read it
  outputFileTracingIncludes: {
    '/api/setup': ['./src/lib/schema.sql'],
  },
};

export default nextConfig;
