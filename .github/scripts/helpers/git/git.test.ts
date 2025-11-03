/**
 * @fileoverview Unit tests for git helper
 */

import * as exec from "@actions/exec";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {createGitHelper} from "./index";

// Mock @actions/exec
vi.mock("@actions/exec");

describe("GitHelper", () => {
  let gitHelper: ReturnType<typeof createGitHelper>;

  beforeEach(() => {
    vi.clearAllMocks();
    gitHelper = createGitHelper();
  });

  describe("fetchBranch", () => {
    it("should fetch branch with default depth", async () => {
      vi.mocked(exec.exec).mockResolvedValue(0);

      await gitHelper.fetchBranch("main");

      expect(exec.exec).toHaveBeenCalledWith("git", ["fetch", "origin", "main", "--depth=1"]);
    });

    it("should fetch branch with custom depth", async () => {
      vi.mocked(exec.exec).mockResolvedValue(0);

      await gitHelper.fetchBranch("develop", undefined, 10);

      expect(exec.exec).toHaveBeenCalledWith("git", ["fetch", "origin", "develop", "--depth=10"]);
    });

    it("should throw error on fetch failure", async () => {
      vi.mocked(exec.exec).mockRejectedValue(new Error("Fetch failed"));

      await expect(gitHelper.fetchBranch("main")).rejects.toThrow("Fetch failed");
    });
  });

  describe("getDiffStats", () => {
    it("should return diff statistics", async () => {
      const mockOutput = `5	3	file1.ts
10	2	file2.ts
0	8	file3.ts`;

      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: "",
      });

      const stats = await gitHelper.getDiffStats("base", "head");

      expect(stats.filesChanged).toBe(3);
      expect(stats.linesAdded).toBe(15);
      expect(stats.linesDeleted).toBe(13);
      expect(exec.getExecOutput).toHaveBeenCalledWith("git", ["diff", "--numstat", "base", "head"]);
    });

    it("should return zero stats for no changes", async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: "",
        stderr: "",
      });

      const stats = await gitHelper.getDiffStats("base", "head");

      expect(stats.filesChanged).toBe(0);
      expect(stats.linesAdded).toBe(0);
      expect(stats.linesDeleted).toBe(0);
    });
  });

  describe("getChangedFiles", () => {
    it("should return list of changed files", async () => {
      const mockOutput = `src/file1.ts
src/file2.ts
package.json`;

      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: "",
      });

      const files = await gitHelper.getChangedFiles("base", "head");

      expect(files).toEqual(["src/file1.ts", "src/file2.ts", "package.json"]);
    });

    it("should return empty array when no files changed", async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: "",
        stderr: "",
      });

      const files = await gitHelper.getChangedFiles("base", "head");

      expect(files).toEqual([]);
    });

    it("should filter out empty lines", async () => {
      const mockOutput = `src/file1.ts

src/file2.ts

`;

      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: "",
      });

      const files = await gitHelper.getChangedFiles("base", "head");

      expect(files).toEqual(["src/file1.ts", "src/file2.ts"]);
    });
  });

  describe("getFileSizes", () => {
    it("should return file sizes from git tree", async () => {
      const mockOutput = `100644 blob abc123	1024	src/file1.ts
100644 blob def456	2048	src/file2.ts`;

      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: "",
      });

      const sizes = await gitHelper.getFileSizes("HEAD", ["src/file1.ts", "src/file2.ts"]);

      expect(sizes["src/file1.ts"]).toBe(1024);
      expect(sizes["src/file2.ts"]).toBe(2048);
    });

    it("should handle files not in tree", async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: "",
        stderr: "",
      });

      const sizes = await gitHelper.getFileSizes("HEAD", ["nonexistent.ts"]);

      expect(sizes["nonexistent.ts"]).toBeUndefined();
    });

    it("should handle empty file list", async () => {
      const sizes = await gitHelper.getFileSizes("HEAD", []);

      expect(Object.keys(sizes).length).toBe(0);
    });
  });

  describe("getCommit", () => {
    it("should return commit information", async () => {
      const mockOutput = "abc123def456|abc123d|Test commit|John Doe|john@example.com|2024-01-01T00:00:00Z";
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: "",
      });

      const result = await gitHelper.getCommit("HEAD");

      expect(result.sha).toBe("abc123def456");
      expect(result.shortSha).toBe("abc123d");
      expect(result.message).toBe("Test commit");
    });
  });

  describe("getCurrentBranch", () => {
    it("should return current branch name", async () => {
      const branchName = "feature/test-branch";
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: branchName + "\n",
        stderr: "",
      });

      const result = await gitHelper.getCurrentBranch();

      expect(result).toBe(branchName);
      expect(exec.getExecOutput).toHaveBeenCalledWith("git", ["rev-parse", "--abbrev-ref", "HEAD"], expect.any(Object));
    });
  });

  describe("refExists", () => {
    it("should return true for existing ref", async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: "abc123",
        stderr: "",
      });

      const result = await gitHelper.refExists("origin/main");

      expect(result).toBe(true);
    });

    it("should return false for non-existing ref", async () => {
      vi.mocked(exec.getExecOutput).mockRejectedValue(new Error("Not found"));

      const result = await gitHelper.refExists("origin/nonexistent");

      expect(result).toBe(false);
    });
  });
});
