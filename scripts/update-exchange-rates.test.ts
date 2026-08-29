// @vitest-environment node
/**
 * @fileoverview Import-safety tests for the exchange-rate updater.
 * @module scripts/update-exchange-rates.test
 */

import {afterEach, describe, expect, it, vi} from "vitest";

const {existsSync, readFileSync, writeFileSync} = vi.hoisted(() => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => ""),
  writeFileSync: vi.fn(() => {
    throw new Error("write attempted during import");
  }),
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    existsSync,
    readFileSync,
    writeFileSync,
  };
});

const originalArgv = process.argv;

afterEach(() => {
  process.argv = originalArgv;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.resetModules();
});

describe("exchange-rate updater module", () => {
  it("imports without network, write, or exit side effects", async () => {
    process.argv = ["node", "update-exchange-rates.ts", "--year", String(new Date().getFullYear())];
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            base: "EUR",
            start_date: "2026-01-01",
            end_date: "2026-08-29",
            rates: {},
          }),
          {status: 200, headers: {"Content-Type": "application/json"}},
        ),
    );
    vi.stubGlobal("fetch", fetch);
    const exit = vi.spyOn(process, "exit").mockImplementation((() => undefined) as typeof process.exit);
    for (const level of ["debug", "info", "warn", "error", "log"] as const) {
      vi.spyOn(console, level).mockImplementation(() => undefined);
    }

    await import("./update-exchange-rates.ts");
    await new Promise<void>((resolveImportEffects) => setImmediate(resolveImportEffects));

    expect({
      fetch: fetch.mock.calls.length,
      write: writeFileSync.mock.calls.length,
      exit: exit.mock.calls.length,
    }).toEqual({
      fetch: 0,
      write: 0,
      exit: 0,
    });
  });
});
