/**
 * @fileoverview Local `scripts/**` module dependency graph and reachability analysis.
 * @module scripts/testing/architecture/script-source-graph
 *
 * @remarks
 * This module resolves the static and literal-dynamic module references
 * {@link collectTypeScriptModuleReferences} collects into a directed graph of local
 * `scripts/**` source paths. It separates eager reachability (static, non-type-only imports and
 * re-exports only — what evaluating a module actually pays for) from runtime-only reachability
 * (type-only references excluded) and from complete reachability (every reference included), and
 * it records every unresolved relative import instead of silently dropping it, so
 * `scripts/testing/architecture/orphan-modules.test.ts` can enforce zero unexplained
 * reachability debt across the whole production source graph.
 */

import {dirname, join} from "node:path";

import {
  collectTypeScriptModuleReferences,
  isEagerModuleReference,
  type TypeScriptModuleReferenceDefinition,
} from "./typescript-module-analysis.ts";
import {normalizeScriptSourcePath} from "./script-source-files.ts";

/**
 * Whether reachability traversal follows eager edges only, every runtime edge, or every edge.
 *
 * @remarks
 * Deliberately module-private: every caller passes the literal, so exporting it would create an
 * unused export that Knip reports.
 */
type ScriptSourceGraphTraversalMode = "eager" | "runtime" | "all";

/** One non-literal (dynamic path) `import()` call found while building the graph. */
interface NonLiteralDynamicImportDefinition {
  /** Source path containing the non-literal dynamic import. */
  readonly sourcePath: string;
  /** One-based source line of the non-literal dynamic import call. */
  readonly line: number;
}

/** One relative module reference that could not be resolved to a known local source path. */
interface UnresolvedLocalModuleReferenceDefinition {
  /** Source path containing the unresolved reference. */
  readonly sourcePath: string;
  /** The literal relative module specifier that failed to resolve. */
  readonly specifier: string;
}

/** The complete local `scripts/**` module dependency graph and its analysis evidence. */
export interface ScriptSourceGraphDefinition {
  /** Every known local source path, forward-slash normalized and sorted. */
  readonly sourcePaths: readonly string[];
  /**
   * Eager local dependency edges: static imports and re-exports that are not type-only, keyed by
   * source path. Evaluating the key module also evaluates every module listed here, which is what
   * a `--help` path pays for.
   */
  readonly eagerDependencies: ReadonlyMap<string, readonly string[]>;
  /** Runtime (non-type-only) local dependency edges, keyed by source path. */
  readonly runtimeDependencies: ReadonlyMap<string, readonly string[]>;
  /** Every local dependency edge, including type-only references, keyed by source path. */
  readonly allDependencies: ReadonlyMap<string, readonly string[]>;
  /** Every non-literal dynamic import found anywhere in the graph, sorted deterministically. */
  readonly nonLiteralDynamicImports: readonly NonLiteralDynamicImportDefinition[];
  /** Every relative import that did not resolve to a known local source path. */
  readonly unresolvedLocalModuleReferences: readonly UnresolvedLocalModuleReferenceDefinition[];
}

/** Source-file extensions attempted when resolving an extensionless relative specifier. */
const resolvableExtensions = [".ts", ".tsx", ".js", ".mjs", ".cjs"] as const;

/** One module reference resolved to a known local source path. */
interface ResolvedModuleReferenceDefinition {
  /** The original module reference evidence. */
  readonly reference: TypeScriptModuleReferenceDefinition;
  /** The resolved local source path the reference points to. */
  readonly target: string;
}

/**
 * Resolves a relative module specifier to a known local source path.
 *
 * @remarks
 * Attempts the literal joined path first, then every {@link resolvableExtensions} suffix, then
 * every `/index` variant, so extensionless dotted specifiers such as `./doctor.types` resolve to
 * `doctor.types.ts` the same way Node's TypeScript loader would.
 *
 * @param importer - Source path containing the reference.
 * @param specifier - The module specifier text to resolve.
 * @param knownSourcePaths - Every known local source path in the graph.
 * @returns The resolved local source path, or `undefined` when the specifier is not relative or
 * does not resolve to a known source path.
 */
function resolveLocalModule(importer: string, specifier: string, knownSourcePaths: ReadonlySet<string>): string | undefined {
  if (!specifier.startsWith(".")) {
    return undefined;
  }

  const base = normalizeScriptSourcePath(join(dirname(importer), specifier));
  const hasRecognizedSourceExtension = resolvableExtensions.some((extension) => base.endsWith(extension));
  const candidates = [
    base,
    ...(hasRecognizedSourceExtension
      ? []
      : [
          ...resolvableExtensions.map((extension) => `${base}${extension}`),
          ...resolvableExtensions.map((extension) => `${base}/index${extension}`),
        ]),
  ];

  return candidates.find((candidate) => knownSourcePaths.has(candidate));
}

/**
 * Builds the local `scripts/**` module dependency graph from a map of source paths to source text.
 *
 * @param sourceFiles - Every local source path mapped to its source text.
 * @returns The complete dependency graph plus non-literal dynamic import and unresolved relative
 * reference evidence.
 */
export function buildScriptSourceGraph(sourceFiles: ReadonlyMap<string, string>): ScriptSourceGraphDefinition {
  const sourcePaths = [...sourceFiles.keys()].map(normalizeScriptSourcePath).toSorted();
  const knownSourcePaths = new Set(sourcePaths);
  const eagerDependencies = new Map<string, readonly string[]>();
  const runtimeDependencies = new Map<string, readonly string[]>();
  const allDependencies = new Map<string, readonly string[]>();
  const nonLiteralDynamicImports: NonLiteralDynamicImportDefinition[] = [];
  const unresolvedLocalModuleReferences: UnresolvedLocalModuleReferenceDefinition[] = [];

  for (const sourcePath of sourcePaths) {
    const sourceText = sourceFiles.get(sourcePath);
    if (sourceText === undefined) {
      throw new Error(`Missing source text for ${sourcePath}.`);
    }

    const analysis = collectTypeScriptModuleReferences(sourceText, sourcePath);
    const resolved: ResolvedModuleReferenceDefinition[] = [];
    for (const reference of analysis.references) {
      const target = resolveLocalModule(sourcePath, reference.specifier, knownSourcePaths);
      if (target !== undefined) {
        resolved.push({reference, target});
      } else if (reference.specifier.startsWith(".")) {
        unresolvedLocalModuleReferences.push({sourcePath, specifier: reference.specifier});
      }
    }

    allDependencies.set(sourcePath, [...new Set(resolved.map(({target}) => target))].toSorted());
    runtimeDependencies.set(
      sourcePath,
      [...new Set(resolved.filter(({reference}) => !reference.typeOnly).map(({target}) => target))].toSorted(),
    );
    eagerDependencies.set(
      sourcePath,
      [...new Set(resolved.filter(({reference}) => isEagerModuleReference(reference)).map(({target}) => target))].toSorted(),
    );
    nonLiteralDynamicImports.push(...analysis.nonLiteralDynamicImportLines.map((line) => ({sourcePath, line})));
  }

  return {
    sourcePaths,
    eagerDependencies,
    runtimeDependencies,
    allDependencies,
    nonLiteralDynamicImports: nonLiteralDynamicImports.toSorted(
      (left, right) => left.sourcePath.localeCompare(right.sourcePath) || left.line - right.line,
    ),
    unresolvedLocalModuleReferences: unresolvedLocalModuleReferences.toSorted(
      (left, right) => left.sourcePath.localeCompare(right.sourcePath) || left.specifier.localeCompare(right.specifier),
    ),
  };
}

/**
 * Collects every local source path reachable from a set of root source paths.
 *
 * @param graph - The dependency graph to traverse.
 * @param roots - Root source paths to start traversal from.
 * @param mode - `"eager"` follows only static, non-type-only imports and re-exports; `"runtime"`
 * follows every non-type-only edge, including literal dynamic imports; `"all"` follows every edge.
 * @returns The set of reachable local source paths, including the roots themselves.
 */
export function collectReachableScriptSourcePaths(
  graph: Readonly<ScriptSourceGraphDefinition>,
  roots: readonly string[],
  mode: ScriptSourceGraphTraversalMode,
): ReadonlySet<string> {
  const dependencies = mode === "eager" ? graph.eagerDependencies : mode === "runtime" ? graph.runtimeDependencies : graph.allDependencies;
  const reachable = new Set<string>();
  const pending = roots.map(normalizeScriptSourcePath);

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || reachable.has(current) || !graph.sourcePaths.includes(current)) {
      continue;
    }
    reachable.add(current);
    pending.push(...(dependencies.get(current) ?? []));
  }

  return reachable;
}

/**
 * Finds every local source path unreachable from a set of root source paths.
 *
 * @param graph - The dependency graph to traverse.
 * @param roots - Root source paths to start traversal from.
 * @returns Every source path unreachable from the roots under complete (`"all"`) reachability.
 */
export function findUnreachableScriptSourcePaths(
  graph: Readonly<ScriptSourceGraphDefinition>,
  roots: readonly string[],
): readonly string[] {
  const reachable = collectReachableScriptSourcePaths(graph, roots, "all");
  return graph.sourcePaths.filter((sourcePath) => !reachable.has(sourcePath));
}
