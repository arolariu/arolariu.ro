/**
 * @fileoverview Shared read-only .NET SDK, host, repository, certificate, and AppHost inspection.
 * @module scripts/inspection/dotnet
 *
 * @remarks
 * Every command runs through an opaque named probe. Command output is projected immediately into
 * small facts; SDK installation paths, command errors, AppHost parameter values, and user-secret
 * values are never returned or included in outcome text. Generated NuGet restore assets are
 * inspected read-only on the filesystem and reported as bounded repository-relative issues; their
 * contents are never read or retained, and their absence never makes the provider unavailable.
 */

import {readFile, realpath, stat} from "node:fs/promises";
import {isAbsolute, dirname, posix, relative, resolve, sep, win32} from "node:path";

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
  /**
   * Deterministic repository-relative NuGet restore-asset issues for the managed projects declared
   * by the repository solution. Absent generated assets are a restore fact, never unavailability.
   */
  readonly solutionRestoreIssues: readonly string[];
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
    /** Required Aspire parameter keys missing after user-secret-over-tracked configuration precedence. */
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
  readonly presentParameterKeys: readonly string[];
  readonly configuredParameterKeys: readonly string[];
}

interface SolutionProjectDeclarations {
  readonly declarationCount: number;
  readonly hasInvalidPath: boolean;
  readonly paths: readonly string[];
}

interface SolutionInspection {
  readonly issues: readonly string[];
  readonly restoreIssues: readonly string[];
}

interface ParsedXmlTag {
  readonly attributes: ReadonlyMap<string, string>;
  readonly closing: boolean;
  readonly name: string;
  readonly selfClosing: boolean;
}

interface JsonScanState {
  cursor: number;
  duplicateTrackedIdentity: boolean;
  readonly source: string;
}

type JsonObjectContext = "root" | "parameters" | "other";

const APPHOST_PROJECT_RELATIVE_PATH = "tooling/AppHost/AppHost.csproj";
const APPHOST_SETTINGS_RELATIVE_PATH = "tooling/AppHost/appsettings.Development.json";
const RESTORE_ASSET_PROJECT_EXTENSIONS: ReadonlySet<string> = new Set([".csproj", ".fsproj", ".vbproj"]);
const RESTORE_ASSET_RELATIVE_SEGMENTS = ["obj", "project.assets.json"] as const;
const REQUIRED_APPHOST_PARAMETER_KEYS = ["Parameters:sql-password", "Parameters:redis-password"] as const;
type RequiredAppHostParameterKey = (typeof REQUIRED_APPHOST_PARAMETER_KEYS)[number];
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
// Keep observational probes deterministic while disabling .NET first-use mutations and telemetry.
const DOTNET_PROBE_ENVIRONMENT = Object.freeze({
  DOTNET_ADD_GLOBAL_TOOLS_TO_PATH: "false",
  DOTNET_CLI_TELEMETRY_OPTOUT: "true",
  DOTNET_CLI_UI_LANGUAGE: "en-US",
  DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE: "true",
  DOTNET_GENERATE_ASPNET_CERTIFICATE: "false",
  DOTNET_NOLOGO: "true",
  DOTNET_SKIP_WORKLOAD_INTEGRITY_CHECK: "true",
});
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

function canonicalRequiredAppHostParameterKey(key: string): RequiredAppHostParameterKey | undefined {
  const normalizedKey = key.toLowerCase();
  return REQUIRED_APPHOST_PARAMETER_KEYS.find((requiredKey) => requiredKey.toLowerCase() === normalizedKey);
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

function isXmlWhitespace(character: string | undefined): boolean {
  return character === " " || character === "\t" || character === "\r" || character === "\n";
}

function skipXmlWhitespace(source: string, start: number): number {
  let cursor = start;
  while (isXmlWhitespace(source[cursor])) {
    cursor += 1;
  }
  return cursor;
}

function parseXmlName(source: string, start: number): Readonly<{name: string; next: number}> | undefined {
  const name = /^[A-Za-z_][A-Za-z0-9_.:-]*/u.exec(source.slice(start))?.[0];
  return name === undefined ? undefined : {name, next: start + name.length};
}

function isValidXmlCodePoint(codePoint: number): boolean {
  return (
    codePoint === 0x09
    || codePoint === 0x0a
    || codePoint === 0x0d
    || (codePoint >= 0x20 && codePoint <= 0xd7ff)
    || (codePoint >= 0xe000 && codePoint <= 0xfffd)
    || (codePoint >= 0x10000 && codePoint <= 0x10ffff)
  );
}

function hasValidXmlCharacters(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined || !isValidXmlCodePoint(codePoint)) {
      return false;
    }
  }
  return true;
}

function decodeXmlReferences(value: string): string | undefined {
  if (!hasValidXmlCharacters(value)) {
    return undefined;
  }
  let decoded = "";
  let cursor = 0;
  while (cursor < value.length) {
    const ampersand = value.indexOf("&", cursor);
    if (ampersand < 0) {
      return decoded + value.slice(cursor);
    }
    decoded += value.slice(cursor, ampersand);
    const semicolon = value.indexOf(";", ampersand + 1);
    if (semicolon < 0) {
      return undefined;
    }

    const reference = value.slice(ampersand + 1, semicolon);
    const namedReference =
      reference === "amp"
        ? "&"
        : reference === "lt"
          ? "<"
          : reference === "gt"
            ? ">"
            : reference === "quot"
              ? '"'
              : reference === "apos"
                ? "'"
                : undefined;
    if (namedReference !== undefined) {
      decoded += namedReference;
    } else {
      const hexadecimal = /^#x([0-9A-Fa-f]+)$/u.exec(reference)?.[1];
      const decimal = /^#([0-9]+)$/u.exec(reference)?.[1];
      const codePoint =
        hexadecimal !== undefined ? Number.parseInt(hexadecimal, 16) : decimal !== undefined ? Number.parseInt(decimal, 10) : Number.NaN;
      if (!Number.isInteger(codePoint) || !isValidXmlCodePoint(codePoint)) {
        return undefined;
      }
      decoded += String.fromCodePoint(codePoint);
    }
    cursor = semicolon + 1;
  }
  return decoded;
}

function findXmlTagEnd(source: string, start: number): number | undefined {
  let quote: '"' | "'" | undefined;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index]!;
    if (quote !== undefined) {
      if (character === quote) {
        quote = undefined;
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === "<") {
      return undefined;
    } else if (character === ">") {
      return index;
    }
  }
  return undefined;
}

function parseXmlTag(source: string): ParsedXmlTag | undefined {
  let cursor = 0;
  const closing = source.startsWith("/");
  if (closing) {
    cursor += 1;
  }

  const parsedName = parseXmlName(source, cursor);
  if (parsedName === undefined) {
    return undefined;
  }
  cursor = parsedName.next;

  if (closing) {
    cursor = skipXmlWhitespace(source, cursor);
    return cursor === source.length ? {attributes: new Map(), closing: true, name: parsedName.name, selfClosing: false} : undefined;
  }

  const attributes = new Map<string, string>();
  while (cursor < source.length) {
    const beforeWhitespace = cursor;
    cursor = skipXmlWhitespace(source, cursor);
    if (cursor === source.length) {
      return {attributes, closing: false, name: parsedName.name, selfClosing: false};
    }
    if (source[cursor] === "/") {
      return cursor + 1 === source.length ? {attributes, closing: false, name: parsedName.name, selfClosing: true} : undefined;
    }
    if (cursor === beforeWhitespace) {
      return undefined;
    }

    const parsedAttributeName = parseXmlName(source, cursor);
    if (parsedAttributeName === undefined || attributes.has(parsedAttributeName.name)) {
      return undefined;
    }
    cursor = skipXmlWhitespace(source, parsedAttributeName.next);
    if (source[cursor] !== "=") {
      return undefined;
    }
    cursor = skipXmlWhitespace(source, cursor + 1);
    const quote = source[cursor];
    if (quote !== '"' && quote !== "'") {
      return undefined;
    }
    const valueEnd = source.indexOf(quote, cursor + 1);
    if (valueEnd < 0) {
      return undefined;
    }
    const rawValue = source.slice(cursor + 1, valueEnd);
    const value = rawValue.includes("<") ? undefined : decodeXmlReferences(rawValue);
    if (value === undefined) {
      return undefined;
    }
    attributes.set(parsedAttributeName.name, value);
    cursor = valueEnd + 1;
  }

  return {attributes, closing: false, name: parsedName.name, selfClosing: false};
}

function isValidXmlDeclaration(instruction: string): boolean {
  const declaration = parseXmlTag(instruction);
  if (declaration === undefined || declaration.closing || declaration.selfClosing || declaration.name !== "xml") {
    return false;
  }

  const attributes = [...declaration.attributes.entries()];
  let cursor = 0;
  const version = attributes[cursor];
  if (version?.[0] !== "version" || (version[1] !== "1.0" && version[1] !== "1.1")) {
    return false;
  }
  cursor += 1;

  const encoding = attributes[cursor];
  if (encoding?.[0] === "encoding") {
    if (!/^[A-Za-z][A-Za-z0-9._-]*$/u.test(encoding[1])) {
      return false;
    }
    cursor += 1;
  }

  const standalone = attributes[cursor];
  if (standalone?.[0] === "standalone") {
    if (standalone[1] !== "yes" && standalone[1] !== "no") {
      return false;
    }
    cursor += 1;
  }
  return cursor === attributes.length;
}

function parseSolutionProjectDeclarations(source: string): SolutionProjectDeclarations | undefined {
  const paths: string[] = [];
  const openElements: string[] = [];
  let declarationCount = 0;
  let hasInvalidPath = false;
  let rootSeen = false;
  let xmlDeclarationSeen = false;
  let cursor = 0;

  while (cursor <= source.length) {
    const opening = source.indexOf("<", cursor);
    const textEnd = opening < 0 ? source.length : opening;
    const text = source.slice(cursor, textEnd);
    if (text.includes("]]>") || decodeXmlReferences(text) === undefined || (openElements.length === 0 && text.trim() !== "")) {
      return undefined;
    }
    if (opening < 0) {
      break;
    }

    if (source.startsWith("<!--", opening)) {
      const end = source.indexOf("-->", opening + 4);
      const comment = end < 0 ? undefined : source.slice(opening + 4, end);
      if (comment === undefined || !hasValidXmlCharacters(comment) || comment.includes("--") || comment.endsWith("-")) {
        return undefined;
      }
      cursor = end + 3;
      continue;
    }
    if (source.startsWith("<![CDATA[", opening)) {
      const end = source.indexOf("]]>", opening + 9);
      const cdata = end < 0 ? undefined : source.slice(opening + 9, end);
      if (cdata === undefined || openElements.length === 0 || !hasValidXmlCharacters(cdata)) {
        return undefined;
      }
      cursor = end + 3;
      continue;
    }
    if (source.startsWith("<?", opening)) {
      const end = source.indexOf("?>", opening + 2);
      const instruction = end < 0 ? undefined : source.slice(opening + 2, end);
      const target = instruction === undefined ? undefined : parseXmlName(instruction, 0);
      const reservedXmlTarget = target?.name.toLowerCase() === "xml";
      if (
        instruction === undefined
        || target === undefined
        || !hasValidXmlCharacters(instruction)
        || (target.next < instruction.length && !isXmlWhitespace(instruction[target.next]))
        || (reservedXmlTarget
          && (target.name !== "xml"
            || rootSeen
            || xmlDeclarationSeen
            || (opening !== 0 && !(opening === 1 && source.codePointAt(0) === 0xfeff))
            || !isValidXmlDeclaration(instruction)))
      ) {
        return undefined;
      }
      if (reservedXmlTarget) {
        xmlDeclarationSeen = true;
      }
      cursor = end + 2;
      continue;
    }
    if (source.startsWith("<!", opening)) {
      return undefined;
    }

    const tagEnd = findXmlTagEnd(source, opening + 1);
    if (tagEnd === undefined) {
      return undefined;
    }
    const tag = parseXmlTag(source.slice(opening + 1, tagEnd));
    cursor = tagEnd + 1;
    if (tag === undefined) {
      return undefined;
    }
    if (tag.closing) {
      if (openElements.pop() !== tag.name) {
        return undefined;
      }
      continue;
    }

    if (openElements.length === 0) {
      if (rootSeen || tag.name !== "Solution") {
        return undefined;
      }
      rootSeen = true;
    }
    if (tag.name === "Project") {
      declarationCount += 1;
      const projectPath = tag.attributes.get("Path");
      if (projectPath === undefined || projectPath.trim() === "") {
        hasInvalidPath = true;
      } else {
        paths.push(projectPath);
      }
    }
    if (!tag.selfClosing) {
      openElements.push(tag.name);
    }
  }

  return rootSeen && openElements.length === 0 ? {declarationCount, hasInvalidPath, paths} : undefined;
}

/**
 * Decides whether one declared solution project is a managed .NET project that a NuGet restore is
 * expected to generate `obj/project.assets.json` for. Frontend `.esproj` declarations never are.
 *
 * @param projectPath - An already normalized, containment-validated repository-relative path.
 * @returns Whether generated NuGet restore assets are required for the project.
 */
function requiresRestoreAssets(projectPath: string): boolean {
  const extensionIndex = projectPath.lastIndexOf(".");
  return extensionIndex >= 0 && RESTORE_ASSET_PROJECT_EXTENSIONS.has(projectPath.slice(extensionIndex).toLowerCase());
}

/**
 * Inspects the generated NuGet restore asset owned by one already validated solution project.
 *
 * @param canonicalRoot - Canonical repository root used for containment validation.
 * @param canonicalProject - Canonical, contained project file path.
 * @param projectPath - Repository-relative project path used for bounded issue text.
 * @returns One bounded, repository-relative issue, or `undefined` when the assets are healthy.
 */
async function inspectProjectRestoreAssets(
  canonicalRoot: string,
  canonicalProject: string,
  projectPath: string,
): Promise<string | undefined> {
  if (!requiresRestoreAssets(projectPath)) {
    return undefined;
  }

  try {
    const canonicalAssets = await realpath(resolve(dirname(canonicalProject), ...RESTORE_ASSET_RELATIVE_SEGMENTS));
    const relativeAssets = relative(canonicalRoot, canonicalAssets);
    if (relativeAssets === ".." || relativeAssets.startsWith(`..${sep}`) || isAbsolute(relativeAssets)) {
      return `Invalid NuGet restore assets: ${projectPath}`;
    }

    const assetsStat = await stat(canonicalAssets);
    if (!assetsStat.isFile()) {
      return `Invalid NuGet restore assets: ${projectPath}`;
    }
    return assetsStat.size === 0 ? `Empty NuGet restore assets: ${projectPath}` : undefined;
  } catch (error: unknown) {
    return hasErrorCode(error, "ENOENT") || hasErrorCode(error, "ENOTDIR")
      ? `Missing NuGet restore assets: ${projectPath}`
      : `NuGet restore assets could not be inspected: ${projectPath}`;
  }
}

async function inspectSolution(paths: RepositoryPaths): Promise<SolutionInspection> {
  let canonicalRoot: string;
  try {
    canonicalRoot = await realpath(paths.root);
  } catch {
    return {issues: ["The repository root could not be inspected for solution integrity."], restoreIssues: []};
  }

  let contents: string;
  try {
    contents = await readFile(paths.solution, "utf8");
  } catch (error: unknown) {
    return {
      issues: [
        hasErrorCode(error, "ENOENT") ? "The repository solution file is missing." : "The repository solution file could not be read.",
      ],
      restoreIssues: [],
    };
  }

  const declarations = parseSolutionProjectDeclarations(contents);
  if (declarations === undefined) {
    return {issues: ["The repository solution file is malformed."], restoreIssues: []};
  }
  if (declarations.declarationCount === 0) {
    return {issues: ["The repository solution declares no projects."], restoreIssues: []};
  }

  const issues = new Set<string>();
  const restoreIssues = new Set<string>();
  if (declarations.hasInvalidPath) {
    issues.add("The repository solution contains an invalid project path.");
  }
  for (const rawProjectPath of declarations.paths) {
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
        continue;
      }

      const restoreIssue = await inspectProjectRestoreAssets(canonicalRoot, canonicalProject, projectPath);
      if (restoreIssue !== undefined) {
        restoreIssues.add(restoreIssue);
      }
    } catch (error: unknown) {
      issues.add(
        hasErrorCode(error, "ENOENT") || hasErrorCode(error, "ENOTDIR")
          ? `Missing solution project: ${projectPath}`
          : `Solution project could not be inspected: ${projectPath}`,
      );
    }
  }
  return {issues: [...issues].sort(compareText), restoreIssues: [...restoreIssues].sort(compareText)};
}

function skipJsonWhitespace(state: JsonScanState): void {
  while (/\s/u.test(state.source[state.cursor] ?? "")) {
    state.cursor += 1;
  }
}

function scanJsonString(state: JsonScanState): string | undefined {
  if (state.source[state.cursor] !== '"') {
    return undefined;
  }
  const start = state.cursor;
  state.cursor += 1;
  while (state.cursor < state.source.length) {
    const character = state.source[state.cursor];
    if (character === "\\") {
      state.cursor += 2;
      continue;
    }
    if (character === '"') {
      state.cursor += 1;
      let value: unknown;
      try {
        value = JSON.parse(state.source.slice(start, state.cursor));
      } catch {
        return undefined;
      }
      return typeof value === "string" ? value : undefined;
    }
    state.cursor += 1;
  }
  return undefined;
}

function scanJsonArray(state: JsonScanState): boolean {
  state.cursor += 1;
  skipJsonWhitespace(state);
  if (state.source[state.cursor] === "]") {
    state.cursor += 1;
    return true;
  }
  while (scanJsonValue(state, "other")) {
    skipJsonWhitespace(state);
    if (state.source[state.cursor] === "]") {
      state.cursor += 1;
      return true;
    }
    if (state.source[state.cursor] !== ",") {
      return false;
    }
    state.cursor += 1;
  }
  return false;
}

function scanJsonObject(state: JsonScanState, context: JsonObjectContext): boolean {
  state.cursor += 1;
  const trackedIdentities = new Set<string>();
  skipJsonWhitespace(state);
  if (state.source[state.cursor] === "}") {
    state.cursor += 1;
    return true;
  }

  while (state.cursor < state.source.length) {
    const key = scanJsonString(state);
    if (key === undefined) {
      return false;
    }
    skipJsonWhitespace(state);
    if (state.source[state.cursor] !== ":") {
      return false;
    }
    state.cursor += 1;

    let childContext: JsonObjectContext = "other";
    const trackedIdentity =
      context === "root" && key.toLowerCase() === "parameters"
        ? "Parameters"
        : context === "parameters"
          ? canonicalRequiredAppHostParameterKey(`Parameters:${key}`)
          : undefined;
    if (trackedIdentity !== undefined) {
      if (trackedIdentities.has(trackedIdentity)) {
        state.duplicateTrackedIdentity = true;
      }
      trackedIdentities.add(trackedIdentity);
      if (context === "root") {
        childContext = "parameters";
      }
    }

    if (!scanJsonValue(state, childContext)) {
      return false;
    }
    skipJsonWhitespace(state);
    if (state.source[state.cursor] === "}") {
      state.cursor += 1;
      return true;
    }
    if (state.source[state.cursor] !== ",") {
      return false;
    }
    state.cursor += 1;
    skipJsonWhitespace(state);
  }
  return false;
}

function scanJsonValue(state: JsonScanState, objectContext: JsonObjectContext): boolean {
  skipJsonWhitespace(state);
  const character = state.source[state.cursor];
  if (character === "{") {
    return scanJsonObject(state, objectContext);
  }
  if (character === "[") {
    return scanJsonArray(state);
  }
  if (character === '"') {
    return scanJsonString(state) !== undefined;
  }
  const primitive = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/u.exec(state.source.slice(state.cursor))?.[0];
  if (primitive === undefined) {
    return false;
  }
  state.cursor += primitive.length;
  return true;
}

function hasDuplicateTrackedConfigurationIdentity(source: string): boolean | undefined {
  const state: JsonScanState = {source, cursor: 0, duplicateTrackedIdentity: false};
  if (!scanJsonValue(state, "root")) {
    return undefined;
  }
  skipJsonWhitespace(state);
  return state.cursor === source.length ? state.duplicateTrackedIdentity : undefined;
}

function configuredTrackedParameters(document: unknown): readonly string[] | undefined {
  if (!isRecord(document)) {
    return undefined;
  }
  const parameterSections = Object.entries(document).filter(([key]) => key.toLowerCase() === "parameters");
  if (parameterSections.length === 0) {
    return [];
  }
  const parameters = parameterSections[0]?.[1];
  if (parameterSections.length !== 1 || !isRecord(parameters)) {
    return undefined;
  }

  const configured: string[] = [];
  for (const key of REQUIRED_APPHOST_PARAMETER_KEYS) {
    const suffix = key.slice("Parameters:".length);
    const matches = Object.entries(parameters).filter(([candidate]) => candidate.toLowerCase() === suffix.toLowerCase());
    if (matches.length === 0) {
      continue;
    }
    const value = matches[0]?.[1];
    if (matches.length !== 1) {
      return undefined;
    }
    if (typeof value !== "string") {
      return undefined;
    }
    if (value.trim() !== "") {
      configured.push(key);
    }
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
  if (hasDuplicateTrackedConfigurationIdentity(settingsSource) !== false) {
    return {kind: "invalid"};
  }
  const configuredParameterKeys = configuredTrackedParameters(settings);
  return configuredParameterKeys === undefined
    ? {kind: "invalid"}
    : {kind: "available", value: {projectExists: true, configuredParameterKeys}};
}

function unwrapUserSecretsDocument(output: string): string | undefined {
  const lines = output.split(/\r?\n/u);
  const beginLines = lines.flatMap((line, index) => (line.trim() === "//BEGIN" ? [index] : []));
  const endLines = lines.flatMap((line, index) => (line.trim() === "//END" ? [index] : []));
  const begin = beginLines[0];
  const end = endLines[0];
  return beginLines.length !== 1 || endLines.length !== 1 || begin === undefined || end === undefined || end <= begin
    ? undefined
    : lines
        .slice(begin + 1, end)
        .join("\n")
        .trim();
}

function parseUserSecrets(output: string): UserSecretFacts | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    const document = unwrapUserSecretsDocument(output);
    if (document === undefined) {
      return undefined;
    }
    try {
      parsed = JSON.parse(document);
    } catch {
      return undefined;
    }
  }
  if (!isRecord(parsed)) {
    return undefined;
  }

  const keys: string[] = [];
  const presentParameterKeys = new Set<string>();
  const configuredParameterKeys = new Set<string>();
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== "string" || key.trim() === "" || key.length > MAX_IDENTIFIER_LENGTH || CONTROL_CHARACTER_PATTERN.test(key)) {
      return undefined;
    }
    keys.push(key);
    const requiredKey = canonicalRequiredAppHostParameterKey(key);
    if (requiredKey !== undefined) {
      if (presentParameterKeys.has(requiredKey)) {
        return undefined;
      }
      presentParameterKeys.add(requiredKey);
      if (value.trim() !== "") {
        configuredParameterKeys.add(requiredKey);
      }
    }
  }

  return {
    keys: [...new Set(keys)].sort(compareText),
    presentParameterKeys: REQUIRED_APPHOST_PARAMETER_KEYS.filter((key) => presentParameterKeys.has(key)),
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
      solutionInspection,
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

    let userSecretFacts: UserSecretFacts = {keys: [], presentParameterKeys: [], configuredParameterKeys: []};
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

    const trackedParameters = new Set(appHostFiles.value.configuredParameterKeys);
    const presentSecretParameters = new Set(userSecretFacts.presentParameterKeys);
    const configuredSecretParameters = new Set(userSecretFacts.configuredParameterKeys);
    const missingParameterKeys = REQUIRED_APPHOST_PARAMETER_KEYS.filter((key) =>
      presentSecretParameters.has(key) ? !configuredSecretParameters.has(key) : !trackedParameters.has(key),
    );
    const value: DotnetFacts = {
      executable: {available: true, resolvedPaths},
      selectedVersion,
      sdks,
      host,
      workloads,
      nugetCachePath,
      solutionIssues: solutionInspection.issues,
      solutionRestoreIssues: solutionInspection.restoreIssues,
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
