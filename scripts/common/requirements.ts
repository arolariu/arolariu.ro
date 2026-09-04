/**
 * @fileoverview Strict manifest-derived runtime and package requirements.
 * @module scripts/common/requirements
 */

import {resolve} from "node:path";
import type {RepositoryPaths} from "./repository-paths.ts";
import type {ReadOnlyFileSystem} from "../core/runtime/runtime-capability.ts";
import type {TaskScheduler} from "../core/runtime/task-scheduler.ts";

const EXACT_PACKAGE_VERSION =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

/** A normalized three-component minimum version. */
export interface MinimumVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
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

async function readRequiredFile(path: string, files: ReadOnlyFileSystem, errors: string[]): Promise<string | null> {
  try {
    return await files.readText(path);
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    errors.push(`Unable to read ${path}: ${detail}`);
    return null;
  }
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

function parseMinimumMajor(value: unknown, source: string, errors: string[]): MinimumVersion | null {
  if (typeof value !== "string") {
    errors.push(`${source} must be a string using syntax such as >=24`);
    return null;
  }
  const match = /^>=(0|[1-9]\d*)$/.exec(value.trim());
  if (match === null) {
    errors.push(`${source} uses unsupported syntax; expected a minimum major such as >=24`);
    return null;
  }
  return {major: Number(match[1]), minor: 0, patch: 0};
}

function equalVersions(left: MinimumVersion, right: MinimumVersion): boolean {
  return left.major === right.major && left.minor === right.minor && left.patch === right.patch;
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
 * @param paths - Verified canonical repository paths.
 * @param dependencies - Filesystem capability used to read manifest sources, and the task
 * scheduler used to read every source concurrently.
 * @returns Either all normalized requirements or every detected validation error.
 */
export async function loadRepositoryRequirements(
  paths: RepositoryPaths,
  dependencies: Readonly<{files: ReadOnlyFileSystem; tasks: TaskScheduler}>,
): Promise<RequirementLoadResult> {
  const errors: string[] = [];
  const {files, tasks} = dependencies;
  const requiredFileResults = await tasks.parallel([
    () => readRequiredFile(resolve(paths.root, ".nvmrc"), files, errors),
    () => readRequiredFile(resolve(paths.root, ".node-version"), files, errors),
    () => readRequiredFile(paths.packageJson, files, errors),
    () => readRequiredFile(paths.packageLock, files, errors),
    () => readRequiredFile(paths.dotnetBuildProps, files, errors),
    () => readRequiredFile(paths.pythonProject, files, errors),
  ]);
  // `tasks.parallel` returns a plain `readonly T[]` (not a tuple), so destructuring under
  // `noUncheckedIndexedAccess` would widen each element to `string | null | undefined`; indexing
  // with an explicit `?? null` fold keeps every call below exactly as strict as before.
  const nvmrc = requiredFileResults[0] ?? null;
  const nodeVersionFile = requiredFileResults[1] ?? null;
  const packageJsonContents = requiredFileResults[2] ?? null;
  const packageLockContents = requiredFileResults[3] ?? null;
  const dotnetContents = requiredFileResults[4] ?? null;
  const pythonContents = requiredFileResults[5] ?? null;

  const packageJson = packageJsonContents === null ? null : parseJsonObject(packageJsonContents, paths.packageJson, errors);
  const packageLock = packageLockContents === null ? null : parseJsonObject(packageLockContents, paths.packageLock, errors);

  const nvmNode = nvmrc === null ? null : parseBareMajor(nvmrc, ".nvmrc", errors);
  const nodeVersion = nodeVersionFile === null ? null : parseBareMajor(nodeVersionFile, ".node-version", errors);
  const engineNode =
    packageJson === null ? null : parseMinimumMajor(readEngine(packageJson, "node", errors), "package.json#engines.node", errors);
  const npm = packageJson === null ? null : parseMinimumMajor(readEngine(packageJson, "npm", errors), "package.json#engines.npm", errors);
  const dotnet = dotnetContents === null ? null : parseDotnetRequirement(dotnetContents, errors);
  const python = pythonContents === null ? null : parsePythonRequirement(pythonContents, errors);
  const packages =
    packageJson === null || packageLock === null
      ? new Map<string, PackageRequirement>()
      : loadPackageRequirements(packageJson, packageLock, errors);

  if (nvmNode !== null && engineNode !== null && !equalVersions(nvmNode, engineNode)) {
    errors.push(".nvmrc disagrees with package.json#engines.node");
  }
  if (nodeVersion !== null && engineNode !== null && !equalVersions(nodeVersion, engineNode)) {
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
 * Determines whether an actual version meets a required minimum.
 *
 * @param actual - Installed version.
 * @param required - Required minimum version.
 * @returns Whether the actual version is greater than or equal to the minimum.
 */
export function satisfiesMinimum(actual: MinimumVersion, required: MinimumVersion): boolean {
  if (actual.major !== required.major) {
    return actual.major > required.major;
  }
  if (actual.minor !== required.minor) {
    return actual.minor > required.minor;
  }
  return actual.patch >= required.patch;
}
