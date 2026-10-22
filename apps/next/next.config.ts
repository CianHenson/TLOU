import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page reads live MySQL data and the signed session cookie, so the app is fully dynamic
  // (Cache Components / partial prefetching are intentionally left off).
  serverExternalPackages: ["mysql2"],
  poweredByHeader: false,
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
