/**
 * @fileoverview Source-derived, strictly read-only Nx workspace project graph.
 * @module scripts/common/workspace-graph
 *
 * @remarks
 * Nx 23.1.1 constructs its project graph through a native workspace database
 * that is always opened — and rewritten — under `NX_WORKSPACE_DATA_DIRECTORY`,
 * so no Nx CLI invocation can satisfy the repository's strict read-only
 * diagnostic contract. This module reproduces the same workspace shape from
 * tracked metadata only: `nx.json`'s declared workspace layout, the
 * `project.json` files discovered beneath it, and the optional workspace
 * `package.json` manifests beside them.
 *
 * It uses Node built-ins exclusively, never spawns a process, never writes, and
 * never creates a temporary or redirected cache directory. Malformed or
 * ambiguous metadata always throws a {@link WorkspaceGraphError} so callers can
 * report an explicit failure instead of a fabricated empty graph.
 */

import {readdir, readFile, stat} from "node:fs/promises";
import {isAbsolute, join, normalize, relative, resolve} from "node:path";

/** Independent metadata category one dependency record was derived from. */
export type WorkspaceDependencyOrigin = "package" | "target" | "implicit";

/** One discovered workspace project. */
export interface WorkspaceProject {
  /** Canonical `project.json` name. */
  readonly name: string;
  /** Repository-relative project root, using POSIX separators. */
  readonly root: string;
  /** Declared source root, or `null` when the project declares none. */
  readonly sourceRoot: string | null;
  /** Workspace `package.json` name, or `null` when the project has no manifest name. */
  readonly packageName: string | null;
  /** Declared Nx project type, or `null` when the project declares none. */
  readonly projectType: string | null;
  /** Declared Nx tags, in declaration order. */
  readonly tags: readonly string[];
}

/** One internal project-to-project dependency record. */
export interface WorkspaceDependency {
  /** Canonical name of the depending project. */
  readonly source: string;
  /** Canonical name of the depended-upon project. */
  readonly target: string;
  /** Independent metadata category this record was derived from. */
  readonly origin: WorkspaceDependencyOrigin;
  /** Human-readable evidence describing where the declaration was read. */
  readonly declaration: string;
}

/** Deterministic workspace project graph. */
export interface WorkspaceGraph {
  /** Projects sorted by canonical name. */
  readonly projects: readonly WorkspaceProject[];
  /** Dependency records sorted by source, target, then origin. */
  readonly dependencies: readonly WorkspaceDependency[];
  /** Sorted `a -> b -> a` cycle evidence over unique logical edges. */
  readonly cycles: readonly string[];
}

/** Raw, already-parsed metadata for one discovered project directory. */
export interface WorkspaceProjectSource {
  /** Repository-relative project root, using POSIX separators. */
  readonly root: string;
  /** Parsed `project.json` document. */
  readonly projectConfiguration: unknown;
  /** Parsed workspace `package.json` document, when the project has one. */
  readonly packageManifest?: unknown;
}

/** Reports missing, malformed, ambiguous, or unresolvable workspace metadata. */
export class WorkspaceGraphError extends Error {
  /**
   * Creates a normalized workspace-metadata error.
   *
   * @param message - Human-readable metadata detail.
   */
  public constructor(message: string) {
    super(message);
    this.name = "WorkspaceGraphError";
  }
}

const PROJECT_CONFIGURATION_FILE = "project.json";
const PACKAGE_MANIFEST_FILE = "package.json";
const NX_CONFIGURATION_FILE = "nx.json";
const DEFAULT_APPS_DIR = "apps";
const DEFAULT_LIBS_DIR = "libs";

const PACKAGE_DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

const ORIGIN_ORDER: readonly WorkspaceDependencyOrigin[] = ["package", "target", "implicit"];

/**
 * Visible directory names that never contain tracked project metadata.
 * Dot-prefixed directories (`.next`, `.svelte-kit`, `.venv`, `.git`, ...) are
 * skipped by a separate rule.
 */
const SKIPPED_DIRECTORY_NAMES: ReadonlySet<string> = new Set([
  "bin",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "obj",
  "out",
  "TestResults",
  "venv",
  "__pycache__",
]);

type UnknownRecord = Readonly<Record<string, unknown>>;

interface NormalizedProject {
  readonly project: WorkspaceProject;
  readonly targets: ReadonlyMap<string, readonly unknown[]>;
  readonly targetNames: ReadonlySet<string>;
  readonly implicitDependencies: readonly string[];
  readonly packageDependencies: readonly Readonly<{field: string; name: string}>[];
}

interface DependencyDraft {
  readonly source: string;
  readonly target: string;
  readonly origin: WorkspaceDependencyOrigin;
  readonly declaration: string;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function requireRecord(value: unknown, label: string): UnknownRecord {
  if (!isRecord(value)) {
    throw new WorkspaceGraphError(`${label} must be a JSON object.`);
  }
  return value;
}

function optionalString(value: unknown, label: string): string | null {
  if (value === undefined) {
    return null;
  }
  if (!isNonEmptyString(value)) {
    throw new WorkspaceGraphError(`${label} must be a non-empty string when present.`);
  }
  return value.trim();
}

function toPosixPath(value: string): string {
  return value.replaceAll("\\", "/");
}

function lastSegment(value: string): string {
  return value.split("/").at(-1) ?? value;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

// ============================================================================
// Metadata normalization
// ============================================================================

function normalizeTags(value: unknown, label: string): readonly string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || !value.every((tag) => isNonEmptyString(tag))) {
    throw new WorkspaceGraphError(`${label} tags must be an array of non-empty strings.`);
  }
  return (value as readonly string[]).map((tag) => tag.trim());
}

function normalizeTargets(value: unknown, label: string): ReadonlyMap<string, readonly unknown[]> {
  if (value === undefined) {
    return new Map();
  }

  const targets = requireRecord(value, `${label} targets`);
  const normalized = new Map<string, readonly unknown[]>();
  for (const targetName of Object.keys(targets).toSorted()) {
    const target = requireRecord(targets[targetName], `${label} targets['${targetName}']`);
    const dependsOn = target["dependsOn"];
    if (dependsOn === undefined) {
      normalized.set(targetName, []);
      continue;
    }
    if (!Array.isArray(dependsOn)) {
      throw new WorkspaceGraphError(`${label} targets['${targetName}'].dependsOn must be an array.`);
    }
    normalized.set(targetName, dependsOn as readonly unknown[]);
  }

  return normalized;
}

function normalizeImplicitDependencies(value: unknown, label: string): readonly string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || !value.every((entry) => isNonEmptyString(entry))) {
    throw new WorkspaceGraphError(`${label} implicitDependencies must be an array of non-empty strings.`);
  }
  return (value as readonly string[]).map((entry) => entry.trim());
}

function normalizePackageDependencies(
  manifest: UnknownRecord,
  label: string,
): readonly Readonly<{field: string; name: string}>[] {
  const declarations: {field: string; name: string}[] = [];
  for (const field of PACKAGE_DEPENDENCY_FIELDS) {
    const value = manifest[field];
    if (value === undefined) {
      continue;
    }
    const entries = requireRecord(value, `${label} ${field}`);
    for (const name of Object.keys(entries).toSorted()) {
      if (typeof entries[name] !== "string") {
        throw new WorkspaceGraphError(`${label} ${field}['${name}'] must be a string version range.`);
      }
      declarations.push({field, name});
    }
  }
  return declarations;
}

function normalizeProject(source: Readonly<WorkspaceProjectSource>): NormalizedProject {
  if (!isNonEmptyString(source.root)) {
    throw new WorkspaceGraphError("Every discovered project must declare a non-empty repository-relative root.");
  }

  const root = toPosixPath(source.root.trim());
  const label = `${root}/${PROJECT_CONFIGURATION_FILE}`;
  const configuration = requireRecord(source.projectConfiguration, label);
  const name = optionalString(configuration["name"], `${label} name`);
  if (name === null) {
    throw new WorkspaceGraphError(`${label} must declare a non-empty project name.`);
  }

  const manifestLabel = `${root}/${PACKAGE_MANIFEST_FILE}`;
  const manifest = source.packageManifest === undefined ? null : requireRecord(source.packageManifest, manifestLabel);
  const targets = normalizeTargets(configuration["targets"], label);

  return {
    project: {
      name,
      root,
      sourceRoot: optionalString(configuration["sourceRoot"], `${label} sourceRoot`),
      packageName: manifest === null ? null : optionalString(manifest["name"], `${manifestLabel} name`),
      projectType: optionalString(configuration["projectType"], `${label} projectType`),
      tags: normalizeTags(configuration["tags"], label),
    },
    targets,
    targetNames: new Set(targets.keys()),
    implicitDependencies: normalizeImplicitDependencies(configuration["implicitDependencies"], label),
    packageDependencies: manifest === null ? [] : normalizePackageDependencies(manifest, manifestLabel),
  };
}

// ============================================================================
// Alias resolution
// ============================================================================

function projectAliases(project: Readonly<WorkspaceProject>): readonly string[] {
  const aliases = new Set<string>([project.name, lastSegment(project.name), lastSegment(project.root)]);
  if (project.packageName !== null) {
    aliases.add(project.packageName);
    aliases.add(lastSegment(project.packageName));
  }
  return [...aliases];
}

function buildAliasIndex(projects: readonly NormalizedProject[]): ReadonlyMap<string, readonly string[]> {
  const index = new Map<string, string[]>();
  for (const {project} of projects) {
    for (const alias of projectAliases(project)) {
      const owners = index.get(alias);
      if (owners === undefined) {
        index.set(alias, [project.name]);
      } else if (!owners.includes(project.name)) {
        owners.push(project.name);
      }
    }
  }
  return index;
}

function assertSupportedAlias(alias: string, context: string): void {
  if (alias.includes("*") || alias.startsWith("!") || alias.startsWith("^") || alias.startsWith("tag:")) {
    throw new WorkspaceGraphError(
      `${context} uses the unsupported project pattern '${alias}'. Only exact project references are supported.`,
    );
  }
}

function resolveAlias(
  alias: string,
  canonicalNames: ReadonlySet<string>,
  aliasIndex: ReadonlyMap<string, readonly string[]>,
  context: string,
): string {
  assertSupportedAlias(alias, context);

  if (canonicalNames.has(alias)) {
    return alias;
  }

  const owners = aliasIndex.get(alias) ?? [];
  const [only] = owners;
  if (only === undefined) {
    throw new WorkspaceGraphError(`${context} references the unknown project '${alias}'.`);
  }
  if (owners.length > 1) {
    throw new WorkspaceGraphError(
      `${context} references the ambiguous project alias '${alias}', which matches ${owners.toSorted().join(", ")}.`,
    );
  }

  return only;
}

// ============================================================================
// Dependency derivation
// ============================================================================

function objectDependsOnAliases(entry: UnknownRecord, context: string): readonly string[] {
  const target = entry["target"];
  if (!isNonEmptyString(target)) {
    throw new WorkspaceGraphError(`${context} must declare a non-empty target name.`);
  }

  const dependencies = entry["dependencies"];
  if (dependencies !== undefined && typeof dependencies !== "boolean") {
    throw new WorkspaceGraphError(`${context} dependencies must be a boolean when present.`);
  }
  if (dependencies === true) {
    return [];
  }

  const projects = entry["projects"];
  if (projects === undefined) {
    return [];
  }

  const requested = typeof projects === "string" ? [projects] : projects;
  if (!Array.isArray(requested) || !requested.every((value) => isNonEmptyString(value))) {
    throw new WorkspaceGraphError(`${context} projects must be a non-empty string or an array of non-empty strings.`);
  }

  return (requested as readonly string[]).map((value) => value.trim()).filter((value) => value !== "self");
}

function targetDependencyDrafts(
  normalized: Readonly<NormalizedProject>,
  canonicalNames: ReadonlySet<string>,
  aliasIndex: ReadonlyMap<string, readonly string[]>,
): readonly DependencyDraft[] {
  const drafts: DependencyDraft[] = [];
  const {project} = normalized;

  for (const [targetName, dependsOn] of normalized.targets) {
    const context = `${project.root}/${PROJECT_CONFIGURATION_FILE} targets['${targetName}'].dependsOn`;

    for (const entry of dependsOn) {
      if (typeof entry === "string") {
        const value = entry.trim();
        if (value === "") {
          throw new WorkspaceGraphError(`${context} must not contain an empty entry.`);
        }
        // `^target` only expands to the current project's own dependencies, and a value that
        // names one of this project's targets (including a colon-bearing target name such as
        // `build:storybook`) is local. Neither declares a new cross-project record.
        if (value.startsWith("^") || normalized.targetNames.has(value) || !value.includes(":")) {
          continue;
        }
        const alias = value.slice(0, value.indexOf(":"));
        const resolved = resolveAlias(alias, canonicalNames, aliasIndex, `${context}['${value}']`);
        if (resolved !== project.name) {
          drafts.push({source: project.name, target: resolved, origin: "target", declaration: `${context}['${value}']`});
        }
        continue;
      }

      if (!isRecord(entry)) {
        throw new WorkspaceGraphError(`${context} entries must be strings or dependsOn objects.`);
      }

      const dependsOnTarget = String(entry["target"]);
      for (const alias of objectDependsOnAliases(entry, context)) {
        const resolved = resolveAlias(alias, canonicalNames, aliasIndex, `${context}['${alias}']`);
        if (resolved !== project.name) {
          drafts.push({
            source: project.name,
            target: resolved,
            origin: "target",
            declaration: `${context}['${alias}:${dependsOnTarget}']`,
          });
        }
      }
    }
  }

  return drafts;
}

function packageDependencyDrafts(
  normalized: Readonly<NormalizedProject>,
  workspaceNames: ReadonlyMap<string, string>,
): readonly DependencyDraft[] {
  const drafts: DependencyDraft[] = [];
  const {project} = normalized;

  for (const {field, name} of normalized.packageDependencies) {
    const resolved = workspaceNames.get(name);
    if (resolved === undefined || resolved === project.name) {
      continue;
    }
    drafts.push({
      source: project.name,
      target: resolved,
      origin: "package",
      declaration: `${project.root}/${PACKAGE_MANIFEST_FILE} ${field}['${name}']`,
    });
  }

  return drafts;
}

function implicitDependencyDrafts(
  normalized: Readonly<NormalizedProject>,
  canonicalNames: ReadonlySet<string>,
  aliasIndex: ReadonlyMap<string, readonly string[]>,
): readonly DependencyDraft[] {
  const drafts: DependencyDraft[] = [];
  const {project} = normalized;
  const context = `${project.root}/${PROJECT_CONFIGURATION_FILE} implicitDependencies`;

  for (const alias of normalized.implicitDependencies) {
    const resolved = resolveAlias(alias, canonicalNames, aliasIndex, `${context}['${alias}']`);
    if (resolved !== project.name) {
      drafts.push({source: project.name, target: resolved, origin: "implicit", declaration: `${context}['${alias}']`});
    }
  }

  return drafts;
}

function findCycles(projects: readonly string[], edges: ReadonlyMap<string, readonly string[]>): readonly string[] {
  const state = new Map<string, "visiting" | "visited">();
  const stack: string[] = [];
  const cycles = new Set<string>();

  const visit = (project: string): void => {
    const currentState = state.get(project);
    if (currentState === "visited") {
      return;
    }
    if (currentState === "visiting") {
      const start = stack.indexOf(project);
      if (start >= 0) {
        cycles.add([...stack.slice(start), project].join(" -> "));
      }
      return;
    }

    state.set(project, "visiting");
    stack.push(project);
    for (const dependency of edges.get(project) ?? []) {
      visit(dependency);
    }
    stack.pop();
    state.set(project, "visited");
  };

  for (const project of projects) {
    visit(project);
  }

  return [...cycles].toSorted();
}

/**
 * Builds a deterministic workspace graph from already-parsed project metadata.
 *
 * @remarks
 * One record is preserved per independent metadata category (a workspace
 * package dependency, an explicit cross-project target dependency, and an exact
 * implicit dependency); repeated declarations inside a single category collapse
 * to one record. Cycle detection runs over the unique logical `source -> target`
 * edges, so multiple source categories never fabricate a cycle.
 *
 * @param sources - Parsed project metadata for every discovered project root.
 * @returns Sorted projects, dependency records, and cycle evidence.
 * @throws WorkspaceGraphError when metadata is malformed, duplicated, ambiguous, or unresolvable.
 */
export function buildWorkspaceGraph(sources: readonly WorkspaceProjectSource[]): WorkspaceGraph {
  const normalized = sources.map((source) => normalizeProject(source));

  const canonicalNames = new Set<string>();
  const roots = new Set<string>();
  for (const {project} of normalized) {
    if (roots.has(project.root)) {
      throw new WorkspaceGraphError(`Duplicate workspace project root '${project.root}'.`);
    }
    roots.add(project.root);
    if (canonicalNames.has(project.name)) {
      throw new WorkspaceGraphError(`Duplicate workspace project name '${project.name}'.`);
    }
    canonicalNames.add(project.name);
  }

  const ordered = normalized.toSorted((left, right) => compareText(left.project.name, right.project.name));
  const aliasIndex = buildAliasIndex(ordered);

  const workspaceNames = new Map<string, string>();
  for (const {project} of ordered) {
    workspaceNames.set(project.name, project.name);
    if (project.packageName !== null) {
      const owner = workspaceNames.get(project.packageName);
      if (owner !== undefined && owner !== project.name) {
        throw new WorkspaceGraphError(`Duplicate workspace package name '${project.packageName}'.`);
      }
      workspaceNames.set(project.packageName, project.name);
    }
  }

  const drafts: DependencyDraft[] = [];
  for (const project of ordered) {
    drafts.push(
      ...packageDependencyDrafts(project, workspaceNames),
      ...targetDependencyDrafts(project, canonicalNames, aliasIndex),
      ...implicitDependencyDrafts(project, canonicalNames, aliasIndex),
    );
  }

  const deduplicated = new Map<string, DependencyDraft>();
  for (const draft of drafts) {
    const key = `${draft.source}\u0000${draft.target}\u0000${draft.origin}`;
    if (!deduplicated.has(key)) {
      deduplicated.set(key, draft);
    }
  }

  const dependencies = [...deduplicated.values()].toSorted(
    (left, right) =>
      compareText(left.source, right.source)
      || compareText(left.target, right.target)
      || ORIGIN_ORDER.indexOf(left.origin) - ORIGIN_ORDER.indexOf(right.origin),
  );

  const logicalEdges = new Map<string, string[]>();
  for (const dependency of dependencies) {
    const targets = logicalEdges.get(dependency.source);
    if (targets === undefined) {
      logicalEdges.set(dependency.source, [dependency.target]);
    } else if (!targets.includes(dependency.target)) {
      targets.push(dependency.target);
    }
  }

  const projects = ordered.map(({project}) => project);
  return {
    projects,
    dependencies,
    cycles: findCycles(
      projects.map(({name}) => name),
      logicalEdges,
    ),
  };
}

/**
 * Lists the unique dependency targets declared by one project.
 *
 * @param graph - Workspace graph to inspect.
 * @param projectName - Canonical project name.
 * @returns Sorted unique target project names, or an empty list for an isolated project.
 */
export function workspaceDependencyTargets(graph: Readonly<WorkspaceGraph>, projectName: string): readonly string[] {
  const targets = new Set<string>();
  for (const dependency of graph.dependencies) {
    if (dependency.source === projectName) {
      targets.add(dependency.target);
    }
  }
  return [...targets].toSorted();
}

// ============================================================================
// Filesystem discovery
// ============================================================================

function workspaceLayoutRoots(nxConfiguration: unknown): readonly string[] {
  const configuration = requireRecord(nxConfiguration, NX_CONFIGURATION_FILE);
  const layoutValue = configuration["workspaceLayout"];
  const layout = layoutValue === undefined ? {} : requireRecord(layoutValue, `${NX_CONFIGURATION_FILE} workspaceLayout`);

  const appsDir = optionalString(layout["appsDir"], `${NX_CONFIGURATION_FILE} workspaceLayout.appsDir`) ?? DEFAULT_APPS_DIR;
  const libsDir = optionalString(layout["libsDir"], `${NX_CONFIGURATION_FILE} workspaceLayout.libsDir`) ?? DEFAULT_LIBS_DIR;

  const layoutRoots: string[] = [];
  for (const declared of [appsDir, libsDir]) {
    const normalized = toPosixPath(normalize(declared)).replace(/\/+$/u, "");
    if (isAbsolute(declared) || normalized === ".." || normalized.startsWith("../") || normalized === "") {
      throw new WorkspaceGraphError(
        `${NX_CONFIGURATION_FILE} workspaceLayout must declare repository-relative directories, but got '${declared}'.`,
      );
    }
    if (!layoutRoots.includes(normalized)) {
      layoutRoots.push(normalized);
    }
  }

  return layoutRoots.toSorted();
}

async function readJsonDocument(path: string, label: string): Promise<unknown> {
  let contents: string;
  try {
    contents = await readFile(path, "utf8");
  } catch (error: unknown) {
    throw new WorkspaceGraphError(`Unable to read ${label}: ${errorMessage(error)}`);
  }

  try {
    return JSON.parse(contents);
  } catch (error: unknown) {
    throw new WorkspaceGraphError(`Unable to parse ${label}: ${errorMessage(error)}`);
  }
}

async function readOptionalJsonDocument(path: string, label: string): Promise<unknown> {
  try {
    await stat(path);
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw new WorkspaceGraphError(`Unable to inspect ${label}: ${errorMessage(error)}`);
  }

  return readJsonDocument(path, label);
}

async function collectProjectRoots(directory: string, repositoryRoot: string, discovered: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(directory, {withFileTypes: true});
  } catch (error: unknown) {
    throw new WorkspaceGraphError(
      `Unable to read workspace directory '${toPosixPath(relative(repositoryRoot, directory))}': ${errorMessage(error)}`,
    );
  }

  if (entries.some((entry) => entry.isFile() && entry.name === PROJECT_CONFIGURATION_FILE)) {
    discovered.push(toPosixPath(relative(repositoryRoot, directory)));
    return;
  }

  for (const entry of entries.toSorted((left, right) => compareText(left.name, right.name))) {
    if (
      entry.isSymbolicLink()
      || !entry.isDirectory()
      || entry.name.startsWith(".")
      || SKIPPED_DIRECTORY_NAMES.has(entry.name)
    ) {
      continue;
    }
    await collectProjectRoots(join(directory, entry.name), repositoryRoot, discovered);
  }
}

/**
 * Reads the workspace project graph from tracked repository metadata.
 *
 * @remarks
 * Discovers `project.json` files beneath the `appsDir`/`libsDir` roots declared
 * by `nx.json`, skipping symbolic links (including Windows junctions),
 * dot-prefixed directories, and known generated/dependency directories.
 * Discovery stops at the first `project.json` on any path, so a project root is
 * never rescanned for nested projects. No Nx process is started and nothing is
 * written.
 *
 * @param root - Absolute repository root.
 * @returns Deterministic workspace graph derived from tracked metadata.
 * @throws WorkspaceGraphError when metadata is missing, malformed, ambiguous, or unresolvable.
 */
export async function readWorkspaceGraph(root: string): Promise<WorkspaceGraph> {
  const repositoryRoot = resolve(root);
  const nxConfiguration = await readJsonDocument(join(repositoryRoot, NX_CONFIGURATION_FILE), NX_CONFIGURATION_FILE);

  const discovered: string[] = [];
  for (const layoutRoot of workspaceLayoutRoots(nxConfiguration)) {
    const absoluteRoot = join(repositoryRoot, layoutRoot);
    let stats;
    try {
      stats = await stat(absoluteRoot);
    } catch (error: unknown) {
      throw new WorkspaceGraphError(`Declared workspace root '${layoutRoot}' is not readable: ${errorMessage(error)}`);
    }
    if (!stats.isDirectory()) {
      throw new WorkspaceGraphError(`Declared workspace root '${layoutRoot}' is not a directory.`);
    }
    await collectProjectRoots(absoluteRoot, repositoryRoot, discovered);
  }

  const sources: WorkspaceProjectSource[] = [];
  for (const projectRoot of discovered.toSorted()) {
    const absoluteProjectRoot = join(repositoryRoot, projectRoot);
    const projectConfiguration = await readJsonDocument(
      join(absoluteProjectRoot, PROJECT_CONFIGURATION_FILE),
      `${projectRoot}/${PROJECT_CONFIGURATION_FILE}`,
    );
    const packageManifest = await readOptionalJsonDocument(
      join(absoluteProjectRoot, PACKAGE_MANIFEST_FILE),
      `${projectRoot}/${PACKAGE_MANIFEST_FILE}`,
    );

    sources.push(
      packageManifest === undefined
        ? {root: projectRoot, projectConfiguration}
        : {root: projectRoot, projectConfiguration, packageManifest},
    );
  }

  return buildWorkspaceGraph(sources);
}
