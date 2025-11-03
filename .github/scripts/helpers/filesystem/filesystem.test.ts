/**
 * @fileoverview Unit tests for filesystem helper
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createFileSystemHelper } from './index';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('FileSystemHelper', () => {
  let testDir: string;
  let fsHelper: ReturnType<typeof createFileSystemHelper>;

  beforeEach(async () => {
    // Create a temporary directory for tests
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-helper-test-'));
    fsHelper = createFileSystemHelper();
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(testDir, 'test.txt');
      await fs.writeFile(filePath, 'test content');

      const result = await fsHelper.exists(filePath);
      expect(result).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const filePath = path.join(testDir, 'nonexistent.txt');

      const result = await fsHelper.exists(filePath);
      expect(result).toBe(false);
    });
  });

  describe('readFile', () => {
    it('should read file content as string', async () => {
      const filePath = path.join(testDir, 'test.txt');
      const content = 'Hello, World!';
      await fs.writeFile(filePath, content);

      const result = await fsHelper.readFile(filePath);
      expect(result).toBe(content);
    });

    it('should throw error for non-existing file', async () => {
      const filePath = path.join(testDir, 'nonexistent.txt');

      await expect(fsHelper.readFile(filePath)).rejects.toThrow();
    });
  });

  describe('writeFile', () => {
    it('should write content to file', async () => {
      const filePath = path.join(testDir, 'output.txt');
      const content = 'Test content';

      await fsHelper.writeFile(filePath, content);

      const readContent = await fs.readFile(filePath, 'utf-8');
      expect(readContent).toBe(content);
    });
  });

  describe('readJson', () => {
    it('should read and parse JSON file', async () => {
      const filePath = path.join(testDir, 'data.json');
      const data = { name: 'test', value: 42 };
      await fs.writeFile(filePath, JSON.stringify(data));

      const result = await fsHelper.readJson<typeof data>(filePath);
      expect(result).toEqual(data);
    });

    it('should throw error for invalid JSON', async () => {
      const filePath = path.join(testDir, 'invalid.json');
      await fs.writeFile(filePath, 'not valid json');

      await expect(fsHelper.readJson(filePath)).rejects.toThrow();
    });
  });

  describe('writeJson', () => {
    it('should write object as JSON file', async () => {
      const filePath = path.join(testDir, 'output.json');
      const data = { name: 'test', value: 42 };

      await fsHelper.writeJson(filePath, data);

      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(data);
    });

    it('should format JSON with indentation', async () => {
      const filePath = path.join(testDir, 'formatted.json');
      const data = { name: 'test' };

      await fsHelper.writeJson(filePath, data);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toContain('\n');
      expect(content).toContain('  ');
    });
  });

  describe('find', () => {
    it('should find files matching pattern', async () => {
      await fs.writeFile(path.join(testDir, 'file1.txt'), '');
      await fs.writeFile(path.join(testDir, 'file2.txt'), '');
      await fs.writeFile(path.join(testDir, 'file3.log'), '');

      const files = await fsHelper.find(testDir, /\.txt$/);
      expect(files).toHaveLength(2);
      expect(files.every(f => f.endsWith('.txt'))).toBe(true);
    });

    it('should return empty array when no matches', async () => {
      const files = await fsHelper.find(testDir, /\.nonexistent$/);
      expect(files).toEqual([]);
    });
  });

  describe('copy', () => {
    it('should copy file to destination', async () => {
      const sourcePath = path.join(testDir, 'source.txt');
      const destPath = path.join(testDir, 'dest.txt');
      const content = 'Copy me';
      await fs.writeFile(sourcePath, content);

      await fsHelper.copy(sourcePath, destPath);

      const copiedContent = await fs.readFile(destPath, 'utf-8');
      expect(copiedContent).toBe(content);
    });
  });

  describe('remove', () => {
    it('should remove file', async () => {
      const filePath = path.join(testDir, 'remove-me.txt');
      await fs.writeFile(filePath, 'content');

      await fsHelper.remove(filePath);

      const exists = await fsHelper.exists(filePath);
      expect(exists).toBe(false);
    });

    it('should remove directory recursively', async () => {
      const dirPath = path.join(testDir, 'remove-dir');
      await fs.mkdir(dirPath);
      await fs.writeFile(path.join(dirPath, 'file.txt'), 'content');

      await fsHelper.remove(dirPath);

      const exists = await fsHelper.exists(dirPath);
      expect(exists).toBe(false);
    });
  });

  describe('mkdirP', () => {
    it('should create directory recursively', async () => {
      const dirPath = path.join(testDir, 'nested', 'deep', 'directory');

      await fsHelper.mkdirP(dirPath);

      const stat = await fs.stat(dirPath);
      expect(stat.isDirectory()).toBe(true);
    });

    it('should not throw if directory already exists', async () => {
      await fs.mkdir(path.join(testDir, 'existing'));

      await expect(
        fsHelper.mkdirP(path.join(testDir, 'existing'))
      ).resolves.not.toThrow();
    });
  });
});
