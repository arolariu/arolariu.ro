/**
 * @fileoverview Identity, help text, and parser configuration of the `update-exchange-rates`
 * command, kept beside the entrypoint and free of every business import so a `--help` invocation
 * resolves nothing heavier than this module and `scripts/features/exchange-rates/input.ts`.
 * @module scripts/features/exchange-rates/metadata
 */

import type {Command} from "commander";

import type {CommandIdentityDefinition} from "../../core/command/command-specification.ts";
import {EARLIEST_SUPPORTED_YEAR} from "./input.ts";

/** Identity and parser configuration the entrypoint spreads into its command specification. */
export const exchangeRateCommandMetadata = {
  name: "update-exchange-rates",
  description: "Fetches yearly exchange rate averages from the Frankfurter API and writes them to CSV.",
  examples: [
    "npm run update-exchange-rates",
    "npm run update-exchange-rates -- --year 2025",
    "npm run update-exchange-rates -- --from 2020 --to 2025",
  ],
  configure: (program: Command): void => {
    program
      .option("--year <year>", `Fetch a single year (${EARLIEST_SUPPORTED_YEAR}-current).`)
      .option("--from <year>", `Starting year (default: ${EARLIEST_SUPPORTED_YEAR}).`)
      .option("--to <year>", "Ending year (default: current year).");
  },
} as const satisfies CommandIdentityDefinition & {readonly configure: (program: Command) => void};
