/**
 * @fileoverview Changed-file scope and project classification helpers.
 * @module github/scripts/src/hygiene/domain/changedFiles
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

export type ChangeScope = "known" | "unknown";
export type ProjectBucket = "website" | "components" | "cv" | "status" | "api" | "exp" | "docs" | "hygieneScripts";

export type TypeScriptSuiteName = "scripts" | "website" | "cv" | "status" | "components";

export interface ChangeSet {
  readonly scope: ChangeScope;
  readonly files: readonly string[];
}

interface ProviderChangeInput {
  readonly changeScope: ChangeScope;
  readonly changedFiles: readonly string[];
}

type ChangeInput = ChangeSet | ProviderChangeInput;

export interface ChangeClassification {
  readonly files: readonly string[];
  readonly buckets: readonly ProjectBucket[];
  readonly hasRootSharedChange: boolean;
  readonly hasJavaScriptSharedChange: boolean;
  readonly hasBackendSharedChange: boolean;
  readonly hasPythonSharedChange: boolean;
}

const ROOT_SHARED_FILES = new Set([
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "eslint.config.ts",
  "vitest.config.ts",
  "nx.json",
  ".prettierrc",
  ".prettierignore",
]);

const JS_SHARED_FILES = new Set([
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "eslint.config.ts",
  "vitest.config.ts",
  "nx.json",
  ".prettierrc",
  ".prettierignore",
]);

const BACKEND_SHARED_EXTENSIONS = new Set([".slnx", ".props", ".targets"]);
const PYTHON_SHARED_FILENAMES = new Set(["requirements.txt", "requirements-dev.txt", "pyproject.toml", "ruff.toml"]);
const PRETTIER_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".jsonc",
  ".md",
  ".mdx",
  ".css",
  ".scss",
  ".sass",
  ".html",
  ".yml",
  ".yaml",
  ".svelte",
]);
const ESLINT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".svelte"]);
const TYPE_SCRIPT_SUITE_ORDER: readonly TypeScriptSuiteName[] = ["scripts", "website", "cv", "status", "components"];

export function normalizeChangedFile(file: string): string {
  return file.replace(/^[.][\\/]/, "").replace(/\\/g, "/");
}

function isMissingPathError(error: unknown): boolean {
  return error instanceof Error && "code" in error && (error.code === "ENOENT" || error.code === "ENOTDIR");
}

/**
 * Filters a changed-file list to paths that still exist as files in the workspace.
 *
 * @remarks
 * Scope classification intentionally retains deleted paths. Path-based tools such as
 * Prettier and ESLint call this helper immediately before execution so deletion-only
 * changes still select the correct project checks without passing missing files to tools.
 *
 * @param workspaceRoot - Absolute repository workspace root.
 * @param files - Repository-relative changed paths.
 * @returns Normalized repository-relative paths that currently exist as files.
 */
export async function filterExistingFiles(workspaceRoot: string, files: readonly string[]): Promise<readonly string[]> {
  const resolvedRoot = path.resolve(workspaceRoot);
  const candidates = await Promise.all(
    files.map(async (file): Promise<string | null> => {
      const normalizedFile = normalizeChangedFile(file);
      const absolutePath = path.resolve(resolvedRoot, normalizedFile);
      const relativePath = path.relative(resolvedRoot, absolutePath);

      if (relativePath === ".." || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
        throw new Error(`Changed path resolves outside the workspace: ${normalizedFile}`);
      }

      try {
        const stats = await fs.stat(absolutePath);
        return stats.isFile() ? normalizedFile : null;
      } catch (error) {
        if (isMissingPathError(error)) return null;
        throw error;
      }
    }),
  );

  return candidates.filter((file): file is string => file !== null);
}

function extensionOf(file: string): string {
  const slashIndex = file.lastIndexOf("/");
  const dotIndex = file.lastIndexOf(".");
  return dotIndex > slashIndex ? file.substring(dotIndex) : "";
}

function basenameOf(file: string): string {
  const slashIndex = file.lastIndexOf("/");
  return slashIndex === -1 ? file : file.substring(slashIndex + 1);
}

function addBucket(buckets: ProjectBucket[], bucket: ProjectBucket): void {
  if (!buckets.includes(bucket)) buckets.push(bucket);
}

function scopeOf(changeInput: ChangeInput): ChangeScope {
  return "scope" in changeInput ? changeInput.scope : changeInput.changeScope;
}

function filesOf(changeInput: ChangeInput): readonly string[] {
  return "files" in changeInput ? changeInput.files : changeInput.changedFiles;
}

export function classifyChangedFiles(files: readonly string[]): ChangeClassification {
  const normalized = files.map(normalizeChangedFile).filter(Boolean);
  const buckets: ProjectBucket[] = [];
  let hasRootSharedChange = false;
  let hasJavaScriptSharedChange = false;
  let hasBackendSharedChange = false;
  let hasPythonSharedChange = false;

  for (const file of normalized) {
    if (file.startsWith("sites/arolariu.ro/")) addBucket(buckets, "website");
    else if (file.startsWith("packages/components/")) addBucket(buckets, "components");
    else if (file.startsWith("sites/cv.arolariu.ro/")) addBucket(buckets, "cv");
    else if (file.startsWith("sites/status.arolariu.ro/")) addBucket(buckets, "status");
    else if (file.startsWith("sites/api.arolariu.ro/")) addBucket(buckets, "api");
    else if (file.startsWith("sites/exp.arolariu.ro/")) addBucket(buckets, "exp");
    else if (file.startsWith("sites/docs.arolariu.ro/") || file.startsWith("docs/")) addBucket(buckets, "docs");
    else if (file.startsWith(".github/scripts/") || file === ".github/workflows/official-hygiene-check-v2.yml")
      addBucket(buckets, "hygieneScripts");

    const base = basenameOf(file);
    const ext = extensionOf(file);
    if (ROOT_SHARED_FILES.has(file)) hasRootSharedChange = true;
    if (JS_SHARED_FILES.has(file)) hasJavaScriptSharedChange = true;
    if (file === "arolariu.slnx" || BACKEND_SHARED_EXTENSIONS.has(ext)) hasBackendSharedChange = true;
    if (file.startsWith("sites/exp.arolariu.ro/") && PYTHON_SHARED_FILENAMES.has(base)) hasPythonSharedChange = true;
  }

  return {files: normalized, buckets, hasRootSharedChange, hasJavaScriptSharedChange, hasBackendSharedChange, hasPythonSharedChange};
}

export function shouldRunBroadly(changeInput: ChangeInput): boolean {
  if (scopeOf(changeInput) === "unknown") return true;
  return classifyChangedFiles(filesOf(changeInput)).hasRootSharedChange;
}

export function filesForPrettier(changeInput: ChangeInput): readonly string[] | null {
  if (shouldRunBroadly(changeInput)) return null;
  return classifyChangedFiles(filesOf(changeInput)).files.filter((file) => PRETTIER_EXTENSIONS.has(extensionOf(file)));
}

export function filesForEslint(changeInput: ChangeInput): readonly string[] | null {
  if (scopeOf(changeInput) === "unknown") return null;
  const classification = classifyChangedFiles(filesOf(changeInput));
  if (classification.hasJavaScriptSharedChange) return null;
  return classification.files.filter((file) => ESLINT_EXTENSIONS.has(extensionOf(file)));
}

export function touchesBackend(changeInput: ChangeInput): boolean {
  if (scopeOf(changeInput) === "unknown") return true;
  const classification = classifyChangedFiles(filesOf(changeInput));
  return classification.hasRootSharedChange || classification.hasBackendSharedChange || classification.buckets.includes("api");
}

export function touchesPython(changeInput: ChangeInput): boolean {
  if (scopeOf(changeInput) === "unknown") return true;
  const classification = classifyChangedFiles(filesOf(changeInput));
  return classification.hasRootSharedChange || classification.hasPythonSharedChange || classification.buckets.includes("exp");
}

export function suitesForTypeScriptChanges(changeInput: ChangeInput): readonly TypeScriptSuiteName[] | null {
  if (scopeOf(changeInput) === "unknown") return null;
  const classification = classifyChangedFiles(filesOf(changeInput));
  if (classification.hasRootSharedChange || classification.hasJavaScriptSharedChange) return null;

  const suites: TypeScriptSuiteName[] = [];
  if (classification.buckets.includes("hygieneScripts")) suites.push("scripts");
  if (classification.buckets.includes("website")) suites.push("website");
  if (classification.buckets.includes("cv")) suites.push("cv");
  if (classification.buckets.includes("status")) suites.push("status");
  if (classification.buckets.includes("components")) suites.push("components");
  return TYPE_SCRIPT_SUITE_ORDER.filter((suite) => suites.includes(suite));
}

export function touchedBundleFolders(changeInput: ChangeInput, bundleFolders: readonly string[]): readonly string[] | null {
  if (shouldRunBroadly(changeInput)) return null;
  const files = classifyChangedFiles(filesOf(changeInput)).files;
  return bundleFolders.filter((folder) => files.some((file) => file === folder || file.startsWith(`${folder}/`)));
}
