/**
 * @fileoverview Unit tests for shared worker shell helpers.
 * @module scripts/workers/shell.test
 */

import {describe, expect, it} from "vitest";
import {isToolAvailable} from "./shell.ts";

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
