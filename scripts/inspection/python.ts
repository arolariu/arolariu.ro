/**
 * @fileoverview Shared read-only Python interpreter, virtual environment, pip, requirement, and configuration inspection.
 * @module scripts/inspection/python
 *
 * @remarks
 * Every command runs through an opaque named probe. Command output and configuration values are
 * projected immediately into bounded facts; raw stdout, stderr, native errors, requirement URLs,
 * package-index credentials, and configuration values never cross this module's public boundary.
 */

import {readFile, realpath, stat} from "node:fs/promises";
import {dirname, isAbsolute, relative, resolve, sep} from "node:path";

import type {CommandResult} from "../common/process.ts";
import type {RepositoryPaths} from "../common/repository-paths.ts";
import type {InspectionProbeRunner} from "./probes.ts";
import {probes} from "./probes.ts";
import type {InspectionOutcome, InspectionProvider} from "./types.ts";

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
const PIP_VERSION_TOKEN_PATTERN = /^[0-9][0-9A-Za-z.!+_-]*$/u;
const PACKAGE_NAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/u;
const PACKAGE_VERSION_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._!+-]*[A-Za-z0-9])?$/u;
const EXACT_REQUIREMENT_PIN = /^([A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?)\s*==\s*([A-Za-z0-9](?:[A-Za-z0-9._!+-]*[A-Za-z0-9])?)$/u;
const REQUIREMENT_INCLUDE_DIRECTIVE = /^(?:-r|--requirement)(?:=|\s+)(.+)$/u;
const REQUIREMENT_INCLUDE_PREFIX = /^(?:-r|--requirement)(?:=|\s|$)/u;
const REQUIREMENT_NAME_LIKE = /^[A-Za-z0-9][A-Za-z0-9._-]*/u;
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

function isSuccessfulCommand(result: Readonly<CommandResult>): boolean {
  return result.code === 0 && !result.timedOut && result.signal === undefined && result.spawnError === undefined;
}

function hasTransportFailure(result: Readonly<CommandResult>): boolean {
  return result.timedOut || result.signal !== undefined || result.spawnError !== undefined;
}

function isMissingExecutable(result: Readonly<CommandResult>): boolean {
  if (result.code === 127) {
    return true;
  }
  const detail = `${result.spawnError ?? ""}\n${result.stderr}`;
  return /\bENOENT\b|command not found|not recognized as an internal or external command|no such file or directory/iu.test(detail);
}

function safeText(value: string, maximumLength: number): string | undefined {
  if (value.length > maximumLength + 2) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed !== "" && trimmed.length <= maximumLength && !CONTROL_CHARACTER_PATTERN.test(trimmed) ? trimmed : undefined;
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

function parsePythonVersionResult(result: Readonly<CommandResult>): ParsedPythonVersion | undefined {
  return parsePythonCommandVersion(result.stdout) ?? parsePythonCommandVersion(result.stderr);
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
  return version !== undefined && version.length <= MAX_VERSION_LENGTH && PIP_VERSION_TOKEN_PATTERN.test(version) ? version : undefined;
}

function parsePipVersionResult(result: Readonly<CommandResult>): string | undefined {
  return parsePipVersion(result.stdout) ?? parsePipVersion(result.stderr);
}

function normalizeDistributionName(name: string): string {
  return name.toLowerCase().replaceAll(/[-_.]+/gu, "-");
}

function parseInstalledDistributions(output: string): ReadonlyMap<string, string> | undefined {
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

  const distributions = new Map<string, string>();
  for (const entry of parsed) {
    if (!isRecord(entry)) {
      return undefined;
    }
    const name = entry["name"];
    const version = entry["version"];
    if (
      typeof name !== "string"
      || name.length > MAX_PACKAGE_NAME_LENGTH
      || !PACKAGE_NAME_PATTERN.test(name)
      || typeof version !== "string"
      || version.length > MAX_PACKAGE_VERSION_LENGTH
      || !PACKAGE_VERSION_PATTERN.test(version)
    ) {
      return undefined;
    }

    const normalizedName = normalizeDistributionName(name);
    if (distributions.has(normalizedName)) {
      return undefined;
    }
    distributions.set(normalizedName, version);
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

function projectPipConflicts(result: Readonly<CommandResult>): readonly string[] {
  if (result.code === 0) {
    return [];
  }

  const source = result.stdout.trim() === "" ? result.stderr : result.stdout;
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

async function canonicalExperimentalRoot(paths: RepositoryPaths): Promise<string> {
  try {
    const canonicalRoot = await realpath(paths.expRoot);
    const metadata = await stat(canonicalRoot);
    if (!metadata.isDirectory()) {
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

async function readContainedText(path: string, canonicalRoot: string): Promise<ContainedTextObservation> {
  let canonicalPath: string;
  try {
    canonicalPath = await realpath(path);
  } catch (error: unknown) {
    return hasErrorCode(error, "ENOENT") ? {kind: "missing"} : {kind: "unavailable"};
  }
  if (!isPathWithin(canonicalRoot, canonicalPath)) {
    return {kind: "invalid"};
  }

  try {
    const metadata = await stat(canonicalPath);
    if (!metadata.isFile()) {
      return {kind: "invalid"};
    }
    const contents = await readFile(canonicalPath, "utf8");
    return contents.length <= MAX_TEXT_FILE_LENGTH ? {kind: "available", contents} : {kind: "invalid"};
  } catch {
    return {kind: "unavailable"};
  }
}

async function readPythonMinimum(paths: RepositoryPaths, canonicalRoot: string): Promise<PythonMinimum> {
  const observation = await readContainedText(paths.pythonProject, canonicalRoot);
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
    && !value.split(/[\\/]/u).includes("..")
  );
}

async function parseRequirementsTree(paths: RepositoryPaths, canonicalRoot: string): Promise<RequirementDetail> {
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
      canonicalPath = await realpath(logicalPath);
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

    let contents: string;
    try {
      const metadata = await stat(canonicalPath);
      if (!metadata.isFile()) {
        throw new RequirementsTreeInvalidError();
      }
      contents = await readFile(canonicalPath, "utf8");
    } catch (error: unknown) {
      if (error instanceof RequirementsTreeInvalidError) {
        throw error;
      }
      throw new RequirementsTreeUnavailableError();
    }
    if (contents.length > MAX_TEXT_FILE_LENGTH) {
      throw new RequirementsTreeInvalidError();
    }

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
        unverifiable.push(`${source}:${String(index + 1)} contains a pip option or directive that is not exactly comparable.`);
        continue;
      }

      const exactMatch = EXACT_REQUIREMENT_PIN.exec(line);
      if (exactMatch !== null && exactMatch[1] !== undefined && exactMatch[2] !== undefined) {
        const name = normalizeDistributionName(exactMatch[1]);
        if (seenNames.has(name)) {
          throw new RequirementsTreeInvalidError();
        }
        seenNames.add(name);
        declarations.push({name, specifier: exactMatch[2], source});
        continue;
      }

      const packageName = REQUIREMENT_NAME_LIKE.exec(line)?.[0];
      if (packageName !== undefined && packageName.length <= MAX_PACKAGE_NAME_LENGTH) {
        unverifiable.push(
          `${source}:${String(index + 1)} declares '${normalizeDistributionName(packageName)}' with a requirement that is not exactly comparable.`,
        );
        continue;
      }

      throw new RequirementsTreeInvalidError();
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

function compareRequirements(declarations: RequirementDetail["declared"], installed: ReadonlyMap<string, string>): readonly string[] {
  const mismatches: string[] = [];
  for (const declaration of declarations) {
    const installedVersion = installed.get(declaration.name);
    if (installedVersion === undefined) {
      mismatches.push(`${declaration.name}==${declaration.specifier} is not installed.`);
    } else if (installedVersion !== declaration.specifier) {
      mismatches.push(`${declaration.name} requires ${declaration.specifier} but ${installedVersion} is installed.`);
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

async function readConfigurationDocument(path: string, canonicalRoot: string): Promise<ConfigurationDocument> {
  const observation = await readContainedText(path, canonicalRoot);
  if (observation.kind !== "available") {
    return observation;
  }
  const keys = parseConfigurationObject(observation.contents);
  return keys === undefined ? {kind: "invalid"} : {kind: "available", keys};
}

async function inspectConfiguration(paths: RepositoryPaths, canonicalRoot: string): Promise<readonly string[]> {
  const [template, docker, aspire] = await Promise.all([
    readConfigurationDocument(resolve(paths.expRoot, "config.template.json"), canonicalRoot),
    readConfigurationDocument(resolve(paths.expRoot, "config.docker.json"), canonicalRoot),
    readConfigurationDocument(resolve(paths.expRoot, "config.aspire.json"), canonicalRoot),
  ]);

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
    platform: NodeJS.Platform;
    environment: Readonly<NodeJS.ProcessEnv>;
  }>,
): Promise<readonly Readonly<{fact: PythonInterpreterFact; version: ParsedPythonVersion}>[]> {
  const candidates = pythonCandidates(input.platform);
  const results = await Promise.all(
    candidates.map(async (candidate) => ({
      candidate,
      result: await input.probes.run(probes.python.version(candidate.command, candidate.selector), {
        cwd: input.paths.root,
        env: input.environment,
      }),
    })),
  );

  const facts: Array<Readonly<{fact: PythonInterpreterFact; version: ParsedPythonVersion}>> = [];
  for (const {candidate, result} of results) {
    if (result.timedOut || result.signal !== undefined) {
      throw new PythonInspectionFailure("unavailable", "Python interpreter candidates could not be inspected.");
    }
    if (result.spawnError !== undefined) {
      if (isMissingExecutable(result)) {
        continue;
      }
      throw new PythonInspectionFailure("unavailable", "A Python interpreter candidate could not be started.");
    }
    if (result.code !== 0) {
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

async function inspectVenvDirectory(paths: RepositoryPaths): Promise<boolean> {
  try {
    const metadata = await stat(resolve(paths.expRoot, ".venv"));
    if (!metadata.isDirectory()) {
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
 * @param input - Canonical repository paths, opaque probe runner, target platform, and monotonic clock.
 * @returns An inspection provider with explicit unavailable/invalid outcomes at command, file, and parse boundaries.
 */
export function createPythonProvider(
  input: Readonly<{
    paths: RepositoryPaths;
    probes: InspectionProbeRunner;
    platform: NodeJS.Platform;
    now: () => number;
  }>,
): InspectionProvider<PythonFacts> {
  return async (): Promise<InspectionOutcome<PythonFacts>> => {
    const startedAt = input.now();
    if (!SUPPORTED_PLATFORMS.has(input.platform)) {
      return invalidOutcome("The requested Python inspection platform is unsupported.", startedAt, input.now);
    }

    try {
      const canonicalRoot = await canonicalExperimentalRoot(input.paths);
      const environment = pythonProbeEnvironment(input.platform);
      const [minimum, interpreterDetails, requirementDetail, configurationIssues, venvExists] = await Promise.all([
        readPythonMinimum(input.paths, canonicalRoot),
        inspectInterpreters({...input, environment}),
        parseRequirementsTree(input.paths, canonicalRoot),
        inspectConfiguration(input.paths, canonicalRoot),
        inspectVenvDirectory(input.paths),
      ]);

      const interpreters = interpreterDetails.map(({fact}) => fact);
      const selected = interpreterDetails.find(({version}) => satisfiesMinimum(version, minimum))?.fact;
      let virtualEnvironment: PythonFacts["virtualEnvironment"] = {exists: false, compatible: false};
      let pip: PythonFacts["pip"] = {available: false, conflicts: []};
      let mismatches: readonly string[] = [];

      if (venvExists) {
        const relativeInterpreter = platformVenvInterpreter(input.platform);
        const probeOptions = {cwd: input.paths.expRoot, env: environment};
        const metadataResult = await input.probes.run(probes.python.metadata(relativeInterpreter), probeOptions);
        if (!isSuccessfulCommand(metadataResult)) {
          throw new PythonInspectionFailure("unavailable", "The Python virtual environment could not be inspected.");
        }
        const metadata = parsePythonMetadata(metadataResult.stdout);
        if (metadata === undefined) {
          throw new PythonInspectionFailure("invalid", "The Python virtual environment returned malformed metadata.");
        }

        const expectedDirectory = platformVenvDirectory(input.paths.expRoot, input.platform);
        const isWin32 = input.platform === "win32";
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
          if (pipVersionResult.code === 0) {
            const pipVersion = parsePipVersionResult(pipVersionResult);
            if (pipVersion === undefined) {
              throw new PythonInspectionFailure("invalid", "pip --version returned malformed output.");
            }

            const [pipListResult, pipCheckResult] = await Promise.all([
              input.probes.run(probes.python.pipList(relativeInterpreter), probeOptions),
              input.probes.run(probes.python.pipCheck(relativeInterpreter), probeOptions),
            ]);
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
      return {kind: "available", value, durationMs: elapsedMilliseconds(startedAt, input.now)};
    } catch (error: unknown) {
      if (error instanceof RequirementsTreeInvalidError) {
        return invalidOutcome(error.message, startedAt, input.now);
      }
      if (error instanceof RequirementsTreeUnavailableError) {
        return unavailableOutcome(error.message, startedAt, input.now);
      }
      if (error instanceof PythonInspectionFailure) {
        return error.kind === "invalid"
          ? invalidOutcome(error.publicMessage, startedAt, input.now)
          : unavailableOutcome(error.publicMessage, startedAt, input.now);
      }
      throw error;
    }
  };
}
