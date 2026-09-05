// @vitest-environment node
/**
 * @fileoverview Year-range decoding and resolution evidence for `update-exchange-rates`.
 * @module scripts/features/exchange-rates/input.test
 *
 * @remarks
 * Argv cases parse a real Commander program configured by the feature's own metadata, so the three
 * published option declarations are exercised rather than restated, and every range resolves
 * against an explicit current year instead of ambient wall-clock state. Mapping a
 * {@link CommandInputError} onto exit code `2` is generic lifecycle behavior owned by
 * `scripts/testing/contracts/command-lifecycle.contract.ts`.
 */

import {Command} from "commander";
import {describe, expect, it} from "vitest";

import {CommandInputError} from "../../core/command/command-execution.ts";
import {decodeExchangeRateInput, resolveExchangeRateYearRange as resolve, type ExchangeRateInput} from "./input.ts";
import {exchangeRateCommandMetadata} from "./metadata.ts";

/** Parses argv through the feature's real parser configuration, then decodes the result. */
function decode(argv: readonly string[]): ExchangeRateInput {
  const program = new Command().exitOverride();
  exchangeRateCommandMetadata.configure(program);
  program.parse([...argv], {from: "user"});
  return decodeExchangeRateInput(program);
}

/** Asserts one rejected decode or resolution carries the exact usage failure it always has. */
function expectUsageFailure(act: () => unknown, message: string): void {
  let thrown: unknown;
  try {
    act();
  } catch (error: unknown) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(CommandInputError);
  expect(thrown).toMatchObject({message});
}

/** One argv invocation, the year it resolves against, and the range it must produce. */
type RangeCase = [label: string, argv: string[], currentYear: number, expected: Readonly<{fromYear: number; toYear: number}>];

/** One rejected argv invocation and the exact message decode or resolution must report. */
type ArgvFailureCase = [label: string, argv: string[], currentYear: number, message: string];

/** One rejected programmatic range supplied straight to `invoke()`, bypassing decode. */
type ProgrammaticFailureCase = [label: string, input: ExchangeRateInput, message: string];

const rangeCases: RangeCase[] = [
  ["no option to 2018 through the current year", [], 2020, {fromYear: 2018, toYear: 2020}],
  ["--year to both bounds", ["--year", "2020"], 2025, {fromYear: 2020, toYear: 2020}],
  ["--from and --to independently", ["--from", "2020", "--to", "2021"], 2025, {fromYear: 2020, toYear: 2021}],
  ["--from alone with a defaulted upper bound", ["--from", "2020"], 2020, {fromYear: 2020, toYear: 2020}],
  ["--to alone with the default lower bound", ["--to", "2018"], 2025, {fromYear: 2018, toYear: 2018}],
  ["equal explicit bounds", ["--from", "2022", "--to", "2022"], 2025, {fromYear: 2022, toYear: 2022}],
  ["the earliest supported year", ["--year", "2018"], 2025, {fromYear: 2018, toYear: 2018}],
  ["the current year", ["--year", "2025"], 2025, {fromYear: 2025, toYear: 2025}],
];

const argvFailureCases: ArgvFailureCase[] = [
  ["a fractional --year", ["--year", "2023.5"], 2025, '--year must be an integer, got: "2023.5"'],
  ["a non-numeric --year", ["--year", "abc"], 2025, '--year must be an integer, got: "abc"'],
  ["a non-numeric --from", ["--from", "abc"], 2025, '--from must be an integer, got: "abc"'],
  ["a non-numeric --to", ["--to", "abc"], 2025, '--to must be an integer, got: "abc"'],
  ["a blank --year", ["--year", " "], 2025, '--year must be an integer, got: " "'],
  ["a --year below the earliest supported year", ["--year", "2015"], 2025, "--year must be >= 2018 (earliest supported), got: 2015"],
  ["a --from below the earliest supported year", ["--from", "2015"], 2025, "--from must be >= 2018 (earliest supported), got: 2015"],
  ["an inverted explicit range", ["--from", "2025", "--to", "2020"], 2025, "--from (2025) must be <= --to (2020)"],
  ["a --to above the current year", ["--to", "2026"], 2025, "--to must be <= 2025 (current year), got: 2026"],
  ["a --year above the current year", ["--year", "2026"], 2025, "--to must be <= 2025 (current year), got: 2026"],
];

const programmaticFailureCases: ProgrammaticFailureCase[] = [
  ["an inverted range", {fromYear: 2025, toYear: 2020}, "--from (2025) must be <= --to (2020)"],
  ["a non-finite toYear", {fromYear: 2024, toYear: Number.POSITIVE_INFINITY}, "toYear must be a finite integer year, got: Infinity"],
  ["a NaN fromYear", {fromYear: Number.NaN, toYear: 2024}, "fromYear must be a finite integer year, got: NaN"],
  ["a NaN toYear", {fromYear: 2024, toYear: Number.NaN}, "toYear must be a finite integer year, got: NaN"],
  ["an infinite fromYear", {fromYear: Number.NEGATIVE_INFINITY, toYear: 2024}, "fromYear must be a finite integer year, got: -Infinity"],
  ["a fractional fromYear", {fromYear: 2024.5, toYear: 2024}, "fromYear must be a finite integer year, got: 2024.5"],
  ["a fractional toYear", {fromYear: 2020, toYear: 2024.5}, "toYear must be a finite integer year, got: 2024.5"],
  ["a fromYear below 2018", {fromYear: 2017, toYear: 2020}, "fromYear must be >= 2018 (earliest supported), got: 2017"],
  ["a toYear below 2018", {fromYear: 2018, toYear: 2017}, "toYear must be >= 2018 (earliest supported), got: 2017"],
  ["a toYear above the current year", {fromYear: 2020, toYear: 2030}, "--to must be <= 2025 (current year), got: 2030"],
];

describe("exchange rate input", () => {
  it.each(rangeCases)("resolves %s", (_label, argv, currentYear, expected) => {
    expect(resolve(decode(argv), currentYear)).toEqual(expected);
  });

  it.each(argvFailureCases)("rejects %s", (_label, argv, currentYear, message) => {
    expectUsageFailure(() => resolve(decode(argv), currentYear), message);
  });

  it.each(programmaticFailureCases)("rejects %s supplied through invoke()", (_label, input, message) => {
    expectUsageFailure(() => resolve(input, 2025), message);
  });

  it("rejects an inverted range during decode, before any clock is consulted", () => {
    expectUsageFailure(() => decode(["--from", "2025", "--to", "2020"]), "--from (2025) must be <= --to (2020)");
  });
});
