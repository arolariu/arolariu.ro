import {readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import {parse} from 'node-html-parser';

const ROOT = resolve(import.meta.dirname, '..');
const BUILD = resolve(ROOT, 'build');
const SITE_URL = 'https://docs.arolariu.ro';
const FULL_MAX_BYTES = 2 * 1024 * 1024;
const PER_PAGE_MAX_CHARS = 50_000;

type Page = {
  url: string;
  title: string;
  description: string;
  text: string;
  pathFromBuild: string;
};

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

function toUrlPath(pathFromBuild: string): string {
  if (pathFromBuild === 'index.html') return '/';
  const trimmed = pathFromBuild.replace(/index\.html$/, '').replace(/\.html$/, '');
  return `/${trimmed}`.replace(/\/$/, '') || '/';
}

function extract(htmlPath: string): Page | null {
  const html = readFileSync(htmlPath, 'utf8');
  const dom = parse(html);
  const titleTag = dom.querySelector('title');
  const descMeta = dom.querySelector('meta[name="description"]');
  const article = dom.querySelector('main article, .markdown, main');
  if (!article) return null;
  article.querySelectorAll('nav, footer, aside, [role="navigation"], .theme-doc-toc-desktop, .theme-doc-toc-mobile, .theme-doc-sidebar-container, .pagination-nav').forEach((n) => n.remove());
  const text = article.text.replace(/\s+/g, ' ').trim();
  if (text.length < 40) return null;
  const pathFromBuild = relative(BUILD, htmlPath).replaceAll('\\', '/');
  if (pathFromBuild.startsWith('404') || pathFromBuild.startsWith('search')) return null;
  return {
    url: `${SITE_URL}${toUrlPath(pathFromBuild)}`,
    title: titleTag?.text.replace(/\s*\|\s*arolariu\.ro docs$/, '').trim() ?? '(untitled)',
    description: descMeta?.getAttribute('content') ?? '',
    text,
    pathFromBuild,
  };
}

function renderSection(title: string, entries: readonly Page[]): string {
  if (entries.length === 0) return '';
  const lines = entries.slice(0, 12).map((p) => `- [${p.title}](${p.url}): ${p.description || ''}`.trim());
  return `## ${title}\n${lines.join('\n')}\n`;
}

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

function buildFullConcat(pages: readonly Page[]): string {
  let out = '';
  const body = (p: Page): string => {
    const text = p.text.length > PER_PAGE_MAX_CHARS
      ? `${p.text.slice(0, PER_PAGE_MAX_CHARS)}\n[... ${p.text.length - PER_PAGE_MAX_CHARS} chars truncated]`
      : p.text;
    return `URL: ${p.url}\nTITLE: ${p.title}\n\n${text}\n\n---\n\n`;
  };
  const primary = pages.filter((p) => !p.pathFromBuild.startsWith('internals/') && !p.pathFromBuild.startsWith('reference/'));
  const referenceish = pages.filter((p) => p.pathFromBuild.startsWith('internals/') || p.pathFromBuild.startsWith('reference/'));
  for (const p of primary) {
    if (Buffer.byteLength(out + body(p), 'utf8') > FULL_MAX_BYTES) {
      out += `[... primary pages truncated: hit ${FULL_MAX_BYTES} byte cap]\n`;
      return out;
    }
    out += body(p);
  }
  for (let i = 0; i < referenceish.length; i++) {
    const p = referenceish[i]!;
    if (Buffer.byteLength(out + body(p), 'utf8') > FULL_MAX_BYTES) {
      const remaining = referenceish.length - i;
      out += `[... ${remaining} reference pages truncated to stay under ${FULL_MAX_BYTES} bytes]\n`;
      break;
    }
    out += body(p);
  }
  return out;
}

export function generate(): void {
  const htmlFiles = walk(BUILD);
  const pages = htmlFiles.map(extract).filter((p): p is Page => p !== null);
  const shortIndex = buildShortIndex(pages);
  const fullConcat = buildFullConcat(pages);
  writeFileSync(join(BUILD, 'llms.txt'), shortIndex);
  writeFileSync(join(BUILD, 'llms-full.txt'), fullConcat);
  console.log(`[llms] wrote llms.txt (${Buffer.byteLength(shortIndex, 'utf8')} bytes)`);
  console.log(`[llms] wrote llms-full.txt (${Buffer.byteLength(fullConcat, 'utf8')} bytes) from ${pages.length} pages`);
}
