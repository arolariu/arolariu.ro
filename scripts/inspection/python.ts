/**
 * @fileoverview Shared read-only Python interpreter, virtual environment, pip, requirement, and configuration inspection.
 * @module scripts/inspection/python
 *
 * @remarks
 * Every command runs through an opaque named probe. Command output and configuration values are
 * projected immediately into bounded facts; raw stdout, stderr, native errors, requirement URLs,
 * package-index credentials, and configuration values never cross this module's public boundary.
 */

import {dirname, isAbsolute, relative, resolve, sep} from "node:path";

import {FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE} from "../common/runtime.ts";
import type {ProcessEnvironment} from "../core/process/process-execution-request.ts";
import type {ProcessExecutionResult} from "../core/process/process-execution-result.ts";
import type {RepositoryPaths} from "../common/repository-paths.ts";
import type {InspectionProbeRunner} from "./probes.ts";
import {probes} from "./probes.ts";
import type {InspectionOutcome, InspectionProvider, InspectionProviderContext} from "./types.ts";

/** Read-only filesystem capability every Python inspection helper observes disk through. */
type InspectionFiles = InspectionProviderContext["files"];

/** One successfully observed Python interpreter candidate. */
export interface PythonInterpreterFact {
  /** Interpreter executable or launcher command. */
  readonly command: string;
  /** Arguments inserted before every invocation, such as a Windows `py` launcher selector. */
  readonly prefixArgs: readonly string[];
  /** Validated Python version without the command's `Python ` prefix. */
  readonly version: string;
}

/** Complete normalized Python observations shared by setup and doctor policy. */
export interface PythonFacts {
  /** Successfully observed fixed platform candidates, in preference order. */
  readonly interpreters: readonly PythonInterpreterFact[];
  /** First candidate satisfying the repository's `requires-python` minimum. */
  readonly selected?: PythonInterpreterFact;
  /** Canonical `sites/exp.arolariu.ro/.venv` state. */
  readonly virtualEnvironment: Readonly<{
    /** Whether the canonical `.venv` path exists as a directory. */
    exists: boolean;
    /** Whether its interpreter is isolated, canonical, and version-compatible. */
    compatible: boolean;
    /** Canonical interpreter path reported by Python, when safely validated. */
    interpreterPath?: string;
    /** Validated virtual-environment interpreter version. */
    version?: string;
  }>;
  /** Pip availability and dependency-consistency state inside the canonical environment. */
  readonly pip: Readonly<{
    /** Whether `python -m pip --version` succeeded with valid output. */
    available: boolean;
    /** Validated pip version without its installation path. */
    version?: string;
    /** Bounded generated facts derived from a nonzero `pip check`. */
    conflicts: readonly string[];
  }>;
  /** Tracked requirement declarations and their installed-package comparison. */
  readonly requirements: Readonly<{
    /** Exact `==` pins discovered through the contained requirements include tree. */
    declared: readonly Readonly<{name: string; specifier: string; source: string}>[];
    /** Bounded generated facts for valid requirement forms not exactly comparable to `pip list`. */
    unverifiable: readonly string[];
    /** Bounded generated facts for missing or version-mismatched exact pins. */
    mismatches: readonly string[];
  }>;
  /** Deterministic key-only issues across template, Docker, and optional Aspire configuration. */
  readonly configurationIssues: readonly string[];
}

type UnknownRecord = Readonly<Record<string, unknown>>;

interface ParsedPythonVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease?: Readonly<{
    readonly stage: "a" | "b" | "rc";
    readonly number: number;
  }>;
  readonly text: string;
}

interface PythonMinimum {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

interface PythonInterpreterCandidate {
  readonly command: string;
  readonly selector?: string;
}

interface PythonMetadata {
  readonly executable: string;
  readonly version: ParsedPythonVersion;
  readonly prefix: string;
  readonly basePrefix: string;
}

interface RequirementDetail {
  readonly declared: readonly Readonly<{name: string; specifier: string; source: string}>[];
  readonly unverifiable: readonly string[];
}

interface Pep440Version {
  readonly normalized: string;
  readonly publicIdentity: string;
  readonly localIdentity?: string;
  readonly releaseSegmentCount: number;
}

type ParsedRequirementEntry =
  {readonly kind: "exact"; readonly name: string; readonly specifier: string} | {readonly kind: "unverifiable"; readonly name: string};

type RequirementMarkerToken =
  | {readonly kind: "word"; readonly value: string}
  | {readonly kind: "string"}
  | {readonly kind: "operator"}
  | {readonly kind: "leftParenthesis"}
  | {readonly kind: "rightParenthesis"};

type ContainedTextObservation =
  | {readonly kind: "available"; readonly contents: string}
  | {readonly kind: "missing"}
  | {readonly kind: "unavailable"}
  | {readonly kind: "invalid"};

type ConfigurationDocument =
  | {readonly kind: "available"; readonly keys: readonly string[]}
  | {readonly kind: "missing"}
  | {readonly kind: "unavailable"}
  | {readonly kind: "invalid"};

class PythonInspectionFailure extends Error {
  public readonly kind: "unavailable" | "invalid";
  public readonly publicMessage: string;

  public constructor(kind: "unavailable" | "invalid", publicMessage: string) {
    super(publicMessage);
    this.name = "PythonInspectionFailure";
    this.kind = kind;
    this.publicMessage = publicMessage;
  }
}

class RequirementsTreeInvalidError extends Error {
  public constructor() {
    super("The Python requirements tree is malformed.");
    this.name = "RequirementsTreeInvalidError";
  }
}

class RequirementsTreeUnavailableError extends Error {
  public constructor() {
    super("The Python requirements tree could not be read.");
    this.name = "RequirementsTreeUnavailableError";
  }
}

const SUPPORTED_PLATFORMS: ReadonlySet<NodeJS.Platform> = new Set(["win32", "darwin", "linux"]);
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;
const WINDOWS_DRIVE_PATH_PATTERN = /^[A-Za-z]:/u;
const URI_SCHEME_PATTERN = /^[A-Za-z][A-Za-z0-9+.-]*:/u;
const PYTHON_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:(a|b|rc)(0|[1-9]\d*))?$/u;
const PYTHON_COMMAND_VERSION_PATTERN = /^Python\s+(.+)$/u;
const PYTHON_REQUIREMENT_PATTERN = /^>=(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
const PIP_VERSION_PATTERN = /^pip\s+(\S+)\s+from\s+.+\s+\(python\s+\S+\)$/u;
const PACKAGE_NAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/u;
const REQUIREMENT_NAME_PREFIX = /^([A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?)/u;
const REQUIREMENT_EXTRAS_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?(?:\s*,\s*[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?)*$/u;
const REQUIREMENT_INCLUDE_DIRECTIVE = /^(?:-r|--requirement)(?:=|\s+)(.+)$/u;
const REQUIREMENT_INCLUDE_PREFIX = /^(?:-r|--requirement)(?:=|\s|$)/u;
const REQUIREMENT_SPECIFIER_OPERATOR = /^(===|~=|==|!=|<=|>=|<|>)/u;
const REQUIREMENT_WILDCARD_VERSION = /^(?:(?:0|[1-9]\d*)!)?(?:0|[1-9]\d*)(?:\.(?:0|[1-9]\d*))*\.\*$/u;
const PIP_REQUIREMENT_FLAG_OPTION = /^--(?:no-index|pre|prefer-binary|require-hashes)$/u;
const PIP_REQUIREMENT_VALUE_OPTION =
  /^(?:-[cefi]|--(?:config-settings|constraint|editable|extra-index-url|find-links|global-option|hash|index-url|no-binary|only-binary|trusted-host|use-deprecated|use-feature))(?:=|\s+)\S.*$/u;
const LINE_CONTINUATION_SUFFIX = /\\\s*$/u;
const CONFIGURATION_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:._-]*$/u;
const PIP_CONFLICT_PATTERN = /^([A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?)\s+\S+\s+(?:has requirement\b|is not supported\b)/u;
const MAX_TEXT_FILE_LENGTH = 1_048_576;
const MAX_COMMAND_OUTPUT_LENGTH = 10_485_760;
const MAX_REQUIREMENT_FILES = 64;
const MAX_REQUIREMENT_ENTRIES = 4_096;
const MAX_INSTALLED_DISTRIBUTIONS = 20_000;
const MAX_CONFIGURATION_KEYS = 2_048;
const MAX_CONFIGURATION_KEY_LENGTH = 512;
const MAX_PATH_LENGTH = 4_096;
const MAX_VERSION_LENGTH = 128;
const MAX_PACKAGE_NAME_LENGTH = 214;
const MAX_PACKAGE_VERSION_LENGTH = 256;
const MAX_BOUNDED_FACTS = 50;
const MAX_REQUIREMENT_MARKER_TOKENS = 256;
const REQUIREMENT_MARKER_VARIABLES: ReadonlySet<string> = new Set([
  "dependency_groups",
  "extra",
  "extras",
  "implementation_name",
  "implementation_version",
  "os_name",
  "platform_machine",
  "platform_python_implementation",
  "platform_release",
  "platform_system",
  "platform_version",
  "python_full_version",
  "python_version",
  "sys_platform",
]);
const PEP440_VERSION_PATTERN =
  /^\s*v?(?:(\d+)!)?(\d+(?:\.\d+)*)(?:(?:[-_.]?)(a|b|c|rc|alpha|beta|pre|preview)(?:[-_.]?)(\d+)?)?(?:(?:-(\d+))|(?:(?:[-_.]?)(post|rev|r)(?:[-_.]?)(\d+)?))?(?:(?:[-_.]?)(dev)(?:[-_.]?)(\d+)?)?(?:\+([a-z0-9]+(?:[-_.][a-z0-9]+)*))?\s*$/iu;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function elapsedMilliseconds(startedAt: number, now: () => number): number {
  const elapsed = now() - startedAt;
  return Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
}

function unavailableOutcome(reason: string, startedAt: number, now: () => number): InspectionOutcome<PythonFacts> {
  return {kind: "unavailable", reason, durationMs: elapsedMilliseconds(startedAt, now)};
}

function invalidOutcome(issue: string, startedAt: number, now: () => number): InspectionOutcome<PythonFacts> {
  return {kind: "invalid", issues: [issue], durationMs: elapsedMilliseconds(startedAt, now)};
}

function isSuccessfulCommand(outcome: Readonly<ProcessExecutionResult>): boolean {
  return outcome.kind === "succeeded";
}

function hasTransportFailure(outcome: Readonly<ProcessExecutionResult>): boolean {
  switch (outcome.kind) {
    case "succeeded":
    case "exited":
      return false;
    case "spawn-failed":
    case "timed-out":
    case "signalled":
    case "cancelled":
      return true;
  }
}

function completedExitCode(outcome: Readonly<ProcessExecutionResult>): number {
  switch (outcome.kind) {
    case "succeeded":
      return 0;
    case "exited":
      return outcome.exitCode;
    case "spawn-failed":
    case "timed-out":
    case "signalled":
    case "cancelled":
      return 1;
  }
}

function isMissingExecutable(outcome: Readonly<ProcessExecutionResult>): boolean {
  if (completedExitCode(outcome) === 127) {
    return true;
  }
  const detail = `${outcome.kind === "spawn-failed" ? outcome.message : ""}\n${outcome.stderr}`;
  return /\bENOENT\b|command not found|not recognized as an internal or external command|no such file or directory/iu.test(detail);
}

function safeText(value: string, maximumLength: number): string | undefined {
  if (value.length > maximumLength + 2) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed !== "" && trimmed.length <= maximumLength && !CONTROL_CHARACTER_PATTERN.test(trimmed) ? trimmed : undefined;
}

function normalizePep440Integer(value: string | undefined): string {
  const normalized = (value ?? "0").replace(/^0+(?=\d)/u, "");
  return normalized === "" ? "0" : normalized;
}

function normalizePep440Prerelease(value: string): "a" | "b" | "rc" {
  const normalized = value.toLowerCase();
  if (normalized === "a" || normalized === "alpha") {
    return "a";
  }
  if (normalized === "b" || normalized === "beta") {
    return "b";
  }
  return "rc";
}

function normalizePep440Local(value: string): Readonly<{text: string; identity: string}> {
  const normalizedSegments = value
    .toLowerCase()
    .split(/[-_.]/u)
    .map((segment) => {
      if (/^\d+$/u.test(segment)) {
        const number = normalizePep440Integer(segment);
        return {text: number, identity: `n:${number}`};
      }
      return {text: segment, identity: `s:${segment}`};
    });
  return {
    text: normalizedSegments.map(({text}) => text).join("."),
    identity: normalizedSegments.map(({identity}) => identity).join("."),
  };
}

function parsePep440Version(value: string): Pep440Version | undefined {
  const text = safeText(value, MAX_PACKAGE_VERSION_LENGTH);
  if (text === undefined) {
    return undefined;
  }
  const match = PEP440_VERSION_PATTERN.exec(text);
  if (match === null || match[2] === undefined) {
    return undefined;
  }

  const epoch = normalizePep440Integer(match[1]);
  const release = match[2].split(".").map((part) => normalizePep440Integer(part));
  const equalityRelease = [...release];
  while (equalityRelease.length > 1 && equalityRelease.at(-1) === "0") {
    equalityRelease.pop();
  }

  const prereleaseType = match[3];
  const prerelease =
    prereleaseType === undefined ? undefined : `${normalizePep440Prerelease(prereleaseType)}${normalizePep440Integer(match[4])}`;
  const implicitPost = match[5];
  const explicitPost = match[6];
  const post =
    implicitPost !== undefined || explicitPost !== undefined ? `.post${normalizePep440Integer(implicitPost ?? match[7])}` : undefined;
  const dev = match[8] === undefined ? undefined : `.dev${normalizePep440Integer(match[9])}`;
  const local = match[10] === undefined ? undefined : normalizePep440Local(match[10]);

  const epochPrefix = epoch === "0" ? "" : `${epoch}!`;
  const publicVersion = `${epochPrefix}${release.join(".")}${prerelease ?? ""}${post ?? ""}${dev ?? ""}`;
  const publicIdentity = [epoch, equalityRelease.join("."), prerelease ?? "-", post ?? "-", dev ?? "-"].join("|");
  return {
    normalized: `${publicVersion}${local === undefined ? "" : `+${local.text}`}`,
    publicIdentity,
    ...(local === undefined ? {} : {localIdentity: local.identity}),
    releaseSegmentCount: release.length,
  };
}

function pep440ExactMatch(expected: Pep440Version, installed: Pep440Version): boolean {
  return (
    expected.publicIdentity === installed.publicIdentity
    && (expected.localIdentity === undefined || expected.localIdentity === installed.localIdentity)
  );
}

function parsePythonVersionText(value: string): ParsedPythonVersion | undefined {
  const text = safeText(value, MAX_VERSION_LENGTH);
  if (text === undefined) {
    return undefined;
  }
  const match = PYTHON_VERSION_PATTERN.exec(text);
  if (match === null) {
    return undefined;
  }

  const stage = match[4] as "a" | "b" | "rc" | undefined;
  const prereleaseNumber = match[5];
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    ...(stage === undefined || prereleaseNumber === undefined ? {} : {prerelease: {stage, number: Number(prereleaseNumber)}}),
    text,
  };
}

function parsePythonCommandVersion(output: string): ParsedPythonVersion | undefined {
  const text = safeText(output, MAX_VERSION_LENGTH + "Python ".length);
  const version = text === undefined ? undefined : PYTHON_COMMAND_VERSION_PATTERN.exec(text)?.[1];
  return version === undefined ? undefined : parsePythonVersionText(version);
}

function parsePythonVersionResult(outcome: Readonly<ProcessExecutionResult>): ParsedPythonVersion | undefined {
  return parsePythonCommandVersion(outcome.stdout) ?? parsePythonCommandVersion(outcome.stderr);
}

function satisfiesMinimum(version: ParsedPythonVersion, minimum: PythonMinimum): boolean {
  const candidate = [version.major, version.minor, version.patch] as const;
  const required = [minimum.major, minimum.minor, minimum.patch] as const;
  for (let index = 0; index < candidate.length; index += 1) {
    const candidatePart = candidate[index]!;
    const requiredPart = required[index]!;
    if (candidatePart !== requiredPart) {
      return candidatePart > requiredPart;
    }
  }
  return version.prerelease === undefined;
}

function pythonCandidates(platform: NodeJS.Platform): readonly PythonInterpreterCandidate[] {
  return platform === "win32"
    ? [{command: "py", selector: "-3.12"}, {command: "python3.12"}, {command: "python"}]
    : [{command: "python3.12"}, {command: "python3"}, {command: "python"}];
}

function candidateFact(candidate: PythonInterpreterCandidate, version: ParsedPythonVersion): PythonInterpreterFact {
  return {
    command: candidate.command,
    prefixArgs: candidate.selector === undefined ? [] : [candidate.selector],
    version: version.text,
  };
}

function pythonProbeEnvironment(platform: NodeJS.Platform): Readonly<NodeJS.ProcessEnv> {
  return {
    NO_COLOR: "1",
    PIP_CONFIG_FILE: platform === "win32" ? "NUL" : "/dev/null",
    PIP_CERT: undefined,
    PIP_CLIENT_CERT: undefined,
    PIP_DISABLE_PIP_VERSION_CHECK: "1",
    PIP_EXTRA_INDEX_URL: undefined,
    PIP_INDEX_URL: undefined,
    PIP_NO_INPUT: "1",
    PIP_PROXY: undefined,
    PIP_TRUSTED_HOST: undefined,
    PYTHONDONTWRITEBYTECODE: "1",
    PYTHONHOME: undefined,
    PYTHONINSPECT: undefined,
    PYTHONNOUSERSITE: "1",
    PYTHONPATH: undefined,
    PYTHONSAFEPATH: "1",
    PYTHONSTARTUP: undefined,
    PYTHONUTF8: "1",
    PYTHONWARNINGS: undefined,
    VIRTUAL_ENV: undefined,
  };
}

function platformVenvDirectory(expRoot: string, platform: NodeJS.Platform): string {
  return platform === "win32" ? `${expRoot}\\.venv` : `${expRoot}/.venv`;
}

function platformVenvInterpreter(platform: NodeJS.Platform): string {
  return platform === "win32" ? ".venv\\Scripts\\python.exe" : ".venv/bin/python";
}

function normalizePathForComparison(value: string, isWin32: boolean): string {
  const normalized = isWin32 ? value.replaceAll("/", "\\") : value;
  return isWin32 ? normalized.toLowerCase() : normalized;
}

function pathsEqual(left: string, right: string, isWin32: boolean): boolean {
  return normalizePathForComparison(left, isWin32) === normalizePathForComparison(right, isWin32);
}

function isWithinVenvDirectory(executablePath: string, venvDirectory: string, isWin32: boolean): boolean {
  const normalizedExecutable = normalizePathForComparison(executablePath, isWin32);
  const normalizedDirectory = normalizePathForComparison(venvDirectory, isWin32);
  const separator = isWin32 ? "\\" : "/";
  return normalizedExecutable.startsWith(`${normalizedDirectory}${separator}`);
}

function safePath(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_PATH_LENGTH && !CONTROL_CHARACTER_PATTERN.test(value)
    ? value
    : undefined;
}

function parsePythonMetadata(output: string): PythonMetadata | undefined {
  if (output.length > MAX_COMMAND_OUTPUT_LENGTH) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(output.trim());
  } catch {
    return undefined;
  }
  if (!isRecord(parsed)) {
    return undefined;
  }

  const executable = safePath(parsed["executable"]);
  const prefix = safePath(parsed["prefix"]);
  const basePrefix = safePath(parsed["basePrefix"]);
  const version = typeof parsed["version"] === "string" ? parsePythonVersionText(parsed["version"]) : undefined;
  return executable === undefined || prefix === undefined || basePrefix === undefined || version === undefined
    ? undefined
    : {executable, version, prefix, basePrefix};
}

function parsePipVersion(output: string): string | undefined {
  const text = safeText(output, MAX_PATH_LENGTH);
  const version = text === undefined ? undefined : PIP_VERSION_PATTERN.exec(text)?.[1];
  return version === undefined ? undefined : parsePep440Version(version)?.normalized;
}

function parsePipVersionResult(outcome: Readonly<ProcessExecutionResult>): string | undefined {
  return parsePipVersion(outcome.stdout) ?? parsePipVersion(outcome.stderr);
}

function normalizeDistributionName(name: string): string {
  return name.toLowerCase().replaceAll(/[-_.]+/gu, "-");
}

function parseInstalledDistributions(output: string): ReadonlyMap<string, Pep440Version> | undefined {
  if (output.length > MAX_COMMAND_OUTPUT_LENGTH) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    return undefined;
  }
  if (!Array.isArray(parsed) || parsed.length > MAX_INSTALLED_DISTRIBUTIONS) {
    return undefined;
  }

  const distributions = new Map<string, Pep440Version>();
  for (const entry of parsed) {
    if (!isRecord(entry)) {
      return undefined;
    }
    const name = entry["name"];
    const version = entry["version"];
    const parsedVersion = typeof version === "string" ? parsePep440Version(version) : undefined;
    if (
      typeof name !== "string"
      || name.length > MAX_PACKAGE_NAME_LENGTH
      || !PACKAGE_NAME_PATTERN.test(name)
      || parsedVersion === undefined
    ) {
      return undefined;
    }

    const normalizedName = normalizeDistributionName(name);
    if (distributions.has(normalizedName)) {
      return undefined;
    }
    distributions.set(normalizedName, parsedVersion);
  }
  return distributions;
}

function boundGeneratedFacts(values: readonly string[], omittedLabel: string): readonly string[] {
  if (values.length <= MAX_BOUNDED_FACTS) {
    return values;
  }
  const retainedCount = MAX_BOUNDED_FACTS - 1;
  return [...values.slice(0, retainedCount), `${String(values.length - retainedCount)} additional ${omittedLabel} were omitted.`];
}

function projectPipConflicts(outcome: Readonly<ProcessExecutionResult>): readonly string[] {
  if (isSuccessfulCommand(outcome)) {
    return [];
  }

  const source = outcome.stdout.trim() === "" ? outcome.stderr : outcome.stdout;
  if (source.length > MAX_TEXT_FILE_LENGTH) {
    return ["pip reported dependency conflicts; detailed output exceeded the inspection limit."];
  }
  const lines = source
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line !== "");
  const projected = lines.map((line) => {
    const packageName = PIP_CONFLICT_PATTERN.exec(line)?.[1];
    return packageName === undefined
      ? "pip reported a dependency conflict."
      : `pip reported a dependency conflict for '${normalizeDistributionName(packageName)}'.`;
  });
  return boundGeneratedFacts(projected.length === 0 ? ["pip reported a dependency conflict."] : projected, "pip conflict reports");
}

function isPathWithin(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);
  return relativePath === "" || (relativePath !== ".." && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath));
}

function repositoryRelativePath(paths: RepositoryPaths, path: string): string | undefined {
  const relativePath = relative(paths.root, path);
  if (relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    return undefined;
  }
  return relativePath.split(sep).join("/");
}

async function canonicalExperimentalRoot(files: InspectionFiles, paths: RepositoryPaths): Promise<string> {
  try {
    const canonicalRoot = await files.realPath(paths.expRoot);
    const metadata = await files.inspect(canonicalRoot);
    if (metadata.kind === "missing") {
      throw new PythonInspectionFailure("invalid", "The Python project root is missing.");
    }
    if (metadata.kind !== "directory") {
      throw new PythonInspectionFailure("invalid", "The Python project root is not a directory.");
    }
    return canonicalRoot;
  } catch (error: unknown) {
    if (error instanceof PythonInspectionFailure) {
      throw error;
    }
    throw new PythonInspectionFailure(
      hasErrorCode(error, "ENOENT") ? "invalid" : "unavailable",
      hasErrorCode(error, "ENOENT") ? "The Python project root is missing." : "The Python project root could not be inspected.",
    );
  }
}

/**
 * Reads one already-contained file as bounded UTF-8 text.
 *
 * @remarks
 * The read is bounded by {@link MAX_TEXT_FILE_LENGTH} at the capability boundary, so an oversized
 * file is never fully buffered: {@link ReadOnlyFileSystem.readBytes} reads at most one byte past
 * the limit and reports {@link FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE}, which is classified as
 * `invalid` exactly as the previous handle-based read did. A non-regular file is `invalid`, a
 * missing path is `missing`, invalid UTF-8 (rejected by the fatal decoder) is `invalid`, and every
 * other filesystem failure is `unavailable`.
 *
 * @param files - Read-only filesystem capability.
 * @param path - Already canonical, containment-validated path.
 * @returns The bounded contained-text observation.
 */
async function readBoundedTextFile(files: InspectionFiles, path: string): Promise<ContainedTextObservation> {
  let bytes: Uint8Array;
  try {
    const metadata = await files.inspect(path);
    if (metadata.kind === "missing") {
      return {kind: "missing"};
    }
    if (metadata.kind !== "file") {
      return {kind: "invalid"};
    }

    bytes = await files.readBytes(path, {maximumBytes: MAX_TEXT_FILE_LENGTH});
  } catch (error: unknown) {
    if (hasErrorCode(error, FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE)) {
      return {kind: "invalid"};
    }
    return hasErrorCode(error, "ENOENT") ? {kind: "missing"} : {kind: "unavailable"};
  }

  try {
    return {kind: "available", contents: new TextDecoder("utf-8", {fatal: true}).decode(bytes)};
  } catch {
    return {kind: "invalid"};
  }
}

async function readContainedText(files: InspectionFiles, path: string, canonicalRoot: string): Promise<ContainedTextObservation> {
  let canonicalPath: string;
  try {
    canonicalPath = await files.realPath(path);
  } catch (error: unknown) {
    return hasErrorCode(error, "ENOENT") ? {kind: "missing"} : {kind: "unavailable"};
  }
  if (!isPathWithin(canonicalRoot, canonicalPath)) {
    return {kind: "invalid"};
  }
  return readBoundedTextFile(files, canonicalPath);
}

async function readPythonMinimum(files: InspectionFiles, paths: RepositoryPaths, canonicalRoot: string): Promise<PythonMinimum> {
  const observation = await readContainedText(files, paths.pythonProject, canonicalRoot);
  if (observation.kind === "missing") {
    throw new PythonInspectionFailure("invalid", "pyproject.toml is missing.");
  }
  if (observation.kind === "unavailable") {
    throw new PythonInspectionFailure("unavailable", "pyproject.toml could not be read.");
  }
  if (observation.kind === "invalid") {
    throw new PythonInspectionFailure("invalid", "pyproject.toml is not a valid contained project file.");
  }

  const declarations = [...observation.contents.matchAll(/^\s*requires-python\s*=\s*"([^"]*)"\s*(?:#.*)?$/gmu)];
  if (declarations.length !== 1) {
    throw new PythonInspectionFailure("invalid", "pyproject.toml declares an unsupported Python requirement.");
  }
  const value = declarations[0]?.[1];
  const match = value === undefined ? null : PYTHON_REQUIREMENT_PATTERN.exec(value);
  if (match === null) {
    throw new PythonInspectionFailure("invalid", "pyproject.toml declares an unsupported Python requirement.");
  }
  return {major: Number(match[1]), minor: Number(match[2]), patch: 0};
}

function stripInlineComment(line: string): string {
  const hashIndex = line.indexOf(" #");
  return (hashIndex === -1 ? line : line.slice(0, hashIndex)).trim();
}

function splitRequirementMarker(value: string): Readonly<{requirement: string; marker?: string}> | undefined {
  let quote: "'" | '"' | undefined;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]!;
    if (character === "'" || character === '"') {
      quote = quote === undefined ? character : quote === character ? undefined : quote;
      continue;
    }
    if (character === ";" && quote === undefined) {
      const requirement = value.slice(0, index).trim();
      const marker = value.slice(index + 1).trim();
      return !isValidRequirementMarker(marker) ? undefined : {requirement, marker};
    }
  }
  return quote === undefined ? {requirement: value.trim()} : undefined;
}

function isValidRequirementMarker(value: string): boolean {
  if (value === "" || value.length > MAX_TEXT_FILE_LENGTH || CONTROL_CHARACTER_PATTERN.test(value)) {
    return false;
  }

  const tokens: RequirementMarkerToken[] = [];
  for (let index = 0; index < value.length;) {
    const character = value[index]!;
    if (/\s/u.test(character)) {
      index += 1;
      continue;
    }
    if (character === "(") {
      tokens.push({kind: "leftParenthesis"});
      index += 1;
    } else if (character === ")") {
      tokens.push({kind: "rightParenthesis"});
      index += 1;
    } else if (character === "'" || character === '"') {
      const closingIndex = value.indexOf(character, index + 1);
      if (closingIndex === -1 || value.slice(index + 1, closingIndex).includes("\\")) {
        return false;
      }
      tokens.push({kind: "string"});
      index = closingIndex + 1;
    } else {
      const operator = /^(?:===|~=|==|!=|<=|>=|<|>)/u.exec(value.slice(index))?.[0];
      if (operator !== undefined) {
        tokens.push({kind: "operator"});
        index += operator.length;
      } else {
        const word = /^[A-Za-z_][A-Za-z0-9_]*/u.exec(value.slice(index))?.[0];
        if (word === undefined) {
          return false;
        }
        tokens.push({kind: "word", value: word});
        index += word.length;
      }
    }
    if (tokens.length > MAX_REQUIREMENT_MARKER_TOKENS) {
      return false;
    }
  }

  let position = 0;
  const consumeWord = (word: string): boolean => {
    const token = tokens[position];
    if (token?.kind !== "word" || token.value !== word) {
      return false;
    }
    position += 1;
    return true;
  };
  const consumeOperand = (): boolean => {
    const token = tokens[position];
    if (token?.kind === "string" || (token?.kind === "word" && REQUIREMENT_MARKER_VARIABLES.has(token.value))) {
      position += 1;
      return true;
    }
    return false;
  };
  const consumeOperator = (): boolean => {
    if (tokens[position]?.kind === "operator") {
      position += 1;
      return true;
    }
    if (consumeWord("in")) {
      return true;
    }
    const originalPosition = position;
    if (consumeWord("not") && consumeWord("in")) {
      return true;
    }
    position = originalPosition;
    return false;
  };

  let consumeOrExpression: () => boolean;
  const consumeAtom = (): boolean => {
    if (tokens[position]?.kind === "leftParenthesis") {
      position += 1;
      if (!consumeOrExpression() || tokens[position]?.kind !== "rightParenthesis") {
        return false;
      }
      position += 1;
      return true;
    }
    return consumeOperand() && consumeOperator() && consumeOperand();
  };
  const consumeAndExpression = (): boolean => {
    if (!consumeAtom()) {
      return false;
    }
    while (consumeWord("and")) {
      if (!consumeAtom()) {
        return false;
      }
    }
    return true;
  };
  consumeOrExpression = (): boolean => {
    if (!consumeAndExpression()) {
      return false;
    }
    while (consumeWord("or")) {
      if (!consumeAndExpression()) {
        return false;
      }
    }
    return true;
  };

  return tokens.length > 0 && consumeOrExpression() && position === tokens.length;
}

function parseRequirementSpecifierSet(
  value: string,
): readonly Readonly<{operator: string; version: string; parsedVersion?: Pep440Version}>[] | undefined {
  const trimmed = value.trim();
  const body = trimmed.startsWith("(") && trimmed.endsWith(")") ? trimmed.slice(1, -1).trim() : trimmed;
  if (body === "") {
    return undefined;
  }

  const specifiers: Array<Readonly<{operator: string; version: string; parsedVersion?: Pep440Version}>> = [];
  for (const rawSpecifier of body.split(",")) {
    const specifier = rawSpecifier.trim();
    const operator = REQUIREMENT_SPECIFIER_OPERATOR.exec(specifier)?.[1];
    if (operator === undefined) {
      return undefined;
    }
    const version = specifier.slice(operator.length).trim();
    if (version === "" || version.length > MAX_PACKAGE_VERSION_LENGTH || CONTROL_CHARACTER_PATTERN.test(version)) {
      return undefined;
    }
    if (operator === "===") {
      if (/\s/u.test(version)) {
        return undefined;
      }
      specifiers.push({operator, version});
      continue;
    }
    if (REQUIREMENT_WILDCARD_VERSION.test(version)) {
      if (operator !== "==" && operator !== "!=") {
        return undefined;
      }
      specifiers.push({operator, version});
      continue;
    }

    const parsedVersion = parsePep440Version(version);
    if (
      parsedVersion === undefined
      || ((operator === "<" || operator === "<=" || operator === ">" || operator === ">=" || operator === "~=")
        && parsedVersion.localIdentity !== undefined)
      || (operator === "~=" && parsedVersion.releaseSegmentCount < 2)
    ) {
      return undefined;
    }
    specifiers.push({operator, version, parsedVersion});
  }
  return specifiers;
}

function parseRequirementEntry(line: string): ParsedRequirementEntry | undefined {
  const nameMatch = REQUIREMENT_NAME_PREFIX.exec(line);
  if (nameMatch?.[1] === undefined || nameMatch[1].length > MAX_PACKAGE_NAME_LENGTH) {
    return undefined;
  }

  const name = normalizeDistributionName(nameMatch[1]);
  let remainder = line.slice(nameMatch[1].length).trimStart();
  let hasExtras = false;
  if (remainder.startsWith("[")) {
    const closingBracket = remainder.indexOf("]");
    if (closingBracket < 2 || !REQUIREMENT_EXTRAS_PATTERN.test(remainder.slice(1, closingBracket))) {
      return undefined;
    }
    hasExtras = true;
    remainder = remainder.slice(closingBracket + 1).trimStart();
  }

  const markerSplit = splitRequirementMarker(remainder);
  if (markerSplit === undefined) {
    return undefined;
  }
  const requirement = markerSplit.requirement;
  if (requirement === "") {
    return {kind: "unverifiable", name};
  }

  if (requirement.startsWith("@")) {
    const reference = requirement.slice(1).trim();
    return reference !== ""
      && reference.length <= MAX_PATH_LENGTH
      && !CONTROL_CHARACTER_PATTERN.test(reference)
      && !/\s/u.test(reference)
      && URI_SCHEME_PATTERN.test(reference)
      ? {kind: "unverifiable", name}
      : undefined;
  }

  const specifiers = parseRequirementSpecifierSet(requirement);
  if (specifiers === undefined) {
    return undefined;
  }
  const exact = specifiers.length === 1 ? specifiers[0] : undefined;
  return !hasExtras && markerSplit.marker === undefined && exact?.operator === "==" && exact.parsedVersion !== undefined
    ? {kind: "exact", name, specifier: exact.version}
    : {kind: "unverifiable", name};
}

function isSupportedRequirementOption(line: string): boolean {
  return (
    line.length <= MAX_TEXT_FILE_LENGTH
    && !CONTROL_CHARACTER_PATTERN.test(line)
    && (PIP_REQUIREMENT_FLAG_OPTION.test(line) || PIP_REQUIREMENT_VALUE_OPTION.test(line))
  );
}

function parseIncludeValue(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === "") {
    return undefined;
  }
  const first = trimmed[0];
  const last = trimmed.at(-1);
  if (first === '"' || first === "'") {
    return last === first && trimmed.length > 1 ? trimmed.slice(1, -1) : undefined;
  }
  return last === '"' || last === "'" ? undefined : trimmed;
}

function isSafeRequirementInclude(value: string): boolean {
  return (
    value.length > 0
    && value.length <= MAX_PATH_LENGTH
    && !CONTROL_CHARACTER_PATTERN.test(value)
    && !isAbsolute(value)
    && !WINDOWS_DRIVE_PATH_PATTERN.test(value)
    && !URI_SCHEME_PATTERN.test(value)
    && !value.startsWith("\\")
  );
}

async function parseRequirementsTree(files: InspectionFiles, paths: RepositoryPaths, canonicalRoot: string): Promise<RequirementDetail> {
  const declarations: Array<Readonly<{name: string; specifier: string; source: string}>> = [];
  const unverifiable: string[] = [];
  const seenNames = new Set<string>();
  const visiting = new Set<string>();
  const visited = new Set<string>();
  let fileCount = 0;
  let entryCount = 0;

  const parseFile = async (logicalPath: string): Promise<void> => {
    let canonicalPath: string;
    try {
      canonicalPath = await files.realPath(logicalPath);
    } catch (error: unknown) {
      if (hasErrorCode(error, "ENOENT")) {
        if (logicalPath === paths.pythonRequirements) {
          throw new PythonInspectionFailure("invalid", "The Python requirements entry file is missing.");
        }
        throw new RequirementsTreeInvalidError();
      }
      throw new RequirementsTreeUnavailableError();
    }
    if (!isPathWithin(canonicalRoot, canonicalPath)) {
      throw new RequirementsTreeInvalidError();
    }
    if (visiting.has(canonicalPath) || visited.has(canonicalPath)) {
      throw new RequirementsTreeInvalidError();
    }
    fileCount += 1;
    if (fileCount > MAX_REQUIREMENT_FILES) {
      throw new RequirementsTreeInvalidError();
    }

    const observation = await readBoundedTextFile(files, canonicalPath);
    if (observation.kind === "invalid" || observation.kind === "missing") {
      throw new RequirementsTreeInvalidError();
    }
    if (observation.kind === "unavailable") {
      throw new RequirementsTreeUnavailableError();
    }
    const contents = observation.contents;

    const source = repositoryRelativePath(paths, logicalPath);
    if (source === undefined) {
      throw new RequirementsTreeInvalidError();
    }

    visiting.add(canonicalPath);
    const lines = contents.split(/\r?\n/u);
    for (let index = 0; index < lines.length; index += 1) {
      const rawLine = lines[index]!;
      const withoutComment = rawLine.trimStart().startsWith("#") ? "" : stripInlineComment(rawLine);
      if (withoutComment === "") {
        continue;
      }

      const line = LINE_CONTINUATION_SUFFIX.test(withoutComment)
        ? withoutComment.replace(LINE_CONTINUATION_SUFFIX, "").trim()
        : withoutComment;
      if (line === "") {
        continue;
      }

      entryCount += 1;
      if (entryCount > MAX_REQUIREMENT_ENTRIES) {
        throw new RequirementsTreeInvalidError();
      }

      const includeMatch = REQUIREMENT_INCLUDE_DIRECTIVE.exec(line);
      if (includeMatch !== null) {
        const includeValue = includeMatch[1] === undefined ? undefined : parseIncludeValue(includeMatch[1]);
        if (includeValue === undefined || !isSafeRequirementInclude(includeValue)) {
          throw new RequirementsTreeInvalidError();
        }
        const includedPath = resolve(dirname(logicalPath), includeValue);
        if (!isPathWithin(paths.expRoot, includedPath)) {
          throw new RequirementsTreeInvalidError();
        }
        await parseFile(includedPath);
        continue;
      }
      if (REQUIREMENT_INCLUDE_PREFIX.test(line)) {
        throw new RequirementsTreeInvalidError();
      }

      if (line.startsWith("-")) {
        if (!isSupportedRequirementOption(line)) {
          throw new RequirementsTreeInvalidError();
        }
        unverifiable.push(`${source}:${String(index + 1)} contains a pip option or directive that is not exactly comparable.`);
        continue;
      }

      const requirement = parseRequirementEntry(line);
      if (requirement === undefined || seenNames.has(requirement.name)) {
        throw new RequirementsTreeInvalidError();
      }
      seenNames.add(requirement.name);
      if (requirement.kind === "exact") {
        declarations.push({name: requirement.name, specifier: requirement.specifier, source});
      } else {
        unverifiable.push(
          `${source}:${String(index + 1)} declares '${requirement.name}' with a requirement that is not exactly comparable.`,
        );
      }
    }

    visiting.delete(canonicalPath);
    visited.add(canonicalPath);
  };

  await parseFile(paths.pythonRequirements);
  return {
    declared: declarations,
    unverifiable: boundGeneratedFacts(unverifiable, "unverifiable requirement entries"),
  };
}

function compareRequirements(
  declarations: RequirementDetail["declared"],
  installed: ReadonlyMap<string, Pep440Version>,
): readonly string[] {
  const mismatches: string[] = [];
  for (const declaration of declarations) {
    const installedVersion = installed.get(declaration.name);
    const expectedVersion = parsePep440Version(declaration.specifier);
    if (expectedVersion === undefined) {
      continue;
    }
    if (installedVersion === undefined) {
      mismatches.push(`${declaration.name}==${declaration.specifier} is not installed.`);
    } else if (!pep440ExactMatch(expectedVersion, installedVersion)) {
      mismatches.push(`${declaration.name} requires ${declaration.specifier} but ${installedVersion.normalized} is installed.`);
    }
  }
  return boundGeneratedFacts(mismatches, "requirement mismatches");
}

function parseConfigurationObject(contents: string): readonly string[] | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    return undefined;
  }
  if (!isRecord(parsed)) {
    return undefined;
  }

  const keys = Object.keys(parsed);
  if (
    keys.length > MAX_CONFIGURATION_KEYS
    || keys.some(
      (key) =>
        key.length === 0
        || key.length > MAX_CONFIGURATION_KEY_LENGTH
        || CONTROL_CHARACTER_PATTERN.test(key)
        || !CONFIGURATION_KEY_PATTERN.test(key),
    )
  ) {
    return undefined;
  }
  return keys;
}

async function readConfigurationDocument(files: InspectionFiles, path: string, canonicalRoot: string): Promise<ConfigurationDocument> {
  const observation = await readContainedText(files, path, canonicalRoot);
  if (observation.kind !== "available") {
    return observation;
  }
  const keys = parseConfigurationObject(observation.contents);
  return keys === undefined ? {kind: "invalid"} : {kind: "available", keys};
}

async function inspectConfiguration(
  files: InspectionFiles,
  tasks: InspectionProviderContext["tasks"],
  paths: RepositoryPaths,
  canonicalRoot: string,
): Promise<readonly string[]> {
  const documents = await tasks.parallel<ConfigurationDocument>([
    () => readConfigurationDocument(files, resolve(paths.expRoot, "config.template.json"), canonicalRoot),
    () => readConfigurationDocument(files, resolve(paths.expRoot, "config.docker.json"), canonicalRoot),
    () => readConfigurationDocument(files, resolve(paths.expRoot, "config.aspire.json"), canonicalRoot),
  ]);
  // `tasks.parallel` returns a plain `readonly T[]`, so indexing under `noUncheckedIndexedAccess`
  // widens each element; the explicit guard keeps every document exactly as narrow as before.
  const template = documents[0];
  const docker = documents[1];
  const aspire = documents[2];
  if (template === undefined || docker === undefined || aspire === undefined) {
    throw new PythonInspectionFailure("unavailable", "Python configuration documents could not be inspected.");
  }

  const issues: string[] = [];
  const appendDocumentIssue = (name: string, document: ConfigurationDocument, optional: boolean): void => {
    if (document.kind === "missing") {
      if (!optional) {
        issues.push(`${name} is missing.`);
      }
    } else if (document.kind === "unavailable") {
      issues.push(`${name} could not be read.`);
    } else if (document.kind === "invalid") {
      issues.push(`${name} is not a valid JSON object.`);
    }
  };

  appendDocumentIssue("config.template.json", template, false);
  appendDocumentIssue("config.docker.json", docker, false);
  appendDocumentIssue("config.aspire.json", aspire, true);

  if (template.kind === "available" && docker.kind === "available") {
    const dockerKeys = new Set(docker.keys);
    for (const key of [...template.keys].sort(compareText)) {
      if (!dockerKeys.has(key)) {
        issues.push(`config.docker.json is missing required key '${key}'.`);
      }
    }
  }
  return boundGeneratedFacts(issues.sort(compareText), "configuration issues");
}

async function inspectInterpreters(
  input: Readonly<{
    paths: RepositoryPaths;
    probes: InspectionProbeRunner;
    tasks: InspectionProviderContext["tasks"];
    platform: NodeJS.Platform;
    environment: ProcessEnvironment;
  }>,
): Promise<readonly Readonly<{fact: PythonInterpreterFact; version: ParsedPythonVersion}>[]> {
  const candidates = pythonCandidates(input.platform);
  const outcomes = await input.tasks.parallel<ProcessExecutionResult>(
    candidates.map(
      (candidate) => (): Promise<ProcessExecutionResult> =>
        input.probes.run(probes.python.version(candidate.command, candidate.selector), {
          cwd: input.paths.root,
          env: input.environment,
        }),
    ),
  );

  const facts: Array<Readonly<{fact: PythonInterpreterFact; version: ParsedPythonVersion}>> = [];
  for (const [index, candidate] of candidates.entries()) {
    const result = outcomes[index];
    if (result === undefined) {
      throw new PythonInspectionFailure("unavailable", "Python interpreter candidates could not be inspected.");
    }
    if (result.kind === "timed-out" || result.kind === "signalled" || result.kind === "cancelled") {
      throw new PythonInspectionFailure("unavailable", "Python interpreter candidates could not be inspected.");
    }
    if (result.kind === "spawn-failed") {
      if (isMissingExecutable(result)) {
        continue;
      }
      throw new PythonInspectionFailure("unavailable", "A Python interpreter candidate could not be started.");
    }
    if (!isSuccessfulCommand(result)) {
      continue;
    }

    const version = parsePythonVersionResult(result);
    if (version === undefined) {
      throw new PythonInspectionFailure("invalid", "A Python interpreter version probe returned malformed output.");
    }
    facts.push({fact: candidateFact(candidate, version), version});
  }
  return facts;
}

async function inspectVenvDirectory(files: InspectionFiles, paths: RepositoryPaths): Promise<boolean> {
  try {
    const metadata = await files.inspect(resolve(paths.expRoot, ".venv"));
    if (metadata.kind === "missing") {
      return false;
    }
    if (metadata.kind !== "directory") {
      throw new PythonInspectionFailure("invalid", "The canonical Python virtual-environment path is not a directory.");
    }
    return true;
  } catch (error: unknown) {
    if (error instanceof PythonInspectionFailure) {
      throw error;
    }
    if (hasErrorCode(error, "ENOENT")) {
      return false;
    }
    throw new PythonInspectionFailure("unavailable", "The canonical Python virtual environment could not be inspected.");
  }
}

/**
 * Creates one read-only provider for normalized Python, pip, requirement, and configuration facts.
 *
 * @param input - Canonical repository paths, opaque probe runner, and the read-only filesystem,
 * clock, task-scheduler, and environment capabilities.
 * @returns An inspection provider with explicit unavailable/invalid outcomes at command, file, and parse boundaries.
 */
export function createPythonProvider(
  input: Readonly<Pick<InspectionProviderContext, "files" | "clock" | "tasks" | "environment"> & {
    paths: RepositoryPaths;
    probes: InspectionProbeRunner;
  }>,
): InspectionProvider<PythonFacts> {
  const now = (): number => input.clock.monotonicNow();
  const platform = input.environment.platform;
  const {files} = input;

  return async (): Promise<InspectionOutcome<PythonFacts>> => {
    const startedAt = now();
    if (!SUPPORTED_PLATFORMS.has(platform)) {
      return invalidOutcome("The requested Python inspection platform is unsupported.", startedAt, now);
    }

    try {
      const canonicalRoot = await canonicalExperimentalRoot(files, input.paths);
      const environment = pythonProbeEnvironment(platform);
      const minimum = await readPythonMinimum(files, input.paths, canonicalRoot);
      const requirementDetail = await parseRequirementsTree(files, input.paths, canonicalRoot);

      let configurationIssues: readonly string[] | undefined;
      let venvExists: boolean | undefined;

      // Both observations start concurrently, exactly as the previous `Promise.all` did; each task
      // assigns its own binding so the heterogeneous results keep their exact types.
      await input.tasks.parallel<void>([
        async () => {
          configurationIssues = await inspectConfiguration(files, input.tasks, input.paths, canonicalRoot);
        },
        async () => {
          venvExists = await inspectVenvDirectory(files, input.paths);
        },
      ]);

      if (configurationIssues === undefined || venvExists === undefined) {
        throw new PythonInspectionFailure("unavailable", "The Python inspection did not resolve every repository fact.");
      }

      const interpreterDetails = await inspectInterpreters({
        paths: input.paths,
        probes: input.probes,
        tasks: input.tasks,
        platform,
        environment,
      });

      const interpreters = interpreterDetails.map(({fact}) => fact);
      const selected = interpreterDetails.find(({version}) => satisfiesMinimum(version, minimum))?.fact;
      let virtualEnvironment: PythonFacts["virtualEnvironment"] = {exists: false, compatible: false};
      let pip: PythonFacts["pip"] = {available: false, conflicts: []};
      let mismatches: readonly string[] = [];

      if (venvExists) {
        const relativeInterpreter = platformVenvInterpreter(platform);
        const probeOptions = {cwd: input.paths.expRoot, env: environment};
        const metadataResult = await input.probes.run(probes.python.metadata(relativeInterpreter), probeOptions);
        if (!isSuccessfulCommand(metadataResult)) {
          throw new PythonInspectionFailure("unavailable", "The Python virtual environment could not be inspected.");
        }
        const metadata = parsePythonMetadata(metadataResult.stdout);
        if (metadata === undefined) {
          throw new PythonInspectionFailure("invalid", "The Python virtual environment returned malformed metadata.");
        }

        const expectedDirectory = platformVenvDirectory(input.paths.expRoot, platform);
        const isWin32 = platform === "win32";
        const canonicalIdentity =
          isWithinVenvDirectory(metadata.executable, expectedDirectory, isWin32)
          && /^python(?:\d+(?:\.\d+)?)?(?:\.exe)?$/iu.test(metadata.executable.split(/[\\/]/u).at(-1) ?? "")
          && pathsEqual(metadata.prefix, expectedDirectory, isWin32)
          && !pathsEqual(metadata.prefix, metadata.basePrefix, isWin32);
        virtualEnvironment = {
          exists: true,
          compatible: canonicalIdentity && satisfiesMinimum(metadata.version, minimum),
          ...(canonicalIdentity ? {interpreterPath: metadata.executable} : {}),
          version: metadata.version.text,
        };

        if (canonicalIdentity) {
          const pipVersionResult = await input.probes.run(probes.python.pipVersion(relativeInterpreter), probeOptions);
          if (hasTransportFailure(pipVersionResult)) {
            throw new PythonInspectionFailure("unavailable", "pip availability could not be inspected.");
          }
          if (isSuccessfulCommand(pipVersionResult)) {
            const pipVersion = parsePipVersionResult(pipVersionResult);
            if (pipVersion === undefined) {
              throw new PythonInspectionFailure("invalid", "pip --version returned malformed output.");
            }

            const pipOutcomes = await input.tasks.parallel<ProcessExecutionResult>([
              () => input.probes.run(probes.python.pipList(relativeInterpreter), probeOptions),
              () => input.probes.run(probes.python.pipCheck(relativeInterpreter), probeOptions),
            ]);
            // `tasks.parallel` returns a plain `readonly T[]`, so indexing under
            // `noUncheckedIndexedAccess` widens each element; the guard keeps both exactly as narrow.
            const pipListResult = pipOutcomes[0];
            const pipCheckResult = pipOutcomes[1];
            if (pipListResult === undefined || pipCheckResult === undefined) {
              throw new PythonInspectionFailure("unavailable", "Installed Python distributions could not be inspected.");
            }
            if (!isSuccessfulCommand(pipListResult)) {
              throw new PythonInspectionFailure("unavailable", "Installed Python distributions could not be inspected.");
            }
            if (hasTransportFailure(pipCheckResult)) {
              throw new PythonInspectionFailure("unavailable", "Python dependency conflicts could not be inspected.");
            }

            const installed = parseInstalledDistributions(pipListResult.stdout);
            if (installed === undefined) {
              throw new PythonInspectionFailure("invalid", "pip list returned malformed package data.");
            }
            pip = {available: true, version: pipVersion, conflicts: projectPipConflicts(pipCheckResult)};
            mismatches = compareRequirements(requirementDetail.declared, installed);
          }
        }
      }

      const value: PythonFacts = {
        interpreters,
        ...(selected === undefined ? {} : {selected}),
        virtualEnvironment,
        pip,
        requirements: {
          declared: requirementDetail.declared,
          unverifiable: requirementDetail.unverifiable,
          mismatches,
        },
        configurationIssues,
      };
      return {kind: "available", value, durationMs: elapsedMilliseconds(startedAt, now)};
    } catch (error: unknown) {
      if (error instanceof RequirementsTreeInvalidError) {
        return invalidOutcome(error.message, startedAt, now);
      }
      if (error instanceof RequirementsTreeUnavailableError) {
        return unavailableOutcome(error.message, startedAt, now);
      }
      if (error instanceof PythonInspectionFailure) {
        return error.kind === "invalid"
          ? invalidOutcome(error.publicMessage, startedAt, now)
          : unavailableOutcome(error.publicMessage, startedAt, now);
      }
      throw error;
    }
  };
}
