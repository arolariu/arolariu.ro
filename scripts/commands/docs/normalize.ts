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
 *
 * Every filesystem access goes through the Effect `FileSystem` and `Path` services, so this module
 * runs unchanged against the in-memory test harness. Frontmatter parsing and serialization stay
 * business-pure functions over plain strings.
 */

import {Effect, FileSystem, Path, type PlatformError} from "effect";

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
export type Frontmatter = Record<string, string | number>;

const FRONTMATTER_DELIMITER = "---";

/**
 * Parse the leading YAML frontmatter block of a markdown source string.
 *
 * Intentionally *minimal*: only single-line `key: value` pairs are
 * recognised. Arrays (`- item`), nested mappings, block scalars
 * (`|`, `>`), anchors, tags, quoted multi-line strings, and escaped
 * colons inside unquoted values are all out of scope. Every extractor
 * we wrap emits trivial flat frontmatter, so a real YAML parser would
 * just add dependency weight. Missing keys are filled in by the
 * normalizer; existing keys survive round-trip through
 * {@link serializeFrontmatter} as long as their values are simple
 * scalars.
 *
 * @param source - Full file contents.
 * @returns Parsed frontmatter plus the remaining body. An empty
 *   frontmatter object is returned when the file has no leading `---`
 *   block so downstream code can fill in defaults.
 */
function parseFrontmatter(source: string): {frontmatter: Frontmatter; body: string} {
  if (!source.startsWith(FRONTMATTER_DELIMITER + "\n")) {
    return {frontmatter: {}, body: source};
  }
  const end = source.indexOf("\n" + FRONTMATTER_DELIMITER + "\n", FRONTMATTER_DELIMITER.length);
  if (end === -1) return {frontmatter: {}, body: source};
  const raw = source.slice(FRONTMATTER_DELIMITER.length + 1, end);
  const body = source.slice(end + FRONTMATTER_DELIMITER.length + 2);
  const frontmatter: Frontmatter = {};
  for (const line of raw.split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    const numeric = Number(value);
    frontmatter[key] = Number.isFinite(numeric) && /^-?\d+$/.test(value) ? numeric : value;
  }
  return {frontmatter, body};
}

/**
 * YAML 1.1 keyword literals that parse as non-string scalars when
 * unquoted — a frontmatter value of literal `true` / `no` / `null`
 * would round-trip as a boolean or null, silently changing meaning.
 * Serialising any match as a quoted string preserves string identity.
 */
const YAML_KEYWORD_SCALAR = /^(true|false|yes|no|on|off|null|~)$/i;

/**
 * Encode a single frontmatter value as a YAML scalar, double-quoting
 * strings that (a) begin with or contain YAML-reserved punctuation,
 * or (b) would otherwise parse as a non-string scalar via
 * {@link YAML_KEYWORD_SCALAR}.
 */
function serializeValue(value: string | number): string {
  if (typeof value === "number") return String(value);
  const needsPunctuationQuoting = /^[@#&*!|>%`?{}[\]-]|[:#]|^\s|\s$/.test(value);
  const needsKeywordQuoting = YAML_KEYWORD_SCALAR.test(value);
  if (!needsPunctuationQuoting && !needsKeywordQuoting) return value;
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

/**
 * Render a frontmatter object back onto the beginning of the body.
 * When the frontmatter is empty the body is returned unchanged.
 *
 * Exported so orchestrator code (landing-page writer) can reuse the
 * same quoting rules without duplicating them.
 */
export function serializeFrontmatter(fm: Frontmatter, body: string): string {
  const keys = Object.keys(fm);
  if (keys.length === 0) return body;
  const lines = Object.entries(fm)
    .map(([k, v]) => `${k}: ${serializeValue(v)}`)
    .join("\n");
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

/** One immediate entry of a directory, classified like the legacy `DirectoryEntry`. */
export interface DocumentationEntry {
  /** Entry name, relative to the directory that was read. */
  readonly name: string;
  /** Whether the entry is a file, a directory, or something else. */
  readonly kind: "file" | "directory" | "other";
}

/**
 * Lists the immediate entries of one directory with their kinds.
 *
 * @param directory - Absolute path of the directory to read.
 * @returns The entries in the order the filesystem lists them; a dangling link is `other`.
 */
export const readDirectoryEntries: (
  directory: string,
) => Effect.Effect<readonly DocumentationEntry[], PlatformError.PlatformError, FileSystem.FileSystem | Path.Path> = Effect.fn(
  "docs.readDirectoryEntries",
)(function* (directory: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const names = yield* fs.readDirectory(directory);
  return yield* Effect.forEach(
    names,
    (name) =>
      fs.stat(path.join(directory, name)).pipe(
        Effect.map((info): DocumentationEntry => ({name, kind: info.type === "File" ? "file" : info.type === "Directory" ? "directory" : "other"})),
        Effect.orElseSucceed((): DocumentationEntry => ({name, kind: "other"})),
      ),
    {concurrency: "unbounded"},
  );
});

/**
 * Normalize a single markdown file in place — fill missing `title`
 * (from the first H1) and missing `sidebar_position` (from the caller's
 * deterministic order).
 *
 * @param filePath - Absolute path to the file being rewritten.
 * @param position - Sidebar position to assign when the file has none.
 * @returns An effect that rewrites the file.
 */
function normalizeFile(filePath: string, position: number): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const source = yield* fs.readFileString(filePath);
    const {frontmatter, body} = parseFrontmatter(source);
    if (!("title" in frontmatter)) {
      const heading = extractH1(body);
      if (heading) frontmatter["title"] = heading;
    }
    if (!("sidebar_position" in frontmatter)) frontmatter["sidebar_position"] = position;
    yield* fs.writeFileString(filePath, serializeFrontmatter(frontmatter, body));
  });
}

/**
 * Recursively walk a directory and normalize every markdown file it
 * contains. See the module-level docs for the full contract.
 *
 * @param root - Absolute path to the root of the walk.
 * @param options - Optional per-run configuration. Currently only
 *   `skipPaths` is supported.
 * @returns An effect that rewrites every markdown file under `root`.
 */
export const normalizeDirectory: (
  root: string,
  options?: NormalizeOptions,
) => Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem | Path.Path> = Effect.fn("docs.normalizeDirectory")(function* (
  root: string,
  options: NormalizeOptions = {},
) {
  const path = yield* Path.Path;
  const skip = new Set(options.skipPaths ?? []);
  const walk = (current: string): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem | Path.Path> =>
    Effect.gen(function* () {
      const entries = (yield* readDirectoryEntries(current)).toSorted((left, right) => left.name.localeCompare(right.name));
      let position = 1;
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (skip.has(full)) continue;
        if (entry.kind === "directory") {
          yield* walk(full);
        } else if (entry.kind === "file" && /\.mdx?$/i.test(entry.name)) {
          const isIndex = /^(index|readme)\.mdx?$/i.test(entry.name);
          yield* normalizeFile(full, isIndex ? 0 : position++);
        }
      }
    });
  yield* walk(root);
});
