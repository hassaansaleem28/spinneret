import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * better-sqlite3 is a native addon. Next must not attempt to bundle it for the
   * server runtime — it has to be required from node_modules at runtime instead.
   */
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
