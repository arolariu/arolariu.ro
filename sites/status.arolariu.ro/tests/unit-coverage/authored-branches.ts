import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {SourceMap, type SourceMapPayload} from "node:module";
import {resolve} from "node:path";
import {parse} from "svelte/compiler";
import ts from "typescript";
import type {Plugin} from "vite";

type Position = {readonly line: number | null; readonly column: number | null};
type Span = {readonly type: string; readonly locations: readonly {readonly start: Position}[]};
type FileBranches = {readonly b: Record<string, readonly number[]>; readonly branchMap: Record<string, Span>};
type Transform = {readonly source: string; readonly code: string; readonly map: SourceMapPayload};
type Counts = {readonly covered: number; readonly total: number; readonly compilerOnly: number};
type Candidate = {readonly authored: boolean; readonly interpolation: boolean};

function pathKey(file: string): string {
  const absolute = resolve(file);
  return process.platform === "win32" ? absolute.toLowerCase() : absolute;
}

function* nodes(value: unknown): Generator<Record<string, unknown>, void> {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const child of value) yield* nodes(child);
    return;
  }
  const node = value as Record<string, unknown>;
  if (typeof node["type"] === "string") yield node;
  for (const [key, child] of Object.entries(node)) {
    if (key !== "loc" && key !== "metadata" && key !== "parent") yield* nodes(child);
  }
}

function branchKey(left: Position | undefined, right: Position | undefined): string | undefined {
  if (
    !left
    || !right
    || left.line === null
    || left.column === null
    || right.line === null
    || right.column === null
    || ![left.line, left.column, right.line, right.column].every(Number.isInteger)
  )
    return undefined;
  return `${left.line}:${left.column}/${right.line}:${right.column}`;
}

function candidatesFor(file: string, transform: Transform): ReadonlyMap<string, readonly Candidate[]> {
  const authored = parse(transform.source, {modern: true});
  const authoredFallbacks = [...nodes(authored)].filter((node) => node["type"] === "LogicalExpression" && node["operator"] === "??");
  const template = [...nodes(authored.fragment)].filter((node) =>
    ["ExpressionTag", "Attribute", "RegularElement"].includes(String(node["type"])),
  );
  const lineOffsets = [0];
  for (const newline of transform.source.matchAll(/\n/gu)) lineOffsets.push((newline.index ?? 0) + 1);
  const sourceMap = new SourceMap(transform.map);
  const generated = ts.createSourceFile(`${file}.js`, transform.code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const candidates = new Map<string, Candidate[]>();

  function originalPosition(node: ts.Node): Position {
    const {line, character} = generated.getLineAndCharacterOfPosition(node.getStart(generated));
    const entry = sourceMap.findEntry(line, character);
    // Node's lookup can otherwise carry an anchor from a preceding line into an unmapped line.
    return "originalSource" in entry && entry.generatedLine === line
      ? {line: entry.originalLine + 1, column: entry.originalColumn}
      : {line: null, column: null};
  }

  function covers(node: Record<string, unknown>, start: number, end: number, overlap: boolean): boolean {
    const first = node["start"];
    const last = node["end"];
    return typeof first === "number" && typeof last === "number" && (overlap ? first <= end && last > start : first <= start && last > end);
  }

  function visit(node: ts.Node): void {
    if (
      ts.isBinaryExpression(node)
      && node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
      && ts.isStringLiteral(node.right)
      && node.right.text === ""
    ) {
      const left = originalPosition(node.left);
      const right = originalPosition(node.right);
      const key = branchKey(left, right);
      if (key !== undefined && left.line !== null && left.column !== null && right.line !== null && right.column !== null) {
        const leftOffset = lineOffsets[left.line - 1];
        const rightOffset = lineOffsets[right.line - 1];
        if (leftOffset !== undefined && rightOffset !== undefined) {
          const start = Math.min(leftOffset + left.column, rightOffset + right.column);
          const end = Math.max(leftOffset + left.column, rightOffset + right.column);
          const matches = candidates.get(key) ?? [];
          matches.push({
            authored: authoredFallbacks.some((range) => covers(range, start, end, true)),
            interpolation: template.some((range) => covers(range, start, end, false)),
          });
          candidates.set(key, matches);
        }
      }
    }
    node.forEachChild(visit);
  }
  visit(generated);
  return candidates;
}

function keyForSpan(span: Span | undefined): string | undefined {
  return span?.type === "binary-expr" && span.locations.length === 2
    ? branchKey(span.locations[0]?.start, span.locations[1]?.start)
    : undefined;
}

/** Counts branch outcomes in the exact raw run, conservatively retaining ambiguous ranges. */
export function createAuthoredBranchCheck(expectedFiles: readonly string[]): {
  readonly capture: Plugin;
  readonly count: (coverage: unknown) => Counts;
} {
  const expected = new Set(expectedFiles.map(pathKey));
  const transforms = new Map<string, Map<string, Transform>>();
  const shouldCapture = (file: string): boolean => file.endsWith(".svelte") && expected.has(pathKey(file));
  const capture: Plugin = {
    name: "capture-status-svelte-coverage",
    enforce: "post",
    configureVitest({defineCacheKeyGenerator}) {
      // Capture the current transform without disabling caching for the rest of the graph.
      defineCacheKeyGenerator(({id}) => (shouldCapture(id) ? false : undefined));
    },
    transform(code, id) {
      if (!shouldCapture(id)) return;
      const file = pathKey(id);
      const map = this.getCombinedSourcemap();
      const transform: Transform = {
        source: readFileSync(id, "utf8"),
        code,
        map: {
          ...map,
          file: map.file ?? id,
          sourcesContent: (map.sourcesContent ?? []).map((content) => content ?? ""),
          sourceRoot: "sourceRoot" in map && typeof map.sourceRoot === "string" ? map.sourceRoot : "",
        },
      };
      const key = createHash("sha256").update(JSON.stringify(transform)).digest("hex");
      const variants = transforms.get(file) ?? new Map<string, Transform>();
      variants.set(key, transform);
      transforms.set(file, variants);
    },
  };

  function count(coverage: unknown): Counts {
    const raw = JSON.parse(JSON.stringify(coverage)) as Record<string, FileBranches>;
    const measured = new Set(Object.keys(raw).map(pathKey));
    const missing = [...expected].filter((file) => !measured.has(file));
    const extra = [...measured].filter((file) => !expected.has(file));
    if (!expected.size || missing.length || extra.length) {
      throw new Error(`Unexpected Status coverage inventory. Missing: ${missing.join(", ")}. Extra: ${extra.join(", ")}.`);
    }

    let total = 0;
    let covered = 0;
    let compilerOnly = 0;
    for (const [file, data] of Object.entries(raw)) {
      const variants = transforms.get(pathKey(file));
      const transform = variants?.size === 1 ? variants.values().next().value : undefined;
      const candidates =
        transform !== undefined && transform.source === readFileSync(file, "utf8") ? candidatesFor(file, transform) : undefined;
      const keys = new Map<string, number>();
      for (const span of Object.values(data.branchMap)) {
        const key = keyForSpan(span);
        if (key !== undefined) keys.set(key, (keys.get(key) ?? 0) + 1);
      }
      for (const [id, hits] of Object.entries(data.b)) {
        const key = keyForSpan(data.branchMap[id]);
        const match = key === undefined ? undefined : candidates?.get(key);
        if (
          hits.length === 2
          && key !== undefined
          && keys.get(key) === 1
          && match?.length === 1
          && match[0]?.interpolation
          && !match[0].authored
        ) {
          compilerOnly++;
          continue;
        }
        total += hits.length;
        covered += hits.filter((value) => value > 0).length;
      }
    }
    if (total === 0) throw new Error("Status coverage did not report any authored branches.");
    return {covered, total, compilerOnly};
  }

  return {capture, count};
}
