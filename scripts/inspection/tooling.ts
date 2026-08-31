/**
 * @fileoverview Pure, deterministic projection of an untrusted serialized `envinfo` JSON document
 * into a small, repository-owned tooling fact model.
 * @module scripts/inspection/tooling
 *
 * @remarks
 * This module never imports or invokes `envinfo`; collection and worker isolation are owned
 * elsewhere. It receives the already-serialized JSON string, treats it as untrusted, and projects
 * only safe tool and package identity facts. Executable paths, unknown fields, control-character or
 * absolute-path-shaped version candidates, and the original source string are never allowed to
 * survive into the returned {@link ToolingFacts}, and are never echoed in a thrown error.
 */

/** One projected generic tool identity fact. */
export interface ToolFact {
  /** Top-level `envinfo` category the tool was reported under. */
  readonly category: string;
  /** Tool name (the category entry key). */
  readonly name: string;
  /** Whether the tool was present (not a canonical not-found marker). */
  readonly found: boolean;
  /** Safe version string, when a control-character-free, non-path candidate was available. */
  readonly version?: string;
}

/** One projected installed-package fact. */
export interface PackageFact {
  /** Whether the package came from local `npmPackages` or global `npmGlobalPackages`. */
  readonly scope: "local" | "global";
  /** Package name (the record key). */
  readonly name: string;
  /** Installed version, when a safe value was available. */
  readonly installed?: string;
  /** Wanted version range, when a safe value was available. */
  readonly wanted?: string;
}

/** Deterministic, repository-scoped projection of an `envinfo` inventory document. */
export interface ToolingFacts {
  /** Operating-system identity string, when present. */
  readonly os?: string;
  /** CPU identity string, when present. */
  readonly cpu?: string;
  /** Memory summary string, when present. */
  readonly memory?: string;
  /** Shell version string with any path stripped, when present. */
  readonly shell?: string;
  /** Generic tools, sorted by category then name. */
  readonly tools: readonly ToolFact[];
  /** Installed packages, sorted by scope then name. */
  readonly packages: readonly PackageFact[];
}

/** Reports a malformed root document or a recognized-but-invalid entry shape. Never echoes source values. */
class EnvinfoProjectionError extends Error {}

type UnknownRecord = Readonly<Record<string, unknown>>;

/** Top-level `envinfo` categories that are projected specially rather than as generic tools. */
const NON_TOOL_CATEGORIES: ReadonlySet<string> = new Set(["System", "npmPackages", "npmGlobalPackages"]);

/** Canonical `envinfo` not-found sentinels (`determineFound` yields one of these). */
const NOT_FOUND_MARKERS: ReadonlySet<string> = new Set(["Not Found", "N/A"]);

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) {
      return true;
    }
  }
  return false;
}

/** Detects a leading absolute POSIX, Windows-drive, or UNC path shape. */
function isAbsolutePathShaped(value: string): boolean {
  return /^\//.test(value) || /^[A-Za-z]:[\\/]/.test(value) || /^\\\\/.test(value);
}

/**
 * Extracts the version token from a raw candidate, discarding any `version - path` suffix that
 * `envinfo` renders for located binaries and shells.
 *
 * @param raw - Raw candidate string.
 * @returns The trimmed version token preceding the first ` - ` separator.
 */
function extractVersionToken(raw: string): string {
  const separatorIndex = raw.indexOf(" - ");
  const token = separatorIndex >= 0 ? raw.slice(0, separatorIndex) : raw;
  return token.trim();
}

/**
 * Resolves a raw candidate into a safe version token.
 *
 * @param raw - Raw candidate string.
 * @returns The safe version token, or `undefined` when it is empty, a not-found marker, contains a
 * control character, or is shaped like an absolute path.
 */
function toSafeVersion(raw: string): string | undefined {
  const token = extractVersionToken(raw);
  if (token === "" || NOT_FOUND_MARKERS.has(token) || hasControlCharacter(token) || isAbsolutePathShaped(token)) {
    return undefined;
  }
  return token;
}

/**
 * Collects ordered raw version candidates from a tool entry value.
 *
 * @param value - Entry value: a direct string, a record with a string `version`, or an array whose
 * elements may contribute direct strings or record `version` strings.
 * @returns Raw candidate strings in encounter order; `path` and all unknown fields are ignored.
 */
function collectRawCandidates(value: unknown): readonly string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (isRecord(value)) {
    const version = value["version"];
    return typeof version === "string" ? [version] : [];
  }
  if (Array.isArray(value)) {
    const candidates: string[] = [];
    for (const element of value) {
      if (typeof element === "string") {
        candidates.push(element);
      } else if (isRecord(element) && typeof element["version"] === "string") {
        candidates.push(element["version"]);
      }
    }
    return candidates;
  }
  return [];
}

function isNotFoundValue(value: unknown): boolean {
  return typeof value === "string" && NOT_FOUND_MARKERS.has(value.trim());
}

/**
 * Resolves the first safe version across a value's ordered candidates.
 *
 * @param value - Tool entry value.
 * @returns The first safe version token, or `undefined` when none qualifies.
 */
function resolveSafeVersion(value: unknown): string | undefined {
  for (const candidate of collectRawCandidates(value)) {
    const safe = toSafeVersion(candidate);
    if (safe !== undefined) {
      return safe;
    }
  }
  return undefined;
}

/**
 * Projects the optional `System` identity block into the matching optional strings.
 *
 * @param system - Raw `System` value.
 * @returns Partial identity facts; missing, non-string, or path-only fields are omitted. The shell
 * path is never projected.
 */
function projectSystem(system: unknown): Pick<ToolingFacts, "os" | "cpu" | "memory" | "shell"> {
  if (!isRecord(system)) {
    return {};
  }
  const identity: {os?: string; cpu?: string; memory?: string; shell?: string} = {};

  const os = system["OS"];
  if (typeof os === "string" && os.trim() !== "") {
    identity.os = os;
  }
  const cpu = system["CPU"];
  if (typeof cpu === "string" && cpu.trim() !== "") {
    identity.cpu = cpu;
  }
  const memory = system["Memory"];
  if (typeof memory === "string" && memory.trim() !== "") {
    identity.memory = memory;
  }

  const shell = system["Shell"];
  const shellVersion = resolveSafeVersion(shell);
  if (shellVersion !== undefined) {
    identity.shell = shellVersion;
  }

  return identity;
}

/**
 * Projects every generic (non-`System`, non-package) top-level category into tool facts.
 *
 * @param document - Untrusted root document.
 * @returns Tool facts sorted by category then name.
 */
function projectTools(document: UnknownRecord): readonly ToolFact[] {
  const tools: ToolFact[] = [];

  for (const [category, categoryValue] of Object.entries(document)) {
    if (NON_TOOL_CATEGORIES.has(category) || !isRecord(categoryValue)) {
      continue;
    }
    for (const [name, entryValue] of Object.entries(categoryValue)) {
      if (isNotFoundValue(entryValue)) {
        tools.push({category, name, found: false});
        continue;
      }
      const version = resolveSafeVersion(entryValue);
      tools.push(version === undefined ? {category, name, found: true} : {category, name, found: true, version});
    }
  }

  return tools.toSorted((left, right) => compareText(left.category, right.category) || compareText(left.name, right.name));
}

/**
 * Resolves an accepted, safe version field from a package value.
 *
 * @param field - Candidate value for an `installed`/`wanted` field or a direct string.
 * @param packageName - Package name, used only to classify a malformed non-string field.
 * @returns The safe version string, or `undefined` when the candidate is absent or unsafe.
 * @throws {@link EnvinfoProjectionError} when the field is present but not a string.
 */
function acceptPackageVersion(field: unknown, packageName: string): string | undefined {
  if (field === undefined) {
    return undefined;
  }
  if (typeof field !== "string") {
    throw new EnvinfoProjectionError(`Package '${packageName}' has a non-string version field.`);
  }
  return toSafeVersion(field);
}

/**
 * Projects one package category into package facts.
 *
 * @param raw - Raw category value (`npmPackages` or `npmGlobalPackages`).
 * @param scope - Package scope classification.
 * @returns Package facts for the category (unsorted).
 * @throws {@link EnvinfoProjectionError} when the category is present but not an object, or a present
 * record provides no accepted version field.
 */
function projectPackages(raw: unknown, scope: PackageFact["scope"]): readonly PackageFact[] {
  if (raw === undefined) {
    return [];
  }
  if (!isRecord(raw)) {
    throw new EnvinfoProjectionError(`The '${scope}' package category must be an object.`);
  }

  const facts: PackageFact[] = [];
  for (const [name, value] of Object.entries(raw)) {
    let installed: string | undefined;
    let wanted: string | undefined;

    if (typeof value === "string") {
      installed = toSafeVersion(value);
    } else if (isRecord(value)) {
      installed = acceptPackageVersion(value["installed"], name);
      wanted = acceptPackageVersion(value["wanted"], name);
    } else {
      throw new EnvinfoProjectionError(`Package '${name}' has an unrecognized shape.`);
    }

    if (installed === undefined && wanted === undefined) {
      throw new EnvinfoProjectionError(`Package '${name}' provides no accepted version field.`);
    }

    facts.push({
      scope,
      name,
      ...(installed === undefined ? {} : {installed}),
      ...(wanted === undefined ? {} : {wanted}),
    });
  }

  return facts;
}

/**
 * Projects an untrusted serialized `envinfo` JSON document into deterministic {@link ToolingFacts}.
 *
 * @param serialized - The raw JSON string emitted by the aggregate inspection worker.
 * @returns Deterministic, redacted tooling facts.
 * @throws {@link EnvinfoProjectionError} when the string is not valid JSON, the root is not a single
 * object, a recognized package category is malformed, or a package record provides no accepted
 * version field. The error never contains the source object or string.
 */
export function parseEnvinfoJson(serialized: string): ToolingFacts {
  let document: unknown;
  try {
    document = JSON.parse(serialized);
  } catch {
    throw new EnvinfoProjectionError("The envinfo output was not valid JSON.");
  }
  if (!isRecord(document)) {
    throw new EnvinfoProjectionError("The envinfo document must be a single JSON object.");
  }

  const identity = projectSystem(document["System"]);
  const packages = [
    ...projectPackages(document["npmPackages"], "local"),
    ...projectPackages(document["npmGlobalPackages"], "global"),
  ].toSorted((left, right) => compareText(left.scope, right.scope) || compareText(left.name, right.name));

  return {
    ...identity,
    tools: projectTools(document),
    packages,
  };
}
