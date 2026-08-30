/**
 * @fileoverview Runtime selection for local container tooling.
 * @module scripts/container-runtime/selection
 */

import {readToolingConfig} from "../common/tooling-config.ts";
import {ContainerRuntimeError, type ContainerEngine, type RuntimeSelection, type SelectionInputs} from "./types.ts";

const supportedEngines: ReadonlySet<string> = new Set(["rancher", "podman"]);

/** Inputs used by runtime entry points that may fall back to persisted tooling configuration. */
export interface RuntimeSelectionInputs {
  readonly argv: readonly string[];
  readonly env: Readonly<NodeJS.ProcessEnv>;
  readonly toolingConfigPath: string;
}

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

function resolveExplicitContainerEngine(inputs: Readonly<Pick<SelectionInputs, "argv" | "env">>): RuntimeSelection | undefined {
  const argumentValue = readEngineArgument(inputs.argv);
  if (argumentValue !== null) {
    return {engine: normalizeEngine(argumentValue), source: "argument"};
  }

  const environmentValue = inputs.env["AROLARIU_CONTAINER_ENGINE"];
  if (environmentValue !== undefined && environmentValue.trim() !== "") {
    return {engine: normalizeEngine(environmentValue), source: "environment"};
  }

  return undefined;
}

/**
 * Resolves the selected local container engine from CLI, environment, or persisted configuration.
 *
 * @param inputs - Process arguments and environment variables to inspect.
 * @returns The resolved engine and configuration source.
 * @throws {ContainerRuntimeError} When no supported engine is selected.
 */
export function resolveContainerEngine(inputs: SelectionInputs): RuntimeSelection {
  const explicitSelection = resolveExplicitContainerEngine(inputs);
  if (explicitSelection !== undefined) {
    return explicitSelection;
  }

  if (inputs.configuredEngine !== undefined && inputs.configuredEngine.trim() !== "") {
    return {engine: normalizeEngine(inputs.configuredEngine), source: "configuration"};
  }

  throw new ContainerRuntimeError(
    "Select a container engine with --engine rancher|podman, AROLARIU_CONTAINER_ENGINE=rancher|podman, or local tooling configuration.",
  );
}

/**
 * Resolves a runtime engine while consulting persisted configuration only as the lowest-priority source.
 *
 * @param inputs - Process inputs and local tooling configuration path.
 * @returns The resolved engine and configuration source.
 * @throws {ContainerRuntimeError} When an explicit source or required persisted configuration is invalid.
 */
export async function resolveRuntimeContainerEngine(inputs: Readonly<RuntimeSelectionInputs>): Promise<RuntimeSelection> {
  const explicitSelection = resolveExplicitContainerEngine(inputs);
  if (explicitSelection !== undefined) {
    return explicitSelection;
  }

  const localConfig = await readToolingConfig(inputs.toolingConfigPath);
  if (localConfig.status === "invalid") {
    throw new ContainerRuntimeError(localConfig.error);
  }

  return resolveContainerEngine({
    argv: [],
    env: {},
    ...(localConfig.status === "valid" && localConfig.config.containerEngine !== undefined
      ? {configuredEngine: localConfig.config.containerEngine}
      : {}),
  });
}
