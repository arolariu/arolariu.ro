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

import {cpSync, rmSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, existsSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn, type StdioOptions} from 'node:child_process';
import {normalizeDirectory} from './docs-assemble.normalize.ts';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const DOCS_ROOT = join(REPO_ROOT, 'sites', 'docs.arolariu.ro');
const GENERATED_ROOT = join(DOCS_ROOT, '_generated');
const PROSE_DEST = join(DOCS_ROOT, 'docs', 'monorepo');
const PROSE_SRC = join(REPO_ROOT, 'docs');

/**
 * .NET target framework shared across every project under
 * `sites/api.arolariu.ro/src/`. Declared centrally in
 * `api.arolariu.ro/Directory.Build.props`; duplicated here only so
 * {@link discoverDotnetProjects} can locate each project's built DLL
 * without parsing MSBuild props on every run.
 */
const DOTNET_TFM = 'net10.0';

/**
 * Commands that, on Windows, ship as `.cmd` shims rather than real
 * `.exe` binaries. `spawn` can't locate those without either the
 * explicit `.cmd` extension or `shell: true`, so we reserve
 * `shell: true` exclusively for this set. Everything else (dotnet,
 * python, DefaultDocumentation) is a real executable on PATH and
 * runs faster + safer without cmd.exe in between.
 */
const NPM_FAMILY_COMMANDS = new Set(['npm', 'npx', 'node']);

/**
 * Resolve a bare command name to an invocable form. On Windows, the
 * npm-family shims (`npm`, `npx`, `node`) are published as `.cmd` files,
 * which `child_process.spawn` can't locate without the extension when
 * `shell: false` — so we rewrite them here.
 */
function resolveCommand(command: string): string {
  if (process.platform !== 'win32') return command;
  if (NPM_FAMILY_COMMANDS.has(command)) return `${command}.cmd`;
  return command;
}

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
  rmSync(join(dest, 'superpowers'), {recursive: true, force: true});
}

/** Optional knobs for {@link runCommand}. */
export type RunOptions = {
  /**
   * When true, stdout and stderr are captured and returned as a single
   * string. When false (default), they stream live to the parent's TTY
   * via `stdio: 'inherit'`. Buffered mode is used by the parallel
   * extractor functions so their output doesn't interleave at the
   * terminal — each block is replayed as a whole after its extractor
   * finishes.
   */
  readonly buffered?: boolean;
};

/**
 * Spawn a child process and resolve when it exits with status 0.
 *
 * @param command - Command name, rewritten via {@link resolveCommand}
 *   so Windows callers can use `npm`/`npx`/`node` without `.cmd`.
 * @param args    - Argument vector. No shell interpolation: `shell:true`
 *   is set only for npm-family shims on Windows (required to locate the
 *   `.cmd` launcher); native binaries are spawned directly.
 * @param cwd     - Working directory for the child process.
 * @param options - See {@link RunOptions}.
 * @returns Captured output when `buffered: true`, otherwise the empty
 *   string. Non-zero exit rejects with the command line, exit code,
 *   and (when buffered) the last 2KB of output so CI logs surface the
 *   real failure instead of just "exited with N".
 */
export function runCommand(
  command: string,
  args: readonly string[],
  cwd: string,
  options: RunOptions = {},
): Promise<string> {
  const buffered = options.buffered === true;
  const isNpmFamily = NPM_FAMILY_COMMANDS.has(command);
  const shell = process.platform === 'win32' && isNpmFamily;
  const stdio: StdioOptions = buffered ? ['ignore', 'pipe', 'pipe'] : 'inherit';

  return new Promise<string>((resolvePromise, reject) => {
    const child = spawn(resolveCommand(command), args as string[], {cwd, stdio, shell});
    let output = '';
    if (buffered) {
      child.stdout?.setEncoding('utf8');
      child.stderr?.setEncoding('utf8');
      child.stdout?.on('data', (chunk: string) => { output += chunk; });
      child.stderr?.on('data', (chunk: string) => { output += chunk; });
    }
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) return resolvePromise(output);
      const tail = buffered && output ? `\n--- last output ---\n${output.slice(-2000)}` : '';
      reject(new Error(`${command} ${args.join(' ')} exited with ${code}${tail}`));
    });
  });
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
      else if (/\.mdx?$|\.json$/i.test(name)) count++;
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

const TS_REFERENCE_DIR = join(GENERATED_ROOT, 'ts-reference');
const PYTHON_DIR = join(GENERATED_ROOT, 'experimental');
const DOTNET_INTERNALS_DIR = join(GENERATED_ROOT, 'dotnet-internals');
const API_ROOT = join(REPO_ROOT, 'sites', 'api.arolariu.ro');

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
  const content = readFileSync(csprojPath, 'utf8');
  const refs: string[] = [];
  const regex = /<ProjectReference\s+Include\s*=\s*["']([^"']+)["']/g;
  for (let match: RegExpExecArray | null; (match = regex.exec(content)) !== null;) {
    const relPath = match[1].replaceAll('\\', '/');
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
export function discoverDotnetProjects(
  apiRoot: string = API_ROOT,
  tfm: string = DOTNET_TFM,
): readonly DotnetProject[] {
  const srcRoot = join(apiRoot, 'src');
  const projects: DotnetProject[] = [];
  for (const dir of readdirSync(srcRoot)) {
    const dirPath = join(srcRoot, dir);
    if (!statSync(dirPath).isDirectory()) continue;
    for (const file of readdirSync(dirPath)) {
      if (!file.endsWith('.csproj')) continue;
      const csproj = join(dirPath, file);
      projects.push({
        csproj,
        csprojRelative: `src/${dir}/${file}`,
        assemblyName: file.replace(/\.csproj$/, ''),
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
    throw new Error('.NET projects: every project is referenced by another — cyclic graph, cannot pick a build root.');
  }
  return roots;
}

/**
 * Discover every `.csproj` under `api.arolariu.ro/src/`, build the
 * minimum set of graph roots with one `dotnet build` call each (so
 * MSBuild covers the whole graph via ProjectReference transitivity),
 * then run `DefaultDocumentation` against each compiled DLL. Output
 * lands under `_generated/dotnet-internals/<assembly>/`.
 */
async function runDotnetInternals(): Promise<string> {
  let log = '';
  const projects = discoverDotnetProjects();
  const roots = findDotnetBuildRoots(projects);
  for (const root of roots) {
    log += await runCommand('dotnet', ['build', root.csprojRelative, '-c', 'Release'], API_ROOT, {buffered: true});
  }
  mkdirSync(DOTNET_INTERNALS_DIR, {recursive: true});
  for (const proj of projects) {
    const outDir = join(DOTNET_INTERNALS_DIR, proj.assemblyName);
    mkdirSync(outDir, {recursive: true});
    const dll = join(API_ROOT, proj.binRelative, `${proj.assemblyName}.dll`);
    // DefaultDocumentation is installed globally (via `dotnet tool install
    // --global`) — see sites/docs.arolariu.ro/README.md for the one-time
    // local setup command. Invoking the executable directly (instead of
    // `dotnet tool run`) removes the need for a repo-level tool manifest.
    log += await runCommand(
      'DefaultDocumentation',
      ['--AssemblyFilePath', dll,
       '--OutputDirectoryPath', outDir,
       '--FileNameFactory', 'Name',
       '--GeneratedPages', 'Namespaces'],
      API_ROOT,
      {buffered: true},
    );
  }
  assertNonEmpty(DOTNET_INTERNALS_DIR, 'defaultdocumentation');
  return log;
}

/**
 * Invoke TypeDoc twice — once for `@arolariu/components`, once for
 * selected modules of the `arolariu.ro` website — emitting markdown
 * under `_generated/ts-reference/{components,website}/`.
 */
async function runTypedoc(): Promise<string> {
  let log = '';
  log += await runCommand('npx', ['typedoc', '--options', 'typedoc.components.json'], REPO_ROOT, {buffered: true});
  log += await runCommand('npx', ['typedoc', '--options', 'typedoc.website.json'], REPO_ROOT, {buffered: true});
  assertNonEmpty(TS_REFERENCE_DIR, 'typedoc');
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
      const content = readFileSync(full, 'utf8');
      if (content.includes('\r\n')) writeFileSync(full, content.replaceAll('\r\n', '\n'));
    }
  }
}

/**
 * Run `pydoc-markdown` over `sites/exp.arolariu.ro/` using the config
 * file committed there. Output lands under `_generated/experimental/`.
 * Line endings are normalized after extraction so the downstream
 * frontmatter pass sees consistent `\n` separators.
 */
async function runPydocMarkdown(): Promise<string> {
  const expDir = join(REPO_ROOT, 'sites', 'exp.arolariu.ro');
  const log = await runCommand('python', ['-m', 'pydoc_markdown.main'], expDir, {buffered: true});
  assertNonEmpty(PYTHON_DIR, 'pydoc-markdown');
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
  const bullets = children.map((name) => {
    const label = name.replace(/\.mdx?$/i, '');
    const href = statSync(join(dir, name)).isDirectory() ? `${routeBase}/${label}/` : `${routeBase}/${label}`;
    return `- [${label}](${href})`;
  }).join('\n');
  const body = `---\ntitle: ${title}\nsidebar_position: 0\n---\n\n# ${title}\n\n${summary}\n\n${bullets}\n`;
  writeFileSync(join(dir, 'index.md'), body);
}

/** Write a labeled block of buffered extractor output to stdout. */
function flushExtractorLog(label: string, body: string): void {
  if (body.length === 0) return;
  process.stdout.write(`\n=== ${label} ===\n`);
  process.stdout.write(body.endsWith('\n') ? body : `${body}\n`);
}

/**
 * Entry point. Runs the three markdown-producing extractors in parallel
 * with their stdio buffered so output from one doesn't interleave with
 * another, replays each block in a fixed order once they all finish,
 * normalizes each tier's frontmatter, writes landing pages, and mirrors
 * prose. Designed to be idempotent — see module-level docs.
 */
async function main(): Promise<void> {
  cleanGenerated();
  const [tsOut, pyOut, dotnetOut] = await Promise.all([
    runTypedoc(),
    runPydocMarkdown(),
    runDotnetInternals(),
  ]);
  flushExtractorLog('TypeScript (TypeDoc)', tsOut);
  flushExtractorLog('Python (pydoc-markdown)', pyOut);
  flushExtractorLog('.NET internals (DefaultDocumentation)', dotnetOut);
  await normalizeDirectory(TS_REFERENCE_DIR);
  await normalizeDirectory(PYTHON_DIR);
  await normalizeDirectory(DOTNET_INTERNALS_DIR);
  // Navbar links target each plugin's routeBasePath (e.g. /internals/dotnet); without
  // an index.md at the tier root, Docusaurus has no page to serve there. Generate one
  // after normalization so the landing pages appear in the sidebar at position 0.
  writeLandingPage({
    dir: TS_REFERENCE_DIR,
    title: 'TypeScript reference',
    summary: 'Generated from TSDoc / JSDoc comments across `@arolariu/components` and the `arolariu.ro` website.',
    routeBase: '/reference/typescript',
  });
  writeLandingPage({
    dir: PYTHON_DIR,
    title: 'Experimental service (Python)',
    summary: 'Internal documentation for `exp.arolariu.ro`, a FastAPI configuration-proxy service. Extracted from Google-style docstrings via `pydoc-markdown`.',
    routeBase: '/internals/experimental',
  });
  writeLandingPage({
    dir: DOTNET_INTERNALS_DIR,
    title: '.NET internals',
    summary: 'Reference documentation for internal types, services, and brokers of `api.arolariu.ro`. Generated from XML doc comments via `DefaultDocumentation`.',
    routeBase: '/internals/dotnet',
  });
  await syncProse(PROSE_SRC, PROSE_DEST);
}

// Robust entrypoint guard: compare the fully-resolved URL of this module
// against the URL form of argv[1] so that relative paths, symlinks, and
// different runtime invocation styles all agree. Prevents main() from
// running when the module is imported by Vitest or other test harnesses.
const invokedAsEntrypoint = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(entry).href;
  } catch {
    return false;
  }
})();

if (invokedAsEntrypoint) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
