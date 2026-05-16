/**
 * @fileoverview Unit tests for format.worker helpers.
 * @module scripts/workers/format.worker.test
 */

import {describe, expect, it} from "vitest";

// We re-implement isToolAvailable inline-equivalent here because format.worker.ts
// runs as a worker thread and does not export its helpers. The contract under
// test is purely: "spawn <cmd> --version; resolve true on exit 0 else false."
//
// Keeping this test colocated with the worker signals intent to anyone
// touching the worker that the probe contract must be preserved.

import {spawn} from "node:child_process";

async function probe(cmd: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const child = spawn(cmd, ["--version"], {stdio: "pipe", windowsHide: true});
    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

describe("isToolAvailable probe (mirror of format.worker.ts)", () => {
  // Use process.execPath (absolute path to the current node binary) instead of
  // the bare name "node" so the test doesn't depend on PATH layout. A restricted
  // environment that runs vitest via npx but omits `node` from PATH would
  // otherwise produce a spurious failure.
  it("returns true for an existing tool (current node binary)", async () => {
    const result = await probe(process.execPath);
    expect(result).toBe(true);
  });

  it("returns false for a non-existing tool", async () => {
    const result = await probe("definitely-not-a-real-tool-xyzzy-12345");
    expect(result).toBe(false);
  });
});
