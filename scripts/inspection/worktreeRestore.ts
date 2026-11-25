/**
 * @fileoverview Checkout-local restore receipt. Only the approved Setup action publishes it.
 * @module scripts/inspection/worktreeRestore
 */
import {createHash} from "node:crypto";
import {win32} from "node:path";

import {Effect} from "effect";

import type {RepositoryPaths} from "../common/repository-paths.ts";
import {Environment} from "../platform/Environment.ts";
import {ReadOnlyFiles} from "../platform/Files.ts";
import type {Process} from "../platform/Process.ts";
import {solutionProjectPaths} from "./dotnet.ts";
import {inspectPath} from "./files.ts";
import {inspectionProbeRunner, probes} from "./probes.ts";

/** Ignored, project-local receipt and exclusive refresh-lock names. */
export const worktreeRestorePaths = {
  directory: "tooling/src/AppHost/obj",
  receipt: "worktree-restore-evidence.json",
  lock: ".worktree-restore-evidence.lock",
} as const;
const MAX_INPUT = 8 * 1024 * 1024;
const inputs = [
  "Directory.Build.props",
  "Directory.Build.targets",
  "Directory.Packages.props",
  "global.json",
  "NuGet.Config",
  "packages.lock.json",
];
const parentInputs = inputs.slice(0, 5);
const knownImport = "<Import Project=\"$([MSBuild]::GetPathOfFileAbove('Directory.Build.props', '$(MSBuildThisFileDirectory)../'))\" />";
const dotnetEnv = {
  DOTNET_CLI_TELEMETRY_OPTOUT: "1",
  DOTNET_SKIP_FIRST_TIME_EXPERIENCE: "1",
  DOTNET_GENERATE_ASPNET_CERTIFICATE: "false",
  DOTNET_ADD_GLOBAL_TOOLS_TO_PATH: "false",
  DOTNET_NOLOGO: "1",
};
const drivePath = /^[a-z]:[\\/][^\u0000-\u001f]*$/iu;
const selector =
  /^(?:restore|msbuild|directorybuild|directorypackages|nuget_fallback|custombefore|customafter|baseintermediateoutputpath|dotnet_cli_home|dotnet_msbuild_sdk_resolver|configuration$|platform$|targetframework|runtimeidentifier)/iu;
const supportedProperties = new Set([
  "msbuildprojectname",
  "msbuildprojectdirectory",
  "msbuildthisfiledirectory",
  "nowarn",
  "defineconstants",
  "outputtype",
  "istestproject",
  "isaspnetcoreproject",
  "interceptorsnamespaces",
]);
const optionalLocalHooks = new Set(["customaftermicrosoftcommontargets", "customaftermicrosoftcommoncrosstargetingtargets"]);

/** Digests and paths for the supported checkout-local restore input profile. */
export interface RestoreInputs {
  readonly root: string;
  readonly digest: string;
  readonly projects: readonly string[];
}

function samePath(left: string, right: string): boolean {
  return win32.normalize(left).toLowerCase() === win32.normalize(right).toLowerCase();
}

function digest(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function ownedBytes(path: string, limit = MAX_INPUT): Effect.Effect<Uint8Array | undefined, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const files = yield* ReadOnlyFiles;
    if (!samePath(yield* files.realPath(path), path) || (yield* inspectPath(path)).kind !== "file") return undefined;
    return yield* files.readBytesBounded(path, limit);
  }).pipe(Effect.orElseSucceed(() => undefined));
}

function supportedInput(path: string, content: string, listed: ReadonlySet<string>): boolean {
  const xml = content.replaceAll(/<!--[\s\S]*?-->/gu, "");
  if (
    /<!|<(?:UsingTask|ItemDefinitionGroup|CustomBefore[^ >]*|CustomAfter[^ >]*|Restore[^ >]*|MSBuildProjectExtensionsPath|BaseIntermediateOutputPath|MSBuildSDKsPath)\b/iu.test(
      xml,
    )
  )
    return false;
  const imports = [...xml.matchAll(/<Import\b[^>]*>/giu)].map(([tag]) => tag.replaceAll(/\s+/gu, " "));
  if (
    imports.length > 0
    && (!path.endsWith("sites\\api.arolariu.ro\\tests\\Directory.Build.props") || imports.length !== 1 || imports[0] !== knownImport)
  )
    return false;
  const refs = [...xml.matchAll(/<ProjectReference\b[^>]*>/giu)];
  const expressions = xml.replace(/<Import\b[^>]*>/giu, "").replaceAll(/\$\(\s*MSBuildProjectName\.EndsWith\('\.Tests'\)\)/gu, "");
  if (
    expressions.includes("$([")
    || [...expressions.matchAll(/\$\(([a-z0-9_-]+)/giu)].some(
      ([, property]) => property === undefined || !supportedProperties.has(property.toLowerCase()),
    )
  )
    return false;
  return refs.every(([tag]) => {
    const target = /\bInclude=(?:"([^"]+)"|'([^']+)')/u.exec(tag);
    const relative = target?.[1] ?? target?.[2];
    return (
      relative !== undefined
      && /^[a-z0-9_.\\/ -]+$/iu.test(relative)
      && !win32.isAbsolute(relative)
      && listed.has(win32.resolve(win32.dirname(path), relative).toLowerCase())
    );
  });
}

/**
 * Fingerprints the supported checkout restore inputs without evaluating projects or reading NuGet credentials.
 *
 * @param paths - Canonical repository paths.
 * @returns The supported input digest and managed project paths, or unavailable evidence.
 */
export function snapshotWorktreeRestoreInputs(
  paths: RepositoryPaths,
): Effect.Effect<RestoreInputs | undefined, never, ReadOnlyFiles | Environment | Process> {
  return Effect.gen(function* () {
    const env = yield* Environment;
    const files = yield* ReadOnlyFiles;
    if (
      env.platform !== "win32"
      || !drivePath.test(paths.root)
      || Object.keys(env.variables).some(
        (key) => !optionalLocalHooks.has(key.toLowerCase()) && (selector.test(key) || supportedProperties.has(key.toLowerCase())),
      )
    )
      return undefined;
    const root = yield* files.realPath(paths.root);
    if (!samePath(root, paths.root)) return undefined;
    const absentHooks = new Map<string, string>();
    for (const [key, path] of Object.entries(env.variables)) {
      const name = key.toLowerCase();
      if (!optionalLocalHooks.has(name)) continue;
      if (absentHooks.has(name) || !path || !drivePath.test(path) || (yield* inspectPath(path)).kind !== "missing") return undefined;
      // Stock MSBuild checks Exists before importing these particular hooks. Never read an external hook.
      absentHooks.set(name, digest(win32.normalize(path)));
    }
    const solution = yield* ownedBytes(paths.solution);
    if (!solution) return undefined;
    const projects = solutionProjectPaths(new TextDecoder().decode(solution));
    if (!projects?.some((name) => name.replaceAll("\\", "/") === "tooling/src/AppHost/AppHost.csproj")) return undefined;
    const projectPaths = projects.map((path) => win32.join(root, path)).sort();
    const listed = new Set(projectPaths.map((path) => path.toLowerCase()));
    const sdk = yield* inspectionProbeRunner.run(probes.dotnet.version(), {cwd: root, env: dotnetEnv});
    const version = sdk.kind === "succeeded" ? sdk.stdout.trim() : "";
    if (!/^\d+\.\d+\.\d+$/u.test(version)) return undefined;
    const packageRoots = Object.keys(env.variables).filter((key) => key.toLowerCase() === "nuget_packages");
    const key = packageRoots[0];
    const packageRoot = key === undefined ? "" : env.variables[key];
    if (packageRoots.length > 1 || packageRoot === undefined || (packageRoot !== "" && !drivePath.test(packageRoot))) return undefined;
    const entries = new Map<string, string>([["arolariu.slnx", digest(solution)]]);
    const directories = new Set<string>();
    for (const project of projectPaths) {
      if (!/\.(?:csproj|fsproj|vbproj|esproj)$/iu.test(project)) return undefined;
      const bytes = yield* ownedBytes(project);
      if (!bytes || !supportedInput(project, new TextDecoder().decode(bytes), listed)) return undefined;
      entries.set(win32.relative(root, project), digest(bytes));
      for (let dir = win32.dirname(project); !directories.has(dir); dir = win32.dirname(dir)) {
        directories.add(dir);
        if (samePath(dir, root)) break;
      }
    }
    for (const directory of directories) {
      for (const name of inputs) {
        const path = win32.join(directory, name);
        const present = yield* inspectPath(path);
        if (present.kind === "missing") continue;
        // Do not load NuGet.Config: it may contain source credentials. Custom repository config
        // is outside this receipt profile, as are lock/SDK inputs outside the checkout.
        if (name === "NuGet.Config") return undefined;
        const bytes = yield* ownedBytes(path);
        if (
          !bytes
          || ((name.endsWith(".props") || name.endsWith(".targets")) && !supportedInput(path, new TextDecoder().decode(bytes), listed))
        )
          return undefined;
        if (name === "global.json") {
          const config: unknown = JSON.parse(new TextDecoder().decode(bytes));
          if (typeof config !== "object" || config === null || Array.isArray(config) || Object.keys(config).some((key) => key !== "sdk"))
            return undefined;
        }
        entries.set(win32.relative(root, path), digest(bytes));
      }
    }
    for (let dir = win32.dirname(root); dir !== root; dir = win32.dirname(dir)) {
      for (const name of parentInputs) {
        if ((yield* inspectPath(win32.join(dir, name))).kind !== "missing") return undefined;
      }
      if (dir === win32.dirname(dir)) break;
    }
    return {
      root,
      projects: projectPaths.filter((project) => /\.(?:csproj|fsproj|vbproj)$/iu.test(project)),
      digest: digest(
        JSON.stringify([
          env.architecture,
          version,
          packageRoot,
          [...absentHooks].sort(),
          [...entries].sort(([a], [b]) => a.localeCompare(b)),
        ]),
      ),
    };
  }).pipe(Effect.orElseSucceed(() => undefined));
}

function graphDigest(input: RestoreInputs): Effect.Effect<string | undefined, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const entries: [string, string][] = [];
    for (const project of input.projects) {
      const base = win32.basename(project);
      for (const name of ["project.assets.json", `${base}.nuget.g.props`, `${base}.nuget.g.targets`]) {
        const path = win32.join(win32.dirname(project), "obj", name);
        const bytes = yield* ownedBytes(path);
        if (!bytes?.length) return undefined;
        entries.push([win32.relative(input.root, path), digest(bytes)]);
      }
    }
    return digest(JSON.stringify(entries));
  });
}

/**
 * Renders the exact receipt for the current generated graph, without mutating it.
 *
 * @param input - Snapshot of the restore inputs.
 * @returns Serialized receipt, or unavailable evidence if the graph cannot be read.
 */
export function renderWorktreeRestoreEvidence(input: RestoreInputs): Effect.Effect<string | undefined, never, ReadOnlyFiles> {
  return Effect.map(graphDigest(input), (graph) =>
    graph === undefined ? undefined : `${JSON.stringify({version: 1, checkout: input.root, inputs: input.digest, graph})}\n`,
  );
}

/**
 * Verifies the receipt against stable observed inputs and graph without changing any file.
 *
 * @param paths - Canonical repository paths.
 * @returns A receipt digest that can bracket other checks, or `undefined` if evidence is invalid.
 */
export function currentWorktreeRestoreEvidence(
  paths: RepositoryPaths,
): Effect.Effect<string | undefined, never, ReadOnlyFiles | Environment | Process> {
  return Effect.gen(function* () {
    const directory = win32.join(paths.root, worktreeRestorePaths.directory);
    const path = win32.join(directory, worktreeRestorePaths.receipt);
    const lock = win32.join(directory, worktreeRestorePaths.lock);
    if ((yield* inspectPath(lock)).kind !== "missing") return undefined;
    const evidence = yield* ownedBytes(path, 4096);
    if (!evidence) return undefined;
    const inputsBefore = yield* snapshotWorktreeRestoreInputs(paths);
    if (!inputsBefore) return undefined;
    const expected = yield* renderWorktreeRestoreEvidence(inputsBefore);
    if (expected === undefined || new TextDecoder().decode(evidence) !== expected) return undefined;
    const inputsAfter = yield* snapshotWorktreeRestoreInputs(paths);
    const finalEvidence = yield* ownedBytes(path, 4096);
    return inputsAfter?.digest === inputsBefore.digest
      && inputsAfter.root === inputsBefore.root
      && (yield* renderWorktreeRestoreEvidence(inputsAfter)) === expected
      && !!finalEvidence
      && digest(finalEvidence) === digest(evidence)
      && (yield* inspectPath(lock)).kind === "missing"
      ? digest(evidence)
      : undefined;
  }).pipe(Effect.orElseSucceed(() => undefined));
}
