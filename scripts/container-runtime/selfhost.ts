/**
 * @fileoverview Engine-aware selfhost orchestration program.
 * @module scripts/container-runtime/selfhost
 *
 * @remarks
 * {@link runSelfhost} resolves the container engine, runs the shared preflight, and drives the
 * local compose stacks through the Effect `Process` service from `infra/Local`, echoing each command
 * as `$ <command>` with tee output. The start action generates the taxonomy and license artifacts
 * with {@link generateArtifacts} (silently), reads the SQL password as a `Redacted` value, makes
 * sure the localhost certificates exist, writes the Traefik file-provider config, and bootstraps
 * SQL Server, Cosmos, Azurite, and the .NET storage provisioner once the storage stack has
 * settled. Waits are `Effect.sleep`, so tests drive them with the test clock, and cancellation is
 * fiber interruption, which stops the current step immediately.
 *
 * Started stacks and the generated Traefik file are requested persistent state: neither is cleaned
 * up when a later step fails or the invocation is interrupted, a partially completed start leaves
 * everything it already started running, and only the explicit `stop` action removes the generated
 * Traefik file.
 */

import {Duration, Effect, FileSystem, Redacted, type PlatformError} from "effect";

import {generateArtifacts} from "../commands/generate/artifacts.ts";
import type {ArtifactGenerationFailed, TaxonomySourceUnavailable} from "../commands/generate/errors.ts";
import {silently} from "../commands/generate/index.ts";
import type {RepositoryRootNotFound} from "../common/repository-paths.ts";
import {Environment} from "../platform/Environment.ts";
import type {PlatformServices} from "../platform/layers.ts";
import {Presenter} from "../platform/Output.ts";
import {formatProcessRequest, Process, type ProcessError} from "../platform/Process.ts";
import {runEchoedRuntimeCommand, type ContainerRuntimeAdapter, type RuntimeCommand} from "./adapters.ts";
import {prepareContainerEngine} from "./preflight.ts";
import {azuriteDevelopmentConnectionString, ensureAzurite, ensureCosmos, type LocalBlobStorage} from "./selfhost.bootstrap.ts";
import {buildSelfhostTraefikConfig, removeSelfhostTraefikConfig, writeSelfhostTraefikConfig} from "./traefik.ts";
import {ContainerRuntimeError, type SelfhostAction, type SelfhostInput, type SelfhostResult, type SelfhostStack} from "./types.ts";

/** Time to wait for storage containers to accept bootstrap calls after compose start. */
const storageReadyDelayMs = 10_000;

/** Time to wait between compose stack operations to reduce local runtime contention. */
const stackOperationDelayMs = 3_000;

/** Working directory every selfhost compose, exec, mkcert, and bootstrap command runs from. */
const selfhostWorkingDirectory = "infra/Local";

const certFilePath = "Management/certs/local-cert.pem";
const keyFilePath = "Management/certs/local-key.pem";

/** Environment variable holding the local SQL Server `sa` password. */
const sqlPasswordVariable = "MSSQL_SA_PASSWORD";

/** Variable `sqlcmd` reads the password from when `-P` is absent; only its name reaches an argument vector. */
const sqlcmdPasswordVariable = "SQLCMDPASSWORD";

const persistentStorageByContainer = {
  mssql: {destination: "/var/opt/mssql", volume: "arolariu-selfhost-mssql-data"},
  cosmosdb: {destination: "/data", volume: "arolariu-selfhost-cosmos-data"},
} as const;

/**
 * Refuses reconciliation or removal of databases not attached to the intended persistent volumes.
 *
 * @param adapter - Selected runtime adapter.
 * @returns An effect that fails before any Compose operation when existing storage needs migration.
 */
function assertPersistentSelfhostStorage(
  adapter: ContainerRuntimeAdapter,
): Effect.Effect<void, ContainerRuntimeError | ProcessError, Process> {
  return Effect.gen(function* () {
    const runner = yield* Process;
    const listing = yield* runner.run({command: adapter.primaryCli, args: ["ps", "-a", "--format", "{{.Names}}"]});
    const existing = new Set(listing.stdout.split(/\r?\n/).map((name) => name.trim()));
    for (const [name, {destination, volume}] of Object.entries(persistentStorageByContainer)) {
      if (!existing.has(name)) continue;
      const result = yield* runner.run({command: adapter.primaryCli, args: ["inspect", "--format", "{{json .Mounts}}", name]});
      const mounts = yield* Effect.try({
        try: (): unknown => JSON.parse(result.stdout),
        catch: () => new ContainerRuntimeError({message: `Cannot verify persistent storage for ${name}; no containers were reconciled.`}),
      });
      const persistent =
        Array.isArray(mounts)
        && mounts.some(
          (mount: unknown) =>
            typeof mount === "object"
            && mount !== null
            && "Type" in mount
            && mount.Type === "volume"
            && "Name" in mount
            && mount.Name === volume
            && "Destination" in mount
            && mount.Destination === destination,
        );
      if (!persistent) {
        return yield* new ContainerRuntimeError({
          message: `${name} is not attached to ${volume} at ${destination}. Refusing Compose reconciliation or removal: preserve the existing container and obtain separate approval for data migration before restarting selfhost.`,
        });
      }
    }
  });
}

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
    args: ["run", "--project", "../../tooling/src/LocalDevelopment.Bootstrap", "--", "--ensure-storage-only"],
  };
}

/**
 * Reads the required local SQL Server password from the invocation environment.
 *
 * @remarks
 * Keep this value in the shell/session environment only. Do not commit it to `.env` files, VS Code
 * launch profiles, or source control. It stays `Redacted` until the `sqlcmd` call that needs it.
 */
export const getRequiredSqlPassword: Effect.Effect<Redacted.Redacted<string>, ContainerRuntimeError, Environment> = Effect.gen(
  function* () {
    const environment = yield* Environment;
    const sqlPassword = environment.variables[sqlPasswordVariable];
    if (sqlPassword === undefined || sqlPassword.trim() === "") {
      return yield* new ContainerRuntimeError({
        message: `${sqlPasswordVariable} environment variable is required for selfhost SQL bootstrap. Set it in your shell/session environment only; do not commit it to .env files, launch profiles, or source control.`,
      });
    }
    return Redacted.make(sqlPassword);
  },
);

/**
 * Runs one selfhost command from `infra/Local`, echoed as `$ <command>` with tee output.
 *
 * @param command - The command to run.
 * @param env - Optional environment values merged over the inherited environment.
 * @returns An effect failing with the typed {@link ProcessError} of the run.
 */
function runSelfhostCommand(
  command: Readonly<RuntimeCommand>,
  env?: Readonly<Record<string, string>>,
): Effect.Effect<void, ProcessError, Presenter | Process> {
  return Effect.asVoid(runEchoedRuntimeCommand(command, {cwd: selfhostWorkingDirectory, ...(env === undefined ? {} : {env})}));
}

/**
 * Generates trusted localhost certificates for Traefik when they are missing.
 *
 * @remarks
 * A missing `mkcert` stays advisory rather than fatal: Traefik then serves its own self-signed
 * certificate and the start action continues, exactly as the legacy command did.
 *
 * @returns An effect failing when `mkcert` is available but certificate generation fails.
 */
function ensureHttpsCertificates(): Effect.Effect<
  void,
  ProcessError | PlatformError.PlatformError,
  FileSystem.FileSystem | Presenter | Process
> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    if (
      (yield* fs.exists(`${selfhostWorkingDirectory}/${certFilePath}`))
      && (yield* fs.exists(`${selfhostWorkingDirectory}/${keyFilePath}`))
    ) {
      return;
    }

    const runner = yield* Process;
    const mkcertAvailable = yield* runner.run({command: "mkcert", args: ["--version"]}).pipe(
      Effect.as(true),
      Effect.catch(() => Effect.succeed(false)),
    );
    if (!mkcertAvailable) {
      yield* Effect.logWarning(
        "mkcert is not available; Traefik HTTPS will use its default self-signed certificate. Install mkcert and rerun selfhost to generate trusted localhost certificates.",
      );
      return;
    }

    yield* fs.makeDirectory(`${selfhostWorkingDirectory}/Management/certs`, {recursive: true});
    yield* runSelfhostCommand({command: "mkcert", args: ["-install"]});
    yield* runSelfhostCommand({
      command: "mkcert",
      args: ["-key-file", keyFilePath, "-cert-file", certFilePath, "localhost", "*.localhost"],
    });
  });
}

/**
 * Builds the `sqlcmd` schema bootstrap command.
 *
 * @remarks
 * It carries no secret: `exec -e SQLCMDPASSWORD` names the variable only, so the engine client
 * copies the value from its own environment into the container, where `sqlcmd` reads it.
 *
 * @param adapter - Selected runtime adapter.
 * @returns The engine-owned `exec -e SQLCMDPASSWORD mssql sqlcmd …` command.
 */
function sqlSchemaCommand(adapter: ContainerRuntimeAdapter): RuntimeCommand {
  return adapter.exec(
    "mssql",
    ["/opt/mssql-tools18/bin/sqlcmd", "-C", "-S", "localhost", "-U", "sa", "-d", "master", "-i", "/usr/sql/sqlSchema.sql", "-b"],
    [sqlcmdPasswordVariable],
  );
}

/**
 * Describes a failed `sqlcmd` run without its command line.
 *
 * @param adapter - Selected runtime adapter.
 * @param error - The process failure; its `message`, `command`, and captured output are never read, so
 * are never read.
 * @returns The step-only failure message.
 */
function sqlSchemaFailureMessage(adapter: ContainerRuntimeAdapter, error: ProcessError): string {
  const step = `SQL Server schema bootstrap failed: ${adapter.primaryCli} exec mssql sqlcmd`;
  switch (error._tag) {
    case "ProcessExited":
      return `${step} exited with code ${String(error.exitCode)}.`;
    case "ProcessSignalled":
      return `${step} was terminated by ${error.signal}.`;
    case "ProcessSpawnFailed":
      return `${step} failed to start.`;
    case "ProcessTimedOut":
      return `${step} timed out.`;
  }
}

/**
 * Applies the SQL Server schema through `sqlcmd` inside the `mssql` container.
 *
 * @remarks
 * The password is unwrapped only into the `SQLCMDPASSWORD` variable of the spawned engine client
 * (spec §7: secrets travel through `env`, not arguments), so it never appears in an argument
 * vector, the host process list, the echoed `$ …` line, or a `--verbose` echo (the run sets
 * `echo: false`). A failure is rebuilt as a {@link ContainerRuntimeError} naming the step only, so
 * neither the rendered output nor a failure document carries process evidence.
 *
 * @param adapter - Selected runtime adapter.
 * @param sqlPassword - The local SQL Server password.
 * @returns An effect failing with the step-only {@link ContainerRuntimeError}.
 */
function runSqlSchemaBootstrap(
  adapter: ContainerRuntimeAdapter,
  sqlPassword: Redacted.Redacted<string>,
): Effect.Effect<void, ContainerRuntimeError, Presenter | Process> {
  return Effect.gen(function* () {
    const presenter = yield* Presenter;
    const runner = yield* Process;
    const command = sqlSchemaCommand(adapter);
    yield* presenter.line("stdout", `$ ${formatProcessRequest(command)}`);
    yield* runner
      .run(command, {
        cwd: selfhostWorkingDirectory,
        env: {[sqlcmdPasswordVariable]: Redacted.value(sqlPassword)},
        output: "tee",
        echo: false,
      })
      .pipe(Effect.mapError((error) => new ContainerRuntimeError({message: sqlSchemaFailureMessage(adapter, error)})));
  });
}

/**
 * Provisions SQL, Cosmos, Azurite, and local storage once the storage stack is ready.
 *
 * @param adapter - Selected runtime adapter.
 * @param sqlPassword - The local SQL Server password.
 * @returns An effect failing when any provisioning step fails.
 */
function bootstrapSelfhost(
  adapter: ContainerRuntimeAdapter,
  sqlPassword: Redacted.Redacted<string>,
): Effect.Effect<void, ContainerRuntimeError | ProcessError, PlatformServices | LocalBlobStorage> {
  return Effect.gen(function* () {
    yield* runSqlSchemaBootstrap(adapter, sqlPassword);
    yield* ensureCosmos;
    yield* ensureAzurite;
    yield* runSelfhostCommand(buildLocalStorageBootstrapCommand(), {
      DOTNET_ENVIRONMENT: "Development",
      INFRA: "local",
      ConnectionStrings__blobs: Redacted.value(azuriteDevelopmentConnectionString),
      ConnectionStrings__queues: Redacted.value(azuriteDevelopmentConnectionString),
    });
  });
}

/**
 * Runs selfhost orchestration with the resolved local container engine.
 *
 * @remarks
 * - **start**: preflight, silent artifact generation, the SQL password, localhost certificates, the
 *   Traefik config, then each stack with a 3 s pause after it; after the storage stack, a 10 s
 *   settle and the SQL/Cosmos/Azurite/storage bootstrap.
 * - **stop**: preflight, each stack `down` in reverse order with a 3 s pause after it, then the
 *   Traefik config removal.
 * - **logs**: preflight, then the last 100 log lines of each application container.
 *
 * @param input - Typed command input.
 * @returns The action, engine, and ordered stacks this invocation operated on, failing with
 * {@link ContainerRuntimeError} (engine, preflight, SQL password, or bootstrap), `RepositoryRootNotFound`
 * (outside a repository), a {@link ProcessError}
 * (a stack or bootstrap command), a platform error (certificate or Traefik file), or an artifact
 * generation failure.
 */
export const runSelfhost: (
  input: Readonly<SelfhostInput>,
) => Effect.Effect<
  SelfhostResult,
  | ContainerRuntimeError
  | RepositoryRootNotFound
  | ProcessError
  | PlatformError.PlatformError
  | TaxonomySourceUnavailable
  | ArtifactGenerationFailed,
  PlatformServices | LocalBlobStorage
> = Effect.fn("containers.selfhost")(function* (input: Readonly<SelfhostInput>) {
  const adapter = yield* prepareContainerEngine(input, "selfhost");

  if (input.action !== "logs") {
    yield* assertPersistentSelfhostStorage(adapter);
  }

  if (shouldGenerateTaxonomyArtifacts(input.action)) {
    yield* silently(generateArtifacts({verbose: false}));
  }

  // A defined password is exactly the start action, the only one that runs the storage bootstrap.
  let sqlPassword: Redacted.Redacted<string> | undefined;
  if (input.action === "start") {
    sqlPassword = yield* getRequiredSqlPassword;
    yield* ensureHttpsCertificates();
    yield* writeSelfhostTraefikConfig(buildSelfhostTraefikConfig());
  }

  // Intentionally sequential: each stack depends on the previous one already being up (or, for
  // stop, already down), and the storage stack must settle before bootstrap runs against it.
  for (const command of buildSelfhostPlan({action: input.action, adapter})) {
    yield* runSelfhostCommand(command);

    if (sqlPassword !== undefined && command.args.includes("Storage/docker-compose.yml")) {
      yield* Effect.sleep(Duration.millis(storageReadyDelayMs));
      yield* bootstrapSelfhost(adapter, sqlPassword);
    }

    if (input.action !== "logs") {
      yield* Effect.sleep(Duration.millis(stackOperationDelayMs));
    }
  }

  if (input.action === "stop") {
    yield* removeSelfhostTraefikConfig();
  }

  return {action: input.action, engine: adapter.engine, stacks: stacksByAction[input.action]};
});
