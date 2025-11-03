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

      expect(exec.exec).toHaveBeenCalledWith("git", ["fetch", "origin", "main:refs/remotes/origin/main"], {
        ignoreReturnCode: true,
        silent: true,
      });
    });

    it("should fetch branch with custom depth", async () => {
      vi.mocked(exec.exec).mockResolvedValue(0);

      await gitHelper.fetchBranch("develop", undefined, 10);

      expect(exec.exec).toHaveBeenCalledWith("git", ["fetch", "origin", "develop:refs/remotes/origin/develop", "--depth=10"], {
        ignoreReturnCode: true,
        silent: true,
      });
    });

    it("should throw error on fetch failure", async () => {
      vi.mocked(exec.exec).mockRejectedValue(new Error("Fetch failed"));

      await expect(gitHelper.fetchBranch("main")).rejects.toThrow("Fetch failed");
    });
  });

  describe("getDiffStats", () => {
    it("should return diff statistics", async () => {
      const mockFilesOutput = `file1.ts
file2.ts
file3.ts`;
      const mockStatsOutput = "3 files changed, 15 insertions(+), 13 deletions(-)";

      vi.mocked(exec.getExecOutput)
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: mockFilesOutput,
          stderr: "",
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: mockStatsOutput,
          stderr: "",
        });

      const stats = await gitHelper.getDiffStats("base", "head");

      expect(stats.filesChanged).toBe(3);
      expect(stats.linesAdded).toBe(15);
      expect(stats.linesDeleted).toBe(13);
      expect(exec.getExecOutput).toHaveBeenNthCalledWith(1, "git", ["diff", "--name-only", "base", "head"], expect.any(Object));
      expect(exec.getExecOutput).toHaveBeenNthCalledWith(2, "git", ["diff", "--shortstat", "base", "head"], expect.any(Object));
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
      const mockOutput = `100644 blob abc123 1024	src/file1.ts
100644 blob def456 2048	src/file2.ts`;

      vi.mocked(exec.getExecOutput)
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: mockOutput,
          stderr: "",
        })
        .mockResolvedValueOnce({
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
      const mockOutput = `abc123def456
abc123d
Test commit
John Doe
john@example.com
2024-01-01T00:00:00Z`;
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

    it("should return false for non-zero exit code", async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 1,
        stdout: "",
        stderr: "fatal: Needed a single revision",
      });

      const result = await gitHelper.refExists("invalid-ref");

      expect(result).toBe(false);
    });
  });

  describe("getCommitCount", () => {
    it("should return commit count between refs", async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: "42\n",
        stderr: "",
      });

      const count = await gitHelper.getCommitCount("origin/main", "HEAD");

      expect(count).toBe(42);
      expect(exec.getExecOutput).toHaveBeenCalledWith("git", ["rev-list", "--count", "origin/main..HEAD"], expect.any(Object));
    });

    it("should return 0 for invalid output", async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: "not-a-number\n",
        stderr: "",
      });

      const count = await gitHelper.getCommitCount("base", "head");

      expect(count).toBe(0);
    });

    it("should return 0 for no commits", async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: "0\n",
        stderr: "",
      });

      const count = await gitHelper.getCommitCount("base", "head");

      expect(count).toBe(0);
    });
  });

  describe("listBranches", () => {
    it("should list local branches", async () => {
      const mockOutput = `main|abc123|abc123d|*
feature/test|def456|def456e| `;
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: "",
      });

      const branches = await gitHelper.listBranches();

      expect(branches).toHaveLength(2);
      expect(branches[0]?.name).toBe("main");
      expect(branches[0]?.isCurrent).toBe(true);
      expect(branches[1]?.name).toBe("feature/test");
      expect(branches[1]?.isCurrent).toBe(false);
    });

    it("should list remote branches", async () => {
      const mockOutput = `origin/main|abc123|abc123d|
origin/develop|def456|def456e| `;
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: "",
      });

      const branches = await gitHelper.listBranches("origin");

      expect(branches).toHaveLength(2);
      expect(exec.getExecOutput).toHaveBeenCalledWith("git", expect.arrayContaining(["--remote", "origin/*"]), expect.any(Object));
    });

    it("should handle empty branch list", async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: "\n",
        stderr: "",
      });

      const branches = await gitHelper.listBranches();

      expect(branches).toEqual([]);
    });

    it("should handle malformed branch output", async () => {
      const mockOutput = `main|abc123|abc123d|*
invalid-line
feature|def456|def456e| `;
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: "",
      });

      const branches = await gitHelper.listBranches();

      expect(branches).toHaveLength(2); // Should skip invalid line
      expect(branches[0]?.name).toBe("main");
      expect(branches[1]?.name).toBe("feature");
    });
  });

  describe("createBranch", () => {
    it("should create branch without start point", async () => {
      vi.mocked(exec.exec).mockResolvedValue(0);

      await gitHelper.createBranch("new-branch");

      expect(exec.exec).toHaveBeenCalledWith("git", ["branch", "new-branch"]);
    });

    it("should create branch from start point", async () => {
      vi.mocked(exec.exec).mockResolvedValue(0);

      await gitHelper.createBranch("new-branch", "origin/main");

      expect(exec.exec).toHaveBeenCalledWith("git", ["branch", "new-branch", "origin/main"]);
    });

    it("should throw error on failure", async () => {
      vi.mocked(exec.exec).mockRejectedValue(new Error("Branch already exists"));

      await expect(gitHelper.createBranch("existing-branch")).rejects.toThrow("Branch already exists");
    });
  });

  describe("checkout", () => {
    it("should checkout existing ref", async () => {
      vi.mocked(exec.exec).mockResolvedValue(0);

      await gitHelper.checkout("main");

      expect(exec.exec).toHaveBeenCalledWith("git", ["checkout", "main"]);
    });

    it("should checkout and create new branch", async () => {
      vi.mocked(exec.exec).mockResolvedValue(0);

      await gitHelper.checkout("new-branch", true);

      expect(exec.exec).toHaveBeenCalledWith("git", ["checkout", "-b", "new-branch"]);
    });

    it("should throw error on failure", async () => {
      vi.mocked(exec.exec).mockRejectedValue(new Error("Branch not found"));

      await expect(gitHelper.checkout("nonexistent")).rejects.toThrow("Branch not found");
    });
  });

  describe("exec", () => {
    it("should execute git command", async () => {
      const mockOutput = {
        exitCode: 0,
        stdout: "command output",
        stderr: "",
      };
      vi.mocked(exec.getExecOutput).mockResolvedValue(mockOutput);

      const result = await gitHelper.exec(["status"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("command output");
      expect(exec.getExecOutput).toHaveBeenCalledWith(
        "git",
        ["status"],
        expect.objectContaining({
          ignoreReturnCode: false,
          silent: false,
        }),
      );
    });

    it("should execute with custom options", async () => {
      const mockOutput = {
        exitCode: 0,
        stdout: "output",
        stderr: "",
      };
      vi.mocked(exec.getExecOutput).mockResolvedValue(mockOutput);

      await gitHelper.exec(["log"], {cwd: "/custom/dir", silent: true, ignoreReturnCode: true});

      expect(exec.getExecOutput).toHaveBeenCalledWith(
        "git",
        ["log"],
        expect.objectContaining({
          cwd: "/custom/dir",
          silent: true,
          ignoreReturnCode: true,
        }),
      );
    });

    it("should return error output", async () => {
      const mockOutput = {
        exitCode: 1,
        stdout: "",
        stderr: "error message",
      };
      vi.mocked(exec.getExecOutput).mockResolvedValue(mockOutput);

      const result = await gitHelper.exec(["invalid"], {ignoreReturnCode: true});

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toBe("error message");
    });
  });

  describe("getFileSizes error handling", () => {
    it("should handle invalid tree ref", async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 128,
        stdout: "",
        stderr: "fatal: Not a valid object name invalid-ref",
      });

      const sizes = await gitHelper.getFileSizes("invalid-ref", ["some/path"]);

      expect(Object.keys(sizes).length).toBe(0);
    });

    it("should handle execution error", async () => {
      vi.mocked(exec.getExecOutput).mockRejectedValue(new Error("Command failed"));

      const sizes = await gitHelper.getFileSizes("HEAD", ["some/path"]);

      expect(Object.keys(sizes).length).toBe(0);
    });

    it("should handle trailing slash in paths", async () => {
      const mockOutput = `100644 blob abc123 1024	src/file.ts`;
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: mockOutput,
        stderr: "",
      });

      const sizes = await gitHelper.getFileSizes("HEAD", ["src/"]);

      expect(Object.keys(sizes).length).toBeGreaterThan(0);
    });
  });

  describe("getCommit error handling", () => {
    it("should throw error for invalid format", async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
        exitCode: 0,
        stdout: "incomplete\noutput",
        stderr: "",
      });

      await expect(gitHelper.getCommit("invalid-ref")).rejects.toThrow("Failed to parse commit info");
    });
  });
});
