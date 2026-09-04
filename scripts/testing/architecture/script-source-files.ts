/**
 * @fileoverview Shared script source-file classifier and discovery helpers.
 * @module scripts/testing/architecture/script-source-files
 *
 * @remarks
 * This module is the single authoritative walk over `scripts/**` for architecture and policy
 * tests. It classifies test files, configuration files, and non-production test-support files
 * (including everything under `scripts/testing/**`) so every scanner in
 * `scripts/testing/architecture/runtime-boundary-policy.test.ts` and
 * `scripts/testing/architecture/output-policy.test.ts` agrees on what "production script source"
 * means.
 */

import {readdirSync, readFileSync} from "node:fs";
import {extname, join} from "node:path";

/** File extensions that make a `scripts/**` entry a script source file. */
const scriptSourceExtensions: ReadonlySet<string> = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);

/**
 * Normalizes a filesystem path to forward-slash form so classifiers behave identically on
 * Windows and POSIX runners.
 *
 * @remarks
 * Exported because `scripts/testing/architecture/script-source-graph.ts` reuses this exact
 * normalization when resolving relative module specifiers into local source-graph node keys.
 *
 * @param path - A relative or absolute filesystem path.
 * @returns The same path with every backslash replaced by a forward slash.
 */
export function normalizeScriptSourcePath(path: string): string {
  return path.replaceAll("\\", "/");
}

/**
 * Determines whether a script source path is a Vitest spec or test file.
 *
 * @param path - A `scripts/**` relative or absolute path.
 * @returns `true` when the path ends in a recognized `.spec.*` or `.test.*` suffix.
 */
export function isScriptTestFile(path: string): boolean {
  return /\.(?:spec|test)\.(?:cjs|js|jsx|mjs|ts|tsx)$/u.test(normalizeScriptSourcePath(path));
}

/**
 * Determines whether a script source path is a build or test tool configuration file.
 *
 * @param path - A `scripts/**` relative or absolute path.
 * @returns `true` when the path ends in a recognized `.config.*` suffix.
 */
export function isScriptConfigurationFile(path: string): boolean {
  return /\.config\.(?:cjs|js|mjs|mts|ts)$/u.test(normalizeScriptSourcePath(path));
}

/**
 * Determines whether a script source path is test-support code rather than production script
 * source.
 *
 * @param path - A `scripts/**` relative or absolute path.
 * @returns `true` when the path lives under `scripts/testing/` or carries a `.testing.*` suffix,
 * such as `scripts/testing/fixtures/memory-filesystem.fixture.ts`.
 */
export function isScriptTestSupportFile(path: string): boolean {
  const normalized = normalizeScriptSourcePath(path);
  return normalized.startsWith("scripts/testing/") || /\.testing\.(?:cjs|js|mjs|ts)$/u.test(normalized);
}

/**
 * Recursively discovers every script source file under a directory.
 *
 * @param directory - Root directory to walk. Defaults to `scripts`.
 * @returns Every recognized script source file, forward-slash normalized and sorted.
 */
export function discoverScriptSourceFiles(directory: string = "scripts"): readonly string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, {withFileTypes: true})) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...discoverScriptSourceFiles(path));
      continue;
    }

    if (scriptSourceExtensions.has(extname(path))) {
      files.push(normalizeScriptSourcePath(path));
    }
  }

  return files.toSorted();
}

/**
 * Discovers every production script source file: source files that are neither tests,
 * configuration, nor test-support code.
 *
 * @param directory - Root directory to walk. Defaults to `scripts`.
 * @returns Every production script source file, forward-slash normalized and sorted.
 */
export function discoverProductionScriptFiles(directory: string = "scripts"): readonly string[] {
  return discoverScriptSourceFiles(directory).filter(
    (path) => !isScriptTestFile(path) && !isScriptConfigurationFile(path) && !isScriptTestSupportFile(path),
  );
}

/**
 * Reads every production script source file into the map `buildScriptSourceGraph` consumes.
 *
 * @remarks
 * This owns the production source-text read that the orphan-module, architecture-report,
 * ownership-boundary, and module-structure consumers previously each built inline.
 *
 * @param directory - Root directory to walk. Defaults to `scripts`.
 * @returns Every production script source path mapped to its source text.
 */
export function readProductionScriptSourceFiles(directory: string = "scripts"): ReadonlyMap<string, string> {
  return new Map(discoverProductionScriptFiles(directory).map((sourcePath) => [sourcePath, readFileSync(sourcePath, "utf8")]));
}
