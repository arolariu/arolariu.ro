/** @fileoverview Host I/O primitives for the scoped worktree registry and IPv4 reservations. */
import {Effect} from "effect";
import {randomBytes} from "node:crypto";
import {link, lstat, mkdir, open, readdir, realpath, rename, unlink, writeFile} from "node:fs/promises";
import {createServer} from "node:net";
import {normalize} from "node:path";

/** Bridges a host I/O promise without discarding its error code. */
export function worktreeIO<A>(operation: () => Promise<A>): Effect.Effect<A, unknown> {
  return Effect.tryPromise({try: operation, catch: (error) => error});
}

/** Produces the native path comparison key (case-insensitive on Windows). */
export function worktreePathKey(path: string): string {
  const nativePath = normalize(path);
  return process.platform === "win32" ? nativePath.toLowerCase() : nativePath;
}

/** Tests for a specific host error without suppressing other failures. */
export function worktreeFileError(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

/** Verifies a directory without accepting redirection; distinguishes absence from invalid state. */
export async function worktreeDirectory(path: string): Promise<boolean> {
  try {
    const stat = await lstat(path);
    if (!stat.isDirectory() || stat.isSymbolicLink() || worktreePathKey(await realpath(path)) !== worktreePathKey(path)) {
      throw new Error("Redirected directory");
    }
    return true;
  } catch (error) {
    if (worktreeFileError(error, "ENOENT")) return false;
    throw error;
  }
}

/** Creates an exclusive private directory at an already selected registry path. */
export function makeRegistryDirectory(path: string): Promise<void> {
  return mkdir(path, {mode: 0o700});
}

/** Lists the immediate entries of a registry directory. */
export function listRegistryDirectory(path: string): Promise<string[]> {
  return readdir(path);
}

/** Unlinks one exact registry entry. Never traverses or removes a directory. */
export function unlinkRegistryEntry(path: string): Promise<void> {
  return unlink(path);
}

/** Checks a directory entry without following it. */
export async function registryEntryExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (worktreeFileError(error, "ENOENT")) return false;
    throw error;
  }
}

/** Holds one exclusive file handle; the caller selects and validates the lock path. */
export async function acquireRegistryLock(path: string): Promise<() => Promise<void>> {
  const lock = await open(path, "wx", 0o600);
  return async () => {
    await lock.close();
    await unlink(path);
  };
}

/** Reads bounded UTF-8 bytes from a private, canonical, single-link file. */
export function readRegistryText(path: string, maximumBytes: number): Effect.Effect<string | undefined, unknown> {
  return Effect.gen(function* () {
    const stat = yield* Effect.gen(function* () {
      const initial = yield* worktreeIO(() => lstat(path));
      // Exclusive publications briefly have two links. Do not accept persistent hard links.
      if (initial.nlink !== 2) return initial;
      yield* Effect.sleep("20 millis");
      return yield* worktreeIO(() => lstat(path));
    }).pipe(Effect.catch((error) => (worktreeFileError(error, "ENOENT") ? Effect.succeed(undefined) : Effect.fail(error))));
    if (stat === undefined) return undefined;
    return yield* worktreeIO(async () => {
      if (
        !stat.isFile()
        || stat.nlink !== 1
        || stat.size > maximumBytes
        || worktreePathKey(await realpath(path)) !== worktreePathKey(path)
      ) {
        throw new Error("Invalid registry file");
      }
      const file = await open(path, "r");
      try {
        const bytes = Buffer.alloc(maximumBytes + 1);
        const {bytesRead} = await file.read({buffer: bytes, length: bytes.length});
        if (bytesRead === 0 || bytesRead > maximumBytes || bytesRead !== (await file.stat()).size)
          throw new Error("Invalid registry file size");
        return new TextDecoder("utf-8", {fatal: true}).decode(bytes.subarray(0, bytesRead));
      } finally {
        await file.close();
      }
    });
  });
}

/** Publishes text atomically without overwriting an existing file. */
export async function publishRegistryText(path: string, text: string): Promise<void> {
  const temp = `${path}.${randomBytes(16).toString("hex")}.tmp`;
  await writeFile(temp, text, {flag: "wx", mode: 0o600});
  try {
    // NTFS hard-link creation is atomic and fails if the destination already exists.
    await link(temp, path);
  } finally {
    await unlink(temp);
  }
}

/** Atomically replaces one registry file with complete text. */
export async function replaceRegistryText(path: string, temp: string, text: string): Promise<void> {
  await writeFile(temp, text, {flag: "wx", mode: 0o600});
  try {
    await rename(temp, path);
  } catch (error) {
    await unlink(temp);
    throw error;
  }
}

/** An owned reservation; its close operation targets only this socket. */
export interface WorktreePortReservation {
  readonly port: number;
  readonly close: () => Promise<void>;
}

/** Opens a TCP reservation on IPv4 loopback only; never identifies or stops another listener. */
export async function listenWorktreePort(port: number): Promise<WorktreePortReservation> {
  const server = createServer((socket) => socket.destroy());
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen({host: "127.0.0.1", port, exclusive: true}, resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    server.close();
    throw new Error("Expected loopback port");
  }
  return {
    port: address.port,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

/** Attempts every close before returning any close failure. */
export function closeWorktreePorts(held: readonly WorktreePortReservation[]): Effect.Effect<void, unknown> {
  return Effect.forEach(held, ({close}) => Effect.result(worktreeIO(close)), {concurrency: "unbounded"}).pipe(
    Effect.flatMap((closed) => Effect.forEach(closed, Effect.fromResult, {discard: true})),
  );
}
