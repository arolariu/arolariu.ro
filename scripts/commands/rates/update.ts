/**
 * @fileoverview Effect program that updates exchange rates from the Frankfurter API.
 * @module scripts/commands/rates/update
 *
 * @remarks
 * Fetches daily exchange rates from the Frankfurter API for each year, computes yearly averages,
 * and writes the result to the static CSV file. Every ambient effect goes through a platform
 * service: `HttpClient` for Frankfurter, `FileSystem`/`Path` for the CSV, `Environment` for the
 * working directory, `Presenter` for success and fatal lines, and `Clock` (through `DateTime` and
 * `Effect.sleep`) for the current year and the polite delay between requests. The input decoder
 * and range resolver stay pure functions.
 *
 * **Usage:**
 * ```bash
 * npm run rates:update
 * npm run rates:update -- --year 2025
 * npm run rates:update -- --from 2020 --to 2025
 * ```
 *
 * **API:** https://frankfurter.dev/
 * - Free, open-source, no API key needed
 * - Rate limits: be respectful, add delays between requests
 *
 * @see {@link https://frankfurter.dev/docs} for Frankfurter API documentation
 */

import {DateTime, Duration, Effect, FileSystem, Path, References, type PlatformError} from "effect";
import {HttpClient, HttpClientRequest, type HttpClientError} from "effect/http";

import {Environment} from "../../platform/Environment.ts";
import {ReportedFailure} from "../../platform/exit.ts";
import {writeTextAtomic} from "../../platform/Files.ts";
import {readBoundedText} from "../../platform/Http.ts";
import {Presenter, withLogContext} from "../../platform/Output.ts";
import {ExchangeRateApiFailed, ExchangeRateInputInvalid} from "./errors.ts";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const FRANKFURTER_API = "https://api.frankfurter.dev";

/** `[arolariu::<context>]` prefix context of the `rates` family; the CLI sets it through `withCommandOutput`. */
export const RATES_LOG_CONTEXT = "rates";

/** Top 100 currencies to track (by global relevance + Romanian context). */
const TARGET_CURRENCIES = [
  // Major reserve currencies
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "JPY",
  // Americas
  "CAD",
  "AUD",
  "NZD",
  "BRL",
  "MXN",
  "ARS",
  "CLP",
  "COP",
  "PEN",
  "UYU",
  "BOB",
  "PYG",
  "PAB",
  "DOP",
  "CRC",
  "GTQ",
  "HNL",
  "JMD",
  "TTD",
  "CUP",
  // Europe (non-Eurozone)
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "CZK",
  "HUF",
  "BGN",
  "HRK",
  "TRY",
  "ISK",
  "UAH",
  "MDL",
  "RSD",
  "GEL",
  "ALL",
  "BAM",
  "MKD",
  "BYN",
  // Caucasus & Central Asia
  "AMD",
  "AZN",
  "KZT",
  "UZS",
  "MNT",
  // South Asia
  "INR",
  "PKR",
  "BDT",
  "LKR",
  "NPR",
  "AFN",
  // East & Southeast Asia
  "CNY",
  "KRW",
  "SGD",
  "HKD",
  "TWD",
  "THB",
  "IDR",
  "MYR",
  "PHP",
  "VND",
  "MMK",
  "KHR",
  "LAK",
  // Middle East
  "ILS",
  "AED",
  "SAR",
  "KWD",
  "QAR",
  "BHD",
  "OMR",
  "JOD",
  "IQD",
  "LBP",
  // Africa
  "ZAR",
  "EGP",
  "KES",
  "NGN",
  "MAD",
  "TND",
  "DZD",
  "GHS",
  "TZS",
  "UGX",
  "ETB",
  "XOF",
  "XAF",
  "MZN",
  "ZMW",
  "BWP",
  "MUR",
  "RWF",
  "AOA",
  "LYD",
  // Pacific
  "FJD",
  "PGK",
  // Other
  "SOS",
] as const;

/** Delay between API requests to avoid overwhelming the service. */
const REQUEST_DELAY = Duration.millis(1500);

/** Earliest year for which Frankfurter data is reliably available. */
const EARLIEST_SUPPORTED_YEAR = 2018;

/**
 * Placeholder {@link ExchangeRateInput.toYear} carried by parser-produced input whose upper bound
 * must default to the current year.
 *
 * @remarks
 * {@link decodeExchangeRateInput} runs before the command reads the `Clock`, so it has no "current
 * year" to resolve against. The value is deliberately not a valid year: it is never read (the
 * identity registry below decides), and it fails upper-bound validation loudly if it ever escapes.
 */
const CURRENT_YEAR_PLACEHOLDER = Number.POSITIVE_INFINITY;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One currency's yearly average rate, expressed in RON. */
export interface RateRecord {
  readonly year: number;
  readonly currency: string;
  readonly rateToRon: number;
}

type FrankfurterResponse = {
  base: string;
  start_date: string;
  end_date: string;
  rates: Record<string, Record<string, number>>;
};

/** Validated year range for the exchange-rate update operation. */
export interface ExchangeRateInput {
  readonly fromYear: number;
  readonly toYear: number;
}

/** Typed business result of one exchange-rate update invocation. */
export interface ExchangeRateResult {
  /** Every year in the resolved `fromYear`–`toYear` range, ascending. */
  readonly years: readonly number[];
  /** Years whose Frankfurter fetch succeeded and were merged into the CSV. */
  readonly updatedYears: readonly number[];
  /** Years whose Frankfurter fetch failed, with the failure message. */
  readonly failedYears: readonly Readonly<{year: number; message: string}>[];
}

/** Services the exchange-rate updater requires. */
export type ExchangeRateRequirements = HttpClient.HttpClient | FileSystem.FileSystem | Path.Path | Presenter | Environment;

/** Outcome of one year's fetch. */
type YearOutcome =
  | {readonly kind: "updated"; readonly year: number; readonly records: readonly RateRecord[]}
  | {readonly kind: "failed"; readonly year: number; readonly message: string};

// ---------------------------------------------------------------------------
// Input helpers (pure)
// ---------------------------------------------------------------------------

/**
 * Validates one already-numeric year bound.
 *
 * @param label - Bound name used in thrown diagnostics.
 * @param value - Candidate year.
 * @returns The validated year.
 * @throws {ExchangeRateInputInvalid} When `value` is not a finite integer or is below
 * {@link EARLIEST_SUPPORTED_YEAR}.
 */
function requireSupportedYear(label: string, value: number): number {
  if (!Number.isInteger(value)) {
    throw new ExchangeRateInputInvalid({message: `${label} must be a finite integer year, got: ${String(value)}`});
  }
  if (value < EARLIEST_SUPPORTED_YEAR) {
    throw new ExchangeRateInputInvalid({message: `${label} must be >= ${EARLIEST_SUPPORTED_YEAR} (earliest supported), got: ${value}`});
  }

  return value;
}

/**
 * Parses and validates one `--year`/`--from`/`--to` option value.
 *
 * @param name - Option name used in thrown diagnostics.
 * @param raw - Raw option value.
 * @returns The parsed year.
 * @throws {ExchangeRateInputInvalid} When `raw` is not an integer or is below {@link EARLIEST_SUPPORTED_YEAR}.
 */
function parseYearOption(name: string, raw: string): number {
  const trimmed = raw.trim();
  const year = Number(trimmed);
  if (trimmed === "" || !Number.isInteger(year)) {
    throw new ExchangeRateInputInvalid({message: `${name} must be an integer, got: "${raw}"`});
  }

  return requireSupportedYear(name, year);
}

/**
 * Identity registry of the exact input objects {@link decodeExchangeRateInput} produced with an
 * unset upper bound.
 *
 * @remarks
 * Membership — not the numeric value of {@link ExchangeRateInput.toYear} — is what authorizes the
 * "default to the current year" resolution, so a programmatic {@link updateExchangeRates} caller
 * cannot forge the CLI-only default by passing {@link CURRENT_YEAR_PLACEHOLDER} (or any other
 * non-finite value) and receives a usage failure instead. This keeps the published
 * `ExchangeRateInput` contract exactly `{fromYear, toYear}`; callers must pass the decoded object
 * through by reference.
 */
const parserDefaultedUpperBound = new WeakSet<ExchangeRateInput>();

/**
 * Builds the parser-produced range whose upper bound defaults to the current year.
 *
 * @param fromYear - Validated lower bound.
 * @returns A range registered as carrying a defaulted upper bound.
 */
function createDefaultedUpperBoundRange(fromYear: number): ExchangeRateInput {
  const input: ExchangeRateInput = {fromYear, toYear: CURRENT_YEAR_PLACEHOLDER};
  parserDefaultedUpperBound.add(input);
  return input;
}

/**
 * Enforces the `fromYear <= toYear` invariant.
 *
 * @param fromYear - Inclusive lower bound.
 * @param toYear - Inclusive upper bound.
 * @throws {ExchangeRateInputInvalid} When the range is inverted.
 */
function requireOrderedRange(fromYear: number, toYear: number): void {
  if (fromYear > toYear) {
    throw new ExchangeRateInputInvalid({message: `--from (${fromYear}) must be <= --to (${toYear})`});
  }
}

/**
 * Converts parsed CLI option strings into a typed year range.
 *
 * @remarks
 * Rejects non-integer year values, years below {@link EARLIEST_SUPPORTED_YEAR}, and — whenever both
 * bounds are already known without a clock — an inverted `fromYear <= toYear` range. Only the
 * current-year upper bound, which is meaningless without "today", is deferred to
 * {@link updateExchangeRates} and the `Clock`.
 *
 * @param opts - Raw string options extracted from the parsed CLI flags.
 * @returns A year range; when neither `--year` nor `--to` was supplied, the returned object is
 * registered as carrying a defaulted upper bound.
 * @throws {ExchangeRateInputInvalid} When a year value fails integer or lower-bound validation, or
 * when both explicit bounds are inverted.
 */
export function decodeExchangeRateInput(opts: Readonly<{year?: string; from?: string; to?: string}>): ExchangeRateInput {
  if (opts.year !== undefined) {
    const year = parseYearOption("--year", opts.year);
    return {fromYear: year, toYear: year};
  }

  const fromYear = opts.from === undefined ? EARLIEST_SUPPORTED_YEAR : parseYearOption("--from", opts.from);
  if (opts.to === undefined) {
    return createDefaultedUpperBoundRange(fromYear);
  }

  const toYear = parseYearOption("--to", opts.to);
  requireOrderedRange(fromYear, toYear);
  return {fromYear, toYear};
}

/**
 * Resolves a decoded or programmatic year range against the current year and validates every
 * remaining invariant.
 *
 * @remarks
 * A programmatic caller bypasses {@link decodeExchangeRateInput}, so this is the only validation
 * point for its input: both bounds are re-checked here, and the current-year default applies
 * exclusively to the parser-produced range registered in {@link parserDefaultedUpperBound}.
 *
 * @param input - Decoded or programmatic year range.
 * @param currentYear - Current year observed from the `Clock`.
 * @returns The fully resolved, validated year range.
 * @throws {ExchangeRateInputInvalid} When either bound is not a supported year, the resolved
 * `toYear` exceeds `currentYear`, or `fromYear` exceeds the resolved `toYear`.
 */
function resolveYearRange(input: Readonly<ExchangeRateInput>, currentYear: number): Readonly<{fromYear: number; toYear: number}> {
  const fromYear = requireSupportedYear("fromYear", input.fromYear);
  const toYear = parserDefaultedUpperBound.has(input) ? currentYear : requireSupportedYear("toYear", input.toYear);
  if (toYear > currentYear) {
    throw new ExchangeRateInputInvalid({message: `--to must be <= ${currentYear} (current year), got: ${toYear}`});
  }
  requireOrderedRange(fromYear, toYear);

  return {fromYear, toYear};
}

/**
 * Runs a pure exchange-rate input step and turns its input failure into a usage failure.
 *
 * @param evaluate - The pure step; it may throw {@link ExchangeRateInputInvalid}.
 * @returns The step's value. An {@link ExchangeRateInputInvalid} is rendered through
 * `Presenter.fatal` and fails with `ReportedFailure({exitCode: 2, message})`; any other throw is a
 * defect.
 */
export function exchangeRateUsage<T>(evaluate: () => T): Effect.Effect<T, ReportedFailure, Presenter> {
  return Effect.suspend(() => {
    try {
      return Effect.succeed(evaluate());
    } catch (error) {
      if (!(error instanceof ExchangeRateInputInvalid)) {
        return Effect.die(error);
      }
      return Effect.gen(function* () {
        yield* (yield* Presenter).fatal(error.message);
        return yield* new ReportedFailure({exitCode: 2, message: error.message});
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Frankfurter and CSV helpers
// ---------------------------------------------------------------------------

/**
 * Parses one Frankfurter response body, guarding against an unexpected payload shape.
 *
 * @param text - Raw response body text.
 * @param status - Response status, carried by the failure.
 * @returns The parsed response, or {@link ExchangeRateApiFailed} when the body is not valid JSON
 * or its `rates` field is not an object.
 */
function parseFrankfurterResponse(text: string, status: number): Effect.Effect<FrankfurterResponse, ExchangeRateApiFailed> {
  return Effect.try({
    try: (): unknown => JSON.parse(text),
    // JSON.parse only throws SyntaxError.
    catch: (error) => new ExchangeRateApiFailed({message: (error as SyntaxError).message, status}),
  }).pipe(
    Effect.flatMap((parsed) => {
      const rates = (parsed as {rates?: unknown} | null)?.rates;
      if (typeof parsed !== "object" || parsed === null || typeof rates !== "object" || rates === null) {
        return Effect.fail(new ExchangeRateApiFailed({message: "Frankfurter API returned an unexpected response shape.", status}));
      }
      return Effect.succeed(parsed as FrankfurterResponse);
    }),
  );
}

/**
 * Describes an HTTP client failure the way the legacy client did: the underlying cause.
 *
 * @param error - The HTTP client failure.
 * @returns The failure description, its cause message, or the formatted client message.
 */
function transportMessage(error: HttpClientError.HttpClientError): string {
  const {reason} = error;
  if (typeof reason.description === "string" && reason.description.length > 0) {
    return reason.description;
  }
  return "cause" in reason && reason.cause instanceof Error ? reason.cause.message : error.message;
}

/**
 * Computes yearly average RON rates from EUR-based daily snapshots.
 *
 * @remarks
 * For each day, `rate_to_ron(CURRENCY) = eur_to_ron / eur_to_currency`, where both rates come from
 * the same snapshot; EUR → RON is direct. Days without RON data are skipped. Averages are rounded
 * to four decimal places and sorted by currency code.
 *
 * @param year - Year every record belongs to.
 * @param dailyRates - Frankfurter daily rates keyed by date.
 * @returns One record per currency observed at least once.
 */
function computeYearlyAverages(year: number, dailyRates: FrankfurterResponse["rates"]): RateRecord[] {
  const currencySums = new Map<string, {sum: number; count: number}>();

  for (const [, dayRates] of Object.entries(dailyRates)) {
    const eurToRon = dayRates["RON"];
    if (!eurToRon) continue; // Skip days without RON data

    for (const currency of TARGET_CURRENCIES) {
      const eurToCurrency = dayRates[currency];
      if (!eurToCurrency) continue;

      // Cross-rate: 1 CURRENCY = (eurToRon / eurToCurrency) RON
      const rateToRon = eurToRon / eurToCurrency;

      const existing = currencySums.get(currency) ?? {sum: 0, count: 0};
      currencySums.set(currency, {
        sum: existing.sum + rateToRon,
        count: existing.count + 1,
      });
    }

    // EUR → RON is direct
    const eurExisting = currencySums.get("EUR") ?? {sum: 0, count: 0};
    currencySums.set("EUR", {
      sum: eurExisting.sum + eurToRon,
      count: eurExisting.count + 1,
    });
  }

  const records: RateRecord[] = [];
  for (const [currency, {sum, count}] of currencySums.entries()) {
    if (count === 0) continue;
    records.push({
      year,
      currency,
      rateToRon: Math.round((sum / count) * 10000) / 10000, // 4 decimal places
    });
  }

  // Sort by currency code for consistent output
  records.sort((a, b) => a.currency.localeCompare(b.currency));
  return records;
}

/**
 * Fetches daily rates from Frankfurter for a specific year, converting to RON.
 *
 * @remarks
 * Frankfurter doesn't support RON as a base currency directly, so this fetches EUR-based rates
 * (including RON and every target currency) and computes cross-rates through
 * {@link computeYearlyAverages}. The current year ends at `today`. The body is read (bounded to
 * 10 MiB through `readBoundedText`, like the legacy client) before the status is checked, as the
 * legacy client did.
 *
 * @param year - Year to fetch.
 * @param currentYear - Current year observed from the `Clock`.
 * @param today - Today's date (`YYYY-MM-DD`), the end date for the current year.
 * @returns The yearly averages; fails with {@link ExchangeRateApiFailed} for a non-2xx status or
 * an unexpected body, or with the HTTP client failure for a transport error.
 */
export const fetchYearlyRates: (
  year: number,
  currentYear: number,
  today: string,
) => Effect.Effect<readonly RateRecord[], ExchangeRateApiFailed | HttpClientError.HttpClientError, HttpClient.HttpClient | Presenter> =
  Effect.fn("rates.fetchYearlyRates")(function* (year: number, currentYear: number, today: string) {
    const client = yield* HttpClient.HttpClient;
    const startDate = `${year}-01-01`;
    const endDate = year === currentYear ? today : `${year}-12-31`;

    yield* Effect.logDebug(`Fetching ${startDate} to ${endDate}.`);

    const currenciesParam = ["RON", ...TARGET_CURRENCIES].join(",");
    const url = `${FRANKFURTER_API}/v1/${startDate}..${endDate}?base=EUR&symbols=${currenciesParam}`;
    // Keep the legacy request headers exactly: no trace propagation headers to Frankfurter.
    const response = yield* client
      .execute(HttpClientRequest.get(url))
      .pipe(Effect.provideService(HttpClient.TracerPropagationEnabled, false));
    // Bounded like the legacy client (10 MiB); an oversized body fails before the status check, as before.
    const body = yield* readBoundedText(response).pipe(
      Effect.catchTag("ResponseTooLarge", (error) =>
        Effect.fail(new ExchangeRateApiFailed({message: error.message, status: response.status})),
      ),
    );
    if (response.status < 200 || response.status >= 300) {
      return yield* new ExchangeRateApiFailed({message: `Frankfurter API error: ${response.status}`, status: response.status});
    }

    const data = yield* parseFrankfurterResponse(body, response.status);
    const records = computeYearlyAverages(year, data.rates);

    yield* (yield* Presenter).success(`Got ${records.length} currency average(s) from ${Object.keys(data.rates).length} trading day(s).`);

    return records;
  });

/**
 * Parses CSV content, keeping only records for years outside the update range.
 *
 * @param content - CSV file content, header included.
 * @param fromYear - Inclusive lower bound of the years being updated.
 * @param toYear - Inclusive upper bound of the years being updated.
 * @returns Records for every year outside `[fromYear, toYear]`.
 */
function parsePreservedRecords(content: string, fromYear: number, toYear: number): RateRecord[] {
  const lines = content.split("\n").slice(1); // Skip header
  const records: RateRecord[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(",");
    const yearStr = parts[0];
    const currency = parts[1];
    const rateStr = parts[2];
    if (!yearStr || !currency || !rateStr) continue;

    const year = Number(yearStr);
    // Keep records outside the update range
    if (year < fromYear || year > toYear) {
      records.push({year, currency, rateToRon: Number(rateStr)});
    }
  }

  return records;
}

/**
 * Reads existing CSV records, preserving data for years not being updated.
 *
 * @param csvPath - Absolute path to the exchange-rate CSV file.
 * @param fromYear - Inclusive lower bound of the years being updated.
 * @param toYear - Inclusive upper bound of the years being updated.
 * @returns Records for every year outside `[fromYear, toYear]`, or an empty array when the CSV
 * file does not yet exist.
 */
function readExistingRecords(
  csvPath: string,
  fromYear: number,
  toYear: number,
): Effect.Effect<RateRecord[], PlatformError.PlatformError, FileSystem.FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    if (!(yield* fs.exists(csvPath))) return [];
    return parsePreservedRecords(yield* fs.readFileString(csvPath), fromYear, toYear);
  });
}

/**
 * Writes all records to the CSV file, atomically and creating missing parent directories.
 *
 * @param csvPath - Absolute path to the exchange-rate CSV file.
 * @param records - Every record to persist, merged across preserved and updated years.
 * @returns An effect that completes once the CSV holds every record, sorted by year then currency.
 */
function writeCSV(
  csvPath: string,
  records: readonly RateRecord[],
): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem | Path.Path> {
  const sorted = [...records].sort((a, b) => a.year - b.year || a.currency.localeCompare(b.currency));

  const lines = ["year,currency,rate_to_ron"];
  for (const record of sorted) {
    lines.push(`${record.year},${record.currency},${record.rateToRon}`);
  }

  return writeTextAtomic(csvPath, `${lines.join("\n")}\n`);
}

/**
 * Appends `::<year>` to the `[arolariu::<context>]` prefix of an effect's log and presenter lines.
 *
 * @remarks
 * The parent is the inherited log context (set by the CLI's `withCommandOutput("rates")`), or
 * {@link RATES_LOG_CONTEXT} when none is set.
 *
 * @param year - The year the effect works on.
 * @returns A function that sets the year log context on an effect.
 */
function withYearLogContext(year: number): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R> {
  return <A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.gen(function* () {
      const inherited = (yield* Effect.service(References.CurrentLogAnnotations))["context"];
      const parent = typeof inherited === "string" ? inherited : RATES_LOG_CONTEXT;
      return yield* self.pipe(withLogContext(`${parent}::${String(year)}`));
    });
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

/**
 * Updates the exchange-rate CSV for the selected year range.
 *
 * @remarks
 * Resolves the current-year upper bound from the `Clock`, then fetches years in strict ascending
 * order (`concurrency: 1`) with a polite delay between requests. A per-year Frankfurter failure is
 * logged, recorded in {@link ExchangeRateResult.failedYears}, and does not stop later years; only
 * an interruption propagates past the loop. The merged CSV is written even when some years failed.
 *
 * @param input - Decoded or programmatic year range, passed by reference so a parser-defaulted
 * upper bound is still recognized; both bounds are validated here.
 * @returns The years attempted, the years successfully updated, and any per-year failures. An
 * invalid range is rendered through `Presenter.fatal` and fails with
 * `ReportedFailure({exitCode: 2})` before any request; a CSV read or write failure fails with the
 * `PlatformError`.
 */
export const updateExchangeRates: (
  input: Readonly<ExchangeRateInput>,
) => Effect.Effect<ExchangeRateResult, PlatformError.PlatformError | ReportedFailure, ExchangeRateRequirements> = Effect.fn(
  "rates.updateExchangeRates",
)(function* (input: Readonly<ExchangeRateInput>) {
  const environment = yield* Environment;
  const path = yield* Path.Path;

  const nowIso = DateTime.formatIso(yield* DateTime.now);
  const currentYear = Number(nowIso.slice(0, 4));
  const today = nowIso.slice(0, 10);
  const {fromYear, toYear} = yield* exchangeRateUsage(() => resolveYearRange(input, currentYear));

  const csvPath = path.join(environment.cwd, "sites", "arolariu.ro", "public", "data", "exchange-rates.csv");
  yield* Effect.logInfo(`Updating exchange rates for ${fromYear}-${toYear} (${TARGET_CURRENCIES.length} currencies).`);

  const existingRecords = yield* readExistingRecords(csvPath, fromYear, toYear);
  const years = Array.from({length: toYear - fromYear + 1}, (_, index) => fromYear + index);

  const outcomes = yield* Effect.forEach(
    years,
    (year) =>
      fetchYearlyRates(year, currentYear, today).pipe(
        Effect.map((records): YearOutcome => ({kind: "updated", year, records})),
        Effect.catch((error) => {
          const message = error._tag === "ExchangeRateApiFailed" ? error.message : transportMessage(error);
          return Effect.as(Effect.logError(`Failed for ${year}: ${message}`), {kind: "failed", year, message} satisfies YearOutcome);
        }),
        withYearLogContext(year),
        // Be polite to the API.
        Effect.tap(() => (year < toYear ? Effect.sleep(REQUEST_DELAY) : Effect.void)),
      ),
    {concurrency: 1},
  );

  const newRecords = outcomes.flatMap((outcome) => (outcome.kind === "updated" ? outcome.records : []));
  const updatedYears = outcomes.filter((outcome) => outcome.kind === "updated").map((outcome) => outcome.year);
  const failedYears = outcomes.flatMap((outcome) => (outcome.kind === "failed" ? [{year: outcome.year, message: outcome.message}] : []));

  const allRecords = [...existingRecords, ...newRecords];
  yield* writeCSV(csvPath, allRecords);

  yield* Effect.logInfo(`Wrote ${allRecords.length} record(s) to ${csvPath}.`);

  return {years, updatedYears, failedYears};
});
