/** @format */

// @ts-check

import withBundleAnalyzerInit from "@next/bundle-analyzer";
import withSerwistInit from "@serwist/next";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * @format
 * @type {import("next").NextConfig}
 */
const nextConfig = {
  basePath: "",

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.arolariu.ro",
      },
      {
        protocol: "https",
        hostname: "dummyimage.com",
      },
      {
        protocol: "https",
        hostname: "arolariustorage.blob.core.windows.net",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Built-With",
            value: "ReactJS & NextJS",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=()",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "https://cdn.arolariu.ro",
          },
        ],
      },
    ];
  },

  poweredByHeader: false,
  output: "standalone",

  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
    instrumentationHook: true,
  },

  eslint: {
    // We run ESLint V9 which is not yet supported by the NextJS v14 framework.
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: "tsconfig.json",
  },

  assetPrefix: process.env["USE_CDN"] === "true" ? "https://cdn.arolariu.ro" : undefined,
  trailingSlash: true,
};

const withSerwist = withSerwistInit({
  cacheOnNavigation: true,
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  reloadOnOnline: true,

  register: true,
  disable: process.env.NODE_ENV === "development",
});

const withBundleAnalyzer = withBundleAnalyzerInit({
  enabled: process.env.ANALYZE === "true",
});

const withTranslation = createNextIntlPlugin();
export default withTranslation(withBundleAnalyzer(withSerwist(nextConfig)));
