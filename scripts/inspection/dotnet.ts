/**
 * @fileoverview Shared read-only .NET SDK, host, repository, certificate, and AppHost inspection.
 * @module scripts/inspection/dotnet
 *
 * @remarks
 * Every command runs through an opaque named probe. Command output is projected immediately into
 * small facts; SDK installation paths, command errors, AppHost parameter values, and user-secret
 * values are never returned or included in outcome text.
 */

import {readFile, realpath, stat} from "node:fs/promises";
import {isAbsolute, posix, relative, resolve, sep, win32} from "node:path";

import type {CommandResult} from "../common/process.ts";
import type {RepositoryPaths} from "../common/repository-paths.ts";
import type {InspectionProbeRunner} from "./probes.ts";
import {probes} from "./probes.ts";
import type {InspectionOutcome, InspectionProvider} from "./types.ts";

/** Complete normalized .NET observations shared by setup and doctor policy. */
export interface DotnetFacts {
  /** Active executable state and platform resolver paths. */
  readonly executable: Readonly<{
    /** Whether the selected `dotnet` executable ran successfully. */
    available: boolean;
    /** Validated absolute paths emitted by `where.exe` or `which`. */
    resolvedPaths: readonly string[];
  }>;
  /** Active SDK version selected by `dotnet --version`. */
  readonly selectedVersion?: string;
  /** Installed SDK versions without their installation roots. */
  readonly sdks: readonly string[];
  /** Parsed .NET host identity, when available. */
  readonly host?: Readonly<{
    /** Host runtime version. */
    version: string;
    /** Host architecture token. */
    architecture: string;
    /** Runtime identifier. */
    rid: string;
  }>;
  /** Installed workload identifiers. */
  readonly workloads: readonly string[];
  /** Global NuGet package cache path. */
  readonly nugetCachePath?: string;
  /** Deterministic repository-relative solution integrity issues. */
  readonly solutionIssues: readonly string[];
  /** Installed local .NET tools. */
  readonly localTools: readonly Readonly<{name: string; version: string}>[];
  /** Local HTTPS development-certificate state. */
  readonly certificate: Readonly<{
    /** Whether a valid development certificate exists. */
    exists: boolean;
    /** Whether the existing development certificate is trusted. */
    trusted: boolean;
  }>;
  /** Aspire AppHost project and parameter-key state. */
  readonly appHost: Readonly<{
    /** Whether `tooling/AppHost/AppHost.csproj` exists as a regular file. */
    projectExists: boolean;
    /** Required Aspire parameter keys absent from tracked configuration and user secrets. */
    missingParameterKeys: readonly string[];
    /** Sorted user-secret key names; values are never retained. */
    userSecretKeys: readonly string[];
  }>;
}

type UnknownRecord = Readonly<Record<string, unknown>>;

interface AppHostFileFacts {
  readonly projectExists: boolean;
  readonly configuredParameterKeys: readonly string[];
}

type AppHostFileOutcome =
  {readonly kind: "available"; readonly value: AppHostFileFacts} | {readonly kind: "unavailable"} | {readonly kind: "invalid"};

interface UserSecretFacts {
  readonly keys: readonly string[];
  readonly configuredParameterKeys: readonly string[];
}

const APPHOST_PROJECT_RELATIVE_PATH = "tooling/AppHost/AppHost.csproj";
const APPHOST_SETTINGS_RELATIVE_PATH = "tooling/AppHost/appsettings.Development.json";
const REQUIRED_APPHOST_PARAMETER_KEYS = ["Parameters:sql-password", "Parameters:redis-password"] as const;
const SUPPORTED_PLATFORMS: ReadonlySet<NodeJS.Platform> = new Set(["win32", "darwin", "linux"]);
const SUPPORTED_DOTNET_ARCHITECTURES: ReadonlySet<string> = new Set([
  "x86",
  "x64",
  "arm",
  "arm64",
  "wasm",
  "s390x",
  "loongarch64",
  "armv6",
  "ppc64le",
  "riscv64",
]);
const DOTNET_PROBE_ENVIRONMENT = Object.freeze({DOTNET_CLI_UI_LANGUAGE: "en-US"});
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;
const DOTNET_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u;
const NUGET_VERSION_PATTERN =
  /^(?:0|[1-9]\d*)(?:\.(?:0|[1-9]\d*)){0,3}(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u;
const RUNTIME_IDENTIFIER_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/u;
const PATH_SCHEME_PATTERN = /^[A-Za-z][A-Za-z0-9+.-]*:/u;
const WINDOWS_DRIVE_PATH_PATTERN = /^[A-Za-z]:/u;
const SIMPLE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const MAX_PATH_LENGTH = 4_096;
const MAX_IDENTIFIER_LENGTH = 256;
const MAX_VERSION_LENGTH = 256;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

function elapsedMilliseconds(startedAt: number, now: () => number): number {
  const elapsed = now() - startedAt;
  return Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
}

function isSuccessfulCommand(result: Readonly<CommandResult>): boolean {
  return result.code === 0 && !result.timedOut && result.signal === undefined && result.spawnError === undefined;
}

function hasTransportFailure(result: Readonly<CommandResult>): boolean {
  return result.timedOut || result.signal !== undefined || result.spawnError !== undefined;
}

function safeToken(value: string, maximumLength: number): string | undefined {
  const trimmed = value.trim();
  return trimmed !== "" && trimmed.length <= maximumLength && !CONTROL_CHARACTER_PATTERN.test(trimmed) ? trimmed : undefined;
}

function parseDotnetVersion(output: string): string | undefined {
  const version = safeToken(output, MAX_VERSION_LENGTH);
  return version !== undefined && DOTNET_VERSION_PATTERN.test(version) ? version : undefined;
}

function parseNugetVersion(output: string): string | undefined {
  const version = safeToken(output, MAX_VERSION_LENGTH);
  return version !== undefined && NUGET_VERSION_PATTERN.test(version) ? version : undefined;
}

function parseDotnetArchitecture(output: string): string | undefined {
  const architecture = safeToken(output, MAX_IDENTIFIER_LENGTH)?.toLowerCase();
  return architecture !== undefined && SUPPORTED_DOTNET_ARCHITECTURES.has(architecture) ? architecture : undefined;
}

function parseRuntimeIdentifier(output: string): string | undefined {
  const rid = safeToken(output, MAX_IDENTIFIER_LENGTH);
  return rid !== undefined && RUNTIME_IDENTIFIER_PATTERN.test(rid) ? rid : undefined;
}

function parseSdkVersions(output: string): readonly string[] | undefined {
  const versions: string[] = [];
  const seen = new Set<string>();
  for (const line of output.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (trimmed === "") {
      continue;
    }
    const match = /^(\S+)\s+\[[^\]\r\n]+\]$/u.exec(trimmed);
    const version = match?.[1] === undefined ? undefined : parseDotnetVersion(match[1]);
    if (version === undefined) {
      return undefined;
    }
    if (!seen.has(version)) {
      seen.add(version);
      versions.push(version);
    }
  }
  return versions.length === 0 ? undefined : versions;
}

function parseDotnetHost(output: string): DotnetFacts["host"] | undefined {
  let section: "none" | "runtime" | "host" = "none";
  let version: string | undefined;
  let architecture: string | undefined;
  let rid: string | undefined;

  for (const line of output.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (trimmed === "Runtime Environment:") {
      section = "runtime";
      continue;
    }
    if (trimmed === "Host:") {
      section = "host";
      continue;
    }
    if (trimmed.endsWith(":") && !/^(?:Version|Architecture|RID):/u.test(trimmed)) {
      section = "none";
      continue;
    }

    if (section === "runtime") {
      const candidate = /^RID:\s*(.+)$/u.exec(trimmed)?.[1];
      if (candidate !== undefined) {
        rid = parseRuntimeIdentifier(candidate);
      }
    } else if (section === "host") {
      const versionCandidate = /^Version:\s*(.+)$/u.exec(trimmed)?.[1];
      if (versionCandidate !== undefined) {
        version = parseDotnetVersion(versionCandidate);
      }
      const architectureCandidate = /^Architecture:\s*(.+)$/u.exec(trimmed)?.[1];
      if (architectureCandidate !== undefined) {
        architecture = parseDotnetArchitecture(architectureCandidate);
      }
    }
  }

  return version === undefined || architecture === undefined || rid === undefined ? undefined : {version, architecture, rid};
}

function tableBody(output: string): readonly string[] | undefined {
  const lines = output.split(/\r?\n/u).map((line) => line.trim());
  const separatorIndex = lines.findIndex((line) => /^-{3,}$/u.test(line));
  return separatorIndex < 0 ? undefined : lines.slice(separatorIndex + 1).filter((line) => line !== "");
}

function parseWorkloads(output: string): readonly string[] | undefined {
  const rows = tableBody(output);
  if (rows === undefined) {
    return undefined;
  }
  if (rows.some((row) => /^(?:No workloads|There are no installed workloads)/iu.test(row))) {
    return [];
  }

  const workloads = new Set<string>();
  for (const row of rows) {
    if (/^(?:Use `dotnet workload|Updates are available|To install)/iu.test(row)) {
      continue;
    }
    const identifier = /^(\S+)\s+\S+/u.exec(row)?.[1];
    if (identifier === undefined || identifier.length > MAX_IDENTIFIER_LENGTH || !SIMPLE_IDENTIFIER_PATTERN.test(identifier)) {
      return undefined;
    }
    workloads.add(identifier);
  }
  return [...workloads].sort(compareText);
}

function parseNugetCachePath(output: string, platform: NodeJS.Platform): string | undefined {
  const lines = output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line !== "");
  if (lines.length !== 1) {
    return undefined;
  }
  const candidate = /^global-packages:\s*(.+)$/iu.exec(lines[0]!)?.[1];
  const path = candidate === undefined ? undefined : safeToken(candidate, MAX_PATH_LENGTH);
  return path !== undefined && isAbsoluteForPlatform(path, platform) ? path : undefined;
}

function parseLocalTools(output: string): DotnetFacts["localTools"] | undefined {
  const rows = tableBody(output);
  if (rows === undefined) {
    return undefined;
  }
  if (rows.length === 1 && /^No tools/iu.test(rows[0]!)) {
    return [];
  }

  const tools = new Map<string, string>();
  for (const row of rows) {
    const match = /^(\S+)\s+(\S+)(?:\s+.*)?$/u.exec(row);
    const name = match?.[1];
    const version = match?.[2] === undefined ? undefined : parseNugetVersion(match[2]);
    if (name === undefined || name.length > MAX_IDENTIFIER_LENGTH || !SIMPLE_IDENTIFIER_PATTERN.test(name) || version === undefined) {
      return undefined;
    }
    const existing = tools.get(name);
    if (existing !== undefined && existing !== version) {
      return undefined;
    }
    tools.set(name, version);
  }
  return [...tools.entries()].sort(([left], [right]) => compareText(left, right)).map(([name, version]) => ({name, version}));
}

function isAbsoluteForPlatform(path: string, platform: NodeJS.Platform): boolean {
  return platform === "win32" ? win32.isAbsolute(path) : posix.isAbsolute(path);
}

function parseResolvedPaths(output: string, platform: NodeJS.Platform): readonly string[] | undefined {
  const paths = new Set<string>();
  for (const line of output.split(/\r?\n/u)) {
    const path = safeToken(line, MAX_PATH_LENGTH);
    if (path === undefined) {
      continue;
    }
    if (!isAbsoluteForPlatform(path, platform)) {
      return undefined;
    }
    paths.add(path);
  }
  return paths.size === 0 ? undefined : [...paths].sort(compareText);
}

function normalizeSolutionProjectPath(path: string): string | undefined {
  const normalized = path.trim().replaceAll("\\", "/");
  if (
    normalized === ""
    || normalized.length > MAX_PATH_LENGTH
    || CONTROL_CHARACTER_PATTERN.test(normalized)
    || normalized.startsWith("/")
    || WINDOWS_DRIVE_PATH_PATTERN.test(normalized)
    || PATH_SCHEME_PATTERN.test(normalized)
    || normalized.split("/").includes("..")
  ) {
    return undefined;
  }
  return normalized;
}

async function inspectSolution(paths: RepositoryPaths): Promise<readonly string[]> {
  let canonicalRoot: string;
  try {
    canonicalRoot = await realpath(paths.root);
  } catch {
    return ["The repository root could not be inspected for solution integrity."];
  }

  let contents: string;
  try {
    contents = await readFile(paths.solution, "utf8");
  } catch (error: unknown) {
    return [hasErrorCode(error, "ENOENT") ? "The repository solution file is missing." : "The repository solution file could not be read."];
  }

  const rawProjectPaths = [...contents.matchAll(/<Project\s+Path="([^"]+)"/gu)]
    .map((match) => match[1])
    .filter((path): path is string => path !== undefined);
  if (rawProjectPaths.length === 0) {
    return ["The repository solution declares no projects."];
  }

  const issues = new Set<string>();
  for (const rawProjectPath of rawProjectPaths) {
    const projectPath = normalizeSolutionProjectPath(rawProjectPath);
    if (projectPath === undefined) {
      const safePath = safeToken(rawProjectPath, MAX_PATH_LENGTH)?.replaceAll("\\", "/");
      const safeRelativePath =
        safePath !== undefined
        && !safePath.startsWith("/")
        && !WINDOWS_DRIVE_PATH_PATTERN.test(safePath)
        && !PATH_SCHEME_PATTERN.test(safePath)
          ? safePath
          : undefined;
      issues.add(
        safeRelativePath === undefined
          ? "The repository solution contains an invalid project path."
          : `Invalid solution project path: ${safeRelativePath}`,
      );
      continue;
    }

    const resolvedProject = resolve(paths.root, projectPath);
    const relativeProject = relative(paths.root, resolvedProject);
    if (relativeProject === ".." || relativeProject.startsWith(`..${sep}`) || isAbsolute(relativeProject)) {
      issues.add(`Invalid solution project path: ${projectPath}`);
      continue;
    }

    try {
      const canonicalProject = await realpath(resolvedProject);
      const canonicalRelativeProject = relative(canonicalRoot, canonicalProject);
      if (canonicalRelativeProject === ".." || canonicalRelativeProject.startsWith(`..${sep}`) || isAbsolute(canonicalRelativeProject)) {
        issues.add(`Invalid solution project path: ${projectPath}`);
        continue;
      }

      const projectStat = await stat(canonicalProject);
      if (!projectStat.isFile()) {
        issues.add(`Invalid solution project path: ${projectPath}`);
      }
    } catch (error: unknown) {
      issues.add(
        hasErrorCode(error, "ENOENT") || hasErrorCode(error, "ENOTDIR")
          ? `Missing solution project: ${projectPath}`
          : `Solution project could not be inspected: ${projectPath}`,
      );
    }
  }
  return [...issues].sort(compareText);
}

function configuredTrackedParameters(document: unknown): readonly string[] | undefined {
  if (!isRecord(document)) {
    return undefined;
  }
  const parameters = document["Parameters"];
  if (parameters === undefined) {
    return [];
  }
  if (!isRecord(parameters)) {
    return undefined;
  }

  const configured: string[] = [];
  for (const key of REQUIRED_APPHOST_PARAMETER_KEYS) {
    const suffix = key.slice("Parameters:".length);
    const value = parameters[suffix];
    if (value === undefined || (typeof value === "string" && value.trim() === "")) {
      continue;
    }
    if (typeof value !== "string") {
      return undefined;
    }
    configured.push(key);
  }
  return configured;
}

async function inspectAppHostFiles(paths: RepositoryPaths): Promise<AppHostFileOutcome> {
  const projectPath = resolve(paths.root, APPHOST_PROJECT_RELATIVE_PATH);
  try {
    const projectStat = await stat(projectPath);
    if (!projectStat.isFile()) {
      return {kind: "invalid"};
    }
  } catch (error: unknown) {
    return hasErrorCode(error, "ENOENT")
      ? {kind: "available", value: {projectExists: false, configuredParameterKeys: []}}
      : {kind: "unavailable"};
  }

  let settingsSource: string;
  try {
    settingsSource = await readFile(resolve(paths.root, APPHOST_SETTINGS_RELATIVE_PATH), "utf8");
  } catch (error: unknown) {
    return hasErrorCode(error, "ENOENT")
      ? {kind: "available", value: {projectExists: true, configuredParameterKeys: []}}
      : {kind: "unavailable"};
  }

  let settings: unknown;
  try {
    settings = JSON.parse(settingsSource);
  } catch {
    return {kind: "invalid"};
  }
  const configuredParameterKeys = configuredTrackedParameters(settings);
  return configuredParameterKeys === undefined
    ? {kind: "invalid"}
    : {kind: "available", value: {projectExists: true, configuredParameterKeys}};
}

function unwrapUserSecretsDocument(output: string): string | undefined {
  const begin = output.indexOf("//BEGIN");
  const end = output.lastIndexOf("//END");
  if (begin < 0 && end < 0) {
    return output;
  }
  return begin < 0 || end < 0 || end <= begin ? undefined : output.slice(begin + "//BEGIN".length, end).trim();
}

function parseUserSecrets(output: string): UserSecretFacts | undefined {
  const document = unwrapUserSecretsDocument(output);
  if (document === undefined) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(document);
  } catch {
    return undefined;
  }
  if (!isRecord(parsed)) {
    return undefined;
  }

  const keys: string[] = [];
  const configuredParameterKeys = new Set<string>();
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== "string" || key.trim() === "" || key.length > MAX_IDENTIFIER_LENGTH || CONTROL_CHARACTER_PATTERN.test(key)) {
      return undefined;
    }
    keys.push(key);
    if (value.trim() !== "" && REQUIRED_APPHOST_PARAMETER_KEYS.some((requiredKey) => requiredKey === key)) {
      configuredParameterKeys.add(key);
    }
  }

  return {
    keys: [...new Set(keys)].sort(compareText),
    configuredParameterKeys: REQUIRED_APPHOST_PARAMETER_KEYS.filter((key) => configuredParameterKeys.has(key)),
  };
}

function unavailableOutcome(reason: string, startedAt: number, now: () => number): InspectionOutcome<DotnetFacts> {
  return {kind: "unavailable", reason, durationMs: elapsedMilliseconds(startedAt, now)};
}

function invalidOutcome(issue: string, startedAt: number, now: () => number): InspectionOutcome<DotnetFacts> {
  return {kind: "invalid", issues: [issue], durationMs: elapsedMilliseconds(startedAt, now)};
}

/**
 * Creates one read-only provider for normalized .NET and AppHost facts.
 *
 * @param input - Canonical repository paths, opaque probe runner, target platform, and monotonic clock.
 * @returns An inspection provider with explicit unavailable/invalid outcomes at command and parse boundaries.
 */
export function createDotnetProvider(
  input: Readonly<{
    paths: RepositoryPaths;
    probes: InspectionProbeRunner;
    platform: NodeJS.Platform;
    now: () => number;
  }>,
): InspectionProvider<DotnetFacts> {
  return async (): Promise<InspectionOutcome<DotnetFacts>> => {
    const startedAt = input.now();
    if (!SUPPORTED_PLATFORMS.has(input.platform)) {
      return invalidOutcome("The requested .NET inspection platform is unsupported.", startedAt, input.now);
    }

    const dotnetProbeOptions = {cwd: input.paths.root, env: DOTNET_PROBE_ENVIRONMENT};
    const versionResult = await input.probes.run(probes.dotnet.version(), dotnetProbeOptions);
    if (!isSuccessfulCommand(versionResult)) {
      return unavailableOutcome("The dotnet executable is unavailable.", startedAt, input.now);
    }
    const selectedVersion = parseDotnetVersion(versionResult.stdout);
    if (selectedVersion === undefined) {
      return invalidOutcome("dotnet --version returned malformed output.", startedAt, input.now);
    }

    const executableName = input.platform === "win32" ? "dotnet.exe" : "dotnet";
    const [
      resolutionResult,
      sdkResult,
      infoResult,
      workloadResult,
      nugetResult,
      localToolsResult,
      certificateResult,
      solutionIssues,
      appHostFiles,
    ] = await Promise.all([
      input.probes.run(probes.workspace.executableResolution(executableName, input.platform), {cwd: input.paths.root}),
      input.probes.run(probes.dotnet.sdkList(), dotnetProbeOptions),
      input.probes.run(probes.dotnet.info(), dotnetProbeOptions),
      input.probes.run(probes.dotnet.workloads(), dotnetProbeOptions),
      input.probes.run(probes.dotnet.nugetLocals(), dotnetProbeOptions),
      input.probes.run(probes.dotnet.localTools(), dotnetProbeOptions),
      input.probes.run(probes.dotnet.certificate("presence"), dotnetProbeOptions),
      inspectSolution(input.paths),
      inspectAppHostFiles(input.paths),
    ]);

    const requiredCommands: readonly Readonly<{
      result: CommandResult;
      reason: string;
    }>[] = [
      {result: resolutionResult, reason: "The dotnet executable path could not be resolved."},
      {result: sdkResult, reason: "Installed .NET SDKs could not be inspected."},
      {result: infoResult, reason: "Required .NET host information could not be inspected."},
      {result: workloadResult, reason: "Installed .NET workloads could not be inspected."},
      {result: nugetResult, reason: "The NuGet global-packages cache could not be inspected."},
      {result: localToolsResult, reason: "Installed local .NET tools could not be inspected."},
    ];
    const failedRequiredCommand = requiredCommands.find(({result}) => !isSuccessfulCommand(result));
    if (failedRequiredCommand !== undefined) {
      return unavailableOutcome(failedRequiredCommand.reason, startedAt, input.now);
    }
    if (hasTransportFailure(certificateResult)) {
      return unavailableOutcome("The HTTPS development certificate could not be inspected.", startedAt, input.now);
    }
    if (appHostFiles.kind === "unavailable") {
      return unavailableOutcome("The AppHost project files could not be inspected.", startedAt, input.now);
    }
    if (appHostFiles.kind === "invalid") {
      return invalidOutcome("AppHost development configuration is malformed.", startedAt, input.now);
    }

    const resolvedPaths = parseResolvedPaths(resolutionResult.stdout, input.platform);
    if (resolvedPaths === undefined) {
      return invalidOutcome("dotnet executable resolution returned malformed output.", startedAt, input.now);
    }
    const sdks = parseSdkVersions(sdkResult.stdout);
    if (sdks === undefined) {
      return invalidOutcome("dotnet --list-sdks returned malformed output.", startedAt, input.now);
    }
    const host = parseDotnetHost(infoResult.stdout);
    if (host === undefined) {
      return invalidOutcome("dotnet --info returned malformed output.", startedAt, input.now);
    }
    const workloads = parseWorkloads(workloadResult.stdout);
    if (workloads === undefined) {
      return invalidOutcome("dotnet workload list returned malformed output.", startedAt, input.now);
    }
    const nugetCachePath = parseNugetCachePath(nugetResult.stdout, input.platform);
    if (nugetCachePath === undefined) {
      return invalidOutcome("dotnet nuget locals returned malformed output.", startedAt, input.now);
    }
    const localTools = parseLocalTools(localToolsResult.stdout);
    if (localTools === undefined) {
      return invalidOutcome("dotnet tool list returned malformed output.", startedAt, input.now);
    }

    const certificateExists = certificateResult.code === 0;
    let certificateTrusted = false;
    if (certificateExists) {
      const trustResult = await input.probes.run(probes.dotnet.certificate("trust"), dotnetProbeOptions);
      if (hasTransportFailure(trustResult)) {
        return unavailableOutcome("HTTPS development certificate trust could not be inspected.", startedAt, input.now);
      }
      certificateTrusted = trustResult.code === 0;
    }

    let userSecretFacts: UserSecretFacts = {keys: [], configuredParameterKeys: []};
    if (appHostFiles.value.projectExists) {
      const secretsResult = await input.probes.run(probes.dotnet.userSecrets(APPHOST_PROJECT_RELATIVE_PATH), {
        ...dotnetProbeOptions,
      });
      if (!isSuccessfulCommand(secretsResult)) {
        return unavailableOutcome("AppHost user-secret keys could not be inspected.", startedAt, input.now);
      }
      const parsedSecrets = parseUserSecrets(secretsResult.stdout);
      if (parsedSecrets === undefined) {
        return invalidOutcome("dotnet user-secrets returned malformed output.", startedAt, input.now);
      }
      userSecretFacts = parsedSecrets;
    }

    const configuredParameters = new Set([...appHostFiles.value.configuredParameterKeys, ...userSecretFacts.configuredParameterKeys]);
    const missingParameterKeys = REQUIRED_APPHOST_PARAMETER_KEYS.filter((key) => !configuredParameters.has(key));
    const value: DotnetFacts = {
      executable: {available: true, resolvedPaths},
      selectedVersion,
      sdks,
      host,
      workloads,
      nugetCachePath,
      solutionIssues,
      localTools,
      certificate: {exists: certificateExists, trusted: certificateTrusted},
      appHost: {
        projectExists: appHostFiles.value.projectExists,
        missingParameterKeys,
        userSecretKeys: userSecretFacts.keys,
      },
    };
    return {kind: "available", value, durationMs: elapsedMilliseconds(startedAt, input.now)};
  };
}
