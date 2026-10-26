/**
 * @fileoverview Strict manifest-derived runtime and package requirements.
 * @module scripts/common/requirements
 */

import {resolve} from "node:path";

import {Effect} from "effect";

import {ReadOnlyFiles} from "../platform/Files.ts";
import type {RepositoryPaths} from "./repository-paths.ts";

const EXACT_PACKAGE_VERSION =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

/** A normalized minimum version, optionally excluding intervening runtime major branches. */
export interface MinimumVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  /** When present, intervening majors are unsupported before this next runtime branch. */
  readonly nextSupportedMajor?: number;
}

/** One exact root package requirement. */
export interface PackageRequirement {
  readonly name: string;
  readonly version: string;
}

/** Runtime and package requirements derived from live repository manifests. */
export interface RepositoryRequirements {
  readonly node: MinimumVersion;
  readonly npm: MinimumVersion;
  readonly dotnet: MinimumVersion;
  readonly python: MinimumVersion;
  readonly packages: ReadonlyMap<string, PackageRequirement>;
}

/** Result of loading and validating all repository requirement sources. */
export type RequirementLoadResult =
  | {readonly status: "valid"; readonly requirements: RepositoryRequirements}
  | {readonly status: "invalid"; readonly errors: readonly string[]};

type UnknownRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Reads one requirement source, recording a read failure instead of failing.
 *
 * @param path - Source file to read.
 * @param errors - Collected validation errors; a read failure appends one entry.
 * @returns The file contents, or `null` when the read failed.
 */
function readRequiredFile(path: string, errors: string[]): Effect.Effect<string | null, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const files = yield* ReadOnlyFiles;
    return yield* files.readFileString(path).pipe(
      Effect.catch((error) =>
        Effect.sync(() => {
          errors.push(`Unable to read ${path}: Failed to readText '${path}': ${error.message}`);
          return null;
        }),
      ),
    );
  });
}

function parseJsonObject(contents: string, path: string, errors: string[]): UnknownRecord | null {
  try {
    const parsed: unknown = JSON.parse(contents);
    if (!isRecord(parsed)) {
      errors.push(`${path} must contain a JSON object`);
      return null;
    }
    return parsed;
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    errors.push(`Unable to parse ${path}: ${detail}`);
    return null;
  }
}

function parseBareMajor(value: string, source: string, errors: string[]): MinimumVersion | null {
  const match = /^(0|[1-9]\d*)$/.exec(value.trim());
  if (match === null) {
    errors.push(`${source} must use a bare major version such as 24`);
    return null;
  }
  return {major: Number(match[1]), minor: 0, patch: 0};
}

function parseMinimumVersion(value: unknown, source: string, errors: string[]): MinimumVersion | null {
  if (typeof value !== "string") {
    errors.push(`${source} must be a string using syntax such as >=24`);
    return null;
  }
  const version = value.trim().startsWith(">=") ? parseVersion(value.trim().slice(2)) : null;
  if (version === null) {
    errors.push(`${source} uses unsupported syntax; expected a minimum version such as >=24 or >=24.15.0`);
    return null;
  }
  return version;
}

/**
 * Parses a minimum Node version or an LTS caret branch followed by a future major minimum.
 *
 * @param value - Manifest engine constraint.
 * @returns The normalized requirement, or `null` for unsupported syntax.
 */
export function parseNodeRequirement(value: string): MinimumVersion | null {
  const trimmed = value.trim();
  if (trimmed.startsWith(">=")) return parseVersion(trimmed.slice(2));
  const match = /^\^(\d+\.\d+\.\d+)\s*\|\|\s*>=(0|[1-9]\d*)\.0\.0$/u.exec(trimmed);
  if (match === null) return null;
  const minimum = parseVersion(match[1] ?? "");
  const nextSupportedMajor = Number(match[2]);
  if (minimum === null || !Number.isSafeInteger(nextSupportedMajor) || nextSupportedMajor <= minimum.major) return null;
  return {...minimum, nextSupportedMajor};
}

/**
 * Formats a normalized requirement without hiding unsupported intervening runtime majors.
 *
 * @param requirement - Normalized runtime requirement.
 * @returns Its supported engine constraint.
 */
export function formatVersionRequirement(requirement: MinimumVersion): string {
  const minimum = `${requirement.major}.${requirement.minor}.${requirement.patch}`;
  return requirement.nextSupportedMajor === undefined ? `>=${minimum}` : `^${minimum} || >=${requirement.nextSupportedMajor}.0.0`;
}

function readEngine(packageJson: UnknownRecord, engineName: string, errors: string[]): unknown {
  const engines = packageJson["engines"];
  if (!isRecord(engines)) {
    errors.push("package.json#engines must be an object");
    return undefined;
  }
  return engines[engineName];
}

function parseDotnetRequirement(contents: string, errors: string[]): MinimumVersion | null {
  const matches = [...contents.matchAll(/<TargetFramework>\s*([^<]+?)\s*<\/TargetFramework>/g)];
  if (matches.length !== 1) {
    errors.push("Directory.Build.props must contain exactly one TargetFramework");
    return null;
  }
  const value = matches[0]?.[1];
  const match = value === undefined ? null : /^net(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value);
  if (match === null) {
    errors.push("Directory.Build.props#TargetFramework uses unsupported syntax; expected net10.0");
    return null;
  }
  return {major: Number(match[1]), minor: Number(match[2]), patch: 0};
}

function parsePythonRequirement(contents: string, errors: string[]): MinimumVersion | null {
  const matches = [...contents.matchAll(/^\s*requires-python\s*=\s*"([^"]*)"\s*(?:#.*)?$/gm)];
  if (matches.length !== 1) {
    errors.push("pyproject.toml must contain exactly one requires-python field");
    return null;
  }
  const value = matches[0]?.[1];
  const match = value === undefined ? null : /^>=(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value);
  if (match === null) {
    errors.push("pyproject.toml#requires-python uses unsupported syntax; expected >=3.12");
    return null;
  }
  return {major: Number(match[1]), minor: Number(match[2]), patch: 0};
}

function collectDependencyMap(
  manifest: UnknownRecord,
  field: "dependencies" | "devDependencies",
  source: string,
  errors: string[],
): ReadonlyMap<string, string> {
  const value = manifest[field];
  if (value === undefined) {
    return new Map();
  }
  if (!isRecord(value)) {
    errors.push(`${source}#${field} must be an object`);
    return new Map();
  }

  const packages = new Map<string, string>();
  for (const [name, version] of Object.entries(value)) {
    if (typeof version !== "string") {
      errors.push(`${source}#${field}.${name} must be a string`);
      continue;
    }
    packages.set(name, version);
  }
  return packages;
}

function mergeDependencyMaps(
  dependencies: ReadonlyMap<string, string>,
  devDependencies: ReadonlyMap<string, string>,
  source: string,
  errors: string[],
): ReadonlyMap<string, string> {
  const merged = new Map(dependencies);
  for (const [name, version] of devDependencies) {
    const existing = merged.get(name);
    if (existing !== undefined && existing !== version) {
      errors.push(`${source} declares conflicting versions for ${name}`);
      continue;
    }
    merged.set(name, version);
  }
  return merged;
}

function loadPackageRequirements(
  packageJson: UnknownRecord,
  packageLock: UnknownRecord,
  errors: string[],
): ReadonlyMap<string, PackageRequirement> {
  const manifestPackages = mergeDependencyMaps(
    collectDependencyMap(packageJson, "dependencies", "package.json", errors),
    collectDependencyMap(packageJson, "devDependencies", "package.json", errors),
    "package.json",
    errors,
  );

  const lockPackages = packageLock["packages"];
  const lockRoot = isRecord(lockPackages) ? lockPackages[""] : undefined;
  if (!isRecord(lockRoot)) {
    errors.push('package-lock.json#packages[""] must be an object');
    return new Map();
  }

  const lockedPackages = mergeDependencyMaps(
    collectDependencyMap(lockRoot, "dependencies", 'package-lock.json#packages[""]', errors),
    collectDependencyMap(lockRoot, "devDependencies", 'package-lock.json#packages[""]', errors),
    'package-lock.json#packages[""]',
    errors,
  );

  const requirements = new Map<string, PackageRequirement>();
  for (const [name, version] of manifestPackages) {
    if (!EXACT_PACKAGE_VERSION.test(version)) {
      errors.push(`package.json requires an exact version for ${name}; received ${version}`);
      continue;
    }
    const lockedVersion = lockedPackages.get(name);
    if (lockedVersion !== version) {
      errors.push(`package-lock.json version for ${name} must match package.json (${version}); received ${String(lockedVersion)}`);
      continue;
    }
    requirements.set(name, {name, version});
  }
  return requirements;
}

/**
 * Loads repository requirements from their machine-readable sources.
 *
 * @remarks
 * Every source is read concurrently through {@link ReadOnlyFiles}; a read failure becomes a
 * validation error, never a failure of the effect.
 *
 * @param paths - Verified canonical repository paths.
 * @returns Either all normalized requirements or every detected validation error.
 */
export function loadRepositoryRequirements(paths: RepositoryPaths): Effect.Effect<RequirementLoadResult, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const errors: string[] = [];
    const [nvmrc, nodeVersionFile, packageJsonContents, packageLockContents, dotnetContents, pythonContents] = yield* Effect.all(
      [
        readRequiredFile(resolve(paths.root, ".nvmrc"), errors),
        readRequiredFile(resolve(paths.root, ".node-version"), errors),
        readRequiredFile(paths.packageJson, errors),
        readRequiredFile(paths.packageLock, errors),
        readRequiredFile(paths.dotnetBuildProps, errors),
        readRequiredFile(paths.pythonProject, errors),
      ],
      {concurrency: "unbounded"},
    );
    return validateRequirements(paths, errors, {
      nvmrc,
      nodeVersionFile,
      packageJsonContents,
      packageLockContents,
      dotnetContents,
      pythonContents,
    });
  });
}

/** Raw contents of every requirement source; `null` when its read failed. */
interface RequirementSources {
  readonly nvmrc: string | null;
  readonly nodeVersionFile: string | null;
  readonly packageJsonContents: string | null;
  readonly packageLockContents: string | null;
  readonly dotnetContents: string | null;
  readonly pythonContents: string | null;
}

/**
 * Parses and cross-checks the raw requirement sources.
 *
 * @param paths - Verified canonical repository paths.
 * @param errors - Errors collected so far; validation appends to it.
 * @param sources - Raw source contents.
 * @returns Either all normalized requirements or every detected validation error.
 */
function validateRequirements(paths: RepositoryPaths, errors: string[], sources: RequirementSources): RequirementLoadResult {
  const {nvmrc, nodeVersionFile, packageJsonContents, packageLockContents, dotnetContents, pythonContents} = sources;

  const packageJson = packageJsonContents === null ? null : parseJsonObject(packageJsonContents, paths.packageJson, errors);
  const packageLock = packageLockContents === null ? null : parseJsonObject(packageLockContents, paths.packageLock, errors);

  const nvmNode = nvmrc === null ? null : parseBareMajor(nvmrc, ".nvmrc", errors);
  const nodeVersion = nodeVersionFile === null ? null : parseBareMajor(nodeVersionFile, ".node-version", errors);
  const nodeEngine = packageJson === null ? undefined : readEngine(packageJson, "node", errors);
  const engineNode = typeof nodeEngine === "string" ? parseNodeRequirement(nodeEngine) : null;
  if (packageJson !== null && engineNode === null) {
    errors.push("package.json#engines.node uses unsupported syntax; expected >=24.15.0 or ^24.15.0 || >=26.0.0");
  }
  const npm = packageJson === null ? null : parseMinimumVersion(readEngine(packageJson, "npm", errors), "package.json#engines.npm", errors);
  const dotnet = dotnetContents === null ? null : parseDotnetRequirement(dotnetContents, errors);
  const python = pythonContents === null ? null : parsePythonRequirement(pythonContents, errors);
  const packages =
    packageJson === null || packageLock === null
      ? new Map<string, PackageRequirement>()
      : loadPackageRequirements(packageJson, packageLock, errors);

  if (nvmNode !== null && engineNode !== null && nvmNode.major !== engineNode.major) {
    errors.push(".nvmrc disagrees with package.json#engines.node");
  }
  if (nodeVersion !== null && engineNode !== null && nodeVersion.major !== engineNode.major) {
    errors.push(".node-version disagrees with package.json#engines.node");
  }

  if (
    errors.length > 0
    || nvmNode === null
    || nodeVersion === null
    || engineNode === null
    || npm === null
    || dotnet === null
    || python === null
  ) {
    return {status: "invalid", errors};
  }

  return {
    status: "valid",
    requirements: {
      node: engineNode,
      npm,
      dotnet,
      python,
      packages,
    },
  };
}

/**
 * Parses a one-to-three component numeric version, with an optional Node-style `v` prefix.
 *
 * @param value - Version text to parse.
 * @returns A normalized version, or `null` for unsupported syntax.
 */
export function parseVersion(value: string): MinimumVersion | null {
  const match = /^v?(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?(?:\.(0|[1-9]\d*))?$/.exec(value.trim());
  if (match === null) {
    return null;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2] ?? 0),
    patch: Number(match[3] ?? 0),
  };
}

/**
 * Determines whether an actual version satisfies the minimum and supported runtime branches.
 *
 * @param actual - Installed version.
 * @param required - Required minimum version.
 * @returns Whether the actual version is admitted by the requirement.
 */
export function satisfiesMinimum(actual: MinimumVersion, required: MinimumVersion): boolean {
  if (required.nextSupportedMajor !== undefined && actual.major > required.major && actual.major < required.nextSupportedMajor) {
    return false;
  }
  if (actual.major !== required.major) {
    return actual.major > required.major;
  }
  if (actual.minor !== required.minor) {
    return actual.minor > required.minor;
  }
  return actual.patch >= required.patch;
}

/**
 * Checks that every version admitted by one runtime requirement satisfies another.
 *
 * @param candidate - Runtime requirement supplied by the root workspace.
 * @param required - Runtime requirement demanded by a consumer.
 * @returns Whether the candidate's supported branches are contained in the required branches.
 */
export function requirementSatisfies(candidate: MinimumVersion, required: MinimumVersion): boolean {
  if (!satisfiesMinimum(candidate, required)) return false;
  return (
    required.nextSupportedMajor === undefined
    || candidate.major >= required.nextSupportedMajor
    || (candidate.nextSupportedMajor ?? candidate.major + 1) >= required.nextSupportedMajor
  );
}
