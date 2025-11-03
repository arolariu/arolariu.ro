/**
 * @fileoverview File system operations using @actions/io and native Node.js fs
 * @module helpers/filesystem
 * 
 * Provides a clean, unified API for file system operations in GitHub Actions.
 * Combines @actions/io for cross-platform operations with native fs for advanced features.
 * Follows Single Responsibility Principle by focusing solely on file operations.
 */

import * as io from "@actions/io";
import * as core from "@actions/core";
import { access, readdir, readFile, writeFile, mkdir, stat, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { constants } from "node:fs";

/**
 * File system operation options
 */
export interface FileOperationOptions {
  /** Whether to create parent directories if they don't exist */
  recursive?: boolean;
  /** File encoding (default: utf-8) */
  encoding?: BufferEncoding;
  /** Whether operation should be forced (e.g., remove readonly files) */
  force?: boolean;
}

/**
 * File information
 */
export interface FileInfo {
  /** Absolute file path */
  path: string;
  /** File size in bytes */
  size: number;
  /** Whether the path is a directory */
  isDirectory: boolean;
  /** Whether the path is a file */
  isFile: boolean;
  /** Creation time */
  created: Date;
  /** Last modified time */
  modified: Date;
}

/**
 * Directory traversal options
 */
export interface TraversalOptions {
  /** Pattern to match files (RegExp) */
  pattern?: RegExp;
  /** Maximum depth to traverse (-1 for unlimited) */
  maxDepth?: number;
  /** Whether to include hidden files */
  includeHidden?: boolean;
}

/**
 * File system helper interface
 * Provides methods for common file system operations
 */
export interface IFileSystemHelper {
  /**
   * Checks if a path exists and is accessible
   * @param path - Path to check
   * @returns Promise resolving to true if exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Checks if a path is readable
   * @param path - Path to check
   * @returns Promise resolving to true if readable
   */
  isReadable(path: string): Promise<boolean>;

  /**
   * Checks if a path is writable
   * @param path - Path to check
   * @returns Promise resolving to true if writable
   */
  isWritable(path: string): Promise<boolean>;

  /**
   * Reads a text file
   * @param path - Path to file
   * @param encoding - File encoding (default: utf-8)
   * @returns Promise resolving to file content
   */
  readText(path: string, encoding?: BufferEncoding): Promise<string>;

  /**
   * Reads and parses a JSON file
   * @param path - Path to JSON file
   * @returns Promise resolving to parsed JSON
   */
  readJson<T = unknown>(path: string): Promise<T>;

  /**
   * Writes text to a file
   * @param path - Path to file
   * @param content - Content to write
   * @param options - Write options
   * @returns Promise resolving when write completes
   */
  writeText(path: string, content: string, options?: FileOperationOptions): Promise<void>;

  /**
   * Writes JSON to a file
   * @param path - Path to file
   * @param data - Data to serialize
   * @param options - Write options
   * @returns Promise resolving when write completes
   */
  writeJson(path: string, data: unknown, options?: FileOperationOptions): Promise<void>;

  /**
   * Copies a file or directory
   * @param source - Source path
   * @param destination - Destination path
   * @param options - Copy options
   * @returns Promise resolving when copy completes
   */
  copy(source: string, destination: string, options?: FileOperationOptions): Promise<void>;

  /**
   * Moves a file or directory
   * @param source - Source path
   * @param destination - Destination path
   * @param options - Move options
   * @returns Promise resolving when move completes
   */
  move(source: string, destination: string, options?: FileOperationOptions): Promise<void>;

  /**
   * Removes a file or directory
   * @param path - Path to remove
   * @param options - Remove options
   * @returns Promise resolving when removal completes
   */
  remove(path: string, options?: FileOperationOptions): Promise<void>;

  /**
   * Creates a directory
   * @param path - Directory path
   * @param options - Creation options
   * @returns Promise resolving when directory is created
   */
  createDirectory(path: string, options?: FileOperationOptions): Promise<void>;

  /**
   * Gets file information
   * @param path - Path to file or directory
   * @returns Promise resolving to file information
   */
  getInfo(path: string): Promise<FileInfo>;

  /**
   * Lists directory contents
   * @param path - Directory path
   * @param options - Traversal options
   * @returns Promise resolving to array of file paths
   */
  list(path: string, options?: TraversalOptions): Promise<string[]>;

  /**
   * Finds files matching a pattern
   * @param directory - Directory to search
   * @param pattern - RegExp pattern to match
   * @param maxDepth - Maximum depth to search (-1 for unlimited)
   * @returns Promise resolving to array of matching file paths
   */
  find(directory: string, pattern: RegExp, maxDepth?: number): Promise<string[]>;

  /**
   * Reads the last N lines from a file (tail operation)
   * @param path - File path
   * @param lineCount - Number of lines to read from end
   * @returns Promise resolving to last N lines joined by newlines
   */
  readTail(path: string, lineCount: number): Promise<string>;

  /**
   * Ensures a directory exists, creating it if necessary
   * @param path - Directory path
   * @returns Promise resolving when directory exists
   */
  ensureDirectory(path: string): Promise<void>;
}

/**
 * Implementation of file system helper
 */
export class FileSystemHelper implements IFileSystemHelper {
  /**
   * {@inheritDoc IFileSystemHelper.exists}
   */
  async exists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * {@inheritDoc IFileSystemHelper.isReadable}
   */
  async isReadable(path: string): Promise<boolean> {
    try {
      await access(path, constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * {@inheritDoc IFileSystemHelper.isWritable}
   */
  async isWritable(path: string): Promise<boolean> {
    try {
      await access(path, constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * {@inheritDoc IFileSystemHelper.readText}
   */
  async readText(path: string, encoding: BufferEncoding = "utf-8"): Promise<string> {
    try {
      core.debug(`Reading text file: ${path}`);
      const content = await readFile(path, encoding);
      return content;
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to read text file '${path}': ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IFileSystemHelper.readJson}
   */
  async readJson<T = unknown>(path: string): Promise<T> {
    try {
      core.debug(`Reading JSON file: ${path}`);
      const content = await this.readText(path);
      return JSON.parse(content) as T;
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to read JSON file '${path}': ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IFileSystemHelper.writeText}
   */
  async writeText(path: string, content: string, options: FileOperationOptions = {}): Promise<void> {
    try {
      core.debug(`Writing text file: ${path}`);
      
      if (options.recursive) {
        await this.ensureDirectory(dirname(path));
      }

      await writeFile(path, content, { encoding: options.encoding ?? "utf-8" });
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to write text file '${path}': ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IFileSystemHelper.writeJson}
   */
  async writeJson(path: string, data: unknown, options: FileOperationOptions = {}): Promise<void> {
    try {
      core.debug(`Writing JSON file: ${path}`);
      const content = JSON.stringify(data, null, 2);
      await this.writeText(path, content, options);
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to write JSON file '${path}': ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IFileSystemHelper.copy}
   */
  async copy(source: string, destination: string, options: FileOperationOptions = {}): Promise<void> {
    try {
      core.debug(`Copying from ${source} to ${destination}`);
      
      await io.cp(source, destination, {
        recursive: options.recursive ?? true,
        force: options.force ?? false,
      });
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to copy '${source}' to '${destination}': ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IFileSystemHelper.move}
   */
  async move(source: string, destination: string, options: FileOperationOptions = {}): Promise<void> {
    try {
      core.debug(`Moving from ${source} to ${destination}`);
      
      await io.mv(source, destination, {
        force: options.force ?? false,
      });
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to move '${source}' to '${destination}': ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IFileSystemHelper.remove}
   */
  async remove(path: string, options: FileOperationOptions = {}): Promise<void> {
    try {
      core.debug(`Removing: ${path}`);
      
      if (await this.exists(path)) {
        await rm(path, {
          recursive: options.recursive ?? true,
          force: options.force ?? false,
        });
      }
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to remove '${path}': ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IFileSystemHelper.createDirectory}
   */
  async createDirectory(path: string, options: FileOperationOptions = {}): Promise<void> {
    try {
      core.debug(`Creating directory: ${path}`);
      
      await io.mkdirP(path);
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to create directory '${path}': ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IFileSystemHelper.getInfo}
   */
  async getInfo(path: string): Promise<FileInfo> {
    try {
      const stats = await stat(path);
      
      return {
        path,
        size: stats.size,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        created: stats.birthtime,
        modified: stats.mtime,
      };
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to get info for '${path}': ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IFileSystemHelper.list}
   */
  async list(path: string, options: TraversalOptions = {}): Promise<string[]> {
    try {
      core.debug(`Listing directory: ${path}`);
      
      const entries = await readdir(path, { withFileTypes: true });
      const result: string[] = [];

      for (const entry of entries) {
        if (!options.includeHidden && entry.name.startsWith(".")) {
          continue;
        }

        const fullPath = join(path, entry.name);
        
        if (options.pattern) {
          if (options.pattern.test(entry.name)) {
            result.push(fullPath);
          }
        } else {
          result.push(fullPath);
        }
      }

      return result;
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to list directory '${path}': ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IFileSystemHelper.find}
   */
  async find(directory: string, pattern: RegExp, maxDepth: number = -1): Promise<string[]> {
    try {
      core.debug(`Finding files in ${directory} matching ${pattern}`);
      
      const entries = await readdir(directory, { withFileTypes: true, recursive: maxDepth === -1 });
      const result: string[] = [];

      for (const entry of entries) {
        if (entry.isFile() && pattern.test(entry.name)) {
          const fullPath = join(entry.parentPath ?? directory, entry.name);
          result.push(fullPath);
        }
      }

      return result;
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to find files in '${directory}': ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IFileSystemHelper.readTail}
   */
  async readTail(path: string, lineCount: number): Promise<string> {
    try {
      core.debug(`Reading last ${lineCount} lines from ${path}`);
      
      const content = await this.readText(path);
      const lines = content.split("\n");
      const tailLines = lines.slice(-lineCount);
      
      return tailLines.join("\n");
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to read tail from '${path}': ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IFileSystemHelper.ensureDirectory}
   */
  async ensureDirectory(path: string): Promise<void> {
    if (!(await this.exists(path))) {
      await this.createDirectory(path, { recursive: true });
    }
  }
}

/**
 * Creates a new instance of the file system helper
 * @returns File system helper instance
 * @example
 * ```typescript
 * const fs = createFileSystemHelper();
 * const content = await fs.readText('./file.txt');
 * await fs.writeJson('./data.json', { key: 'value' });
 * await fs.copy('./source', './dest', { recursive: true });
 * ```
 */
export function createFileSystemHelper(): IFileSystemHelper {
  return new FileSystemHelper();
}

/**
 * Default file system helper instance
 * Exported for convenience - can be used directly without creating an instance
 */
export const fs = createFileSystemHelper();
