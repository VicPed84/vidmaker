import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server Actions are stable/default in Next 16; no extra flags needed.
  typedRoutes: true,
};

export default nextConfig;
