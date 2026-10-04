// @vitest-environment node
/**
 * @fileoverview Tests for the documentation frontmatter normalizer.
 * @module scripts/commands/docs/normalize.test
 *
 * @remarks
 * Every scenario runs {@link normalizeDirectory} on the in-memory harness filesystem instead of
 * real disk state, so this suite never touches `node:fs`.
 */

import {join} from "node:path";

import {Effect, FileSystem} from "effect";
import {describe, expect, it} from "vitest";

import {effectTest, makeTestLayer} from "../../platform/testing.ts";
import {normalizeDirectory, serializeFrontmatter} from "./normalize.ts";

const ROOT = "/norm";

/**
 * Reads one harness file as text.
 *
 * @param path - File path.
 * @returns The file contents.
 */
function read(path: string): Effect.Effect<string, unknown, FileSystem.FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    return yield* fs.readFileString(path);
  });
}

describe("normalizeDirectory", () => {
  effectTest(
    "inserts title from first H1 when frontmatter is absent",
    () =>
      Effect.gen(function* () {
        yield* normalizeDirectory(ROOT);
        const out = yield* read(`${ROOT}/alpha.md`);
        expect(out).toMatch(/^---\ntitle: Alpha Module\n/);
        expect(out).toMatch(/sidebar_position: 1\n/);
        expect(out).not.toMatch(/slug: /);
        expect(out).toContain("# Alpha Module");
      }),
    makeTestLayer({files: {[`${ROOT}/alpha.md`]: "# Alpha Module\n\nBody.\n"}}).layer,
  );

  effectTest(
    "preserves existing frontmatter keys and only fills missing ones",
    () =>
      Effect.gen(function* () {
        yield* normalizeDirectory(ROOT);
        const out = yield* read(`${ROOT}/beta.md`);
        expect(out).toMatch(/title: Custom Title/);
        expect(out).toMatch(/slug: \/preserved/);
        expect(out).toMatch(/sidebar_position: /);
      }),
    makeTestLayer({files: {[`${ROOT}/beta.md`]: "---\ntitle: Custom Title\nslug: /preserved\n---\n# Beta\n\nBody.\n"}}).layer,
  );

  effectTest(
    "skips paths listed in skipPaths",
    () =>
      Effect.gen(function* () {
        yield* normalizeDirectory(ROOT, {skipPaths: [join(ROOT, "skipme")]});
        const out = yield* read(`${ROOT}/skipme/x.md`);
        expect(out).toBe("# X\n");
      }),
    makeTestLayer({files: {[`${ROOT}/skipme/x.md`]: "# X\n"}}).layer,
  );

  effectTest(
    "forces position 0 for index/README files and walks nested directories",
    () =>
      Effect.gen(function* () {
        yield* normalizeDirectory(ROOT);
        const zzz = yield* read(`${ROOT}/zzz.md`);
        const idx = yield* read(`${ROOT}/index.md`);
        const nested = yield* read(`${ROOT}/nested/README.md`);
        const text = yield* read(`${ROOT}/notes.txt`);
        expect(idx).toMatch(/sidebar_position: 0/);
        expect(zzz).toMatch(/sidebar_position: 1/);
        expect(nested).toMatch(/sidebar_position: 0/);
        expect(text).toBe("# not markdown\n");
      }),
    makeTestLayer({
      files: {
        [`${ROOT}/zzz.md`]: "# ZZZ\n",
        [`${ROOT}/index.md`]: "# Overview\n",
        [`${ROOT}/nested/README.md`]: "# Nested\n",
        [`${ROOT}/notes.txt`]: "# not markdown\n",
      },
    }).layer,
  );

  effectTest(
    "quotes titles containing YAML-reserved characters (@, :, #)",
    () =>
      Effect.gen(function* () {
        yield* normalizeDirectory(ROOT);
        const scoped = yield* read(`${ROOT}/scoped.md`);
        const colon = yield* read(`${ROOT}/colon.md`);
        expect(scoped).toMatch(/title: "@arolariu\/components"/);
        expect(colon).toMatch(/title: "Name: With Colon"/);
      }),
    makeTestLayer({files: {[`${ROOT}/scoped.md`]: "# @arolariu/components\n", [`${ROOT}/colon.md`]: "# Name: With Colon\n"}}).layer,
  );
});

describe("serializeFrontmatter", () => {
  it("renders simple string and numeric values without quoting", () => {
    const out = serializeFrontmatter({title: "Hello", sidebar_position: 3}, "body");
    expect(out).toBe("---\ntitle: Hello\nsidebar_position: 3\n---\nbody");
  });

  it("returns the body unchanged when frontmatter is empty", () => {
    expect(serializeFrontmatter({}, "body")).toBe("body");
  });

  it.each(["true", "false", "yes", "no", "on", "off", "null", "~", "TRUE", "NO", "Null"])(
    "quotes YAML keyword scalar %j so it round-trips as a string",
    (keyword) => {
      const out = serializeFrontmatter({title: keyword}, "");
      expect(out).toContain(`title: "${keyword}"`);
    },
  );

  it("quotes values starting with YAML-reserved punctuation", () => {
    const out = serializeFrontmatter({title: "@scope/pkg"}, "");
    expect(out).toContain('title: "@scope/pkg"');
  });

  it("escapes embedded double quotes and backslashes when quoting is triggered", () => {
    // The leading `@` forces quoting; inside the quoted scalar, `"` and
    // `\` must be backslash-escaped so the value round-trips correctly.
    const out = serializeFrontmatter({title: '@a "b" \\c'}, "");
    expect(out).toContain('title: "@a \\"b\\" \\\\c"');
  });
});
