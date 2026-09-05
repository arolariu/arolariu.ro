/**
 * @fileoverview Typed year range of the `update-exchange-rates` command, its Commander decoder, and
 * the clock-aware resolution every invocation path — argv or programmatic — passes through.
 * @module scripts/features/exchange-rates/input
 *
 * @remarks
 * `decode()` runs before any runtime scope exists, so it validates every invariant knowable without
 * a clock and defers only the current-year upper bound. {@link resolveExchangeRateYearRange} is the
 * single validation point for `invoke()`, which never runs `decode()`.
 */

import type {Command} from "commander";

import {CommandInputError} from "../../core/command/command-execution.ts";

/** Earliest year for which Frankfurter data is reliably available. */
export const EARLIEST_SUPPORTED_YEAR = 2018;

/** Validated year range for the exchange-rate update operation. */
export interface ExchangeRateInput {
  readonly fromYear: number;
  readonly toYear: number;
}

/**
 * Placeholder upper bound carried by parser-produced input that must default to the current year.
 * It is deliberately not a valid year: the identity registry below decides, and this value fails
 * upper-bound validation loudly if it ever escapes.
 */
const CURRENT_YEAR_PLACEHOLDER = Number.POSITIVE_INFINITY;

/**
 * Identity registry of the exact input objects {@link decodeExchangeRateInput} produced with an
 * unset upper bound. Membership — not the numeric value of `toYear` — authorizes the "default to
 * the current year" resolution, so a programmatic `invoke()` caller cannot forge the CLI-only
 * default by passing any non-finite value, and the published input contract stays exactly
 * `{fromYear, toYear}`.
 */
const parserDefaultedUpperBound = new WeakSet<ExchangeRateInput>();

/**
 * Validates one already-numeric year bound.
 *
 * @param label - Bound name used in thrown diagnostics.
 * @param value - Candidate year.
 * @returns The validated year.
 * @throws {CommandInputError} When `value` is not a finite integer or is below {@link EARLIEST_SUPPORTED_YEAR}.
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
 * Converts one parsed invocation into the feature's typed year range, rejecting a non-integer year,
 * a year below {@link EARLIEST_SUPPORTED_YEAR}, and an inverted range whenever both bounds are
 * already known without a clock.
 *
 * @param program - The parsed Commander program for this invocation.
 * @returns A year range; when neither `--year` nor `--to` was supplied, the returned object is
 * registered as carrying a defaulted upper bound.
 * @throws {CommandInputError} When a year value fails validation or both explicit bounds are inverted.
 */
export function decodeExchangeRateInput(program: Command): ExchangeRateInput {
  const options = program.opts<Readonly<{year?: string; from?: string; to?: string}>>();
  if (options.year !== undefined) {
    const year = parseYearOption("--year", options.year);
    return {fromYear: year, toYear: year};
  }

  const fromYear = options.from === undefined ? EARLIEST_SUPPORTED_YEAR : parseYearOption("--from", options.from);
  if (options.to === undefined) {
    const defaulted: ExchangeRateInput = {fromYear, toYear: CURRENT_YEAR_PLACEHOLDER};
    parserDefaultedUpperBound.add(defaulted);
    return defaulted;
  }

  const toYear = parseYearOption("--to", options.to);
  requireOrderedRange(fromYear, toYear);
  return {fromYear, toYear};
}

/**
 * Resolves a decoded or programmatic year range against the current year and validates every
 * remaining invariant. `invoke()` bypasses `decode()`, so both bounds are re-checked here and the
 * current-year default applies exclusively to a parser-produced range.
 *
 * @param input - Decoded or programmatic year range.
 * @param currentYear - Current year observed from the injected clock.
 * @returns The fully resolved, validated year range.
 * @throws {CommandInputError} When either bound is not a supported year, the resolved `toYear`
 * exceeds `currentYear`, or `fromYear` exceeds the resolved `toYear`.
 */
export function resolveExchangeRateYearRange(
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
