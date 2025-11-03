/**
 * @fileoverview Unit tests for cache helper
 */

import * as cache from "@actions/cache";
import * as core from "@actions/core";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {createCacheHelper, type CacheRestoreOptions, type CacheSaveOptions} from "./index";

// Mock @actions/cache
vi.mock("@actions/cache");
vi.mock("@actions/core");

describe("CacheHelper", () => {
  let cacheHelper: ReturnType<typeof createCacheHelper>;

  beforeEach(() => {
    vi.clearAllMocks();
    cacheHelper = createCacheHelper();
  });

  it("should create a cache helper instance", () => {
    expect(cacheHelper).toBeDefined();
    expect(typeof cacheHelper.save).toBe("function");
    expect(typeof cacheHelper.restore).toBe("function");
    expect(typeof cacheHelper.exists).toBe("function");
    expect(typeof cacheHelper.generateKey).toBe("function");
    expect(typeof cacheHelper.autoCache).toBe("function");
  });

  describe("save", () => {
    it("should save cache successfully", async () => {
      vi.mocked(cache.saveCache).mockResolvedValue(12345);

      const options: CacheSaveOptions = {
        key: "test-key",
        paths: ["/path/to/cache"],
      };

      const result = await cacheHelper.save(options);

      expect(result).toEqual({
        id: 12345,
        key: "test-key",
      });
      expect(cache.saveCache).toHaveBeenCalledWith(["/path/to/cache"], "test-key", {});
    });

    it("should save cache with upload chunk size", async () => {
      vi.mocked(cache.saveCache).mockResolvedValue(67890);

      const options: CacheSaveOptions = {
        key: "test-key",
        paths: ["/path/to/cache"],
        uploadChunkSize: 8388608,
      };

      await cacheHelper.save(options);

      expect(cache.saveCache).toHaveBeenCalledWith(["/path/to/cache"], "test-key", {
        uploadChunkSize: 8388608,
      });
    });

    it("should handle cache already exists error", async () => {
      vi.mocked(cache.saveCache).mockRejectedValue(new Error("Cache already exists"));

      const options: CacheSaveOptions = {
        key: "existing-key",
        paths: ["/path/to/cache"],
      };

      await expect(cacheHelper.save(options)).rejects.toThrow("Cache already exists");
      expect(core.warning).toHaveBeenCalledWith("Cache with key 'existing-key' already exists");
    });

    it("should handle save errors", async () => {
      vi.mocked(cache.saveCache).mockRejectedValue(new Error("Save failed"));

      const options: CacheSaveOptions = {
        key: "test-key",
        paths: ["/path/to/cache"],
      };

      await expect(cacheHelper.save(options)).rejects.toThrow("Failed to save cache: Save failed");
    });
  });

  describe("restore", () => {
    it("should restore cache with exact match", async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue("test-key-exact");

      const options: CacheRestoreOptions = {
        key: "test-key-exact",
        paths: ["/path/to/cache"],
      };

      const result = await cacheHelper.restore(options);

      expect(result).toEqual({
        hit: true,
        matchedKey: "test-key-exact",
        requestedKey: "test-key-exact",
      });
    });

    it("should restore cache with restore keys", async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue("test-key-fallback");

      const options: CacheRestoreOptions = {
        key: "test-key-v1",
        paths: ["/path/to/cache"],
        restoreKeys: ["test-key-", "test-"],
      };

      const result = await cacheHelper.restore(options);

      expect(result).toEqual({
        hit: true,
        matchedKey: "test-key-fallback",
        requestedKey: "test-key-v1",
      });
      expect(cache.restoreCache).toHaveBeenCalledWith(["/path/to/cache"], "test-key-v1", ["test-key-", "test-"], {});
    });

    it("should handle cache miss without failOnMiss", async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue(undefined);

      const options: CacheRestoreOptions = {
        key: "nonexistent-key",
        paths: ["/path/to/cache"],
        failOnMiss: false,
      };

      const result = await cacheHelper.restore(options);

      expect(result).toEqual({
        hit: false,
        requestedKey: "nonexistent-key",
      });
    });

    it("should throw error on cache miss with failOnMiss", async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue(undefined);

      const options: CacheRestoreOptions = {
        key: "nonexistent-key",
        paths: ["/path/to/cache"],
        failOnMiss: true,
      };

      await expect(cacheHelper.restore(options)).rejects.toThrow("Cache not found for key: nonexistent-key");
    });

    it("should handle restore errors", async () => {
      vi.mocked(cache.restoreCache).mockRejectedValue(new Error("Restore failed"));

      const options: CacheRestoreOptions = {
        key: "test-key",
        paths: ["/path/to/cache"],
      };

      await expect(cacheHelper.restore(options)).rejects.toThrow("Failed to restore cache: Restore failed");
    });
  });

  describe("exists", () => {
    it("should return true when cache exists", async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue("test-key");

      const result = await cacheHelper.exists("test-key", ["/path/to/cache"]);

      expect(result).toBe(true);
    });

    it("should return false when cache does not exist", async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue(undefined);

      const result = await cacheHelper.exists("nonexistent-key", ["/path/to/cache"]);

      expect(result).toBe(false);
    });

    it("should return false on error", async () => {
      vi.mocked(cache.restoreCache).mockRejectedValue(new Error("Error"));

      const result = await cacheHelper.exists("test-key", ["/path/to/cache"]);

      expect(result).toBe(false);
    });

    it("should pass restore keys to exists check", async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue("test-key");

      await cacheHelper.exists("test-key", ["/path/to/cache"], ["test-"]);

      expect(cache.restoreCache).toHaveBeenCalledWith(["/path/to/cache"], "test-key", ["test-"], expect.any(Object));
    });
  });

  describe("generateKey", () => {
    it("should generate cache key from files", async () => {
      const key = await cacheHelper.generateKey("npm", ["package-lock.json"]);

      expect(key).toMatch(/^npm-[a-f0-9]{16}$/);
    });

    it("should generate cache key with suffix", async () => {
      const key = await cacheHelper.generateKey("npm", ["package-lock.json"], "linux");

      expect(key).toMatch(/^npm-[a-f0-9]{16}-linux$/);
    });

    it("should handle missing files gracefully", async () => {
      const key = await cacheHelper.generateKey("npm", ["nonexistent-file.json"]);

      expect(key).toMatch(/^npm-[a-f0-9]{16}$/);
      expect(core.warning).toHaveBeenCalled();
    });

    it("should generate consistent keys for same content", async () => {
      const key1 = await cacheHelper.generateKey("test", ["test-file.txt"]);
      const key2 = await cacheHelper.generateKey("test", ["test-file.txt"]);

      expect(key1).toBe(key2);
    });
  });

  describe("createRestoreKeys", () => {
    it("should create restore keys from primary key", () => {
      const restoreKeys = cacheHelper.createRestoreKeys("npm-abc123-v1-linux", 3);

      expect(restoreKeys).toEqual(["npm-abc123-v1", "npm-abc123", "npm"]);
    });

    it("should limit fallback count", () => {
      const restoreKeys = cacheHelper.createRestoreKeys("npm-abc123-v1-linux", 2);

      expect(restoreKeys).toEqual(["npm-abc123-v1", "npm-abc123"]);
    });

    it("should handle short keys", () => {
      const restoreKeys = cacheHelper.createRestoreKeys("npm", 3);

      expect(restoreKeys).toEqual([]);
    });
  });

  describe("autoCache", () => {
    it("should auto-cache with cache hit", async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue("npm-abc123");

      const result = await cacheHelper.autoCache("npm", ["node_modules"], ["package-lock.json"]);

      expect(result.hit).toBe(true);
      expect(result.matchedKey).toBe("npm-abc123");
    });

    it("should auto-cache with cache miss", async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue(undefined);

      const result = await cacheHelper.autoCache("npm", ["node_modules"], ["package-lock.json"]);

      expect(result.hit).toBe(false);
      expect(core.saveState).toHaveBeenCalledWith("cache-key", expect.any(String));
      expect(core.saveState).toHaveBeenCalledWith("cache-paths", expect.any(String));
    });

    it("should handle auto-cache errors gracefully", async () => {
      vi.mocked(cache.restoreCache).mockRejectedValue(new Error("Auto-cache failed"));

      const result = await cacheHelper.autoCache("npm", ["node_modules"], ["package-lock.json"]);

      expect(result.hit).toBe(false);
      expect(core.warning).toHaveBeenCalled();
    });
  });
});
