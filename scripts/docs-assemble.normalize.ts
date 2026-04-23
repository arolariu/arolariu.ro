/**
 * @fileoverview Frontmatter normalizer for the Docusaurus docs site.
 *
 * @remarks
 * Walks a directory of markdown files emitted by one of the extractors
 * (TypeDoc, DefaultDocumentation, pydoc-markdown, or the prose sync) and
 * ensures each file carries a minimal, YAML-safe frontmatter block that
 * Docusaurus can parse reliably. Specifically:
 *
 * - Every `.md` / `.mdx` file gets a `title` key (derived from the first
 *   H1 heading if missing) and a `sidebar_position` key (derived from
 *   alphabetical order within its directory; `index.md` / `README.md`
 *   are pinned to position `0`).
 * - Existing frontmatter keys are never overwritten — the normalizer
 *   only fills missing ones so per-file overrides still win.
 * - String values containing YAML-reserved characters (for example `@`,
 *   `:`, or `#`) are double-quoted so the YAML parser doesn't choke on
 *   titles like `@arolariu/components`.
 *
 * Slugs are NOT written by this normalizer. Docusaurus derives page URLs
 * from the filesystem path plus each plugin's `routeBasePath`, so setting
 * an explicit `slug` would double-prefix the route.
 */

import {readFileSync, writeFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';

/**
 * Optional knobs for {@link normalizeDirectory}.
 */
export type NormalizeOptions = {
  /**
   * Absolute paths to skip when walking. Used to avoid touching subtrees
   * owned by plugins that emit their own frontmatter conventions (for
   * example `_generated/dotnet-api/pages/`, owned by
   * `docusaurus-plugin-openapi-docs`).
   */
  readonly skipPaths?: readonly string[];
};

/**
 * A parsed YAML frontmatter map. Values are kept as `string | number`
 * because Docusaurus' frontmatter is small and flat in practice.
 */
type Frontmatter = Record<string, string | number>;

const FRONTMATTER_DELIMITER = '---';

/**
 * Parse the leading YAML frontmatter block of a markdown source string.
 *
 * @param source - Full file contents.
 * @returns Parsed frontmatter plus the remaining body. An empty
 *   frontmatter object is returned when the file has no leading `---`
 *   block so downstream code can fill in defaults.
 */
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

/**
 * Encode a single frontmatter value as a YAML scalar, double-quoting
 * strings that start with or contain YAML-reserved characters.
 */
function serializeValue(value: string | number): string {
  if (typeof value === 'number') return String(value);
  const needsQuoting = /^[@#&*!|>%`?{}[\]-]|[:#]|^\s|\s$/.test(value);
  if (!needsQuoting) return value;
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

/**
 * Render a frontmatter object back onto the beginning of the body.
 * When the frontmatter is empty the body is returned unchanged.
 */
function serializeFrontmatter(fm: Frontmatter, body: string): string {
  const keys = Object.keys(fm);
  if (keys.length === 0) return body;
  const lines = keys.map((k) => `${k}: ${serializeValue(fm[k])}`).join('\n');
  return `${FRONTMATTER_DELIMITER}\n${lines}\n${FRONTMATTER_DELIMITER}\n${body}`;
}

/**
 * Return the first Markdown H1 heading in a body of text, or `undefined`
 * when no `# ` prefix is found on any line.
 */
function extractH1(body: string): string | undefined {
  const match = /^#\s+(.+?)\s*$/m.exec(body);
  return match?.[1];
}

/**
 * Normalize a single markdown file in place — fill missing `title`
 * (from the first H1) and missing `sidebar_position` (from the caller's
 * deterministic order).
 *
 * @param filePath - Absolute path to the file being rewritten.
 * @param position - Sidebar position to assign when the file has none.
 */
async function normalizeFile(filePath: string, position: number): Promise<void> {
  const source = readFileSync(filePath, 'utf8');
  const {frontmatter, body} = parseFrontmatter(source);
  if (!('title' in frontmatter)) {
    const heading = extractH1(body);
    if (heading) frontmatter.title = heading;
  }
  if (!('sidebar_position' in frontmatter)) frontmatter.sidebar_position = position;
  writeFileSync(filePath, serializeFrontmatter(frontmatter, body));
}

/**
 * Recursively walk a directory and normalize every markdown file it
 * contains. See the module-level docs for the full contract.
 *
 * @param dir - Absolute path to the root of the walk.
 * @param options - Optional per-run configuration. Currently only
 *   `skipPaths` is supported.
 */
export async function normalizeDirectory(dir: string, options: NormalizeOptions = {}): Promise<void> {
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
        await normalizeFile(full, isIndex ? 0 : position++);
      }
    }
  };
  await walk(dir);
}
