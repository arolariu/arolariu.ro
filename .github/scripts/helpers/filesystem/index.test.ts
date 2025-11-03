/**
 * @fileoverview Unit tests for filesystem helper
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {createFileSystemHelper} from "./index";

describe("FileSystemHelper", () => {
  let testDir: string;
  let fsHelper: ReturnType<typeof createFileSystemHelper>;

  beforeEach(async () => {
    // Create a temporary directory for tests
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "fs-helper-test-"));
    fsHelper = createFileSystemHelper();
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, {recursive: true, force: true});
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("exists", () => {
    it("should return true for existing file", async () => {
      const filePath = path.join(testDir, "test.txt");
      await fs.writeFile(filePath, "test content");

      const result = await fsHelper.exists(filePath);
      expect(result).toBe(true);
    });

    it("should return false for non-existing file", async () => {
      const filePath = path.join(testDir, "nonexistent.txt");

      const result = await fsHelper.exists(filePath);
      expect(result).toBe(false);
    });
  });

  describe("readFile", () => {
    it("should read file content as string", async () => {
      const filePath = path.join(testDir, "test.txt");
      const content = "Hello, World!";
      await fs.writeFile(filePath, content);

      const result = await fsHelper.readFile(filePath);
      expect(result).toBe(content);
    });

    it("should throw error for non-existing file", async () => {
      const filePath = path.join(testDir, "nonexistent.txt");

      await expect(fsHelper.readFile(filePath)).rejects.toThrow();
    });
  });

  describe("writeFile", () => {
    it("should write content to file", async () => {
      const filePath = path.join(testDir, "output.txt");
      const content = "Test content";

      await fsHelper.writeFile(filePath, content);

      const readContent = await fs.readFile(filePath, "utf-8");
      expect(readContent).toBe(content);
    });
  });

  describe("readJson", () => {
    it("should read and parse JSON file", async () => {
      const filePath = path.join(testDir, "data.json");
      const data = {name: "test", value: 42};
      await fs.writeFile(filePath, JSON.stringify(data));

      const result = await fsHelper.readJson<typeof data>(filePath);
      expect(result).toEqual(data);
    });

    it("should throw error for invalid JSON", async () => {
      const filePath = path.join(testDir, "invalid.json");
      await fs.writeFile(filePath, "not valid json");

      await expect(fsHelper.readJson(filePath)).rejects.toThrow();
    });
  });

  describe("writeJson", () => {
    it("should write object as JSON file", async () => {
      const filePath = path.join(testDir, "output.json");
      const data = {name: "test", value: 42};

      await fsHelper.writeJson(filePath, data);

      const content = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(data);
    });

    it("should format JSON with indentation", async () => {
      const filePath = path.join(testDir, "formatted.json");
      const data = {name: "test"};

      await fsHelper.writeJson(filePath, data);

      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toContain("\n");
      expect(content).toContain("  ");
    });
  });

  describe("find", () => {
    it("should find files matching pattern", async () => {
      await fs.writeFile(path.join(testDir, "file1.txt"), "");
      await fs.writeFile(path.join(testDir, "file2.txt"), "");
      await fs.writeFile(path.join(testDir, "file3.log"), "");

      const files = await fsHelper.find(testDir, /\.txt$/);
      expect(files).toHaveLength(2);
      expect(files.every((f) => f.endsWith(".txt"))).toBe(true);
    });

    it("should return empty array when no matches", async () => {
      const files = await fsHelper.find(testDir, /\.nonexistent$/);
      expect(files).toEqual([]);
    });
  });

  describe("copy", () => {
    it("should copy file to destination", async () => {
      const sourcePath = path.join(testDir, "source.txt");
      const destPath = path.join(testDir, "dest.txt");
      const content = "Copy me";
      await fs.writeFile(sourcePath, content);

      await fsHelper.copy(sourcePath, destPath);

      const copiedContent = await fs.readFile(destPath, "utf-8");
      expect(copiedContent).toBe(content);
    });
  });

  describe("remove", () => {
    it("should remove file", async () => {
      const filePath = path.join(testDir, "remove-me.txt");
      await fs.writeFile(filePath, "content");

      await fsHelper.remove(filePath);

      const exists = await fsHelper.exists(filePath);
      expect(exists).toBe(false);
    });

    it("should remove directory recursively", async () => {
      const dirPath = path.join(testDir, "remove-dir");
      await fs.mkdir(dirPath);
      await fs.writeFile(path.join(dirPath, "file.txt"), "content");

      await fsHelper.remove(dirPath);

      const exists = await fsHelper.exists(dirPath);
      expect(exists).toBe(false);
    });
  });

  describe("mkdirP", () => {
    it("should create directory recursively", async () => {
      const dirPath = path.join(testDir, "nested", "deep", "directory");

      await fsHelper.mkdirP(dirPath);

      const stat = await fs.stat(dirPath);
      expect(stat.isDirectory()).toBe(true);
    });

    it("should not throw if directory already exists", async () => {
      await fs.mkdir(path.join(testDir, "existing"));

      await expect(fsHelper.mkdirP(path.join(testDir, "existing"))).resolves.not.toThrow();
    });
  });

  describe("isReadable", () => {
    it("should return true for readable file", async () => {
      const filePath = path.join(testDir, "readable.txt");
      await fs.writeFile(filePath, "content");

      const result = await fsHelper.isReadable(filePath);
      expect(result).toBe(true);
    });

    it("should return false for non-existing file", async () => {
      const result = await fsHelper.isReadable(path.join(testDir, "nonexistent.txt"));
      expect(result).toBe(false);
    });
  });

  describe("isWritable", () => {
    it("should return true for writable directory", async () => {
      const result = await fsHelper.isWritable(testDir);
      expect(result).toBe(true);
    });

    it("should return false for non-existing file", async () => {
      const result = await fsHelper.isWritable(path.join(testDir, "nonexistent.txt"));
      expect(result).toBe(false);
    });
  });

  describe("readText", () => {
    it("should read text file content", async () => {
      const filePath = path.join(testDir, "text.txt");
      const content = "Hello World";
      await fs.writeFile(filePath, content);

      const result = await fsHelper.readText(filePath);
      expect(result).toBe(content);
    });

    it("should support custom encoding", async () => {
      const filePath = path.join(testDir, "ascii.txt");
      await fs.writeFile(filePath, "ASCII text", "ascii");

      const result = await fsHelper.readText(filePath, "ascii");
      expect(result).toBe("ASCII text");
    });

    it("should throw error for non-existing file", async () => {
      await expect(fsHelper.readText(path.join(testDir, "missing.txt"))).rejects.toThrow("Failed to read text file");
    });
  });

  describe("writeText", () => {
    it("should write text content to file", async () => {
      const filePath = path.join(testDir, "output.txt");
      const content = "Test content";

      await fsHelper.writeText(filePath, content);

      const readContent = await fs.readFile(filePath, "utf-8");
      expect(readContent).toBe(content);
    });

    it("should create parent directories with recursive option", async () => {
      const filePath = path.join(testDir, "nested", "dir", "file.txt");

      await fsHelper.writeText(filePath, "content", {recursive: true});

      const exists = await fsHelper.exists(filePath);
      expect(exists).toBe(true);
    });

    it("should support custom encoding", async () => {
      const filePath = path.join(testDir, "encoded.txt");

      await fsHelper.writeText(filePath, "content", {encoding: "ascii"});

      const content = await fs.readFile(filePath, "ascii");
      expect(content).toBe("content");
    });
  });

  describe("move", () => {
    it("should move file to new location", async () => {
      const sourcePath = path.join(testDir, "source.txt");
      const destPath = path.join(testDir, "destination.txt");
      const content = "Move me";
      await fs.writeFile(sourcePath, content);

      await fsHelper.move(sourcePath, destPath);

      const sourceExists = await fsHelper.exists(sourcePath);
      const destExists = await fsHelper.exists(destPath);
      expect(sourceExists).toBe(false);
      expect(destExists).toBe(true);

      const movedContent = await fs.readFile(destPath, "utf-8");
      expect(movedContent).toBe(content);
    });

    it("should throw error when moving non-existing file", async () => {
      await expect(fsHelper.move(path.join(testDir, "missing.txt"), path.join(testDir, "dest.txt"))).rejects.toThrow("Failed to move");
    });
  });

  describe("createDirectory", () => {
    it("should create new directory", async () => {
      const dirPath = path.join(testDir, "new-dir");

      await fsHelper.createDirectory(dirPath);

      const stat = await fs.stat(dirPath);
      expect(stat.isDirectory()).toBe(true);
    });

    it("should create nested directories", async () => {
      const dirPath = path.join(testDir, "nested", "dirs", "here");

      await fsHelper.createDirectory(dirPath);

      const stat = await fs.stat(dirPath);
      expect(stat.isDirectory()).toBe(true);
    });
  });

  describe("getInfo", () => {
    it("should get file information", async () => {
      const filePath = path.join(testDir, "info.txt");
      const content = "12345";
      await fs.writeFile(filePath, content);

      const info = await fsHelper.getInfo(filePath);

      expect(info.path).toBe(filePath);
      expect(info.size).toBe(content.length);
      expect(info.isFile).toBe(true);
      expect(info.isDirectory).toBe(false);
      expect(info.created).toBeInstanceOf(Date);
      expect(info.modified).toBeInstanceOf(Date);
    });

    it("should get directory information", async () => {
      const dirPath = path.join(testDir, "info-dir");
      await fs.mkdir(dirPath);

      const info = await fsHelper.getInfo(dirPath);

      expect(info.isDirectory).toBe(true);
      expect(info.isFile).toBe(false);
    });

    it("should throw error for non-existing path", async () => {
      await expect(fsHelper.getInfo(path.join(testDir, "nonexistent"))).rejects.toThrow("Failed to get info");
    });
  });

  describe("list", () => {
    it("should list files in directory", async () => {
      await fs.writeFile(path.join(testDir, "file1.txt"), "");
      await fs.writeFile(path.join(testDir, "file2.txt"), "");

      const files = await fsHelper.list(testDir);

      expect(files.length).toBeGreaterThanOrEqual(2);
      expect(files.some((f) => f.endsWith("file1.txt"))).toBe(true);
      expect(files.some((f) => f.endsWith("file2.txt"))).toBe(true);
    });

    it("should filter files by pattern", async () => {
      await fs.writeFile(path.join(testDir, "file1.txt"), "");
      await fs.writeFile(path.join(testDir, "file2.log"), "");

      const files = await fsHelper.list(testDir, {pattern: /\.txt$/});

      expect(files).toHaveLength(1);
      expect(files[0]).toContain("file1.txt");
    });

    it("should exclude hidden files by default", async () => {
      await fs.writeFile(path.join(testDir, ".hidden"), "");
      await fs.writeFile(path.join(testDir, "visible.txt"), "");

      const files = await fsHelper.list(testDir);

      expect(files.every((f) => !path.basename(f).startsWith("."))).toBe(true);
    });

    it("should include hidden files when specified", async () => {
      await fs.writeFile(path.join(testDir, ".hidden"), "");

      const files = await fsHelper.list(testDir, {includeHidden: true});

      expect(files.some((f) => path.basename(f).startsWith("."))).toBe(true);
    });

    it("should throw error for non-existing directory", async () => {
      await expect(fsHelper.list(path.join(testDir, "nonexistent"))).rejects.toThrow("Failed to list directory");
    });
  });

  describe("readTail", () => {
    it("should read last N lines from file", async () => {
      const filePath = path.join(testDir, "lines.txt");
      const lines = ["line1", "line2", "line3", "line4", "line5"];
      await fs.writeFile(filePath, lines.join("\n"));

      const tail = await fsHelper.readTail(filePath, 2);

      expect(tail).toBe("line4\nline5");
    });

    it("should handle reading more lines than exist", async () => {
      const filePath = path.join(testDir, "short.txt");
      await fs.writeFile(filePath, "line1\nline2");

      const tail = await fsHelper.readTail(filePath, 10);

      expect(tail).toBe("line1\nline2");
    });

    it("should throw error for non-existing file", async () => {
      await expect(fsHelper.readTail(path.join(testDir, "missing.txt"), 5)).rejects.toThrow("Failed to read tail");
    });
  });

  describe("ensureDirectory", () => {
    it("should create directory if it does not exist", async () => {
      const dirPath = path.join(testDir, "ensure-dir");

      await fsHelper.ensureDirectory(dirPath);

      const stat = await fs.stat(dirPath);
      expect(stat.isDirectory()).toBe(true);
    });

    it("should not throw if directory already exists", async () => {
      const dirPath = path.join(testDir, "existing-dir");
      await fs.mkdir(dirPath);

      await expect(fsHelper.ensureDirectory(dirPath)).resolves.not.toThrow();
    });

    it("should create nested directories", async () => {
      const dirPath = path.join(testDir, "ensure", "nested", "dir");

      await fsHelper.ensureDirectory(dirPath);

      const stat = await fs.stat(dirPath);
      expect(stat.isDirectory()).toBe(true);
    });
  });
});
