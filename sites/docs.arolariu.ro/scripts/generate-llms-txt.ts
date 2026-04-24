/**
 * @fileoverview Build-time generator for `/llms.txt`.
 *
 * @remarks
 * Walks the finished Docusaurus `build/` output, extracts title +
 * description + URL for every real page (skipping `/404` and
 * `/search`), groups pages by section, and writes a short index to
 * `build/llms.txt`. The format follows the emerging `llms.txt`
 * convention — a plaintext table of contents LLM agents can fetch
 * and parse without rendering HTML.
 *
 * The sibling `llms-full.txt` concatenated transcript was explored
 * and removed (see commit 9f3bb530) because the site is large
 * enough that the full concatenation forced aggressive truncation
 * that degraded the signal without helping consumers.
 */

import {readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import {parse} from 'node-html-parser';

/** Absolute path to the docs-site root. */
const ROOT = resolve(import.meta.dirname, '..');
/** Absolute path to the Docusaurus build output. */
const BUILD = resolve(ROOT, 'build');
/** Canonical public URL of the site — used to build absolute links. */
const SITE_URL = 'https://docs.arolariu.ro';

/** Extracted metadata for a single HTML page in the build tree. */
type Page = {
  /** Absolute public URL of the page. */
  url: string;
  /** Title for the index line (derived from `<title>`). */
  title: string;
  /** Short description (from `<meta name="description">`), may be empty. */
  description: string;
  /** Path relative to `build/`, used for section bucketing. */
  pathFromBuild: string;
};

/**
 * Recursively collect every `.html` file under `dir`. Used to discover
 * the full set of pages Docusaurus emitted into `build/`.
 */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.html')) out.push(full);
  }
  return out;
}

/**
 * Translate a `build/`-relative path into a public URL path. Strips
 * the `.html` suffix (and any lingering `index.html` segment) and
 * drops a trailing slash so each page is referenced by its canonical
 * slug-free URL. The root page is the one exception — it returns
 * `/` so the site landing isn't emitted as an empty string.
 */
function toUrlPath(pathFromBuild: string): string {
  if (pathFromBuild === 'index.html') return '/';
  const trimmed = pathFromBuild.replace(/index\.html$/, '').replace(/\.html$/, '');
  return `/${trimmed}`.replace(/\/$/, '') || '/';
}

/**
 * Extract a {@link Page} from one built HTML file, or return `null`
 * when the file isn't indexable — empty main element, too little
 * extractable text, or the 404/search routes.
 */
function extract(htmlPath: string): Page | null {
  const html = readFileSync(htmlPath, 'utf8');
  const dom = parse(html);
  const titleTag = dom.querySelector('title');
  const descMeta = dom.querySelector('meta[name="description"]');
  const article = dom.querySelector('main article, .markdown, main');
  if (!article) return null;
  const text = article.text.replace(/\s+/g, ' ').trim();
  if (text.length < 40) return null;
  const pathFromBuild = relative(BUILD, htmlPath).replaceAll('\\', '/');
  if (pathFromBuild.startsWith('404') || pathFromBuild.startsWith('search')) return null;
  return {
    url: `${SITE_URL}${toUrlPath(pathFromBuild)}`,
    title: titleTag?.text.replace(/\s*\|\s*arolariu\.ro docs$/, '').trim() ?? '(untitled)',
    description: descMeta?.getAttribute('content') ?? '',
    pathFromBuild,
  };
}

/**
 * Render a single `## Section` block with up to 12 bullet entries.
 * Returns an empty string when there's nothing to render so empty
 * sections don't appear in the output.
 */
function renderSection(title: string, entries: readonly Page[]): string {
  if (entries.length === 0) return '';
  const lines = entries.slice(0, 12).map((p) => `- [${p.title}](${p.url}): ${p.description || ''}`.trim());
  return `## ${title}\n${lines.join('\n')}\n`;
}

/**
 * Bucket pages by section (docs / reference / guides / RFCs) and
 * compose the final `llms.txt` body. The bucketing heuristic keys
 * off each page's `pathFromBuild` prefix.
 */
function buildShortIndex(pages: readonly Page[]): string {
  const groups = {
    landing: pages.filter((p) => p.pathFromBuild === 'index.html'),
    intro: pages.filter((p) => p.pathFromBuild.startsWith('intro/')),
    rfc: pages.filter((p) => p.pathFromBuild.startsWith('monorepo/rfc/')),
    backend: pages.filter((p) => p.pathFromBuild.startsWith('monorepo/backend/')),
    frontend: pages.filter((p) => p.pathFromBuild.startsWith('monorepo/frontend/')),
    dotnet: pages.filter((p) => p.pathFromBuild.startsWith('internals/dotnet/') && p.pathFromBuild.split('/').length <= 3),
    ts: pages.filter((p) => p.pathFromBuild.startsWith('reference/typescript/') && p.pathFromBuild.split('/').length <= 4),
    python: pages.filter((p) => p.pathFromBuild.startsWith('internals/experimental/') && p.pathFromBuild.split('/').length <= 4),
  };
  return [
    '# arolariu.ro docs',
    '> Unified developer reference for api.arolariu.ro (.NET), arolariu.ro (TypeScript), and exp.arolariu.ro (Python).',
    '',
    renderSection('Docs', [...groups.landing, ...groups.intro]),
    renderSection('Reference — .NET internals', groups.dotnet),
    renderSection('Reference — TypeScript', groups.ts),
    renderSection('Reference — Experimental (Python)', groups.python),
    renderSection('Guides — Backend', groups.backend),
    renderSection('Guides — Frontend', groups.frontend),
    renderSection('RFCs', groups.rfc),
  ].filter(Boolean).join('\n');
}

/**
 * Walk the build tree, bucket pages, and write `build/llms.txt`.
 * Invoked by the postbuild hook after `docusaurus build` completes.
 */
export function generate(): void {
  const htmlFiles = walk(BUILD);
  const pages = htmlFiles.map(extract).filter((p): p is Page => p !== null);
  const shortIndex = buildShortIndex(pages);
  writeFileSync(join(BUILD, 'llms.txt'), shortIndex);
  console.log(`[llms] wrote llms.txt (${Buffer.byteLength(shortIndex, 'utf8')} bytes) indexing ${pages.length} pages`);
}
