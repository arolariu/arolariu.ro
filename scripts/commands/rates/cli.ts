/**
 * @fileoverview effect/cli `rates` command group running the Effect exchange-rate updater.
 * @module scripts/commands/rates/cli
 *
 * @remarks
 * `rates` has no handler of its own, so running it alone prints help. `rates update` passes the
 * present `--year`, `--from`, and `--to` values to the pure `decodeExchangeRateInput`, whose
 * `ExchangeRateInputInvalid` becomes a usage failure (exit `2`) with the legacy message, runs
 * {@link updateExchangeRates}, and renders the legacy completion. In `--json` mode the
 * {@link ExchangeRateResult} is the single JSON document.
 */

import {Effect, Option} from "effect";
import {Command, Flag} from "effect/cli";

import type {CliSubcommand} from "../../cli.ts";
import {ReportedFailure} from "../../platform/exit.ts";
import {Presenter, toJsonValue} from "../../platform/Output.ts";
import {withCommandOutput} from "../flags.ts";
import {decodeExchangeRateInput, exchangeRateUsage, RATES_LOG_CONTEXT, updateExchangeRates, type ExchangeRateResult} from "./update.ts";

/**
 * Renders the completion of one exchange-rate update.
 *
 * @remarks
 * Writes the result as the JSON document (JSON mode only). Without failed years it prints
 * `Updated <n> of <m> year(s).`; otherwise it warns with every failed year and its message and
 * fails with `ReportedFailure{exitCode: 1}`.
 *
 * @param result - The updater result.
 * @returns An effect rendering the completion.
 */
export function renderExchangeRateCompletion(result: Readonly<ExchangeRateResult>): Effect.Effect<void, ReportedFailure, Presenter> {
  return Effect.gen(function* () {
    const presenter = yield* Presenter;
    yield* Effect.orDie(presenter.json(toJsonValue(result)));

    if (result.failedYears.length === 0) {
      yield* presenter.success(`Updated ${result.updatedYears.length} of ${result.years.length} year(s).`);
      return;
    }

    const failures = result.failedYears.map((failure) => `${failure.year} (${failure.message})`).join(", ");
    const message = `Updated ${result.updatedYears.length} of ${result.years.length} year(s); failed: ${failures}.`;
    yield* Effect.logWarning(message);
    return yield* new ReportedFailure({exitCode: 1, message});
  });
}

/**
 * Builds the `rates` command group.
 *
 * @returns The `rates` group with its `update` subcommand.
 */
export function makeRatesCommand(): CliSubcommand {
  const update = Command.make(
    "update",
    {
      year: Flag.String("year").pipe(Flag.optional, Flag.withDescription("Fetch a single year (earliest supported year to current).")),
      from: Flag.String("from").pipe(Flag.optional, Flag.withDescription("Starting year (default: earliest supported year).")),
      to: Flag.String("to").pipe(Flag.optional, Flag.withDescription("Ending year (default: current year).")),
    },
    ({year, from, to}) =>
      Effect.gen(function* () {
        const input = yield* exchangeRateUsage(() =>
          decodeExchangeRateInput({
            ...Option.match(year, {onNone: () => ({}), onSome: (value) => ({year: value})}),
            ...Option.match(from, {onNone: () => ({}), onSome: (value) => ({from: value})}),
            ...Option.match(to, {onNone: () => ({}), onSome: (value) => ({to: value})}),
          }),
        );
        yield* renderExchangeRateCompletion(yield* updateExchangeRates(input));
      }).pipe(withCommandOutput(RATES_LOG_CONTEXT)),
  ).pipe(Command.withDescription("Fetches yearly exchange rate averages from the Frankfurter API and writes them to CSV."));
  return Command.make("rates").pipe(Command.withDescription("Exchange-rate tooling."), Command.withSubcommands([update]));
}
