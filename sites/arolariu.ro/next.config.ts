/**
 * @fileoverview Next.js configuration for the arolariu.ro website.
 * @module sites/arolariu.ro/next.config
 *
 * @remarks
 * Centralizes security headers (CSP), image remote patterns, build-time env injection,
 * and plugin configuration (e.g., next-intl).
 */

import type {NextConfig} from "next";
import createNextIntlPlugin from "next-intl/plugin";
import type {RemotePattern} from "next/dist/shared/lib/image-config";
import {deriveUniqueArtifactOrigins, WEBLLM_BINARY_LIBRARY_HOST} from "./src/app/domains/invoices/_components/ai/modelArtifactHosts";
import {LOCAL_INVOICE_ASSISTANT_MODELS} from "./src/app/domains/invoices/_components/ai/modelCatalog";

const trustedDomains = "*.arolariu.ro arolariu.ro *.clerk.com clerk.com *.accounts.dev accounts.dev";
const isProduction = process.env["SITE_ENV"] === "PRODUCTION";
const localDevSources = !isProduction ? "http://localhost:* http://127.0.0.1:*" : "";
const upgradeInsecure = isProduction ? "upgrade-insecure-requests;" : "";

/**
 * Azure Blob Storage CSP origins for scan upload/download.
 *
 * @remarks
 * Required for existing scan upload/download flows:
 * - `upload-scans/_context/ScanUploadContext.tsx`: Direct `fetch(sasUrl)` to Azure Blob SAS URLs
 * - `_components/ScanCard.tsx`: Direct `fetch(scan.blobUrl)` for scan image downloads
 *
 * Matches existing image remote pattern `**.blob.core.windows.net`.
 *
 * **Production**: Azure Blob Storage (*.blob.core.windows.net)
 * **Development**: Azurite local emulator (localhost:10000) for testing
 */
const azureBlobOrigins = isProduction
  ? "https://*.blob.core.windows.net"
  : "https://*.blob.core.windows.net http://localhost:10000 http://127.0.0.1:10000";

/**
 * Local AI assistant CSP origins for model artifacts and WebLLM libraries.
 *
 * @remarks
 * **Model artifact origins (derived from catalog):**
 * Extracts unique CSP origins from all selectable model `artifactHost` URLs.
 * Ensures CSP stays in sync with catalog changes.
 *
 * **WebLLM binary library origin (explicit):**
 * Required for WebLLM 0.2.82 prebuilt WASM model libraries.
 * Source: `@mlc-ai/web-llm/lib/index.js` modelLibURLPrefix.
 * Not derived from catalog because it's a runtime dependency.
 *
 * **CSP usage:**
 * - Model artifacts (HuggingFace): model weights, tokenizer, config
 * - Binary libraries (GitHub raw): WebLLM WASM execution libraries
 *
 * **Security:**
 * - Explicit allowlist, not broad `https:`
 * - Derived origins update automatically when catalog changes
 * - Binary library origin is explicit and documented
 */
const modelArtifactOrigins = deriveUniqueArtifactOrigins(LOCAL_INVOICE_ASSISTANT_MODELS.map((model) => model.artifactHost));
const webLlmBinaryLibraryOrigin = WEBLLM_BINARY_LIBRARY_HOST;
const webLlmCspOrigins = [...modelArtifactOrigins, webLlmBinaryLibraryOrigin].join(" ");

const cspHeader = `
    default-src 'self' blob: data: ${trustedDomains};
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https: ${trustedDomains};
    style-src 'self' 'unsafe-inline' https: ${trustedDomains};
    img-src 'self' blob: data: https: ${trustedDomains} ${localDevSources};
    worker-src 'self' blob: data: ${trustedDomains};
    connect-src 'self' ${trustedDomains} ${azureBlobOrigins} ${webLlmCspOrigins};
    base-uri 'none';
    object-src 'none';
    frame-ancestors 'self';
    ${upgradeInsecure}
`;

const isCdnEnabled = process.env["USE_CDN"] === "true";
console.log(">>> CDN enabled:", isCdnEnabled ? "✅" : "❌");

const isDebugBuild = process.env["NODE_ENV"] === "development";
console.log(">>> isDebugBuild", isDebugBuild ? "✅" : "❌");
console.log(">>> NODE_ENV", process.env["NODE_ENV"]);

const nextConfig: NextConfig = {
  basePath: "",

  // Inline environment variables at build time for client-side access.
  // These values are embedded into the JavaScript bundle during build,
  // making them available to client components without NEXT_PUBLIC_ prefix.
  env: {
    SITE_ENV: process.env["SITE_ENV"] ?? "",
    SITE_URL: process.env["SITE_URL"] ?? "",
    SITE_NAME: process.env["SITE_NAME"] ?? "",
    COMMIT_SHA: process.env["COMMIT_SHA"] ?? "",
    TIMESTAMP: process.env["TIMESTAMP"] ?? "",
  },

  logging: {
    serverFunctions: isDebugBuild,
    incomingRequests: isDebugBuild,
    fetches: {
      fullUrl: isDebugBuild,
    },
  },

  compiler: {
    removeConsole: isDebugBuild ? false : {exclude: ["error", "warn"]},
    reactRemoveProperties: {
      properties: ["^data-testid$"],
    },
  },

  images: {
    qualities: [50, 75, 100],
    remotePatterns: [
      {protocol: "https", hostname: "**.blob.core.windows.net"}, // Azure Blob Storage (any account).
      {protocol: "https", hostname: "**.arolariu.ro"}, // Platform subdomains (including CDN).
      {protocol: "https", hostname: "**.clerk.com"}, // Clerk - auth-as-a-service assets.
      {protocol: "https", hostname: "**.accounts.dev"}, // Clerk - auth-as-a-service assets.
      {protocol: "https", hostname: "**.googleusercontent.com"}, // External assets.
      {protocol: "https", hostname: "**.githubusercontent.com"}, // External assets.
      {protocol: "http", hostname: "localhost", port: "10000"}, // Azurite blob storage (local Docker).
      ...(isDebugBuild
        ? ([
            {
              protocol: "https",
              hostname: "loremflickr.com",
            },
            {
              protocol: "https",
              hostname: "picsum.photos",
            },
            {
              protocol: "https",
              hostname: "dummyimage.com",
            },
          ] satisfies RemotePattern[])
        : []),
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
          isDebugBuild
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

  transpilePackages: ["import-in-the-middle", "require-in-the-middle"],

  experimental: {
    // Enable server source maps in development for debugging
    serverSourceMaps: isDebugBuild,

    // Enable Turbopack source maps in development
    turbopackSourceMaps: isDebugBuild,

    // Disable minification in development for readable debugging
    turbopackMinify: !isDebugBuild,

    // todo: switch to `!isDebugBuild` when Turbopack supports this features fully.
    turbopackTreeShaking: false,

    // Disable optimized loading in dev for better debugging
    disableOptimizedLoading: isDebugBuild,

    // Disable React optimizations in dev for debugging
    optimizeServerReact: !isDebugBuild,

    // Disable server minification in development
    serverMinification: !isDebugBuild,

    globalNotFound: true,
    typedEnv: true,
    optimizePackageImports: ["@arolariu/components"],
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  typescript: {
    tsconfigPath: "tsconfig.json",
  },

  pageExtensions: ["ts", "tsx"],
  assetPrefix: isCdnEnabled ? "https://cdn.arolariu.ro" : undefined,
  compress: false, // We use AFD built-in compression for static assets.
  trailingSlash: true,
  typedRoutes: true,

  enablePrerenderSourceMaps: isDebugBuild,
  productionBrowserSourceMaps: isDebugBuild,
  reactProductionProfiling: isDebugBuild,
};

const withTranslation = createNextIntlPlugin({
  experimental: {
    createMessagesDeclaration: "./messages/en.json",
  },
});

const finalConfig = withTranslation(nextConfig);
isDebugBuild && console.debug("Final Next.js config:", finalConfig);

export default finalConfig;
