import {spawn, type ChildProcess, type SpawnOptions} from "node:child_process";
import {createHash} from "node:crypto";
import fs from "node:fs";
import {createRequire} from "node:module";
import {constants} from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

/** Termination signals that interrupt the packed gate. */
const TERMINATION_SIGNALS = ["SIGINT", "SIGTERM"] as const;

/** A termination signal handled by the packed gate. */
export type TerminationSignal = (typeof TERMINATION_SIGNALS)[number];

/** The part of `process` that delivers termination signals; tests inject an emitter instead of signalling a runner. */
export interface SignalSource {
  on(signal: TerminationSignal, listener: () => void): unknown;
  off(signal: TerminationSignal, listener: () => void): unknown;
}

/** The operations available to one packed gate run. */
export interface PackedGateSession {
  /**
   * Starts a child process that receives forwarded termination signals.
   *
   * @returns The child's piped stdout (empty when stdout is inherited); rejects when the child fails or the gate was
   * interrupted, in which case no child starts.
   */
  readonly run: (command: string, args: readonly string[], options: SpawnOptions) => Promise<string>;
  /** Creates a `.packed-contract-*` directory below `parent` that is removed when the gate run settles. */
  readonly temporaryDirectory: (parent: string) => string;
}

/** Reports a packed gate run that `SIGINT` or `SIGTERM` stopped after its temporary directories were removed. */
export class PackedGateInterruptedError extends Error {
  /** The first termination signal received. */
  readonly signal: TerminationSignal;
  /** The conventional exit status, 128 plus the signal number: `130` after `SIGINT`, `143` after `SIGTERM`. */
  readonly exitCode: number;

  constructor(signal: TerminationSignal) {
    super(`Packed verification was interrupted by ${signal}; its temporary extraction was removed`);
    this.name = "PackedGateInterruptedError";
    this.signal = signal;
    this.exitCode = 128 + constants.signals[signal];
  }
}

/**
 * Runs one packed gate with termination-signal forwarding and guaranteed removal of its temporary directories.
 *
 * @remarks
 * `SIGINT` and `SIGTERM` listeners stay installed while `work` runs, replacing the default action that would end this
 * process before cleanup. A received signal is forwarded to the running child (a terminal Ctrl+C already reached it, a
 * signal sent to this process alone did not) and no further child starts. Every directory from `temporaryDirectory()`
 * is removed once `work` settles, and an interrupted run rejects with {@link PackedGateInterruptedError}, so the gate
 * exits `130` or `143` like the repository CLI. A forced kill (`SIGKILL`, or process termination on Windows) cannot run
 * cleanup, so the root `.gitignore` ignores the `packages/components/.packed-contract-*` directories.
 *
 * @param work - The gate steps.
 * @param signals - The termination signal source.
 * @returns The value `work` resolves to.
 */
export async function runPackedGate<T>(work: (session: PackedGateSession) => Promise<T>, signals: SignalSource = process): Promise<T> {
  const children = new Set<ChildProcess>();
  const directories: string[] = [];
  let interruption: PackedGateInterruptedError | undefined;
  const listeners = TERMINATION_SIGNALS.map((signal) => {
    const listener = (): void => {
      interruption ??= new PackedGateInterruptedError(signal);
      for (const child of children) child.kill(signal);
    };
    return [signal, listener] as const;
  });
  const run: PackedGateSession["run"] = (command, args, options) => {
    if (interruption) return Promise.reject(interruption);
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, options);
      children.add(child);
      let output = "";
      child.stdout?.setEncoding("utf8").on("data", (chunk: string) => {
        output += chunk;
      });
      child.once("error", (error) => {
        children.delete(child);
        reject(error);
      });
      child.once("close", (code, signal) => {
        children.delete(child);
        if (code === 0) resolve(output);
        else reject(new Error(`${[command, ...args].join(" ")} failed with ${signal ?? `exit code ${code}`}`));
      });
    });
  };
  const temporaryDirectory = (parent: string): string => {
    const directory = fs.mkdtempSync(path.join(parent, ".packed-contract-"));
    directories.push(directory);
    return directory;
  };
  for (const [signal, listener] of listeners) signals.on(signal, listener);
  try {
    const result = await work({run, temporaryDirectory});
    if (interruption) throw interruption;
    return result;
  } catch (error) {
    // The interruption replaces the step failure it caused.
    throw interruption ?? error;
  } finally {
    for (const directory of directories) fs.rmSync(directory, {recursive: true, force: true});
    for (const [signal, listener] of listeners) signals.off(signal, listener);
  }
}

/**
 * Decides whether this module is the process entry point.
 *
 * @remarks
 * Node expands `process.argv[1]` to an absolute path but keeps symlinks and junctions, while `import.meta.url` names the
 * real file unless `--preserve-symlinks-main` is set. Both sides are compared as real paths, so a linked checkout runs
 * the gate instead of exiting `0` without verifying anything. For the same reason, an entry that names this script but
 * resolves to another file throws.
 *
 * @param entry - The entry argument, `process.argv[1]`; absent for `--eval`.
 * @param moduleUrl - The module's `import.meta.url`.
 * @returns `true` when both resolve to the same real file.
 */
export function isEntryModule(entry: string | undefined, moduleUrl: string): boolean {
  if (!entry) return false;
  const modulePath = fs.realpathSync(fileURLToPath(moduleUrl));
  let entryPath: string | undefined;
  try {
    entryPath = fs.realpathSync(path.resolve(entry));
  } catch {
    // An entry that names no file, such as `-` for standard input, is not this module.
  }
  if (entryPath === modulePath) return true;
  if (path.basename(entry) === path.basename(modulePath)) {
    throw new Error(`${entry} names the packed verification script but does not resolve to ${modulePath}`);
  }
  return false;
}

/**
 * Validates the single local archive reported by npm pack.
 *
 * @param output - The JSON stdout of npm pack.
 * @returns The archive's safe, package-local filename.
 */
export function parsePackedFilename(output: string): string {
  const result: unknown = JSON.parse(output);
  if (!Array.isArray(result) || result.length !== 1) throw new Error("npm pack must report exactly one archive");
  const entry: unknown = result[0];
  if (
    typeof entry !== "object"
    || entry === null
    || !("filename" in entry)
    || typeof entry.filename !== "string"
    || entry.filename !== path.basename(entry.filename)
    || entry.filename.includes("\\")
    || !entry.filename.endsWith(".tgz")
  ) {
    throw new Error("npm pack returned an invalid archive filename");
  }
  return entry.filename;
}

/**
 * Builds and tests the real npm archive with the existing Vitest runner and peers.
 *
 * @remarks
 * The isolated extraction lives beneath the package so real installed peers resolve naturally; {@link runPackedGate}
 * removes it when the run settles or is interrupted. No source aliases, dependency installation, or publish operation is
 * involved.
 *
 * @returns A promise that resolves once the packed suite passes.
 */
export async function verifyPackedArtifact(): Promise<void> {
  const directory = path.resolve(import.meta.dirname, "..");
  const npm = process.env["npm_execpath"];
  if (!npm) throw new Error("Run packed verification through npm run test:packed");
  await runPackedGate(async ({run, temporaryDirectory}) => {
    await run(process.execPath, [npm, "run", "build"], {cwd: directory, stdio: "inherit"});
    const temporary = temporaryDirectory(directory);
    const output = await run(process.execPath, [npm, "pack", "--ignore-scripts", "--json", "--pack-destination", temporary], {
      cwd: directory,
      stdio: ["ignore", "pipe", "inherit"],
    });
    const archive = path.join(temporary, parsePackedFilename(output));
    const hash = createHash("sha256").update(fs.readFileSync(archive)).digest("hex");
    console.log(`Verifying real npm archive ${path.basename(archive)} (sha256 ${hash})`);
    await run("tar", ["-xzf", archive, "-C", temporary], {cwd: directory, stdio: "inherit"});
    const packedRoot = fs.realpathSync(path.join(temporary, "package"));
    if (!fs.existsSync(path.join(packedRoot, "dist", "index.js")) || packedRoot === fs.realpathSync(directory)) {
      throw new Error("The real npm archive was not extracted into an isolated package");
    }
    const require = createRequire(import.meta.url);
    const vitest = path.join(path.dirname(require.resolve("vitest/package.json")), "vitest.mjs");
    await run(process.execPath, [vitest, "run", "--maxWorkers=2", ...process.argv.slice(2)], {
      cwd: directory,
      stdio: "inherit",
      env: {...process.env, AROLARIU_COMPONENTS_PACKED_ROOT: packedRoot},
    });
  });
}

if (isEntryModule(process.argv[1], import.meta.url)) {
  verifyPackedArtifact().catch((error: unknown) => {
    const interrupted = error instanceof PackedGateInterruptedError;
    console.error(interrupted ? error.message : error);
    process.exitCode = interrupted ? error.exitCode : 1;
  });
}
