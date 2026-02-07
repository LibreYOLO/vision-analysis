import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
