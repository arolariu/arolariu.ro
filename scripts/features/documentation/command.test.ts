// @vitest-environment node
/**
 * @fileoverview Lifecycle and lazy command-structure contracts of the `docs-assemble` entrypoint.
 * @module scripts/features/documentation/command.test
 *
 * @remarks
 * Generic lifecycle behavior is owned by {@link runCommandLifecycleContract}, the entrypoint's two
 * structural guarantees by {@link runLazyCommandStructureContract}, the repository-wide reporter
 * ownership rule by `scripts/testing/architecture/ownership-boundaries.test.ts`, and both public
 * transcripts by `scripts/testing/compatibility/public-command-contracts.test.ts`. This file only
 * binds the real `docs-assemble` command to documentation fixtures for those contracts.
 */

import {join} from "node:path";

import type {CommandHost} from "../../core/command/command-specification.ts";
import type {LazyMonorepoCommand} from "../../core/command/lazy-monorepo-command.ts";
import type {FileSystem} from "../../core/runtime/runtime-capability.ts";
import {buildCommandHost} from "../../testing/builders/command-host.builder.ts";
import {buildProgrammableProcessRunner, buildSucceededProcessExecutionResult} from "../../testing/builders/process-result.builder.ts";
import {runCommandLifecycleContract} from "../../testing/contracts/command-lifecycle.contract.ts";
import {runLazyCommandStructureContract} from "../../testing/contracts/lazy-command-structure.contract.ts";
import {createMemoryFileSystem} from "../../testing/fixtures/memory-filesystem.fixture.ts";
import {repositoryFixtureRoot} from "../../testing/fixtures/repository.fixture.ts";
import {createDocumentationCommand} from "./command.ts";
import {decodeDocumentationAssemblyInput, type DocumentationAssemblyInput} from "./input.ts";
import {documentationCommandMetadata} from "./metadata.ts";
import type {DocumentationAssemblyFailure, DocumentationAssemblyResult} from "./workflow.ts";

const generatedRoot = join(repositoryFixtureRoot, "sites", "docs.arolariu.ro", "_generated");

/**
 * Builds the command the shared lifecycle contract exercises: the real `docs-assemble` definition
 * with only the contract host's runtime factory replaced by documentation fixtures, so one
 * invocation can complete without spawning an extractor. The host's argv, direct-entry flag,
 * exit-code recorder, and parse presenter are all preserved.
 *
 * @param host - The host the contract supplies.
 * @returns The real command, bound to fixture capabilities.
 */
function createContractCommand(
  host: CommandHost,
): LazyMonorepoCommand<DocumentationAssemblyInput, DocumentationAssemblyResult, DocumentationAssemblyFailure> {
  const files: FileSystem = createMemoryFileSystem({
    [join(repositoryFixtureRoot, "package.json")]: JSON.stringify({name: "@arolariu/monorepo"}),
    [join(repositoryFixtureRoot, "sites", "api.arolariu.ro", "src", "Common", "arolariu.Backend.Common.csproj")]: "<Project/>",
    [join(repositoryFixtureRoot, "docs", "README.md")]: "# Docs\n",
  });
  const runner = buildProgrammableProcessRunner(async () => {
    for (const tier of ["ts-reference/components", "ts-reference/website", "experimental", "dotnet-internals/arolariu.Backend.Common"]) {
      await files.writeTextAtomic(join(generatedRoot, tier, "Generated.md"), "# Generated\n");
    }
    return buildSucceededProcessExecutionResult();
  });

  return createDocumentationCommand({host: {...host, loadRuntimeFactory: buildCommandHost({runtime: {files, runner}}).loadRuntimeFactory}});
}

runCommandLifecycleContract({label: "docs-assemble", createCommand: createContractCommand, createInput: () => ({})});

runLazyCommandStructureContract({
  label: "docs-assemble",
  commandSourcePath: "scripts/features/documentation/command.ts",
  workflowTypeNames: ["DocumentationAssemblyFailure", "DocumentationAssemblyResult"],
  metadata: documentationCommandMetadata,
  decode: decodeDocumentationAssemblyInput,
});
