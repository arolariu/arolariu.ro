/**
 * @fileoverview Main entry point for GitHub Actions helpers
 * @module helpers
 * 
 * Provides a unified interface to all GitHub Actions toolkit helpers.
 * Each helper follows SOLID principles and clean code practices.
 * 
 * @example
 * ```typescript
 * import { env, fs, git, github, artifacts, cache, comments, http } from './helpers';
 * 
 * // Environment helper
 * const apiUrl = env.get('API_URL', 'http://localhost:3000');
 * const commitSha = env.getRequired('GITHUB_SHA');
 * 
 * // File system helper
 * const config = await fs.readJson<Config>('./config.json');
 * await fs.writeText('./output.txt', 'Hello World');
 * 
 * // Git helper
 * await git.fetchBranch('main');
 * const stats = await git.getDiffStats('origin/main', 'HEAD');
 * 
 * // GitHub helper
 * const gh = github.createGitHubHelper(process.env.GITHUB_TOKEN!);
 * await gh.postPullRequestComment(123, '## Results\n\n✅ Success');
 * 
 * // Artifacts helper
 * await artifacts.uploadDirectory('test-results', './test-output');
 * 
 * // Cache helper
 * await cache.autoCache('npm', ['node_modules'], ['package-lock.json']);
 * 
 * // Comments builder
 * const comment = comments.createCommentBuilder()
 *   .addHeading('Build Results')
 *   .addBadge('Success', 'success')
 *   .build();
 * 
 * // HTTP client
 * const response = await http.get('https://api.example.com/data');
 * ```
 */

// Re-export all helpers and their types
export * from "./environment/index.ts";
export * from "./filesystem/index.ts";
export * from "./git/index.ts";
export * from "./github/index.ts";
export * from "./artifacts/index.ts";
export * from "./cache/index.ts";
export * from "./comments/index.ts";
export * from "./http/index.ts";

// Re-export default instances for convenience
export { env } from "./environment/index.ts";
export { fs } from "./filesystem/index.ts";
export { git } from "./git/index.ts";
export { artifacts } from "./artifacts/index.ts";
export { cacheHelper as cache } from "./cache/index.ts";
export { httpClient as http } from "./http/index.ts";

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
