/**
 * @fileoverview Bounded npm-tree and installed-package inspection providers.
 * @module scripts/inspection/packages
 *
 * @remarks
 * Npm command output is treated as untrusted and projected into counts plus at most
 * {@link NPM_PROBLEM_FACT_LIMIT} generated problem facts. Raw stdout, stderr, native errors,
 * absolute paths, and npm summaries/details never cross this module's public boundary.
 */

import {readFile, realpath} from "node:fs/promises";
import {isAbsolute, join, relative, resolve, sep} from "node:path";

import type {InspectionProbeRunner} from "./probes.ts";
import {probes} from "./probes.ts";
import type {InspectionOutcome, InspectionProvider} from "./types.ts";

/** Lock-domain identity for one full npm dependency-tree inspection. */
export type NpmTreeScope = "root" | "github-scripts";

/** One concise, normalized npm dependency problem. */
export interface NpmProblemFact {
  /** Package name parsed from the npm problem, when one safe name is present. */
  readonly name?: string;
  /** Simple npm problem/error code, when one safe code is present. */
  readonly code?: string;
  /** Generated bounded detail that never embeds native npm output. */
  readonly detail: string;
}

/** Bounded facts derived from one lock domain's full npm dependency tree. */
export interface NpmTreeFacts {
  /** Lock domain that produced these facts. */
  readonly scope: NpmTreeScope;
  /** Whether npm exited successfully and reported no dependency problems. */
  readonly valid: boolean;
  /** Number of dependency nodes in the full tree, excluding its synthetic root node. */
  readonly packageCount: number;
  /** Total number of reported/synthesized dependency problems before fact truncation. */
  readonly problemCount: number;
  /** At most {@link NPM_PROBLEM_FACT_LIMIT} concise normalized problem facts. */
  readonly problems: readonly NpmProblemFact[];
}

/** Installed metadata for one explicitly requested package. */
export interface InstalledPackageFact {
  /** Non-empty installed package version. */
  readonly version: string;
  /** Repository-relative linked workspace root, using `/` separators, when applicable. */
  readonly workspaceRoot?: string;
}

/** Deterministic installed metadata for one explicit package-name inventory. */
export interface PackageInventoryFacts {
  /** Requested packages whose manifests were present and valid. */
  readonly installed: Readonly<Record<string, InstalledPackageFact>>;
  /** Requested package names whose present manifests were malformed. */
  readonly malformed: readonly string[];
}

/** Packages consumed by React/Next.js inspection and setup policy. */
export const REACT_INSPECTED_PACKAGE_NAMES = [
  "react",
  "react-dom",
  "next",
  "@clerk/nextjs",
  "@docusaurus/core",
  "@playwright/test",
  "playwright",
  "@arolariu/components",
] as const;

/** Packages consumed by both standalone SvelteKit project inspections. */
export const SVELTE_INSPECTED_PACKAGE_NAMES = [
  "@sveltejs/kit",
  "@sveltejs/vite-plugin-svelte",
  "svelte",
  "svelte-adapter-azure-swa",
  "vite",
  "vitest",
  "typescript",
] as const;

/** Deterministic de-duplicated union used by the shared installed-package provider. */
export const INSPECTED_PACKAGE_NAMES: readonly string[] = [
  ...new Set<string>([...REACT_INSPECTED_PACKAGE_NAMES, ...SVELTE_INSPECTED_PACKAGE_NAMES]),
];

/** Maximum number of normalized npm problem facts retained in an {@link NpmTreeFacts} value. */
export const NPM_PROBLEM_FACT_LIMIT = 50;

type UnknownRecord = Readonly<Record<string, unknown>>;

type PackageResolution =
  | {readonly kind: "installed"; readonly name: string; readonly fact: InstalledPackageFact}
  | {readonly kind: "missing"; readonly name: string}
  | {readonly kind: "malformed"; readonly name: string}
  | {readonly kind: "unavailable"; readonly name: string};

/** Internal marker for malformed npm JSON structures. */
class NpmTreeProjectionError extends Error {}

const PACKAGE_NAME_PATTERN = /^(?:@[A-Za-z0-9][A-Za-z0-9._-]*\/)?[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const PACKAGE_SPEC_PATTERN =
  /(?:^|[\s:,])((?:@[A-Za-z0-9][A-Za-z0-9._-]*\/)?[A-Za-z0-9][A-Za-z0-9._-]*)@[^\s,]+/u;
const NPM_CODE_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/u;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;
const MAX_PACKAGE_NAME_LENGTH = 214;
const MAX_PACKAGE_VERSION_LENGTH = 256;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function elapsedMilliseconds(startedAt: number, now: () => number): number {
  const elapsed = now() - startedAt;
  return Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
}

function isSafePackageName(value: string): boolean {
  return value.length <= MAX_PACKAGE_NAME_LENGTH && PACKAGE_NAME_PATTERN.test(value);
}

function normalizeNpmCode(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed !== undefined && NPM_CODE_PATTERN.test(trimmed) ? trimmed : undefined;
}

function extractProblemCode(problem: string): string | undefined {
  const separatorIndex = problem.indexOf(":");
  return separatorIndex < 0 ? undefined : normalizeNpmCode(problem.slice(0, separatorIndex));
}

function extractProblemPackageName(problem: string): string | undefined {
  const candidate = PACKAGE_SPEC_PATTERN.exec(problem)?.[1];
  return candidate !== undefined && isSafePackageName(candidate) ? candidate : undefined;
}

function generatedProblemDetail(code: string | undefined, name: string | undefined): string {
  if (code !== undefined && name !== undefined) {
    return `npm reported ${code} for '${name}'.`;
  }
  if (code !== undefined) {
    return `npm reported ${code}.`;
  }
  if (name !== undefined) {
    return `npm reported a dependency problem for '${name}'.`;
  }
  return "npm reported a dependency problem.";
}

function normalizeNpmProblem(problem: string): NpmProblemFact {
  const code = extractProblemCode(problem);
  const name = extractProblemPackageName(problem);
  return {
    ...(name === undefined ? {} : {name}),
    ...(code === undefined ? {} : {code}),
    detail: generatedProblemDetail(code, name),
  };
}

function normalizeNpmError(value: unknown): NpmProblemFact | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new NpmTreeProjectionError("Malformed npm error data.");
  }

  const rawCode = value["code"];
  if (rawCode !== undefined && typeof rawCode !== "string") {
    throw new NpmTreeProjectionError("Malformed npm error code.");
  }
  const code = normalizeNpmCode(rawCode);
  return {
    ...(code === undefined ? {} : {code}),
    detail: code === undefined ? "npm reported an error." : `npm reported ${code}.`,
  };
}

function countDependencyNodes(root: UnknownRecord): number {
  const pending: UnknownRecord[] = [root];
  let count = 0;

  while (pending.length > 0) {
    const current = pending.pop()!;
    const dependencies = current["dependencies"];
    if (dependencies === undefined) {
      continue;
    }
    if (!isRecord(dependencies)) {
      throw new NpmTreeProjectionError("Malformed npm dependency data.");
    }

    for (const dependency of Object.values(dependencies)) {
      if (!isRecord(dependency)) {
        throw new NpmTreeProjectionError("Malformed npm dependency node.");
      }
      if (count === Number.MAX_SAFE_INTEGER) {
        throw new NpmTreeProjectionError("Npm dependency tree exceeds the supported size.");
      }
      count += 1;
      pending.push(dependency);
    }
  }

  return count;
}

function projectNpmTree(document: unknown, scope: NpmTreeScope, exitCode: number): NpmTreeFacts {
  if (!isRecord(document)) {
    throw new NpmTreeProjectionError("Npm tree document must be an object.");
  }

  const rawProblems = document["problems"];
  if (rawProblems !== undefined && !Array.isArray(rawProblems)) {
    throw new NpmTreeProjectionError("Malformed npm problem data.");
  }

  const normalizedProblems: NpmProblemFact[] = [];
  let problemCount = 0;
  for (const problem of rawProblems ?? []) {
    if (typeof problem !== "string") {
      throw new NpmTreeProjectionError("Malformed npm problem entry.");
    }
    problemCount += 1;
    if (normalizedProblems.length < NPM_PROBLEM_FACT_LIMIT) {
      normalizedProblems.push(normalizeNpmProblem(problem));
    }
  }

  const npmError = normalizeNpmError(document["error"]);
  if (npmError !== undefined && problemCount === 0) {
    problemCount += 1;
    if (normalizedProblems.length < NPM_PROBLEM_FACT_LIMIT) {
      normalizedProblems.push(npmError);
    }
  }

  if (exitCode !== 0 && problemCount === 0) {
    problemCount = 1;
    normalizedProblems.push({code: "npm-exit", detail: "npm dependency inspection exited unsuccessfully."});
  }

  return {
    scope,
    valid: exitCode === 0 && problemCount === 0,
    packageCount: countDependencyNodes(document),
    problemCount,
    problems: normalizedProblems,
  };
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

function normalizeWorkspaceRoot(repositoryRoot: string, packageRoot: string): string | undefined {
  const relativeRoot = relative(repositoryRoot, packageRoot);
  if (relativeRoot === ".." || relativeRoot.startsWith(`..${sep}`) || isAbsolute(relativeRoot)) {
    return undefined;
  }

  const normalized = relativeRoot.split(sep).join("/");
  if (normalized === "node_modules" || normalized.startsWith("node_modules/")) {
    return undefined;
  }
  return normalized === "" ? "." : normalized;
}

async function resolveInstalledPackage(
  repositoryRoot: string,
  canonicalRepositoryRoot: string,
  packageName: string,
): Promise<PackageResolution> {
  const packageRoot = join(repositoryRoot, "node_modules", ...packageName.split("/"));
  let source: string;
  try {
    source = await readFile(join(packageRoot, "package.json"), "utf8");
  } catch (error: unknown) {
    return hasErrorCode(error, "ENOENT")
      ? {kind: "missing", name: packageName}
      : {kind: "unavailable", name: packageName};
  }

  let manifest: unknown;
  try {
    manifest = JSON.parse(source);
  } catch {
    return {kind: "malformed", name: packageName};
  }

  if (!isRecord(manifest) || manifest["name"] !== packageName) {
    return {kind: "malformed", name: packageName};
  }

  const version = manifest["version"];
  if (
    typeof version !== "string"
    || version.trim() === ""
    || version.length > MAX_PACKAGE_VERSION_LENGTH
    || CONTROL_CHARACTER_PATTERN.test(version)
  ) {
    return {kind: "malformed", name: packageName};
  }

  let canonicalPackageRoot: string;
  try {
    canonicalPackageRoot = await realpath(packageRoot);
  } catch {
    return {kind: "unavailable", name: packageName};
  }

  const workspaceRoot = normalizeWorkspaceRoot(canonicalRepositoryRoot, canonicalPackageRoot);
  return {
    kind: "installed",
    name: packageName,
    fact: {
      version: version.trim(),
      ...(workspaceRoot === undefined ? {} : {workspaceRoot}),
    },
  };
}

/**
 * Creates a provider for one lock domain's full npm dependency tree.
 *
 * @param input - Scope, lock-domain root, opaque probe runner, and monotonic time source.
 * @returns A provider that emits bounded dependency-tree facts or an explicit unavailable/invalid outcome.
 */
export function createNpmTreeProvider(input: Readonly<{
  scope: NpmTreeScope;
  root: string;
  probes: InspectionProbeRunner;
  now: () => number;
}>): InspectionProvider<NpmTreeFacts> {
  return async (): Promise<InspectionOutcome<NpmTreeFacts>> => {
    const startedAt = input.now();
    const result = await input.probes.run(probes.workspace.npmTree(), {cwd: resolve(input.root)});

    if (result.spawnError !== undefined) {
      return {
        kind: "unavailable",
        reason: "npm dependency inspection could not be started.",
        durationMs: elapsedMilliseconds(startedAt, input.now),
      };
    }
    if (result.timedOut) {
      return {
        kind: "unavailable",
        reason: "npm dependency inspection timed out.",
        durationMs: elapsedMilliseconds(startedAt, input.now),
      };
    }
    if (result.signal !== undefined) {
      return {
        kind: "unavailable",
        reason: "npm dependency inspection was interrupted.",
        durationMs: elapsedMilliseconds(startedAt, input.now),
      };
    }

    let document: unknown;
    try {
      document = JSON.parse(result.stdout.trim());
    } catch {
      return {
        kind: "invalid",
        issues: ["npm dependency inspection did not produce one valid JSON document."],
        durationMs: elapsedMilliseconds(startedAt, input.now),
      };
    }

    try {
      const value = projectNpmTree(document, input.scope, result.code);
      return {kind: "available", value, durationMs: elapsedMilliseconds(startedAt, input.now)};
    } catch {
      return {
        kind: "invalid",
        issues: ["npm dependency inspection produced malformed tree data."],
        durationMs: elapsedMilliseconds(startedAt, input.now),
      };
    }
  };
}

/**
 * Creates a provider that reads only explicitly requested package manifests from root `node_modules`.
 *
 * @param input - Repository root, requested package names, and monotonic time source.
 * @returns A provider for deterministic installed-package metadata.
 */
export function createInstalledPackageProvider(input: Readonly<{
  root: string;
  packageNames: readonly string[];
  now: () => number;
}>): InspectionProvider<PackageInventoryFacts> {
  return async (): Promise<InspectionOutcome<PackageInventoryFacts>> => {
    const startedAt = input.now();
    const packageNames = [...new Set(input.packageNames)].sort(compareText);
    if (packageNames.some((name) => !isSafePackageName(name))) {
      return {
        kind: "invalid",
        issues: ["Installed package inventory contains an invalid requested package name."],
        durationMs: elapsedMilliseconds(startedAt, input.now),
      };
    }

    const repositoryRoot = resolve(input.root);
    let canonicalRepositoryRoot: string;
    try {
      canonicalRepositoryRoot = await realpath(repositoryRoot);
    } catch {
      return {
        kind: "unavailable",
        reason: "The repository root could not be inspected for installed package metadata.",
        durationMs: elapsedMilliseconds(startedAt, input.now),
      };
    }

    const resolutions = await Promise.all(
      packageNames.map(async (packageName) =>
        resolveInstalledPackage(repositoryRoot, canonicalRepositoryRoot, packageName),
      ),
    );
    const unavailable = resolutions.filter((resolution) => resolution.kind === "unavailable");
    if (unavailable.length > 0) {
      return {
        kind: "unavailable",
        reason: "One or more requested installed package manifests could not be inspected.",
        durationMs: elapsedMilliseconds(startedAt, input.now),
      };
    }

    const malformed = resolutions
      .filter((resolution) => resolution.kind === "malformed")
      .map(({name}) => name)
      .sort(compareText);
    if (malformed.length > 0) {
      return {
        kind: "invalid",
        issues: malformed.map((name) => `Installed package metadata is malformed for '${name}'.`),
        durationMs: elapsedMilliseconds(startedAt, input.now),
      };
    }

    const installed = Object.fromEntries(
      resolutions
        .filter((resolution): resolution is Extract<PackageResolution, {readonly kind: "installed"}> =>
          resolution.kind === "installed",
        )
        .map(({name, fact}) => [name, fact] as const),
    );

    return {
      kind: "available",
      value: {installed, malformed: []},
      durationMs: elapsedMilliseconds(startedAt, input.now),
    };
  };
}
