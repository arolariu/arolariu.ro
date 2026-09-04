/**
 * @fileoverview Command to update exchange rates from the Frankfurter API.
 * @module scripts/update-exchange-rates
 *
 * @remarks
 * Fetches daily exchange rates from the Frankfurter API for each year, computes yearly averages,
 * and writes the result to the static CSV file. Every ambient effect this command used to reach
 * for directly (`node:fs`, `fetch`, `setTimeout`, `process.exit()`) now arrives through one
 * injected runtime capability bundle, so the full year-range and per-year continuation behavior
 * is exercised by the declarative command runtime's test fakes without touching real disk,
 * network, or process state.
 *
 * **Usage:**
 * ```bash
 * npx tsx scripts/update-exchange-rates.ts
 * npx tsx scripts/update-exchange-rates.ts --year 2025
 * npx tsx scripts/update-exchange-rates.ts --from 2020 --to 2025
 * ```
 *
 * **API:** https://frankfurter.dev/
 * - Free, open-source, no API key needed
 * - Rate limits: be respectful, add delays between requests
 *
 * @see {@link https://frankfurter.dev/docs} for Frankfurter API documentation
 */

import {join} from "node:path";

import {CommandInputError, type CommandExecutionContext} from "./core/command/command-execution.ts";
import {defineCommand, type LazyMonorepoCommand} from "./core/command/lazy-monorepo-command.ts";
import type {CommandConstructionOptions, CommandHost} from "./core/command/command-specification.ts";
import type {TerminalPresenter} from "./core/presentation/terminal-presenter.ts";
import {CommandCancellation, type Clock, type FileSystem, type HttpClient} from "./common/runtime.ts";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const FRANKFURTER_API = "https://api.frankfurter.dev";

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

/** Delay between API requests to avoid overwhelming the service (in ms). */
const REQUEST_DELAY_MS = 1500;

/** Earliest year for which Frankfurter data is reliably available. */
const EARLIEST_SUPPORTED_YEAR = 2018;

/**
 * Placeholder {@link ExchangeRateInput.toYear} carried by parser-produced input whose upper bound
 * must default to the current year.
 *
 * @remarks
 * `decode()` runs before any runtime scope exists, so it has no {@link Clock} to resolve "the
 * current year" against. The value is deliberately not a valid year: it is never read (the
 * identity registry below decides), and it fails upper-bound validation loudly if it ever escapes.
 */
const CURRENT_YEAR_PLACEHOLDER = Number.POSITIVE_INFINITY;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RateRecord = {
  year: number;
  currency: string;
  rateToRon: number;
};

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Validates one already-numeric year bound.
 *
 * @param label - Bound name used in thrown diagnostics.
 * @param value - Candidate year.
 * @returns The validated year.
 * @throws {CommandInputError} When `value` is not a finite integer or is below
 * {@link EARLIEST_SUPPORTED_YEAR}.
 */
function requireSupportedYear(label: string, value: number): number {
  if (!Number.isInteger(value)) {
    throw new CommandInputError(`${label} must be a finite integer year, got: ${String(value)}`);
  }
  if (value < EARLIEST_SUPPORTED_YEAR) {
    throw new CommandInputError(`${label} must be >= ${EARLIEST_SUPPORTED_YEAR} (earliest supported), got: ${value}`);
  }

  return value;
}

/**
 * Parses and validates one `--year`/`--from`/`--to` option value.
 *
 * @param name - Option name used in thrown diagnostics.
 * @param raw - Raw option value.
 * @returns The parsed year.
 * @throws {CommandInputError} When `raw` is not an integer or is below {@link EARLIEST_SUPPORTED_YEAR}.
 */
function parseYearOption(name: string, raw: string): number {
  const trimmed = raw.trim();
  const year = Number(trimmed);
  if (trimmed === "" || !Number.isInteger(year)) {
    throw new CommandInputError(`${name} must be an integer, got: "${raw}"`);
  }

  return requireSupportedYear(name, year);
}

/**
 * Identity registry of the exact input objects {@link decodeExchangeRateInput} produced with an
 * unset upper bound.
 *
 * @remarks
 * Membership — not the numeric value of {@link ExchangeRateInput.toYear} — is what authorizes the
 * "default to the current year" resolution, so a programmatic `invoke()` caller cannot forge the
 * CLI-only default by passing {@link CURRENT_YEAR_PLACEHOLDER} (or any other non-finite value) and
 * receives a usage failure instead. This keeps the published `ExchangeRateInput` contract exactly
 * `{fromYear, toYear}`.
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
 * @throws {CommandInputError} When the range is inverted.
 */
function requireOrderedRange(fromYear: number, toYear: number): void {
  if (fromYear > toYear) {
    throw new CommandInputError(`--from (${fromYear}) must be <= --to (${toYear})`);
  }
}

/**
 * Converts parsed Commander option strings into a typed year range.
 *
 * @remarks
 * Rejects non-integer year values, years below {@link EARLIEST_SUPPORTED_YEAR}, and — whenever both
 * bounds are already known without a clock — an inverted `fromYear <= toYear` range. Only the
 * current-year upper bound, which is meaningless without "today", is deferred to
 * `updateExchangeRates` and the injected {@link Clock}.
 *
 * @param opts - Raw string options extracted from Commander's parsed output.
 * @returns A year range; when neither `--year` nor `--to` was supplied, the returned object is
 * registered as carrying a defaulted upper bound.
 * @throws {CommandInputError} When a year value fails integer or lower-bound validation, or when
 * both explicit bounds are inverted.
 */
function decodeExchangeRateInput(opts: Readonly<{year?: string; from?: string; to?: string}>): ExchangeRateInput {
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
 * `invoke()` bypasses `decode()`, so this is the only validation point for programmatic input: both
 * bounds are re-checked here, and the current-year default applies exclusively to the parser-produced
 * range registered in {@link parserDefaultedUpperBound}.
 *
 * @param input - Decoded or programmatic year range.
 * @param currentYear - Current year observed from the injected {@link Clock}.
 * @returns The fully resolved, validated year range.
 * @throws {CommandInputError} When either bound is not a supported year, the resolved `toYear`
 * exceeds `currentYear`, or `fromYear` exceeds the resolved `toYear`.
 */
function resolveYearRange(
  input: Readonly<ExchangeRateInput>,
  currentYear: number,
): Readonly<{fromYear: number; toYear: number}> {
  const fromYear = requireSupportedYear("fromYear", input.fromYear);
  const toYear = parserDefaultedUpperBound.has(input) ? currentYear : requireSupportedYear("toYear", input.toYear);
  if (toYear > currentYear) {
    throw new CommandInputError(`--to must be <= ${currentYear} (current year), got: ${toYear}`);
  }
  requireOrderedRange(fromYear, toYear);

  return {fromYear, toYear};
}

/**
 * Derives the current year and today's date from the injected clock.
 *
 * @param clock - Injected clock capability; never read from ambient wall-clock state.
 * @returns The current year and today's date (`YYYY-MM-DD`), both derived from one ISO timestamp
 * so they never observe two different instants.
 */
function resolveNowContext(clock: Clock): Readonly<{currentYear: number; today: string}> {
  const nowIso = clock.isoTimestamp();
  return {currentYear: Number(nowIso.slice(0, 4)), today: nowIso.slice(0, 10)};
}

/**
 * Parses one Frankfurter response body, guarding against an unexpected payload shape.
 *
 * @param text - Raw response body text.
 * @returns The parsed response.
 * @throws {Error} When the body is not valid JSON or its `rates` field is not an object.
 */
function parseFrankfurterResponse(text: string): FrankfurterResponse {
  const parsed: unknown = JSON.parse(text);
  const rates = (parsed as {rates?: unknown} | null)?.rates;
  if (typeof parsed !== "object" || parsed === null || typeof rates !== "object" || rates === null) {
    throw new Error("Frankfurter API returned an unexpected response shape.");
  }

  return parsed as FrankfurterResponse;
}

/**
 * Fetches daily rates from Frankfurter for a specific year, converting to RON.
 *
 * @remarks
 * Frankfurter doesn't support RON as a base currency directly.
 * Strategy: Fetch rates with EUR as base, then compute cross-rates to RON.
 *
 * For each day:
 *   rate_to_ron(CURRENCY) = eur_to_ron / eur_to_currency
 *
 * Where eur_to_ron and eur_to_currency come from the same daily snapshot.
 */
async function fetchYearlyRates(
  year: number,
  currentYear: number,
  today: string,
  http: HttpClient,
  signal: AbortSignal,
  logger: TerminalPresenter,
): Promise<RateRecord[]> {
  const startDate = `${year}-01-01`;
  const endDate = year === currentYear ? today : `${year}-12-31`;

  logger.debug(`Fetching ${startDate} to ${endDate}.`);

  // Fetch EUR-based rates (includes RON and all target currencies)
  const currenciesParam = ["RON", ...TARGET_CURRENCIES].join(",");
  const url = new URL(`${FRANKFURTER_API}/v1/${startDate}..${endDate}?base=EUR&symbols=${currenciesParam}`);

  const response = await http.request({url, method: "GET", signal});
  if (!response.ok) {
    throw new Error(`Frankfurter API error: ${response.status}`);
  }

  const data = parseFrankfurterResponse(response.text);
  const dailyRates = data.rates;

  // Compute yearly averages for each currency → RON
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

  // Compute averages
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

  logger.success(`Got ${records.length} currency average(s) from ${Object.keys(dailyRates).length} trading day(s).`);

  return records;
}

/**
 * Reads existing CSV records, preserving data for years not being updated.
 *
 * @param files - Filesystem capability used to read the CSV file.
 * @param csvPath - Absolute path to the exchange-rate CSV file.
 * @param fromYear - Inclusive lower bound of the years being updated.
 * @param toYear - Inclusive upper bound of the years being updated.
 * @returns Records for every year outside `[fromYear, toYear]`, or an empty array when the CSV
 * file does not yet exist.
 */
async function readExistingRecords(
  files: FileSystem,
  csvPath: string,
  fromYear: number,
  toYear: number,
): Promise<RateRecord[]> {
  if (!(await files.exists(csvPath))) return [];

  const content = await files.readText(csvPath);
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
 * Writes all records to the CSV file, atomically and creating missing parent directories.
 *
 * @param files - Filesystem capability used to write the CSV file.
 * @param csvPath - Absolute path to the exchange-rate CSV file.
 * @param records - Every record to persist, merged across preserved and updated years.
 */
async function writeCSV(files: FileSystem, csvPath: string, records: RateRecord[]): Promise<void> {
  // Sort by year then currency
  const sorted = [...records].sort((a, b) => a.year - b.year || a.currency.localeCompare(b.currency));

  const lines = ["year,currency,rate_to_ron"];
  for (const record of sorted) {
    lines.push(`${record.year},${record.currency},${record.rateToRon}`);
  }

  await files.writeTextAtomic(csvPath, `${lines.join("\n")}\n`);
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

/**
 * Updates the configured exchange-rate CSV for the selected year range.
 *
 * @remarks
 * Resolves the current-year upper bound from the injected {@link Clock}, then fetches years in
 * strict ascending order with a polite delay between requests. A per-year Frankfurter failure is
 * recorded in {@link ExchangeRateResult.failedYears} and does not stop later years; only a
 * cancellation propagates past the loop.
 *
 * @param context - Command context providing HTTP, filesystem, clock, and cancellation capabilities.
 * @param input - Decoded or programmatic year range; both bounds are validated here because
 * `invoke()` never runs `decode()`.
 * @returns The years attempted, the years successfully updated, and any per-year failures.
 * @throws {CommandInputError} When either bound is not a supported year, or the resolved year range
 * violates the current-year upper bound or the `fromYear <= toYear` invariant.
 */
async function updateExchangeRates(
  context: Readonly<CommandExecutionContext>,
  input: Readonly<ExchangeRateInput>,
): Promise<ExchangeRateResult> {
  const {http, files, clock, signal, presenter: logger, environment} = context.runtime;

  const {currentYear, today} = resolveNowContext(clock);
  const {fromYear, toYear} = resolveYearRange(input, currentYear);

  const csvPath = join(environment.cwd, "sites", "arolariu.ro", "public", "data", "exchange-rates.csv");
  logger.info(`Updating exchange rates for ${fromYear}-${toYear} (${TARGET_CURRENCIES.length} currencies).`);

  const existingRecords = await readExistingRecords(files, csvPath, fromYear, toYear);
  const newRecords: RateRecord[] = [];
  const years: number[] = [];
  const updatedYears: number[] = [];
  const failedYears: {year: number; message: string}[] = [];

  for (let year = fromYear; year <= toYear; year += 1) {
    years.push(year);
    const yearLogger = logger.child(String(year));

    try {
      // eslint-disable-next-line no-await-in-loop -- years must be fetched in strict ascending sequence.
      const yearRecords = await fetchYearlyRates(year, currentYear, today, http, signal, yearLogger);
      newRecords.push(...yearRecords);
      updatedYears.push(year);
    } catch (error: unknown) {
      if (error instanceof CommandCancellation || signal.aborted) throw error;
      const message = error instanceof Error ? error.message : String(error);
      failedYears.push({year, message});
      yearLogger.error(`Failed for ${year}: ${message}`);
    }

    // Be polite to the API.
    if (year < toYear) {
      // eslint-disable-next-line no-await-in-loop -- the delay must land between sequential requests.
      await clock.delay(REQUEST_DELAY_MS, signal);
    }
  }

  // Merge and write.
  const allRecords = [...existingRecords, ...newRecords];
  await writeCSV(files, csvPath, allRecords);

  logger.info(`Wrote ${allRecords.length} record(s) to ${csvPath}.`);

  return {years, updatedYears, failedYears};
}

/** The only edge from this entrypoint into the Node command host; core never names it. */
const loadProductionCommandHost = async (): Promise<CommandHost> =>
  import("./adapters/node/node-command-host.ts").then(({createNodeCommandHost}) => createNodeCommandHost("update-exchange-rates"));

/**
 * Creates the exchange-rate update command.
 *
 * @param options - Injected command host or literal loader; defaults to the Node adapter.
 * @returns The typed `update-exchange-rates` command object.
 */
export function createUpdateExchangeRatesCommand(
  options: Readonly<CommandConstructionOptions> = {loadHost: loadProductionCommandHost},
): LazyMonorepoCommand<ExchangeRateInput, ExchangeRateResult, never> {
  return defineCommand<ExchangeRateInput, ExchangeRateResult>(
    {
      name: "update-exchange-rates",
      description: "Fetches yearly exchange rate averages from the Frankfurter API and writes them to CSV.",
      examples: [
        "npm run update-exchange-rates",
        "npm run update-exchange-rates -- --year 2025",
        "npm run update-exchange-rates -- --from 2020 --to 2025",
      ],
      configure: (program) => {
        program
          .option("--year <year>", `Fetch a single year (${EARLIEST_SUPPORTED_YEAR}-current).`)
          .option("--from <year>", `Starting year (default: ${EARLIEST_SUPPORTED_YEAR}).`)
          .option("--to <year>", "Ending year (default: current year).");
      },
      decode: (program) => decodeExchangeRateInput(program.opts<{year?: string; from?: string; to?: string}>()),
      execute: updateExchangeRates,
      complete: (result) => {
        const exitCode = result.failedYears.length > 0 ? 1 : 0;
        return {
          exitCode,
          value: result,
          human: (logger) => {
            if (result.failedYears.length === 0) {
              logger.success(`Updated ${result.updatedYears.length} of ${result.years.length} year(s).`);
              return;
            }

            const failures = result.failedYears.map((failure) => `${failure.year} (${failure.message})`).join(", ");
            logger.warn(`Updated ${result.updatedYears.length} of ${result.years.length} year(s); failed: ${failures}.`);
          },
        };
      },
    },
    options,
  );
}

/** Production singleton used by the aggregate CLI and this module's direct entrypoint. */
export const updateExchangeRatesCommand: LazyMonorepoCommand<ExchangeRateInput, ExchangeRateResult, never> =
  createUpdateExchangeRatesCommand();

await updateExchangeRatesCommand.runIfMain(import.meta.url);
