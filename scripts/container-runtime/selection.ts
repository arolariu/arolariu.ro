/**
 * @fileoverview Runtime selection for local container tooling.
 * @module scripts/container-runtime/selection
 */

import {ContainerRuntimeError, type ContainerEngine, type RuntimeSelection, type SelectionInputs} from "./types.ts";

const supportedEngines: ReadonlySet<string> = new Set(["rancher", "podman"]);

function normalizeEngine(value: string): ContainerEngine {
  const normalized = value.trim().toLowerCase();

  if (normalized === "docker" || normalized === "docker-desktop") {
    throw new ContainerRuntimeError("Docker Desktop is deprecated for this repository. Select --engine rancher or --engine podman.");
  }

  if (!supportedEngines.has(normalized)) {
    throw new ContainerRuntimeError(`Unsupported container engine '${value}'. Supported engines: rancher, podman.`);
  }

  return normalized as ContainerEngine;
}

function readEngineArgument(argv: readonly string[]): string | null {
  const inline = argv.find((arg) => arg.startsWith("--engine="));
  if (inline !== undefined) return inline.slice("--engine=".length);

  const index = argv.indexOf("--engine");
  if (index === -1) return null;

  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new ContainerRuntimeError("Missing value for --engine. Use --engine rancher or --engine podman.");
  }

  return value;
}

/**
 * Resolves the selected local container engine from CLI arguments or environment.
 *
 * @param inputs - Process arguments and environment variables to inspect.
 * @returns The resolved engine and configuration source.
 * @throws {ContainerRuntimeError} When no supported engine is selected.
 */
export function resolveContainerEngine(inputs: SelectionInputs): RuntimeSelection {
  const argumentValue = readEngineArgument(inputs.argv);
  if (argumentValue !== null) {
    return {engine: normalizeEngine(argumentValue), source: "argument"};
  }

  const environmentValue = inputs.env["AROLARIU_CONTAINER_ENGINE"];
  if (environmentValue !== undefined && environmentValue.trim() !== "") {
    return {engine: normalizeEngine(environmentValue), source: "environment"};
  }

  throw new ContainerRuntimeError("Select a container engine with --engine rancher|podman or AROLARIU_CONTAINER_ENGINE=rancher|podman.");
}
