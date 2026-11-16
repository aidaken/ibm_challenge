import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright hits the app via 127.0.0.1
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
