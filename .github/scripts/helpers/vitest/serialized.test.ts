import {mkdtemp, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
import {fs} from "../filesystem/index.ts";
import {createVitestHelper} from "./index.ts";

describe("serialized coverage evidence", () => {
  it("decodes actual numeric summaries and rejects malformed percentages", async () => {
    const helper = createVitestHelper();
    const valid = await helper.parseCoverage(fileURLToPath(new URL("../reports/fixtures/coverage.json", import.meta.url)), fs);
    expect(valid.total.lines.pct).toBe(80);
    const directory = await mkdtemp(join(tmpdir(), "coverage-validation-"));
    try {
      for (const pct of [null, "80", -1, 101]) {
        const path = join(directory, "invalid.json");
        await fs.writeJson(path, {total: {...valid.total, lines: {...valid.total.lines, pct}}});
        await expect(helper.parseCoverage(path, fs)).rejects.toThrow(/coverage|pct|percentage/i);
      }
    } finally {
      await rm(directory, {recursive: true, force: true});
    }
  });
});
