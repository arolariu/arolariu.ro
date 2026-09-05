/**
 * @fileoverview Lazy `test:e2e` entrypoint: identity, input decoding, and the three literal loaders
 * that reach its workflow, its reporter, and the Node command host. It holds no business logic and
 * takes no eager workflow, reporter, presenter, or adapter edge, so a `--help` path loads only the
 * shared command core, `./metadata.ts`, `./input.ts`, and `./targets.ts`.
 * @module scripts/features/end-to-end/command */

import type {CommandConstructionOptions, CommandHost} from "../../core/command/command-specification.ts";
import {defineLazyCommand, type LazyMonorepoCommand} from "../../core/command/lazy-monorepo-command.ts";
import {decodeEndToEndInput, type EndToEndInput} from "./input.ts";
import {endToEndCommandMetadata} from "./metadata.ts";
import type {EndToEndFailure, EndToEndResult} from "./workflow.ts";

/** The only edge from this entrypoint into the Node command host; core never names it. */
const loadProductionCommandHost = async (): Promise<CommandHost> =>
  import("../../adapters/node/node-command-host.ts").then(({createNodeCommandHost}) => createNodeCommandHost("test:e2e"));

/** Creates the end-to-end command.
 * @param options - Injected command host or literal loader; defaults to the Node adapter.
 * @returns The typed `test:e2e` command object. */
export function createEndToEndCommand(
  options: Readonly<CommandConstructionOptions> = {loadHost: loadProductionCommandHost},
): LazyMonorepoCommand<EndToEndInput, EndToEndResult, EndToEndFailure> {
  return defineLazyCommand(
    {
      ...endToEndCommandMetadata,
      decode: decodeEndToEndInput,
      loadWorkflow: () => import("./workflow.ts").then((module) => module.endToEndWorkflowModule),
      loadPresentation: () => import("./reporter.ts").then((module) => module.endToEndPresenter),
    },
    options,
  );
}

/** Production singleton used by `npm run test:e2e` and this module's direct entrypoint. */
export const endToEndCommand: LazyMonorepoCommand<EndToEndInput, EndToEndResult, EndToEndFailure> = createEndToEndCommand();

await endToEndCommand.runIfMain(import.meta.url);
