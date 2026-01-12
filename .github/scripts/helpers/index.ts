/**
 * @fileoverview Aggregated helper exports for GitHub Actions scripts.
 * @module github/actions-helpers
 *
 * @remarks
 * This module acts as a stable import surface for `.github/scripts/**`.
 *
 * **Why this exists**:
 * - Consolidates commonly used helpers behind one barrel export.
 * - Provides both named helper instances (e.g. `git`, `fs`, `http`) and
 *   factory helpers (see {@link Helpers}) for cases where lazy-loading reduces
 *   startup cost in GitHub Actions.
 *
 * **Design trade-off**:
 * - The factory functions use dynamic imports which return `Promise`s; callers
 *   should await them (or allow top-level `await` in ESM).
 *
 * @example
 * ```ts
 * import {git, env} from "../helpers/index.ts";
 *
 * const sha = env.getRequired("GITHUB_SHA");
 * const changed = await git.getChangedFiles("origin/main", sha);
 * ```
 */

// Re-export all helpers and their types.
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

// Re-export default instances for convenience.
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
 * Helper factory functions for lazy-loading helpers.
 *
 * @remarks
 * These factories intentionally return `Promise`s because the underlying
 * implementation modules are loaded dynamically.
 *
 * Use factories when:
 * - A workflow mode only needs a subset of helpers.
 * - You want faster cold-start time in GitHub Actions scripts.
 *
 * Prefer the pre-created exports (e.g. `git`, `fs`, `env`) when the helper is
 * always needed.
 *
 * @example
 * ```ts
 * const gh = await Helpers.createGitHub(token);
 * await gh.upsertComment(prNumber, body, "my-comment-key");
 * ```
 */
export const Helpers = {
  /**
   * Creates an environment helper instance.
   *
   * @returns A promise resolving to the environment helper.
   */
  createEnvironment: () => import("./environment/index.ts").then((m) => m.createEnvironmentHelper()),

  /**
   * Creates a filesystem helper instance.
   *
   * @returns A promise resolving to the filesystem helper.
   */
  createFileSystem: () => import("./filesystem/index.ts").then((m) => m.createFileSystemHelper()),

  /**
   * Creates a Git helper instance.
   *
   * @returns A promise resolving to the Git helper.
   */
  createGit: () => import("./git/index.ts").then((m) => m.createGitHelper()),

  /**
   * Creates a GitHub helper instance.
   *
   * @remarks
   * The `token` should be the workflow-provided `GITHUB_TOKEN` (or an app token)
   * with permissions to read/write PR comments.
   *
   * @param token - GitHub token used for API authorization.
   * @returns A promise resolving to the GitHub helper.
   */
  createGitHub: (token: string) => import("./github/index.ts").then((m) => m.createGitHubHelper(token)),

  /**
   * Creates an artifacts helper instance.
   *
   * @returns A promise resolving to the artifacts helper.
   */
  createArtifacts: () => import("./artifacts/index.ts").then((m) => m.createArtifactHelper()),

  /**
   * Creates a cache helper instance.
   *
   * @returns A promise resolving to the cache helper.
   */
  createCache: () => import("./cache/index.ts").then((m) => m.createCacheHelper()),

  /**
   * Creates a comment builder instance.
   *
   * @returns A promise resolving to the comment builder.
   */
  createCommentBuilder: () => import("./comments/index.ts").then((m) => m.createCommentBuilder()),

  /**
   * Creates an HTTP helper instance.
   *
   * @param userAgent - Optional User-Agent string to attach to outbound requests.
   * @returns A promise resolving to the HTTP helper.
   */
  createHttp: (userAgent?: string) => import("./http/index.ts").then((m) => m.createHttpHelper(userAgent)),

  /**
   * Creates a Newman helper instance.
   *
   * @returns A promise resolving to the Newman helper.
   */
  createNewman: () => import("./newman/index.ts").then((m) => m.createNewmanHelper()),

  /**
   * Creates a Playwright helper instance.
   *
   * @returns A promise resolving to the Playwright helper.
   */
  createPlaywright: () => import("./playwright/index.ts").then((m) => m.createPlaywrightHelper()),

  /**
   * Creates a Vitest helper instance.
   *
   * @returns A promise resolving to the Vitest helper.
   */
  createVitest: () => import("./vitest/index.ts").then((m) => m.createVitestHelper()),
} as const;

/**
 * Helper utilities for accessing non-instance helper exports.
 *
 * @remarks
 * This is primarily used to avoid importing sub-modules directly from callers,
 * keeping `.github/scripts/**` ergonomics consistent.
 */
export const Utils = {
  /**
   * Provides Markdown utility functions used for comment generation.
   *
   * @returns A promise resolving to the Markdown utilities.
   */
  Markdown: () => import("./comments/index.ts").then((m) => m.MarkdownUtils),

  /**
   * Provides cache configurations for common package managers.
   *
   * @returns A promise resolving to cache configuration presets.
   */
  CacheConfigs: () => import("./cache/index.ts").then((m) => m.CacheConfigs),
} as const;
