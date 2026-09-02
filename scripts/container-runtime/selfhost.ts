/**
 * @fileoverview Engine-aware selfhost orchestration.
 * @module scripts/container-runtime/selfhost
 */

import {BlobServiceClient} from "@azure/storage-blob";
import {access, mkdir} from "node:fs/promises";
import {resolve} from "node:path";
import {setTimeout as delay} from "node:timers/promises";
import {fileURLToPath} from "node:url";
import {commanderExitCode, createToolProgram} from "../common/cli.ts";
import {MonorepositoryConsoleLogger, type MonorepositoryLogger} from "../common/logger.ts";
import {defaultCommandRunner, formatCommand, type CommandRunner, type CommandRunOptions} from "../common/process.ts";
import {resolveRepositoryPaths} from "../common/repository-paths.ts";
import {nodeFileSystem} from "../common/runtime.node.ts";
import {getContainerAdapter, type ContainerRuntimeAdapter, type RuntimeCommand} from "./adapters.ts";
import {describeCommandFailure, runArtifactGeneration, runSharedPreflight} from "./preflight.ts";
import {resolveRuntimeContainerEngine} from "./selection.ts";
import {removeSelfhostTraefikConfig, writeSelfhostTraefikConfig} from "./traefik.ts";
import type {ContainerEngine} from "./types.ts";
import {ContainerRuntimeError, exitWithError} from "./types.ts";

/** Time to wait for storage containers to accept bootstrap calls after compose start. */
const storageReadyDelayMs = 10_000;

/** Time to wait between compose stack operations to reduce local runtime contention. */
const stackOperationDelayMs = 3_000;

/**
 * Azurite's documented development storage connection string.
 *
 * @remarks
 * The development account name and key are public Azurite emulator constants,
 * not production credentials. They are used only against localhost Azurite.
 *
 * @see {@link https://learn.microsoft.com/azure/storage/common/storage-use-azurite}
 */
const azuriteDevelopmentConnectionString = "UseDevelopmentStorage=true";
const certFilePath = "Management/certs/local-cert.pem";
const keyFilePath = "Management/certs/local-key.pem";

/** Supported selfhost orchestration actions. */
export type SelfhostAction = "start" | "stop" | "logs";

/** Inputs used to build a selfhost command plan. */
export interface SelfhostPlanInputs {
  readonly action: SelfhostAction;
  readonly adapter: ContainerRuntimeAdapter;
}

/** Optional boundary replacements for {@link runSelfhost}. */
export interface RunSelfhostOptions {
  readonly requestedEngine?: ContainerEngine;
  readonly runner?: CommandRunner;
  readonly logger?: MonorepositoryLogger;
}

/** Optional boundary replacements for {@link runSelfhostEntrypoint}. */
export interface SelfhostCliDependencies {
  readonly runner?: CommandRunner;
  readonly logger?: MonorepositoryLogger;
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

async function runCommandOrThrow(
  runner: CommandRunner,
  command: RuntimeCommand,
  logger: MonorepositoryLogger,
  options: CommandRunOptions = {},
): Promise<void> {
  logger.command(formatCommand(command));
  const result = await runner.run(command, {
    cwd: options.cwd ?? "infra/Local",
    output: options.output ?? "tee",
    logger,
    ...(options.env === undefined ? {} : {env: options.env}),
  });
  if (result.code !== 0) {
    throw new ContainerRuntimeError(
      `Command failed: ${formatCommand(command)}\n${describeCommandFailure(result, `exit code ${result.code}`)}`,
    );
  }
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

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function ensureHttpsCertificates(runner: CommandRunner, logger: MonorepositoryLogger): Promise<void> {
  if ((await pathExists(`infra/Local/${certFilePath}`)) && (await pathExists(`infra/Local/${keyFilePath}`))) {
    return;
  }

  const mkcert = await runner.run({command: "mkcert", args: ["--version"]});
  if (mkcert.code !== 0) {
    logger.warn(
      "mkcert is not available; Traefik HTTPS will use its default self-signed certificate. Install mkcert and rerun selfhost to generate trusted localhost certificates.",
    );
    return;
  }

  await mkdir("infra/Local/Management/certs", {recursive: true});
  await runCommandOrThrow(runner, {command: "mkcert", args: ["-install"]}, logger);
  await runCommandOrThrow(
    runner,
    {
      command: "mkcert",
      args: ["-key-file", keyFilePath, "-cert-file", certFilePath, "localhost", "*.localhost"],
    },
    logger,
  );
}

async function postCosmosResource(url: string, body: unknown): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body),
  });

  if (!response.ok && response.status !== 409) {
    throw new ContainerRuntimeError(`Cosmos bootstrap failed for ${url}: HTTP ${response.status} ${await response.text()}`);
  }
}

async function bootstrapCosmos(): Promise<void> {
  try {
    await postCosmosResource("http://localhost:8081/dbs", {id: "primary"});
    await postCosmosResource("http://localhost:8081/dbs/primary/colls", {
      id: "invoices",
      partitionKey: {paths: ["/UserIdentifier"], kind: "Hash"},
    });
    await postCosmosResource("http://localhost:8081/dbs/primary/colls", {
      id: "merchants",
      partitionKey: {paths: ["/ParentCompanyId"], kind: "Hash"},
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ContainerRuntimeError(
      `Cosmos bootstrap failed. Ensure the cosmosdb container is running and reachable at http://localhost:8081. Original error: ${message}`,
    );
  }
}

async function bootstrapAzurite(): Promise<void> {
  try {
    const client = BlobServiceClient.fromConnectionString(azuriteDevelopmentConnectionString);
    const container = client.getContainerClient("invoices");
    await container.createIfNotExists();
    await container.setAccessPolicy("blob");
    await client.setProperties({
      cors: [
        {
          allowedOrigins: "*",
          allowedMethods: "GET,HEAD,OPTIONS",
          allowedHeaders: "*",
          exposedHeaders: "*",
          maxAgeInSeconds: 3600,
        },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ContainerRuntimeError(
      `Azurite bootstrap failed. Ensure the azurite container is running and reachable at http://localhost:10000. Original error: ${message}`,
    );
  }
}

async function bootstrapSelfhost(adapter: ContainerRuntimeAdapter, runner: CommandRunner, logger: MonorepositoryLogger): Promise<void> {
  const sqlPassword = getRequiredSqlPassword();

  await runCommandOrThrow(
    runner,
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
    logger,
  );
  await bootstrapCosmos();
  await bootstrapAzurite();
  await runCommandOrThrow(runner, buildLocalStorageBootstrapCommand(), logger, {
    env: {
      DOTNET_ENVIRONMENT: "Development",
      INFRA: "local",
      ConnectionStrings__blobs: azuriteDevelopmentConnectionString,
      ConnectionStrings__queues: azuriteDevelopmentConnectionString,
    },
  });
}

/**
 * Reads the required local SQL Server password from the process environment.
 *
 * @returns The configured local SQL Server password.
 * @throws {ContainerRuntimeError} When the password is not configured.
 *
 * @remarks
 * Keep this value in the shell/session environment only. Do not commit it to
 * `.env` files, VS Code launch profiles, or source control.
 */
export function getRequiredSqlPassword(): string {
  const sqlPassword = process.env["MSSQL_SA_PASSWORD"];
  if (sqlPassword === undefined || sqlPassword.trim() === "") {
    throw new ContainerRuntimeError(
      "MSSQL_SA_PASSWORD environment variable is required for selfhost SQL bootstrap. Set it in your shell/session environment only; do not commit it to .env files, launch profiles, or source control.",
    );
  }

  return sqlPassword;
}

/**
 * Runs selfhost orchestration with the selected runtime engine.
 *
 * @param action - Selfhost action to execute.
 * @param options - Explicit engine request and optional injected command runner/logger.
 */
export async function runSelfhost(
  action: SelfhostAction,
  options: Readonly<RunSelfhostOptions> = {},
): Promise<void> {
  const runner = options.runner ?? defaultCommandRunner;
  const logger = options.logger ?? new MonorepositoryConsoleLogger("container::selfhost");
  const paths = await resolveRepositoryPaths(import.meta.url, nodeFileSystem);
  const selection = await resolveRuntimeContainerEngine({
    ...(options.requestedEngine === undefined ? {} : {requestedEngine: options.requestedEngine}),
    env: process.env,
    toolingConfigPath: paths.toolingConfig,
  });
  const adapter = getContainerAdapter(selection.engine);
  const preflightLogger = logger.child("preflight");

  await runSharedPreflight(adapter, runner, preflightLogger);

  if (shouldGenerateTaxonomyArtifacts(action)) {
    await runArtifactGeneration(runner, preflightLogger);
  }

  if (action === "start") {
    const sqlPassword = getRequiredSqlPassword();
    logger.redact(sqlPassword);
    await ensureHttpsCertificates(runner, logger);
    await writeSelfhostTraefikConfig();
  }

  const commands = buildSelfhostPlan({action, adapter});
  for (const command of commands) {
    await runCommandOrThrow(runner, command, logger);
    if (action === "start" && command.args.includes("Storage/docker-compose.yml")) {
      await delay(storageReadyDelayMs);
      await bootstrapSelfhost(adapter, runner, logger);
    }
    if (action !== "logs") {
      await delay(stackOperationDelayMs);
    }
  }

  if (action === "stop") {
    await removeSelfhostTraefikConfig();
  }
}

const isDirectExecution = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

/**
 * Parses selfhost CLI arguments and runs the direct selfhost CLI with one
 * logger shared by orchestration and failure reporting.
 *
 * @remarks
 * Accepts `argv` explicitly (a Commander "user" argument list, without a
 * leading node executable or script path) so tests never mutate
 * `process.argv`. `--help`/`-h`/`/h` route through the injected `logger` and
 * return without running any selfhost action.
 *
 * @param argv - Raw CLI arguments following the selfhost entrypoint.
 * @param dependencies - Optional injected command runner and logger.
 */
export async function runSelfhostEntrypoint(
  argv: readonly string[],
  dependencies: Readonly<SelfhostCliDependencies> = {},
): Promise<void> {
  const logger = dependencies.logger ?? new MonorepositoryConsoleLogger("container::selfhost");
  const program = createToolProgram({
    name: "selfhost",
    description: "Runs selfhost container orchestration for the selected local engine.",
    usage: "<start|stop|logs> [--engine <rancher|podman>]",
    examples: ["npm run dev:selfhost -- --engine rancher", "npm run dev:selfhost:stop -- --engine podman"],
    logger,
  });
  program.argument("[action]", "Selfhost action to run: start, stop, or logs.");
  program.option("--engine <engine>", "Container engine to use (rancher or podman).");

  try {
    program.parse(argv, {from: "user"});
  } catch (error) {
    if (commanderExitCode(error) === 0) {
      return;
    }
    exitWithError(error, logger);
    return;
  }

  const [requestedAction] = program.args as [string | undefined];
  const options = program.opts<{engine?: string}>();

  try {
    if (requestedAction !== "start" && requestedAction !== "stop" && requestedAction !== "logs") {
      throw new ContainerRuntimeError("Usage: node scripts/container-runtime/selfhost.ts <start|stop|logs> --engine rancher|podman");
    }

    await runSelfhost(requestedAction, {
      // Commander only yields untyped strings; resolveRuntimeContainerEngine
      // validates the value (including the docker-deprecation message)
      // before it is ever treated as a real ContainerEngine.
      ...(options.engine === undefined ? {} : {requestedEngine: options.engine as ContainerEngine}),
      ...(dependencies.runner === undefined ? {} : {runner: dependencies.runner}),
      logger,
    });
  } catch (error) {
    exitWithError(error, logger);
  }
}

if (isDirectExecution) {
  await runSelfhostEntrypoint(process.argv.slice(2));
}
