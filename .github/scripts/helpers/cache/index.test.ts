/**
 * @fileoverview Unit tests for cache helper.
 * @module github/scripts/helpers/cache/tests
 *
 * @remarks
 * Validates cache helper behavior using mocked GitHub Actions modules.
 */

import * as cache from "@actions/cache";
import * as core from "@actions/core";
import {readFileSync} from "node:fs";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {createCacheHelper, type CacheRestoreOptions, type CacheSaveOptions} from "./index";

// Mock @actions/cache
vi.mock("@actions/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@actions/cache")>()),
  saveCache: vi.fn(),
  restoreCache: vi.fn(),
}));
vi.mock("@actions/core");

describe("CacheHelper", () => {
  let cacheHelper: ReturnType<typeof createCacheHelper>;

  beforeEach(() => {
    vi.resetAllMocks();
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
      expect(cache.saveCache).toHaveBeenCalledWith(["/path/to/cache"], "test-key", {}, undefined);
    });

    it("should save cache with upload chunk size", async () => {
      vi.mocked(cache.saveCache).mockResolvedValue(67890);

      const options: CacheSaveOptions = {
        key: "test-key",
        paths: ["/path/to/cache"],
        uploadChunkSize: 8388608,
      };

      await cacheHelper.save(options);

      expect(cache.saveCache).toHaveBeenCalledWith(
        ["/path/to/cache"],
        "test-key",
        {
          uploadChunkSize: 8388608,
        },
        undefined,
      );
    });

    it("preserves native save error identity", async () => {
      const failure = new cache.ReserveCacheError("Cache already exists");
      vi.mocked(cache.saveCache).mockRejectedValue(failure);

      const options: CacheSaveOptions = {
        key: "existing-key",
        paths: ["/path/to/cache"],
      };

      await expect(cacheHelper.save(options)).rejects.toBe(failure);
    });

    it("should handle save errors", async () => {
      vi.mocked(cache.saveCache).mockRejectedValue(new Error("Save failed"));

      const options: CacheSaveOptions = {
        key: "test-key",
        paths: ["/path/to/cache"],
      };

      await expect(cacheHelper.save(options)).rejects.toThrow("Save failed");
    });

    it.each([-1, 0, Number.NaN])("does not report native save ID %s as success", async (id) => {
      vi.mocked(cache.saveCache).mockResolvedValue(id);
      await expect(cacheHelper.save({key: "requested", paths: ["cache"]})).rejects.toThrow(/not saved/i);
    });

    it("forwards native upload and cross-OS options", async () => {
      vi.mocked(cache.saveCache).mockResolvedValue(123);
      await cacheHelper.save({key: "key", paths: ["cache"], enableCrossOsArchive: false, uploadConcurrency: 2, useAzureSdk: false});
      expect(cache.saveCache).toHaveBeenCalledWith(["cache"], "key", {uploadConcurrency: 2, useAzureSdk: false}, false);
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
      expect(vi.mocked(cache.restoreCache).mock.calls.map((call) => call[3]?.lookupOnly)).toEqual([true, false]);
    });

    it("does not restore prefix contents without explicit fallback", async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue("requested-older");
      expect(await cacheHelper.restore({key: "requested", paths: ["cache"]})).toEqual({hit: false, requestedKey: "requested"});
      expect(cache.restoreCache).toHaveBeenCalledOnce();
      expect(vi.mocked(cache.restoreCache).mock.calls.every((call) => call[3]?.lookupOnly === true)).toBe(true);
    });

    it("forwards native download and cross-OS options to probe and restore", async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue("requested");
      await cacheHelper.restore({key: "requested", paths: ["cache"], enableCrossOsArchive: true, timeoutInMs: 0, useAzureSdk: false});
      expect(cache.restoreCache).toHaveBeenNthCalledWith(
        1,
        ["cache"],
        "requested",
        undefined,
        {lookupOnly: true, timeoutInMs: 0, useAzureSdk: false},
        true,
      );
      expect(cache.restoreCache).toHaveBeenNthCalledWith(
        2,
        ["cache"],
        "requested",
        undefined,
        {lookupOnly: false, timeoutInMs: 0, useAzureSdk: false},
        true,
      );
    });

    it("rejects the unsupported legacy chunk option before contacting the cache", async () => {
      await expect(cacheHelper.restore({key: "requested", paths: ["cache"], downloadChunkSize: 0})).rejects.toThrow(/unsupported/i);
      expect(cache.restoreCache).not.toHaveBeenCalled();
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
      expect(cache.restoreCache).toHaveBeenCalledWith(
        ["/path/to/cache"],
        "test-key-v1",
        ["test-key-", "test-"],
        {lookupOnly: false},
        undefined,
      );
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
      const failure = new Error("Restore failed");
      vi.mocked(cache.restoreCache).mockRejectedValue(failure);

      const options: CacheRestoreOptions = {
        key: "test-key",
        paths: ["/path/to/cache"],
      };

      await expect(cacheHelper.restore(options)).rejects.toBe(failure);
    });
  });

  describe("exists", () => {
    it("should return true when cache exists", async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue("test-key");

      const result = await cacheHelper.exists("test-key", ["/path/to/cache"]);

      expect(result).toBe(true);
      expect(cache.restoreCache).toHaveBeenCalledWith(["/path/to/cache"], "test-key", undefined, {lookupOnly: true});
    });

    it("should return false when cache does not exist", async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue(undefined);

      const result = await cacheHelper.exists("nonexistent-key", ["/path/to/cache"]);

      expect(result).toBe(false);
    });

    it("does not disguise an existence lookup error as a miss", async () => {
      const failure = new Error("lookup failure");
      vi.mocked(cache.restoreCache).mockRejectedValue(failure);
      await expect(cacheHelper.exists("test-key", ["/path/to/cache"])).rejects.toBe(failure);
    });

    it("should pass restore keys to exists check", async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue("test-key");

      await cacheHelper.exists("test-key", ["/path/to/cache"], ["test-"]);

      expect(cache.restoreCache).toHaveBeenCalledWith(["/path/to/cache"], "test-key", ["test-"], {lookupOnly: true});
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

    it("rejects a missing explicitly required lockfile rather than hashing partial input", async () => {
      await expect(cacheHelper.generateKey("npm", ["package-lock.json", "nonexistent-file.json"])).rejects.toThrow(/nonexistent-file/);
    });

    it("should generate consistent keys for same content", async () => {
      const key1 = await cacheHelper.generateKey("test", ["package-lock.json"]);
      const key2 = await cacheHelper.generateKey("test", ["package-lock.json"]);

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
      vi.mocked(cache.restoreCache).mockImplementation(async (_paths, key) => key);

      const result = await cacheHelper.autoCache("npm", ["node_modules"], ["package-lock.json"]);

      expect(result.hit).toBe(true);
      expect(result.matchedKey).toBe(result.requestedKey);
    });

    it("should auto-cache with cache miss", async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue(undefined);

      const result = await cacheHelper.autoCache("npm", ["node_modules"], ["package-lock.json"]);

      expect(result.hit).toBe(false);
      expect(core.saveState).toHaveBeenCalledWith("cache-key", expect.any(String));
      expect(core.saveState).toHaveBeenCalledWith("cache-paths", expect.any(String));
    });

    it("preserves auto-cache transport errors", async () => {
      const failure = new Error("Auto-cache failed");
      vi.mocked(cache.restoreCache).mockRejectedValue(failure);
      await expect(cacheHelper.autoCache("npm", ["node_modules"], ["package-lock.json"])).rejects.toBe(failure);
    });

    it("does not turn a missing lockfile into a successful prefix-only result", async () => {
      await expect(cacheHelper.autoCache("npm", ["node_modules"], ["missing-lockfile"])).rejects.toThrow(/missing-lockfile/);
      expect(cache.restoreCache).not.toHaveBeenCalled();
      expect(core.saveState).not.toHaveBeenCalled();
    });

    it("uses exact policy and returns the generated requested key on a prefix miss", async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue("npm-older");
      const result = await cacheHelper.autoCache("npm", ["node_modules"], ["package-lock.json"]);
      expect(result.hit).toBe(false);
      expect(result.requestedKey).toMatch(/^npm-[a-f0-9]{16}$/);
      expect(vi.mocked(cache.restoreCache).mock.calls.every((call) => call[3]?.lookupOnly === true)).toBe(true);
    });
  });
});

describe("Playwright workspace cache", () => {
  it("uses different cache keys for different requested browsers", () => {
    const action = readFileSync(new URL("../../../actions/setup-workspace/action.yml", import.meta.url), "utf8");
    const key = action.match(/id: cache-playwright[\s\S]*?\n\s+key: ([^\r\n]+)/)?.[1];
    if (!key) throw new Error("Playwright cache key was not found");

    const keyFor = (browsers: string): string => key.replace(/\$\{\{\s*inputs\.playwright-browsers\s*\}\}/g, browsers);

    expect(keyFor("chromium")).not.toBe(keyFor("firefox"));
    expect(keyFor("chromium")).not.toBe(keyFor("chromium firefox"));
  });
});
