import type { NextConfig } from "next";

/**
 * Baseline security headers applied to every response.
 * A strict Content-Security-Policy is intentionally NOT set here: Next.js injects
 * inline scripts, so a CSP needs nonces (see docs/SECURITY_CHECKLIST.md).
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Cache Components is deliberately OFF: classic dynamic rendering is easier to
  // reason about under competition time pressure. See docs/ARCHITECTURE.md.
  cacheComponents: false,
  turbopack: {
    // Pin the workspace root (avoids picking up stray lockfiles in parent folders).
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
