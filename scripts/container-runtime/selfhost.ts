/**
 * @fileoverview Engine-aware selfhost orchestration command.
 * @module scripts/container-runtime/selfhost
 *
 * @remarks
 * Every ambient effect this command used to reach for directly (the child process, the
 * repository filesystem, the process environment, Node's timers, and the global `fetch` used for
 * Cosmos provisioning) now arrives through the injected {@link CommandExecutionContext.runtime}, so the
 * command is fully exercised by the declarative command runtime's test fakes and never spawns
 * Docker or Podman, and never reaches Cosmos or Azurite, in a test. The taxonomy artifact
 * prerequisite runs as a nested, silent invocation of `generateArtifactsCommand` instead of a
 * spawned Node subprocess, so it inherits this invocation's cancellation, redactions, and cleanup
 * ownership.
 *
 * Started stacks and the generated Traefik file are requested persistent state: neither is ever
 * registered as invocation cleanup, a partially completed start leaves everything it already
 * started running, and the generated Traefik file is removed only by the explicit `stop` action.
 */

import {CommandInputError, type CommandInvoker} from "../core/command/command-execution.ts";
import type {CommandExecutionContext} from "../core/command/command-execution.ts";
import {defineCommand, type LazyMonorepoCommand} from "../core/command/lazy-monorepo-command.ts";
import type {CommandConstructionOptions, CommandHost} from "../core/command/command-specification.ts";
import {resolveRepositoryPaths} from "../common/repository-paths.ts";
import {RunnerError, type ProcessEnvironment} from "../common/runner.ts";
import {CommandCancellation, commandCancellationFromSignal, type CommandRuntime} from "../common/runtime.ts";
import {generateArtifactsCommand, type ArtifactGenerationResult, type GenerateArtifactsInput} from "../generate.artifacts.ts";
import {getContainerAdapter, type ContainerRuntimeAdapter, type RuntimeCommand} from "./adapters.ts";
import {runContainerPreflight} from "./preflight.ts";
import {azuriteDevelopmentConnectionString, createLocalStorageBootstrap, type LocalStorageBootstrap} from "./selfhost.bootstrap.ts";
import {resolveRuntimeContainerEngine} from "./selection.ts";
import {buildSelfhostTraefikConfig, removeSelfhostTraefikConfig, writeSelfhostTraefikConfig} from "./traefik.ts";
import {
  ContainerRuntimeError,
  type ContainerEngine,
  type SelfhostAction,
  type SelfhostInput,
  type SelfhostResult,
  type SelfhostStack,
} from "./types.ts";

/** Time to wait for storage containers to accept bootstrap calls after compose start. */
const storageReadyDelayMs = 10_000;

/** Time to wait between compose stack operations to reduce local runtime contention. */
const stackOperationDelayMs = 3_000;

/** Working directory every selfhost compose, exec, mkcert, and bootstrap command runs from. */
const selfhostWorkingDirectory = "infra/Local";

const certFilePath = "Management/certs/local-cert.pem";
const keyFilePath = "Management/certs/local-key.pem";

/** Local stacks each selfhost action operates on, in execution order. */
const stacksByAction: Readonly<Record<SelfhostAction, readonly SelfhostStack[]>> = {
  start: ["management", "storage", "profile", "backend", "frontend"],
  stop: ["frontend", "backend", "storage", "management"],
  logs: ["profile", "backend", "frontend"],
};

/** Inputs used to build a selfhost command plan. */
export interface SelfhostPlanInputs {
  readonly action: SelfhostAction;
  readonly adapter: ContainerRuntimeAdapter;
}

/** Optional collaborators {@link createSelfhostCommand} composes. */
export interface SelfhostCommandDependencies {
  /** Local Cosmos/Azurite provisioning; defaults to the runtime-HTTP-backed adapter. */
  readonly bootstrap?: LocalStorageBootstrap;
  /** Taxonomy and license artifact generator invoked as the start prerequisite. */
  readonly artifacts?: CommandInvoker<GenerateArtifactsInput, ArtifactGenerationResult>;
}

/** Collaborators resolved once when the command object is created. */
interface ResolvedSelfhostDependencies {
  readonly artifacts: CommandInvoker<GenerateArtifactsInput, ArtifactGenerationResult>;
  readonly bootstrap?: LocalStorageBootstrap;
}

/**
 * Determines whether a selfhost action builds artifact-consuming images.
 *
 * @param action - Selfhost action.
 * @returns `true` only for start.
 */
export function shouldGenerateTaxonomyArtifacts(action: SelfhostAction): boolean {
  return action === "start";
}

function composeFile(adapter: ContainerRuntimeAdapter, file: string, args: readonly string[]): RuntimeCommand {
  return adapter.compose(["-f", file, ...args]);
}

/**
 * Builds the engine-specific selfhost command plan without executing it.
 *
 * @param inputs - Selfhost action and selected runtime adapter.
 * @returns Ordered runtime commands for the requested action.
 */
export function buildSelfhostPlan(inputs: SelfhostPlanInputs): readonly RuntimeCommand[] {
  if (inputs.action === "start") {
    return [
      composeFile(inputs.adapter, "Management/docker-compose.yml", ["up", "-d"]),
      composeFile(inputs.adapter, "Storage/docker-compose.yml", ["--profile", "selfhost", "up", "-d"]),
      composeFile(inputs.adapter, "Backend/docker-compose.yml", ["up", "-d"]),
      composeFile(inputs.adapter, "Frontend/docker-compose.yml", ["up", "-d"]),
    ];
  }

  if (inputs.action === "stop") {
    return [
      composeFile(inputs.adapter, "Frontend/docker-compose.yml", ["down"]),
      composeFile(inputs.adapter, "Backend/docker-compose.yml", ["down"]),
      composeFile(inputs.adapter, "Storage/docker-compose.yml", ["down"]),
      composeFile(inputs.adapter, "Management/docker-compose.yml", ["down"]),
    ];
  }

  return [
    inputs.adapter.logs("exp-arolariu-ro", ["--tail", "100"]),
    inputs.adapter.logs("api-arolariu-ro", ["--tail", "100"]),
    inputs.adapter.logs("website-arolariu-ro", ["--tail", "100"]),
  ];
}

/**
 * Builds the shared storage-only local bootstrap command.
 *
 * @returns The command that idempotently provisions Azurite resources.
 */
export function buildLocalStorageBootstrapCommand(): RuntimeCommand {
  return {
    command: "dotnet",
    args: ["run", "--project", "../../tooling/LocalDevelopment.Bootstrap", "--", "--ensure-storage-only"],
  };
}

/**
 * Reads the required local SQL Server password from an environment snapshot.
 *
 * @param variables - Immutable environment snapshot owned by the invocation.
 * @returns The configured local SQL Server password.
 * @throws {ContainerRuntimeError} When the password is not configured.
 *
 * @remarks
 * Keep this value in the shell/session environment only. Do not commit it to
 * `.env` files, VS Code launch profiles, or source control.
 */
export function getRequiredSqlPassword(variables: Readonly<Record<string, string | undefined>>): string {
  const sqlPassword = variables["MSSQL_SA_PASSWORD"];
  if (sqlPassword === undefined || sqlPassword.trim() === "") {
    throw new ContainerRuntimeError(
      "MSSQL_SA_PASSWORD environment variable is required for selfhost SQL bootstrap. Set it in your shell/session environment only; do not commit it to .env files, launch profiles, or source control.",
    );
  }

  return sqlPassword;
}

/**
 * Runs one selfhost runtime command, translating a cancelled runner outcome on the invocation's
 * own aborted signal into the invocation's typed cancellation reason.
 *
 * @remarks
 * A cancelled invocation's exact SIGINT/SIGTERM exit code (`130`/`143`) is owned by its own
 * {@link CommandCancellation} reason; letting `expectSuccess`'s `RunnerError` for a cancelled
 * outcome escape unclassified would misreport an interrupted invocation as an operational failure
 * and the shared Commander lifecycle would classify it as exit code `1`. A `{kind:"cancelled"}`
 * outcome observed while the invocation signal is not aborted is not this invocation's
 * cancellation and stays an operational failure. The invocation logger is always supplied so the
 * retained request and outcome inside a {@link RunnerError} are redacted.
 *
 * @param runtime - Capabilities owned by the invocation.
 * @param command - Engine-owned runtime command to execute.
 * @param env - Optional environment values merged over the child's inherited defaults.
 * @throws {CommandCancellation} When `command` is cancelled on the invocation's aborted signal.
 * @throws {RunnerError} When `command` fails for any other reason.
 */
async function runSelfhostCommand(runtime: CommandRuntime, command: Readonly<RuntimeCommand>, env?: ProcessEnvironment): Promise<void> {
  try {
    await runtime.runner.expectSuccess(command, {
      cwd: selfhostWorkingDirectory,
      output: "tee",
      logCommands: true,
      logger: runtime.logger,
      signal: runtime.signal,
      ...(env === undefined ? {} : {env}),
    });
  } catch (error: unknown) {
    if (error instanceof RunnerError && error.outcome.kind === "cancelled" && runtime.signal.aborted) {
      throw commandCancellationFromSignal(runtime.signal);
    }
    throw error;
  }
}

/**
 * Generates trusted localhost certificates for Traefik when they are missing.
 *
 * @remarks
 * A missing `mkcert` stays advisory rather than fatal: Traefik then serves its own self-signed
 * certificate and the start action continues, exactly as it did before this command was migrated.
 *
 * @param runtime - Capabilities owned by the invocation.
 * @throws When `mkcert` is available but certificate generation fails.
 */
async function ensureHttpsCertificates(runtime: CommandRuntime): Promise<void> {
  if (
    (await runtime.files.exists(`${selfhostWorkingDirectory}/${certFilePath}`))
    && (await runtime.files.exists(`${selfhostWorkingDirectory}/${keyFilePath}`))
  ) {
    return;
  }

  const mkcert = await runtime.runner.run({command: "mkcert", args: ["--version"]}, {signal: runtime.signal});
  if (mkcert.kind !== "succeeded") {
    runtime.logger.warn(
      "mkcert is not available; Traefik HTTPS will use its default self-signed certificate. Install mkcert and rerun selfhost to generate trusted localhost certificates.",
    );
    return;
  }

  await runtime.files.createDirectory(`${selfhostWorkingDirectory}/Management/certs`, {recursive: true});
  await runSelfhostCommand(runtime, {command: "mkcert", args: ["-install"]});
  await runSelfhostCommand(runtime, {
    command: "mkcert",
    args: ["-key-file", keyFilePath, "-cert-file", certFilePath, "localhost", "*.localhost"],
  });
}

/**
 * Runs the start-only preparation that must happen before any stack command is issued.
 *
 * @param runtime - Capabilities owned by the invocation.
 * @returns The local SQL Server password, already registered with the invocation logger.
 * @throws {ContainerRuntimeError} When the SQL password is not configured.
 */
async function prepareSelfhostStart(runtime: CommandRuntime): Promise<string> {
  // Registering the redaction before anything else guarantees that every later command echo, tee
  // line, and retained runner diagnostic containing the password is already sanitized.
  const sqlPassword = getRequiredSqlPassword(runtime.environment.variables);
  runtime.logger.redact(sqlPassword);

  await ensureHttpsCertificates(runtime);
  await writeSelfhostTraefikConfig(runtime.files, buildSelfhostTraefikConfig());

  return sqlPassword;
}

/**
 * Provisions SQL, Cosmos, Azurite, and local storage once the storage stack is ready.
 *
 * @param runtime - Capabilities owned by the invocation.
 * @param adapter - Selected runtime adapter.
 * @param bootstrap - Local Cosmos/Azurite provisioning.
 * @param sqlPassword - Local SQL Server password, already registered with the invocation logger.
 * @throws When any provisioning step fails or the invocation is cancelled.
 */
async function bootstrapSelfhost(
  runtime: CommandRuntime,
  adapter: ContainerRuntimeAdapter,
  bootstrap: LocalStorageBootstrap,
  sqlPassword: string,
): Promise<void> {
  await runSelfhostCommand(
    runtime,
    adapter.exec("mssql", [
      "/opt/mssql-tools/bin/sqlcmd",
      "-C",
      "-S",
      "localhost",
      "-U",
      "sa",
      "-P",
      sqlPassword,
      "-d",
      "master",
      "-i",
      "/usr/sql/sqlSchema.sql",
      "-No",
    ]),
  );
  await bootstrap.ensureCosmos(runtime.signal);
  await bootstrap.ensureAzurite(runtime.signal);
  await runSelfhostCommand(runtime, buildLocalStorageBootstrapCommand(), {
    DOTNET_ENVIRONMENT: "Development",
    INFRA: "local",
    ConnectionStrings__blobs: azuriteDevelopmentConnectionString,
    ConnectionStrings__queues: azuriteDevelopmentConnectionString,
  });
}

/**
 * Runs the taxonomy and license artifact generator as a nested, silent invocation.
 *
 * @param artifacts - Taxonomy and license artifact generator command.
 * @param context - Command context whose runtime scope owns the nested invocation.
 * @throws {CommandCancellation} When the nested invocation was cancelled.
 * @throws When the nested invocation failed or unexpectedly returned help.
 */
async function runArtifactPrerequisite(
  artifacts: CommandInvoker<GenerateArtifactsInput, ArtifactGenerationResult>,
  context: Readonly<CommandExecutionContext>,
): Promise<void> {
  const execution = await artifacts.invoke({verbose: false}, {parent: context, presentation: "silent"});

  switch (execution.status) {
    case "completed":
      return;
    case "cancelled":
      throw new CommandCancellation(execution.failure.message, execution.exitCode);
    case "failed":
      throw new Error(execution.failure.message, {cause: execution.failure.cause});
    case "help":
      throw new Error("Artifact generation returned help during a nested invocation.");
  }
}

/**
 * Normalizes and validates an untyped `--engine` value exactly like engine selection does.
 *
 * @param value - Raw Commander option value.
 * @returns The validated engine, or `undefined` when no override was supplied.
 * @throws {CommandInputError} When the requested engine is deprecated or unsupported.
 */
function decodeSelfhostEngine(value: string | undefined): ContainerEngine | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "rancher" || normalized === "podman") {
    return normalized;
  }

  if (normalized === "docker" || normalized === "docker-desktop") {
    throw new CommandInputError("Docker Desktop is deprecated for this repository. Select --engine rancher or --engine podman.");
  }

  throw new CommandInputError(`Unsupported container engine '${value}'. Supported engines: rancher, podman.`);
}

/**
 * Runs selfhost orchestration with the resolved local container engine.
 *
 * @param dependencies - Artifact generator and optional storage bootstrap collaborators.
 * @param context - Command context whose runtime owns every ambient capability.
 * @param input - Typed command input.
 * @returns The action, engine, and ordered stacks this invocation operated on.
 * @throws When the engine cannot be resolved, preflight fails, the artifact prerequisite fails,
 * the SQL password is missing, bootstrap fails, or a stack command exits with a nonzero code.
 */
async function executeSelfhost(
  dependencies: Readonly<ResolvedSelfhostDependencies>,
  context: Readonly<CommandExecutionContext>,
  input: Readonly<SelfhostInput>,
): Promise<SelfhostResult> {
  const {runtime} = context;
  const paths = await resolveRepositoryPaths(import.meta.url, runtime.files);
  const selection = await resolveRuntimeContainerEngine(
    {
      // The declarative command host only decodes untyped CLI strings; resolveRuntimeContainerEngine
      // validates the value (including the docker-deprecation message) before it is ever treated
      // as a real ContainerEngine.
      ...(input.engine === undefined ? {} : {requestedEngine: input.engine}),
      env: runtime.environment.variables,
      toolingConfigPath: paths.toolingConfig,
    },
    runtime.files,
  );
  const adapter = getContainerAdapter(selection.engine);

  await runContainerPreflight(adapter, {
    runner: runtime.runner,
    logger: runtime.logger.child("preflight"),
    environment: runtime.environment,
    signal: runtime.signal,
  });

  if (shouldGenerateTaxonomyArtifacts(input.action)) {
    await runArtifactPrerequisite(dependencies.artifacts, context);
  }

  // A defined password is exactly the start action: only `prepareSelfhostStart()` produces one,
  // and only the start action runs the storage bootstrap that consumes it.
  const sqlPassword = input.action === "start" ? await prepareSelfhostStart(runtime) : undefined;
  const bootstrap = dependencies.bootstrap ?? createLocalStorageBootstrap({http: runtime.http});
  const commands = buildSelfhostPlan({action: input.action, adapter});

  for (const command of commands) {
    // Intentionally sequential: each stack depends on the previous one already being up (or, for
    // stop, already down), and the storage stack must settle before bootstrap runs against it.
    // eslint-disable-next-line no-await-in-loop
    await runSelfhostCommand(runtime, command);

    if (sqlPassword !== undefined && command.args.includes("Storage/docker-compose.yml")) {
      // eslint-disable-next-line no-await-in-loop
      await runtime.clock.delay(storageReadyDelayMs, runtime.signal);
      // eslint-disable-next-line no-await-in-loop
      await bootstrapSelfhost(runtime, adapter, bootstrap, sqlPassword);
    }

    if (input.action !== "logs") {
      // eslint-disable-next-line no-await-in-loop
      await runtime.clock.delay(stackOperationDelayMs, runtime.signal);
    }
  }

  if (input.action === "stop") {
    await removeSelfhostTraefikConfig(runtime.files);
  }

  return {action: input.action, engine: adapter.engine, stacks: stacksByAction[input.action]};
}

/** Production command host. This literal dynamic import is the only edge from this entrypoint
 *  into the Node adapter; core never names it. */
const loadProductionCommandHost = async (): Promise<CommandHost> =>
  import("../adapters/node/node-command-host.ts").then(({createNodeCommandHost}) => createNodeCommandHost("selfhost"));

/**
 * Creates the selfhost orchestration command.
 *
 * @param dependencies - Optional storage bootstrap and artifact collaborators.
 * @param options - The injected command host or a literal loader; defaults to the production
 * Node adapter.
 * @returns The typed `dev:selfhost` command object.
 */
export function createSelfhostCommand(
  dependencies: Readonly<SelfhostCommandDependencies> = {},
  options: Readonly<CommandConstructionOptions> = {loadHost: loadProductionCommandHost},
): LazyMonorepoCommand<SelfhostInput, SelfhostResult, never> {
  const resolved: ResolvedSelfhostDependencies = {
    artifacts: dependencies.artifacts ?? generateArtifactsCommand,
    ...(dependencies.bootstrap === undefined ? {} : {bootstrap: dependencies.bootstrap}),
  };

  return defineCommand<SelfhostInput, SelfhostResult>(
    {
      name: "selfhost",
      description: "Runs selfhost container orchestration for the selected local engine.",
      usage: "[start|stop|logs] [--engine <rancher|podman>]",
      examples: ["npm run dev:selfhost -- --engine rancher", "npm run dev:selfhost:stop -- --engine podman"],
      configure: (program) => {
        program.argument("[action]", "Selfhost action to run: start, stop, or logs (default: start).");
        program.option("--engine <engine>", "Container engine to use (rancher or podman).");
      },
      decode: (program) => {
        const {engine} = program.opts<{engine?: string}>();
        const [action = "start"] = program.args as [string | undefined];

        if (action !== "start" && action !== "stop" && action !== "logs") {
          throw new CommandInputError("Use start, stop, or logs as the first argument.");
        }

        const requestedEngine = decodeSelfhostEngine(engine);
        return {action, ...(requestedEngine === undefined ? {} : {engine: requestedEngine})};
      },
      execute: (context, input) => executeSelfhost(resolved, context, input),
      complete: (result) => ({
        exitCode: 0,
        value: result,
        human: (logger) => logger.success(`Selfhost ${result.action} completed for engine '${result.engine}'.`),
      }),
    },
    options,
  );
}

/** Production singleton used by the `npm run dev:selfhost*` scripts and this module's direct entrypoint. */
export const selfhostCommand: LazyMonorepoCommand<SelfhostInput, SelfhostResult, never> = createSelfhostCommand();

await selfhostCommand.runIfMain(import.meta.url);
