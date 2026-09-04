/**
 * @fileoverview Lazy `update-exchange-rates` entrypoint: identity, input decoding, and the three
 * literal loaders that reach its workflow, its reporter, and the Node command host.
 * @module scripts/features/exchange-rates/command
 *
 * @remarks
 * Holds no business logic and takes no eager workflow, reporter, presenter, or adapter edge, so a
 * `--help` path loads only the shared command core, `./metadata.ts`, and `./input.ts`.
 */

import type {CommandConstructionOptions, CommandHost} from "../../core/command/command-specification.ts";
import {defineLazyCommand, type LazyMonorepoCommand} from "../../core/command/lazy-monorepo-command.ts";
import {decodeExchangeRateInput, type ExchangeRateInput} from "./input.ts";
import {exchangeRateCommandMetadata} from "./metadata.ts";
import type {ExchangeRateResult, ExchangeRateUpdateFailure} from "./workflow.ts";

/** The only edge from this entrypoint into the Node command host; core never names it. */
const loadProductionCommandHost = async (): Promise<CommandHost> =>
  import("../../adapters/node/node-command-host.ts").then(({createNodeCommandHost}) => createNodeCommandHost("update-exchange-rates"));

/**
 * Creates the exchange-rate update command.
 *
 * @param options - Injected command host or literal loader; defaults to the Node adapter.
 * @returns The typed `update-exchange-rates` command object.
 */
export function createExchangeRateUpdateCommand(
  options: Readonly<CommandConstructionOptions> = {loadHost: loadProductionCommandHost},
): LazyMonorepoCommand<ExchangeRateInput, ExchangeRateResult, ExchangeRateUpdateFailure> {
  return defineLazyCommand(
    {
      ...exchangeRateCommandMetadata,
      decode: decodeExchangeRateInput,
      loadWorkflow: () => import("./workflow.ts").then((module) => module.exchangeRateUpdateWorkflowModule),
      loadPresentation: () => import("./reporter.ts").then((module) => module.exchangeRateUpdatePresenter),
    },
    options,
  );
}

/** Production singleton used by this module's direct entrypoint; it owns no package script. */
export const exchangeRateUpdateCommand: LazyMonorepoCommand<ExchangeRateInput, ExchangeRateResult, ExchangeRateUpdateFailure> =
  createExchangeRateUpdateCommand();

await exchangeRateUpdateCommand.runIfMain(import.meta.url);
