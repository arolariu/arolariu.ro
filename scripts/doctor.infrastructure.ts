/**
 * @fileoverview Read-only local container runtime, port, certificate, and manifest diagnostics.
 * @module scripts.doctor.infrastructure
 */

import {constants as fsConstants} from "node:fs";
import {access} from "node:fs/promises";
import {resolve} from "node:path";

import type {CommandResult, CommandSpec} from "./common/process.ts";
import {readToolingConfig} from "./common/tooling-config.ts";
import {requiredLocalPorts} from "./container-runtime/preflight.ts";
import {resolveContainerEngine} from "./container-runtime/selection.ts";
import {ContainerRuntimeError, type ContainerEngine} from "./container-runtime/types.ts";
import {
  createPortOwnerProbeCommand,
  DIAGNOSTIC_DEFAULT_TIMEOUT_MS,
  diagnosticResult,
  skippedDiagnostic,
  type DiagnosticFix,
  type DiagnosticModule,
  type DiagnosticPotentialCause,
  type DiagnosticResult,
  type DoctorContext,
} from "./doctor.types.ts";

/**
 * Windows process inventory probe script.
 *
 * This is a verbatim duplicate of the private script embedded in `doctor.types.ts`'s
 * `isReadOnlyDiagnosticCommand` allowlist. It is intentionally duplicated (not imported)
 * because the AST-based read-only command guard analyzes each `scripts/doctor*.ts` file in
 * isolation and cannot resolve cross-module string identifiers, matching the established
 * precedent of `PYTHON_INTERPRETER_METADATA_SNIPPET` duplication in `doctor.python.ts`.
 */
const WINDOWS_PROCESS_PROBE_SCRIPT = "Get-Process | Select-Object Id, ProcessName, Path | ConvertTo-Json -Compress" as const;
const WINDOWS_PROCESS_PROBE_COMMAND = {
  command: "powershell",
  args: ["-NoProfile", "-NonInteractive", "-Command", WINDOWS_PROCESS_PROBE_SCRIPT],
} as const satisfies CommandSpec;

/** Known local container names reused verbatim from the repository's selfhost manifests. */
const KNOWN_LOCAL_CONTAINER_NAMES: readonly string[] = [
  "traefik",
  "mssql",
  "cosmosdb",
  "azurite",
  "redis",
  "exp-arolariu-ro",
  "api-arolariu-ro",
  "website-arolariu-ro",
];

const REQUIRED_MANIFEST_RELATIVE_PATHS: readonly (readonly string[])[] = [
  ["tooling", "AppHost", "AppHost.csproj"],
  ["infra", "Local", "Management", "docker-compose.yml"],
  ["infra", "Local", "Storage", "docker-compose.yml"],
  ["infra", "Local", "Backend", "docker-compose.yml"],
  ["infra", "Local", "Frontend", "docker-compose.yml"],
];
const CERTIFICATE_RELATIVE_PATH = ["infra", "Local", "Management", "certs", "local-cert.pem"] as const;
const KEY_RELATIVE_PATH = ["infra", "Local", "Management", "certs", "local-key.pem"] as const;

const DOCKER_VERSION_COMMAND = {command: "docker", args: ["--version"]} as const satisfies CommandSpec;
const DOCKER_INFO_COMMAND = {command: "docker", args: ["info"]} as const satisfies CommandSpec;
const DOCKER_VERSION_FULL_COMMAND = {command: "docker", args: ["version"]} as const satisfies CommandSpec;
const DOCKER_COMPOSE_VERSION_COMMAND = {command: "docker", args: ["compose", "version"]} as const satisfies CommandSpec;
const DOCKER_CONTEXT_SHOW_COMMAND = {command: "docker", args: ["context", "show"]} as const satisfies CommandSpec;
const DOCKER_PS_COMMAND = {command: "docker", args: ["ps", "-a", "--format", "{{json .}}"]} as const satisfies CommandSpec;

const PODMAN_VERSION_COMMAND = {command: "podman", args: ["--version"]} as const satisfies CommandSpec;
const PODMAN_INFO_COMMAND = {command: "podman", args: ["info", "--format", "json"]} as const satisfies CommandSpec;
const PODMAN_COMPOSE_VERSION_COMMAND = {command: "podman", args: ["compose", "version"]} as const satisfies CommandSpec;
const PODMAN_CONNECTION_LIST_COMMAND = {
  command: "podman",
  args: ["system", "connection", "list", "--format", "json"],
} as const satisfies CommandSpec;
const PODMAN_MACHINE_LIST_COMMAND = {command: "podman", args: ["machine", "list", "--format", "json"]} as const satisfies CommandSpec;
const PODMAN_PS_COMMAND = {command: "podman", args: ["ps", "-a", "--format", "{{json .}}"]} as const satisfies CommandSpec;

const MKCERT_VERSION_COMMAND = {command: "mkcert", args: ["--version"]} as const satisfies CommandSpec;
const MKCERT_CAROOT_COMMAND = {command: "mkcert", args: ["-CAROOT"]} as const satisfies CommandSpec;

const DOCKER_DESKTOP_COMPOSE_INDICATORS = [
  "\\docker\\",
  "/docker/",
  "/docker.app/",
  "docker desktop",
  "docker-compose.exe",
  "docker-compose",
] as const;

const SUPPORTED_PORT_OWNER_PLATFORMS: ReadonlySet<NodeJS.Platform> = new Set(["win32", "darwin", "linux"]);

/** One resolved TCP port owner discovered by a read-only diagnostic probe. */
export interface PortOwner {
  readonly port: number;
  readonly pid?: number;
  readonly processName?: string;
  readonly commandLine?: string;
}

/**
 * One normalized `docker ps`/`podman ps` container record.
 *
 * Real Docker and Podman `-a --format {{json .}}` output use materially different shapes for
 * the same logical fields: Docker emits `Names` as a single comma-joined string and `Ports` as a
 * single human-readable string (`"0.0.0.0:3000->3000/tcp"`); Podman emits `Names` as a JSON array
 * of strings and `Ports` as a JSON array of port-mapping objects
 * (`{"host_ip":"0.0.0.0","container_port":3000,"host_port":3000,"protocol":"tcp"}`). Both shapes
 * are normalized into this single read-only record so downstream logic never depends on which
 * engine produced the line.
 */
interface ParsedContainerRecord {
  readonly names: readonly string[];
  readonly state: string;
  readonly status: string;
  readonly hostPorts: readonly number[];
}

function isSuccessfulCommand(result: Readonly<CommandResult>): boolean {
  return result.code === 0 && !result.timedOut && result.signal === undefined && result.spawnError === undefined;
}

/**
 * Determines whether a port-owner probe result is acceptable evidence, tolerating the one
 * platform-specific benign nonzero exit shape.
 *
 * The macOS port-owner probe script (`for port in "$@"; do lsof ... ; done`) runs one `lsof`
 * invocation per requested port without `set -e`. `lsof` exits `1` for a port with no listener,
 * so the *last* requested port having no listener leaves the whole `sh -c` invocation's exit
 * code at `1` even though earlier ports in the same invocation may have produced valid,
 * already-flushed stdout. That specific shape (nonzero exit, no timeout, no signal, no spawn
 * error, no stderr) is indistinguishable from "some or all requested ports were free" and must
 * be treated as acceptable evidence rather than a probe failure. A genuine tool/permission
 * failure (for example a missing `lsof` binary or a permission error) always produces non-empty
 * stderr and must still be classified as a probe failure.
 *
 * @param platform - Target runtime platform the probe was executed for.
 * @param result - Captured command result from the port-owner probe.
 * @returns Whether the result's stdout should be parsed as port-ownership evidence.
 */
function isAcceptablePortProbeResult(platform: NodeJS.Platform, result: Readonly<CommandResult>): boolean {
  if (isSuccessfulCommand(result)) {
    return true;
  }

  return (
    platform === "darwin"
    && result.code === 1
    && !result.timedOut
    && result.signal === undefined
    && result.spawnError === undefined
    && result.stderr.trim() === ""
  );
}

function isMissingExecutable(result: Readonly<CommandResult>): boolean {
  const detail = `${result.spawnError ?? ""}\n${result.stderr}`;
  return result.code === 127
    || /\bENOENT\b|command not found|not recognized as an internal or external command|no such file or directory/iu.test(detail);
}

function commandEvidence(result: Readonly<CommandResult>): readonly string[] {
  return [
    ...(result.spawnError === undefined ? [] : [`Unable to start command: ${result.spawnError}`]),
    ...(result.timedOut ? ["Command timed out."] : []),
    ...(result.signal === undefined ? [] : [`Command stopped with signal ${result.signal}.`]),
    ...(result.code === 0 ? [] : [`Command exited with code ${String(result.code)}.`]),
    ...(result.stdout.trim() === "" ? [] : [`stdout: ${result.stdout.trim()}`]),
    ...(result.stderr.trim() === "" ? [] : [`stderr: ${result.stderr.trim()}`]),
  ];
}

function diagnostic(
  context: Readonly<DoctorContext>,
  startedAt: number,
  input: Omit<DiagnosticResult, "durationMs" | "module">,
): DiagnosticResult {
  return diagnosticResult(
    {
      module: "infrastructure",
      ...input,
    },
    startedAt,
    context.now,
  );
}

function issueDiagnostic(
  context: Readonly<DoctorContext>,
  startedAt: number,
  input: Readonly<{
    id: string;
    name: string;
    status: "warn" | "fail";
    summary: string;
    evidence: readonly string[];
    fixes: readonly DiagnosticFix[];
    rootCause?: string;
    potentialCauses?: readonly DiagnosticPotentialCause[];
  }>,
): DiagnosticResult {
  return diagnostic(context, startedAt, {
    id: input.id,
    name: input.name,
    status: input.status,
    summary: input.summary,
    evidence: input.evidence,
    ...(input.rootCause === undefined ? {} : {rootCause: input.rootCause}),
    potentialCauses: input.potentialCauses ?? [],
    fixes: input.fixes,
  });
}

function passDiagnostic(
  context: Readonly<DoctorContext>,
  startedAt: number,
  id: string,
  name: string,
  summary: string,
  evidence: readonly string[],
): DiagnosticResult {
  return diagnostic(context, startedAt, {
    id,
    name,
    status: "pass",
    summary,
    evidence,
    potentialCauses: [],
    fixes: [],
  });
}

function skipDiagnostic(id: string, name: string, summary: string, evidence: readonly string[]): DiagnosticResult {
  return skippedDiagnostic({id, module: "infrastructure", name, summary, evidence});
}

function engineLabel(engine: ContainerEngine): string {
  return engine === "rancher" ? "Rancher Desktop" : "Podman Desktop";
}

function cliName(engine: ContainerEngine): "docker" | "podman" {
  return engine === "rancher" ? "docker" : "podman";
}

const SETUP_REMEDIATION_FIX: DiagnosticFix = {
  description: "Select a supported local container engine.",
  command: "npm run setup",
};

/**
 * Builds the shared read-only port-owner probe for one supported platform.
 *
 * Delegates every command shape to {@link createPortOwnerProbeCommand} rather than
 * constructing or interpolating shell fragments locally.
 *
 * @param platform - Candidate runtime platform.
 * @param ports - Candidate decimal TCP ports to inspect.
 * @returns The exact allowlisted command, or `null` when the platform is unsupported or the
 * requested ports are invalid.
 */
export function buildPortOwnerProbe(platform: NodeJS.Platform, ports: readonly number[]): CommandSpec | null {
  if (!SUPPORTED_PORT_OWNER_PLATFORMS.has(platform)) {
    return null;
  }

  try {
    return createPortOwnerProbeCommand(platform, ports);
  } catch {
    return null;
  }
}

/**
 * Classifies a container-runtime failure from already-captured, read-only command evidence.
 *
 * @param input - Captured CLI, backend, Compose, and context command results for one engine.
 * @returns A single root cause when the failure is unambiguous, otherwise ranked potential
 * causes, plus actionable fixes. Never both a root cause and potential causes.
 */
export function classifyContainerFailure(
  input: Readonly<{
    engine: ContainerEngine;
    cli: CommandResult;
    backend?: CommandResult;
    compose?: CommandResult;
    context?: CommandResult;
  }>,
): Readonly<Pick<DiagnosticResult, "rootCause" | "potentialCauses" | "fixes">> {
  const {engine, cli, backend, compose} = input;
  const cliDisplayName = cliName(engine);

  if (!isSuccessfulCommand(cli) && isMissingExecutable(cli)) {
    return {
      rootCause: `The ${cliDisplayName} CLI is not installed or not on PATH.`,
      potentialCauses: [],
      fixes: [
        {description: `Install ${engineLabel(engine)} and ensure ${cliDisplayName} is available on PATH, then rerun doctor.`},
      ],
    };
  }

  // A non-missing `--version` failure/timeout/signal is a CLI probe failure in its own right —
  // it is not evidence of a stopped daemon or misconfigured socket, which can only be diagnosed
  // from an actual backend/Compose probe result. Only classify this way when no backend or
  // Compose evidence was captured for this call (i.e. this classification originates from the
  // CLI check itself, not from a later backend/Compose failure that also received a successful
  // CLI result).
  if (!isSuccessfulCommand(cli) && backend === undefined && compose === undefined) {
    return {
      rootCause: `The ${cliDisplayName} CLI command failed, timed out, or was terminated unexpectedly.`,
      potentialCauses: [],
      fixes: [
        {description: `Re-run '${cliDisplayName} --version' manually to diagnose the failure, then rerun doctor.`},
      ],
    };
  }

  if (engine === "rancher" && backend !== undefined && backend.stdout.toLowerCase().includes("docker desktop")) {
    return {
      rootCause: "Rancher engine selected but Docker Desktop appears to be the active backend.",
      potentialCauses: [],
      fixes: [{description: "Start Rancher Desktop in Moby/dockerd mode and stop Docker Desktop."}],
    };
  }

  if (engine === "podman" && compose !== undefined) {
    const composeOutput = compose.stdout.toLowerCase();
    const usesPodmanCompose = composeOutput.includes("podman-compose");
    const delegatedToDocker = !usesPodmanCompose && DOCKER_DESKTOP_COMPOSE_INDICATORS.some((indicator) => composeOutput.includes(indicator));
    if (delegatedToDocker) {
      return {
        rootCause: "Podman Compose is currently delegated to a Docker Desktop compose provider.",
        potentialCauses: [],
        fixes: [{description: "Install podman-compose and set PODMAN_COMPOSE_PROVIDER to the podman-compose executable."}],
      };
    }
  }

  return {
    potentialCauses: [
      {cause: `The ${engineLabel(engine)} backend is not running.`, confidence: "high"},
      {cause: "The container runtime socket or context is misconfigured.", confidence: "medium"},
    ],
    fixes: [{description: `Start ${engineLabel(engine)} and confirm its backend is running, then rerun doctor.`}],
  };
}

interface EngineSelection {
  readonly engine: ContainerEngine;
  readonly source: "argument" | "environment" | "configuration";
}

interface SelectionOutcome {
  readonly diagnostic: DiagnosticResult;
  readonly selection: EngineSelection | null;
}

async function diagnoseSelection(context: Readonly<DoctorContext>): Promise<SelectionOutcome> {
  const startedAt = context.now();
  const configRead = await readToolingConfig(context.paths.toolingConfig);
  const configuredEngine = configRead.status === "valid" ? configRead.config.containerEngine : undefined;

  let selection: EngineSelection;
  try {
    selection = resolveContainerEngine({
      argv: [],
      env: context.env,
      ...(configuredEngine === undefined ? {} : {configuredEngine}),
    });
  } catch (error) {
    const message = error instanceof ContainerRuntimeError ? error.message : String(error);
    // `resolveContainerEngine` throws two distinct shapes reachable with `argv: []`: a generic
    // "no engine selected" message when neither the environment variable nor persisted
    // configuration provided any value, and a specific "unsupported"/"deprecated" message when a
    // value was provided but rejected (for example an invalid or deprecated engine name). These
    // must not be conflated: an invalid/unsupported configured value is a different root cause
    // from no selection having been made at all.
    const isInvalidConfiguredValue = /unsupported container engine|deprecated/iu.test(message);
    return {
      diagnostic: issueDiagnostic(context, startedAt, {
        id: "infrastructure.selection",
        name: "Container engine selection",
        status: "fail",
        summary: isInvalidConfiguredValue
          ? "An invalid or unsupported container engine value is configured."
          : "No supported local container engine is selected.",
        evidence: [
          message,
          ...(configRead.status === "invalid" ? [configRead.error] : []),
        ],
        rootCause: isInvalidConfiguredValue
          ? "The configured container engine value is invalid, unsupported, or deprecated."
          : "No container engine is selected via environment variable or persisted local tooling configuration.",
        fixes: [SETUP_REMEDIATION_FIX],
      }),
      selection: null,
    };
  }

  if (configRead.status === "invalid") {
    return {
      diagnostic: issueDiagnostic(context, startedAt, {
        id: "infrastructure.selection",
        name: "Container engine selection",
        status: "warn",
        summary: `Container engine resolved to ${engineLabel(selection.engine)}, but local tooling configuration could not be read.`,
        evidence: [`Local tooling configuration is invalid: ${configRead.error}`],
        rootCause: "Local tooling configuration exists but failed to parse.",
        fixes: [SETUP_REMEDIATION_FIX],
      }),
      selection,
    };
  }

  return {
    diagnostic: passDiagnostic(
      context,
      startedAt,
      "infrastructure.selection",
      "Container engine selection",
      `Container engine resolved to ${engineLabel(selection.engine)} from ${selection.source}.`,
      [`Selected engine: ${selection.engine} (source: ${selection.source}).`],
    ),
    selection,
  };
}

interface CliOutcome {
  readonly diagnostic: DiagnosticResult;
  readonly result: CommandResult | null;
}

async function diagnoseCli(context: Readonly<DoctorContext>, engine: ContainerEngine): Promise<CliOutcome> {
  const startedAt = context.now();
  const command = engine === "rancher" ? DOCKER_VERSION_COMMAND : PODMAN_VERSION_COMMAND;
  const result = await context.runner.run(command, {cwd: context.paths.root, timeoutMs: DIAGNOSTIC_DEFAULT_TIMEOUT_MS});

  if (isSuccessfulCommand(result)) {
    return {
      diagnostic: passDiagnostic(
        context,
        startedAt,
        "infrastructure.cli",
        `${cliName(engine)} CLI`,
        `The ${cliName(engine)} CLI is available.`,
        [result.stdout.trim()],
      ),
      result,
    };
  }

  const classification = classifyContainerFailure({engine, cli: result});
  return {
    diagnostic: issueDiagnostic(context, startedAt, {
      id: "infrastructure.cli",
      name: `${cliName(engine)} CLI`,
      status: "fail",
      summary: `The ${cliName(engine)} CLI is not available.`,
      evidence: commandEvidence(result),
      ...classification,
    }),
    result: null,
  };
}

async function diagnoseBackend(context: Readonly<DoctorContext>, engine: ContainerEngine, cli: CommandResult): Promise<{
  readonly diagnostic: DiagnosticResult;
  readonly result: CommandResult;
}> {
  const startedAt = context.now();
  const command = engine === "rancher" ? DOCKER_INFO_COMMAND : PODMAN_INFO_COMMAND;
  const result = await context.runner.run(command, {cwd: context.paths.root, timeoutMs: DIAGNOSTIC_DEFAULT_TIMEOUT_MS});

  if (isSuccessfulCommand(result)) {
    return {
      diagnostic: passDiagnostic(
        context,
        startedAt,
        "infrastructure.backend",
        `${engineLabel(engine)} backend`,
        `The ${engineLabel(engine)} backend is running.`,
        [result.stdout.trim() === "" ? "Backend responded successfully." : result.stdout.trim()],
      ),
      result,
    };
  }

  const classification = classifyContainerFailure({engine, cli, backend: result});
  return {
    diagnostic: issueDiagnostic(context, startedAt, {
      id: "infrastructure.backend",
      name: `${engineLabel(engine)} backend`,
      status: "fail",
      summary: `The ${engineLabel(engine)} backend did not respond.`,
      evidence: commandEvidence(result),
      ...classification,
    }),
    result,
  };
}

async function diagnoseCompose(context: Readonly<DoctorContext>, engine: ContainerEngine, cli: CommandResult): Promise<{
  readonly diagnostic: DiagnosticResult;
  readonly result: CommandResult;
}> {
  const startedAt = context.now();
  const command = engine === "rancher" ? DOCKER_COMPOSE_VERSION_COMMAND : PODMAN_COMPOSE_VERSION_COMMAND;
  const result = await context.runner.run(command, {cwd: context.paths.root, timeoutMs: DIAGNOSTIC_DEFAULT_TIMEOUT_MS});

  if (isSuccessfulCommand(result)) {
    return {
      diagnostic: passDiagnostic(
        context,
        startedAt,
        "infrastructure.compose",
        "Compose provider",
        "A Compose provider is available for the selected engine.",
        [result.stdout.trim()],
      ),
      result,
    };
  }

  const classification = classifyContainerFailure({engine, cli, compose: result});
  return {
    diagnostic: issueDiagnostic(context, startedAt, {
      id: "infrastructure.compose",
      name: "Compose provider",
      status: "fail",
      summary: "No Compose provider is available for the selected engine.",
      evidence: commandEvidence(result),
      ...classification,
    }),
    result,
  };
}

async function diagnoseDockerConflict(
  context: Readonly<DoctorContext>,
  engine: ContainerEngine,
  cli: CommandResult,
  backend: CommandResult,
  compose: CommandResult,
  triggerFollowUp: boolean,
): Promise<DiagnosticResult> {
  const startedAt = context.now();

  if (engine === "rancher") {
    if (!triggerFollowUp) {
      // Derive the outcome from the already-captured `docker info` (backend) evidence instead of
      // dispatching a redundant `docker version` follow-up: on a healthy, non-verbose path the
      // backend probe's own output is sufficient evidence, and Docker Desktop's `docker info`
      // output identifies itself the same way `docker version` does.
      if (backend.stdout.toLowerCase().includes("docker desktop")) {
        return issueDiagnostic(context, startedAt, {
          id: "infrastructure.docker-conflict",
          name: "Docker Desktop conflict",
          status: "fail",
          summary: "Docker Desktop appears to be the active backend instead of Rancher Desktop.",
          evidence: [backend.stdout.trim()],
          rootCause: "Rancher engine selected but Docker Desktop appears to be the active backend.",
          fixes: [{description: "Start Rancher Desktop in Moby/dockerd mode and stop Docker Desktop."}],
        });
      }

      return passDiagnostic(
        context,
        startedAt,
        "infrastructure.docker-conflict",
        "Docker Desktop conflict",
        "Rancher Desktop, not Docker Desktop, owns the Docker-compatible backend (derived from already-captured backend evidence).",
        [backend.stdout.trim() === "" ? "Backend evidence did not mention Docker Desktop." : backend.stdout.trim()],
      );
    }

    const result = await context.runner.run(DOCKER_VERSION_FULL_COMMAND, {cwd: context.paths.root, timeoutMs: DIAGNOSTIC_DEFAULT_TIMEOUT_MS});
    if (!isSuccessfulCommand(result)) {
      return issueDiagnostic(context, startedAt, {
        id: "infrastructure.docker-conflict",
        name: "Docker Desktop conflict",
        status: "warn",
        summary: "Docker Desktop conflict could not be verified.",
        evidence: commandEvidence(result),
        potentialCauses: [{cause: "The Docker-compatible CLI could not report its active backend.", confidence: "medium"}],
        fixes: [{description: "Confirm Rancher Desktop is running, then rerun doctor."}],
      });
    }

    if (result.stdout.toLowerCase().includes("docker desktop")) {
      return issueDiagnostic(context, startedAt, {
        id: "infrastructure.docker-conflict",
        name: "Docker Desktop conflict",
        status: "fail",
        summary: "Docker Desktop appears to be the active backend instead of Rancher Desktop.",
        evidence: [result.stdout.trim()],
        rootCause: "Rancher engine selected but Docker Desktop appears to be the active backend.",
        fixes: [{description: "Start Rancher Desktop in Moby/dockerd mode and stop Docker Desktop."}],
      });
    }

    return passDiagnostic(
      context,
      startedAt,
      "infrastructure.docker-conflict",
      "Docker Desktop conflict",
      "Rancher Desktop, not Docker Desktop, owns the Docker-compatible backend.",
      [result.stdout.trim()],
    );
  }

  const classification = classifyContainerFailure({engine, cli, compose});
  if (classification.rootCause?.includes("delegated") === true) {
    return issueDiagnostic(context, startedAt, {
      id: "infrastructure.docker-conflict",
      name: "Docker Desktop conflict",
      status: "fail",
      summary: "Podman Compose is delegated to a Docker Desktop compose provider.",
      evidence: [compose.stdout.trim()],
      ...classification,
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "infrastructure.docker-conflict",
    "Docker Desktop conflict",
    "Podman Compose is not delegated to a Docker Desktop compose provider.",
    [compose.stdout.trim() === "" ? "Compose provider check reported no delegation indicators." : compose.stdout.trim()],
  );
}

async function diagnoseSocketContext(
  context: Readonly<DoctorContext>,
  engine: ContainerEngine,
  triggered: boolean,
): Promise<DiagnosticResult> {
  if (!triggered) {
    return skipDiagnostic(
      "infrastructure.socket-context",
      "Socket and context state",
      "Socket/context follow-up was skipped because backend and Compose checks already passed.",
      ["Pass --verbose to force socket/context evidence collection."],
    );
  }

  const startedAt = context.now();

  if (engine === "rancher") {
    const result = await context.runner.run(DOCKER_CONTEXT_SHOW_COMMAND, {cwd: context.paths.root, timeoutMs: DIAGNOSTIC_DEFAULT_TIMEOUT_MS});
    if (!isSuccessfulCommand(result)) {
      return issueDiagnostic(context, startedAt, {
        id: "infrastructure.socket-context",
        name: "Socket and context state",
        status: "warn",
        summary: "The active Docker context could not be determined.",
        evidence: commandEvidence(result),
        potentialCauses: [{cause: "The Docker-compatible CLI context is misconfigured.", confidence: "medium"}],
        fixes: [{description: "Run 'docker context show' manually to inspect the active context."}],
      });
    }

    return passDiagnostic(
      context,
      startedAt,
      "infrastructure.socket-context",
      "Socket and context state",
      "The active Docker context was captured for follow-up evidence.",
      [result.stdout.trim()],
    );
  }

  const [connectionResult, machineResult] = await Promise.all([
    context.runner.run(PODMAN_CONNECTION_LIST_COMMAND, {cwd: context.paths.root, timeoutMs: DIAGNOSTIC_DEFAULT_TIMEOUT_MS}),
    context.runner.run(PODMAN_MACHINE_LIST_COMMAND, {cwd: context.paths.root, timeoutMs: DIAGNOSTIC_DEFAULT_TIMEOUT_MS}),
  ]);

  if (!isSuccessfulCommand(connectionResult) || !isSuccessfulCommand(machineResult)) {
    return issueDiagnostic(context, startedAt, {
      id: "infrastructure.socket-context",
      name: "Socket and context state",
      status: "warn",
      summary: "Podman connection or machine state could not be determined.",
      evidence: [...commandEvidence(connectionResult), ...commandEvidence(machineResult)],
      potentialCauses: [{cause: "The Podman connection list or machine list is misconfigured.", confidence: "medium"}],
      fixes: [{description: "Run 'podman system connection list' and 'podman machine list' manually to inspect state."}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "infrastructure.socket-context",
    "Socket and context state",
    "Podman connection and machine state were captured for follow-up evidence.",
    [connectionResult.stdout.trim(), machineResult.stdout.trim()].filter((entry) => entry !== ""),
  );
}

function skipBackendDependentChecks(reasonSuffix: string, reason: readonly string[]): readonly DiagnosticResult[] {
  return [
    skipDiagnostic("infrastructure.backend", "Container backend", `Backend check was skipped because ${reasonSuffix}.`, reason),
    skipDiagnostic("infrastructure.compose", "Compose provider", `Compose check was skipped because ${reasonSuffix}.`, reason),
    skipDiagnostic(
      "infrastructure.docker-conflict",
      "Docker Desktop conflict",
      `Docker Desktop conflict check was skipped because ${reasonSuffix}.`,
      reason,
    ),
    skipDiagnostic(
      "infrastructure.socket-context",
      "Socket and context state",
      `Socket/context check was skipped because ${reasonSuffix}.`,
      reason,
    ),
  ];
}

/**
 * Normalizes Docker's single comma-joined `Names` string or Podman's `Names` string array into a
 * flat list of container names, tolerating malformed/mixed entries.
 *
 * @param value - Raw `Names` field from one parsed `ps -a --format {{json .}}` JSON line.
 * @returns The normalized name list, or `null` when the field is neither a string nor an array.
 */
function normalizeContainerNames(value: unknown): readonly string[] | null {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name !== "");
  }

  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }

  return null;
}

/**
 * Extracts distinct host ports from Docker's single human-readable `Ports` string
 * (for example `"0.0.0.0:3000->3000/tcp, :::3000->3000/tcp"`).
 *
 * @param ports - Raw Docker `Ports` string.
 * @returns Distinct host ports found in the string.
 */
function parseDockerPortsString(ports: string): readonly number[] {
  const found = new Set<number>();
  for (const match of ports.matchAll(/:(\d+)->\d+\/(?:tcp|udp)/gu)) {
    const port = Number(match[1]);
    if (Number.isSafeInteger(port)) {
      found.add(port);
    }
  }
  return [...found];
}

/**
 * Extracts distinct host ports from Podman's `Ports` array of port-mapping objects
 * (for example `{"host_ip":"0.0.0.0","container_port":3000,"host_port":3000,"protocol":"tcp"}`).
 *
 * @param ports - Raw Podman `Ports` array.
 * @returns Distinct host ports found across the array's `host_port` fields.
 */
function parsePodmanPortsArray(ports: readonly unknown[]): readonly number[] {
  const found = new Set<number>();
  for (const entry of ports) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const record = entry as Readonly<Record<string, unknown>>;
    const hostPort = Number(record["host_port"]);
    if (Number.isSafeInteger(hostPort)) {
      found.add(hostPort);
    }
  }
  return [...found];
}

function parseContainerListLine(line: string): ParsedContainerRecord | null {
  const trimmed = line.trim();
  if (trimmed === "") {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const record = parsed as Readonly<Record<string, unknown>>;
    const state = record["State"];
    if (typeof state !== "string") {
      return null;
    }

    const names = normalizeContainerNames(record["Names"]);
    if (names === null) {
      return null;
    }

    const rawStatus = record["Status"];
    const status = typeof rawStatus === "string" ? rawStatus : "";

    const rawPorts = record["Ports"];
    const hostPorts =
      typeof rawPorts === "string"
        ? parseDockerPortsString(rawPorts)
        : Array.isArray(rawPorts)
          ? parsePodmanPortsArray(rawPorts)
          : [];

    return {names, state, status, hostPorts};
  } catch {
    return null;
  }
}

function parseContainerList(stdout: string): readonly ParsedContainerRecord[] {
  return stdout
    .split(/\r?\n/u)
    .map((line) => parseContainerListLine(line))
    .filter((record): record is ParsedContainerRecord => record !== null);
}

function isKnownContainerRecord(record: Readonly<ParsedContainerRecord>): boolean {
  return record.names.some((name) => KNOWN_LOCAL_CONTAINER_NAMES.includes(name));
}

function knownContainerHostPorts(records: readonly ParsedContainerRecord[]): ReadonlySet<number> {
  const ports = new Set<number>();
  for (const record of records) {
    if (!isKnownContainerRecord(record)) {
      continue;
    }
    for (const port of record.hostPorts) {
      ports.add(port);
    }
  }
  return ports;
}

function parseWindowsPortOwners(stdout: string): readonly Omit<PortOwner, "processName" | "commandLine">[] {
  const trimmed = stdout.trim();
  if (trimmed === "") {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    const entries = Array.isArray(parsed) ? parsed : [parsed];
    const owners: Omit<PortOwner, "processName" | "commandLine">[] = [];
    for (const entry of entries) {
      if (typeof entry !== "object" || entry === null) {
        continue;
      }
      const record = entry as Readonly<Record<string, unknown>>;
      const port = Number(record["LocalPort"]);
      if (!Number.isSafeInteger(port)) {
        continue;
      }
      const pid = Number(record["OwningProcess"]);
      owners.push({port, ...(Number.isSafeInteger(pid) ? {pid} : {})});
    }
    return owners;
  } catch {
    return [];
  }
}

function parseWindowsProcessList(stdout: string): ReadonlyMap<number, Readonly<{processName?: string; commandLine?: string}>> {
  const trimmed = stdout.trim();
  const byPid = new Map<number, Readonly<{processName?: string; commandLine?: string}>>();
  if (trimmed === "") {
    return byPid;
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    const entries = Array.isArray(parsed) ? parsed : [parsed];
    for (const entry of entries) {
      if (typeof entry !== "object" || entry === null) {
        continue;
      }
      const record = entry as Readonly<Record<string, unknown>>;
      const pid = Number(record["Id"]);
      if (!Number.isSafeInteger(pid)) {
        continue;
      }
      const processName = record["ProcessName"];
      const path = record["Path"];
      byPid.set(pid, {
        ...(typeof processName === "string" ? {processName} : {}),
        ...(typeof path === "string" ? {commandLine: path} : {}),
      });
    }
  } catch {
    // A malformed process inventory is represented as an empty lookup.
  }
  return byPid;
}

function parseMacPortOwners(stdout: string): readonly PortOwner[] {
  const owners: PortOwner[] = [];
  let pid: number | undefined;
  let processName: string | undefined;

  for (const rawLine of stdout.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line.startsWith("p")) {
      const parsedPid = Number(line.slice(1));
      pid = Number.isSafeInteger(parsedPid) ? parsedPid : undefined;
      processName = undefined;
    } else if (line.startsWith("c")) {
      processName = line.slice(1);
    } else if (line.startsWith("n")) {
      const match = /:(\d+)$/u.exec(line);
      const port = match?.[1] === undefined ? undefined : Number(match[1]);
      if (port !== undefined && Number.isSafeInteger(port)) {
        owners.push({
          port,
          ...(pid === undefined ? {} : {pid}),
          ...(processName === undefined ? {} : {processName}),
        });
      }
    }
  }

  return owners;
}

function parseLinuxPortOwners(stdout: string): readonly PortOwner[] {
  const owners: PortOwner[] = [];
  for (const rawLine of stdout.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line === "" || !line.toUpperCase().startsWith("LISTEN")) {
      continue;
    }
    const portMatch = /:(\d+)\s/u.exec(line);
    const port = portMatch?.[1] === undefined ? undefined : Number(portMatch[1]);
    if (port === undefined || !Number.isSafeInteger(port)) {
      continue;
    }
    const userMatch = /users:\(\("([^"]+)",pid=(\d+)/u.exec(line);
    const processName = userMatch?.[1];
    const pid = userMatch?.[2] === undefined ? undefined : Number(userMatch[2]);
    owners.push({
      port,
      ...(pid !== undefined && Number.isSafeInteger(pid) ? {pid} : {}),
      ...(processName === undefined ? {} : {processName}),
    });
  }
  return owners;
}

async function collectPortOwners(
  context: Readonly<DoctorContext>,
  command: Readonly<CommandSpec>,
): Promise<{readonly owners: readonly PortOwner[]; readonly probeResult: CommandResult}> {
  const probeResult = await context.runner.run(command, {cwd: context.paths.root, timeoutMs: DIAGNOSTIC_DEFAULT_TIMEOUT_MS});
  if (!isAcceptablePortProbeResult(context.platform, probeResult)) {
    return {owners: [], probeResult};
  }

  if (context.platform === "win32") {
    const partialOwners = parseWindowsPortOwners(probeResult.stdout);
    if (partialOwners.length === 0) {
      return {owners: [], probeResult};
    }

    const processListResult = await context.runner.run(WINDOWS_PROCESS_PROBE_COMMAND, {
      cwd: context.paths.root,
      timeoutMs: DIAGNOSTIC_DEFAULT_TIMEOUT_MS,
    });
    const byPid = isSuccessfulCommand(processListResult) ? parseWindowsProcessList(processListResult.stdout) : new Map();
    const owners = partialOwners.map((owner) => ({
      ...owner,
      ...(owner.pid === undefined ? {} : byPid.get(owner.pid)),
    }));
    return {owners, probeResult};
  }

  if (context.platform === "darwin") {
    return {owners: parseMacPortOwners(probeResult.stdout), probeResult};
  }

  return {owners: parseLinuxPortOwners(probeResult.stdout), probeResult};
}

function describePortOwner(owner: Readonly<PortOwner>): string {
  const identity = [
    owner.processName === undefined ? undefined : owner.processName,
    owner.pid === undefined ? undefined : `PID ${String(owner.pid)}`,
  ].filter((entry): entry is string => entry !== undefined);
  return `Port ${String(owner.port)} is owned by ${identity.length > 0 ? identity.join(" ") : "an unidentified process"}.`;
}

async function diagnosePorts(
  context: Readonly<DoctorContext>,
  knownContainers: readonly ParsedContainerRecord[] | null,
): Promise<DiagnosticResult> {
  if (context.options.ci) {
    return skipDiagnostic(
      "infrastructure.ports",
      "Required local ports",
      "Port ownership inspection was skipped under CI.",
      ["--ci intentionally skips host-local port inspection."],
    );
  }

  const startedAt = context.now();
  const command = buildPortOwnerProbe(context.platform, [...requiredLocalPorts]);
  if (command === null) {
    return skipDiagnostic(
      "infrastructure.ports",
      "Required local ports",
      "Port ownership inspection is not supported on this platform.",
      [`Unsupported diagnostic platform: ${context.platform}.`],
    );
  }

  const {owners, probeResult} = await collectPortOwners(context, command);

  if (!isAcceptablePortProbeResult(context.platform, probeResult)) {
    return issueDiagnostic(context, startedAt, {
      id: "infrastructure.ports",
      name: "Required local ports",
      status: "warn",
      summary: "Required local ports could not be inspected.",
      evidence: commandEvidence(probeResult),
      potentialCauses: [
        {cause: "The port inspection command requires elevated permissions.", confidence: "medium"},
        {cause: "The port inspection tool is unavailable on this host.", confidence: "medium"},
      ],
      fixes: [{description: "Re-run doctor with sufficient permissions to inspect listening ports."}],
    });
  }

  if (owners.length === 0) {
    return passDiagnostic(
      context,
      startedAt,
      "infrastructure.ports",
      "Required local ports",
      "All required local ports are free.",
      [`Inspected ports: ${requiredLocalPorts.join(", ")}.`],
    );
  }

  const knownPorts = knownContainers === null ? new Set<number>() : knownContainerHostPorts(knownContainers);
  const unrelatedOwners = owners.filter((owner) => !knownPorts.has(owner.port));

  if (unrelatedOwners.length === 0) {
    return issueDiagnostic(context, startedAt, {
      id: "infrastructure.ports",
      name: "Required local ports",
      status: "warn",
      summary: "Required local ports are already occupied by the known local stack.",
      evidence: owners.map((owner) => describePortOwner(owner)),
      rootCause: "The local selfhost stack is already running and occupying required ports.",
      fixes: [{description: "Reuse the already-running local stack, or stop it before starting a new instance."}],
    });
  }

  return issueDiagnostic(context, startedAt, {
    id: "infrastructure.ports",
    name: "Required local ports",
    status: "fail",
    summary: "One or more required local ports are occupied by an unrelated process.",
    evidence: unrelatedOwners.map((owner) => describePortOwner(owner)),
    potentialCauses: unrelatedOwners.map((owner) => ({
      cause: describePortOwner(owner),
      confidence: owner.pid === undefined ? ("low" as const) : ("high" as const),
    })),
    fixes: [{description: "Stop the process occupying the required port, or free it before starting the local stack."}],
  });
}

async function diagnoseCertificates(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  if (context.options.ci) {
    return skipDiagnostic(
      "infrastructure.certificates",
      "Selfhost TLS certificates",
      "Certificate inspection was skipped under CI.",
      ["--ci intentionally skips host-local certificate inspection."],
    );
  }

  const startedAt = context.now();
  const certificatePath = resolve(context.paths.root, ...CERTIFICATE_RELATIVE_PATH);
  const keyPath = resolve(context.paths.root, ...KEY_RELATIVE_PATH);

  const [certificateExists, keyExists] = await Promise.all([
    access(certificatePath, fsConstants.R_OK).then(
      () => true,
      () => false,
    ),
    access(keyPath, fsConstants.R_OK).then(
      () => true,
      () => false,
    ),
  ]);

  if (!certificateExists || !keyExists) {
    const missing = [
      ...(certificateExists ? [] : [certificatePath]),
      ...(keyExists ? [] : [keyPath]),
    ];
    return issueDiagnostic(context, startedAt, {
      id: "infrastructure.certificates",
      name: "Selfhost TLS certificates",
      status: "warn",
      summary: "One or more selfhost TLS certificate files are missing.",
      evidence: missing.map((path) => `Missing file: ${path}`),
      rootCause: "The local selfhost TLS certificate or key file has not been generated yet.",
      fixes: [{description: "Generate local selfhost TLS certificates.", command: "npm run setup"}],
    });
  }

  const evidence = [`Certificate present: ${certificatePath}`, `Key present: ${keyPath}`];
  const mkcertVersion = await context.runner.run(MKCERT_VERSION_COMMAND, {cwd: context.paths.root, timeoutMs: DIAGNOSTIC_DEFAULT_TIMEOUT_MS});
  if (isSuccessfulCommand(mkcertVersion)) {
    evidence.push(`mkcert available: ${mkcertVersion.stdout.trim()}`);
    const caRoot = await context.runner.run(MKCERT_CAROOT_COMMAND, {cwd: context.paths.root, timeoutMs: DIAGNOSTIC_DEFAULT_TIMEOUT_MS});
    if (isSuccessfulCommand(caRoot)) {
      evidence.push(`mkcert CA root: ${caRoot.stdout.trim()}`);
    }
  } else {
    evidence.push("mkcert is not installed; skipping bounded CA root inspection.");
  }

  return passDiagnostic(
    context,
    startedAt,
    "infrastructure.certificates",
    "Selfhost TLS certificates",
    "Selfhost TLS certificate and key files are present.",
    evidence,
  );
}

async function diagnoseManifests(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.now();
  const results = await Promise.all(
    REQUIRED_MANIFEST_RELATIVE_PATHS.map(async (segments) => {
      const path = resolve(context.paths.root, ...segments);
      const exists = await access(path, fsConstants.R_OK).then(
        () => true,
        () => false,
      );
      return {path, exists};
    }),
  );

  const missing = results.filter((result) => !result.exists);
  if (missing.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "infrastructure.manifests",
      name: "Required runtime manifests",
      status: "fail",
      summary: "One or more required runtime manifests are missing.",
      evidence: missing.map((result) => `Missing file: ${result.path}`),
      rootCause: "A required AppHost or Compose manifest is missing from the repository.",
      fixes: [{description: "Restore the missing runtime manifest from version control."}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "infrastructure.manifests",
    "Required runtime manifests",
    "All required runtime manifests are present.",
    results.map((result) => result.path),
  );
}

async function diagnoseContainers(
  context: Readonly<DoctorContext>,
  containerListResult: CommandResult | null,
): Promise<{readonly diagnostic: DiagnosticResult; readonly records: readonly ParsedContainerRecord[] | null}> {
  if (context.options.ci) {
    return {
      diagnostic: skipDiagnostic(
        "infrastructure.containers",
        "Known local containers",
        "Container inventory inspection was skipped under CI.",
        ["--ci intentionally skips host-local container inspection."],
      ),
      records: null,
    };
  }

  const startedAt = context.now();
  if (containerListResult === null) {
    return {
      diagnostic: skipDiagnostic(
        "infrastructure.containers",
        "Known local containers",
        "Container inventory inspection was skipped because the container CLI is unavailable.",
        ["No container listing was captured."],
      ),
      records: null,
    };
  }

  if (!isSuccessfulCommand(containerListResult)) {
    return {
      diagnostic: issueDiagnostic(context, startedAt, {
        id: "infrastructure.containers",
        name: "Known local containers",
        status: "warn",
        summary: "Known local container state could not be listed.",
        evidence: commandEvidence(containerListResult),
        potentialCauses: [{cause: "The container backend did not respond to the listing command.", confidence: "medium"}],
        fixes: [{description: "Confirm the container backend is running, then rerun doctor."}],
      }),
      records: null,
    };
  }

  const records = parseContainerList(containerListResult.stdout);
  const knownRecords = records.filter((record) => isKnownContainerRecord(record));

  if (knownRecords.length === 0) {
    return {
      diagnostic: passDiagnostic(
        context,
        startedAt,
        "infrastructure.containers",
        "Known local containers",
        "No known local containers are present.",
        ["No known selfhost containers were found."],
      ),
      records,
    };
  }

  const staleRecords = knownRecords.filter((record) => record.state.toLowerCase() !== "running");
  if (staleRecords.length > 0) {
    return {
      diagnostic: issueDiagnostic(context, startedAt, {
        id: "infrastructure.containers",
        name: "Known local containers",
        status: "warn",
        summary: "One or more known local containers exist but are not running.",
        evidence: staleRecords.map((record) => `${record.names.join(",")}: ${record.state}`),
        rootCause: "A known local container exists in a stopped or stale state.",
        fixes: [{description: "Start, remove, or recreate the stale local container using the selfhost tooling."}],
      }),
      records,
    };
  }

  // A container reporting `State: running` can still be unhealthy: Docker/Podman surface health
  // check evidence through the `Status` field (for example `"Up 3 hours (unhealthy)"`), which is
  // materially different information than `State` and must never be inferred by mirroring
  // `State`. A running-but-unhealthy known container must not PASS.
  const unhealthyRecords = knownRecords.filter(
    (record) => record.state.toLowerCase() === "running" && /unhealthy/iu.test(record.status),
  );
  if (unhealthyRecords.length > 0) {
    return {
      diagnostic: issueDiagnostic(context, startedAt, {
        id: "infrastructure.containers",
        name: "Known local containers",
        status: "warn",
        summary: "One or more known local containers are running but report an unhealthy status.",
        evidence: unhealthyRecords.map((record) => `${record.names.join(",")}: ${record.status}`),
        rootCause: "A known local container's health check is reporting an unhealthy status.",
        fixes: [{description: "Inspect the unhealthy local container's logs and restart it using the selfhost tooling."}],
      }),
      records,
    };
  }

  return {
    diagnostic: passDiagnostic(
      context,
      startedAt,
      "infrastructure.containers",
      "Known local containers",
      "All known local containers are running.",
      knownRecords.map((record) => `${record.names.join(",")}: ${record.state}`),
    ),
    records,
  };
}

/** Read-only local container runtime, port, certificate, and manifest diagnostics module. */
export const infrastructureDoctorModule: DiagnosticModule = {
  id: "infrastructure",
  title: "Infrastructure",
  async run(context): Promise<readonly DiagnosticResult[]> {
    const selectionOutcome = await diagnoseSelection(context);
    const results: DiagnosticResult[] = [selectionOutcome.diagnostic];

    if (selectionOutcome.selection === null) {
      const reason = [selectionOutcome.diagnostic.summary];
      results.push(skipDiagnostic("infrastructure.cli", "Container CLI", "Container CLI check was skipped because engine selection failed.", reason));
      results.push(...skipBackendDependentChecks("engine selection failed", reason));
      results.push(await diagnosePorts(context, null));
      results.push(await diagnoseCertificates(context));
      results.push(await diagnoseManifests(context));
      results.push(
        skipDiagnostic("infrastructure.containers", "Known local containers", "Container inventory check was skipped because engine selection failed.", reason),
      );
      return results;
    }

    const {engine} = selectionOutcome.selection;
    const cliOutcome = await diagnoseCli(context, engine);
    results.push(cliOutcome.diagnostic);

    if (cliOutcome.result === null) {
      const reason = [cliOutcome.diagnostic.summary];
      results.push(...skipBackendDependentChecks("the container CLI is unavailable", reason));
      results.push(await diagnosePorts(context, null));
      results.push(await diagnoseCertificates(context));
      results.push(await diagnoseManifests(context));
      results.push(
        skipDiagnostic(
          "infrastructure.containers",
          "Known local containers",
          "Container inventory check was skipped because the container CLI is unavailable.",
          reason,
        ),
      );
      return results;
    }

    const cli = cliOutcome.result;
    const backendOutcome = await diagnoseBackend(context, engine, cli);
    results.push(backendOutcome.diagnostic);

    const composeOutcome = await diagnoseCompose(context, engine, cli);
    results.push(composeOutcome.diagnostic);

    const backendOk = backendOutcome.diagnostic.status === "pass";
    const composeOk = composeOutcome.diagnostic.status === "pass";
    const followUpTriggered = !backendOk || !composeOk || context.options.verbose;

    results.push(
      await diagnoseDockerConflict(context, engine, cli, backendOutcome.result, composeOutcome.result, followUpTriggered),
    );
    results.push(await diagnoseSocketContext(context, engine, followUpTriggered));

    const containerListCommand = engine === "rancher" ? DOCKER_PS_COMMAND : PODMAN_PS_COMMAND;
    const containerListResult = context.options.ci
      ? null
      : await context.runner.run(containerListCommand, {cwd: context.paths.root, timeoutMs: DIAGNOSTIC_DEFAULT_TIMEOUT_MS});

    results.push(await diagnosePorts(context, containerListResult === null ? null : parseContainerList(containerListResult.stdout)));
    results.push(await diagnoseCertificates(context));
    results.push(await diagnoseManifests(context));

    const containersOutcome = await diagnoseContainers(context, containerListResult);
    results.push(containersOutcome.diagnostic);

    return results;
  },
};
