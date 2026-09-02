// @vitest-environment node
/**
 * @fileoverview Tests for the exchange-rate update command.
 * @module scripts/update-exchange-rates.test
 *
 * @remarks
 * Every scenario runs through {@link createUpdateExchangeRatesCommand} with a fake runtime, so no
 * test touches real disk, network, or wall-clock time. The declarative command runtime's AST
 * guard (`scripts/common/runtime-boundary.test.ts`) is what proves the production module itself
 * never reaches for those ambient effects directly.
 */

import {join} from "node:path";
import {describe, expect, it} from "vitest";

import {CommandCancellation, type Clock, type HttpClient, type HttpRequest} from "./common/runtime.ts";
import {
  createHttpResponse,
  createMemoryFileSystem,
  createTestProcessHost,
  createTestRuntimeFactory,
  repositoryFixtureRoot,
} from "./common/runtime.testing.ts";
import {createUpdateExchangeRatesCommand} from "./update-exchange-rates.ts";

const CSV_PATH = join(repositoryFixtureRoot, "sites", "arolariu.ro", "public", "data", "exchange-rates.csv");

/** Builds a deterministic {@link Clock} whose current instant never changes. */
function fixedClock(isoNow: string): Clock {
  return {
    monotonicNow: () => 0,
    isoTimestamp: () => isoNow,
    delay: (_milliseconds: number, signal?: AbortSignal): Promise<void> =>
      signal?.aborted === true ? Promise.reject(new CommandCancellation("aborted", 130)) : Promise.resolve(),
  };
}

/** Minimal, schema-valid Frankfurter payload with no trading days, for decode/range tests. */
const emptyRatesJson = JSON.stringify({amount: 1, base: "EUR", start_date: "", end_date: "", rates: {}});

// ---------------------------------------------------------------------------
// Decode: --year, --from, --to, defaults
// ---------------------------------------------------------------------------

describe("createUpdateExchangeRatesCommand decode", () => {
  describe("defaults", () => {
    it("uses fromYear=2018 and toYear=<current year> when no options are given", async () => {
      const http: HttpClient = {request: async () => createHttpResponse(200, emptyRatesJson)};
      const command = createUpdateExchangeRatesCommand(
        createTestRuntimeFactory({clock: fixedClock("2020-03-01T00:00:00.000Z"), http, files: createMemoryFileSystem()}),
      );

      const execution = await command.run([]);

      expect(execution).toMatchObject({
        status: "completed",
        exitCode: 0,
        value: {years: [2018, 2019, 2020], updatedYears: [2018, 2019, 2020], failedYears: []},
      });
    });
  });

  describe("--year", () => {
    it("sets fromYear and toYear to the same value", async () => {
      const http: HttpClient = {request: async () => createHttpResponse(200, emptyRatesJson)};
      const command = createUpdateExchangeRatesCommand(
        createTestRuntimeFactory({clock: fixedClock("2025-06-01T00:00:00.000Z"), http, files: createMemoryFileSystem()}),
      );

      const execution = await command.run(["--year", "2023"]);

      expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {years: [2023]}});
    });

    it.each(["2023.5", "abc"])("rejects a non-integer value (%s)", async (value) => {
      const command = createUpdateExchangeRatesCommand(createTestRuntimeFactory());

      const execution = await command.run(["--year", value]);

      expect(execution).toMatchObject({status: "failed", exitCode: 2, failure: {kind: "usage"}});
      expect(execution.status === "failed" ? execution.failure.message : "").toMatch(/integer/i);
    });

    it("rejects a year below the supported minimum (2018)", async () => {
      const command = createUpdateExchangeRatesCommand(createTestRuntimeFactory());

      const execution = await command.run(["--year", "2015"]);

      expect(execution).toMatchObject({status: "failed", exitCode: 2});
      expect(execution.status === "failed" ? execution.failure.message : "").toMatch(/2018/);
    });

    it("rejects a year above the injected clock's current year", async () => {
      const command = createUpdateExchangeRatesCommand(createTestRuntimeFactory({clock: fixedClock("2025-06-01T00:00:00.000Z")}));

      const execution = await command.run(["--year", "2026"]);

      expect(execution).toMatchObject({status: "failed", exitCode: 2});
      expect(execution.status === "failed" ? execution.failure.message : "").toMatch(/2025/);
    });

    it("accepts the earliest supported year (2018)", async () => {
      const http: HttpClient = {request: async () => createHttpResponse(200, emptyRatesJson)};
      const command = createUpdateExchangeRatesCommand(
        createTestRuntimeFactory({clock: fixedClock("2025-06-01T00:00:00.000Z"), http, files: createMemoryFileSystem()}),
      );

      const execution = await command.run(["--year", "2018"]);

      expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {years: [2018]}});
    });

    it("accepts the injected clock's current year", async () => {
      const http: HttpClient = {request: async () => createHttpResponse(200, emptyRatesJson)};
      const command = createUpdateExchangeRatesCommand(
        createTestRuntimeFactory({clock: fixedClock("2025-06-01T00:00:00.000Z"), http, files: createMemoryFileSystem()}),
      );

      const execution = await command.run(["--year", "2025"]);

      expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {years: [2025]}});
    });
  });

  describe("--from and --to", () => {
    it("sets fromYear and toYear independently", async () => {
      const http: HttpClient = {request: async () => createHttpResponse(200, emptyRatesJson)};
      const command = createUpdateExchangeRatesCommand(
        createTestRuntimeFactory({clock: fixedClock("2025-06-01T00:00:00.000Z"), http, files: createMemoryFileSystem()}),
      );

      const execution = await command.run(["--from", "2020", "--to", "2021"]);

      expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {years: [2020, 2021]}});
    });

    it("rejects from > to", async () => {
      const command = createUpdateExchangeRatesCommand(createTestRuntimeFactory({clock: fixedClock("2025-06-01T00:00:00.000Z")}));

      const execution = await command.run(["--from", "2025", "--to", "2020"]);

      expect(execution).toMatchObject({status: "failed", exitCode: 2});
    });

    it("accepts from === to", async () => {
      const http: HttpClient = {request: async () => createHttpResponse(200, emptyRatesJson)};
      const command = createUpdateExchangeRatesCommand(
        createTestRuntimeFactory({clock: fixedClock("2025-06-01T00:00:00.000Z"), http, files: createMemoryFileSystem()}),
      );

      const execution = await command.run(["--from", "2022", "--to", "2022"]);

      expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {years: [2022]}});
    });

    it.each([
      ["--from", "abc"],
      ["--to", "abc"],
    ])("rejects a non-integer %s value", async (flag, value) => {
      const command = createUpdateExchangeRatesCommand(createTestRuntimeFactory());

      const execution = await command.run([flag, value]);

      expect(execution).toMatchObject({status: "failed", exitCode: 2});
      expect(execution.status === "failed" ? execution.failure.message : "").toMatch(/integer/i);
    });

    it("rejects --from below the supported minimum", async () => {
      const command = createUpdateExchangeRatesCommand(createTestRuntimeFactory());

      const execution = await command.run(["--from", "2015"]);

      expect(execution).toMatchObject({status: "failed", exitCode: 2});
      expect(execution.status === "failed" ? execution.failure.message : "").toMatch(/2018/);
    });

    it("rejects --to above the injected clock's current year", async () => {
      const command = createUpdateExchangeRatesCommand(createTestRuntimeFactory({clock: fixedClock("2025-06-01T00:00:00.000Z")}));

      const execution = await command.run(["--to", "2026"]);

      expect(execution).toMatchObject({status: "failed", exitCode: 2});
    });

    it("uses default fromYear=2018 when only --to is given", async () => {
      const http: HttpClient = {request: async () => createHttpResponse(200, emptyRatesJson)};
      const command = createUpdateExchangeRatesCommand(
        createTestRuntimeFactory({clock: fixedClock("2025-06-01T00:00:00.000Z"), http, files: createMemoryFileSystem()}),
      );

      const execution = await command.run(["--to", "2018"]);

      expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {years: [2018]}});
    });

    it("uses default toYear=<current year> when only --from is given", async () => {
      const http: HttpClient = {request: async () => createHttpResponse(200, emptyRatesJson)};
      const command = createUpdateExchangeRatesCommand(
        createTestRuntimeFactory({clock: fixedClock("2020-03-01T00:00:00.000Z"), http, files: createMemoryFileSystem()}),
      );

      const execution = await command.run(["--from", "2020"]);

      expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {years: [2020]}});
    });
  });

  describe("invalid ranges supplied directly through invoke(), bypassing decode()", () => {
    it("rejects fromYear > toYear with a usage failure", async () => {
      const command = createUpdateExchangeRatesCommand(createTestRuntimeFactory({clock: fixedClock("2025-01-01T00:00:00.000Z")}));

      const execution = await command.invoke({fromYear: 2025, toYear: 2020});

      expect(execution).toMatchObject({status: "failed", exitCode: 2, failure: {kind: "usage"}});
    });

    it("rejects a toYear beyond the injected clock's current year", async () => {
      const command = createUpdateExchangeRatesCommand(createTestRuntimeFactory({clock: fixedClock("2025-01-01T00:00:00.000Z")}));

      const execution = await command.invoke({fromYear: 2020, toYear: 2030});

      expect(execution).toMatchObject({status: "failed", exitCode: 2, failure: {kind: "usage"}});
    });
  });

  describe("unknown options", () => {
    it("rejects unknown options", async () => {
      const command = createUpdateExchangeRatesCommand(createTestRuntimeFactory());

      const execution = await command.run(["--unknown"]);

      expect(execution).toMatchObject({status: "failed", exitCode: 2, failure: {kind: "usage"}});
    });

    it("rejects unknown options even when valid options are also present", async () => {
      const command = createUpdateExchangeRatesCommand(createTestRuntimeFactory());

      const execution = await command.run(["--year", "2023", "--unknown"]);

      expect(execution).toMatchObject({status: "failed", exitCode: 2, failure: {kind: "usage"}});
    });
  });

  describe("help behavior", () => {
    it.each(["--help", "-h"])("reports help for %s instead of running", async (flag) => {
      const command = createUpdateExchangeRatesCommand(createTestRuntimeFactory());

      const execution = await command.run([flag]);

      expect(execution).toEqual({status: "help", exitCode: 0});
    });
  });
});

// ---------------------------------------------------------------------------
// Continuation, sequencing, and cancellation
// ---------------------------------------------------------------------------

describe("createUpdateExchangeRatesCommand execution", () => {
  it("continues past a failed year and aggregates a non-zero exit code", async () => {
    const validRatesJson = JSON.stringify({
      amount: 1,
      base: "EUR",
      start_date: "2024-01-01",
      end_date: "2024-12-31",
      rates: {"2024-01-02": {RON: 4.97}},
    });
    const httpResponses: Array<ReturnType<typeof createHttpResponse> | Error> = [
      createHttpResponse(200, validRatesJson, {"content-type": "application/json"}),
      new Error("upstream unavailable"),
    ];
    const http: HttpClient = {
      request: async () => {
        const response = httpResponses.shift();
        if (response === undefined) throw new Error("Unexpected HTTP request.");
        if (response instanceof Error) throw response;
        return response;
      },
    };
    const clock: Clock = {
      monotonicNow: () => 0,
      isoTimestamp: () => "2025-06-01T00:00:00.000Z",
      delay: () => Promise.resolve(),
    };
    const command = createUpdateExchangeRatesCommand(
      createTestRuntimeFactory({
        clock,
        http,
        files: createMemoryFileSystem(),
      }),
    );

    const execution = await command.invoke({fromYear: 2024, toYear: 2025});

    expect(execution).toMatchObject({
      status: "completed",
      value: {
        updatedYears: [2024],
        failedYears: [{year: 2025, message: "upstream unavailable"}],
      },
      exitCode: 1,
    });
  });

  it("fetches years in strict ascending order and delays only between requests, not after the last", async () => {
    const requestedYears: number[] = [];
    let delayCalls = 0;
    const http: HttpClient = {
      request: async (request: Readonly<HttpRequest>) => {
        const match = /\/v1\/(\d{4})-01-01\.\./.exec(request.url.pathname);
        requestedYears.push(Number(match?.[1]));
        return createHttpResponse(200, emptyRatesJson);
      },
    };
    const clock: Clock = {
      ...fixedClock("2022-06-01T00:00:00.000Z"),
      delay: (): Promise<void> => {
        delayCalls += 1;
        return Promise.resolve();
      },
    };
    const command = createUpdateExchangeRatesCommand(createTestRuntimeFactory({clock, http, files: createMemoryFileSystem()}));

    const execution = await command.invoke({fromYear: 2020, toYear: 2022});

    expect(requestedYears).toEqual([2020, 2021, 2022]);
    expect(delayCalls).toBe(2);
    expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {years: [2020, 2021, 2022]}});
  });

  it("propagates a cancellation instead of recording it as a per-year failure", async () => {
    const http: HttpClient = {
      request: async () => {
        throw new CommandCancellation("cancelled by caller", 130);
      },
    };
    const command = createUpdateExchangeRatesCommand(
      createTestRuntimeFactory({clock: fixedClock("2024-01-01T00:00:00.000Z"), http, files: createMemoryFileSystem()}),
    );

    const execution = await command.invoke({fromYear: 2024, toYear: 2024});

    expect(execution).toMatchObject({status: "cancelled", exitCode: 130});
  });
});

// ---------------------------------------------------------------------------
// Frankfurter schema validation, RON calculation, and merge/write policy
// ---------------------------------------------------------------------------

describe("createUpdateExchangeRatesCommand business behavior", () => {
  it("rejects a malformed Frankfurter response as a per-year failure", async () => {
    const http: HttpClient = {request: async () => createHttpResponse(200, JSON.stringify({base: "EUR"}))};
    const command = createUpdateExchangeRatesCommand(
      createTestRuntimeFactory({clock: fixedClock("2024-01-01T00:00:00.000Z"), http, files: createMemoryFileSystem()}),
    );

    const execution = await command.invoke({fromYear: 2024, toYear: 2024});

    expect(execution).toMatchObject({
      status: "completed",
      exitCode: 1,
      value: {failedYears: [{year: 2024, message: "Frankfurter API returned an unexpected response shape."}]},
    });
  });

  it("computes yearly average RON cross-rates across multiple trading days", async () => {
    const ratesJson = JSON.stringify({
      amount: 1,
      base: "EUR",
      start_date: "2023-01-01",
      end_date: "2023-12-31",
      rates: {
        "2023-01-02": {RON: 4.9, USD: 1},
        "2023-06-15": {RON: 5.1, USD: 1.2},
      },
    });
    const http: HttpClient = {request: async () => createHttpResponse(200, ratesJson)};
    const files = createMemoryFileSystem();
    const command = createUpdateExchangeRatesCommand(createTestRuntimeFactory({clock: fixedClock("2024-01-01T00:00:00.000Z"), http, files}));

    const execution = await command.run(["--year", "2023"]);

    expect(execution).toMatchObject({status: "completed", exitCode: 0});
    const written = await files.readText(CSV_PATH);
    const lines = written.trim().split("\n");
    expect(lines[0]).toBe("year,currency,rate_to_ron");
    // EUR->RON is direct: average(4.9, 5.1) = 5.
    expect(lines).toContain("2023,EUR,5");
    // USD->RON cross-rate: average(4.9/1, 5.1/1.2) = average(4.9, 4.25) = 4.575.
    expect(lines).toContain("2023,USD,4.575");
  });

  it("preserves existing CSV records outside the update range and replaces stale records within it", async () => {
    const existingCsv = ["year,currency,rate_to_ron", "2019,USD,4.1", "2024,USD,4.9"].join("\n") + "\n";
    const files = createMemoryFileSystem({[CSV_PATH]: existingCsv});
    const ratesJson = JSON.stringify({
      amount: 1,
      base: "EUR",
      start_date: "2024-01-01",
      end_date: "2024-12-31",
      rates: {"2024-06-01": {RON: 5, USD: 1.1}},
    });
    const http: HttpClient = {request: async () => createHttpResponse(200, ratesJson)};
    const command = createUpdateExchangeRatesCommand(createTestRuntimeFactory({clock: fixedClock("2024-12-31T00:00:00.000Z"), http, files}));

    const execution = await command.run(["--year", "2024"]);

    expect(execution).toMatchObject({status: "completed", exitCode: 0});
    const written = await files.readText(CSV_PATH);
    const lines = written.trim().split("\n");
    // The 2019 record is outside the [2024, 2024] update range and must be preserved verbatim.
    expect(lines).toContain("2019,USD,4.1");
    // The stale 2024 USD average is replaced by the freshly computed one, not merged with it.
    expect(lines).not.toContain("2024,USD,4.9");
    expect(lines.some((line) => line.startsWith("2024,USD,"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// runIfMain entrypoint wiring
// ---------------------------------------------------------------------------

describe("createUpdateExchangeRatesCommand runIfMain", () => {
  it("assigns an exit code through runIfMain() only when the module is the direct entrypoint", async () => {
    const http: HttpClient = {request: async () => createHttpResponse(200, emptyRatesJson)};

    const nonEntryProcessHost = createTestProcessHost(["--year", "2024"]);
    const nonEntryCommand = createUpdateExchangeRatesCommand({
      ...createTestRuntimeFactory({clock: fixedClock("2024-01-01T00:00:00.000Z"), http, files: createMemoryFileSystem()}),
      processHost: {...nonEntryProcessHost, isDirectEntry: (): boolean => false},
    });
    await nonEntryCommand.runIfMain("file:///repo/scripts/update-exchange-rates.ts");
    expect(nonEntryProcessHost.assignedExitCodes).toEqual([]);

    const entryProcessHost = createTestProcessHost(["--year", "2024"]);
    const entryCommand = createUpdateExchangeRatesCommand({
      ...createTestRuntimeFactory({clock: fixedClock("2024-01-01T00:00:00.000Z"), http, files: createMemoryFileSystem()}),
      processHost: entryProcessHost,
    });
    await entryCommand.runIfMain("file:///repo/scripts/update-exchange-rates.ts");
    expect(entryProcessHost.assignedExitCodes).toEqual([0]);
  });
});
