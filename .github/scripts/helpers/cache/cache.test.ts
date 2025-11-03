/**
 * @fileoverview Unit tests for cache helper
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCacheHelper } from './index';
import * as cache from '@actions/cache';
import * as glob from '@actions/glob';

// Mock @actions/cache and @actions/glob
vi.mock('@actions/cache');
vi.mock('@actions/glob');

describe('CacheHelper', () => {
  let cacheHelper: ReturnType<typeof createCacheHelper>;

  beforeEach(() => {
    vi.clearAllMocks();
    cacheHelper = createCacheHelper();
  });

  describe('restoreCache', () => {
    it('should restore cache and return cache key', async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue('cache-key-123');

      const result = await cacheHelper.restoreCache(
        ['/path/to/cache'],
        'primary-key',
        ['restore-key-1', 'restore-key-2']
      );

      expect(result).toBe('cache-key-123');
      expect(cache.restoreCache).toHaveBeenCalledWith(
        ['/path/to/cache'],
        'primary-key',
        ['restore-key-1', 'restore-key-2']
      );
    });

    it('should return undefined when cache not found', async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue(undefined);

      const result = await cacheHelper.restoreCache(
        ['/path/to/cache'],
        'primary-key'
      );

      expect(result).toBeUndefined();
    });
  });

  describe('saveCache', () => {
    it('should save cache', async () => {
      vi.mocked(cache.saveCache).mockResolvedValue(12345);

      await cacheHelper.saveCache(['/path/to/cache'], 'cache-key');

      expect(cache.saveCache).toHaveBeenCalledWith(
        ['/path/to/cache'],
        'cache-key'
      );
    });

    it('should throw error on save failure', async () => {
      vi.mocked(cache.saveCache).mockRejectedValue(new Error('Save failed'));

      await expect(
        cacheHelper.saveCache(['/path/to/cache'], 'cache-key')
      ).rejects.toThrow('Save failed');
    });
  });

  describe('autoCache', () => {
    it('should auto-cache with npm config', async () => {
      const mockGlobber = {
        glob: vi.fn().mockResolvedValue(['package-lock.json'])
      };

      vi.mocked(glob.create).mockResolvedValue(mockGlobber as any);
      vi.mocked(cache.restoreCache).mockResolvedValue('npm-cache-123');
      vi.mocked(cache.saveCache).mockResolvedValue(54321);

      const result = await cacheHelper.autoCache('npm');

      expect(result.cacheHit).toBe(true);
      expect(result.cacheKey).toContain('npm-');
      expect(glob.create).toHaveBeenCalled();
    });

    it('should handle cache miss', async () => {
      const mockGlobber = {
        glob: vi.fn().mockResolvedValue(['package-lock.json'])
      };

      vi.mocked(glob.create).mockResolvedValue(mockGlobber as any);
      vi.mocked(cache.restoreCache).mockResolvedValue(undefined);

      const result = await cacheHelper.autoCache('npm');

      expect(result.cacheHit).toBe(false);
      expect(result.cacheKey).toBeDefined();
    });

    it('should work with yarn', async () => {
      const mockGlobber = {
        glob: vi.fn().mockResolvedValue(['yarn.lock'])
      };

      vi.mocked(glob.create).mockResolvedValue(mockGlobber as any);
      vi.mocked(cache.restoreCache).mockResolvedValue('yarn-cache-456');

      const result = await cacheHelper.autoCache('yarn');

      expect(result.cacheHit).toBe(true);
      expect(result.cacheKey).toContain('yarn-');
    });

    it('should work with pip', async () => {
      const mockGlobber = {
        glob: vi.fn().mockResolvedValue(['requirements.txt'])
      };

      vi.mocked(glob.create).mockResolvedValue(mockGlobber as any);
      vi.mocked(cache.restoreCache).mockResolvedValue('pip-cache-789');

      const result = await cacheHelper.autoCache('pip');

      expect(result.cacheHit).toBe(true);
      expect(result.cacheKey).toContain('pip-');
    });
  });

  describe('generateCacheKey', () => {
    it('should generate cache key from lock files', async () => {
      const mockGlobber = {
        glob: vi.fn().mockResolvedValue([
          '/project/package-lock.json',
          '/project/yarn.lock'
        ])
      };

      vi.mocked(glob.create).mockResolvedValue(mockGlobber as any);

      const key = await cacheHelper.generateCacheKey(
        'my-cache',
        ['**/package-lock.json', '**/yarn.lock']
      );

      expect(key).toMatch(/^my-cache-/);
      expect(glob.create).toHaveBeenCalled();
    });

    it('should handle no matching files', async () => {
      const mockGlobber = {
        glob: vi.fn().mockResolvedValue([])
      };

      vi.mocked(glob.create).mockResolvedValue(mockGlobber as any);

      const key = await cacheHelper.generateCacheKey('my-cache', ['**/nonexistent']);

      expect(key).toMatch(/^my-cache-/);
    });
  });

  describe('cacheExists', () => {
    it('should return true when cache exists', async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue('cache-key-exists');

      const exists = await cacheHelper.cacheExists(['/path'], 'key');

      expect(exists).toBe(true);
    });

    it('should return false when cache does not exist', async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue(undefined);

      const exists = await cacheHelper.cacheExists(['/path'], 'key');

      expect(exists).toBe(false);
    });
  });
});
