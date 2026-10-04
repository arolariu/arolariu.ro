/**
 * @fileoverview Container runtime command adapters.
 * @module scripts/container-runtime/adapters
 */

import {Effect} from "effect";

import type {ProcessRequest} from "../common/runner.ts";
import {Presenter} from "../platform/Output.ts";
import {formatProcessRequest, Process, type ProcessError, type ProcessResult} from "../platform/Process.ts";
import type {ContainerEngine} from "./types.ts";

/** Command and arguments to execute for a selected container runtime. */
export type RuntimeCommand = ProcessRequest;

/** Engine-specific command adapter for local container workflows. */
export interface ContainerRuntimeAdapter {
  readonly engine: ContainerEngine;
  readonly displayName: string;
  readonly primaryCli: string;
  /** Runtime selector passed to Aspire/DCP; Rancher Moby is represented as docker. */
  readonly aspireRuntime: string;
  readonly compose: (args: readonly string[]) => RuntimeCommand;
  readonly exec: (containerName: string, args: readonly string[]) => RuntimeCommand;
  readonly logs: (containerName: string, args?: readonly string[]) => RuntimeCommand;
  readonly build: (args: readonly string[]) => RuntimeCommand;
  readonly run: (args: readonly string[]) => RuntimeCommand;
}

const rancherAdapter: ContainerRuntimeAdapter = {
  engine: "rancher",
  displayName: "Rancher Desktop",
  primaryCli: "docker",
  aspireRuntime: "docker",
  compose: (args) => ({command: "docker", args: ["compose", ...args]}),
  exec: (containerName, args) => ({command: "docker", args: ["exec", containerName, ...args]}),
  logs: (containerName, args = []) => ({command: "docker", args: ["logs", ...args, containerName]}),
  build: (args) => ({command: "docker", args: ["build", ...args]}),
  run: (args) => ({command: "docker", args: ["run", ...args]}),
};

const podmanAdapter: ContainerRuntimeAdapter = {
  engine: "podman",
  displayName: "Podman Desktop",
  primaryCli: "podman",
  aspireRuntime: "podman",
  compose: (args) => ({command: "podman", args: ["compose", ...args]}),
  exec: (containerName, args) => ({command: "podman", args: ["exec", containerName, ...args]}),
  logs: (containerName, args = []) => ({command: "podman", args: ["logs", ...args, containerName]}),
  build: (args) => ({command: "podman", args: ["build", ...args]}),
  run: (args) => ({command: "podman", args: ["run", ...args]}),
};

/**
 * Gets the command adapter for a supported local container engine.
 *
 * @param engine - The selected container engine.
 * @returns The adapter that owns all runtime commands for the engine.
 */
export function getContainerAdapter(engine: ContainerEngine): ContainerRuntimeAdapter {
  return engine === "rancher" ? rancherAdapter : podmanAdapter;
}

/**
 * Echoes an engine-owned command as `$ <command>` and runs it with tee output.
 *
 * @remarks
 * Reproduces the legacy `{output: "tee", logCommands: true}` invocation: the echo is a plain
 * human-mode stdout line (suppressed in JSON mode), and `echo: false` keeps `--verbose` from
 * logging the same command a second time.
 *
 * @param command - The engine-owned command.
 * @returns The process result, failing with the typed {@link ProcessError} of the run.
 */
export function runEchoedRuntimeCommand(
  command: Readonly<RuntimeCommand>,
): Effect.Effect<ProcessResult, ProcessError, Presenter | Process> {
  return Effect.gen(function* () {
    const presenter = yield* Presenter;
    const runner = yield* Process;
    yield* presenter.line("stdout", `$ ${formatProcessRequest(command)}`);
    return yield* runner.run(command, {output: "tee", echo: false});
  });
}
