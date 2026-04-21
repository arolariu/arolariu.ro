import {readFileSync, writeFileSync, readdirSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';

type NormalizeOptions = {
  readonly slugRoot: string;
  readonly skipPaths?: readonly string[];
};

type Frontmatter = Record<string, string | number>;

const FRONTMATTER_DELIMITER = '---';

function parseFrontmatter(source: string): {frontmatter: Frontmatter; body: string} {
  if (!source.startsWith(FRONTMATTER_DELIMITER + '\n')) {
    return {frontmatter: {}, body: source};
  }
  const end = source.indexOf('\n' + FRONTMATTER_DELIMITER + '\n', FRONTMATTER_DELIMITER.length);
  if (end === -1) return {frontmatter: {}, body: source};
  const raw = source.slice(FRONTMATTER_DELIMITER.length + 1, end);
  const body = source.slice(end + FRONTMATTER_DELIMITER.length + 2);
  const frontmatter: Frontmatter = {};
  for (const line of raw.split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    const numeric = Number(value);
    frontmatter[key] = Number.isFinite(numeric) && /^-?\d+$/.test(value) ? numeric : value;
  }
  return {frontmatter, body};
}

function serializeValue(value: string | number): string {
  if (typeof value === 'number') return String(value);
  const needsQuoting = /^[@#&*!|>%`?{}[\]-]|[:#]|^\s|\s$/.test(value);
  if (!needsQuoting) return value;
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

function serializeFrontmatter(fm: Frontmatter, body: string): string {
  const keys = Object.keys(fm);
  if (keys.length === 0) return body;
  const lines = keys.map((k) => `${k}: ${serializeValue(fm[k])}`).join('\n');
  return `${FRONTMATTER_DELIMITER}\n${lines}\n${FRONTMATTER_DELIMITER}\n${body}`;
}

function extractH1(body: string): string | undefined {
  const match = /^#\s+(.+?)\s*$/m.exec(body);
  return match?.[1];
}

function slugForFile(filePath: string, rootDir: string, slugRoot: string): string {
  const rel = relative(rootDir, filePath).replaceAll('\\', '/');
  const stripped = rel.replace(/\.mdx?$/i, '').replace(/\/index$|\/README$/i, '');
  const slug = stripped
    .split('/')
    .map((s) => s.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''))
    .filter(Boolean)
    .join('/');
  return `${slugRoot}/${slug}`.replace(/\/+/g, '/').replace(/\/$/, '') || slugRoot;
}

async function normalizeFile(filePath: string, rootDir: string, options: NormalizeOptions, position: number): Promise<void> {
  const source = readFileSync(filePath, 'utf8');
  const {frontmatter, body} = parseFrontmatter(source);
  if (!('title' in frontmatter)) {
    const heading = extractH1(body);
    if (heading) frontmatter.title = heading;
  }
  if (!('sidebar_position' in frontmatter)) frontmatter.sidebar_position = position;
  if (!('slug' in frontmatter)) frontmatter.slug = slugForFile(filePath, rootDir, options.slugRoot);
  writeFileSync(filePath, serializeFrontmatter(frontmatter, body));
}

export async function normalizeDirectory(dir: string, options: NormalizeOptions): Promise<void> {
  const skip = new Set(options.skipPaths ?? []);
  const walk = async (current: string): Promise<void> => {
    const entries = readdirSync(current).sort();
    let position = 1;
    for (const name of entries) {
      const full = join(current, name);
      if (skip.has(full)) continue;
      const stat = statSync(full);
      if (stat.isDirectory()) {
        await walk(full);
      } else if (stat.isFile() && /\.mdx?$/i.test(name)) {
        const isIndex = /^(index|readme)\.mdx?$/i.test(name);
        await normalizeFile(full, dir, options, isIndex ? 0 : position++);
      }
    }
  };
  await walk(dir);
}
