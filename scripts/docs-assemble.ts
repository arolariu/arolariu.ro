/**
 * @fileoverview Docs pipeline orchestrator for `sites/docs.arolariu.ro`.
 *
 * @remarks
 * Runs the three markdown-producing extractors in parallel (TypeDoc,
 * pydoc-markdown, DefaultDocumentation), normalizes the generated
 * frontmatter, writes per-tier landing index pages, and mirrors
 * `/docs/` prose into the Docusaurus source tree under `docs/monorepo/`.
 *
 * HTTP API reference is intentionally excluded: `api.arolariu.ro`
 * hosts Swagger UI from the live OpenAPI spec, so re-publishing the
 * spec here would just duplicate that browser.
 *
 * Invoked via `npm run docs:assemble` before `npm run build:docs` /
 * `dev:docs`. Designed to be idempotent — each run starts by cleaning
 * the staging dir (`sites/docs.arolariu.ro/_generated/`) so CI builds
 * behave the same as a fresh local clone.
 */

import {cpSync, rmSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, existsSync} from "node:fs";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {commanderExitCode, createToolProgram} from "./common/cli.ts";
import {MonorepositoryConsoleLogger, type MonorepositoryLogger} from "./common/logger.ts";
import {defaultCommandRunner, formatCommand, type CommandRunner, type CommandSpec} from "./common/process.ts";
import {normalizeDirectory, serializeFrontmatter} from "./docs-assemble.normalize.ts";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const DOCS_ROOT = join(REPO_ROOT, "sites", "docs.arolariu.ro");
const GENERATED_ROOT = join(DOCS_ROOT, "_generated");
const PROSE_DEST = join(DOCS_ROOT, "docs", "monorepo");
const PROSE_SRC = join(REPO_ROOT, "docs");

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
 */
export async function syncProse(src: string, dest: string): Promise<void> {
  rmSync(dest, {recursive: true, force: true});
  mkdirSync(dest, {recursive: true});
  cpSync(src, dest, {recursive: true});
  rmSync(join(dest, "superpowers"), {recursive: true, force: true});
}

/**
 * Runs one command through the shared {@link CommandRunner} in capture mode, collecting stdout and
 * stderr. Throws with a concise bounded excerpt on spawn failure or nonzero exit so CI logs
 * always surface the real failure without overwhelming the terminal.
 *
 * @param runner - Shared command runner.
 * @param command - Executable and arguments.
 * @param cwd - Working directory for the child process.
 * @returns Combined stdout + stderr captured from the process.
 */
async function runCapture(runner: CommandRunner, command: Readonly<CommandSpec>, cwd: string): Promise<string> {
  const result = await runner.run(command, {cwd, output: "capture"});
  if (result.spawnError !== undefined) {
    throw new Error(`${formatCommand(command)}: spawn failed — ${result.spawnError}`);
  }
  if (result.code !== 0) {
    const combined = (result.stdout + result.stderr).trimEnd();
    const excerpt = combined.length > 0 ? combined.slice(-2000) : "(no output)";
    throw new Error(`${formatCommand(command)}: exited with ${result.code}\n--- last output ---\n${excerpt}`);
  }
  return result.stdout + result.stderr;
}

/**
 * Guardrail to catch silent-failure cases where an extractor exits 0
 * but produces no content. Throws if the given directory is missing or
 * contains zero `.md`/`.mdx`/`.json` files.
 *
 * @param dir   - Absolute path expected to contain extractor output.
 * @param label - Short human-readable name used in the thrown error
 *   message (for example `'typedoc'`, `'pydoc-markdown'`).
 */
export function assertNonEmpty(dir: string, label: string): void {
  if (!existsSync(dir)) throw new Error(`${label}: expected directory not found at ${dir}`);
  let count = 0;
  const walk = (d: string): void => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (isDocumentationOutputFile(name)) count++;
    }
  };
  walk(dir);
  if (count === 0) throw new Error(`${label}: extracted 0 files into ${dir}`);
}

/**
 * Reset the `_generated/` staging directory. Ensures each run starts
 * from a known-empty state so stale extractor output from a previous
 * build can never survive into the current one.
 */
export function cleanGenerated(): void {
  rmSync(GENERATED_ROOT, {recursive: true, force: true});
  mkdirSync(GENERATED_ROOT, {recursive: true});
}

const TS_REFERENCE_DIR = join(GENERATED_ROOT, "ts-reference");
const PYTHON_DIR = join(GENERATED_ROOT, "experimental");
const DOTNET_INTERNALS_DIR = join(GENERATED_ROOT, "dotnet-internals");
const API_ROOT = join(REPO_ROOT, "sites", "api.arolariu.ro");

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

const ROOT_LANDING_FILE_NAMES = new Set(["index.md", "index.mdx", "readme.md", "readme.mdx"]);

function isDocumentationOutputFile(fileName: string): boolean {
  return /\.mdx?$|\.json$/i.test(fileName);
}

function countExtractorOutputFiles(dir: string, isRoot: boolean = true): number {
  let count = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      count += countExtractorOutputFiles(full, false);
    } else if (isDocumentationOutputFile(name) && !(isRoot && ROOT_LANDING_FILE_NAMES.has(name.toLowerCase()))) {
      count++;
    }
  }
  return count;
}

/**
 * Verify that every documentation tier mounted by Docusaurus contains extractor output.
 *
 * @param generatedRoot - Root `_generated` directory to validate.
 */
export function assertExpectedDocumentationTiers(generatedRoot: string = GENERATED_ROOT): void {
  for (const tier of REQUIRED_DOCUMENTATION_TIERS) {
    const tierRoot = join(generatedRoot, tier.relativePath);
    if (!existsSync(tierRoot)) throw new Error(`${tier.label}: expected directory not found at ${tierRoot}`);
    if (countExtractorOutputFiles(tierRoot) === 0) {
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
function parseProjectReferences(csprojPath: string): readonly string[] {
  const content = readFileSync(csprojPath, "utf8");
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
 */
export function discoverDotnetProjects(apiRoot: string = API_ROOT, tfm: string = DOTNET_TFM): readonly DotnetProject[] {
  const srcRoot = join(apiRoot, "src");
  const projects: DotnetProject[] = [];
  for (const dir of readdirSync(srcRoot)) {
    const dirPath = join(srcRoot, dir);
    if (!statSync(dirPath).isDirectory()) continue;
    for (const file of readdirSync(dirPath)) {
      if (!file.endsWith(".csproj")) continue;
      const csproj = join(dirPath, file);
      projects.push({
        csproj,
        csprojRelative: `src/${dir}/${file}`,
        assemblyName: file.replace(/\.csproj$/, ""),
        binRelative: `src/${dir}/bin/Release/${tfm}`,
        projectReferences: parseProjectReferences(csproj),
      });
    }
  }
  return projects.sort((a, b) => a.csproj.localeCompare(b.csproj));
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
 * @param runner - Shared command runner used to dispatch build and documentation commands.
 */
async function runDotnetInternals(runner: CommandRunner): Promise<string> {
  let log = "";
  const projects = discoverDotnetProjects();
  const roots = findDotnetBuildRoots(projects);
  for (const root of roots) {
    log += await runCapture(runner, {command: "dotnet", args: ["build", root.csprojRelative, "-c", "Release"]}, API_ROOT);
  }
  mkdirSync(DOTNET_INTERNALS_DIR, {recursive: true});
  for (const proj of projects) {
    const outDir = join(DOTNET_INTERNALS_DIR, proj.assemblyName);
    mkdirSync(outDir, {recursive: true});
    const dll = join(API_ROOT, proj.binRelative, `${proj.assemblyName}.dll`);
    // DefaultDocumentation.Console is declared as a **local** tool in
    // `.config/dotnet-tools.json` and restored with `dotnet tool restore`.
    const {command, args} = getDefaultDocumentationCommand(dll, outDir);
    log += await runCapture(runner, {command, args}, API_ROOT);
  }
  assertNonEmpty(DOTNET_INTERNALS_DIR, "defaultdocumentation");
  return log;
}

/**
 * Invoke TypeDoc twice — once for `@arolariu/components`, once for
 * selected modules of the `arolariu.ro` website — emitting markdown
 * under `_generated/ts-reference/{components,website}/`.
 *
 * @param runner - Shared command runner used to dispatch TypeDoc.
 */
async function runTypedoc(runner: CommandRunner): Promise<string> {
  let log = "";
  log += await runCapture(runner, {command: "npx", args: ["typedoc", "--options", "typedoc.components.json"]}, REPO_ROOT);
  log += await runCapture(runner, {command: "npx", args: ["typedoc", "--options", "typedoc.website.json"]}, REPO_ROOT);
  assertNonEmpty(TS_REFERENCE_DIR, "typedoc");
  return log;
}

/**
 * Rewrite CRLF line endings to LF throughout a directory tree.
 * `pydoc-markdown` emits CRLF on Windows which confuses the frontmatter
 * parser in {@link normalizeDirectory}; running this pass first keeps
 * the normalizer platform-agnostic.
 */
function normalizeLineEndings(dir: string): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) normalizeLineEndings(full);
    else if (/\.mdx?$|\.json$/i.test(name)) {
      const content = readFileSync(full, "utf8");
      if (content.includes("\r\n")) writeFileSync(full, content.replaceAll("\r\n", "\n"));
    }
  }
}

/**
 * Run `pydoc-markdown` over `sites/exp.arolariu.ro/` using the config
 * file committed there. Output lands under `_generated/experimental/`.
 * Line endings are normalized after extraction so the downstream
 * frontmatter pass sees consistent `\n` separators.
 *
 * @param runner - Shared command runner used to dispatch pydoc-markdown.
 */
async function runPydocMarkdown(runner: CommandRunner): Promise<string> {
  const expDir = join(REPO_ROOT, "sites", "exp.arolariu.ro");
  const log = await runCapture(runner, {command: "python", args: ["-m", "pydoc_markdown.main"]}, expDir);
  assertNonEmpty(PYTHON_DIR, "pydoc-markdown");
  // pydoc-markdown emits CRLF on Windows; normalize so downstream frontmatter parsers match on \n.
  normalizeLineEndings(PYTHON_DIR);
  return log;
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
 */
function writeLandingPage({dir, title, summary, routeBase}: LandingPage): void {
  if (!existsSync(dir)) return;
  const children = readdirSync(dir)
    .filter((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() || /\.mdx?$/i.test(name);
    })
    .filter((name) => !/^index\.mdx?$/i.test(name))
    .sort();
  const bullets = children
    .map((name) => {
      const label = name.replace(/\.mdx?$/i, "");
      const href = statSync(join(dir, name)).isDirectory() ? `${routeBase}/${label}/` : `${routeBase}/${label}`;
      return `- [${label}](${href})`;
    })
    .join("\n");
  const body = `\n# ${title}\n\n${summary}\n\n${bullets}\n`;
  const full = serializeFrontmatter({title, sidebar_position: 0}, body);
  writeFileSync(join(dir, "index.md"), full);
}

/**
 * Write a labeled block of buffered extractor output to the active logger.
 *
 * @param label - Extractor label used as the block heading.
 * @param body - Buffered extractor output.
 * @param logger - Logger used to preserve the assembled output bytes.
 */
export function flushExtractorLog(label: string, body: string, logger: MonorepositoryLogger): void {
  if (body.length === 0) return;
  logger.write(`\n=== ${label} ===\n`);
  logger.write(body.endsWith("\n") ? body : `${body}\n`);
}

/** Example CLI invocations rendered in `--help` output. */
const ASSEMBLE_EXAMPLES: readonly string[] = ["npm run docs:assemble", "node --experimental-strip-types scripts/docs-assemble.ts"];

/**
 * Boundary values {@link main} needs to execute the assembly pipeline.
 *
 * @remarks
 * Exported so tests can inject a deterministic {@link CommandRunner} and
 * {@link MonorepositoryLogger} without touching live tool executables.
 */
export interface AssembleDependencies {
  /** Executes extractor commands. Defaults to {@link defaultCommandRunner}. */
  readonly runner: CommandRunner;
  /** Receives assembly presentation and semantic output. */
  readonly logger: MonorepositoryLogger;
}

/**
 * Docs assembly CLI entrypoint.
 *
 * @remarks
 * Commander owns `--help`/`-h`/`/h` and every option-parse error: help
 * exits zero and runs no extractors; an unknown option or excess positional
 * argument exits one without running any extractor. Assembly errors are
 * caught, logged with a concise bounded excerpt, and returned as exit code 1.
 *
 * @param argv - Arguments following the entrypoint. Defaults to `process.argv.slice(2)`.
 * @param dependencies - Optional boundary replacements, primarily for tests.
 * @returns Process exit code.
 */
export async function main(
  argv: readonly string[] = process.argv.slice(2),
  dependencies: Readonly<Partial<AssembleDependencies>> = {},
): Promise<number> {
  const logger = dependencies.logger ?? new MonorepositoryConsoleLogger("docs::assemble");

  const program = createToolProgram({
    name: "docs-assemble",
    description:
      "Runs TypeDoc, pydoc-markdown, and DefaultDocumentation in parallel, normalizes frontmatter, writes landing pages, and mirrors prose into the Docusaurus source tree.",
    examples: ASSEMBLE_EXAMPLES,
    logger,
  });
  program.allowExcessArguments(false);

  try {
    program.parse(argv, {from: "user"});
  } catch (error: unknown) {
    return commanderExitCode(error) ?? 1;
  }

  const runner = dependencies.runner ?? defaultCommandRunner;

  try {
    cleanGenerated();
    const [tsOut, pyOut, dotnetOut] = await Promise.all([runTypedoc(runner), runPydocMarkdown(runner), runDotnetInternals(runner)]);
    flushExtractorLog("TypeScript (TypeDoc)", tsOut, logger.child("typedoc"));
    flushExtractorLog("Python (pydoc-markdown)", pyOut, logger.child("pydoc-markdown"));
    flushExtractorLog(".NET internals (DefaultDocumentation)", dotnetOut, logger.child("defaultdocumentation"));
    // Validate extractor output before normalization and synthetic landing pages
    // can obscure missing-tier failures.
    assertExpectedDocumentationTiers();
    await normalizeDirectory(TS_REFERENCE_DIR);
    await normalizeDirectory(PYTHON_DIR);
    await normalizeDirectory(DOTNET_INTERNALS_DIR);
    // Navbar links target each plugin's routeBasePath (e.g. /internals/dotnet); without
    // an index.md at the tier root, Docusaurus has no page to serve there. Generate one
    // after normalization so the landing pages appear in the sidebar at position 0.
    writeLandingPage({
      dir: TS_REFERENCE_DIR,
      title: "TypeScript reference",
      summary: "Generated from TSDoc / JSDoc comments across `@arolariu/components` and the `arolariu.ro` website.",
      routeBase: "/reference/typescript",
    });
    writeLandingPage({
      dir: PYTHON_DIR,
      title: "Experimental service (Python)",
      summary:
        "Internal documentation for `exp.arolariu.ro`, a FastAPI configuration-proxy service. Extracted from Google-style docstrings via `pydoc-markdown`.",
      routeBase: "/internals/experimental",
    });
    writeLandingPage({
      dir: DOTNET_INTERNALS_DIR,
      title: ".NET internals",
      summary:
        "Reference documentation for internal types, services, and brokers of `api.arolariu.ro`. Generated from XML doc comments via `DefaultDocumentation`.",
      routeBase: "/internals/dotnet",
    });
    await syncProse(PROSE_SRC, PROSE_DEST);
    return 0;
  } catch (error: unknown) {
    logger.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    return 1;
  }
}

const entrypointPath = process.argv[1];
if (entrypointPath !== undefined && fileURLToPath(import.meta.url) === resolve(entrypointPath)) {
  main()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      new MonorepositoryConsoleLogger("docs::assemble").error(error instanceof Error ? (error.stack ?? error.message) : String(error));
      process.exitCode = 1;
    });
}
