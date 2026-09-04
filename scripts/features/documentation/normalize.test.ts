// @vitest-environment node
/**
 * @fileoverview Frontmatter normalization and YAML serialization evidence.
 * @module scripts/features/documentation/normalize.test
 *
 * @remarks
 * The real normalizer runs against a deterministic in-memory filesystem, never `node:fs`. Cases are
 * table-driven because the contract repeats one shape: existing keys survive, only a missing
 * `title` and `sidebar_position` are filled, `index`/`README` are pinned to `0`, `slug` is never
 * written, and YAML-reserved values are quoted.
 */

import {join} from "node:path";
import {describe, expect, it} from "vitest";

import {createMemoryFileSystem} from "../../testing/fixtures/memory-filesystem.fixture.ts";
import {normalizeDirectory, serializeFrontmatter} from "./normalize.ts";

const root = "/norm";
const landingAndSibling = {[`${root}/index.md`]: "# Overview\n", [`${root}/zzz.md`]: "# ZZZ\n"};

const cases = [
  {
    label: "fills a missing title from the first H1 and a missing position from listing order",
    files: {[`${root}/alpha.md`]: "# Alpha Module\n\nBody.\n"},
    inspected: `${root}/alpha.md`,
    expected: [/^---\ntitle: Alpha Module\n/u, /sidebar_position: 1\n/u, /# Alpha Module/u],
    forbidden: [/slug: /u],
  },
  {
    label: "preserves every existing frontmatter key and fills only the missing one",
    files: {[`${root}/beta.md`]: "---\ntitle: Custom Title\nslug: /preserved\n---\n# Beta\n\nBody.\n"},
    inspected: `${root}/beta.md`,
    expected: [/title: Custom Title/u, /slug: \/preserved/u, /sidebar_position: /u],
    forbidden: [],
  },
  {
    label: "pins an index landing file to zero",
    files: landingAndSibling,
    inspected: `${root}/index.md`,
    expected: [/sidebar_position: 0/u],
    forbidden: [],
  },
  {
    label: "numbers a non-landing sibling from one",
    files: landingAndSibling,
    inspected: `${root}/zzz.md`,
    expected: [/sidebar_position: 1/u],
    forbidden: [],
  },
  {
    label: "pins a README landing file to zero",
    files: {[`${root}/README.md`]: "# Readme\n", [`${root}/aaa.md`]: "# AAA\n"},
    inspected: `${root}/README.md`,
    expected: [/sidebar_position: 0/u],
    forbidden: [],
  },
  {
    label: "quotes a scoped package title holding YAML-reserved punctuation",
    files: {[`${root}/scoped.md`]: "# @arolariu/components\n"},
    inspected: `${root}/scoped.md`,
    expected: [/title: "@arolariu\/components"/u],
    forbidden: [],
  },
  {
    label: "quotes a title containing a colon",
    files: {[`${root}/colon.md`]: "# Name: With Colon\n"},
    inspected: `${root}/colon.md`,
    expected: [/title: "Name: With Colon"/u],
    forbidden: [],
  },
] as const satisfies readonly {
  readonly label: string;
  readonly files: Readonly<Record<string, string>>;
  readonly inspected: string;
  readonly expected: readonly RegExp[];
  readonly forbidden: readonly RegExp[];
}[];

describe("normalizeDirectory", () => {
  it.each(cases)("$label", async ({files, inspected, expected, forbidden}) => {
    const fileSystem = createMemoryFileSystem({...files});

    await normalizeDirectory(fileSystem, root);
    const normalized = await fileSystem.readText(inspected);

    for (const pattern of expected) expect(normalized).toMatch(pattern);
    for (const pattern of forbidden) expect(normalized).not.toMatch(pattern);
  });

  it("leaves every file under a skipped path untouched", async () => {
    const files = createMemoryFileSystem({[`${root}/skipme/x.md`]: "# X\n", [`${root}/kept.md`]: "# Kept\n"});

    await normalizeDirectory(files, root, {skipPaths: [join(root, "skipme")]});

    expect(await files.readText(`${root}/skipme/x.md`)).toBe("# X\n");
    expect(await files.readText(`${root}/kept.md`)).toMatch(/^---\ntitle: Kept\n/u);
  });

  it("produces identical output for an identical listing, and is a fixed point on a second pass", async () => {
    const seed = {[`${root}/index.md`]: "# Overview\n", [`${root}/alpha.md`]: "# Alpha\n", [`${root}/nested/gamma.md`]: "# Gamma\n"};
    const first = createMemoryFileSystem({...seed});
    const second = createMemoryFileSystem({...seed});

    await normalizeDirectory(first, root);
    await normalizeDirectory(second, root);
    await normalizeDirectory(second, root);

    for (const path of Object.keys(seed)) expect(await second.readText(path)).toBe(await first.readText(path));
  });
});

describe("serializeFrontmatter", () => {
  it("renders plain scalars unquoted and an empty map as the body", () => {
    expect(serializeFrontmatter({title: "Hello", sidebar_position: 3}, "body")).toBe("---\ntitle: Hello\nsidebar_position: 3\n---\nbody");
    expect(serializeFrontmatter({}, "body")).toBe("body");
  });

  it.each(["true", "false", "yes", "no", "on", "off", "null", "~", "TRUE", "NO", "Null"])("quotes YAML keyword scalar %j", (keyword) => {
    expect(serializeFrontmatter({title: keyword}, "")).toContain(`title: "${keyword}"`);
  });

  it("quotes reserved punctuation and escapes embedded quotes and backslashes", () => {
    expect(serializeFrontmatter({title: "@scope/pkg"}, "")).toContain('title: "@scope/pkg"');
    // The leading `@` forces quoting; inside the quoted scalar `"` and `\` must be escaped.
    expect(serializeFrontmatter({title: '@a "b" \\c'}, "")).toContain('title: "@a \\"b\\" \\\\c"');
  });
});
