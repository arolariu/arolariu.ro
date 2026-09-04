/**
 * @fileoverview Exchange-rate CSV persistence: the record shape, the preservation read, the ordered
 * merge write, and the typed write fault the workflow classifies.
 * @module scripts/features/exchange-rates/rate-csv
 *
 * @remarks
 * Every write goes through {@link FileSystem.writeTextAtomic}, so a reader never observes a
 * partially written rate file, and the merged document is always sorted by year then currency.
 */

import type {FileSystem} from "../../core/runtime/runtime-capability.ts";

/** One persisted yearly average rate for a single currency. */
export interface RateRecord {
  /** Year the average covers. */
  readonly year: number;
  /** ISO 4217 currency code. */
  readonly currency: string;
  /** Yearly average value of one unit of `currency`, expressed in RON. */
  readonly rateToRon: number;
}

/** Wraps whatever the atomic CSV write rejected with, so the merge stays attributable. */
export class RateCsvWriteError extends Error {
  /** Absolute path of the CSV file the merge could not replace. */
  public readonly csvPath: string;

  /**
   * @param csvPath - Absolute path of the CSV file the merge targeted.
   * @param cause - The original filesystem failure, preserved for evidence.
   */
  public constructor(csvPath: string, cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause), {cause});
    this.name = "RateCsvWriteError";
    this.csvPath = csvPath;
  }
}

/**
 * Reads the existing CSV records that must survive this invocation untouched.
 *
 * @param files - Filesystem capability used to read the CSV file.
 * @param csvPath - Absolute path to the exchange-rate CSV file.
 * @param fromYear - Inclusive lower bound of the years being updated.
 * @param toYear - Inclusive upper bound of the years being updated.
 * @returns Records for every year outside `[fromYear, toYear]`, or an empty list when the CSV file
 * does not yet exist. A row without a year, currency, and rate is skipped.
 */
export async function readPreservedRateRecords(
  files: FileSystem,
  csvPath: string,
  fromYear: number,
  toYear: number,
): Promise<readonly RateRecord[]> {
  if (!(await files.exists(csvPath))) return [];

  const records: RateRecord[] = [];
  for (const line of (await files.readText(csvPath)).split("\n").slice(1)) {
    const [yearText, currency, rateText] = line.trim().split(",");
    if (!yearText || !currency || !rateText) continue;

    const year = Number(yearText);
    if (year < fromYear || year > toYear) {
      records.push({year, currency, rateToRon: Number(rateText)});
    }
  }

  return records;
}

/**
 * Writes every merged record atomically, sorted by year then currency.
 *
 * @param files - Filesystem capability used to write the CSV file.
 * @param csvPath - Absolute path to the exchange-rate CSV file.
 * @param records - Every record to persist, merged across preserved and updated years.
 * @throws {RateCsvWriteError} When the atomic write fails, preserving its message and cause.
 */
export async function writeMergedRateCsv(files: FileSystem, csvPath: string, records: readonly RateRecord[]): Promise<void> {
  const sorted = records.toSorted((left, right) => left.year - right.year || left.currency.localeCompare(right.currency));
  const lines = ["year,currency,rate_to_ron", ...sorted.map((record) => `${record.year},${record.currency},${record.rateToRon}`)];

  try {
    await files.writeTextAtomic(csvPath, `${lines.join("\n")}\n`);
  } catch (error: unknown) {
    throw new RateCsvWriteError(csvPath, error);
  }
}
