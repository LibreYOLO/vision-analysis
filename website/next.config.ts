import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this app. Stray package-lock.json files higher up
  // (e.g. in the home directory) otherwise make Next infer the wrong root, which
  // breaks module resolution and makes the watcher scan the whole home tree.
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return [
      {
        source: "/hardware/a100_pytorch_fp32",
        destination: "/hardware/a100",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
