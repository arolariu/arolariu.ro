/**
 * @fileoverview Shared lazy command-structure contract: the two structural guarantees every
 * composed `command.ts` entrypoint must exhibit regardless of its business shape. Extracted so a
 * third composed pilot never restates the same evidence: the entrypoint reaches its reporter only
 * through `loadPresentation()` and its workflow only through `loadWorkflow()` plus a type-only
 * import, and a `--help` invocation loads neither module. The repository-wide rule that only a
 * feature's own sibling `command.ts` may name its `./reporter.ts` is owned once by
 * `scripts/testing/architecture/ownership-boundaries.test.ts` instead of by each feature.
 * @module scripts/testing/contracts/lazy-command-structure.contract */

import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

import type {CommandIdentityDefinition, CommandInputDefinition} from "../../core/command/command-specification.ts";
import {defineLazyCommand} from "../../core/command/lazy-monorepo-command.ts";
import {collectTypeScriptModuleReferences} from "../architecture/typescript-module-analysis.ts";
import {buildCommandHost} from "../builders/command-host.builder.ts";

/** Runs the shared lazy command-structure contract against one composed entrypoint.
 * @param definition - The entrypoint's source path, the workflow type names it may name type-only,
 * and the identity plus decoder a help-path invocation parses with. */
export function runLazyCommandStructureContract<TInput>(
  definition: Readonly<{
    readonly label: string;
    readonly commandSourcePath: string;
    readonly workflowTypeNames: readonly string[];
    readonly metadata: Readonly<CommandIdentityDefinition & Pick<CommandInputDefinition<TInput>, "configure">>;
    readonly decode: CommandInputDefinition<TInput>["decode"];
  }>,
): void {
  const {label, commandSourcePath, workflowTypeNames, metadata, decode} = definition;

  describe(`lazy command structure contract: ${label}`, () => {
    it("reaches the reporter only through loadPresentation and the workflow only through loadWorkflow", () => {
      const source = readFileSync(commandSourcePath, "utf8");
      const {references} = collectTypeScriptModuleReferences(source, commandSourcePath);
      const lines = source.split("\n");

      expect(references.filter(({specifier}) => specifier === "./reporter.ts")).toEqual([
        {specifier: "./reporter.ts", importedNames: ["*"], referenceKind: "dynamic-import", typeOnly: false},
      ]);
      expect(references.filter(({specifier}) => specifier === "./workflow.ts")).toEqual([
        {specifier: "./workflow.ts", importedNames: [...workflowTypeNames], referenceKind: "import", typeOnly: true},
        {specifier: "./workflow.ts", importedNames: ["*"], referenceKind: "dynamic-import", typeOnly: false},
      ]);
      expect(lines.filter((line) => line.includes('import("./reporter.ts")'))).toEqual([expect.stringContaining("loadPresentation")]);
      expect(lines.filter((line) => line.includes('import("./workflow.ts")'))).toEqual([expect.stringContaining("loadWorkflow")]);
    });

    it("loads neither the workflow nor the reporter on the help path", async () => {
      const loaded: string[] = [];
      const fail = (module: string) => (): never => {
        loaded.push(module);
        throw new Error(`The ${module} must never load on the help path.`);
      };
      const command = defineLazyCommand(
        {...metadata, decode, loadWorkflow: fail("workflow"), loadPresentation: fail("reporter")},
        {host: buildCommandHost()},
      );

      await expect(command.run(["--help"])).resolves.toEqual({status: "help", exitCode: 0});
      expect(loaded).toEqual([]);
    });
  });
}
