/**
 * @fileoverview CLI script to update exchange rates from Frankfurter API.
 * @module scripts/update-exchange-rates
 *
 * @remarks
 * Fetches daily exchange rates from the Frankfurter API for each year,
 * computes yearly averages, and writes the result to the static CSV file.
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

import {existsSync, readFileSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {styleText} from "node:util";
import {Command, CommanderError} from "commander";
import {commanderExitCode, createToolProgram} from "./common/cli.ts";
import {MonorepositoryConsoleLogger, type MonorepositoryLogger} from "./common/logger.ts";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const FRANKFURTER_API = "https://api.frankfurter.dev";
const CSV_PATH = join(import.meta.dirname, "..", "sites", "arolariu.ro", "public", "data", "exchange-rates.csv");

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

/**
 * Validated year range for the exchange-rate update operation.
 */
export interface ExchangeRateOptions {
  readonly fromYear: number;
  readonly toYear: number;
}

/** Earliest year for which Frankfurter data is reliably available. */
const EARLIEST_SUPPORTED_YEAR = 2018;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parses and validates exchange-rate CLI arguments, returning a typed options object.
 *
 * @remarks
 * Uses Commander to parse the raw argument tokens. Rejects unknown options,
 * non-integer year values, years outside the supported range (2018 → current year),
 * and ranges where `--from` exceeds `--to`.
 *
 * @param argv - Raw argument tokens (not including the node binary or script name).
 * @returns Validated year range options.
 * @throws {CommanderError} When unknown options are encountered.
 * @throws {Error} When year values fail integer or range validation.
 */
export function parseExchangeRateOptions(argv: readonly string[]): ExchangeRateOptions {
  const currentYear = new Date().getFullYear();

  const program = new Command().exitOverride().configureOutput({writeOut: () => {}, writeErr: () => {}});

  program
    .option("--year <year>", `Fetch a single year (${EARLIEST_SUPPORTED_YEAR}–current).`)
    .option("--from <year>", `Starting year (default: ${EARLIEST_SUPPORTED_YEAR}).`)
    .option("--to <year>", "Ending year (default: current year).");

  program.parse([...argv], {from: "user"});

  const opts = program.opts<{year?: string; from?: string; to?: string}>();

  if (opts.year !== undefined) {
    const raw = opts.year.trim();
    const year = Number(raw);
    if (!Number.isInteger(year) || raw === "") {
      throw new Error(`--year must be an integer, got: "${opts.year}"`);
    }
    if (year < EARLIEST_SUPPORTED_YEAR) {
      throw new Error(`--year must be >= ${EARLIEST_SUPPORTED_YEAR} (earliest supported), got: ${year}`);
    }
    if (year > currentYear) {
      throw new Error(`--year must be <= ${currentYear} (current year), got: ${year}`);
    }
    return {fromYear: year, toYear: year};
  }

  const fromRaw = opts.from?.trim();
  const toRaw = opts.to?.trim();
  const fromYear = fromRaw !== undefined ? Number(fromRaw) : EARLIEST_SUPPORTED_YEAR;
  const toYear = toRaw !== undefined ? Number(toRaw) : currentYear;

  if (fromRaw !== undefined && (!Number.isInteger(fromYear) || fromRaw === "")) {
    throw new Error(`--from must be an integer, got: "${opts.from}"`);
  }
  if (toRaw !== undefined && (!Number.isInteger(toYear) || toRaw === "")) {
    throw new Error(`--to must be an integer, got: "${opts.to}"`);
  }
  if (fromYear < EARLIEST_SUPPORTED_YEAR) {
    throw new Error(`--from must be >= ${EARLIEST_SUPPORTED_YEAR} (earliest supported), got: ${fromYear}`);
  }
  if (toYear > currentYear) {
    throw new Error(`--to must be <= ${currentYear} (current year), got: ${toYear}`);
  }
  if (fromYear > toYear) {
    throw new Error(`--from (${fromYear}) must be <= --to (${toYear})`);
  }

  return {fromYear, toYear};
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
async function fetchYearlyRates(year: number, logger: MonorepositoryLogger): Promise<RateRecord[]> {
  const startDate = `${year}-01-01`;
  const endDate = year === new Date().getFullYear() ? new Date().toISOString().split("T")[0] : `${year}-12-31`;

  logger.line(styleText("cyan", `  Fetching ${startDate} → ${endDate}...`));

  // Fetch EUR-based rates (includes RON and all target currencies)
  const currenciesParam = ["RON", ...TARGET_CURRENCIES].join(",");
  const url = `${FRANKFURTER_API}/v1/${startDate}..${endDate}?base=EUR&symbols=${currenciesParam}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Frankfurter API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as FrankfurterResponse;
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

  logger.line(styleText("green", `  ✓ Got ${records.length} currency averages from ${Object.keys(dailyRates).length} trading days`));

  return records;
}

/**
 * Reads existing CSV records, preserving data for years not being updated.
 */
function readExistingRecords(fromYear: number, toYear: number): RateRecord[] {
  if (!existsSync(CSV_PATH)) return [];

  const content = readFileSync(CSV_PATH, "utf-8");
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
 * Writes all records to the CSV file.
 */
function writeCSV(records: RateRecord[]): void {
  // Sort by year then currency
  records.sort((a, b) => a.year - b.year || a.currency.localeCompare(b.currency));

  const lines = ["year,currency,rate_to_ron"];
  for (const record of records) {
    lines.push(`${record.year},${record.currency},${record.rateToRon}`);
  }

  writeFileSync(CSV_PATH, lines.join("\n") + "\n", "utf-8");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Updates the configured exchange-rate CSV for the selected year range.
 *
 * @param options - Validated year range to fetch and update.
 * @param logger - Optional logger used for update lifecycle output.
 */
export async function main(options: Readonly<ExchangeRateOptions>, logger?: MonorepositoryLogger): Promise<void> {
  const output = logger ?? new MonorepositoryConsoleLogger("update::exchange-rates");
  const {fromYear, toYear} = options;

  output.line(styleText("bold", "\n📊 Exchange Rate Updater"));
  output.line(styleText("dim", `Fetching yearly averages from Frankfurter API\n`));
  output.line(`  Years: ${fromYear} → ${toYear}`);
  output.line(`  Currencies: ${TARGET_CURRENCIES.length} currencies`);
  output.line(`  Output: ${CSV_PATH}\n`);

  // Read existing records (preserve years outside update range)
  const existingRecords = readExistingRecords(fromYear, toYear);
  const newRecords: RateRecord[] = [];

  for (let year = fromYear; year <= toYear; year++) {
    const yearOutput = output.child(String(year));
    yearOutput.line(styleText("bold", `\n📅 Year ${year}`));
    try {
      const yearRecords = await fetchYearlyRates(year, yearOutput);
      newRecords.push(...yearRecords);
    } catch (error) {
      yearOutput.line(styleText("red", `  ✗ Failed for ${year}: ${error instanceof Error ? error.message : String(error)}`), "stderr");
    }

    // Be polite to the API
    if (year < toYear) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  // Merge and write
  const allRecords = [...existingRecords, ...newRecords];
  writeCSV(allRecords);

  output.line(styleText("bold", `\n✅ Done! Wrote ${allRecords.length} records to CSV`));
  output.line(styleText("dim", `   File: ${CSV_PATH}\n`));
}

if (import.meta.main) {
  const output = new MonorepositoryConsoleLogger("update::exchange-rates");

  const program = createToolProgram({
    name: "update-exchange-rates",
    description: "Fetches yearly exchange rate averages from the Frankfurter API and writes them to CSV.",
    examples: [
      "npm run update-exchange-rates",
      "npm run update-exchange-rates -- --year 2025",
      "npm run update-exchange-rates -- --from 2020 --to 2025",
    ],
    logger: output,
  });
  program
    .option("--year <year>", `Fetch a single year (${EARLIEST_SUPPORTED_YEAR}–current).`)
    .option("--from <year>", `Starting year (default: ${EARLIEST_SUPPORTED_YEAR}).`)
    .option("--to <year>", "Ending year (default: current year).");

  try {
    program.parse();
  } catch (error: unknown) {
    const code = commanderExitCode(error);
    process.exit(code ?? 1);
  }

  const rawOpts = program.opts<{year?: string; from?: string; to?: string}>();
  const reconstitutedArgv = [
    ...(rawOpts.year !== undefined ? ["--year", rawOpts.year] : []),
    ...(rawOpts.from !== undefined ? ["--from", rawOpts.from] : []),
    ...(rawOpts.to !== undefined ? ["--to", rawOpts.to] : []),
  ];

  let exchangeOptions: ExchangeRateOptions;
  try {
    exchangeOptions = parseExchangeRateOptions(reconstitutedArgv);
  } catch (error: unknown) {
    output.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  main(exchangeOptions, output).catch((error) => {
    output.line(styleText("red", `\n❌ Fatal error: ${error instanceof Error ? error.message : String(error)}`), "stderr");
    process.exit(1);
  });
}
