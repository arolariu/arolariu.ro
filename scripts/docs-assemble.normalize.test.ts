// @vitest-environment node
/**
 * @fileoverview Tests for the documentation frontmatter normalizer.
 * @module scripts/docs-assemble.normalize.test
 *
 * @remarks
 * Every scenario runs {@link normalizeDirectory} against a deterministic in-memory filesystem
 * fixture instead of real disk state, so this suite never touches `node:fs`.
 */

import {describe, it, expect} from "vitest";
import {join} from "node:path";
import {createMemoryFileSystem} from "./testing/fixtures/memory-filesystem.fixture.ts";
import {normalizeDirectory, serializeFrontmatter} from "./docs-assemble.normalize.ts";

const ROOT = "/norm";

describe("normalizeDirectory", () => {
  it("inserts title from first H1 when frontmatter is absent", async () => {
    const files = createMemoryFileSystem({[`${ROOT}/alpha.md`]: "# Alpha Module\n\nBody.\n"});
    await normalizeDirectory(files, ROOT);
    const out = await files.readText(`${ROOT}/alpha.md`);
    expect(out).toMatch(/^---\ntitle: Alpha Module\n/);
    expect(out).toMatch(/sidebar_position: 1\n/);
    expect(out).not.toMatch(/slug: /);
    expect(out).toContain("# Alpha Module");
  });

  it("preserves existing frontmatter keys and only fills missing ones", async () => {
    const files = createMemoryFileSystem({
      [`${ROOT}/beta.md`]: "---\ntitle: Custom Title\nslug: /preserved\n---\n# Beta\n\nBody.\n",
    });
    await normalizeDirectory(files, ROOT);
    const out = await files.readText(`${ROOT}/beta.md`);
    expect(out).toMatch(/title: Custom Title/);
    expect(out).toMatch(/slug: \/preserved/);
    expect(out).toMatch(/sidebar_position: /);
  });

  it("skips paths listed in skipPaths", async () => {
    const files = createMemoryFileSystem({[`${ROOT}/skipme/x.md`]: "# X\n"});
    await normalizeDirectory(files, ROOT, {skipPaths: [join(ROOT, "skipme")]});
    const out = await files.readText(`${ROOT}/skipme/x.md`);
    expect(out).toBe("# X\n");
  });

  it("forces position 0 for index/README files", async () => {
    const files = createMemoryFileSystem({
      [`${ROOT}/zzz.md`]: "# ZZZ\n",
      [`${ROOT}/index.md`]: "# Overview\n",
    });
    await normalizeDirectory(files, ROOT);
    const zzz = await files.readText(`${ROOT}/zzz.md`);
    const idx = await files.readText(`${ROOT}/index.md`);
    expect(idx).toMatch(/sidebar_position: 0/);
    expect(zzz).toMatch(/sidebar_position: 1/);
  });

  it("quotes titles containing YAML-reserved characters (@, :, #)", async () => {
    const files = createMemoryFileSystem({
      [`${ROOT}/scoped.md`]: "# @arolariu/components\n",
      [`${ROOT}/colon.md`]: "# Name: With Colon\n",
    });
    await normalizeDirectory(files, ROOT);
    const scoped = await files.readText(`${ROOT}/scoped.md`);
    const colon = await files.readText(`${ROOT}/colon.md`);
    expect(scoped).toMatch(/title: "@arolariu\/components"/);
    expect(colon).toMatch(/title: "Name: With Colon"/);
  });
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
