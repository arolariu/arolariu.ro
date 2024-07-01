/** @format */

// @ts-check

import withBundleAnalyzerInit from "@next/bundle-analyzer";
import nextMdx from "@next/mdx";
import withSerwistInit from "@serwist/next";
import createNextIntlPlugin from "next-intl/plugin";

const trustedDomains = "*.arolariu.ro clerk.com *.clerk.com accounts.dev *.accounts.dev";
const cspHeader = `
    default-src 'self' blob: data: https: ${trustedDomains};
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https: ${trustedDomains};
    style-src 'self' 'unsafe-inline' https: ${trustedDomains};
    worker-src 'self' blob: data: https: ${trustedDomains};
    base-uri 'none';
    object-src 'none';
    frame-ancestors 'self';
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
            key: "Content-Security-Policy",
            value: cspHeader.replace(/\n/gu, "").trim(),
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
    mdxRs: true,
    instrumentationHook: true,
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  eslint: {
    // We run ESLint V9 which is not yet supported by the NextJS v14 framework.
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: "tsconfig.json",
  },

  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],

  assetPrefix: process.env["USE_CDN"] === "true" ? "https://cdn.arolariu.ro" : undefined,
  compress: false, // We use AFD built-in compression for static assets.
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
const withMdx = nextMdx({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

export default withBundleAnalyzer(withSerwist(withTranslation(withMdx(nextConfig))));
