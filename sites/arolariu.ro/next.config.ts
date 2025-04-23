/** @format */

import withBundleAnalyzerInit from "@next/bundle-analyzer";
import type {NextConfig} from "next";
import createNextIntlPlugin from "next-intl/plugin";

const trustedDomains = "*.arolariu.ro arolariu.ro *.clerk.com clerk.com *.accounts.dev accounts.dev";
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

const isDevBuild = process.env.NODE_ENV === "development";
console.log(">>> isDevBuild", isDevBuild);
console.log(">>> NODE_ENV", process.env.NODE_ENV);

const nextConfig: NextConfig = {
  basePath: "",

  allowedDevOrigins: ["dummyImage.com", "localhost:3000", "loremflickr.com", "picsum.photos"],

  compiler: {
    removeConsole: isDevBuild ? false : {exclude: ["error", "warn"]},
    reactRemoveProperties: {
      properties: ["^data-testid$"],
    },
  },

  images: {
    remotePatterns: [
      new URL("https://cdn.arolariu.ro"), // CDN assets.
      new URL("https://clerk.com"), // Clerk - auth-as-a-service assets.
      new URL("https://accounts.dev"), // Clerk - auth-as-a-service assets.
      new URL("https://*.clerk.com"), // Clerk - auth-as-a-service assets.
      new URL("https://*.accounts.dev"), // Clerk - auth-as-a-service assets.
      new URL("https://arolariustorage.blob.core.windows.net"), // External assets.
      new URL("https://*.googleusercontent.com"), // External assets.
      new URL("https://*.githubusercontent.com"), // External assets.

      ...(isDevBuild ? [new URL("https://dummyimage.com")] : []), // Dummy image assets.
      ...(isDevBuild ? [new URL("https://picsum.photos")] : []), // Dummy image assets.
      ...(isDevBuild ? [new URL("https://loremflickr.com")] : []), // Dummy image assets.
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
          isDevBuild
            ? {
                key: "Content-Security-Policy-Report-Only",
                value: cspHeader.replace(/\n/gu, "").trim(),
              }
            : {
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
    allowDevelopmentBuild: isDevBuild ? true : undefined,
    serverSourceMaps: isDevBuild,
    webpackMemoryOptimizations: !isDevBuild,
    disableOptimizedLoading: isDevBuild,
    optimizeServerReact: !isDevBuild,
    serverMinification: !isDevBuild,
    optimizePackageImports: ["@arolariu/components"],
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  productionBrowserSourceMaps: isDevBuild,
  reactProductionProfiling: isDevBuild,
  transpilePackages: ["@arolariu/components"],

  webpack: (config) => {
    // Remove minifcation, chunking and optimization for dev builds
    if (isDevBuild) {
      console.log(">>> ⚙️ Removing minification, chunking and optimization for dev builds");
      config.devtool = "source-map";
      config.optimization.chunkIds = "named";
      config.optimization.concatenateModules = false;
      config.optimization.mangleExports = false;
      config.optimization.mangleWasmImports = false;
      config.optimization.mergeDuplicateChunks = false;
      config.optimization.minimize = false;
      config.optimization.minimizer = [];
      config.optimization.moduleIds = "named";
      config.optimization.nodeEnv = "development";
      config.optimization.portableRecords = true;
      config.optimization.providedExports = true;
      config.optimization.runtimeChunk = false;
      config.optimization.splitChunks = false;
    }

    return config;
  },

  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: "tsconfig.json",
  },

  pageExtensions: ["ts", "tsx"],
  assetPrefix: process.env["USE_CDN"] === "true" ? "https://cdn.arolariu.ro" : undefined,
  compress: false, // We use AFD built-in compression for static assets.
  trailingSlash: true,
};

const withBundleAnalyzer = withBundleAnalyzerInit({
  enabled: process.env["ANALYZE"] === "true",
});

const withTranslation = createNextIntlPlugin();

const finalConfig = withBundleAnalyzer(withTranslation(nextConfig));
export default finalConfig;
