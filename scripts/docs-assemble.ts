/**
 * @fileoverview Docs pipeline command for `sites/docs.arolariu.ro`.
 * @module scripts/docs-assemble
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
 * so CI builds behave the same as a fresh local clone. Every filesystem, process, and concurrency
 * concern flows through the injected {@link CommandExecutionContext.runtime} instead of `node:fs`, a
 * bespoke command runner, or `Promise.all`, so the whole pipeline is exercised deterministically
 * by the declarative command runtime's test fakes. The cleaned `_generated` tree is
 * invocation-transient: a cleanup callback registered right after it is created removes it again
 * on any failure or cancellation, and is unregistered only once normalization, required-tier
 * validation, landing pages, and prose mirroring have all succeeded.
 */

import {dirname, join, resolve} from "node:path";
import type {CommandExecutionContext} from "./core/command/command-execution.ts";
import {defineCommand, type LazyMonorepoCommand} from "./core/command/lazy-monorepo-command.ts";
import type {CommandConstructionOptions, CommandHost} from "./core/command/command-specification.ts";
import {resolveRepositoryPaths} from "./common/repository-paths.ts";
import type {ProcessRunner} from "./core/process/process-runner.ts";
import type {FileSystem} from "./core/runtime/runtime-capability.ts";
import {normalizeDirectory, serializeFrontmatter} from "./docs-assemble.normalize.ts";

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
 * @param files - Injected filesystem capability used for every removal, directory creation, and
 * copy performed by the sync.
 * @param src  - Source directory (normally the repo's `/docs`).
 * @param dest - Destination directory (normally `docs/monorepo/`).
 */
export async function syncProse(files: FileSystem, src: string, dest: string): Promise<void> {
  await files.remove(dest, {recursive: true, force: true});
  await files.createDirectory(dest, {recursive: true});
  await files.copy(src, dest, {recursive: true, force: true});
  await files.remove(join(dest, "superpowers"), {recursive: true, force: true});
}

/**
 * Guardrail to catch silent-failure cases where an extractor exits 0
 * but produces no content. Throws if the given directory is missing or
 * contains zero `.md`/`.mdx`/`.json` files.
 *
 * @param files - Injected filesystem capability used to walk the directory.
 * @param dir   - Absolute path expected to contain extractor output.
 * @param label - Short human-readable name used in the thrown error
 *   message (for example `'typedoc'`, `'pydoc-markdown'`).
 */
export async function assertNonEmpty(files: FileSystem, dir: string, label: string): Promise<void> {
  if (!(await files.exists(dir))) throw new Error(`${label}: expected directory not found at ${dir}`);
  let count = 0;
  const walk = async (d: string): Promise<void> => {
    for (const entry of await files.readDirectory(d)) {
      const full = join(d, entry.name);
      if (entry.kind === "directory") {
        await walk(full);
      } else if (isDocumentationOutputFile(entry.name)) {
        count++;
      }
    }
  };
  await walk(dir);
  if (count === 0) throw new Error(`${label}: extracted 0 files into ${dir}`);
}

/**
 * Reset the `_generated/` staging directory. Ensures each run starts
 * from a known-empty state so stale extractor output from a previous
 * build can never survive into the current one.
 *
 * @param files - Injected filesystem capability.
 * @param generatedRoot - Absolute path to the `_generated` staging directory.
 */
async function cleanGenerated(files: FileSystem, generatedRoot: string): Promise<void> {
  await files.remove(generatedRoot, {recursive: true, force: true});
  await files.createDirectory(generatedRoot, {recursive: true});
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

function isDocumentationOutputFile(fileName: string): boolean {
  return /\.mdx?$|\.json$/i.test(fileName);
}

async function countExtractorOutputFiles(files: FileSystem, dir: string, isRoot: boolean = true): Promise<number> {
  let count = 0;
  for (const entry of await files.readDirectory(dir)) {
    const full = join(dir, entry.name);
    if (entry.kind === "directory") {
      count += await countExtractorOutputFiles(files, full, false);
    } else if (isDocumentationOutputFile(entry.name) && !(isRoot && ROOT_LANDING_FILE_NAMES.has(entry.name.toLowerCase()))) {
      count++;
    }
  }
  return count;
}

/**
 * Verify that every documentation tier mounted by Docusaurus contains extractor output.
 *
 * @param files - Injected filesystem capability.
 * @param generatedRoot - Root `_generated` directory to validate.
 */
export async function assertExpectedDocumentationTiers(files: FileSystem, generatedRoot: string): Promise<void> {
  for (const tier of REQUIRED_DOCUMENTATION_TIERS) {
    const tierRoot = join(generatedRoot, tier.relativePath);
    if (!(await files.exists(tierRoot))) throw new Error(`${tier.label}: expected directory not found at ${tierRoot}`);
    if ((await countExtractorOutputFiles(files, tierRoot)) === 0) {
      throw new Error(`${tier.label}: extracted 0 non-landing files into ${tierRoot}`);
    }
  }
}

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

/** Extract `<ProjectReference Include="..." />` paths from a csproj. */
async function parseProjectReferences(files: FileSystem, csprojPath: string): Promise<readonly string[]> {
  const content = await files.readText(csprojPath);
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
 * @param files - Injected filesystem capability.
 * @param apiRoot - Absolute path to `sites/api.arolariu.ro/`.
 * @param tfm - Target framework moniker used to locate each project's bin output.
 */
export async function discoverDotnetProjects(
  files: FileSystem,
  apiRoot: string,
  tfm: string = DOTNET_TFM,
): Promise<readonly DotnetProject[]> {
  const srcRoot = join(apiRoot, "src");
  const projects: DotnetProject[] = [];
  for (const dirEntry of await files.readDirectory(srcRoot)) {
    if (dirEntry.kind !== "directory") continue;
    const dirPath = join(srcRoot, dirEntry.name);
    for (const fileEntry of await files.readDirectory(dirPath)) {
      if (fileEntry.kind !== "file" || !fileEntry.name.endsWith(".csproj")) continue;
      const csproj = join(dirPath, fileEntry.name);
      projects.push({
        csproj,
        csprojRelative: `src/${dirEntry.name}/${fileEntry.name}`,
        assemblyName: fileEntry.name.replace(/\.csproj$/, ""),
        binRelative: `src/${dirEntry.name}/bin/Release/${tfm}`,
        projectReferences: await parseProjectReferences(files, csproj),
      });
    }
  }
  return projects.toSorted((a, b) => a.csproj.localeCompare(b.csproj));
}

/**
 * Return the subset of projects that no other project references — the
 * minimum MSBuild entry points needed to compile every assembly. Given
 * the current graph (Core references Common, Core.Auth, Invoices),
 * this returns `[Core]`: one `dotnet build` call against Core cascades
 * through the whole set.
 */
export function findDotnetBuildRoots(projects: readonly DotnetProject[]): readonly DotnetProject[] {
  const referenced = new Set(projects.flatMap((p) => p.projectReferences));
  const roots = projects.filter((p) => !referenced.has(p.csproj));
  if (roots.length === 0) {
    throw new Error(".NET projects: every project is referenced by another — cyclic graph, cannot pick a build root.");
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
 * @param runner - Shared process runner used to dispatch build and documentation commands.
 * @param files - Injected filesystem capability.
 * @param apiRoot - Absolute path to `sites/api.arolariu.ro/`.
 * @param dotnetInternalsDir - Absolute path to `_generated/dotnet-internals/`.
 * @param signal - Invocation cancellation signal.
 */
async function runDotnetInternals(
  runner: ProcessRunner,
  files: FileSystem,
  apiRoot: string,
  dotnetInternalsDir: string,
  signal: AbortSignal,
): Promise<void> {
  const projects = await discoverDotnetProjects(files, apiRoot);
  const roots = findDotnetBuildRoots(projects);
  for (const root of roots) {
    await runner.expectSuccess(
      {command: "dotnet", args: ["build", root.csprojRelative, "-c", "Release"]},
      {cwd: apiRoot, output: "capture", signal},
    );
  }
  await files.createDirectory(dotnetInternalsDir, {recursive: true});
  for (const proj of projects) {
    const outDir = join(dotnetInternalsDir, proj.assemblyName);
    await files.createDirectory(outDir, {recursive: true});
    const dll = join(apiRoot, proj.binRelative, `${proj.assemblyName}.dll`);
    // DefaultDocumentation.Console is declared as a **local** tool in
    // `.config/dotnet-tools.json` and restored with `dotnet tool restore`.
    const {command, args} = getDefaultDocumentationCommand(dll, outDir);
    await runner.expectSuccess({command, args}, {cwd: apiRoot, output: "capture", signal});
  }
  await assertNonEmpty(files, dotnetInternalsDir, "defaultdocumentation");
}

/**
 * Invoke TypeDoc twice — once for `@arolariu/components`, once for
 * selected modules of the `arolariu.ro` website — emitting markdown
 * under `_generated/ts-reference/{components,website}/`.
 *
 * @param runner - Shared process runner used to dispatch TypeDoc.
 * @param files - Injected filesystem capability.
 * @param repoRoot - Absolute repository root, TypeDoc's working directory.
 * @param tsReferenceDir - Absolute path to `_generated/ts-reference/`.
 * @param signal - Invocation cancellation signal.
 */
async function runTypedoc(
  runner: ProcessRunner,
  files: FileSystem,
  repoRoot: string,
  tsReferenceDir: string,
  signal: AbortSignal,
): Promise<void> {
  await runner.expectSuccess(
    {command: "npx", args: ["typedoc", "--options", "typedoc.components.json"]},
    {cwd: repoRoot, output: "capture", signal},
  );
  await runner.expectSuccess(
    {command: "npx", args: ["typedoc", "--options", "typedoc.website.json"]},
    {cwd: repoRoot, output: "capture", signal},
  );
  await assertNonEmpty(files, tsReferenceDir, "typedoc");
}

/**
 * Rewrite CRLF line endings to LF throughout a directory tree.
 * `pydoc-markdown` emits CRLF on Windows which confuses the frontmatter
 * parser in {@link normalizeDirectory}; running this pass first keeps
 * the normalizer platform-agnostic.
 *
 * @param files - Injected filesystem capability.
 * @param dir - Absolute path to the root of the walk.
 */
async function normalizeLineEndings(files: FileSystem, dir: string): Promise<void> {
  for (const entry of await files.readDirectory(dir)) {
    const full = join(dir, entry.name);
    if (entry.kind === "directory") {
      await normalizeLineEndings(files, full);
    } else if (/\.mdx?$|\.json$/i.test(entry.name)) {
      const content = await files.readText(full);
      if (content.includes("\r\n")) {
        await files.writeText(full, content.replaceAll("\r\n", "\n"));
      }
    }
  }
}

/**
 * Run `pydoc-markdown` over `sites/exp.arolariu.ro/` using the config
 * file committed there. Output lands under `_generated/experimental/`.
 * Line endings are normalized after extraction so the downstream
 * frontmatter pass sees consistent `\n` separators.
 *
 * @param runner - Shared process runner used to dispatch pydoc-markdown.
 * @param files - Injected filesystem capability.
 * @param expRoot - Absolute path to `sites/exp.arolariu.ro/`.
 * @param pythonDir - Absolute path to `_generated/experimental/`.
 * @param signal - Invocation cancellation signal.
 */
async function runPydocMarkdown(
  runner: ProcessRunner,
  files: FileSystem,
  expRoot: string,
  pythonDir: string,
  signal: AbortSignal,
): Promise<void> {
  await runner.expectSuccess({command: "python", args: ["-m", "pydoc_markdown.main"]}, {cwd: expRoot, output: "capture", signal});
  await assertNonEmpty(files, pythonDir, "pydoc-markdown");
  // pydoc-markdown emits CRLF on Windows; normalize so downstream frontmatter parsers match on \n.
  await normalizeLineEndings(files, pythonDir);
}

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
 * @param files - Injected filesystem capability.
 * @param page - Tier root, title, summary, and route base for the landing page.
 */
async function writeLandingPage(files: FileSystem, {dir, title, summary, routeBase}: LandingPage): Promise<void> {
  if (!(await files.exists(dir))) return;
  const entries = await files.readDirectory(dir);
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
  const body = `\n# ${title}\n\n${summary}\n\n${bullets}\n`;
  const full = serializeFrontmatter({title, sidebar_position: 0}, body);
  await files.writeText(join(dir, "index.md"), full);
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
 * The `_generated` staging tree is invocation-transient until the whole pipeline succeeds: a
 * cleanup callback registered immediately after it is (re)created removes it again on any later
 * failure or cancellation, and is unregistered only once every remaining step — tier validation,
 * normalization, landing pages, and prose mirroring — has completed.
 *
 * @param context - Command context providing filesystem, process runner, task scheduler, and
 * cleanup capabilities.
 * @returns The ordered generated tiers and the number of extractor families that ran.
 */
async function executeDocsAssemble(context: Readonly<CommandExecutionContext>): Promise<DocumentationAssemblyResult> {
  const {files, runner, tasks, cleanup, signal} = context.runtime;
  const paths = await resolveRepositoryPaths(import.meta.url, files);

  const generatedRoot = join(paths.docsRoot, "_generated");
  const tsReferenceDir = join(generatedRoot, "ts-reference");
  const pythonDir = join(generatedRoot, "experimental");
  const dotnetInternalsDir = join(generatedRoot, "dotnet-internals");
  const proseDest = join(paths.docsRoot, "docs", "monorepo");
  const proseSrc = join(paths.root, "docs");

  await cleanGenerated(files, generatedRoot);
  const unregisterGeneratedCleanup = cleanup.register("generated documentation tree", () =>
    files.remove(generatedRoot, {recursive: true, force: true}),
  );

  // `allSettled` (not `parallel`) is required here: every extractor family must fully finish —
  // success or failure — before this command decides whether the invocation succeeded. Bailing
  // out on the first rejection while sibling extractors are still writing into `_generated` would
  // let a straggling extractor recreate content after the failure cleanup above already removed
  // the tree, violating the "no partial `_generated` tree survives a failure" contract.
  const outcomes = await tasks.allSettled(
    [
      () => runTypedoc(runner, files, paths.root, tsReferenceDir, signal),
      () => runPydocMarkdown(runner, files, paths.expRoot, pythonDir, signal),
      () => runDotnetInternals(runner, files, paths.apiRoot, dotnetInternalsDir, signal),
    ],
    signal,
  );
  const failedExtractor = outcomes.find((outcome): outcome is PromiseRejectedResult => outcome.status === "rejected");
  if (failedExtractor !== undefined) {
    throw failedExtractor.reason;
  }

  // Validate extractor output before normalization and synthetic landing pages
  // can obscure missing-tier failures.
  await assertExpectedDocumentationTiers(files, generatedRoot);
  await normalizeDirectory(files, tsReferenceDir);
  await normalizeDirectory(files, pythonDir);
  await normalizeDirectory(files, dotnetInternalsDir);
  // Navbar links target each plugin's routeBasePath (e.g. /internals/dotnet); without
  // an index.md at the tier root, Docusaurus has no page to serve there. Generate one
  // after normalization so the landing pages appear in the sidebar at position 0.
  await writeLandingPage(files, {
    dir: tsReferenceDir,
    title: "TypeScript reference",
    summary: "Generated from TSDoc / JSDoc comments across `@arolariu/components` and the `arolariu.ro` website.",
    routeBase: "/reference/typescript",
  });
  await writeLandingPage(files, {
    dir: pythonDir,
    title: "Experimental service (Python)",
    summary:
      "Internal documentation for `exp.arolariu.ro`, a FastAPI configuration-proxy service. Extracted from Google-style docstrings via `pydoc-markdown`.",
    routeBase: "/internals/experimental",
  });
  await writeLandingPage(files, {
    dir: dotnetInternalsDir,
    title: ".NET internals",
    summary:
      "Reference documentation for internal types, services, and brokers of `api.arolariu.ro`. Generated from XML doc comments via `DefaultDocumentation`.",
    routeBase: "/internals/dotnet",
  });
  await syncProse(files, proseSrc, proseDest);

  unregisterGeneratedCleanup();

  return {generatedTiers: GENERATED_TIER_IDENTITIES, extractorCount: 3};
}

/** The only edge from this entrypoint into the Node command host; core never names it. */
const loadProductionCommandHost = async (): Promise<CommandHost> =>
  import("./adapters/node/node-command-host.ts").then(({createNodeCommandHost}) => createNodeCommandHost("docs-assemble"));

/**
 * Creates the documentation assembly command.
 *
 * @param options - Injected command host or literal loader; defaults to the Node adapter.
 * @returns The typed `docs-assemble` command object.
 */
export function createDocsAssembleCommand(
  options: Readonly<CommandConstructionOptions> = {loadHost: loadProductionCommandHost},
): LazyMonorepoCommand<Record<never, never>, DocumentationAssemblyResult, never> {
  return defineCommand<Record<never, never>, DocumentationAssemblyResult>(
    {
      name: "docs-assemble",
      description:
        "Runs TypeDoc, pydoc-markdown, and DefaultDocumentation in parallel, normalizes frontmatter, writes landing pages, and mirrors prose into the Docusaurus source tree.",
      examples: ["npm run docs:assemble", "node --experimental-strip-types scripts/docs-assemble.ts"],
      configure: (program) => {
        program.allowExcessArguments(false);
      },
      decode: () => ({}),
      execute: (context) => executeDocsAssemble(context),
      complete: (result) => ({
        exitCode: 0,
        value: result,
        human: (logger) => {
          logger.success(
            `Assembled documentation from ${String(result.extractorCount)} extractor(s) across ${String(result.generatedTiers.length)} tier(s).`,
          );
        },
      }),
    },
    options,
  );
}

/** Production singleton used by `npm run docs:assemble` and this module's direct entrypoint. */
export const docsAssembleCommand: LazyMonorepoCommand<Record<never, never>, DocumentationAssemblyResult, never> =
  createDocsAssembleCommand();

await docsAssembleCommand.runIfMain(import.meta.url);
