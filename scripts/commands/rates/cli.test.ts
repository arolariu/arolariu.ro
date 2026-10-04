// @vitest-environment node
/**
 * @fileoverview Tests for the effect/cli `rates` command group.
 * @module scripts/commands/rates/cli.test
 *
 * @remarks
 * Each case runs a real `runCli` invocation on the in-memory harness: scripted Frankfurter
 * responses, an in-memory CSV, and the test clock (set to the case's "now" and advanced through
 * the delay between requests) drive the real exchange-rate updater. No module is mocked.
 */

import {Effect, Fiber} from "effect";
import {TestClock} from "effect/testing";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../../cli.ts";
import {exitCodeFor, type CommandExitCode} from "../../platform/exit.ts";
import type {SinkRecord} from "../../platform/Output.ts";
import {makeTestLayer, type TestLayerOptions} from "../../platform/testing.ts";
import {makeRatesCommand} from "./cli.ts";

/** Frankfurter payload with one trading day of RON and USD rates. */
const RATES_JSON = JSON.stringify({amount: 1, base: "EUR", start_date: "", end_date: "", rates: {"2024-01-02": {RON: 5, USD: 1.25}}});

/** Outcome of one `rates` invocation. */
interface RatesRun {
  readonly code: CommandExitCode;
  readonly output: readonly SinkRecord[];
  readonly stderr: string;
  readonly years: readonly number[];
  readonly processCalls: number;
}

/**
 * Runs `rates` against `argv` on a fresh harness whose test clock starts at `now`.
 *
 * @param argv - Arguments after the program name.
 * @param options - Harness options plus the clock start instant (default `2025-06-01`).
 * @returns The exit code, every sink record, the stderr text, the requested years, and the process call count.
 */
async function run(argv: readonly string[], options: TestLayerOptions & {readonly now?: number} = {}): Promise<RatesRun> {
  const harness = makeTestLayer({http: [{match: () => true, respond: {status: 200, body: RATES_JSON}}], ...options});
  const program = Effect.gen(function* () {
    yield* TestClock.setTime(options.now ?? Date.UTC(2025, 5, 1));
    const fiber = yield* Effect.forkChild(Effect.exit(runCli(argv, makeRootCommand([makeRatesCommand()]))));
    // Advance the test clock through the delay between requests until the invocation finishes.
    while (fiber.pollUnsafe() === undefined) {
      yield* Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
      yield* TestClock.adjust("500 millis");
    }
    return yield* Fiber.join(fiber);
  });
  const exit = await Effect.runPromise(program.pipe(Effect.provide(harness.layer)));
  const output = harness.output();
  return {
    code: exitCodeFor(exit, undefined),
    output,
    stderr: output
      .filter((record) => record.stream === "stderr")
      .map((record) => record.text)
      .join(""),
    years: harness.httpCalls().map((request) => Number(/\/v1\/(\d{4})-01-01\.\./u.exec(request.url)?.[1])),
    processCalls: harness.processCalls().length,
  };
}

describe("rates command", () => {
  it("maps a single year and renders the success line", async () => {
    // Act
    const result = await run(["rates", "update", "--year", "2024"]);

    // Assert
    expect(result.code).toBe(0);
    expect(result.years).toEqual([2024]);
    expect(result.output.at(-1)).toEqual({stream: "stdout", text: "[arolariu::rates] ✅ Updated 1 of 1 year(s).\n"});
  });

  it("maps an explicit range", async () => {
    // Act
    const result = await run(["rates", "update", "--from", "2020", "--to", "2022"]);

    // Assert
    expect(result.code).toBe(0);
    expect(result.years).toEqual([2020, 2021, 2022]);
  });

  it("exits 2 with the legacy message for an invalid year", async () => {
    // Act
    const result = await run(["rates", "update", "--year", "abc"]);

    // Assert
    expect(result.code).toBe(2);
    expect(result.years).toEqual([]);
    expect(result.stderr).toContain('--year must be an integer, got: "abc"');
  });

  it("rejects an inverted range before any request", async () => {
    // Act
    const result = await run(["rates", "update", "--from", "2024", "--to", "2023"]);

    // Assert
    expect(result.code).toBe(2);
    expect(result.processCalls).toBe(0);
    expect(result.years).toEqual([]);
    expect(result.stderr).toBe("[arolariu::rates] ⛔ --from (2024) must be <= --to (2023)\n");
  });

  it("rejects a future --to using the test clock", async () => {
    // Act
    const result = await run(["rates", "update", "--to", "2027"], {now: Date.UTC(2026, 0, 1)});

    // Assert
    expect(result.code).toBe(2);
    expect(result.years).toEqual([]);
    expect(result.stderr).toBe("[arolariu::rates] ⛔ --to must be <= 2026 (current year), got: 2027\n");
  });

  it("fails on a non-2xx API response", async () => {
    // Act
    const result = await run(["rates", "update", "--year", "2024"], {
      http: [{match: () => true, respond: {status: 502, body: "Bad Gateway"}}],
    });

    // Assert
    expect(result.code).toBe(1);
    expect(result.stderr).toBe(
      [
        "[arolariu::rates::2024] ⛔ Failed for 2024: Frankfurter API error: 502\n",
        "[arolariu::rates] ⚠️ Updated 0 of 1 year(s); failed: 2024 (Frankfurter API error: 502).\n",
      ].join(""),
    );
  });

  it("writes the result as the single JSON document in --json mode", async () => {
    // Act
    const result = await run(["rates", "update", "--year", "2024", "--json"]);

    // Assert
    expect(result.code).toBe(0);
    expect(result.output).toEqual([
      {stream: "stdout", text: `${JSON.stringify({years: [2024], updatedYears: [2024], failedYears: []}, null, 2)}\n`},
    ]);
  });
});
