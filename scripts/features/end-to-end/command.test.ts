// @vitest-environment node
/**
 * @fileoverview Lifecycle contract, argv transcripts, and lazy-loading structure of the `test:e2e`
 * entrypoint. Generic lifecycle behavior is owned by {@link runCommandLifecycleContract}, the two
 * structural guarantees by {@link runLazyCommandStructureContract}, and both public transcripts by
 * `scripts/testing/compatibility/public-command-contracts.test.ts`, so this file adds only the argv
 * evidence the feature owns. No case spawns Newman: every process interaction is served by
 * {@link buildRecordingProcessRunner}.
 * @module scripts/features/end-to-end/command.test
 */

import {join} from "node:path";
import {describe, expect, it} from "vitest";

import {CommandInputError} from "../../core/command/command-execution.ts";
import type {CommandHost} from "../../core/command/command-specification.ts";
import {buildCommandHost} from "../../testing/builders/command-host.builder.ts";
import {buildRuntimeEnvironment} from "../../testing/builders/environment.builder.ts";
import {buildRecordingProcessRunner} from "../../testing/builders/process-result.builder.ts";
import {runCommandLifecycleContract} from "../../testing/contracts/command-lifecycle.contract.ts";
import {runLazyCommandStructureContract} from "../../testing/contracts/lazy-command-structure.contract.ts";
import {createMemoryFileSystem} from "../../testing/fixtures/memory-filesystem.fixture.ts";
import {repositoryFixtureRoot} from "../../testing/fixtures/repository.fixture.ts";
import {buildRecordingPresenter} from "../../testing/fixtures/terminal.fixture.ts";
import {createEndToEndCommand} from "./command.ts";
import {decodeEndToEndInput, type EndToEndInput} from "./input.ts";
import {endToEndCommandMetadata} from "./metadata.ts";
import {requireValidEndToEndTarget} from "./targets.ts";

const backendCollectionPath = join(repositoryFixtureRoot, "sites/api.arolariu.ro", "postman-collection.json");

/** Seeds every runnable target's collection and production environment file. */
function fixtureFiles() {
  const seeded: Record<string, string> = {};
  for (const directory of ["sites/api.arolariu.ro", "sites/arolariu.ro", "sites/cv.arolariu.ro"]) {
    seeded[join(repositoryFixtureRoot, directory, "postman-collection.json")] = JSON.stringify({info: {name: "test"}, item: []});
    seeded[join(repositoryFixtureRoot, directory, "postman-environment.production.json")] = JSON.stringify({name: "env", values: []});
  }
  return createMemoryFileSystem(seeded);
}

/** Runs the real command against fixture capabilities, exposing the runner and recorded output. */
function createFixtureCommand(variables: Readonly<Record<string, string>> = {}) {
  const runner = buildRecordingProcessRunner();
  const {presenter, sink} = buildRecordingPresenter();
  const environment = buildRuntimeEnvironment({variables});
  const host = buildCommandHost({runtime: {files: fixtureFiles(), runner, presenter, environment}});
  return {command: createEndToEndCommand({host}), runner, sink};
}

/** Builds the command the shared lifecycle contract exercises: the real definition with only the
 * contract host's runtime factory replaced by fixtures, so one invocation completes without
 * spawning Newman.
 * @param host - The host the contract supplies.
 * @returns The real command, bound to fixture capabilities. */
function createContractCommand(host: CommandHost) {
  const runtime = {files: fixtureFiles(), runner: buildRecordingProcessRunner()};
  return createEndToEndCommand({host: {...host, loadRuntimeFactory: buildCommandHost({runtime}).loadRuntimeFactory}});
}

runCommandLifecycleContract({
  label: "test:e2e",
  createCommand: createContractCommand,
  createInput: (): EndToEndInput => ({target: "cv"}),
  successArguments: ["cv"],
});

runLazyCommandStructureContract({
  label: "test:e2e",
  commandSourcePath: "scripts/features/end-to-end/command.ts",
  workflowTypeNames: ["EndToEndFailure", "EndToEndResult"],
  metadata: endToEndCommandMetadata,
  decode: decodeEndToEndInput,
});

describe("test:e2e argv decoding", () => {
  it("rejects a missing required target with Commander's unchanged diagnostic and exit two", async () => {
    const {command, runner, sink} = createFixtureCommand();
    const execution = await command.run([]);
    expect(execution).toMatchObject({status: "failed", exitCode: 2, failure: {kind: "usage"}});
    const transcript = sink.records.map(({text}) => text).join("");
    expect(transcript).toContain("error: missing required argument 'target'");
    expect(transcript).toContain("Usage: test:e2e <target>");
    expect(runner.calls).toEqual([]);
  });

  it("rejects an invalid parsed target with the unchanged business message and exit two", async () => {
    const {command, runner} = createFixtureCommand();
    expect(await command.run(["bogus-target"])).toMatchObject({
      status: "failed",
      exitCode: 2,
      failure: {kind: "usage", message: 'Invalid target "bogus-target". Valid targets: all, backend, frontend, cv.'},
    });
    expect(await command.run(["frontend", "extra"])).toMatchObject({status: "failed", exitCode: 2, failure: {kind: "usage"}});
    expect(runner.calls).toEqual([]);
  });

  it("rejects an invalid target passed directly to requireValidEndToEndTarget", () => {
    expect(() => requireValidEndToEndTarget("nope")).toThrow(CommandInputError);
    expect(() => requireValidEndToEndTarget("nope")).toThrow('Invalid target "nope". Valid targets: all, backend, frontend, cv.');
    expect(requireValidEndToEndTarget("all")).toBe("all");
  });

  it("decodes a valid target and invokes only that Newman collection", async () => {
    const {command, runner} = createFixtureCommand({E2E_TEST_AUTH_TOKEN: "e2e-test-secret-value"});
    const execution = await command.run(["backend"]);
    expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {targets: ["backend"], completed: ["backend"]}});
    expect(runner.calls).toHaveLength(1);
    expect(runner.calls[0]?.request.args).toContain(backendCollectionPath);
  });
});
