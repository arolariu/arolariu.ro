/**
 * @fileoverview Unit tests for shared worker shell helpers.
 * @module scripts/workers/shell.test
 */

import {describe, expect, it} from "vitest";
import {isToolAvailable, runCommand} from "./shell.ts";

describe("runCommand", () => {
  it("preserves the legacy merged output shape for nonzero commands", async () => {
    const result = await runCommand(process.execPath, ["-e", "process.stdout.write('out'); process.stderr.write('err'); process.exit(3)"]);

    expect(result).toEqual({
      code: 3,
      output: "outerr",
    });
  });

  it("preserves spawn errors in output", async () => {
    const command = "definitely-not-a-real-tool-xyzzy-12345";

    const result = await runCommand(command, []);

    expect(result.code).toBe(1);
    expect(result.output).toContain(command);
  });
});

describe("isToolAvailable", () => {
  // Use process.execPath (absolute path to the current node binary) instead of
  // the bare name "node" so the test doesn't depend on PATH layout in sandboxed
  // CI runners that run vitest via npx but omit `node` from PATH.
  it("returns true for an existing tool (current node binary)", async () => {
    const result = await isToolAvailable(process.execPath);
    expect(result).toBe(true);
  });

  it("returns false for a non-existing tool", async () => {
    const result = await isToolAvailable("definitely-not-a-real-tool-xyzzy-12345");
    expect(result).toBe(false);
  });
});
