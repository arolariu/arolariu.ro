// @vitest-environment node
/**
 * @fileoverview Tests for the Effect exchange-rate updater.
 * @module scripts/commands/rates/update.test
 *
 * @remarks
 * Every scenario runs on `makeTestLayer`: an in-memory filesystem, scripted Frankfurter responses,
 * and the test clock (set to the scenario's "now" and advanced through the polite delay between
 * requests). Cases that need a per-request outcome, a transport failure, or a hanging request
 * replace only the `HttpClient` boundary. No module is mocked; nothing touches real disk, network,
 * or wall-clock time.
 */

import {join} from "node:path";

import {Cause, Clock, Effect, Exit, Fiber, FileSystem, Option, type Duration, type Scope} from "effect";
import {HttpClient, HttpClientError, HttpClientRequest, HttpClientResponse} from "effect/http";
import {TestClock} from "effect/testing";
import {describe, expect, it} from "vitest";

import {ReportedFailure} from "../../platform/exit.ts";
import type {PlatformServices} from "../../platform/layers.ts";
import {
  effectTest,
  makeTestLayer,
  repositoryFixtureRoot,
  type ScriptedHttp,
  type TestHarness,
  type TestLayerOptions,
} from "../../platform/testing.ts";
import {ExchangeRateApiFailed, ExchangeRateInputInvalid} from "./errors.ts";
import {decodeExchangeRateInput, exchangeRateUsage, fetchYearlyRates, updateExchangeRates} from "./update.ts";

const CSV_PATH = join(repositoryFixtureRoot, "sites", "arolariu.ro", "public", "data", "exchange-rates.csv");

/** Minimal, schema-valid Frankfurter payload with no trading days, for decode/range tests. */
const emptyRatesJson = JSON.stringify({amount: 1, base: "EUR", start_date: "", end_date: "", rates: {}});

/** Scripted HTTP response answering every request with `body` and `status`. */
function answerAll(body: string, status = 200): readonly ScriptedHttp[] {
  return [{match: () => true, respond: {status, body}}];
}

/**
 * Registers an effect test on a fresh harness whose test clock starts at `now`.
 *
 * @param name - The test name.
 * @param now - ISO instant the test clock is set to before the body runs.
 * @param options - Harness options.
 * @param body - The test body.
 */
function ratesTest(
  name: string,
  now: string,
  options: TestLayerOptions & {readonly clock?: "test"},
  body: (harness: TestHarness) => Effect.Effect<void, unknown, PlatformServices | TestClock.TestClock | Scope.Scope>,
): void {
  const harness = makeTestLayer({context: "rates", ...options});
  effectTest(name, () => Effect.andThen(TestClock.setTime(Date.parse(now)), body(harness)), harness.layer);
}

/**
 * Runs an effect while advancing the test clock until it completes, so the request delay elapses.
 *
 * @param effect - The effect to run.
 * @param step - Simulated time added per step.
 * @returns The effect, completed under an advancing test clock.
 */
function advancingClock<A, E, R>(
  effect: Effect.Effect<A, E, R>,
  step: Duration.Input = "100 millis",
): Effect.Effect<A, E, R | TestClock.TestClock> {
  return Effect.gen(function* () {
    const fiber = yield* Effect.forkChild(effect);
    // Lets promise-based response body reads settle before each clock step.
    const settle = Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
    yield* settle;
    while (fiber.pollUnsafe() === undefined) {
      yield* TestClock.adjust(step);
      yield* settle;
    }
    return yield* Fiber.join(fiber);
  });
}

/** Reads the in-memory CSV, or `undefined` when it was never written. */
const readCsv: Effect.Effect<string | undefined, unknown, FileSystem.FileSystem> = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  return (yield* fs.exists(CSV_PATH)) ? yield* fs.readFileString(CSV_PATH) : undefined;
});

/** Years requested so far, parsed from each sent URL. */
function requestedYears(harness: TestHarness): number[] {
  return harness.httpCalls().map((request) => Number(/\/v1\/(\d{4})-01-01\.\./u.exec(request.url)?.[1]));
}

/** Semantic `[arolariu::…]` lines of the harness output, without trailing newlines. */
function semanticLines(harness: TestHarness): string[] {
  return harness
    .output()
    .map((record) => record.text.replace(/\n$/u, ""))
    .filter((text) => text.startsWith("[arolariu::"));
}

/**
 * Builds an `HttpClient` whose outcome depends on the 1-based send ordinal.
 *
 * @param route - Decides each send's outcome: a response, a transport failure (optional description
 * and cause), or a hang.
 * @returns The replacement client.
 */
function routedClient(
  route: (
    send: number,
  ) => {readonly status: number; readonly body: string} | {readonly transport?: string; readonly cause?: unknown} | "hang",
): HttpClient.HttpClient {
  let sends = 0;
  return HttpClient.make((request) => {
    sends += 1;
    const outcome = route(sends);
    if (outcome === "hang") {
      return Effect.never;
    }
    if (!("status" in outcome)) {
      const reason = new HttpClientError.TransportError({
        request,
        ...(outcome.transport === undefined ? {} : {description: outcome.transport}),
        ...(outcome.cause === undefined ? {} : {cause: outcome.cause}),
      });
      return Effect.fail(new HttpClientError.HttpClientError({reason}));
    }
    return Effect.succeed(HttpClientResponse.fromWeb(request, new Response(outcome.body, {status: outcome.status})));
  });
}

// ---------------------------------------------------------------------------
// Decode: --year, --from, --to, defaults
// ---------------------------------------------------------------------------

describe("updateExchangeRates decode", () => {
  describe("defaults", () => {
    ratesTest(
      "uses fromYear=2018 and toYear=<current year> when no options are given",
      "2020-03-01T00:00:00.000Z",
      {http: answerAll(emptyRatesJson)},
      () =>
        Effect.gen(function* () {
          const result = yield* advancingClock(updateExchangeRates(decodeExchangeRateInput({})));

          expect(result).toEqual({years: [2018, 2019, 2020], updatedYears: [2018, 2019, 2020], failedYears: []});
        }),
    );
  });

  describe("--year", () => {
    ratesTest("sets fromYear and toYear to the same value", "2025-06-01T00:00:00.000Z", {http: answerAll(emptyRatesJson)}, () =>
      Effect.gen(function* () {
        const result = yield* updateExchangeRates(decodeExchangeRateInput({year: "2023"}));

        expect(result.years).toEqual([2023]);
      }),
    );

    it.each(["2023.5", "abc"])("rejects a non-integer value (%s) during decode", (value) => {
      expect(() => decodeExchangeRateInput({year: value})).toThrow(ExchangeRateInputInvalid);
      expect(() => decodeExchangeRateInput({year: value})).toThrow(/integer/i);
    });

    it("rejects a year below the supported minimum (2018) during decode", () => {
      expect(() => decodeExchangeRateInput({year: "2015"})).toThrow(ExchangeRateInputInvalid);
      expect(() => decodeExchangeRateInput({year: "2015"})).toThrow(/2018/);
    });

    ratesTest("rejects a year above the test clock's current year", "2025-06-01T00:00:00.000Z", {}, (harness) =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(updateExchangeRates(decodeExchangeRateInput({year: "2026"})));

        expect(error).toBeInstanceOf(ReportedFailure);
        expect(error).toMatchObject({exitCode: 2, message: "--to must be <= 2025 (current year), got: 2026"});
        expect(semanticLines(harness)).toEqual(["[arolariu::rates] ⛔ --to must be <= 2025 (current year), got: 2026"]);
        expect(harness.httpCalls()).toEqual([]);
      }),
    );

    ratesTest("accepts the earliest supported year (2018)", "2025-06-01T00:00:00.000Z", {http: answerAll(emptyRatesJson)}, () =>
      Effect.gen(function* () {
        const result = yield* updateExchangeRates(decodeExchangeRateInput({year: "2018"}));

        expect(result.years).toEqual([2018]);
      }),
    );

    ratesTest("accepts the test clock's current year", "2025-06-01T00:00:00.000Z", {http: answerAll(emptyRatesJson)}, (harness) =>
      Effect.gen(function* () {
        const result = yield* updateExchangeRates(decodeExchangeRateInput({year: "2025"}));

        expect(result.years).toEqual([2025]);
        // The current year ends at today's date.
        expect(harness.httpCalls()[0]?.url).toContain("/v1/2025-01-01..2025-06-01?");
      }),
    );
  });

  describe("--from and --to", () => {
    ratesTest("sets fromYear and toYear independently", "2025-06-01T00:00:00.000Z", {http: answerAll(emptyRatesJson)}, () =>
      Effect.gen(function* () {
        const result = yield* advancingClock(updateExchangeRates(decodeExchangeRateInput({from: "2020", to: "2021"})));

        expect(result.years).toEqual([2020, 2021]);
      }),
    );

    it("rejects from > to during decode", () => {
      expect(() => decodeExchangeRateInput({from: "2025", to: "2020"})).toThrow(ExchangeRateInputInvalid);
    });

    ratesTest("accepts from === to", "2025-06-01T00:00:00.000Z", {http: answerAll(emptyRatesJson)}, () =>
      Effect.gen(function* () {
        const result = yield* updateExchangeRates(decodeExchangeRateInput({from: "2022", to: "2022"}));

        expect(result.years).toEqual([2022]);
      }),
    );

    it.each([
      ["--from", {from: "abc"}],
      ["--to", {to: "abc"}],
    ] as const)("rejects a non-integer %s value during decode", (_flag, options) => {
      expect(() => decodeExchangeRateInput(options)).toThrow(ExchangeRateInputInvalid);
      expect(() => decodeExchangeRateInput(options)).toThrow(/integer/i);
    });

    it("rejects --from below the supported minimum during decode", () => {
      expect(() => decodeExchangeRateInput({from: "2015"})).toThrow(ExchangeRateInputInvalid);
      expect(() => decodeExchangeRateInput({from: "2015"})).toThrow(/2018/);
    });

    ratesTest("rejects --to above the test clock's current year", "2025-06-01T00:00:00.000Z", {}, () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(updateExchangeRates(decodeExchangeRateInput({to: "2026"})));

        expect(error).toMatchObject({_tag: "ReportedFailure", exitCode: 2});
      }),
    );

    ratesTest("uses default fromYear=2018 when only --to is given", "2025-06-01T00:00:00.000Z", {http: answerAll(emptyRatesJson)}, () =>
      Effect.gen(function* () {
        const result = yield* updateExchangeRates(decodeExchangeRateInput({to: "2018"}));

        expect(result.years).toEqual([2018]);
      }),
    );

    ratesTest(
      "uses default toYear=<current year> when only --from is given",
      "2020-03-01T00:00:00.000Z",
      {http: answerAll(emptyRatesJson)},
      () =>
        Effect.gen(function* () {
          const result = yield* updateExchangeRates(decodeExchangeRateInput({from: "2020"}));

          expect(result.years).toEqual([2020]);
        }),
    );
  });

  describe("invalid ranges supplied directly, bypassing decodeExchangeRateInput", () => {
    ratesTest("rejects fromYear > toYear with a usage failure", "2025-01-01T00:00:00.000Z", {}, () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(updateExchangeRates({fromYear: 2025, toYear: 2020}));

        expect(error).toMatchObject({_tag: "ReportedFailure", exitCode: 2, message: "--from (2025) must be <= --to (2020)"});
      }),
    );

    ratesTest("rejects a toYear beyond the test clock's current year", "2025-01-01T00:00:00.000Z", {}, () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(updateExchangeRates({fromYear: 2020, toYear: 2030}));

        expect(error).toMatchObject({_tag: "ReportedFailure", exitCode: 2});
      }),
    );

    ratesTest(
      "rejects a non-finite toYear instead of silently defaulting it to the current year",
      "2025-06-01T00:00:00.000Z",
      {http: answerAll(emptyRatesJson)},
      (harness) =>
        Effect.gen(function* () {
          const error = yield* Effect.flip(updateExchangeRates({fromYear: 2024, toYear: Number.POSITIVE_INFINITY}));

          expect(error).toMatchObject({_tag: "ReportedFailure", exitCode: 2});
          // The CLI-only "default to the current year" sentinel must never be reachable programmatically.
          expect(requestedYears(harness)).toEqual([]);
          expect(yield* readCsv).toBeUndefined();
        }),
    );

    for (const [label, input] of [
      ["a NaN fromYear", {fromYear: Number.NaN, toYear: 2024}],
      ["a NaN toYear", {fromYear: 2024, toYear: Number.NaN}],
      ["a negatively infinite fromYear", {fromYear: Number.NEGATIVE_INFINITY, toYear: 2024}],
      ["a fractional fromYear", {fromYear: 2024.5, toYear: 2024}],
      ["a fractional toYear", {fromYear: 2020, toYear: 2024.5}],
      ["a fromYear below the supported minimum", {fromYear: 2017, toYear: 2020}],
      ["a toYear below the supported minimum", {fromYear: 2017, toYear: 2017}],
    ] as const) {
      ratesTest(`rejects ${label} with a usage failure`, "2025-06-01T00:00:00.000Z", {}, () =>
        Effect.gen(function* () {
          const error = yield* Effect.flip(updateExchangeRates(input));

          expect(error).toMatchObject({_tag: "ReportedFailure", exitCode: 2});
          expect(yield* readCsv).toBeUndefined();
        }),
      );
    }
  });

  describe("range invariants knowable without a clock", () => {
    it("rejects --from > --to during decode, before any request", () => {
      expect(() => decodeExchangeRateInput({from: "2025", to: "2020"})).toThrow(/2025[\s\S]*2020/);
    });
  });
});

// ---------------------------------------------------------------------------
// Continuation, sequencing, and interruption
// ---------------------------------------------------------------------------

describe("updateExchangeRates execution", () => {
  ratesTest("continues past a failed year and records the failure", "2025-06-01T00:00:00.000Z", {}, (harness) =>
    Effect.gen(function* () {
      const validRatesJson = JSON.stringify({
        amount: 1,
        base: "EUR",
        start_date: "2024-01-01",
        end_date: "2024-12-31",
        rates: {"2024-01-02": {RON: 4.97}},
      });
      const client = routedClient((send) => (send === 1 ? {status: 200, body: validRatesJson} : {transport: "upstream unavailable"}));

      const result = yield* advancingClock(
        Effect.provideService(updateExchangeRates({fromYear: 2024, toYear: 2025}), HttpClient.HttpClient, client),
      );

      expect(result).toEqual({years: [2024, 2025], updatedYears: [2024], failedYears: [{year: 2025, message: "upstream unavailable"}]});
      expect(semanticLines(harness)).toContain("[arolariu::rates::2025] ⛔ Failed for 2025: upstream unavailable");
      expect(yield* readCsv).toBe("year,currency,rate_to_ron\n2024,EUR,4.97\n");
    }),
  );

  ratesTest(
    "fetches years in strict ascending order and delays only between requests, not after the last",
    "2022-06-01T00:00:00.000Z",
    {http: answerAll(emptyRatesJson)},
    (harness) =>
      Effect.gen(function* () {
        const startedAt = yield* Clock.currentTimeMillis;

        const result = yield* advancingClock(updateExchangeRates({fromYear: 2020, toYear: 2022}));

        const elapsed = (yield* Clock.currentTimeMillis) - startedAt;
        expect(requestedYears(harness)).toEqual([2020, 2021, 2022]);
        // Two 1500ms delays (between three requests) must elapse; a third (after the last) must not.
        expect(elapsed).toBeGreaterThanOrEqual(3000);
        expect(elapsed).toBeLessThan(4500);
        expect(result.years).toEqual([2020, 2021, 2022]);
      }),
  );

  ratesTest("propagates an interruption instead of recording it as a per-year failure", "2024-01-01T00:00:00.000Z", {}, () =>
    Effect.gen(function* () {
      const client = routedClient(() => "hang");
      const fiber = yield* Effect.forkChild(
        Effect.provideService(updateExchangeRates({fromYear: 2024, toYear: 2024}), HttpClient.HttpClient, client),
      );
      yield* Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

      yield* Fiber.interrupt(fiber);
      const exit = yield* Fiber.await(fiber);

      expect(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause)).toBe(true);
      expect(yield* readCsv).toBeUndefined();
    }),
  );
});

// ---------------------------------------------------------------------------
// Frankfurter schema validation, RON calculation, and merge/write policy
// ---------------------------------------------------------------------------

describe("updateExchangeRates business behavior", () => {
  ratesTest(
    "rejects a malformed Frankfurter response as a per-year failure",
    "2024-01-01T00:00:00.000Z",
    {http: answerAll(JSON.stringify({base: "EUR"}))},
    () =>
      Effect.gen(function* () {
        const result = yield* updateExchangeRates({fromYear: 2024, toYear: 2024});

        expect(result.failedYears).toEqual([{year: 2024, message: "Frankfurter API returned an unexpected response shape."}]);
      }),
  );

  ratesTest(
    "records an unparseable Frankfurter body as a per-year failure",
    "2024-01-01T00:00:00.000Z",
    {http: answerAll("not json")},
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(fetchYearlyRates(2024, 2024, "2024-01-01"));

        expect(error).toMatchObject({_tag: "ExchangeRateApiFailed", status: 200});
        expect((yield* updateExchangeRates({fromYear: 2024, toYear: 2024})).failedYears).toEqual([{year: 2024, message: error.message}]);
      }),
  );

  ratesTest("fails on a non-2xx API response", "2025-06-01T00:00:00.000Z", {http: answerAll("Bad Gateway", 502)}, (harness) =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(fetchYearlyRates(2024, 2025, "2025-06-01"));

      expect(error).toBeInstanceOf(ExchangeRateApiFailed);
      expect(error).toMatchObject({_tag: "ExchangeRateApiFailed", status: 502, message: "Frankfurter API error: 502"});

      const result = yield* updateExchangeRates({fromYear: 2024, toYear: 2024});
      expect(result).toEqual({years: [2024], updatedYears: [], failedYears: [{year: 2024, message: "Frankfurter API error: 502"}]});
      expect(semanticLines(harness)).toContain("[arolariu::rates::2024] ⛔ Failed for 2024: Frankfurter API error: 502");
    }),
  );

  ratesTest("computes yearly average RON cross-rates across multiple trading days", "2024-01-01T00:00:00.000Z", {}, () =>
    Effect.gen(function* () {
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

      yield* Effect.provideService(
        updateExchangeRates(decodeExchangeRateInput({year: "2023"})),
        HttpClient.HttpClient,
        routedClient(() => ({status: 200, body: ratesJson})),
      );

      const lines = ((yield* readCsv) ?? "").trim().split("\n");
      expect(lines[0]).toBe("year,currency,rate_to_ron");
      // EUR->RON is direct: average(4.9, 5.1) = 5.
      expect(lines).toContain("2023,EUR,5");
      // USD->RON cross-rate: average(4.9/1, 5.1/1.2) = average(4.9, 4.25) = 4.575.
      expect(lines).toContain("2023,USD,4.575");
    }),
  );

  ratesTest(
    "preserves existing CSV records outside the update range and replaces stale records within it",
    "2024-12-31T00:00:00.000Z",
    {
      files: {[CSV_PATH]: ["year,currency,rate_to_ron", "2019,USD,4.1", "2024,USD,4.9"].join("\n") + "\n"},
      http: answerAll(
        JSON.stringify({
          amount: 1,
          base: "EUR",
          start_date: "2024-01-01",
          end_date: "2024-12-31",
          rates: {"2024-06-01": {RON: 5, USD: 1.1}},
        }),
      ),
    },
    () =>
      Effect.gen(function* () {
        yield* updateExchangeRates(decodeExchangeRateInput({year: "2024"}));

        const lines = ((yield* readCsv) ?? "").trim().split("\n");
        // The 2019 record is outside the [2024, 2024] update range and must be preserved verbatim.
        expect(lines).toContain("2019,USD,4.1");
        // The stale 2024 USD average is replaced by the freshly computed one, not merged with it.
        expect(lines).not.toContain("2024,USD,4.9");
        expect(lines.some((line) => line.startsWith("2024,USD,"))).toBe(true);
      }),
  );

  ratesTest(
    "writes the CSV for a single year",
    "2025-06-01T00:00:00.000Z",
    {
      http: answerAll(
        JSON.stringify({
          amount: 1,
          base: "EUR",
          start_date: "2024-01-02",
          end_date: "2024-12-31",
          rates: {
            "2024-01-02": {RON: 4.9706, USD: 1.0956, GBP: 0.8667},
            "2024-12-31": {RON: 4.9743, USD: 1.0389, GBP: 0.8292},
          },
        }),
      ),
    },
    (harness) =>
      Effect.gen(function* () {
        // Act
        const result = yield* updateExchangeRates(decodeExchangeRateInput({year: "2024"}));

        // Assert
        expect(result).toEqual({years: [2024], updatedYears: [2024], failedYears: []});
        expect(harness.httpCalls().map((request) => Option.getOrThrow(HttpClientRequest.toUrl(request)).href)).toEqual([
          "https://api.frankfurter.dev/v1/2024-01-01..2024-12-31?base=EUR&symbols=RON,EUR,USD,GBP,CHF,JPY,CAD,AUD,NZD,BRL,MXN,ARS,CLP,COP,PEN,UYU,BOB,PYG,PAB,DOP,CRC,GTQ,HNL,JMD,TTD,CUP,SEK,NOK,DKK,PLN,CZK,HUF,BGN,HRK,TRY,ISK,UAH,MDL,RSD,GEL,ALL,BAM,MKD,BYN,AMD,AZN,KZT,UZS,MNT,INR,PKR,BDT,LKR,NPR,AFN,CNY,KRW,SGD,HKD,TWD,THB,IDR,MYR,PHP,VND,MMK,KHR,LAK,ILS,AED,SAR,KWD,QAR,BHD,OMR,JOD,IQD,LBP,ZAR,EGP,KES,NGN,MAD,TND,DZD,GHS,TZS,UGX,ETB,XOF,XAF,MZN,ZMW,BWP,MUR,RWF,AOA,LYD,FJD,PGK,SOS",
        ]);
        expect(Object.keys(harness.httpCalls()[0]?.headers ?? {})).toEqual([]);
        expect(yield* readCsv).toBe("year,currency,rate_to_ron\n2024,EUR,4.9725\n2024,GBP,5.867\n2024,USD,4.6625\n");
        expect(semanticLines(harness)).toEqual([
          "[arolariu::rates] ℹ️ Updating exchange rates for 2024-2024 (100 currencies).",
          "[arolariu::rates::2024] ✅ Got 3 currency average(s) from 2 trading day(s).",
          `[arolariu::rates] ℹ️ Wrote 3 record(s) to ${CSV_PATH}.`,
        ]);
      }),
  );
});

// ---------------------------------------------------------------------------
// Edge cases of the pure helpers and failure descriptions
// ---------------------------------------------------------------------------

describe("updateExchangeRates edge cases", () => {
  for (const [label, body] of [
    ["a null body", "null"],
    ["a non-object body", "5"],
    ["a null rates field", JSON.stringify({base: "EUR", rates: null})],
  ] as const) {
    ratesTest(`rejects ${label} as an unexpected response shape`, "2024-06-01T00:00:00.000Z", {http: answerAll(body)}, () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(fetchYearlyRates(2023, 2024, "2024-06-01"));

        expect(error).toMatchObject({_tag: "ExchangeRateApiFailed", message: "Frankfurter API returned an unexpected response shape."});
      }),
    );
  }

  ratesTest(
    "fails on the response limit before the status check when a body exceeds 10 MiB",
    "2025-06-01T00:00:00.000Z",
    {http: answerAll("x".repeat(10 * 1024 * 1024 + 1), 502)},
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(fetchYearlyRates(2024, 2025, "2025-06-01"));

        expect(error).toEqual(new ExchangeRateApiFailed({message: "Response exceeded the 10485760 byte limit.", status: 502}));
        const result = yield* updateExchangeRates({fromYear: 2024, toYear: 2024});
        expect(result.failedYears).toEqual([{year: 2024, message: "Response exceeded the 10485760 byte limit."}]);
      }),
  );

  ratesTest("skips trading days without a RON rate", "2024-06-01T00:00:00.000Z", {}, () =>
    Effect.gen(function* () {
      const ratesJson = JSON.stringify({base: "EUR", rates: {"2023-01-02": {USD: 1.1}, "2023-01-03": {RON: 5, USD: 1.25}}});
      const client = routedClient(() => ({status: 200, body: ratesJson}));

      const records = yield* Effect.provideService(fetchYearlyRates(2023, 2024, "2024-06-01"), HttpClient.HttpClient, client);

      expect(records).toEqual([
        {year: 2023, currency: "EUR", rateToRon: 5},
        {year: 2023, currency: "USD", rateToRon: 4},
      ]);
    }),
  );

  for (const [label, outcome, message] of [
    ["the cause message when a transport failure has no description", {cause: new Error("socket hang up")}, "socket hang up"],
    ["the client message when a transport failure has neither description nor cause", {}, "Transport error (GET "],
  ] as const) {
    ratesTest(`records ${label}`, "2024-06-01T00:00:00.000Z", {}, () =>
      Effect.gen(function* () {
        const result = yield* Effect.provideService(
          updateExchangeRates({fromYear: 2023, toYear: 2023}),
          HttpClient.HttpClient,
          routedClient(() => outcome),
        );

        expect(result.failedYears).toHaveLength(1);
        expect(result.failedYears[0]?.message.startsWith(message)).toBe(true);
      }),
    );
  }

  ratesTest(
    "ignores blank and incomplete lines of the existing CSV",
    "2024-06-01T00:00:00.000Z",
    {
      files: {[CSV_PATH]: "year,currency,rate_to_ron\n2019,USD,4.1\n\n2019,GBP\n,EUR,4.9\n"},
      http: answerAll(JSON.stringify({base: "EUR", rates: {"2023-01-02": {RON: 5}}})),
    },
    () =>
      Effect.gen(function* () {
        yield* updateExchangeRates({fromYear: 2023, toYear: 2023});

        expect(yield* readCsv).toBe("year,currency,rate_to_ron\n2019,USD,4.1\n2023,EUR,5\n");
      }),
  );

  ratesTest("treats an unexpected throw from an input step as a defect", "2024-06-01T00:00:00.000Z", {}, (harness) =>
    Effect.gen(function* () {
      const failure = new Error("boom");

      const exit = yield* Effect.exit(
        exchangeRateUsage(() => {
          throw failure;
        }),
      );

      expect(Exit.isFailure(exit) && Cause.squash(exit.cause)).toBe(failure);
      expect(semanticLines(harness)).toEqual([]);
    }),
  );
});
