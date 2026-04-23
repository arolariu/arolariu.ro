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
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {normalizeDirectory} from './docs-assemble.normalize.ts';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const DOCS_ROOT = join(REPO_ROOT, 'sites', 'docs.arolariu.ro');
const GENERATED_ROOT = join(DOCS_ROOT, '_generated');
const PROSE_DEST = join(DOCS_ROOT, 'docs', 'monorepo');
const PROSE_SRC = join(REPO_ROOT, 'docs');

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

/**
 * Spawn a child process and resolve the returned Promise when it exits
 * with status 0, otherwise reject with a descriptive error. Stdio is
 * inherited so extractor output streams directly into the caller's
 * console.
 *
 * @param command - Command name, rewritten via {@link resolveCommand}
 *   so Windows callers can use `npm`/`npx`/`node` without `.cmd`.
 * @param args    - Argument vector; no shell interpolation happens.
 * @param cwd     - Working directory for the child process.
 */
export function runCommand(command: string, args: readonly string[], cwd: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(resolveCommand(command), args, {cwd, stdio: 'inherit', shell: process.platform === 'win32'});
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
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
 * One of the four .NET projects whose XML docs are exposed on the docs
 * site. {@link runDotnetInternals} builds each entry independently and
 * then feeds its compiled DLL into `DefaultDocumentation`.
 */
type DotnetProject = {
  /** Path to the `.csproj` file, relative to `sites/api.arolariu.ro/`. */
  readonly csproj: string;
  /** Final assembly filename without the `.dll` extension. */
  readonly assemblyName: string;
  /** Directory (relative to the API root) containing the built DLL. */
  readonly binRelative: string;
};

const DOTNET_PROJECTS: readonly DotnetProject[] = [
  {csproj: 'src/Common/arolariu.Backend.Common.csproj', assemblyName: 'arolariu.Backend.Common', binRelative: 'src/Common/bin/Release/net10.0'},
  {csproj: 'src/Core/arolariu.Backend.Core.csproj', assemblyName: 'arolariu.Backend.Core', binRelative: 'src/Core/bin/Release/net10.0'},
  {csproj: 'src/Core.Auth/arolariu.Backend.Core.Auth.csproj', assemblyName: 'arolariu.Backend.Core.Auth', binRelative: 'src/Core.Auth/bin/Release/net10.0'},
  {csproj: 'src/Invoices/arolariu.Backend.Domain.Invoices.csproj', assemblyName: 'arolariu.Backend.Domain.Invoices', binRelative: 'src/Invoices/bin/Release/net10.0'},
];

/**
 * Build every .NET project in {@link DOTNET_PROJECTS} once, then run
 * `DefaultDocumentation` against each compiled DLL to emit namespace
 * pages into `_generated/dotnet-internals/<assembly>/`.
 */
async function runDotnetInternals(): Promise<void> {
  for (const proj of DOTNET_PROJECTS) {
    await runCommand('dotnet', ['build', proj.csproj, '-c', 'Release'], API_ROOT);
  }
  mkdirSync(DOTNET_INTERNALS_DIR, {recursive: true});
  for (const proj of DOTNET_PROJECTS) {
    const outDir = join(DOTNET_INTERNALS_DIR, proj.assemblyName);
    mkdirSync(outDir, {recursive: true});
    const dll = join(API_ROOT, proj.binRelative, `${proj.assemblyName}.dll`);
    // DefaultDocumentation is installed globally (via `dotnet tool install
    // --global`) — see sites/docs.arolariu.ro/README.md for the one-time
    // local setup command. Invoking the executable directly (instead of
    // `dotnet tool run`) removes the need for a repo-level tool manifest.
    await runCommand(
      'DefaultDocumentation',
      ['--AssemblyFilePath', dll,
       '--OutputDirectoryPath', outDir,
       '--FileNameFactory', 'Name',
       '--GeneratedPages', 'Namespaces'],
      API_ROOT,
    );
  }
  assertNonEmpty(DOTNET_INTERNALS_DIR, 'defaultdocumentation');
}

/**
 * Invoke TypeDoc twice — once for `@arolariu/components`, once for
 * selected modules of the `arolariu.ro` website — emitting markdown
 * under `_generated/ts-reference/{components,website}/`.
 */
async function runTypedoc(): Promise<void> {
  await runCommand('npx', ['typedoc', '--options', 'typedoc.components.json'], REPO_ROOT);
  await runCommand('npx', ['typedoc', '--options', 'typedoc.website.json'], REPO_ROOT);
  assertNonEmpty(TS_REFERENCE_DIR, 'typedoc');
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
async function runPydocMarkdown(): Promise<void> {
  const expDir = join(REPO_ROOT, 'sites', 'exp.arolariu.ro');
  await runCommand('python', ['-m', 'pydoc_markdown.main'], expDir);
  assertNonEmpty(PYTHON_DIR, 'pydoc-markdown');
  // pydoc-markdown emits CRLF on Windows; normalize so downstream frontmatter parsers match on \n.
  normalizeLineEndings(PYTHON_DIR);
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

/**
 * Entry point. Runs the three markdown-producing extractors in parallel,
 * normalizes each tier's frontmatter, writes landing pages, and mirrors
 * prose. Designed to be idempotent — see module-level docs.
 */
async function main(): Promise<void> {
  cleanGenerated();
  await Promise.all([runTypedoc(), runPydocMarkdown(), runDotnetInternals()]);
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
