/**
 * @fileoverview Unit tests for artifacts helper.
 * @module github/scripts/helpers/artifacts/tests
 *
 * @remarks
 * Validates upload/download behavior using mocked GitHub Actions artifact clients.
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

// Create mock client
const mockUploadArtifact = vi.fn();
const mockDownloadArtifact = vi.fn();
const mockGetArtifact = vi.fn();
const mockListArtifacts = vi.fn();

// Mock @actions/artifact module
vi.mock("@actions/artifact", () => {
  class MockDefaultArtifactClient {
    uploadArtifact = mockUploadArtifact;
    downloadArtifact = mockDownloadArtifact;
    getArtifact = mockGetArtifact;
    listArtifacts = mockListArtifacts;
  }

  return {
    DefaultArtifactClient: MockDefaultArtifactClient,
  };
});

// Mock @actions/glob
const mockGlob = vi.fn();
const mockCreate = vi.fn();
vi.mock("@actions/glob", () => ({
  create: mockCreate,
}));

describe("ArtifactsHelper", () => {
  let testDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create a temporary directory for test files
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "artifact-test-"));

    // Default mock implementations
    mockCreate.mockResolvedValue({
      glob: mockGlob,
    });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, {recursive: true, force: true});
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("upload", () => {
    it("should upload artifact successfully", async () => {
      const {createArtifactHelper} = await import("./index");
      const artifactsHelper = createArtifactHelper();

      // Create test files
      const testFile = path.join(testDir, "test.txt");
      await fs.writeFile(testFile, "test content");

      mockGlob.mockResolvedValue([testFile]);
      mockUploadArtifact.mockResolvedValue({
        id: 123,
        size: 1024,
      });

      const result = await artifactsHelper.upload({
        name: "test-artifact",
        files: ["*.txt"],
        rootDirectory: testDir,
      });

      expect(result.id).toBe(123);
      expect(result.size).toBe(1024);
      expect(result.fileCount).toBe(1);
      expect(mockUploadArtifact).toHaveBeenCalledWith("test-artifact", [testFile], testDir, {});
    });

    it("should upload with retention days", async () => {
      const {createArtifactHelper} = await import("./index");
      const artifactsHelper = createArtifactHelper();

      const testFile = path.join(testDir, "test.txt");
      await fs.writeFile(testFile, "test content");

      mockGlob.mockResolvedValue([testFile]);
      mockUploadArtifact.mockResolvedValue({
        id: 456,
        size: 2048,
      });

      await artifactsHelper.upload({
        name: "test-artifact",
        files: ["*.txt"],
        retentionDays: 30,
      });

      expect(mockUploadArtifact).toHaveBeenCalledWith("test-artifact", [testFile], expect.any(String), {retentionDays: 30});
    });

    it("should throw error when no files found", async () => {
      const {createArtifactHelper} = await import("./index");
      const artifactsHelper = createArtifactHelper();

      mockGlob.mockResolvedValue([]);

      await expect(
        artifactsHelper.upload({
          name: "test-artifact",
          files: ["*.nonexistent"],
        }),
      ).rejects.toThrow("No files found matching patterns");
    });

    it("should throw error on upload failure", async () => {
      const {createArtifactHelper} = await import("./index");
      const artifactsHelper = createArtifactHelper();

      const testFile = path.join(testDir, "test.txt");
      await fs.writeFile(testFile, "test content");

      mockGlob.mockResolvedValue([testFile]);
      mockUploadArtifact.mockRejectedValue(new Error("Upload failed"));

      await expect(
        artifactsHelper.upload({
          name: "test-artifact",
          files: ["*.txt"],
        }),
      ).rejects.toThrow("Failed to upload artifact: Upload failed");
    });

    it("should handle missing id and size in response", async () => {
      const {createArtifactHelper} = await import("./index");
      const artifactsHelper = createArtifactHelper();

      const testFile = path.join(testDir, "test.txt");
      await fs.writeFile(testFile, "test content");

      mockGlob.mockResolvedValue([testFile]);
      mockUploadArtifact.mockResolvedValue({});

      const result = await artifactsHelper.upload({
        name: "test-artifact",
        files: ["*.txt"],
      });

      expect(result.id).toBe(0);
      expect(result.size).toBe(0);
    });
  });

  describe("download", () => {
    it("should download artifact by name", async () => {
      const {createArtifactHelper} = await import("./index");
      const artifactsHelper = createArtifactHelper();

      mockGetArtifact.mockResolvedValue({
        artifact: {id: 123, name: "test-artifact", size: 1024},
      });
      mockDownloadArtifact.mockResolvedValue({
        downloadPath: "/tmp/download",
      });

      const result = await artifactsHelper.download({
        name: "test-artifact",
        destination: "/tmp/download",
      });

      expect(result.id).toBe(123);
      expect(result.downloadPath).toBe("/tmp/download");
      expect(mockGetArtifact).toHaveBeenCalledWith("test-artifact");
      expect(mockDownloadArtifact).toHaveBeenCalledWith(123, {path: "/tmp/download"});
    });

    it("should download artifact by ID", async () => {
      const {createArtifactHelper} = await import("./index");
      const artifactsHelper = createArtifactHelper();

      mockDownloadArtifact.mockResolvedValue({
        downloadPath: "/tmp/download",
      });

      const result = await artifactsHelper.download({
        artifactId: 456,
        destination: "/tmp/download",
      });

      expect(result.id).toBe(456);
      expect(result.downloadPath).toBe("/tmp/download");
      expect(mockDownloadArtifact).toHaveBeenCalledWith(456, {path: "/tmp/download"});
      expect(mockGetArtifact).not.toHaveBeenCalled();
    });

    it("should use destination when downloadPath not in response", async () => {
      const {createArtifactHelper} = await import("./index");
      const artifactsHelper = createArtifactHelper();

      mockDownloadArtifact.mockResolvedValue({});

      const result = await artifactsHelper.download({
        artifactId: 789,
        destination: "/tmp/fallback",
      });

      expect(result.downloadPath).toBe("/tmp/fallback");
    });

    it("should throw error when neither name nor ID provided", async () => {
      const {createArtifactHelper} = await import("./index");
      const artifactsHelper = createArtifactHelper();

      await expect(
        artifactsHelper.download({
          destination: "/tmp/download",
        } as any),
      ).rejects.toThrow("Either 'name' or 'artifactId' must be provided");
    });

    it("should throw error on download failure with name", async () => {
      const {createArtifactHelper} = await import("./index");
      const artifactsHelper = createArtifactHelper();

      mockGetArtifact.mockResolvedValue({
        artifact: {id: 123, name: "test-artifact", size: 1024},
      });
      mockDownloadArtifact.mockRejectedValue(new Error("Download failed"));

      await expect(
        artifactsHelper.download({
          name: "test-artifact",
          destination: "/tmp/download",
        }),
      ).rejects.toThrow("Failed to download artifact: Download failed");
    });

    it("should throw error on download failure with ID", async () => {
      const {createArtifactHelper} = await import("./index");
      const artifactsHelper = createArtifactHelper();

      mockDownloadArtifact.mockRejectedValue(new Error("Not found"));

      await expect(
        artifactsHelper.download({
          artifactId: 999,
          destination: "/tmp/download",
        }),
      ).rejects.toThrow("Failed to download artifact: Not found");
    });
  });

  describe("list", () => {
    it("should list all artifacts", async () => {
      const {createArtifactHelper} = await import("./index");
      const artifactsHelper = createArtifactHelper();

      mockListArtifacts.mockResolvedValue({
        artifacts: [
          {id: 1, name: "artifact-1", size: 1024},
          {id: 2, name: "artifact-2", size: 2048},
          {id: 3, name: "artifact-3", size: 4096},
        ],
      });

      const result = await artifactsHelper.list();

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({id: 1, name: "artifact-1", size: 1024});
      expect(result[1]).toEqual({id: 2, name: "artifact-2", size: 2048});
      expect(result[2]).toEqual({id: 3, name: "artifact-3", size: 4096});
    });

    it("should return empty array when no artifacts", async () => {
      const {createArtifactHelper} = await import("./index");
      const artifactsHelper = createArtifactHelper();

      mockListArtifacts.mockResolvedValue({
        artifacts: [],
      });

      const result = await artifactsHelper.list();

      expect(result).toEqual([]);
    });

    it("should throw error on list failure", async () => {
      const {createArtifactHelper} = await import("./index");
      const artifactsHelper = createArtifactHelper();

      mockListArtifacts.mockRejectedValue(new Error("API error"));

      await expect(artifactsHelper.list()).rejects.toThrow("Failed to list artifacts: API error");
    });
  });

  describe("uploadDirectory", () => {
    it("should upload entire directory", async () => {
      const {createArtifactHelper} = await import("./index");
      const artifactsHelper = createArtifactHelper();

      // Create test files in directory
      const subDir = path.join(testDir, "subdir");
      await fs.mkdir(subDir);
      const testFile1 = path.join(testDir, "file1.txt");
      const testFile2 = path.join(subDir, "file2.txt");
      await fs.writeFile(testFile1, "content1");
      await fs.writeFile(testFile2, "content2");

      mockGlob.mockResolvedValue([testFile1, testFile2]);
      mockUploadArtifact.mockResolvedValue({
        id: 111,
        size: 2048,
      });

      const result = await artifactsHelper.uploadDirectory("dir-artifact", testDir);

      expect(result.id).toBe(111);
      expect(result.fileCount).toBe(2);
      expect(mockCreate).toHaveBeenCalledWith(`${testDir}/**/*`);
      expect(mockUploadArtifact).toHaveBeenCalledWith("dir-artifact", [testFile1, testFile2], testDir, {});
    });

    it("should upload directory with retention days", async () => {
      const {createArtifactHelper} = await import("./index");
      const artifactsHelper = createArtifactHelper();

      const testFile = path.join(testDir, "test.txt");
      await fs.writeFile(testFile, "test");

      mockGlob.mockResolvedValue([testFile]);
      mockUploadArtifact.mockResolvedValue({
        id: 222,
        size: 1024,
      });

      await artifactsHelper.uploadDirectory("dir-artifact", testDir, 7);

      expect(mockUploadArtifact).toHaveBeenCalledWith("dir-artifact", [testFile], testDir, {retentionDays: 7});
    });
  });

  describe("uploadFiles", () => {
    it("should upload specific files", async () => {
      const {createArtifactHelper} = await import("./index");
      const artifactsHelper = createArtifactHelper();

      const file1 = path.join(testDir, "file1.txt");
      const file2 = path.join(testDir, "file2.txt");
      await fs.writeFile(file1, "content1");
      await fs.writeFile(file2, "content2");

      mockGlob.mockResolvedValue([file1, file2]);
      mockUploadArtifact.mockResolvedValue({
        id: 333,
        size: 4096,
      });

      const result = await artifactsHelper.uploadFiles("files-artifact", ["file1.txt", "file2.txt"], testDir);

      expect(result.id).toBe(333);
      expect(result.fileCount).toBe(2);
      expect(mockCreate).toHaveBeenCalledWith("file1.txt\nfile2.txt");
    });

    it("should upload files with retention days", async () => {
      const {createArtifactHelper} = await import("./index");
      const artifactsHelper = createArtifactHelper();

      const file1 = path.join(testDir, "log.txt");
      await fs.writeFile(file1, "log content");

      mockGlob.mockResolvedValue([file1]);
      mockUploadArtifact.mockResolvedValue({
        id: 444,
        size: 512,
      });

      await artifactsHelper.uploadFiles("logs", ["log.txt"], testDir, 14);

      expect(mockUploadArtifact).toHaveBeenCalledWith("logs", [file1], testDir, {retentionDays: 14});
    });

    it("should upload files without rootDirectory", async () => {
      const {createArtifactHelper} = await import("./index");
      const artifactsHelper = createArtifactHelper();

      const file1 = path.join(testDir, "file.txt");
      await fs.writeFile(file1, "content");

      mockGlob.mockResolvedValue([file1]);
      mockUploadArtifact.mockResolvedValue({
        id: 555,
        size: 256,
      });

      await artifactsHelper.uploadFiles("files", ["file.txt"]);

      expect(mockUploadArtifact).toHaveBeenCalledWith("files", [file1], expect.any(String), {});
    });
  });

  describe("artifacts default export", () => {
    it("should export default artifacts instance", async () => {
      const {artifacts} = await import("./index");

      expect(artifacts).toBeDefined();
      expect(artifacts.upload).toBeDefined();
      expect(artifacts.download).toBeDefined();
      expect(artifacts.list).toBeDefined();
    });
  });
});
