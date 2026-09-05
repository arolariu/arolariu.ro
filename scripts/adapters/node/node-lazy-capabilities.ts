/**
 * @fileoverview Per-scope lazy capability composition: the loader contract every runtime scope
 * resolves its heavy capabilities through, and the memoized delegating facades it hands out.
 * @module scripts/adapters/node/node-lazy-capabilities
 *
 * @remarks
 * A scope opens without loading a filesystem, network, child-process, or terminal implementation.
 * Each facade awaits a per-scope memoized promise on first use, then delegates, so a command that
 * never touches a capability never pays for its module graph. The default loaders reach their
 * concrete modules exclusively through literal dynamic imports, never a static one.
 */

import type {ProcessExecutionOptions} from "../../core/process/process-execution-request.ts";
import type {ProcessRunner} from "../../core/process/process-runner.ts";
import type {FileSystem, HttpClient, PromptChoice, PromptProvider, RuntimeEnvironment} from "../../core/runtime/runtime-capability.ts";

/** How one scope resolves each heavy capability the first time a command touches it. */
export interface NodeRuntimeCapabilityLoaders {
  /** Resolves the filesystem implementation. */
  readonly loadFileSystem: () => Promise<FileSystem>;
  /** Resolves the HTTP client implementation. */
  readonly loadHttpClient: () => Promise<HttpClient>;
  /** Resolves the process runner bound to the scope's immutable environment snapshot. */
  readonly loadProcessRunner: (environment: Readonly<RuntimeEnvironment>) => Promise<ProcessRunner>;
  /** Resolves the interactive prompt provider. */
  readonly loadPromptProvider: () => Promise<PromptProvider>;
}

/** Production loaders: each one literal-dynamic-imports exactly the module it resolves. */
export const defaultNodeRuntimeCapabilityLoaders: NodeRuntimeCapabilityLoaders = {
  loadFileSystem: async () => (await import("./node-filesystem.ts")).nodeFileSystem,
  loadHttpClient: async () => (await import("./node-http-client.ts")).nodeHttpClient,
  loadProcessRunner: async (environment) => (await import("./node-process-runner.ts")).createNodeProcessRunner(environment),
  loadPromptProvider: async () => (await import("./node-prompt-provider.ts")).createNodePromptProvider(),
};

/**
 * Wraps one loader so it runs at most once and every later caller awaits the same promise.
 *
 * @param load - The loader to memoize.
 * @returns A function resolving the single shared promise for this scope.
 */
function memoizeLoad<TCapability>(load: () => Promise<TCapability>): () => Promise<TCapability> {
  let pending: Promise<TCapability> | undefined;
  return (): Promise<TCapability> => {
    pending ??= load();
    return pending;
  };
}

function createLazyFileSystem(resolve: () => Promise<FileSystem>): FileSystem {
  return {
    readText: async (...args) => (await resolve()).readText(...args),
    readBytes: async (...args) => (await resolve()).readBytes(...args),
    exists: async (...args) => (await resolve()).exists(...args),
    assertAccessible: async (...args) => (await resolve()).assertAccessible(...args),
    realPath: async (...args) => (await resolve()).realPath(...args),
    inspect: async (...args) => (await resolve()).inspect(...args),
    readDirectory: async (...args) => (await resolve()).readDirectory(...args),
    glob: async (...args) => (await resolve()).glob(...args),
    createDirectory: async (...args) => (await resolve()).createDirectory(...args),
    writeText: async (...args) => (await resolve()).writeText(...args),
    writeBytes: async (...args) => (await resolve()).writeBytes(...args),
    writeTextAtomic: async (...args) => (await resolve()).writeTextAtomic(...args),
    copy: async (...args) => (await resolve()).copy(...args),
    move: async (...args) => (await resolve()).move(...args),
    remove: async (...args) => (await resolve()).remove(...args),
    createTemporaryDirectory: async (...args) => (await resolve()).createTemporaryDirectory(...args),
    setMode: async (...args) => (await resolve()).setMode(...args),
  };
}

/**
 * Builds one lazy process-runner facade. `scope()` stays synchronous, as its contract requires, by
 * returning another lazy facade over a memoized promise that applies the same defaults to the
 * resolved runner, so scoping a runner never forces the concrete implementation to load.
 *
 * @param resolve - Memoized resolver for the underlying runner.
 * @returns A runner that delegates every call once the underlying runner resolves.
 */
function createLazyProcessRunner(resolve: () => Promise<ProcessRunner>): ProcessRunner {
  return {
    run: async (...args) => (await resolve()).run(...args),
    expectSuccess: async (...args) => (await resolve()).expectSuccess(...args),
    scope: (defaults: Readonly<ProcessExecutionOptions>): ProcessRunner =>
      createLazyProcessRunner(memoizeLoad(async () => (await resolve()).scope(defaults))),
  };
}

function createLazyPromptProvider(resolve: () => Promise<PromptProvider>): PromptProvider {
  return {
    confirm: async (...args) => (await resolve()).confirm(...args),
    select: async <TValue extends string>(
      message: string,
      choices: readonly PromptChoice<TValue>[],
      defaultValue?: TValue,
    ): Promise<TValue> => (await resolve()).select(message, choices, defaultValue),
    text: async (...args) => (await resolve()).text(...args),
    secret: async (...args) => (await resolve()).secret(...args),
  };
}

/**
 * Builds the four memoized lazy capability facades one runtime scope owns.
 *
 * @remarks
 * Every call creates fresh facades over fresh memoized promises, so a child scope never shares a
 * resolved capability — or a pending load — with its parent. The only value a child inherits is
 * the immutable environment snapshot its runner is built from.
 * * @param loaders - How this scope resolves each heavy capability.
 * @param environment - The scope's immutable environment snapshot.
 * @returns The scope's lazy filesystem, HTTP client, process runner, and prompt provider.
 */
export function createLazyNodeCapabilities(
  loaders: NodeRuntimeCapabilityLoaders,
  environment: Readonly<RuntimeEnvironment>,
): Readonly<{files: FileSystem; http: HttpClient; runner: ProcessRunner; prompts: PromptProvider}> {
  const resolveHttpClient = memoizeLoad(() => loaders.loadHttpClient());

  return {
    files: createLazyFileSystem(memoizeLoad(() => loaders.loadFileSystem())),
    http: {request: async (...args) => (await resolveHttpClient()).request(...args)},
    runner: createLazyProcessRunner(memoizeLoad(() => loaders.loadProcessRunner(environment))),
    prompts: createLazyPromptProvider(memoizeLoad(() => loaders.loadPromptProvider())),
  };
}
