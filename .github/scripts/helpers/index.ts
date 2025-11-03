/**
 * @fileoverview Main entry point for GitHub Actions helpers
 * @module helpers
 */

// Re-export all helpers and their types
export * from "./artifacts/index.ts";
export * from "./cache/index.ts";
export * from "./comments/index.ts";
export * from "./constants.ts";
export * from "./environment/index.ts";
export * from "./filesystem/index.ts";
export * from "./git/index.ts";
export * from "./github/index.ts";
export * from "./http/index.ts";
export * from "./newman/index.ts";
export * from "./playwright/index.ts";
export * from "./vitest/index.ts";

// Re-export default instances for convenience
export {artifacts} from "./artifacts/index.ts";
export {cacheHelper as cache} from "./cache/index.ts";
export {env} from "./environment/index.ts";
export {fs} from "./filesystem/index.ts";
export {git} from "./git/index.ts";
export {httpClient as http} from "./http/index.ts";
export {newman} from "./newman/index.ts";
export {playwright} from "./playwright/index.ts";
export {vitest} from "./vitest/index.ts";

/**
 * Helper factory functions
 * Provides convenient access to all helper creation functions
 */
export const Helpers = {
  /** Creates environment helper instance */
  createEnvironment: () => import("./environment/index.ts").then((m) => m.createEnvironmentHelper()),

  /** Creates filesystem helper instance */
  createFileSystem: () => import("./filesystem/index.ts").then((m) => m.createFileSystemHelper()),

  /** Creates Git helper instance */
  createGit: () => import("./git/index.ts").then((m) => m.createGitHelper()),

  /** Creates GitHub helper instance */
  createGitHub: (token: string) => import("./github/index.ts").then((m) => m.createGitHubHelper(token)),

  /** Creates artifacts helper instance */
  createArtifacts: () => import("./artifacts/index.ts").then((m) => m.createArtifactHelper()),

  /** Creates cache helper instance */
  createCache: () => import("./cache/index.ts").then((m) => m.createCacheHelper()),

  /** Creates comment builder instance */
  createCommentBuilder: () => import("./comments/index.ts").then((m) => m.createCommentBuilder()),

  /** Creates HTTP client instance */
  createHttp: (userAgent?: string) => import("./http/index.ts").then((m) => m.createHttpHelper(userAgent)),

  /** Creates Newman parser instance */
  createNewman: () => import("./newman/index.ts").then((m) => m.createNewmanHelper()),

  /** Creates Playwright helper instance */
  createPlaywright: () => import("./playwright/index.ts").then((m) => m.createPlaywrightHelper()),

  /** Creates Vitest helper instance */
  createVitest: () => import("./vitest/index.ts").then((m) => m.createVitestHelper()),
} as const;

/**
 * Helper utilities
 * Provides convenient access to utility classes
 */
export const Utils = {
  /** Markdown utility functions */
  Markdown: () => import("./comments/index.ts").then((m) => m.MarkdownUtils),

  /** Cache configurations for common package managers */
  CacheConfigs: () => import("./cache/index.ts").then((m) => m.CacheConfigs),
} as const;
