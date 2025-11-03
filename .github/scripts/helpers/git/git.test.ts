/**
 * @fileoverview Unit tests for git helper
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGitHelper } from './index';
import * as exec from '@actions/exec';

// Mock @actions/exec
vi.mock('@actions/exec');

describe('GitHelper', () => {
  let gitHelper: ReturnType<typeof createGitHelper>;

  beforeEach(() => {
    vi.clearAllMocks();
    gitHelper = createGitHelper();
  });

  describe('fetchBranch', () => {
    it('should fetch branch with default depth', async () => {
      vi.mocked(exec.exec).mockResolvedValue(0);

      await gitHelper.fetchBranch('main');

      expect(exec.exec).toHaveBeenCalledWith('git', [
        'fetch',
        'origin',
        'main',
        '--depth=1'
      ]);
    });

    it('should fetch branch with custom depth', async () => {
      vi.mocked(exec.exec).mockResolvedValue(0);

      await gitHelper.fetchBranch('develop', 10);

      expect(exec.exec).toHaveBeenCalledWith('git', [
        'fetch',
        'origin',
        'develop',
        '--depth=10'
      ]);
    });

    it('should throw error on fetch failure', async () => {
      vi.mocked(exec.exec).mockRejectedValue(new Error('Fetch failed'));

      await expect(gitHelper.fetchBranch('main')).rejects.toThrow('Fetch failed');
    });
  });

  describe('getDiffStats', () => {
    it('should return diff statistics', async () => {
      const mockOutput = `5	3	file1.ts
10	2	file2.ts
0	8	file3.ts`;

      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: ''
      });

      const stats = await gitHelper.getDiffStats('base', 'head');

      expect(stats.filesChanged).toBe(3);
      expect(stats.insertions).toBe(15);
      expect(stats.deletions).toBe(13);
      expect(exec.getExecOutput).toHaveBeenCalledWith('git', [
        'diff',
        '--numstat',
        'base',
        'head'
      ]);
    });

    it('should return zero stats for no changes', async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: ''
      });

      const stats = await gitHelper.getDiffStats('base', 'head');

      expect(stats.filesChanged).toBe(0);
      expect(stats.insertions).toBe(0);
      expect(stats.deletions).toBe(0);
    });
  });

  describe('getChangedFiles', () => {
    it('should return list of changed files', async () => {
      const mockOutput = `src/file1.ts
src/file2.ts
package.json`;

      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: ''
      });

      const files = await gitHelper.getChangedFiles('base', 'head');

      expect(files).toEqual(['src/file1.ts', 'src/file2.ts', 'package.json']);
    });

    it('should return empty array when no files changed', async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: ''
      });

      const files = await gitHelper.getChangedFiles('base', 'head');

      expect(files).toEqual([]);
    });

    it('should filter out empty lines', async () => {
      const mockOutput = `src/file1.ts

src/file2.ts

`;

      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: ''
      });

      const files = await gitHelper.getChangedFiles('base', 'head');

      expect(files).toEqual(['src/file1.ts', 'src/file2.ts']);
    });
  });

  describe('getFileSizes', () => {
    it('should return file sizes from git tree', async () => {
      const mockOutput = `100644 blob abc123	1024	src/file1.ts
100644 blob def456	2048	src/file2.ts`;

      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: ''
      });

      const sizes = await gitHelper.getFileSizes(['src/file1.ts', 'src/file2.ts'], 'HEAD');

      expect(sizes.get('src/file1.ts')).toBe(1024);
      expect(sizes.get('src/file2.ts')).toBe(2048);
    });

    it('should handle files not in tree', async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: ''
      });

      const sizes = await gitHelper.getFileSizes(['nonexistent.ts'], 'HEAD');

      expect(sizes.get('nonexistent.ts')).toBeUndefined();
    });

    it('should handle empty file list', async () => {
      const sizes = await gitHelper.getFileSizes([], 'HEAD');

      expect(sizes.size).toBe(0);
      expect(exec.getExecOutput).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentCommit', () => {
    it('should return current commit SHA', async () => {
      const commitSha = 'abc123def456';
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: commitSha + '\n',
        stderr: ''
      });

      const result = await gitHelper.getCurrentCommit();

      expect(result).toBe(commitSha);
      expect(exec.getExecOutput).toHaveBeenCalledWith('git', ['rev-parse', 'HEAD']);
    });
  });

  describe('getBranchName', () => {
    it('should return current branch name', async () => {
      const branchName = 'feature/test-branch';
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: branchName + '\n',
        stderr: ''
      });

      const result = await gitHelper.getBranchName();

      expect(result).toBe(branchName);
      expect(exec.getExecOutput).toHaveBeenCalledWith('git', [
        'rev-parse',
        '--abbrev-ref',
        'HEAD'
      ]);
    });
  });

  describe('refExists', () => {
    it('should return true for existing ref', async () => {
      vi.mocked(exec.exec).mockResolvedValue(0);

      const result = await gitHelper.refExists('origin/main');

      expect(result).toBe(true);
    });

    it('should return false for non-existing ref', async () => {
      vi.mocked(exec.exec).mockRejectedValue(new Error('Not found'));

      const result = await gitHelper.refExists('origin/nonexistent');

      expect(result).toBe(false);
    });
  });
});
