import * as exec from "@actions/exec";
import {describe, expect, it, vi} from "vitest";
import {createGitHelper} from "./index.ts";

vi.mock("@actions/exec", () => ({getExecOutput: vi.fn()}));
describe("scoped Git broker", () => {
  it("applies a caller-owned cwd to reusable tree and fetch operations", async () => {
    vi.mocked(exec.getExecOutput).mockResolvedValue({exitCode: 0, stdout: "100644 blob abc 4\tsites/file.js\0", stderr: ""});
    const root = process.cwd();
    const git = createGitHelper({cwd: root});
    expect(await git.getFileSizes("HEAD", ["sites"])).toEqual({"sites/file.js": 4});
    expect(exec.getExecOutput).toHaveBeenLastCalledWith(
      "git",
      ["ls-tree", "-r", "-l", "-z", "HEAD", "--", "sites"],
      expect.objectContaining({cwd: root}),
    );
    await git.fetchBranch("main");
    expect(exec.getExecOutput).toHaveBeenLastCalledWith(
      "git",
      ["fetch", "origin", "main:refs/remotes/origin/main"],
      expect.objectContaining({cwd: root}),
    );
  });
});
