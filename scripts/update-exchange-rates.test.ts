// @vitest-environment node
/**
 * @fileoverview Import-safety and CLI validation tests for the exchange-rate updater.
 * @module scripts/update-exchange-rates.test
 */

import {CommanderError} from "commander";
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

// ---------------------------------------------------------------------------
// parseExchangeRateOptions validation contract
// ---------------------------------------------------------------------------

describe("parseExchangeRateOptions", () => {
  const currentYear = new Date().getFullYear();

  describe("defaults", () => {
    it("returns fromYear=2018 and toYear=currentYear when no args given", async () => {
      const {parseExchangeRateOptions} = await import("./update-exchange-rates.ts");
      const options = parseExchangeRateOptions([]);
      expect(options.fromYear).toBe(2018);
      expect(options.toYear).toBe(currentYear);
    });
  });

  describe("--year", () => {
    it("sets fromYear and toYear to the same value", async () => {
      const {parseExchangeRateOptions} = await import("./update-exchange-rates.ts");
      const options = parseExchangeRateOptions(["--year", "2023"]);
      expect(options.fromYear).toBe(2023);
      expect(options.toYear).toBe(2023);
    });

    it("rejects non-integer value", async () => {
      const {parseExchangeRateOptions} = await import("./update-exchange-rates.ts");
      expect(() => parseExchangeRateOptions(["--year", "2023.5"])).toThrow(/integer/i);
    });

    it("rejects non-numeric value", async () => {
      const {parseExchangeRateOptions} = await import("./update-exchange-rates.ts");
      expect(() => parseExchangeRateOptions(["--year", "abc"])).toThrow(/integer/i);
    });

    it("rejects year below the supported minimum (2018)", async () => {
      const {parseExchangeRateOptions} = await import("./update-exchange-rates.ts");
      expect(() => parseExchangeRateOptions(["--year", "2015"])).toThrow(/2018/);
    });

    it("rejects year above current year", async () => {
      const {parseExchangeRateOptions} = await import("./update-exchange-rates.ts");
      expect(() => parseExchangeRateOptions(["--year", String(currentYear + 1)])).toThrow();
    });

    it("accepts the earliest supported year (2018)", async () => {
      const {parseExchangeRateOptions} = await import("./update-exchange-rates.ts");
      const options = parseExchangeRateOptions(["--year", "2018"]);
      expect(options.fromYear).toBe(2018);
      expect(options.toYear).toBe(2018);
    });

    it("accepts the current year", async () => {
      const {parseExchangeRateOptions} = await import("./update-exchange-rates.ts");
      const options = parseExchangeRateOptions(["--year", String(currentYear)]);
      expect(options.fromYear).toBe(currentYear);
      expect(options.toYear).toBe(currentYear);
    });
  });

  describe("--from and --to", () => {
    it("sets fromYear and toYear independently", async () => {
      const {parseExchangeRateOptions} = await import("./update-exchange-rates.ts");
      const options = parseExchangeRateOptions(["--from", "2020", "--to", "2025"]);
      expect(options.fromYear).toBe(2020);
      expect(options.toYear).toBe(2025);
    });

    it("rejects from > to", async () => {
      const {parseExchangeRateOptions} = await import("./update-exchange-rates.ts");
      expect(() => parseExchangeRateOptions(["--from", "2025", "--to", "2020"])).toThrow();
    });

    it("accepts from === to", async () => {
      const {parseExchangeRateOptions} = await import("./update-exchange-rates.ts");
      const options = parseExchangeRateOptions(["--from", "2022", "--to", "2022"]);
      expect(options.fromYear).toBe(2022);
      expect(options.toYear).toBe(2022);
    });

    it("rejects non-integer --from", async () => {
      const {parseExchangeRateOptions} = await import("./update-exchange-rates.ts");
      expect(() => parseExchangeRateOptions(["--from", "abc"])).toThrow(/integer/i);
    });

    it("rejects non-integer --to", async () => {
      const {parseExchangeRateOptions} = await import("./update-exchange-rates.ts");
      expect(() => parseExchangeRateOptions(["--to", "abc"])).toThrow(/integer/i);
    });

    it("rejects --from below supported minimum", async () => {
      const {parseExchangeRateOptions} = await import("./update-exchange-rates.ts");
      expect(() => parseExchangeRateOptions(["--from", "2015"])).toThrow(/2018/);
    });

    it("rejects --to above current year", async () => {
      const {parseExchangeRateOptions} = await import("./update-exchange-rates.ts");
      expect(() => parseExchangeRateOptions(["--to", String(currentYear + 1)])).toThrow();
    });

    it("uses default fromYear=2018 when only --to is given", async () => {
      const {parseExchangeRateOptions} = await import("./update-exchange-rates.ts");
      const options = parseExchangeRateOptions(["--to", "2022"]);
      expect(options.fromYear).toBe(2018);
      expect(options.toYear).toBe(2022);
    });

    it("uses default toYear=currentYear when only --from is given", async () => {
      const {parseExchangeRateOptions} = await import("./update-exchange-rates.ts");
      const options = parseExchangeRateOptions(["--from", "2022"]);
      expect(options.fromYear).toBe(2022);
      expect(options.toYear).toBe(currentYear);
    });
  });

  describe("unknown options", () => {
    it("rejects unknown options", async () => {
      const {parseExchangeRateOptions} = await import("./update-exchange-rates.ts");
      expect(() => parseExchangeRateOptions(["--unknown"])).toThrow(CommanderError);
    });

    it("rejects unknown options even when valid options are also present", async () => {
      const {parseExchangeRateOptions} = await import("./update-exchange-rates.ts");
      expect(() => parseExchangeRateOptions(["--year", "2023", "--unknown"])).toThrow(CommanderError);
    });
  });
});
