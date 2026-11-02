import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page reads live MySQL data and the signed session cookie, so the app is fully dynamic
  // (Cache Components / partial prefetching are intentionally left off).
  serverExternalPackages: ["mysql2"],
  poweredByHeader: false,
  // The old Monitoring Finances page was merged into Expenses (now named Monitoring Finances).
  redirects: async () => [{ source: '/app/finance-monitor', destination: '/app/expenses', permanent: true }],
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
