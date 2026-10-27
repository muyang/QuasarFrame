import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/geolibre/:path*', headers: [
      { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://gibs.earthdata.nasa.gov; img-src 'self' data: blob: https://gibs.earthdata.nasa.gov; font-src 'self' data:; worker-src 'self' blob:; frame-src 'none'; object-src 'none'; frame-ancestors 'self'; form-action 'none'; base-uri 'self'" },
      { key: 'Referrer-Policy', value: 'no-referrer' },
    ] }];
  },
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
