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

import {CommandInputError} from "../../common/commander.ts";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "../../common/logger.ts";
import {CommandCancellation, type Clock, type HttpClient, type HttpRequest} from "../../common/runtime.ts";
import {
  createHttpResponse,
  createMemoryFileSystem,
  createTestRuntimeFactory,
  repositoryFixtureRoot,
} from "../../common/runtime.testing.ts";
import {createUpdateExchangeRatesCommand, decodeExchangeRateInput} from "./update.ts";

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

      const execution = await command.invoke(decodeExchangeRateInput({}), {presentation: "human"});

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

      const execution = await command.invoke(decodeExchangeRateInput({year: "2023"}), {presentation: "human"});

      expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {years: [2023]}});
    });

    it.each(["2023.5", "abc"])("rejects a non-integer value (%s) during decode", (value) => {
      expect(() => decodeExchangeRateInput({year: value})).toThrow(CommandInputError);
      expect(() => decodeExchangeRateInput({year: value})).toThrow(/integer/i);
    });

    it("rejects a year below the supported minimum (2018) during decode", () => {
      expect(() => decodeExchangeRateInput({year: "2015"})).toThrow(CommandInputError);
      expect(() => decodeExchangeRateInput({year: "2015"})).toThrow(/2018/);
    });

    it("rejects a year above the injected clock's current year", async () => {
      const command = createUpdateExchangeRatesCommand(createTestRuntimeFactory({clock: fixedClock("2025-06-01T00:00:00.000Z")}));

      const execution = await command.invoke(decodeExchangeRateInput({year: "2026"}), {presentation: "human"});

      expect(execution).toMatchObject({status: "failed", exitCode: 2});
      expect(execution.status === "failed" ? execution.failure.message : "").toMatch(/2025/);
    });

    it("accepts the earliest supported year (2018)", async () => {
      const http: HttpClient = {request: async () => createHttpResponse(200, emptyRatesJson)};
      const command = createUpdateExchangeRatesCommand(
        createTestRuntimeFactory({clock: fixedClock("2025-06-01T00:00:00.000Z"), http, files: createMemoryFileSystem()}),
      );

      const execution = await command.invoke(decodeExchangeRateInput({year: "2018"}), {presentation: "human"});

      expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {years: [2018]}});
    });

    it("accepts the injected clock's current year", async () => {
      const http: HttpClient = {request: async () => createHttpResponse(200, emptyRatesJson)};
      const command = createUpdateExchangeRatesCommand(
        createTestRuntimeFactory({clock: fixedClock("2025-06-01T00:00:00.000Z"), http, files: createMemoryFileSystem()}),
      );

      const execution = await command.invoke(decodeExchangeRateInput({year: "2025"}), {presentation: "human"});

      expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {years: [2025]}});
    });
  });

  describe("--from and --to", () => {
    it("sets fromYear and toYear independently", async () => {
      const http: HttpClient = {request: async () => createHttpResponse(200, emptyRatesJson)};
      const command = createUpdateExchangeRatesCommand(
        createTestRuntimeFactory({clock: fixedClock("2025-06-01T00:00:00.000Z"), http, files: createMemoryFileSystem()}),
      );

      const execution = await command.invoke(decodeExchangeRateInput({from: "2020", to: "2021"}), {presentation: "human"});

      expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {years: [2020, 2021]}});
    });

    it("rejects from > to during decode", () => {
      expect(() => decodeExchangeRateInput({from: "2025", to: "2020"})).toThrow(CommandInputError);
    });

    it("accepts from === to", async () => {
      const http: HttpClient = {request: async () => createHttpResponse(200, emptyRatesJson)};
      const command = createUpdateExchangeRatesCommand(
        createTestRuntimeFactory({clock: fixedClock("2025-06-01T00:00:00.000Z"), http, files: createMemoryFileSystem()}),
      );

      const execution = await command.invoke(decodeExchangeRateInput({from: "2022", to: "2022"}), {presentation: "human"});

      expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {years: [2022]}});
    });

    it.each([
      ["--from", {from: "abc"}],
      ["--to", {to: "abc"}],
    ] as const)("rejects a non-integer %s value during decode", (_flag, options) => {
      expect(() => decodeExchangeRateInput(options)).toThrow(CommandInputError);
      expect(() => decodeExchangeRateInput(options)).toThrow(/integer/i);
    });

    it("rejects --from below the supported minimum during decode", () => {
      expect(() => decodeExchangeRateInput({from: "2015"})).toThrow(CommandInputError);
      expect(() => decodeExchangeRateInput({from: "2015"})).toThrow(/2018/);
    });

    it("rejects --to above the injected clock's current year", async () => {
      const command = createUpdateExchangeRatesCommand(createTestRuntimeFactory({clock: fixedClock("2025-06-01T00:00:00.000Z")}));

      const execution = await command.invoke(decodeExchangeRateInput({to: "2026"}), {presentation: "human"});

      expect(execution).toMatchObject({status: "failed", exitCode: 2});
    });

    it("uses default fromYear=2018 when only --to is given", async () => {
      const http: HttpClient = {request: async () => createHttpResponse(200, emptyRatesJson)};
      const command = createUpdateExchangeRatesCommand(
        createTestRuntimeFactory({clock: fixedClock("2025-06-01T00:00:00.000Z"), http, files: createMemoryFileSystem()}),
      );

      const execution = await command.invoke(decodeExchangeRateInput({to: "2018"}), {presentation: "human"});

      expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {years: [2018]}});
    });

    it("uses default toYear=<current year> when only --from is given", async () => {
      const http: HttpClient = {request: async () => createHttpResponse(200, emptyRatesJson)};
      const command = createUpdateExchangeRatesCommand(
        createTestRuntimeFactory({clock: fixedClock("2020-03-01T00:00:00.000Z"), http, files: createMemoryFileSystem()}),
      );

      const execution = await command.invoke(decodeExchangeRateInput({from: "2020"}), {presentation: "human"});

      expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {years: [2020]}});
    });
  });

  describe("invalid ranges supplied directly through invoke(), bypassing decodeExchangeRateInput", () => {
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

    it("rejects a non-finite toYear instead of silently defaulting it to the current year", async () => {
      const requestedYears: number[] = [];
      const http: HttpClient = {
        request: async (request: Readonly<HttpRequest>) => {
          requestedYears.push(Number(/\/v1\/(\d{4})-01-01\.\./.exec(request.url.pathname)?.[1]));
          return createHttpResponse(200, emptyRatesJson);
        },
      };
      const files = createMemoryFileSystem();
      const command = createUpdateExchangeRatesCommand(
        createTestRuntimeFactory({clock: fixedClock("2025-06-01T00:00:00.000Z"), http, files}),
      );

      const execution = await command.invoke({fromYear: 2024, toYear: Number.POSITIVE_INFINITY});

      expect(execution).toMatchObject({status: "failed", exitCode: 2, failure: {kind: "usage"}});
      // The CLI-only "default to the current year" sentinel must never be reachable from invoke().
      expect(requestedYears).toEqual([]);
      expect(await files.exists(CSV_PATH)).toBe(false);
    });

    it.each([
      ["a NaN fromYear", {fromYear: Number.NaN, toYear: 2024}],
      ["a NaN toYear", {fromYear: 2024, toYear: Number.NaN}],
      ["a negatively infinite fromYear", {fromYear: Number.NEGATIVE_INFINITY, toYear: 2024}],
      ["a fractional fromYear", {fromYear: 2024.5, toYear: 2024}],
      ["a fractional toYear", {fromYear: 2020, toYear: 2024.5}],
      ["a fromYear below the supported minimum", {fromYear: 2017, toYear: 2020}],
      ["a toYear below the supported minimum", {fromYear: 2017, toYear: 2017}],
    ])("rejects %s with a usage failure", async (_label, input) => {
      const files = createMemoryFileSystem();
      const command = createUpdateExchangeRatesCommand(
        createTestRuntimeFactory({clock: fixedClock("2025-06-01T00:00:00.000Z"), files}),
      );

      const execution = await command.invoke(input);

      expect(execution).toMatchObject({status: "failed", exitCode: 2, failure: {kind: "usage"}});
      expect(await files.exists(CSV_PATH)).toBe(false);
    });
  });

  describe("range invariants knowable without a clock", () => {
    it("rejects --from > --to during decode, before any runtime scope exists", () => {
      expect(() => decodeExchangeRateInput({from: "2025", to: "2020"})).toThrow(/2025[\s\S]*2020/);
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

    const execution = await command.invoke(decodeExchangeRateInput({year: "2023"}), {presentation: "human"});

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

    const execution = await command.invoke(decodeExchangeRateInput({year: "2024"}), {presentation: "human"});

    expect(execution).toMatchObject({status: "completed", exitCode: 0});
    const written = await files.readText(CSV_PATH);
    const lines = written.trim().split("\n");
    // The 2019 record is outside the [2024, 2024] update range and must be preserved verbatim.
    expect(lines).toContain("2019,USD,4.1");
    // The stale 2024 USD average is replaced by the freshly computed one, not merged with it.
    expect(lines).not.toContain("2024,USD,4.9");
    expect(lines.some((line) => line.startsWith("2024,USD,"))).toBe(true);
  });

  it("characterizes the exact request, CSV bytes, and success line for --year 2024", async () => {
    // Arrange
    const requestedUrls: string[] = [];
    const ratesJson = JSON.stringify({
      amount: 1,
      base: "EUR",
      start_date: "2024-01-02",
      end_date: "2024-12-31",
      rates: {
        "2024-01-02": {RON: 4.9706, USD: 1.0956, GBP: 0.8667},
        "2024-12-31": {RON: 4.9743, USD: 1.0389, GBP: 0.8292},
      },
    });
    const http: HttpClient = {
      request: async (request: Readonly<HttpRequest>) => {
        requestedUrls.push(request.url.href);
        return createHttpResponse(200, ratesJson);
      },
    };
    const files = createMemoryFileSystem();
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("update-exchange-rates", {color: false, sink});
    const command = createUpdateExchangeRatesCommand(
      createTestRuntimeFactory({clock: fixedClock("2025-06-01T00:00:00.000Z"), http, files, logger}),
    );

    // Act
    const execution = await command.invoke(decodeExchangeRateInput({year: "2024"}), {presentation: "human"});

    // Assert
    expect(execution).toEqual({
      status: "completed",
      value: {years: [2024], updatedYears: [2024], failedYears: []},
      exitCode: 0,
    });
    expect(requestedUrls).toEqual([
      "https://api.frankfurter.dev/v1/2024-01-01..2024-12-31?base=EUR&symbols=RON,EUR,USD,GBP,CHF,JPY,CAD,AUD,NZD,BRL,MXN,ARS,CLP,COP,PEN,UYU,BOB,PYG,PAB,DOP,CRC,GTQ,HNL,JMD,TTD,CUP,SEK,NOK,DKK,PLN,CZK,HUF,BGN,HRK,TRY,ISK,UAH,MDL,RSD,GEL,ALL,BAM,MKD,BYN,AMD,AZN,KZT,UZS,MNT,INR,PKR,BDT,LKR,NPR,AFN,CNY,KRW,SGD,HKD,TWD,THB,IDR,MYR,PHP,VND,MMK,KHR,LAK,ILS,AED,SAR,KWD,QAR,BHD,OMR,JOD,IQD,LBP,ZAR,EGP,KES,NGN,MAD,TND,DZD,GHS,TZS,UGX,ETB,XOF,XAF,MZN,ZMW,BWP,MUR,RWF,AOA,LYD,FJD,PGK,SOS",
    ]);
    expect(await files.readText(CSV_PATH)).toBe("year,currency,rate_to_ron\n2024,EUR,4.9725\n2024,GBP,5.867\n2024,USD,4.6625\n");
    expect(sink.records.at(-1)).toEqual({
      stream: "stdout",
      text: "[arolariu::update-exchange-rates] ✅ Updated 1 of 1 year(s).",
      write: false,
    });
  });
});
