/**
 * @fileoverview Unit tests for cache helper
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCacheHelper } from './index';
import * as cache from '@actions/cache';

// Mock @actions/cache
vi.mock('@actions/cache');

describe('CacheHelper', () => {
  let cacheHelper: ReturnType<typeof createCacheHelper>;

  beforeEach(() => {
    vi.clearAllMocks();
    cacheHelper = createCacheHelper();
  });

  it('should create a cache helper instance', () => {
    expect(cacheHelper).toBeDefined();
    expect(typeof cacheHelper.save).toBe('function');
    expect(typeof cacheHelper.restore).toBe('function');
    expect(typeof cacheHelper.exists).toBe('function');
    expect(typeof cacheHelper.generateKey).toBe('function');
    expect(typeof cacheHelper.autoCache).toBe('function');
  });

  describe('save', () => {
    it('should have save method', () => {
      expect(typeof cacheHelper.save).toBe('function');
    });
  });

  describe('restore', () => {
    it('should have restore method', () => {
      expect(typeof cacheHelper.restore).toBe('function');
    });
  });

  describe('exists', () => {
    it('should have exists method', () => {
      expect(typeof cacheHelper.exists).toBe('function');
    });
  });

  describe('generateKey', () => {
    it('should have generateKey method', () => {
      expect(typeof cacheHelper.generateKey).toBe('function');
    });
  });

  describe('autoCache', () => {
    it('should have autoCache method', () => {
      expect(typeof cacheHelper.autoCache).toBe('function');
    });
  });

  describe('npm config', () => {
    it('should have NPM_CONFIG constant', () => {
      const NPM_CONFIG = cacheHelper.NPM_CONFIG;
      expect(NPM_CONFIG).toBeDefined();
      expect(NPM_CONFIG.paths).toContain('~/.npm');
    });
  });

  describe('yarn config', () => {
    it('should have YARN_CONFIG constant', () => {
      const YARN_CONFIG = cacheHelper.YARN_CONFIG;
      expect(YARN_CONFIG).toBeDefined();
      expect(YARN_CONFIG.paths).toBeDefined();
    });
  });

  describe('pip config', () => {
    it('should have PIP_CONFIG constant', () => {
      const PIP_CONFIG = cacheHelper.PIP_CONFIG;
      expect(PIP_CONFIG).toBeDefined();
      expect(PIP_CONFIG.paths).toBeDefined();
    });
  });
});
