import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  webpack(config, { isServer }) {
    if (!isServer) {
      // Cesium imports SPZ decoding even when this globe only uses markers.
      // Its embedded WASM literal becomes an invalid template escape in the
      // production Webpack chunk. Exclude that unused decoder on the client.
      config.resolve.alias = {
        ...config.resolve.alias,
        "@spz-loader/core": path.resolve(process.cwd(), "src/lib/cesium-spz-unavailable.ts"),
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "example.com",
      },
    ],
  },
};

export default nextConfig;
