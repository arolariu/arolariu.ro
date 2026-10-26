import * as exec from "@actions/exec";
import {join} from "node:path";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {runWorkspaceInspection} from "./index.ts";

vi.mock("@actions/exec", () => ({getExecOutput: vi.fn()}));
beforeEach(() => vi.resetAllMocks());

describe("fixed workspace facts worker broker", () => {
  it("uses the current native executable, fixed worker, argument vector, and root cwd", async () => {
    vi.mocked(exec.getExecOutput).mockResolvedValue({exitCode: 0, stdout: "{}", stderr: ""});
    const root = join(process.cwd(), "repository with spaces");
    await runWorkspaceInspection(root);
    expect(exec.getExecOutput).toHaveBeenCalledWith(
      process.execPath,
      [join(root, "scripts", "inspection", "workspace-facts.worker.ts"), root],
      {cwd: root, silent: true, ignoreReturnCode: true},
    );
  });
  it("retains nonzero output evidence rather than manufacturing an available graph", async () => {
    const result = {exitCode: 1, stdout: "", stderr: "worker failed"};
    vi.mocked(exec.getExecOutput).mockResolvedValue(result);
    expect(await runWorkspaceInspection(process.cwd())).toBe(result);
  });
});
