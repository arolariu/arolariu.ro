/**
 * @fileoverview Runtime selection for local container tooling.
 * @module scripts/container-runtime/selection
 *
 * @remarks
 * {@link resolveContainerEngine} stays a pure, throwing resolver over explicit inputs (Doctor and
 * Setup call it directly). {@link resolveRuntimeContainerEngine} is its Effect counterpart for the
 * container commands: it reads the `AROLARIU_CONTAINER_ENGINE` variable from `Environment` and the
 * persisted tooling configuration through `ReadOnlyFiles`, and fails with a typed
 * {@link ContainerRuntimeError} carrying the legacy message.
 */

import {Effect} from "effect";

import {readToolingConfig} from "../common/tooling-config.ts";
import {Environment} from "../platform/Environment.ts";
import type {ReadOnlyFiles} from "../platform/Files.ts";
import {ContainerRuntimeError, type ContainerEngine, type ContainerEngineSelection, type SelectionInputs} from "./types.ts";

const supportedEngines: ReadonlySet<string> = new Set(["rancher", "podman"]);

/**
 * Inputs used by runtime entry points that may fall back to persisted tooling
 * configuration.
 *
 * @remarks
 * `requestedEngine` is supplied explicitly by the caller (typically a parsed
 * CLI option); this module never inspects `process.argv` itself. The environment comes from the
 * `Environment` service.
 */
export interface RuntimeSelectionInput {
  readonly requestedEngine?: ContainerEngine;
  readonly toolingConfigPath: string;
}

function normalizeEngine(value: string): ContainerEngine {
  const normalized = value.trim().toLowerCase();

  if (normalized === "docker" || normalized === "docker-desktop") {
    throw new ContainerRuntimeError({
      message: "Docker Desktop is deprecated for this repository. Select --engine rancher or --engine podman.",
    });
  }

  if (!supportedEngines.has(normalized)) {
    throw new ContainerRuntimeError({message: `Unsupported container engine '${value}'. Supported engines: rancher, podman.`});
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
    throw new ContainerRuntimeError({message: "Missing value for --engine. Use --engine rancher or --engine podman."});
  }

  return value;
}

function resolveExplicitContainerEngine(inputs: Readonly<Pick<SelectionInputs, "argv" | "env">>): ContainerEngineSelection | undefined {
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
export function resolveContainerEngine(inputs: SelectionInputs): ContainerEngineSelection {
  const explicitSelection = resolveExplicitContainerEngine(inputs);
  if (explicitSelection !== undefined) {
    return explicitSelection;
  }

  if (inputs.configuredEngine !== undefined && inputs.configuredEngine.trim() !== "") {
    return {engine: normalizeEngine(inputs.configuredEngine), source: "configuration"};
  }

  throw new ContainerRuntimeError({
    message:
      "Select a container engine with --engine rancher|podman, AROLARIU_CONTAINER_ENGINE=rancher|podman, or local tooling configuration.",
  });
}

/**
 * Runs one throwing selection step as an effect.
 *
 * @param evaluate - The selection step; it throws only {@link ContainerRuntimeError}.
 * @returns The step value, or its {@link ContainerRuntimeError} as a typed failure.
 */
function selectionStep<A>(evaluate: () => A): Effect.Effect<A, ContainerRuntimeError> {
  return Effect.try({
    try: evaluate,
    catch: (error) => (error instanceof ContainerRuntimeError ? error : new ContainerRuntimeError({message: String(error)})),
  });
}

/**
 * Resolves a runtime engine while consulting persisted configuration only as the lowest-priority source.
 *
 * @remarks
 * Priority order is an explicitly supplied `requestedEngine`, then the
 * `AROLARIU_CONTAINER_ENGINE` variable of the `Environment` snapshot, then persisted local
 * tooling configuration, read through `ReadOnlyFiles` only when neither higher-priority source is
 * set. Every source is validated, so a deprecated (`docker`, `docker-desktop`) or unsupported value
 * fails with the legacy message even though the CLI `--engine` flag only accepts `rancher` and
 * `podman`. This function never reads `process.argv`.
 *
 * @param input - Explicit engine request and local tooling configuration path.
 * @returns The resolved engine and configuration source, failing with {@link ContainerRuntimeError}
 * when an explicit source or the persisted configuration is invalid, or when no engine is selected.
 */
export const resolveRuntimeContainerEngine: (
  input: Readonly<RuntimeSelectionInput>,
) => Effect.Effect<ContainerEngineSelection, ContainerRuntimeError, ReadOnlyFiles | Environment> = Effect.fn(
  "containers.resolveRuntimeContainerEngine",
)(function* (input: Readonly<RuntimeSelectionInput>) {
  const {requestedEngine} = input;
  if (requestedEngine !== undefined) {
    return yield* selectionStep((): ContainerEngineSelection => ({engine: normalizeEngine(requestedEngine), source: "argument"}));
  }

  const environment = yield* Environment;
  const environmentValue = environment.variables["AROLARIU_CONTAINER_ENGINE"];
  if (environmentValue !== undefined && environmentValue.trim() !== "") {
    return yield* selectionStep((): ContainerEngineSelection => ({engine: normalizeEngine(environmentValue), source: "environment"}));
  }

  const localConfig = yield* readToolingConfig(input.toolingConfigPath);
  if (localConfig.status === "invalid") {
    return yield* new ContainerRuntimeError({message: localConfig.error});
  }

  const configuredEngine = localConfig.status === "valid" ? localConfig.config.containerEngine : undefined;
  return yield* selectionStep(() =>
    resolveContainerEngine({argv: [], env: {}, ...(configuredEngine === undefined ? {} : {configuredEngine})}),
  );
});
