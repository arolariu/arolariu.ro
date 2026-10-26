/**
 * @fileoverview File system operations using @actions/io and native Node.js fs.
 * @module github/scripts/helpers/filesystem
 *
 * @remarks
 * Provides a clean, unified API for file system operations in GitHub Actions.
 * Combines @actions/io for cross-platform operations with native fs for advanced features.
 * Follows Single Responsibility Principle by focusing solely on file operations.
 */

import * as core from "../sdk/core.ts";
import * as io from "../sdk/io.ts";
import {randomUUID} from "node:crypto";
import {constants, type Dirent} from "node:fs";
import {access, mkdtemp, open, readdir, readFile, rename, rm, stat, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {basename, dirname, join} from "node:path";
import {Readable} from "node:stream";
import {pipeline} from "node:stream/promises";

/**
 * Owns a unique temporary directory through all awaited callback work.
 * @param prefix - A nonempty filename prefix, not a path.
 * @param run - Work that may use only this invocation's temporary directory.
 * @returns Callback result after cleanup completes.
 * @throws Original operation errors, or AggregateError if cleanup also fails.
 */
export async function withTemporaryDirectory<T>(prefix: string, run: (directory: string) => Promise<T>): Promise<T> {
  if (!prefix || /[\\/\0]/.test(prefix) || prefix === "." || prefix === "..") throw new TypeError("Invalid temporary directory prefix");
  const directory = await mkdtemp(join(tmpdir(), prefix));
  let failed = false;
  let failure: unknown;
  try {
    return await run(directory);
  } catch (error) {
    failed = true;
    failure = error;
    throw error;
  } finally {
    try {
      await rm(directory, {recursive: true, force: true});
    } catch (cleanup) {
      if (failed) throw new AggregateError([failure, cleanup], "Temporary work and cleanup failed");
      throw cleanup;
    }
  }
}

/** A streamed read observed more bytes than the caller allowed. */
export class FileSizeLimitError extends Error {
  readonly path: string;
  readonly maximumBytes: number;

  /**
   * Records an oversized input without retaining its contents.
   * @param path - Evidence path.
   * @param maximumBytes - Accepted byte ceiling.
   */
  constructor(path: string, maximumBytes: number) {
    super(`File '${path}' exceeds the ${maximumBytes} byte limit`);
    this.name = "FileSizeLimitError";
    this.path = path;
    this.maximumBytes = maximumBytes;
  }
}

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
  readonly path: string;
  /** File size in bytes */
  readonly size: number;
  /** Whether the path is a directory */
  readonly isDirectory: boolean;
  /** Whether the path is a file */
  readonly isFile: boolean;
  /** Creation time */
  readonly created: Date;
  /** Last modified time */
  readonly modified: Date;
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
   * Reads UTF-8 while enforcing an observed byte ceiling, including concurrent growth.
   * @param path - Evidence path.
   * @param maxBytes - Nonnegative safe-integer byte limit.
   * @returns Complete decoded contents, never silently truncated evidence.
   * @throws {FileSizeLimitError} When the input exceeds the limit.
   * @throws Native file errors or RangeError for an invalid limit.
   */
  readTextBounded(path: string, maxBytes: number): Promise<string>;

  /**
   * Reads bounded JSON and invokes its actual runtime decoder.
   * @param path - Evidence path.
   * @param decode - Domain decoder receiving unknown parsed JSON.
   * @param maxBytes - Nonnegative safe-integer byte limit.
   * @returns Validated domain data.
   * @throws File, JSON syntax, size, or decoder errors without returning substitute data.
   */
  readValidatedJson<T>(path: string, decode: (value: unknown) => T, maxBytes: number): Promise<T>;

  /**
   * Reads and parses a JSON file
   * @param path - Path to JSON file
   * @returns Promise resolving to parsed JSON
   * @remarks T is a caller assertion, not runtime validation; use readValidatedJson at transport boundaries.
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
   * Replaces JSON using an exclusively created sibling and rename.
   * @param path - Destination path; parents are created as needed.
   * @param value - JSON-serializable data.
   * @returns Completion after replacement is atomically visible to readers.
   * @throws Serialization, file, or cleanup errors; the previous destination survives a failed write.
   */
  writeJsonAtomic(path: string, value: unknown): Promise<void>;

  /**
   * Streams bytes into an owned sibling, then renames it over the destination.
   * @param path - Destination path.
   * @param source - Consumed readable; preparation or pipeline failure destroys it.
   * @returns Completion after stream closure and atomic replacement.
   * @throws The original operation error, or AggregateError if cleanup also fails.
   */
  writeStreamAtomic(path: string, source: Readable): Promise<void>;

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
   * @returns Files and directories; default depth is zero and symbolic links are not traversed.
   */
  list(path: string, options?: TraversalOptions): Promise<readonly string[]>;

  /**
   * Finds files matching a pattern
   * @param directory - Directory to search
   * @param pattern - RegExp pattern to match
   * @param maxDepth - Maximum depth to search (-1 for unlimited)
   * @returns Promise resolving to array of matching file paths
   */
  find(directory: string, pattern: RegExp, maxDepth?: number): Promise<readonly string[]>;

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

  /**
   * Reads a file (alias for readText for backward compatibility)
   * @param path - Path to file
   * @param encoding - File encoding (default: utf-8)
   * @returns Promise resolving to file content
   */
  readFile(path: string, encoding?: BufferEncoding): Promise<string>;

  /**
   * Writes to a file (alias for writeText for backward compatibility)
   * @param path - Path to file
   * @param content - Content to write
   * @param options - Write options
   * @returns Promise resolving when write completes
   */
  writeFile(path: string, content: string, options?: FileOperationOptions): Promise<void>;

  /**
   * Creates a directory with parent directories (alias for ensureDirectory)
   * @param path - Directory path
   * @returns Promise resolving when directory exists
   */
  mkdirP(path: string): Promise<void>;
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
    } catch (error) {
      if (error instanceof Error && "code" in error && (error.code === "ENOENT" || error.code === "ENOTDIR")) return false;
      throw error;
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

  /** {@inheritDoc IFileSystemHelper.readTextBounded} */
  async readTextBounded(path: string, maxBytes: number): Promise<string> {
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) throw new RangeError("maxBytes must be a nonnegative safe integer");
    const handle = await open(path, "r");
    try {
      const buffer = Buffer.alloc(Math.min(maxBytes + 1, 64 * 1024));
      const chunks: Buffer[] = [];
      let total = 0;
      while (true) {
        const {bytesRead} = await handle.read(buffer, 0, Math.min(buffer.length, maxBytes - total + 1), null);
        if (bytesRead === 0) break;
        total += bytesRead;
        if (total > maxBytes) throw new FileSizeLimitError(path, maxBytes);
        chunks.push(Buffer.from(buffer.subarray(0, bytesRead)));
      }
      return Buffer.concat(chunks, total).toString("utf8");
    } finally {
      await handle.close();
    }
  }

  /** {@inheritDoc IFileSystemHelper.readValidatedJson} */
  async readValidatedJson<T>(path: string, decode: (value: unknown) => T, maxBytes: number): Promise<T> {
    const content = await this.readTextBounded(path, maxBytes);
    const value: unknown = JSON.parse(content);
    return decode(value);
  }

  /**
   * {@inheritDoc IFileSystemHelper.readFile}
   * @deprecated Use readText instead
   */
  async readFile(path: string, encoding: BufferEncoding = "utf-8"): Promise<string> {
    return this.readText(path, encoding);
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

      await writeFile(path, content, {encoding: options.encoding ?? "utf-8"});
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to write text file '${path}': ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IFileSystemHelper.writeFile}
   * @deprecated Use writeText instead
   */
  async writeFile(path: string, content: string, options: FileOperationOptions = {}): Promise<void> {
    return this.writeText(path, content, options);
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

  /** {@inheritDoc IFileSystemHelper.writeJsonAtomic} */
  async writeJsonAtomic(path: string, value: unknown): Promise<void> {
    const content = JSON.stringify(value, null, 2);
    if (content === undefined) throw new TypeError("Value has no JSON representation");
    await this.writeStreamAtomic(path, Readable.from([content]));
  }

  /** {@inheritDoc IFileSystemHelper.writeStreamAtomic} */
  async writeStreamAtomic(path: string, source: Readable): Promise<void> {
    const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
    const prepare = async (): Promise<Awaited<ReturnType<typeof open>>> => {
      await this.ensureDirectory(dirname(path));
      return open(temporary, "wx");
    };
    const handle = await prepare().catch((error: unknown) => {
      source.destroy();
      throw error;
    });
    try {
      await pipeline(source, handle.createWriteStream({autoClose: true}));
      await handle.close();
      await rename(temporary, path);
    } catch (error) {
      const errors: unknown[] = [error];
      try {
        await handle.close();
      } catch (closeError) {
        errors.push(closeError);
      }
      try {
        await rm(temporary, {force: true});
      } catch (removeError) {
        errors.push(removeError);
      }
      if (errors.length > 1) throw new AggregateError(errors, `Atomic write and cleanup failed for '${path}'`);
      throw error;
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
  async createDirectory(path: string, _options: FileOperationOptions = {}): Promise<void> {
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
  async list(path: string, options: TraversalOptions = {}): Promise<readonly string[]> {
    const pattern = options.pattern && new RegExp(options.pattern.source, options.pattern.flags);
    const result: string[] = [];
    try {
      for await (const item of this.walk(path, options.maxDepth ?? 0, options.includeHidden ?? false)) {
        if (pattern) pattern.lastIndex = 0;
        if (!pattern || pattern.test(item.entry.name)) result.push(item.path);
      }
    } catch (error) {
      if (error instanceof Error && "code" in error) {
        throw new Error(`Failed to list directory '${path}': ${error.message}`, {cause: error});
      }
      throw error;
    }
    return result;
  }

  /**
   * {@inheritDoc IFileSystemHelper.find}
   */
  async find(directory: string, pattern: RegExp, maxDepth: number = -1): Promise<readonly string[]> {
    const matcher = new RegExp(pattern.source, pattern.flags);
    const result: string[] = [];
    for await (const item of this.walk(directory, maxDepth, true)) {
      matcher.lastIndex = 0;
      if (item.entry.isFile() && matcher.test(item.entry.name)) result.push(item.path);
    }
    return result;
  }

  private async *walk(directory: string, maxDepth: number, includeHidden: boolean): AsyncGenerator<{path: string; entry: Dirent}, void> {
    if (!Number.isSafeInteger(maxDepth) || maxDepth < -1) throw new RangeError("maxDepth must be -1 or a nonnegative safe integer");
    const pending = [{directory, depth: 0}];
    while (pending.length > 0) {
      const current = pending.pop();
      if (!current) break;
      for (const entry of await readdir(current.directory, {withFileTypes: true})) {
        if (!includeHidden && entry.name.startsWith(".")) continue;
        const path = join(current.directory, entry.name);
        yield {path, entry};
        if (entry.isDirectory() && (maxDepth === -1 || current.depth < maxDepth)) {
          pending.push({directory: path, depth: current.depth + 1});
        }
      }
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
      await this.createDirectory(path, {recursive: true});
    }
  }

  /**
   * {@inheritDoc IFileSystemHelper.mkdirP}
   * @deprecated Use ensureDirectory instead
   */
  async mkdirP(path: string): Promise<void> {
    return this.ensureDirectory(path);
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
