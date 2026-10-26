/**
 * @fileoverview Fixed facts adapter reuses the existing inspection/provider lifecycle.
 * @module scripts/inspection/workspace-facts.worker.test
 */
import {existsSync} from "node:fs";
import {tmpdir} from "node:os";
import {resolve} from "node:path";
import {describe, expect, it} from "vitest";
import {makeTestLayer, runScoped, scriptedOutcomes} from "../platform/testing.ts";
import {workspaceFactsWorker} from "./workspace-facts.worker.ts";

describe("workspace facts adapter", () => {
  it("reuses the bounded isolated provider and cleans its temporary state", async () => {
    let temporaryRoot = "";
    const raw = {
      nodes: {
        ui: {name: "ui", data: {root: "packages/components", targets: {test: {}}}},
        website: {name: "website", data: {root: "sites/arolariu.ro", targets: {test: {}}}},
      },
      dependencies: {website: [{source: "website", target: "ui"}]},
    };
    const runner = scriptedOutcomes((_request, options) => {
      expect(options.timeoutMs).toBe(120_000);
      temporaryRoot = resolve(String(options.env?.["NX_WORKSPACE_DATA_DIRECTORY"]), "..");
      expect(options.env?.["NX_DAEMON"]).toBe("false");
      return {kind: "succeeded", exitCode: 0, stdout: JSON.stringify(raw), stderr: "", durationMs: 1};
    });
    const root = resolve(tmpdir(), "workspace facts fixture");
    const result = await runScoped(
      workspaceFactsWorker.program(workspaceFactsWorker.decode([root])),
      makeTestLayer({fileSystem: "node", processes: [runner]}).layer,
    );
    expect(result).toMatchObject({kind: "available", value: {dependencies: [{source: "website", target: "ui"}]}});
    expect(existsSync(temporaryRoot)).toBe(false);
  });
  it("shares the fixed root argument contract and retains unavailable outcomes", async () => {
    expect(() => workspaceFactsWorker.decode([])).toThrow();
    const runner = scriptedOutcomes(() => ({kind: "exited", exitCode: 1, stdout: "", stderr: "failed", durationMs: 1}));
    const result = await runScoped(
      workspaceFactsWorker.program({repositoryRoot: resolve(tmpdir(), "missing workspace")}),
      makeTestLayer({fileSystem: "node", processes: [runner]}).layer,
    );
    expect(result.kind).toBe("unavailable");
  });
});
