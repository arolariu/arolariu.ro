/**
 * @fileoverview Sole Node.js-backed {@link FileSystem} implementation.
 * @module scripts/adapters/node/node-filesystem
 *
 * @remarks
 * Every method maps onto one `node:fs/promises` primitive and reports failures as a code-preserving
 * {@link FileSystemError}, except {@link ReadOnlyFileSystem.readText} and the unbounded branch of
 * {@link ReadOnlyFileSystem.readBytes}, which return the underlying rejection unchanged. No other
 * production script may import `node:fs`, `node:fs/promises`, or `node:os`.
 */

import {constants as fsConstants} from "node:fs";
import {
  access,
  chmod,
  cp,
  mkdir,
  mkdtemp,
  open,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
  glob as fsGlob,
} from "node:fs/promises";
import {tmpdir} from "node:os";
import {basename, dirname, resolve} from "node:path";
import {randomBytes} from "node:crypto";

import {
  FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE,
  FileSystemError,
  type DirectoryEntry,
  type FileKind,
  type FileMetadata,
  type FileSystem,
  type TemporaryDirectory,
} from "../../core/runtime/runtime-capability.ts";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function nodeErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  const {code} = error;
  return typeof code === "string" ? code : undefined;
}

function hasNodeErrorCode(error: unknown, code: string): boolean {
  return nodeErrorCode(error) === code;
}

function toFileSystemError(operation: string, path: string, error: unknown): FileSystemError {
  const code = nodeErrorCode(error);
  return new FileSystemError(operation, path, `Failed to ${operation} '${path}': ${errorMessage(error)}`, {
    ...(code === undefined ? {} : {code}),
    cause: error,
  });
}

/**
 * Writes text to a caller-owned destination through an exclusive random sibling, applying the
 * requested modes, then renaming the sibling onto the destination so readers never observe a
 * partially written file. Only the resolved sibling this call created is removed on failure.
 *
 * @param path - Destination path.
 * @param contents - Text to write.
 * @param options - Optional file mode and parent-directory creation mode.
 * @throws {FileSystemError} When the temporary write or final rename fails.
 */
async function writeTextAtomically(
  path: string,
  contents: string,
  options: Readonly<{mode?: number; directoryMode?: number}>,
): Promise<void> {
  const parent = dirname(path);
  const temporaryPath = resolve(parent, `.${basename(path)}.${randomBytes(8).toString("hex")}.tmp`);

  try {
    await mkdir(parent, {recursive: true, ...(options.directoryMode === undefined ? {} : {mode: options.directoryMode})});
    await writeFile(temporaryPath, contents, {
      encoding: "utf8",
      flag: "wx",
      ...(options.mode === undefined ? {} : {mode: options.mode}),
    });
    await rename(temporaryPath, path);
  } catch (error: unknown) {
    try {
      await rm(temporaryPath, {force: true});
    } catch {
      // Preserve the original write/rename failure; never widen cleanup past the exact sibling
      // this call created.
    }
    throw toFileSystemError("writeTextAtomic", path, error);
  }
}

function classifyFileKind(stats: Readonly<{isDirectory: () => boolean; isFile: () => boolean}>): Exclude<FileKind, "missing"> {
  if (stats.isDirectory()) {
    return "directory";
  }
  return stats.isFile() ? "file" : "other";
}

/** Sole Node.js-backed {@link FileSystem} implementation. */
class NodeFileSystem implements FileSystem {
  /** {@inheritDoc ReadOnlyFileSystem.readText} */
  public readText(path: string): Promise<string> {
    return readFile(path, "utf8");
  }
  /** {@inheritDoc ReadOnlyFileSystem.readBytes} */
  public async readBytes(path: string, options: Readonly<{maximumBytes?: number}> = {}): Promise<Uint8Array> {
    const {maximumBytes} = options;
    if (maximumBytes === undefined) {
      return new Uint8Array(await readFile(path));
    }
    if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0) {
      throw new RangeError("maximumBytes must be a non-negative safe integer.");
    }
    const handle = await open(path, "r");
    try {
      const buffer = Buffer.allocUnsafe(maximumBytes + 1);
      let bytesRead = 0;
      while (bytesRead < buffer.length) {
        // Intentionally sequential: each read must observe the file position left by the
        // previous read into the same shared buffer.
        // eslint-disable-next-line no-await-in-loop
        const result = await handle.read(buffer, bytesRead, buffer.length - bytesRead, bytesRead);
        if (result.bytesRead === 0) {
          break;
        }
        bytesRead += result.bytesRead;
      }
      if (bytesRead > maximumBytes) {
        throw new FileSystemError("readBytes", path, `File exceeds the ${String(maximumBytes)} byte limit.`, {
          code: FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE,
        });
      }
      return new Uint8Array(buffer.subarray(0, bytesRead));
    } finally {
      await handle.close();
    }
  }
  /** {@inheritDoc ReadOnlyFileSystem.exists} */
  public async exists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch (error: unknown) {
      if (hasNodeErrorCode(error, "ENOENT")) {
        return false;
      }
      throw toFileSystemError("exists", path, error);
    }
  }
  /** {@inheritDoc ReadOnlyFileSystem.assertAccessible} */
  public async assertAccessible(
    path: string,
    accessOptions: Readonly<{read?: boolean; write?: boolean; execute?: boolean}> = {},
  ): Promise<void> {
    let mode = 0;
    if (accessOptions.read === true) {
      mode |= fsConstants.R_OK;
    }
    if (accessOptions.write === true) {
      mode |= fsConstants.W_OK;
    }
    if (accessOptions.execute === true) {
      mode |= fsConstants.X_OK;
    }
    try {
      await access(path, mode === 0 ? fsConstants.F_OK : mode);
    } catch (error: unknown) {
      throw toFileSystemError("assertAccessible", path, error);
    }
  }
  /** {@inheritDoc ReadOnlyFileSystem.realPath} */
  public async realPath(path: string): Promise<string> {
    try {
      return await realpath(path);
    } catch (error: unknown) {
      throw toFileSystemError("realPath", path, error);
    }
  }
  /** {@inheritDoc ReadOnlyFileSystem.inspect} */
  public async inspect(path: string): Promise<FileMetadata> {
    try {
      const stats = await stat(path);
      return {
        kind: classifyFileKind(stats),
        size: stats.size,
        mode: stats.mode,
        modifiedAt: stats.mtime,
      };
    } catch (error: unknown) {
      if (hasNodeErrorCode(error, "ENOENT")) {
        return {kind: "missing", size: 0};
      }
      throw toFileSystemError("inspect", path, error);
    }
  }
  /** {@inheritDoc ReadOnlyFileSystem.readDirectory} */
  public async readDirectory(path: string): Promise<readonly DirectoryEntry[]> {
    try {
      const entries = await readdir(path, {withFileTypes: true});
      return entries.map((entry) => ({name: entry.name, kind: classifyFileKind(entry)}));
    } catch (error: unknown) {
      throw toFileSystemError("readDirectory", path, error);
    }
  }
  /** {@inheritDoc ReadOnlyFileSystem.glob} */
  public async glob(
    patterns: string | readonly string[],
    options: Readonly<{cwd?: string; onlyFiles?: boolean}> = {},
  ): Promise<readonly string[]> {
    const cwd = options.cwd ?? process.cwd();
    const matches: string[] = [];
    try {
      for await (const entry of fsGlob(patterns, {cwd, withFileTypes: true})) {
        if (options.onlyFiles === true && entry.isDirectory()) {
          continue;
        }
        matches.push(resolve(entry.parentPath, entry.name));
      }
    } catch (error: unknown) {
      throw toFileSystemError("glob", cwd, error);
    }
    return matches;
  }
  /** {@inheritDoc FileSystem.createDirectory} */
  public async createDirectory(path: string, options: Readonly<{recursive?: boolean; mode?: number}> = {}): Promise<void> {
    try {
      await mkdir(path, {recursive: options.recursive ?? false, ...(options.mode === undefined ? {} : {mode: options.mode})});
    } catch (error: unknown) {
      throw toFileSystemError("createDirectory", path, error);
    }
  }
  /** {@inheritDoc FileSystem.writeText} */
  public async writeText(path: string, contents: string, options: Readonly<{mode?: number; exclusive?: boolean}> = {}): Promise<void> {
    try {
      await writeFile(path, contents, {
        encoding: "utf8",
        flag: options.exclusive === true ? "wx" : "w",
        ...(options.mode === undefined ? {} : {mode: options.mode}),
      });
    } catch (error: unknown) {
      throw toFileSystemError("writeText", path, error);
    }
  }
  /** {@inheritDoc FileSystem.writeBytes} */
  public async writeBytes(path: string, contents: Uint8Array, options: Readonly<{mode?: number; exclusive?: boolean}> = {}): Promise<void> {
    try {
      await writeFile(path, contents, {
        flag: options.exclusive === true ? "wx" : "w",
        ...(options.mode === undefined ? {} : {mode: options.mode}),
      });
    } catch (error: unknown) {
      throw toFileSystemError("writeBytes", path, error);
    }
  }
  /** {@inheritDoc FileSystem.writeTextAtomic} */
  public writeTextAtomic(path: string, contents: string, options: Readonly<{mode?: number; directoryMode?: number}> = {}): Promise<void> {
    return writeTextAtomically(path, contents, options);
  }
  /** {@inheritDoc FileSystem.copy} */
  public async copy(source: string, destination: string, options: Readonly<{recursive?: boolean; force?: boolean}> = {}): Promise<void> {
    try {
      await cp(source, destination, {recursive: options.recursive ?? false, force: options.force ?? true});
    } catch (error: unknown) {
      throw toFileSystemError("copy", source, error);
    }
  }
  /** {@inheritDoc FileSystem.move} */
  public async move(source: string, destination: string): Promise<void> {
    try {
      await rename(source, destination);
    } catch (error: unknown) {
      throw toFileSystemError("move", source, error);
    }
  }
  /** {@inheritDoc FileSystem.remove} */
  public async remove(path: string, options: Readonly<{recursive?: boolean; force?: boolean}> = {}): Promise<void> {
    try {
      await rm(path, {recursive: options.recursive ?? false, force: options.force ?? false});
    } catch (error: unknown) {
      throw toFileSystemError("remove", path, error);
    }
  }
  /** {@inheritDoc FileSystem.createTemporaryDirectory} */
  public async createTemporaryDirectory(prefix: string): Promise<TemporaryDirectory> {
    let directoryPath: string;
    try {
      directoryPath = await mkdtemp(resolve(tmpdir(), prefix));
    } catch (error: unknown) {
      throw toFileSystemError("createTemporaryDirectory", prefix, error);
    }
    return {
      path: directoryPath,
      remove: async (): Promise<void> => {
        try {
          await rm(directoryPath, {recursive: true, force: true});
        } catch (error: unknown) {
          throw toFileSystemError("createTemporaryDirectory.remove", directoryPath, error);
        }
      },
    };
  }
  /** {@inheritDoc FileSystem.setMode} */
  public async setMode(path: string, mode: number): Promise<void> {
    try {
      await chmod(path, mode);
    } catch (error: unknown) {
      throw toFileSystemError("setMode", path, error);
    }
  }
}

/** Sole Node.js-backed {@link FileSystem}. */
export const nodeFileSystem: FileSystem = new NodeFileSystem();
