// @vitest-environment node
/**
 * @fileoverview Lifecycle contract and lazy-loading structure of the `docs-assemble` entrypoint.
 * @module scripts/features/documentation/command.test
 *
 * @remarks
 * Generic lifecycle behavior is owned by {@link runCommandLifecycleContract} and both public
 * transcripts by `scripts/testing/compatibility/public-command-contracts.test.ts`. This file adds
 * only the structural guarantees the feature owns: the reporter is reachable through
 * `loadPresentation()` and nothing else, and `--help` loads neither the workflow nor the reporter.
 */

import {readFileSync} from "node:fs";
import {join} from "node:path";
import {describe, expect, it} from "vitest";

import type {CommandHost} from "../../core/command/command-specification.ts";
import {defineLazyCommand, type LazyMonorepoCommand} from "../../core/command/lazy-monorepo-command.ts";
import type {FileSystem} from "../../core/runtime/runtime-capability.ts";
import {readProductionScriptSourceFiles} from "../../testing/architecture/script-source-files.ts";
import {collectTypeScriptModuleReferences} from "../../testing/architecture/typescript-module-analysis.ts";
import {buildCommandHost} from "../../testing/builders/command-host.builder.ts";
import {buildProgrammableProcessRunner, buildSucceededProcessExecutionResult} from "../../testing/builders/process-result.builder.ts";
import {runCommandLifecycleContract} from "../../testing/contracts/command-lifecycle.contract.ts";
import {createMemoryFileSystem} from "../../testing/fixtures/memory-filesystem.fixture.ts";
import {repositoryFixtureRoot} from "../../testing/fixtures/repository.fixture.ts";
import {createDocumentationCommand} from "./command.ts";
import {decodeDocumentationAssemblyInput, type DocumentationAssemblyInput} from "./input.ts";
import {documentationCommandMetadata} from "./metadata.ts";
import type {DocumentationAssemblyFailure, DocumentationAssemblyResult} from "./workflow.ts";

const commandSourcePath = "scripts/features/documentation/command.ts";
const workflowSourcePath = "scripts/features/documentation/workflow.ts";
const reporterSourcePath = "scripts/features/documentation/reporter.ts";
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

describe("docs-assemble lazy loading structure", () => {
  it("reaches the reporter only through loadPresentation and the workflow only through loadWorkflow", () => {
    const source = readFileSync(commandSourcePath, "utf8");
    const {references} = collectTypeScriptModuleReferences(source, commandSourcePath);
    const lines = source.split("\n");

    expect(references.filter(({specifier}) => specifier === "./reporter.ts")).toEqual([
      {specifier: "./reporter.ts", importedNames: ["*"], referenceKind: "dynamic-import", typeOnly: false},
    ]);
    expect(references.filter(({specifier}) => specifier === "./workflow.ts")).toEqual([
      {
        specifier: "./workflow.ts",
        importedNames: ["DocumentationAssemblyFailure", "DocumentationAssemblyResult"],
        referenceKind: "import",
        typeOnly: true,
      },
      {specifier: "./workflow.ts", importedNames: ["*"], referenceKind: "dynamic-import", typeOnly: false},
    ]);
    expect(lines.filter((line) => line.includes('import("./reporter.ts")'))).toEqual([expect.stringContaining("loadPresentation")]);
    expect(lines.filter((line) => line.includes('import("./workflow.ts")'))).toEqual([expect.stringContaining("loadWorkflow")]);
  });

  it("keeps the feature reporter out of every other production module", () => {
    const sourceFiles = readProductionScriptSourceFiles();
    const importers = [...sourceFiles]
      .filter(([sourcePath]) => sourcePath !== commandSourcePath)
      .filter(([path, text]) => collectTypeScriptModuleReferences(text, path).references.some((r) => r.specifier.endsWith("/reporter.ts")))
      .map(([sourcePath]) => sourcePath);

    expect(importers).toEqual([]);
    expect([...sourceFiles.keys()]).toEqual(expect.arrayContaining([reporterSourcePath, workflowSourcePath]));
  });

  it("loads neither the workflow nor the reporter on the help path", async () => {
    const loaded: string[] = [];
    const fail = (module: string) => (): never => {
      loaded.push(module);
      throw new Error(`The ${module} must never load on the help path.`);
    };
    const command = defineLazyCommand(
      {
        ...documentationCommandMetadata,
        decode: decodeDocumentationAssemblyInput,
        loadWorkflow: fail("workflow"),
        loadPresentation: fail("reporter"),
      },
      {host: buildCommandHost()},
    );

    await expect(command.run(["--help"])).resolves.toEqual({status: "help", exitCode: 0});
    expect(loaded).toEqual([]);
  });
});
