/**
 * @fileoverview Docs pipeline for `sites/docs.arolariu.ro`.
 * @module scripts/commands/docs/assemble
 *
 * @remarks
 * Runs the three markdown-producing extractor families concurrently (TypeDoc, pydoc-markdown,
 * DefaultDocumentation), normalizes the generated frontmatter, writes per-tier landing index
 * pages, and mirrors `/docs/` prose into the Docusaurus source tree under `docs/monorepo/`.
 *
 * HTTP API reference is intentionally excluded: `api.arolariu.ro`
 * hosts Swagger UI from the live OpenAPI spec, so re-publishing the
 * spec here would just duplicate that browser.
 *
 * Invoked via `npm run docs:assemble` before `npm run build:docs` / `dev:docs`. Designed to be
 * idempotent — each run starts by cleaning the staging dir (`sites/docs.arolariu.ro/_generated/`)
 * so CI builds behave the same as a fresh local clone. Every filesystem and process concern goes
 * through the Effect platform services (`FileSystem`, `Path`, `Process`), so the whole pipeline
 * runs deterministically on the in-memory test harness. The cleaned `_generated` tree is
 * invocation-transient: an `Effect.acquireRelease` around generation removes it again when the
 * pipeline fails or is interrupted, and keeps it only once normalization, required-tier
 * validation, landing pages, and prose mirroring have all succeeded.
 */

import {dirname, join, resolve} from "node:path";

import {Effect, Exit, FileSystem, type Path, type PlatformError} from "effect";

import {resolveRepositoryPaths, type RepositoryRootNotFound} from "../../common/repository-paths.ts";
import type {Environment} from "../../platform/Environment.ts";
import type {Glob, ReadOnlyFiles} from "../../platform/Files.ts";
import type {Presenter} from "../../platform/Output.ts";
import {Process, type ProcessError} from "../../platform/Process.ts";
import {DocumentationOutputMissing, DotnetBuildRootUnresolved} from "./errors.ts";
import {normalizeDirectory, readDirectoryEntries, serializeFrontmatter} from "./normalize.ts";

/** Services the documentation assembly requires. */
export type DocsAssembleRequirements =
  | Process
  | FileSystem.FileSystem
  | Path.Path
  | Glob
  | ReadOnlyFiles
  | Environment
  | Presenter;

/** Every typed failure of the documentation assembly. */
export type DocsAssembleError =
  | DocumentationOutputMissing
  | DotnetBuildRootUnresolved
  | ProcessError
  | PlatformError.PlatformError
  | RepositoryRootNotFound;

/**
 * .NET target framework shared across every project under
 * `sites/api.arolariu.ro/src/`. Declared centrally in
 * `api.arolariu.ro/Directory.Build.props`; duplicated here only so
 * {@link discoverDotnetProjects} can locate each project's built DLL
 * without parsing MSBuild props on every run.
 */
const DOTNET_TFM = "net10.0";

/**
 * Mirror the repo's top-level `/docs/` prose into the Docusaurus source
 * tree under `docs/monorepo/`, wiping the destination first so stale
 * files never survive a rename. The `superpowers/` subtree is excluded
 * because it holds per-author planning docs that are gitignored and
 * must never reach the published site.
 *
 * @param src  - Source directory (normally the repo's `/docs`).
 * @param dest - Destination directory (normally `docs/monorepo/`).
 * @returns An effect that replaces `dest` with a copy of `src` minus `superpowers/`.
 */
export const syncProse: (src: string, dest: string) => Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem> = Effect.fn(
  "docs.syncProse",
)(function* (src: string, dest: string) {
  const fs = yield* FileSystem.FileSystem;
  yield* fs.remove(dest, {recursive: true, force: true});
  yield* fs.makeDirectory(dest, {recursive: true});
  yield* fs.copy(src, dest, {overwrite: true});
  yield* fs.remove(join(dest, "superpowers"), {recursive: true, force: true});
});

function isDocumentationOutputFile(fileName: string): boolean {
  return /\.mdx?$|\.json$/i.test(fileName);
}

/**
 * Counts the documentation output files under a directory tree.
 *
 * @param dir - Absolute path of the tree root.
 * @param excludeRootLanding - Whether root landing files (`index.md` / `README.md`) are ignored.
 * @returns The number of `.md`/`.mdx`/`.json` files.
 */
function countDocumentationFiles(
  dir: string,
  excludeRootLanding: boolean,
): Effect.Effect<number, PlatformError.PlatformError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    let count = 0;
    for (const entry of yield* readDirectoryEntries(dir)) {
      if (entry.kind === "directory") {
        count += yield* countDocumentationFiles(join(dir, entry.name), false);
      } else if (isDocumentationOutputFile(entry.name) && !(excludeRootLanding && ROOT_LANDING_FILE_NAMES.has(entry.name.toLowerCase()))) {
        count++;
      }
    }
    return count;
  });
}

/**
 * Guardrail to catch silent-failure cases where an extractor exits 0
 * but produces no content. Fails if the given directory is missing or
 * contains zero `.md`/`.mdx`/`.json` files.
 *
 * @param dir   - Absolute path expected to contain extractor output.
 * @param label - Short human-readable name used in the failure message
 *   (for example `'typedoc'`, `'pydoc-markdown'`) and as its `tier`.
 * @returns An effect failing with {@link DocumentationOutputMissing} when the output is absent.
 */
export const assertNonEmpty: (
  dir: string,
  label: string,
) => Effect.Effect<void, DocumentationOutputMissing | PlatformError.PlatformError, FileSystem.FileSystem | Path.Path> = Effect.fn(
  "docs.assertNonEmpty",
)(function* (dir: string, label: string) {
  const fs = yield* FileSystem.FileSystem;
  if (!(yield* fs.exists(dir))) {
    return yield* new DocumentationOutputMissing({tier: label, message: `${label}: expected directory not found at ${dir}`});
  }
  if ((yield* countDocumentationFiles(dir, false)) === 0) {
    return yield* new DocumentationOutputMissing({tier: label, message: `${label}: extracted 0 files into ${dir}`});
  }
});

/**
 * Reset the `_generated/` staging directory. Ensures each run starts
 * from a known-empty state so stale extractor output from a previous
 * build can never survive into the current one.
 *
 * @param generatedRoot - Absolute path to the `_generated` staging directory.
 * @returns An effect that empties the staging directory.
 */
function cleanGenerated(generatedRoot: string): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    yield* fs.remove(generatedRoot, {recursive: true, force: true});
    yield* fs.makeDirectory(generatedRoot, {recursive: true});
  });
}

/**
 * Required generated documentation tiers mounted by Docusaurus.
 *
 * @remarks
 * Each path is relative to `_generated/` and must contain at least one
 * extractor-produced file before normalization, landing-page generation, and
 * prose sync. Root landing files (`index.md` / `README.md`) are ignored so
 * synthetic Docusaurus pages cannot satisfy the deployment gate.
 */
export const REQUIRED_DOCUMENTATION_TIERS = [
  {relativePath: join("ts-reference", "components"), label: "typedoc components"},
  {relativePath: join("ts-reference", "website"), label: "typedoc website"},
  {relativePath: "experimental", label: "pydoc-markdown"},
  {relativePath: "dotnet-internals", label: "defaultdocumentation"},
] as const;

/**
 * Platform-stable, POSIX-separated identity of every {@link REQUIRED_DOCUMENTATION_TIERS} entry,
 * in the same fixed order. {@link DocumentationAssemblyResult.generatedTiers} reports this list
 * instead of {@link REQUIRED_DOCUMENTATION_TIERS}'s `relativePath` values, which use the host's
 * path separator.
 */
const GENERATED_TIER_IDENTITIES: readonly string[] = [
  "ts-reference/components",
  "ts-reference/website",
  "experimental",
  "dotnet-internals",
];

const ROOT_LANDING_FILE_NAMES = new Set(["index.md", "index.mdx", "readme.md", "readme.mdx"]);

/**
 * Verify that every documentation tier mounted by Docusaurus contains extractor output.
 *
 * @param generatedRoot - Root `_generated` directory to validate.
 * @returns An effect failing with {@link DocumentationOutputMissing} for the first missing or empty tier.
 */
export const assertExpectedDocumentationTiers: (
  generatedRoot: string,
) => Effect.Effect<void, DocumentationOutputMissing | PlatformError.PlatformError, FileSystem.FileSystem | Path.Path> = Effect.fn(
  "docs.assertExpectedDocumentationTiers",
)(function* (generatedRoot: string) {
  const fs = yield* FileSystem.FileSystem;
  for (const tier of REQUIRED_DOCUMENTATION_TIERS) {
    const tierRoot = join(generatedRoot, tier.relativePath);
    if (!(yield* fs.exists(tierRoot))) {
      return yield* new DocumentationOutputMissing({tier: tier.label, message: `${tier.label}: expected directory not found at ${tierRoot}`});
    }
    if ((yield* countDocumentationFiles(tierRoot, true)) === 0) {
      return yield* new DocumentationOutputMissing({
        tier: tier.label,
        message: `${tier.label}: extracted 0 non-landing files into ${tierRoot}`,
      });
    }
  }
});

/**
 * One .NET project whose XML docs are exposed on the docs site.
 * {@link runDotnetInternals} builds the graph roots once (so every
 * project is compiled transitively via MSBuild's ProjectReference
 * traversal) and then runs `DefaultDocumentation` against each
 * compiled assembly.
 */
export type DotnetProject = {
  /** Absolute path to the `.csproj` file. */
  readonly csproj: string;
  /** Path to the `.csproj` relative to `sites/api.arolariu.ro/`, for logging. */
  readonly csprojRelative: string;
  /** Final assembly filename without the `.dll` extension. */
  readonly assemblyName: string;
  /** Directory (relative to the API root) containing the built DLL. */
  readonly binRelative: string;
  /** Absolute paths of every `<ProjectReference>` declared in the csproj. */
  readonly projectReferences: readonly string[];
};

/**
 * Extract `<ProjectReference Include="..." />` paths from csproj content.
 *
 * @param csprojPath - Absolute path of the csproj, which relative references resolve against.
 * @param content - The csproj content.
 * @returns The absolute referenced csproj paths, in declaration order.
 */
function parseProjectReferences(csprojPath: string, content: string): readonly string[] {
  const refs: string[] = [];
  const regex = /<ProjectReference\s+Include\s*=\s*["']([^"']+)["']/g;
  for (let match: RegExpExecArray | null; (match = regex.exec(content)) !== null;) {
    const capture = match[1];
    if (capture === undefined) continue;
    const relPath = capture.replaceAll("\\", "/");
    refs.push(resolve(dirname(csprojPath), relPath));
  }
  return refs;
}

/**
 * Walk `sites/api.arolariu.ro/src/*` and return every `.csproj` with
 * its assembly name, bin-output path, and declared project references.
 *
 * Returning project references lets {@link findDotnetBuildRoots}
 * compute the minimum build set — projects not referenced by any
 * sibling are the entry points MSBuild needs; building each one once
 * cascades through the entire graph via `BuildProjectReferences=true`
 * (the default).
 *
 * @param apiRoot - Absolute path to `sites/api.arolariu.ro/`.
 * @param tfm - Target framework moniker used to locate each project's bin output.
 * @returns The discovered projects, sorted by csproj path.
 */
export const discoverDotnetProjects: (
  apiRoot: string,
  tfm?: string,
) => Effect.Effect<readonly DotnetProject[], PlatformError.PlatformError, FileSystem.FileSystem | Path.Path> = Effect.fn(
  "docs.discoverDotnetProjects",
)(function* (apiRoot: string, tfm: string = DOTNET_TFM) {
  const fs = yield* FileSystem.FileSystem;
  const srcRoot = join(apiRoot, "src");
  const projects: DotnetProject[] = [];
  for (const dirEntry of yield* readDirectoryEntries(srcRoot)) {
    if (dirEntry.kind !== "directory") continue;
    const dirPath = join(srcRoot, dirEntry.name);
    for (const fileEntry of yield* readDirectoryEntries(dirPath)) {
      if (fileEntry.kind !== "file" || !fileEntry.name.endsWith(".csproj")) continue;
      const csproj = join(dirPath, fileEntry.name);
      projects.push({
        csproj,
        csprojRelative: `src/${dirEntry.name}/${fileEntry.name}`,
        assemblyName: fileEntry.name.replace(/\.csproj$/, ""),
        binRelative: `src/${dirEntry.name}/bin/Release/${tfm}`,
        projectReferences: parseProjectReferences(csproj, yield* fs.readFileString(csproj)),
      });
    }
  }
  return projects.toSorted((a, b) => a.csproj.localeCompare(b.csproj));
});

/**
 * Returns the projects no other project references.
 *
 * @param projects - Every discovered project.
 * @returns The unreferenced projects; empty for a cyclic or over-connected graph.
 */
function unreferencedProjects(projects: readonly DotnetProject[]): readonly DotnetProject[] {
  const referenced = new Set(projects.flatMap((p) => p.projectReferences));
  return projects.filter((p) => !referenced.has(p.csproj));
}

/**
 * Builds the failure raised when no build root can be chosen.
 *
 * @returns The {@link DotnetBuildRootUnresolved} failure with the legacy message.
 */
function dotnetBuildRootUnresolved(): DotnetBuildRootUnresolved {
  return new DotnetBuildRootUnresolved({
    message: ".NET projects: every project is referenced by another — cyclic graph, cannot pick a build root.",
  });
}

/**
 * Return the subset of projects that no other project references — the
 * minimum MSBuild entry points needed to compile every assembly. Given
 * the current graph (Core references Common, Core.Auth, Invoices),
 * this returns `[Core]`: one `dotnet build` call against Core cascades
 * through the whole set.
 *
 * @param projects - Every discovered project.
 * @returns The build roots.
 * @throws {DotnetBuildRootUnresolved} When every project is referenced by another.
 */
export function findDotnetBuildRoots(projects: readonly DotnetProject[]): readonly DotnetProject[] {
  const roots = unreferencedProjects(projects);
  if (roots.length === 0) {
    throw dotnetBuildRootUnresolved();
  }
  return roots;
}

/**
 * Build the DefaultDocumentation CLI arguments for one compiled assembly.
 *
 * @remarks
 * The multi-value `--GeneratedAccessModifiers Public Protected Internal Private`
 * form follows the DefaultDocumentation.Console 1.2.4 option shape verified via
 * `defaultdocumentation --help` and parser behavior.
 *
 * @param dll - Absolute path to the compiled assembly.
 * @param outDir - Absolute output directory for generated markdown.
 * @returns CLI arguments passed to `defaultdocumentation`.
 */
export function getDefaultDocumentationArgs(dll: string, outDir: string): readonly string[] {
  return [
    "--AssemblyFilePath",
    dll,
    "--OutputDirectoryPath",
    outDir,
    "--FileNameFactory",
    "Name",
    "--GeneratedPages",
    "Namespaces",
    "--IncludeUndocumentedItems",
    "true",
    "--GeneratedAccessModifiers",
    "Public",
    "Protected",
    "Internal",
    "Private",
  ];
}

/**
 * Build the full command + arguments for invoking DefaultDocumentation.
 *
 * @remarks
 * `DefaultDocumentation.Console` is declared as a **local** tool in
 * `.config/dotnet-tools.json` and restored with `dotnet tool restore`.
 * Local tools are resolved by the dotnet driver and are never placed on
 * `PATH`, so they must be invoked as `dotnet <command>`. The command name
 * is LOWERCASE (`defaultdocumentation`) — NuGet registers tool commands in
 * lower case regardless of the package name's casing, and Linux file
 * systems enforce that strictly.
 *
 * @param dll - Absolute path to the compiled assembly.
 * @param outDir - Absolute output directory for generated markdown.
 * @returns The command and arguments to spawn.
 */
export function getDefaultDocumentationCommand(dll: string, outDir: string): {readonly command: string; readonly args: readonly string[]} {
  return {command: "dotnet", args: ["defaultdocumentation", ...getDefaultDocumentationArgs(dll, outDir)]};
}

/**
 * Discover every `.csproj` under `api.arolariu.ro/src/`, build the
 * minimum set of graph roots with one `dotnet build` call each (so
 * MSBuild covers the whole graph via ProjectReference transitivity),
 * then run `DefaultDocumentation` against each compiled DLL. Output
 * lands under `_generated/dotnet-internals/<assembly>/`.
 *
 * @param apiRoot - Absolute path to `sites/api.arolariu.ro/`.
 * @param dotnetInternalsDir - Absolute path to `_generated/dotnet-internals/`.
 * @returns An effect that builds and documents every project.
 */
const runDotnetInternals = Effect.fn("docs.runDotnetInternals")(function* (apiRoot: string, dotnetInternalsDir: string) {
  const fs = yield* FileSystem.FileSystem;
  const processes = yield* Process;
  const projects = yield* discoverDotnetProjects(apiRoot);
  const roots = unreferencedProjects(projects);
  if (roots.length === 0) {
    return yield* dotnetBuildRootUnresolved();
  }
  for (const root of roots) {
    yield* processes.run({command: "dotnet", args: ["build", root.csprojRelative, "-c", "Release"]}, {cwd: apiRoot, output: "capture"});
  }
  yield* fs.makeDirectory(dotnetInternalsDir, {recursive: true});
  for (const proj of projects) {
    const outDir = join(dotnetInternalsDir, proj.assemblyName);
    yield* fs.makeDirectory(outDir, {recursive: true});
    const dll = join(apiRoot, proj.binRelative, `${proj.assemblyName}.dll`);
    // DefaultDocumentation.Console is declared as a **local** tool in
    // `.config/dotnet-tools.json` and restored with `dotnet tool restore`.
    const {command, args} = getDefaultDocumentationCommand(dll, outDir);
    yield* processes.run({command, args}, {cwd: apiRoot, output: "capture"});
  }
  yield* assertNonEmpty(dotnetInternalsDir, "defaultdocumentation");
});

/**
 * Invoke TypeDoc twice — once for `@arolariu/components`, once for
 * selected modules of the `arolariu.ro` website — emitting markdown
 * under `_generated/ts-reference/{components,website}/`.
 *
 * @param repoRoot - Absolute repository root, TypeDoc's working directory.
 * @param tsReferenceDir - Absolute path to `_generated/ts-reference/`.
 * @returns An effect that runs both TypeDoc configurations in order.
 */
const runTypedoc = Effect.fn("docs.runTypedoc")(function* (repoRoot: string, tsReferenceDir: string) {
  const processes = yield* Process;
  yield* processes.run({command: "npx", args: ["typedoc", "--options", "typedoc.components.json"]}, {cwd: repoRoot, output: "capture"});
  yield* processes.run({command: "npx", args: ["typedoc", "--options", "typedoc.website.json"]}, {cwd: repoRoot, output: "capture"});
  yield* assertNonEmpty(tsReferenceDir, "typedoc");
});

/**
 * Rewrite CRLF line endings to LF throughout a directory tree.
 * `pydoc-markdown` emits CRLF on Windows which confuses the frontmatter
 * parser in {@link normalizeDirectory}; running this pass first keeps
 * the normalizer platform-agnostic.
 *
 * @param dir - Absolute path to the root of the walk.
 * @returns An effect that rewrites every CRLF documentation file.
 */
function normalizeLineEndings(dir: string): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    for (const entry of yield* readDirectoryEntries(dir)) {
      const full = join(dir, entry.name);
      if (entry.kind === "directory") {
        yield* normalizeLineEndings(full);
      } else if (isDocumentationOutputFile(entry.name)) {
        const content = yield* fs.readFileString(full);
        if (content.includes("\r\n")) {
          yield* fs.writeFileString(full, content.replaceAll("\r\n", "\n"));
        }
      }
    }
  });
}

/**
 * Run `pydoc-markdown` over `sites/exp.arolariu.ro/` using the config
 * file committed there. Output lands under `_generated/experimental/`.
 * Line endings are normalized after extraction so the downstream
 * frontmatter pass sees consistent `\n` separators.
 *
 * @param expRoot - Absolute path to `sites/exp.arolariu.ro/`.
 * @param pythonDir - Absolute path to `_generated/experimental/`.
 * @returns An effect that extracts and normalizes the Python documentation.
 */
const runPydocMarkdown = Effect.fn("docs.runPydocMarkdown")(function* (expRoot: string, pythonDir: string) {
  const processes = yield* Process;
  yield* processes.run({command: "python", args: ["-m", "pydoc_markdown.main"]}, {cwd: expRoot, output: "capture"});
  yield* assertNonEmpty(pythonDir, "pydoc-markdown");
  // pydoc-markdown emits CRLF on Windows; normalize so downstream frontmatter parsers match on \n.
  yield* normalizeLineEndings(pythonDir);
});

/** Inputs for the per-tier landing page writer. */
type LandingPage = {
  /** Absolute path to a tier root directory (e.g. `_generated/dotnet-internals`). */
  readonly dir: string;
  /** H1/title shown on the landing page. */
  readonly title: string;
  /** Single-paragraph description placed under the title. */
  readonly summary: string;
  /** Docusaurus route base (e.g. `/internals/dotnet`) used to build absolute links. */
  readonly routeBase: string;
};

/**
 * Generate an `index.md` at the root of one extractor's tier. Without
 * this file, Docusaurus has no page to serve at the plugin's
 * `routeBasePath` and navbar links to `/internals/dotnet` (etc.) 404.
 * The page lists each immediate child so visitors can browse.
 *
 * Frontmatter is rendered via {@link serializeFrontmatter} so a title
 * containing YAML-reserved characters (or a YAML keyword literal)
 * gets quoted the same way the normalizer quotes extractor output.
 *
 * @param page - Tier root, title, summary, and route base for the landing page.
 * @returns An effect that writes the landing page when the tier exists.
 */
function writeLandingPage({
  dir,
  title,
  summary,
  routeBase,
}: LandingPage): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    if (!(yield* fs.exists(dir))) return;
    const entries = yield* readDirectoryEntries(dir);
    const children = entries
      .filter((entry) => entry.kind === "directory" || /\.mdx?$/i.test(entry.name))
      .filter((entry) => !/^index\.mdx?$/i.test(entry.name))
      .toSorted((left, right) => left.name.localeCompare(right.name));
    const bullets = children
      .map((entry) => {
        const label = entry.name.replace(/\.mdx?$/i, "");
        const href = entry.kind === "directory" ? `${routeBase}/${label}/` : `${routeBase}/${label}`;
        return `- [${label}](${href})`;
      })
      .join("\n");
    const pageBody = `\n# ${title}\n\n${summary}\n\n${bullets}\n`;
    const full = serializeFrontmatter({title, sidebar_position: 0}, pageBody);
    yield* fs.writeFileString(join(dir, "index.md"), full);
  });
}

/** Typed business result produced by one documentation assembly invocation. */
export interface DocumentationAssemblyResult {
  /**
   * The ordered, platform-stable identity of every required documentation tier that was
   * validated, normalized, and given a landing page. Always
   * `["ts-reference/components", "ts-reference/website", "experimental", "dotnet-internals"]`.
   */
  readonly generatedTiers: readonly string[];
  /** Number of extractor families run concurrently (TypeDoc, pydoc-markdown, DefaultDocumentation): always `3`. */
  readonly extractorCount: number;
}

/**
 * Runs the full documentation assembly pipeline: clean the staging directory, run every
 * extractor family concurrently, validate required tiers, normalize frontmatter, write landing
 * pages, and mirror prose.
 *
 * @remarks
 * The repository paths are resolved by the shared `resolveRepositoryPaths` helper through
 * `ReadOnlyFiles`. The three extractor groups (TypeDoc, pydoc-markdown,
 * DefaultDocumentation) run with `Effect.all(..., {concurrency: "unbounded"})`; the first failure
 * interrupts the siblings (terminating their child processes) before the failure propagates, so no
 * straggling extractor writes into `_generated` after the cleanup. The `_generated` staging tree
 * is invocation-transient: an `Effect.acquireRelease` registered right after it is (re)created
 * removes it again when any later step fails or the run is interrupted, and keeps it on success.
 */
export const assembleDocumentation: Effect.Effect<DocumentationAssemblyResult, DocsAssembleError, DocsAssembleRequirements> = Effect.gen(
  function* () {
    const paths = yield* resolveRepositoryPaths(import.meta.url);
    const fs = yield* FileSystem.FileSystem;

    const generatedRoot = join(paths.docsRoot, "_generated");
    const tsReferenceDir = join(generatedRoot, "ts-reference");
    const pythonDir = join(generatedRoot, "experimental");
    const dotnetInternalsDir = join(generatedRoot, "dotnet-internals");
    const proseDest = join(paths.docsRoot, "docs", "monorepo");
    const proseSrc = join(paths.root, "docs");

    yield* cleanGenerated(generatedRoot);

    return yield* Effect.scoped(
      Effect.gen(function* () {
        yield* Effect.acquireRelease(Effect.void, (_, exit) =>
          Exit.isSuccess(exit)
            ? Effect.void
            : fs
                .remove(generatedRoot, {recursive: true, force: true})
                .pipe(
                  Effect.catch((error) =>
                    Effect.logWarning(`Failed to remove the partial documentation tree at ${generatedRoot}: ${error.message}`),
                  ),
                ),
        );

        yield* Effect.all(
          [
            runTypedoc(paths.root, tsReferenceDir),
            runPydocMarkdown(paths.expRoot, pythonDir),
            runDotnetInternals(paths.apiRoot, dotnetInternalsDir),
          ],
          {concurrency: "unbounded", discard: true},
        );

        // Validate extractor output before normalization and synthetic landing pages
        // can obscure missing-tier failures.
        yield* assertExpectedDocumentationTiers(generatedRoot);
        yield* normalizeDirectory(tsReferenceDir);
        yield* normalizeDirectory(pythonDir);
        yield* normalizeDirectory(dotnetInternalsDir);
        // Navbar links target each plugin's routeBasePath (e.g. /internals/dotnet); without
        // an index.md at the tier root, Docusaurus has no page to serve there. Generate one
        // after normalization so the landing pages appear in the sidebar at position 0.
        yield* writeLandingPage({
          dir: tsReferenceDir,
          title: "TypeScript reference",
          summary: "Generated from TSDoc / JSDoc comments across `@arolariu/components` and the `arolariu.ro` website.",
          routeBase: "/reference/typescript",
        });
        yield* writeLandingPage({
          dir: pythonDir,
          title: "Experimental service (Python)",
          summary:
            "Internal documentation for `exp.arolariu.ro`, a FastAPI configuration-proxy service. Extracted from Google-style docstrings via `pydoc-markdown`.",
          routeBase: "/internals/experimental",
        });
        yield* writeLandingPage({
          dir: dotnetInternalsDir,
          title: ".NET internals",
          summary:
            "Reference documentation for internal types, services, and brokers of `api.arolariu.ro`. Generated from XML doc comments via `DefaultDocumentation`.",
          routeBase: "/internals/dotnet",
        });
        yield* syncProse(proseSrc, proseDest);

        return {generatedTiers: GENERATED_TIER_IDENTITIES, extractorCount: 3};
      }),
    );
  },
).pipe(Effect.withSpan("docs.assemble"));
