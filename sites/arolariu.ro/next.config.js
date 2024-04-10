// @ts-check

import withBundleAnalyzerInit from "@next/bundle-analyzer";
import withSerwistInit from "@serwist/next";

const trustedDomains = "arolariu.ro *.arolariu.ro clerk.com *.clerk.com accounts.dev *.accounts.dev";
const cspHeader = `
    default-src 'self' ${trustedDomains};
    script-src 'self' 'unsafe-inline' ${trustedDomains};
    style-src 'self' 'unsafe-inline' ${trustedDomains};
    img-src 'self' blob: data: 'unsafe-inline' ${trustedDomains};
    font-src 'self' ${trustedDomains};
    object-src 'self' ${trustedDomains};
    worker-src 'self' ${trustedDomains} blob: data:;
    base-uri 'self' ${trustedDomains};
    form-action 'self' ${trustedDomains};
    frame-ancestors 'self' ${trustedDomains};
    block-all-mixed-content;
    upgrade-insecure-requests;
`;

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
            key:
              process.env.NODE_ENV === "development"
                ? "Content-Security-Policy-Report-Only"
                : "Content-Security-Policy",
            value: cspHeader.replace(/\n/g, ""),
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
};

const withSerwist = withSerwistInit({
  cacheOnNavigation: true,
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  reloadOnOnline: true,

  disable: process.env.NODE_ENV === "development",
});

const withBundleAnalyzer = withBundleAnalyzerInit({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer(withSerwist(nextConfig));
