import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";

import {parsePackedFilename} from "./test-packed";

describe("required packed verification", () => {
  it("routes the default package test through real-archive verification while retaining the unit target", () => {
    const manifest = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, "../package.json"), "utf8"));
    expect(manifest.scripts.test).toBe("npm run test:packed");
    expect(manifest.scripts["test:packed"]).toBe("node scripts/test-packed.ts");
    expect(manifest.scripts["test:unit"]).toBe("vitest run");
  });

  it("accepts the single local npm archive filename", () => {
    expect(parsePackedFilename('[{"filename":"arolariu-components-3.0.0.tgz"}]')).toBe("arolariu-components-3.0.0.tgz");
  });

  it.each([
    "[]",
    "{}",
    "null",
    "[null]",
    '[{"filename":"one.tgz"},{"filename":"two.tgz"}]',
    '[{"filename":42}]',
    '[{"filename":""}]',
    '[{"filename":"../outside.tgz"}]',
    '[{"filename":"..\\\\outside.tgz"}]',
    '[{"filename":"archive.zip"}]',
  ])("rejects invalid archive metadata %s", (output) => {
    expect(() => parsePackedFilename(output)).toThrow(/npm pack/u);
  });
});
