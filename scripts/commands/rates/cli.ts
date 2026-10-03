/**
 * @fileoverview effect/cli `rates` command group routing `rates update` into the legacy exchange-rate updater.
 * @module scripts/commands/rates/cli
 *
 * @remarks
 * `rates` has no handler of its own, so running it alone prints help. `rates update` passes the
 * present `--year`, `--from`, and `--to` values to the legacy `decodeExchangeRateInput`, whose
 * `CommandInputError` becomes a usage failure (exit `2`) with the legacy message.
 */

import {Effect, Option} from "effect";
import {Command, Flag} from "effect/cli";

import type {CliSubcommand} from "../../cli.ts";
import type {CommandInvoker} from "../../common/commander.ts";
import {decodeExchangeRateInput, updateExchangeRatesCommand, type ExchangeRateInput} from "./update.ts";
import {withCommandOutput} from "../flags.ts";
import {decodeInput, runLegacy} from "../legacy.ts";

/**
 * Builds the `rates` command group.
 *
 * @param invoker - The legacy exchange-rate invoker; tests pass a recording invoker.
 * @returns The `rates` group with its `update` subcommand.
 */
export function makeRatesCommand(invoker: CommandInvoker<ExchangeRateInput, unknown> = updateExchangeRatesCommand): CliSubcommand {
  const update = Command.make(
    "update",
    {
      year: Flag.String("year").pipe(Flag.optional, Flag.withDescription("Fetch a single year (earliest supported year to current).")),
      from: Flag.String("from").pipe(Flag.optional, Flag.withDescription("Starting year (default: earliest supported year).")),
      to: Flag.String("to").pipe(Flag.optional, Flag.withDescription("Ending year (default: current year).")),
    },
    ({year, from, to}) =>
      Effect.gen(function* () {
        const input = yield* decodeInput(() =>
          decodeExchangeRateInput({
            ...Option.match(year, {onNone: () => ({}), onSome: (value) => ({year: value})}),
            ...Option.match(from, {onNone: () => ({}), onSome: (value) => ({from: value})}),
            ...Option.match(to, {onNone: () => ({}), onSome: (value) => ({to: value})}),
          }),
        );
        yield* runLegacy("rates update", invoker, input);
      }).pipe(withCommandOutput("rates")),
  ).pipe(Command.withDescription("Fetches yearly exchange rate averages from the Frankfurter API and writes them to CSV."));
  return Command.make("rates").pipe(Command.withDescription("Exchange-rate tooling."), Command.withSubcommands([update]));
}
