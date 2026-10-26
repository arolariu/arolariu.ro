/**
 * @fileoverview Cache management using @actions/cache.
 * @module github/scripts/helpers/cache
 *
 * @remarks
 * Provides a clean API for caching dependencies and build outputs.
 * Uses @actions/cache for saving and restoring cached files.
 * Follows Single Responsibility Principle by focusing on cache operations.
 */

import * as cache from "../sdk/cache.ts";
import * as core from "../sdk/core.ts";
import {fs} from "../filesystem/index.ts";

/**
 * Cache save options
 */
export interface CacheSaveOptions extends Readonly<cache.UploadOptions> {
  /** Cache key */
  readonly key: string;
  /** Paths to cache */
  readonly paths: readonly string[];
  /** Forwarded unchanged to the native SDK. */
  readonly enableCrossOsArchive?: boolean;
}

/**
 * Native download options except lookupOnly, which this decorator owns.
 * Use exists for a lookup or the native facade for unmodified restore semantics.
 */
export interface CacheRestoreOptions extends Readonly<Omit<cache.DownloadOptions, "lookupOnly">> {
  /** Primary cache key */
  readonly key: string;
  /** Paths to restore */
  readonly paths: readonly string[];
  /** Fallback keys to try if primary key not found */
  readonly restoreKeys?: readonly string[];
  /** Whether to fail if cache not found */
  readonly failOnMiss?: boolean;
  /** Forwarded unchanged to the native SDK. */
  readonly enableCrossOsArchive?: boolean;
  /** @deprecated Unsupported by the installed SDK; supplying it throws. */
  readonly downloadChunkSize?: number;
}

/**
 * Cache restore result
 */
export interface CacheRestoreResult {
  /** Whether cache was hit */
  readonly hit: boolean;
  /** Key that was matched (may be restore key) */
  readonly matchedKey?: string;
  /** Primary key that was requested */
  readonly requestedKey: string;
}

/**
 * Cache save result
 */
export interface CacheSaveResult {
  /** Cache ID */
  readonly id: number;
  /** Cache key */
  readonly key: string;
}

/**
 * Cache helper interface
 * Provides methods for cache management
 */
export interface ICacheHelper {
  /**
   * Saves files to cache
   * @param options - Save options
   * @returns A positive native save ID, never a fabricated success for -1/0.
   * @throws Original SDK errors or an explicit not-saved error.
   */
  save(options: CacheSaveOptions): Promise<CacheSaveResult>;

  /**
   * Probes before restoring; prefix fallback requires explicit restoreKeys.
   * @param options - Restore options
   * @returns Promise resolving to restore result
   */
  restore(options: CacheRestoreOptions): Promise<CacheRestoreResult>;

  /**
   * Looks up a matching entry without downloading or writing workspace files.
   * @remarks Native SDK-suppressed misses cannot be classified more precisely.
   * @param key - Cache key
   * @param paths - Paths to check
   * @param restoreKeys - Optional restore keys
   * @returns True for an exact key or explicitly allowed fallback; false for a miss.
   * @throws Native SDK errors unchanged.
   */
  exists(key: string, paths: readonly string[], restoreKeys?: readonly string[]): Promise<boolean>;

  /**
   * Generates a cache key from file hashes
   * @param prefix - Key prefix (e.g., 'npm', 'pip')
   * @param files - Required files; any unreadable input rejects the operation.
   * @param suffix - Optional key suffix
   * @returns Promise resolving to generated cache key
   */
  generateKey(prefix: string, files: readonly string[], suffix?: string): Promise<string>;

  /**
   * Creates restore keys from a primary key
   * @param primaryKey - Primary cache key
   * @param fallbackCount - Number of fallback keys to generate
   * @returns Array of restore keys
   */
  createRestoreKeys(primaryKey: string, fallbackCount?: number): string[];

  /**
   * Restores cache with automatic key generation and records state on a miss.
   * @remarks Uses exact policy. No post-job saver is registered; callers save explicitly.
   * A miss does not prove why the SDK found no usable entry. Key and SDK errors propagate.
   * @param prefix - Cache key prefix
   * @param paths - Paths to cache
   * @param lockFiles - Lock files to hash for key
   * @returns Promise resolving to restore result
   */
  autoCache(prefix: string, paths: readonly string[], lockFiles: readonly string[]): Promise<CacheRestoreResult>;
}

/**
 * Implementation of cache helper
 */
export class CacheHelper implements ICacheHelper {
  /**
   * {@inheritDoc ICacheHelper.save}
   */
  async save(options: CacheSaveOptions): Promise<CacheSaveResult> {
    const {key, paths, enableCrossOsArchive, ...nativeOptions} = options;
    core.info(`💾 Saving cache with key: ${key}`);
    const id = await cache.saveCache([...paths], key, nativeOptions, enableCrossOsArchive);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`Cache '${key}' was not saved (native ID: ${id})`);
    core.info(`✅ Cache saved successfully: ${key} (ID ${id})`);
    return {id, key};
  }

  /**
   * {@inheritDoc ICacheHelper.restore}
   */
  async restore(options: CacheRestoreOptions): Promise<CacheRestoreResult> {
    const {key, paths, restoreKeys, failOnMiss, downloadChunkSize, enableCrossOsArchive, ...nativeOptions} = options;
    if (downloadChunkSize !== undefined) throw new TypeError("downloadChunkSize is unsupported by the installed cache SDK");
    const fallback = (restoreKeys?.length ?? 0) > 0;
    const keys = restoreKeys ? [...restoreKeys] : undefined;
    const matched = await cache.restoreCache([...paths], key, keys, {...nativeOptions, lookupOnly: true}, enableCrossOsArchive);
    if (!matched || (!fallback && matched !== key)) return this.miss(key, failOnMiss);
    const restored = await cache.restoreCache([...paths], key, keys, {...nativeOptions, lookupOnly: false}, enableCrossOsArchive);
    if (!restored) return this.miss(key, failOnMiss);
    if (!fallback && restored !== key) throw new Error(`Cache match changed between lookup and restore for '${key}'`);
    return {hit: true, matchedKey: restored, requestedKey: key};
  }

  private miss(key: string, failOnMiss: boolean | undefined): CacheRestoreResult {
    core.warning(`No usable cache entry for '${key}'`);
    if (failOnMiss) throw new Error(`Cache not found for key: ${key}`);
    return {hit: false, requestedKey: key};
  }

  /**
   * {@inheritDoc ICacheHelper.exists}
   */
  async exists(key: string, paths: readonly string[], restoreKeys?: readonly string[]): Promise<boolean> {
    const matched = await cache.restoreCache([...paths], key, restoreKeys ? [...restoreKeys] : undefined, {lookupOnly: true});
    return matched !== undefined && (matched === key || (restoreKeys?.length ?? 0) > 0);
  }

  /**
   * {@inheritDoc ICacheHelper.generateKey}
   */
  async generateKey(prefix: string, files: readonly string[], suffix?: string): Promise<string> {
    const {createHash} = await import("node:crypto");
    const hash = createHash("sha256");
    for (const file of files) hash.update(await fs.readText(file));
    const parts = [prefix, hash.digest("hex").substring(0, 16)];
    if (suffix) parts.push(suffix);
    return parts.join("-");
  }

  /**
   * {@inheritDoc ICacheHelper.createRestoreKeys}
   */
  createRestoreKeys(primaryKey: string, fallbackCount: number = 3): string[] {
    const parts = primaryKey.split("-");
    const restoreKeys: string[] = [];

    // Create progressively shorter keys
    for (let i = parts.length - 1; i >= Math.max(1, parts.length - fallbackCount); i--) {
      const key = parts.slice(0, i).join("-");
      restoreKeys.push(key);
    }

    return restoreKeys;
  }

  /**
   * {@inheritDoc ICacheHelper.autoCache}
   */
  async autoCache(prefix: string, paths: readonly string[], lockFiles: readonly string[]): Promise<CacheRestoreResult> {
    const key = await this.generateKey(prefix, lockFiles);
    const result = await this.restore({key, paths});
    if (!result.hit) {
      core.info("Cache miss - recording state; the caller must save the cache explicitly");
      core.saveState("cache-key", key);
      core.saveState("cache-paths", JSON.stringify(paths));
    }
    return result;
  }
}

/**
 * Common cache configurations for different package managers
 */
export const CacheConfigs = {
  /**
   * npm cache configuration
   */
  npm: {
    prefix: "npm",
    paths: ["~/.npm", "node_modules"],
    lockFiles: ["package-lock.json"],
  },

  /**
   * Yarn cache configuration
   */
  yarn: {
    prefix: "yarn",
    paths: ["~/.yarn/cache", "node_modules"],
    lockFiles: ["yarn.lock"],
  },

  /**
   * pnpm cache configuration
   */
  pnpm: {
    prefix: "pnpm",
    paths: ["~/.pnpm-store", "node_modules"],
    lockFiles: ["pnpm-lock.yaml"],
  },

  /**
   * pip cache configuration
   */
  pip: {
    prefix: "pip",
    paths: ["~/.cache/pip"],
    lockFiles: ["requirements.txt", "setup.py"],
  },

  /**
   * Maven cache configuration
   */
  maven: {
    prefix: "maven",
    paths: ["~/.m2/repository"],
    lockFiles: ["pom.xml"],
  },

  /**
   * Gradle cache configuration
   */
  gradle: {
    prefix: "gradle",
    paths: ["~/.gradle/caches", "~/.gradle/wrapper"],
    lockFiles: ["build.gradle", "settings.gradle"],
  },

  /**
   * Cargo (Rust) cache configuration
   */
  cargo: {
    prefix: "cargo",
    paths: ["~/.cargo/registry", "target"],
    lockFiles: ["Cargo.lock"],
  },

  /**
   * Go modules cache configuration
   */
  go: {
    prefix: "go",
    paths: ["~/go/pkg/mod"],
    lockFiles: ["go.sum"],
  },
} as const;

/**
 * Creates a new cache helper instance
 * @returns Cache helper instance
 * @example
 * ```typescript
 * const cache = createCacheHelper();
 *
 * // Restore cache
 * const result = await cache.restore({
 *   key: 'npm-cache-v1-abc123',
 *   paths: ['node_modules'],
 *   restoreKeys: ['npm-cache-v1-', 'npm-cache-']
 * });
 *
 * if (result.hit) {
 *   console.log('Cache hit!');
 * } else {
 *   // Install dependencies
 *   await cache.save({
 *     key: 'npm-cache-v1-abc123',
 *     paths: ['node_modules']
 *   });
 * }
 *
 * // Or use auto-cache for convenience
 * await cache.autoCache('npm', ['node_modules'], ['package-lock.json']);
 * ```
 */
export function createCacheHelper(): ICacheHelper {
  return new CacheHelper();
}

/**
 * Default cache helper instance
 * Exported for convenience - can be used directly without creating an instance
 */
export const cacheHelper = createCacheHelper();
