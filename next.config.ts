import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // public/ assets aren't traced into a function's bundle by default, so the
  // /api/examples route couldn't read them at runtime in production. Trace them
  // in explicitly so it can enumerate the example files.
  outputFileTracingIncludes: {
    "/api/examples": ["./public/examples/**/*"],
  },
};

export default nextConfig;
