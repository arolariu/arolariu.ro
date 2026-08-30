/**
 * @fileoverview Shared contracts, helpers, and read-only command policy for modular doctor diagnostics.
 * @module scripts/doctor.types
 */

import {formatCommand, type CommandResult, type CommandRunner, type CommandRunOptions, type CommandSpec} from "./common/process.ts";
import type {MonorepositoryLogger} from "./common/logger.ts";
import type {RepositoryPaths} from "./common/repository-paths.ts";
import type {RequirementLoadResult} from "./common/requirements.ts";

/** One bounded timeout applied to diagnostic commands that do not supply one explicitly. */
export const DIAGNOSTIC_DEFAULT_TIMEOUT_MS = 15_000;

/** Fixed Python metadata probe consumed by later doctor modules. */
export const PYTHON_INTERPRETER_METADATA_SNIPPET = [
  "import json",
  "import platform",
  "import site",
  "import sys",
  "print(json.dumps({",
  "  'executable': sys.executable,",
  "  'version': platform.python_version(),",
  "  'prefix': sys.prefix,",
  "  'basePrefix': getattr(sys, 'base_prefix', sys.prefix),",
  "  'sitePackages': site.getsitepackages(),",
  "}, separators=(',', ':')))",
].join("; ");

const WINDOWS_PROBE_SHELL = ["-NoProfile", "-NonInteractive", "-Command"] as const;
const WINDOWS_DISK_PROBE_SCRIPT =
  "Get-CimInstance Win32_LogicalDisk -Filter \"DriveType = 3\" | Select-Object DeviceID, Size, FreeSpace | ConvertTo-Json -Compress";
const WINDOWS_PORTS_PROBE_SCRIPT =
  "Get-NetTCPConnection -State Listen -ErrorAction Stop | Select-Object LocalAddress, LocalPort, State, OwningProcess | ConvertTo-Json -Compress";
const WINDOWS_PROCESS_PROBE_SCRIPT =
  "Get-Process | Select-Object Id, ProcessName, Path | ConvertTo-Json -Compress";
const WINDOWS_PORT_OWNER_PROBE_SCRIPT = [
  "$ports = @($args[0] -split ',');",
  "foreach ($port in $ports) {",
  "Get-NetTCPConnection -State Listen -LocalPort ([int]$port) -ErrorAction Stop | Select-Object LocalAddress, LocalPort, OwningProcess",
  "} | ConvertTo-Json -Compress",
].join(" ");
const MACOS_PORT_OWNER_PROBE_SCRIPT = 'for port in "$@"; do lsof -nP -a -iTCP:"$port" -sTCP:LISTEN -Fpcn; done';
const LINUX_PORT_OWNER_PROBE_SCRIPT = 'for port in "$@"; do ss -ltnp "sport = :$port"; done';
const SAFE_EXECUTABLE_NAME = /^[A-Za-z0-9._-]+(?:\.exe)?$/u;
const DECIMAL_PORT = /^(?:0|[1-9]\d{0,4})$/u;
const DECIMAL_PORT_LIST = /^(?:0|[1-9]\d{0,4})(?:,(?:0|[1-9]\d{0,4}))*$/u;

/** Describes the outcome classification of one diagnostic check. */
export type DiagnosticStatus = "pass" | "warn" | "fail" | "skipped";

/** Classifies the certainty of an inferred root or contributing cause. */
export type DiagnosticConfidence = "high" | "medium" | "low";

/** Identifies the stable bounded-context owner of one diagnostic row. */
export type DiagnosticModuleId =
  | "workspace"
  | "dotnet"
  | "react"
  | "svelte"
  | "python"
  | "infrastructure";

/** One possible contributor to a diagnostic outcome. */
export interface DiagnosticPotentialCause {
  readonly cause: string;
  readonly confidence: DiagnosticConfidence;
}

/** One actionable remediation for a diagnostic outcome. */
export interface DiagnosticFix {
  readonly description: string;
  readonly command?: string;
}

/** One stable doctor result row. */
export interface DiagnosticResult {
  readonly id: string;
  readonly module: DiagnosticModuleId;
  readonly name: string;
  readonly status: DiagnosticStatus;
  readonly summary: string;
  readonly evidence: readonly string[];
  readonly rootCause?: string;
  readonly potentialCauses: readonly DiagnosticPotentialCause[];
  readonly fixes: readonly DiagnosticFix[];
  readonly durationMs: number;
}

/** Parsed doctor CLI options. */
export interface DoctorOptions {
  readonly verbose: boolean;
  readonly ci: boolean;
  readonly score: boolean;
  readonly json: boolean;
  readonly quick: boolean;
  readonly help: boolean;
}

/** Totals by result status. */
export interface DoctorSummary {
  readonly passed: number;
  readonly warnings: number;
  readonly failed: number;
  readonly skipped: number;
}

/** Version 1 doctor report payload. */
export interface DoctorReportV1 {
  readonly schemaVersion: 1;
  readonly score: number;
  readonly grade: string;
  readonly summary: DoctorSummary;
  readonly checks: readonly DiagnosticResult[];
  readonly timestamp: string;
}

/** Read-only command runner contract exposed to doctor modules. */
export interface DiagnosticCommandRunner {
  readonly run: (
    command: Readonly<CommandSpec>,
    options?: Readonly<
      Pick<CommandRunOptions, "cwd" | "env" | "timeoutMs" | "signal">
    >,
  ) => Promise<CommandResult>;
}

/** One network reachability probe outcome. */
export interface DiagnosticNetworkResult {
  readonly status: "reachable" | "unavailable" | "error";
  readonly statusCode?: number;
  readonly durationMs: number;
  readonly error?: string;
}

/** Read-only HTTP probe contract for doctor modules. */
export interface DiagnosticNetworkProbe {
  readonly get: (
    url: URL,
    timeoutMs: number,
  ) => Promise<DiagnosticNetworkResult>;
}

/** Shared module execution context for one doctor run. */
export interface DoctorContext {
  readonly options: DoctorOptions;
  readonly paths: RepositoryPaths;
  readonly requirements: RequirementLoadResult;
  readonly runner: DiagnosticCommandRunner;
  readonly network: DiagnosticNetworkProbe;
  readonly logger: MonorepositoryLogger;
  readonly platform: NodeJS.Platform;
  readonly arch: string;
  readonly env: Readonly<NodeJS.ProcessEnv>;
  readonly now: () => number;
}

/** One stable doctor module implementation. */
export interface DiagnosticModule {
  readonly id: DiagnosticModuleId;
  readonly title: string;
  readonly run: (
    context: Readonly<DoctorContext>,
  ) => Promise<readonly DiagnosticResult[]>;
}

/** Reports a diagnostic policy violation before any external command runs. */
export class DiagnosticPolicyError extends Error {
  /**
   * Creates a command-policy error.
   *
   * @param message - Human-readable policy detail.
   */
  public constructor(message: string) {
    super(message);
    this.name = "DiagnosticPolicyError";
  }
}

function hasExactArguments(args: readonly string[], expected: readonly string[]): boolean {
  return args.length === expected.length && expected.every((value, index) => args[index] === value);
}

function normalizedCommandName(command: string): string {
  const segments = command.split(/[\\/]/u);
  return (segments.at(-1) ?? command).toLowerCase();
}

function isSafeExecutableArgument(value: string): boolean {
  return SAFE_EXECUTABLE_NAME.test(value);
}

function isDecimalPort(value: string): boolean {
  if (!DECIMAL_PORT.test(value)) {
    return false;
  }

  const port = Number(value);
  return Number.isSafeInteger(port) && port > 0 && port <= 65_535;
}

function areDecimalPorts(values: readonly string[]): boolean {
  return values.length > 0 && values.every(isDecimalPort);
}

function isDotnetUserSecretsList(args: readonly string[]): boolean {
  return (
    hasExactArguments(args, ["user-secrets", "list"])
    || (args.length === 4
      && args[0] === "user-secrets"
      && args[1] === "list"
      && (args[2] === "--project" || args[2] === "-p")
      && args[3] !== undefined
      && args[3].trim().length > 0)
    || (args.length === 5
      && args[0] === "user-secrets"
      && args[1] === "list"
      && args[2] === "--json"
      && (args[3] === "--project" || args[3] === "-p")
      && args[4] !== undefined
      && args[4].trim().length > 0)
  );
}

function isPythonCommand(command: string): boolean {
  const name = normalizedCommandName(command);
  return name === "py" || /^python(?:\d+(?:\.\d+)?)?(?:\.exe)?$/iu.test(name);
}

function getPythonPrefixLength(command: string, args: readonly string[]): number | null {
  if (!isPythonCommand(command)) {
    return null;
  }

  if (normalizedCommandName(command) === "py") {
    return args[0] === "-3.12" ? 1 : null;
  }

  return 0;
}

function isPythonInvocation(command: Readonly<CommandSpec>, tail: readonly string[]): boolean {
  const prefixLength = getPythonPrefixLength(command.command, command.args);
  return prefixLength !== null && hasExactArguments(command.args.slice(prefixLength), tail);
}

function isWindowsProbe(command: Readonly<CommandSpec>, script: string): boolean {
  return normalizedCommandName(command.command) === "powershell"
    && hasExactArguments(command.args, [...WINDOWS_PROBE_SHELL, script]);
}

function isWindowsPortOwnerProbe(command: Readonly<CommandSpec>): boolean {
  return (
    normalizedCommandName(command.command) === "powershell"
    && command.args.length === WINDOWS_PROBE_SHELL.length + 2
    && hasExactArguments(command.args.slice(0, WINDOWS_PROBE_SHELL.length), WINDOWS_PROBE_SHELL)
    && command.args[3] === WINDOWS_PORT_OWNER_PROBE_SCRIPT
    && command.args[4] !== undefined
    && DECIMAL_PORT_LIST.test(command.args[4])
    && command.args[4].split(",").every(isDecimalPort)
  );
}

function isPosixPortOwnerProbe(command: Readonly<CommandSpec>): boolean {
  const script = command.args[1];
  return (
    normalizedCommandName(command.command) === "sh"
    && command.args.length >= 4
    && command.args[0] === "-c"
    && (script === MACOS_PORT_OWNER_PROBE_SCRIPT || script === LINUX_PORT_OWNER_PROBE_SCRIPT)
    && command.args[2] === "--"
    && areDecimalPorts(command.args.slice(3))
  );
}

/**
 * Creates the shared dynamic port-owner probe for one platform.
 *
 * @param platform - Target runtime platform.
 * @param ports - Decimal TCP ports to inspect.
 * @returns An exact command specification accepted by the read-only policy.
 * @throws DiagnosticPolicyError when any requested port is invalid.
 */
export function createPortOwnerProbeCommand(platform: NodeJS.Platform, ports: readonly number[]): Readonly<CommandSpec> {
  if (ports.length === 0) {
    throw new DiagnosticPolicyError("Port ownership probes require at least one port.");
  }

  const normalizedPorts = ports.map((port) => {
    if (!Number.isSafeInteger(port) || port <= 0 || port > 65_535) {
      throw new DiagnosticPolicyError(`Invalid diagnostic port '${String(port)}'.`);
    }

    return String(port);
  });

  if (platform === "win32") {
    return {
      command: "powershell",
      args: [...WINDOWS_PROBE_SHELL, WINDOWS_PORT_OWNER_PROBE_SCRIPT, normalizedPorts.join(",")],
    };
  }

  return {
    command: "sh",
    args: [
      "-c",
      platform === "darwin" ? MACOS_PORT_OWNER_PROBE_SCRIPT : LINUX_PORT_OWNER_PROBE_SCRIPT,
      "--",
      ...normalizedPorts,
    ],
  };
}

/**
 * Determines whether a command is approved for read-only diagnostics.
 *
 * @param command - Command specification to validate.
 * @returns Whether the command is read-only and policy-approved.
 */
export function isReadOnlyDiagnosticCommand(command: Readonly<CommandSpec>): boolean {
  const name = normalizedCommandName(command.command);

  switch (name) {
    case "node":
      return hasExactArguments(command.args, ["--version"]);
    case "npm":
      return (
        hasExactArguments(command.args, ["--version"])
        || hasExactArguments(command.args, ["ls"])
        || hasExactArguments(command.args, ["ls", "--json"])
        || hasExactArguments(command.args, ["ls", "--all", "--json"])
        || hasExactArguments(command.args, ["audit", "--json"])
        || hasExactArguments(command.args, ["outdated", "--json"])
        || hasExactArguments(command.args, ["config", "get", "cache"])
      );
    case "npx":
      return (
        hasExactArguments(command.args, ["--no-install", "nx", "show", "projects", "--json"])
        || hasExactArguments(command.args, ["--no-install", "nx", "graph", "--print", "--open=false", "--watch=false"])
        || hasExactArguments(command.args, ["--no-install", "playwright", "install", "--list"])
      );
    case "git":
      return (
        hasExactArguments(command.args, ["--version"])
        || hasExactArguments(command.args, ["status", "--short"])
        || hasExactArguments(command.args, ["status", "--short", "--branch"])
        || hasExactArguments(command.args, ["log", "--oneline", "-1", "HEAD"])
        || hasExactArguments(command.args, ["rev-parse", "--show-toplevel"])
        || hasExactArguments(command.args, ["rev-parse", "HEAD"])
      );
    case "dotnet":
      return (
        hasExactArguments(command.args, ["--version"])
        || hasExactArguments(command.args, ["--info"])
        || hasExactArguments(command.args, ["--list-sdks"])
        || hasExactArguments(command.args, ["--list-runtimes"])
        || hasExactArguments(command.args, ["workload", "list"])
        || hasExactArguments(command.args, ["tool", "list", "--local"])
        || hasExactArguments(command.args, ["tool", "list", "--global"])
        || hasExactArguments(command.args, ["nuget", "list", "source"])
        || hasExactArguments(command.args, ["nuget", "locals", "global-packages", "--list"])
        || isDotnetUserSecretsList(command.args)
        || hasExactArguments(command.args, ["dev-certs", "https", "--check"])
        || hasExactArguments(command.args, ["dev-certs", "https", "--check", "--trust"])
      );
    case "docker":
      return (
        hasExactArguments(command.args, ["--version"])
        || hasExactArguments(command.args, ["version"])
        || hasExactArguments(command.args, ["info"])
        || hasExactArguments(command.args, ["info", "--format", "{{json .}}"])
        || hasExactArguments(command.args, ["context", "show"])
        || hasExactArguments(command.args, ["compose", "version"])
        || hasExactArguments(command.args, ["ps", "-a", "--format", "{{json .}}"])
      );
    case "podman":
      return (
        hasExactArguments(command.args, ["--version"])
        || hasExactArguments(command.args, ["info", "--format", "json"])
        || hasExactArguments(command.args, ["system", "connection", "list", "--format", "json"])
        || hasExactArguments(command.args, ["machine", "list", "--format", "json"])
        || hasExactArguments(command.args, ["compose", "version"])
        || hasExactArguments(command.args, ["ps", "-a", "--format", "{{json .}}"])
      );
    case "mkcert":
      return hasExactArguments(command.args, ["--version"]) || hasExactArguments(command.args, ["-CAROOT"]);
    case "df":
      return hasExactArguments(command.args, ["-Pk"]);
    case "lsof":
      return hasExactArguments(command.args, ["-nP", "-iTCP", "-sTCP:LISTEN"]);
    case "ps":
      return hasExactArguments(command.args, ["-eo", "pid=,comm="]);
    case "which":
    case "where.exe":
      return command.args.length === 1 && command.args[0] !== undefined && isSafeExecutableArgument(command.args[0]);
    case "powershell":
      return (
        isWindowsProbe(command, WINDOWS_DISK_PROBE_SCRIPT)
        || isWindowsProbe(command, WINDOWS_PORTS_PROBE_SCRIPT)
        || isWindowsProbe(command, WINDOWS_PROCESS_PROBE_SCRIPT)
        || isWindowsPortOwnerProbe(command)
      );
    case "sh":
      return isPosixPortOwnerProbe(command);
    default:
      return (
        isPythonInvocation(command, ["--version"])
        || isPythonInvocation(command, ["-c", PYTHON_INTERPRETER_METADATA_SNIPPET])
        || isPythonInvocation(command, ["-m", "pip", "--version"])
        || isPythonInvocation(command, ["-m", "pip", "list", "--format", "json"])
        || isPythonInvocation(command, ["-m", "pip", "check"])
      );
  }
}

/**
 * Creates a read-only diagnostic runner wrapper over the shared process runner.
 *
 * @param runner - Underlying process runner.
 * @returns A runner restricted to approved read-only commands and capture mode.
 */
export function createReadOnlyDiagnosticRunner(runner: CommandRunner): DiagnosticCommandRunner {
  return {
    async run(command, options): Promise<CommandResult> {
      if (!isReadOnlyDiagnosticCommand(command)) {
        throw new DiagnosticPolicyError(`Forbidden diagnostic command: ${formatCommand(command)}`);
      }

      const unsafeOptions = (options ?? {}) as Readonly<Record<string, unknown>>;
      if ("input" in unsafeOptions) {
        throw new DiagnosticPolicyError("Diagnostic commands cannot receive stdin input.");
      }

      const output = unsafeOptions["output"];
      if (output !== undefined && output !== "capture") {
        throw new DiagnosticPolicyError("Diagnostic commands must use captured output.");
      }

      const timeoutMs =
        typeof options?.timeoutMs === "number" && Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
          ? options.timeoutMs
          : DIAGNOSTIC_DEFAULT_TIMEOUT_MS;

      const runOptions: CommandRunOptions = {
        ...(options?.cwd === undefined ? {} : {cwd: options.cwd}),
        ...(options?.env === undefined ? {} : {env: options.env}),
        timeoutMs,
        ...(options?.signal === undefined ? {} : {signal: options.signal}),
        output: "capture",
      };

      return runner.run(command, runOptions);
    },
  };
}

/**
 * Finalizes a diagnostic row with elapsed timing metadata.
 *
 * @param result - Diagnostic fields excluding elapsed duration.
 * @param startedAt - Monotonic start timestamp.
 * @param now - Monotonic clock for duration capture.
 * @returns The completed diagnostic result.
 */
export function diagnosticResult(
  result: Omit<DiagnosticResult, "durationMs">,
  startedAt: number,
  now: () => number,
): DiagnosticResult {
  return {
    ...result,
    durationMs: Math.max(0, now() - startedAt),
  };
}

/**
 * Creates a standardized skipped diagnostic row.
 *
 * @param input - Stable skipped-diagnostic inputs.
 * @returns A completed skipped result with default empty causes and fixes.
 */
export function skippedDiagnostic(
  input: Readonly<{
    id: string;
    module: DiagnosticModuleId;
    name: string;
    summary: string;
    evidence?: readonly string[];
  }>,
): DiagnosticResult {
  return {
    id: input.id,
    module: input.module,
    name: input.name,
    status: "skipped",
    summary: input.summary,
    evidence: input.evidence ?? [],
    potentialCauses: [],
    fixes: [],
    durationMs: 0,
  };
}
