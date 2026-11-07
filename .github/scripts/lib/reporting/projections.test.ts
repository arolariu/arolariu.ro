import {describe, expect, it, vi} from "vitest";
import {context} from "../planning/fixtures/plans.ts";
import {buildVerifiedReport} from "../hygiene/aggregate.ts";
import {outcome, plan} from "../hygiene/fixtures/outcomes.ts";
import {providerIds} from "../hygiene/registry.ts";
import {publicationExitCode, publishAll, type Projection} from "./projections.ts";

function report(): ReturnType<typeof buildVerifiedReport> {
  const planned = plan(true);
  return buildVerifiedReport(context(), planned, {outcomes: providerIds().map((id) => outcome(planned, id)), issues: []});
}
describe("independent publication fan-out", () => {
  it("does not let a synchronous throw starve the next projection and retains error identity", async () => {
    const error = new Error("Synchronous failure");
    const next = vi.fn(async (): Promise<{status: "published"}> => ({status: "published"}));
    const projections: readonly Projection<unknown>[] = [
      {
        name: "first",
        required: false,
        run: () => {
          throw error;
        },
      },
      {name: "next", required: false, run: next},
    ];
    const results = await publishAll({}, projections);
    expect(next).toHaveBeenCalledOnce();
    expect(results[0]).toMatchObject({status: "failed", error});
    expect(results[1]?.status).toBe("published");
  });
  it("fails a passing gate when required JSON persistence fails", async () => {
    const value = report();
    const results = await publishAll(value, [
      {
        name: "jsonArtifact",
        required: true,
        run: async () => {
          throw new Error("disk full");
        },
      },
    ]);
    expect(publicationExitCode(value, results)).toBe(1);
  });
  it("does not overwrite gate policy for optional notification failure or explicit skip", async () => {
    const value = report();
    const results = await publishAll(value, [
      {
        name: "comment",
        required: false,
        run: async () => {
          throw new Error("denied");
        },
      },
      {name: "local", required: false, run: async () => ({status: "skipped", reason: "No PR"})},
    ]);
    expect(publicationExitCode(value, results)).toBe(0);
    expect(publicationExitCode({...value, overallResult: "failed"}, results)).toBe(1);
  });
});
