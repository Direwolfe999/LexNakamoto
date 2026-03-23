import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent @stacks packages from being bundled on the server
  // — they rely on browser APIs (window, localStorage, document)
  serverExternalPackages: [
    "@stacks/connect",
    "@stacks/connect-ui",
  ],
};

export default nextConfig;
