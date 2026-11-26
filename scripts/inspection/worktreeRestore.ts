/**
 * @fileoverview Checkout-local restore receipt. Only the approved Setup action publishes it.
 * @module scripts/inspection/worktreeRestore
 */
import {createHash} from "node:crypto";
import {win32} from "node:path";

import {Effect} from "effect";

import type {RepositoryPaths} from "../common/repository-paths.ts";
import {Environment, type EnvironmentSnapshot} from "../platform/Environment.ts";
import {ReadOnlyFiles} from "../platform/Files.ts";
import type {Process} from "../platform/Process.ts";
import {readBuildProjectXml, solutionProjectPaths, supportsLiteralNuGetConfig} from "./dotnet.ts";
import {inspectPath} from "./files.ts";
import {inspectionProbeRunner, probes} from "./probes.ts";

/** Ignored, project-local receipt and exclusive refresh-lock names. */
export const worktreeRestorePaths = {
  directory: "tooling/src/AppHost/obj",
  receipt: "worktree-restore-evidence.json",
  lock: ".worktree-restore-evidence.lock",
} as const;

/** Redacted, conditional recovery advice shared by preflight and Setup. */
export const worktreeRestoreRemediation =
  "For missing restore artifacts or a missing or outdated config inventory, complete an ordinary approved Setup restore (npm run setup without the refresh flag) first, then request the opt-in receipt refresh. "
  + "For unsupported MSBuild or NuGet inputs, use supported inputs before refreshing. "
  + "The scoped profile does not support MSBuild response files. "
  + "Preview the full Setup plan with npm run setup -- --refresh-worktree-restore-evidence --dry-run. "
  + "The refresh flag is not restore-only; approve the applicable Setup actions before removing --dry-run.";

/** Required for any scoped invocation that evaluates MSBuild; never pass explicit `@` response files. */
export const worktreeNoAutoResponse = "-noAutoResponse";

const MAX_INPUT = 8 * 1024 * 1024;
const MAX_NUGET_CONFIG_FILES = 64;
const directoryResponseFile = "Directory.Build.rsp";
const solutionBuildFiles = ["Directory.Solution.props", "Directory.Solution.targets"];
// Ship only known SDK hooks; a file with the same name can otherwise import untracked inputs.
const sdkSolutionHooks = new Map([
  [
    "microsoft.net.sdk.solution.targets",
    {
      sha256: "6d4514faf1f8a6a34732c369635d0ccb50f9fa3a5131a48733c48f794ceff62c",
      target: "Sdks/Microsoft.NET.Sdk/targets/Microsoft.NET.Sdk.Common.targets",
    },
  ],
  [
    "microsoft.nuget.importafter.targets",
    {sha256: "7467b24ffc850450c2c9d7fc741228479342e6abd359bc39cc6adbba12754279", target: "NuGet.targets"},
  ],
]);
const inputs = [
  "Directory.Build.props",
  "Directory.Build.targets",
  "Directory.Packages.props",
  "global.json",
  "NuGet.Config",
  "packages.lock.json",
];
const parentInputs = inputs.slice(0, 5);
const knownImport = "$([MSBuild]::GetPathOfFileAbove('Directory.Build.props', '$(MSBuildThisFileDirectory)../'))";
const dotnetEnv = {
  DOTNET_CLI_TELEMETRY_OPTOUT: "1",
  DOTNET_SKIP_FIRST_TIME_EXPERIENCE: "1",
  DOTNET_GENERATE_ASPNET_CERTIFICATE: "false",
  DOTNET_ADD_GLOBAL_TOOLS_TO_PATH: "false",
  DOTNET_NOLOGO: "1",
};
const drivePath = /^[a-z]:[\\/][^\u0000-\u001f]*$/iu;
const localPath = /^[a-z]:[\\/][^<>:"|?*\u0000-\u001f]+$/iu;
const selector =
  /^(?:restore|msbuild|(?:import)?directorybuild|directorypackages|nuget_fallback|nuget_restore|custombefore|customafter|baseintermediateoutputpath|dotnet_cli_home|dotnet_msbuild_sdk_resolver|configuration$|platform$|targetframework|runtimeidentifier|dcpclipath$|dcpextensionsdir$|testingglobalpath$)/iu;
const solutionSelector =
  /^(?:ImportDirectorySolution(?:Props|Targets)|DirectorySolution(?:Props|Targets)Path|_DirectorySolution(?:Props|Targets)(?:File|BasePath)|ImportByWildcard(?:Before|After)Solution|NuGetRestoreTargets)$/iu;
// Microsoft.Common.props and Microsoft.Common.targets honor these intermediate selectors, too.
const buildFileSelectorName =
  "(?:DirectoryBuild(?:Props|Targets)Path|ImportDirectoryBuild(?:Props|Targets)|_DirectoryBuild(?:Props|Targets)(?:File|BasePath)|Custom(?:Before|After)DirectoryBuild(?:Props|Targets))";
const buildFileSelector = new RegExp(`^${buildFileSelectorName}$`, "iu");
const unsupportedBuildElement =
  /^(?:UsingTask|ItemDefinitionGroup|CustomBefore.*|CustomAfter.*|Restore.*|MSBuildProjectExtensionsPath|BaseIntermediateOutputPath|MSBuildSDKsPath|DcpCliPath|DcpExtensionsDir)\b/iu;
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

function observeRestoreSdk(
  root: string,
): Effect.Effect<
  readonly [path: string, solutionHooks: readonly [name: string, digest: string][]] | undefined,
  never,
  ReadOnlyFiles | Process
> {
  return Effect.gen(function* () {
    const options = {cwd: root, env: dotnetEnv};
    const selected = yield* inspectionProbeRunner.run(probes.dotnet.version(), options);
    const version = selected.kind === "succeeded" ? selected.stdout.trim() : "";
    if (!/^\d+\.\d+\.\d+$/u.test(version)) return undefined;
    const listed = yield* inspectionProbeRunner.run(probes.dotnet.sdkList(), options);
    if (listed.kind !== "succeeded") return undefined;
    const matches = listed.stdout
      .split(/\r?\n/u)
      .map((line) => /^(\S+)\s+\[([^\]\r\n]+)\]$/u.exec(line.trim()))
      .filter((match) => match?.[1] === version);
    const base = matches[0]?.[2];
    if (matches.length !== 1 || base === undefined || !localPath.test(base)) return undefined;
    const sdk = win32.join(base, version);
    const files = yield* ReadOnlyFiles;
    const canonicalSdk = yield* files.realPath(sdk);
    if (
      !samePath(canonicalSdk, sdk)
      || (yield* inspectPath(sdk)).kind !== "directory"
      || (yield* inspectPath(win32.join(sdk, "MSBuild.rsp"))).kind !== "missing"
    )
      return undefined;
    // Current's solution metaproject imports every entry in these SDK wildcard directories.
    // Bind only the shipped hook names from the canonical SDK; additional hooks are unsupported.
    const hooks: [string, string][] = [];
    for (const phase of ["ImportBefore", "ImportAfter"]) {
      const directory = win32.join(sdk, "Current", "SolutionFile", phase);
      const observed = yield* inspectPath(directory);
      if (observed.kind === "missing") continue;
      if (observed.kind !== "directory" || !samePath(yield* files.realPath(directory), directory)) return undefined;
      const names = yield* files.readDirectory(directory);
      if (names.length > (phase === "ImportAfter" ? sdkSolutionHooks.size : 0)) return undefined;
      const seen = new Set<string>();
      for (const name of names) {
        const key = name.toLowerCase();
        const stock = sdkSolutionHooks.get(key);
        if (!stock || seen.has(key)) return undefined;
        const bytes = yield* ownedBytes(win32.join(directory, name));
        if (!bytes?.length || digest(bytes) !== stock.sha256) return undefined;
        const target = yield* ownedBytes(win32.join(sdk, stock.target));
        if (!target?.length) return undefined;
        hooks.push([key, stock.sha256], [stock.target, digest(target)]);
        seen.add(key);
      }
    }
    return [canonicalSdk.toLowerCase(), hooks.sort(([left], [right]) => left.localeCompare(right))] as const;
  }).pipe(Effect.orElseSucceed(() => undefined));
}

function hasNoSolutionImports(solution: string): Effect.Effect<boolean, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const {dir, base, name, ext} = win32.parse(solution);
    // Current SDKs use legacy .sln sidecars even for .slnx. Fence both names beside
    // the selected solution, but only Directory.Solution.* is searched in ancestors.
    for (const filename of ext.toLowerCase() === ".slnx" ? [base, `${name}.sln`] : [base]) {
      for (const phase of ["before", "after"]) {
        if ((yield* inspectPath(win32.join(dir, `${phase}.${filename}.targets`))).kind !== "missing") return false;
      }
    }
    for (let directory = dir; ; directory = win32.dirname(directory)) {
      for (const name of solutionBuildFiles) {
        if ((yield* inspectPath(win32.join(directory, name))).kind !== "missing") return false;
      }
      if (directory === win32.dirname(directory)) return true;
    }
  }).pipe(Effect.orElseSucceed(() => false));
}

/** Detects an MSBuild build-file selector shared by bundle and restore validation. */
export function isUnmodeledBuildFileSelector(name: string): boolean {
  return buildFileSelector.test(name);
}

function supportsBuildExpressions(value: string): boolean {
  const expressions = value.replaceAll(/\$\(\s*MSBuildProjectName\.EndsWith\('\.Tests'\)\)/gu, "");
  return (
    !expressions.includes("$([")
    && [...expressions.matchAll(/\$\(([a-z0-9_-]+)/giu)].every(
      ([, property]) => property !== undefined && supportedProperties.has(property.toLowerCase()),
    )
  );
}

function supportedInput(path: string, content: string, listed: ReadonlySet<string>): boolean {
  const elements = readBuildProjectXml(content);
  if (!elements) return false;
  let importSeen = false;
  for (const element of elements) {
    const {name, attributes, text, selfClosing} = element;
    if (isUnmodeledBuildFileSelector(name) || unsupportedBuildElement.test(name)) return false;
    if (/^Import\b/iu.test(name)) {
      if (
        importSeen
        || name !== "Import"
        || !selfClosing
        || !path.endsWith("sites\\api.arolariu.ro\\tests\\Directory.Build.props")
        || attributes.size !== 1
        || attributes.get("Project")?.replaceAll(/\s+/gu, " ") !== knownImport
      )
        return false;
      importSeen = true;
      continue;
    }
    if (!supportsBuildExpressions(text) || ![...attributes.values()].every(supportsBuildExpressions)) return false;
    if (/^ProjectReference\b/iu.test(name)) {
      const relative = attributes.get("Include");
      if (
        relative === undefined
        || !/^[a-z0-9_.\\/ -]+$/iu.test(relative)
        || win32.isAbsolute(relative)
        || !listed.has(win32.resolve(win32.dirname(path), relative).toLowerCase())
      )
        return false;
    }
  }
  return true;
}

function configPaths(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length > MAX_NUGET_CONFIG_FILES) return undefined;
  const paths: string[] = [];
  const seen = new Set<string>();
  for (const path of value) {
    if (typeof path !== "string" || !localPath.test(path) || win32.extname(path).toLowerCase() !== ".config") return undefined;
    const normalized = win32.normalize(path);
    if (normalized !== path.replaceAll("/", "\\") || seen.has(normalized.toLowerCase())) return undefined;
    paths.push(normalized);
    seen.add(normalized.toLowerCase());
  }
  return paths;
}

function configRoot(env: EnvironmentSnapshot, key: string): string | undefined {
  const paths = Object.entries(env.variables).filter(([name]) => name.toLowerCase() === key);
  const path = paths[0]?.[1];
  return paths.length === 1 && path && localPath.test(path) ? win32.normalize(path) : undefined;
}

function configInputs(env: EnvironmentSnapshot, projects: readonly string[]): Effect.Effect<string | undefined, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const roaming = configRoot(env, "appdata");
    const programFiles = configRoot(env, "programfiles(x86)");
    if (!roaming || !programFiles) return undefined; // Do not infer redirected or fallback roots.
    const files = yield* ReadOnlyFiles;
    const primary = win32.join(roaming, "NuGet", "NuGet.Config");
    const candidates = [primary];
    // Only fence the known Windows layout. NuGet's restore graph is the authority for
    // which settings were used; do not ask NuGet to load settings (it can create defaults).
    for (const dir of [win32.join(win32.dirname(primary), "config"), win32.join(programFiles, "NuGet", "Config")]) {
      const observation = yield* inspectPath(dir);
      if (observation.kind === "missing") continue;
      if (observation.kind !== "directory" || !samePath(yield* files.realPath(dir), dir)) return undefined;
      for (const name of yield* files.readDirectory(dir)) {
        if (win32.extname(name).toLowerCase() !== ".config") continue;
        candidates.push(win32.join(dir, name));
        if (candidates.length > MAX_NUGET_CONFIG_FILES) return undefined;
      }
    }
    const expected = new Set(candidates.map((path) => path.toLowerCase()));
    if (expected.size !== candidates.length) return undefined;
    let effective: readonly string[] | undefined;
    for (const project of projects) {
      const bytes = yield* ownedBytes(win32.join(win32.dirname(project), "obj", "project.assets.json"));
      if (!bytes) return undefined;
      const assets: {project?: {restore?: {configFilePaths?: unknown}}} | null = yield* Effect.try(() =>
        JSON.parse(new TextDecoder().decode(bytes)),
      );
      const recorded = configPaths(assets?.project?.restore?.configFilePaths);
      if (!recorded || recorded.length !== expected.size || recorded.some((path) => !expected.has(path.toLowerCase()))) return undefined;
      if (effective?.some((path, index) => path.toLowerCase() !== recorded[index]?.toLowerCase())) return undefined;
      effective ??= recorded;
    }
    if (!effective) return undefined;
    const entries: [string, string][] = [];
    for (const path of effective) {
      const bytes = yield* ownedBytes(path);
      if (!bytes || !supportsLiteralNuGetConfig(bytes)) return undefined;
      // Only the byte digest contributes to evidence; no settings are expanded or persisted.
      entries.push([path.toLowerCase(), digest(bytes)]);
    }
    return digest(JSON.stringify(entries));
  }).pipe(Effect.orElseSucceed(() => undefined));
}

/**
 * Fingerprints the supported checkout restore inputs without evaluating projects or exposing NuGet settings.
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
        (key) =>
          !optionalLocalHooks.has(key.toLowerCase())
          && (selector.test(key)
            || solutionSelector.test(key)
            || isUnmodeledBuildFileSelector(key)
            || supportedProperties.has(key.toLowerCase())),
      )
    )
      return undefined;
    const root = yield* files.realPath(paths.root);
    if (!samePath(root, paths.root)) return undefined;
    if (!(yield* hasNoSolutionImports(paths.solution))) return undefined;
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
      if ((yield* inspectPath(win32.join(directory, directoryResponseFile))).kind !== "missing") return undefined;
      for (const name of inputs) {
        const path = win32.join(directory, name);
        const present = yield* inspectPath(path);
        if (present.kind === "missing") continue;
        // Custom repository config is outside this profile. Supported user and machine
        // settings are bound separately using NuGet's effective file list.
        if (name === "NuGet.Config") return undefined;
        const bytes = yield* ownedBytes(path);
        if (
          !bytes
          || ((name.endsWith(".props") || name.endsWith(".targets")) && !supportedInput(path, new TextDecoder().decode(bytes), listed))
        )
          return undefined;
        if (name === "global.json") {
          const config: unknown = yield* Effect.try(() => JSON.parse(new TextDecoder().decode(bytes)));
          if (typeof config !== "object" || config === null || Array.isArray(config) || Object.keys(config).some((key) => key !== "sdk"))
            return undefined;
          // SDK search path overrides can select a location outside the host's SDK list.
          if (
            "sdk" in config
            && (typeof config.sdk !== "object"
              || config.sdk === null
              || Array.isArray(config.sdk)
              || Object.keys(config.sdk).some((key) => key.toLowerCase() === "paths"))
          )
            return undefined;
        }
        entries.set(win32.relative(root, path), digest(bytes));
      }
    }
    for (let dir = win32.dirname(root); dir !== root; dir = win32.dirname(dir)) {
      for (const name of [...parentInputs, directoryResponseFile]) {
        if ((yield* inspectPath(win32.join(dir, name))).kind !== "missing") return undefined;
      }
      if (dir === win32.dirname(dir)) break;
    }
    const managed = projectPaths.filter((project) => /\.(?:csproj|fsproj|vbproj)$/iu.test(project));
    const configs = yield* configInputs(env, managed);
    if (configs === undefined) return undefined;
    const sdk = yield* observeRestoreSdk(root);
    if (sdk === undefined) return undefined;
    return {
      root,
      projects: managed,
      digest: digest(
        JSON.stringify([
          env.architecture,
          sdk,
          packageRoot,
          configs,
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
    graph === undefined ? undefined : `${JSON.stringify({version: 2, checkout: input.root, inputs: input.digest, graph})}\n`,
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
