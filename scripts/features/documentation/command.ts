/**
 * @fileoverview Lazy `docs-assemble` entrypoint: identity, input decoding, and the three literal
 * loaders that reach its workflow, its reporter, and the Node command host.
 * @module scripts/features/documentation/command
 *
 * @remarks
 * Holds no business logic and takes no eager workflow, reporter, presenter, or adapter edge, so a
 * `--help` path loads only the shared command core, `./metadata.ts`, and `./input.ts`.
 */

import type {CommandConstructionOptions, CommandHost} from "../../core/command/command-specification.ts";
import {defineLazyCommand, type LazyMonorepoCommand} from "../../core/command/lazy-monorepo-command.ts";
import {decodeDocumentationAssemblyInput, type DocumentationAssemblyInput} from "./input.ts";
import {documentationCommandMetadata} from "./metadata.ts";
import type {DocumentationAssemblyFailure, DocumentationAssemblyResult} from "./workflow.ts";

/** The only edge from this entrypoint into the Node command host; core never names it. */
const loadProductionCommandHost = async (): Promise<CommandHost> =>
  import("../../adapters/node/node-command-host.ts").then(({createNodeCommandHost}) => createNodeCommandHost("docs-assemble"));

/**
 * Creates the documentation assembly command.
 *
 * @param options - Injected command host or literal loader; defaults to the Node adapter.
 * @returns The typed `docs-assemble` command object.
 */
export function createDocumentationCommand(
  options: Readonly<CommandConstructionOptions> = {loadHost: loadProductionCommandHost},
): LazyMonorepoCommand<DocumentationAssemblyInput, DocumentationAssemblyResult, DocumentationAssemblyFailure> {
  return defineLazyCommand(
    {
      ...documentationCommandMetadata,
      decode: decodeDocumentationAssemblyInput,
      loadWorkflow: () => import("./workflow.ts").then((module) => module.documentationAssemblyWorkflowModule),
      loadPresentation: () => import("./reporter.ts").then((module) => module.documentationAssemblyPresenter),
    },
    options,
  );
}

/** Production singleton used by `npm run docs:assemble` and this module's direct entrypoint. */
export const documentationCommand: LazyMonorepoCommand<
  DocumentationAssemblyInput,
  DocumentationAssemblyResult,
  DocumentationAssemblyFailure
> = createDocumentationCommand();

await documentationCommand.runIfMain(import.meta.url);
