import {mkdtemp, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fs} from "../../../helpers/filesystem/index.ts";
import {context} from "../../../lib/planning/fixtures/plans.ts";
import {outcome, plan} from "../../../lib/hygiene/fixtures/outcomes.ts";
import {providerIds} from "../../../lib/hygiene/registry.ts";
import {buildVerifiedReport} from "../../../lib/hygiene/aggregate.ts";
import {loadOutcomes, runProjectionsCore, type Projection} from "./runProjections.ts";

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "gate-launcher-"));
});
afterEach(async () => {
  await rm(directory, {recursive: true, force: true});
});

describe("validated gate transport", () => {
  it("loads nested versioned records and retains malformed/missing evidence issues", async () => {
    const expected = plan(true);
    for (const id of providerIds()) await fs.writeJsonAtomic(join(directory, `outcome-${id}`, `outcome-${id}.json`), outcome(expected, id));
    expect((await loadOutcomes(directory, expected, 1)).outcomes).toHaveLength(6);
    await fs.writeText(join(directory, "outcome-invalid.json"), "{not json");
    const loaded = await loadOutcomes(directory, expected, 1);
    expect(loaded.issues.some((issue) => issue.code === "invalid-outcome")).toBe(true);
    expect(buildVerifiedReport(context(), expected, loaded).overallResult).toBe("errored");
  });
  it("never accepts an absent evidence directory as a successful empty list", async () => {
    const expected = plan(true);
    const loaded = await loadOutcomes(join(directory, "missing"), expected, 1);
    expect(buildVerifiedReport(context(), expected, loaded).overallResult).toBe("errored");
  });
});

describe("gate publication", () => {
  const expected = plan(true);
  const report = buildVerifiedReport(context(), expected, {outcomes: providerIds().map((id) => outcome(expected, id)), issues: []});
  it("preserves primary failed/errored results", async () => {
    expect(await runProjectionsCore({...report, overallResult: "failed"}, [])).toBe(1);
    expect(await runProjectionsCore({...report, overallResult: "errored"}, [])).toBe(1);
  });
  it("isolates synchronous failure and still runs later publishers", async () => {
    const next = vi.fn(async (): Promise<{status: "published"}> => ({status: "published"}));
    const projections: readonly Projection[] = [
      {
        name: "sync",
        required: false,
        run: () => {
          throw new Error("sync failure");
        },
      },
      {name: "next", required: false, run: next},
    ];
    expect(await runProjectionsCore(report, projections)).toBe(0);
    expect(next).toHaveBeenCalledOnce();
  });
  it("requires report persistence and distinguishes explicit optional skips", async () => {
    expect(
      await runProjectionsCore(report, [
        {
          name: "jsonArtifact",
          required: true,
          run: async () => {
            throw new Error("disk full");
          },
        },
      ]),
    ).toBe(1);
    expect(
      await runProjectionsCore(report, [{name: "prComment", required: false, run: async () => ({status: "skipped", reason: "No PR"})}]),
    ).toBe(0);
  });
});
