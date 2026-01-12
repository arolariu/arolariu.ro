/**
 * @fileoverview Cache management using @actions/cache.
 * @module github/scripts/helpers/cache
 *
 * @remarks
 * Provides a clean API for caching dependencies and build outputs.
 * Uses @actions/cache for saving and restoring cached files.
 * Follows Single Responsibility Principle by focusing on cache operations.
 */

import * as cache from "@actions/cache";
import * as core from "@actions/core";

/**
 * Cache save options
 */
export interface CacheSaveOptions {
  /** Cache key */
  key: string;
  /** Paths to cache */
  paths: string[];
  /** Upload chunk size in bytes */
  uploadChunkSize?: number;
}

/**
 * Cache restore options
 */
export interface CacheRestoreOptions {
  /** Primary cache key */
  key: string;
  /** Paths to restore */
  paths: string[];
  /** Fallback keys to try if primary key not found */
  restoreKeys?: string[];
  /** Whether to fail if cache not found */
  failOnMiss?: boolean;
  /** Download chunk size in bytes */
  downloadChunkSize?: number;
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
   * @returns Promise resolving to save result
   */
  save(options: CacheSaveOptions): Promise<CacheSaveResult>;

  /**
   * Restores files from cache
   * @param options - Restore options
   * @returns Promise resolving to restore result
   */
  restore(options: CacheRestoreOptions): Promise<CacheRestoreResult>;

  /**
   * Checks if cache entry exists for key
   * @param key - Cache key
   * @param paths - Paths to check
   * @param restoreKeys - Optional restore keys
   * @returns Promise resolving to true if cache exists
   */
  exists(key: string, paths: string[], restoreKeys?: string[]): Promise<boolean>;

  /**
   * Generates a cache key from file hashes
   * @param prefix - Key prefix (e.g., 'npm', 'pip')
   * @param files - Files to hash for key generation
   * @param suffix - Optional key suffix
   * @returns Promise resolving to generated cache key
   */
  generateKey(prefix: string, files: string[], suffix?: string): Promise<string>;

  /**
   * Creates restore keys from a primary key
   * @param primaryKey - Primary cache key
   * @param fallbackCount - Number of fallback keys to generate
   * @returns Array of restore keys
   */
  createRestoreKeys(primaryKey: string, fallbackCount?: number): string[];

  /**
   * Saves and restores cache with automatic key generation
   * @param prefix - Cache key prefix
   * @param paths - Paths to cache
   * @param lockFiles - Lock files to hash for key
   * @returns Promise resolving to restore result
   */
  autoCache(prefix: string, paths: string[], lockFiles: string[]): Promise<CacheRestoreResult>;
}

/**
 * Implementation of cache helper
 */
export class CacheHelper implements ICacheHelper {
  /**
   * {@inheritDoc ICacheHelper.save}
   */
  async save(options: CacheSaveOptions): Promise<CacheSaveResult> {
    try {
      core.info(`💾 Saving cache with key: ${options.key}`);
      core.debug(`Caching paths: ${options.paths.join(", ")}`);

      const saveOptions = options.uploadChunkSize ? {uploadChunkSize: options.uploadChunkSize} : {};

      const cacheId = await cache.saveCache(options.paths, options.key, saveOptions);

      core.info(`✅ Cache saved successfully: ${options.key}`);
      core.info(`   Cache ID: ${cacheId}`);

      return {
        id: cacheId,
        key: options.key,
      };
    } catch (error) {
      const err = error as Error;

      // Check for specific cache errors
      if (err.message.includes("Cache already exists")) {
        core.warning(`Cache with key '${options.key}' already exists`);
        throw error;
      }

      core.error(`❌ Failed to save cache '${options.key}': ${err.message}`);
      throw new Error(`Failed to save cache: ${err.message}`);
    }
  }

  /**
   * {@inheritDoc ICacheHelper.restore}
   */
  async restore(options: CacheRestoreOptions): Promise<CacheRestoreResult> {
    try {
      core.info(`📦 Restoring cache with key: ${options.key}`);

      if (options.restoreKeys && options.restoreKeys.length > 0) {
        core.debug(`Fallback keys: ${options.restoreKeys.join(", ")}`);
      }

      const restoreOptions = options.downloadChunkSize ? {lookupOnly: false} : {};

      const cacheKey = await cache.restoreCache(options.paths, options.key, options.restoreKeys, restoreOptions);

      if (!cacheKey) {
        core.warning(`❌ Cache miss: ${options.key}`);

        if (options.failOnMiss) {
          throw new Error(`Cache not found for key: ${options.key}`);
        }

        return {
          hit: false,
          requestedKey: options.key,
        };
      }

      const isExactMatch = cacheKey === options.key;
      const matchType = isExactMatch ? "exact" : "partial";

      core.info(`✅ Cache ${matchType} hit: ${cacheKey}`);

      return {
        hit: true,
        matchedKey: cacheKey,
        requestedKey: options.key,
      };
    } catch (error) {
      const err = error as Error;
      core.error(`❌ Failed to restore cache: ${err.message}`);
      throw new Error(`Failed to restore cache: ${err.message}`);
    }
  }

  /**
   * {@inheritDoc ICacheHelper.exists}
   */
  async exists(key: string, paths: string[], restoreKeys?: string[]): Promise<boolean> {
    try {
      const restoreOpts: CacheRestoreOptions = {
        key,
        paths,
        failOnMiss: false,
      };
      if (restoreKeys) {
        restoreOpts.restoreKeys = restoreKeys;
      }

      const result = await this.restore(restoreOpts);

      return result.hit;
    } catch {
      return false;
    }
  }

  /**
   * {@inheritDoc ICacheHelper.generateKey}
   */
  async generateKey(prefix: string, files: string[], suffix?: string): Promise<string> {
    const {createHash} = await import("node:crypto");
    const {readFile} = await import("node:fs/promises");

    try {
      core.debug(`Generating cache key from files: ${files.join(", ")}`);

      const hash = createHash("sha256");

      // Hash each file's contents
      for (const file of files) {
        try {
          const content = await readFile(file, "utf-8");
          hash.update(content);
        } catch (error) {
          const err = error as Error;
          core.warning(`Could not read file for cache key generation: ${file} - ${err.message}`);
        }
      }

      const hashValue = hash.digest("hex").substring(0, 16);
      const parts = [prefix, hashValue];

      if (suffix) {
        parts.push(suffix);
      }

      const key = parts.join("-");
      core.debug(`Generated cache key: ${key}`);

      return key;
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to generate cache key: ${err.message}`);
    }
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
  async autoCache(prefix: string, paths: string[], lockFiles: string[]): Promise<CacheRestoreResult> {
    try {
      // Generate cache key from lock files
      const key = await this.generateKey(prefix, lockFiles);
      const restoreKeys = this.createRestoreKeys(key);

      core.info(`🔄 Auto-cache for ${prefix}`);
      core.debug(`Key: ${key}`);
      core.debug(`Restore keys: ${restoreKeys.join(", ")}`);

      // Try to restore from cache
      const result = await this.restore({
        key,
        paths,
        restoreKeys,
        failOnMiss: false,
      });

      if (!result.hit) {
        core.info(`Cache miss - will save after workflow completes`);

        // Register post-job action to save cache
        core.saveState("cache-key", key);
        core.saveState("cache-paths", JSON.stringify(paths));
      }

      return result;
    } catch (error) {
      const err = error as Error;
      core.warning(`Auto-cache failed: ${err.message}`);

      return {
        hit: false,
        requestedKey: prefix,
      };
    }
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
