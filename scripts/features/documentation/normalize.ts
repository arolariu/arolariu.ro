/**
 * @fileoverview Frontmatter normalizer for the Docusaurus docs site. It walks markdown emitted by an
 * extractor and gives each file a minimal, YAML-safe frontmatter block: a `title` derived from the
 * first H1 when missing, and a `sidebar_position` derived from alphabetical order within its
 * directory, with `index.md`/`README.md` pinned to `0`. Existing keys are never overwritten, so
 * per-file overrides still win, and values holding YAML-reserved characters are quoted so titles
 * such as `@arolariu/components` survive parsing. A `slug` is never written: Docusaurus derives
 * URLs from the path plus each plugin's `routeBasePath`, so an explicit slug would double-prefix the
 * route. Every filesystem access flows through the injected `FileSystem`, and parsing and
 * serialization stay pure string functions.
 * @module scripts/features/documentation/normalize
 */

import {join} from "node:path";

import type {FileSystem} from "../../core/runtime/runtime-capability.ts";

/** Optional knobs for {@link normalizeDirectory}. */
export interface NormalizeOptions {
  /** Absolute paths to skip, for subtrees owned by plugins with their own frontmatter conventions. */
  readonly skipPaths?: readonly string[];
}

/** A parsed YAML frontmatter map; Docusaurus frontmatter is small and flat in practice. */
export type Frontmatter = Record<string, string | number>;

const FRONTMATTER_DELIMITER = "---";

/**
 * Parses the leading frontmatter block of `source`. Intentionally minimal: only single-line
 * `key: value` pairs are recognized, because every wrapped extractor emits trivial flat frontmatter
 * and a real YAML parser would only add dependency weight.
 *
 * @returns The parsed frontmatter and the remaining body; an empty map when there is no block.
 */
function parseFrontmatter(source: string): {frontmatter: Frontmatter; body: string} {
  if (!source.startsWith(FRONTMATTER_DELIMITER + "\n")) return {frontmatter: {}, body: source};
  const end = source.indexOf("\n" + FRONTMATTER_DELIMITER + "\n", FRONTMATTER_DELIMITER.length);
  if (end === -1) return {frontmatter: {}, body: source};
  const frontmatter: Frontmatter = {};
  for (const line of source.slice(FRONTMATTER_DELIMITER.length + 1, end).split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const value = line.slice(colon + 1).trim();
    frontmatter[line.slice(0, colon).trim()] = /^-?\d+$/.test(value) && Number.isFinite(Number(value)) ? Number(value) : value;
  }
  return {frontmatter, body: source.slice(end + FRONTMATTER_DELIMITER.length + 2)};
}

/**
 * YAML 1.1 keyword literals that parse as non-string scalars when unquoted: an unquoted `true`,
 * `no`, or `null` would round-trip as a boolean or null and silently change meaning.
 */
const YAML_KEYWORD_SCALAR = /^(true|false|yes|no|on|off|null|~)$/i;

/** Encodes one value, quoting YAML-reserved punctuation and keyword scalars. */
function serializeValue(value: string | number): string {
  if (typeof value === "number") return String(value);
  if (!/^[@#&*!|>%`?{}[\]-]|[:#]|^\s|\s$/.test(value) && !YAML_KEYWORD_SCALAR.test(value)) return value;
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

/**
 * Renders frontmatter `fm` onto the beginning of `body`, returning `body` unchanged when `fm` is
 * empty. Exported so the landing-page writer in `scripts/features/documentation/assembly.ts` reuses
 * these exact quoting rules.
 *
 * @returns The serialized document.
 */
export function serializeFrontmatter(fm: Frontmatter, body: string): string {
  const entries = Object.entries(fm);
  if (entries.length === 0) return body;
  const lines = entries.map(([key, value]) => `${key}: ${serializeValue(value)}`).join("\n");
  return `${FRONTMATTER_DELIMITER}\n${lines}\n${FRONTMATTER_DELIMITER}\n${body}`;
}

/** Fills one file's missing `title` (from its first H1) and missing `sidebar_position`. */
async function normalizeFile(files: FileSystem, filePath: string, position: number): Promise<void> {
  const {frontmatter, body} = parseFrontmatter(await files.readText(filePath));
  if (!("title" in frontmatter)) {
    const heading = /^#\s+(.+?)\s*$/m.exec(body)?.[1];
    if (heading) frontmatter["title"] = heading;
  }
  if (!("sidebar_position" in frontmatter)) frontmatter["sidebar_position"] = position;
  await files.writeText(filePath, serializeFrontmatter(frontmatter, body));
}

/**
 * Recursively walks `dir` and normalizes every markdown file it holds, deterministically for a given
 * directory listing, skipping `options.skipPaths`. See the module remarks for the full contract.
 */
export async function normalizeDirectory(files: FileSystem, dir: string, options: NormalizeOptions = {}): Promise<void> {
  const skip = new Set(options.skipPaths ?? []);
  const walk = async (current: string): Promise<void> => {
    const entries = (await files.readDirectory(current)).toSorted((left, right) => left.name.localeCompare(right.name));
    let position = 1;
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (skip.has(full)) continue;
      if (entry.kind === "directory") await walk(full);
      else if (entry.kind === "file" && /\.mdx?$/i.test(entry.name)) {
        await normalizeFile(files, full, /^(index|readme)\.mdx?$/i.test(entry.name) ? 0 : position++);
      }
    }
  };
  await walk(dir);
}
