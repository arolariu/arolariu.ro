/**
 * @fileoverview Opaque, allowlisted registry of read-only observational command probes.
 * @module scripts/inspection/probes
 */

import type {CommandResult, CommandRunner, CommandSpec} from "../common/process.ts";

/**
 * Nominal brand distinguishing a registered {@link InspectionProbe} from a plain object literal.
 *
 * This symbol is declared, never defined, so it has no runtime value. No object literal outside
 * this module can structurally satisfy {@link InspectionProbe} without an explicit
 * `as unknown as InspectionProbe` type assertion, which both documents and marks the resulting
 * value as unsafe/unregistered at the type level.
 */
declare const inspectionProbeBrand: unique symbol;

/**
 * Opaque handle for one allowlisted, read-only observational command.
 *
 * The public shape exposes only a stable `id`. The underlying {@link CommandSpec} is held in a
 * module-private `WeakMap` that is never reachable from outside this module, so a probe can only
 * be executed after it was created by one of the factories exported through {@link probes}.
 */
export interface InspectionProbe {
  readonly id: string;
  readonly [inspectionProbeBrand]: true;
}

/** Options accepted by {@link InspectionProbeRunner.run}. No stdin, logger, or output-mode escape hatch is exposed. */
export interface InspectionProbeRunOptions {
  readonly cwd?: string;
  readonly env?: Readonly<NodeJS.ProcessEnv>;
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
}

/** Executes registered {@link InspectionProbe} handles through the shared command runner. */
export interface InspectionProbeRunner {
  readonly run: (probe: InspectionProbe, options?: Readonly<InspectionProbeRunOptions>) => Promise<CommandResult>;
}

/** Default timeout applied to a probe run when the caller does not supply an override. */
const DEFAULT_INSPECTION_PROBE_TIMEOUT_MS = 15_000;

/** Module-private registry mapping each opaque probe handle to its exact allowlisted command. */
const probeCommands = new WeakMap<InspectionProbe, Readonly<CommandSpec>>();

/**
 * Registers one exact, read-only command and returns its opaque handle.
 *
 * @param id - Stable, domain-qualified probe identifier.
 * @param command - Exact allowlisted command specification.
 * @returns The opaque, registered probe handle.
 */
function registerProbe(id: string, command: Readonly<CommandSpec>): InspectionProbe {
  const probe = Object.freeze({id}) as unknown as InspectionProbe;
  probeCommands.set(probe, command);
  return probe;
}

/**
 * Resolves the effective timeout for one probe run.
 *
 * @param timeoutMs - Caller-supplied override, if any.
 * @returns The default timeout, or the caller's explicitly approved positive finite override.
 * @throws Error when a supplied override is not a positive, finite number.
 */
function resolveProbeTimeoutMs(timeoutMs: number | undefined): number {
  if (timeoutMs === undefined) {
    return DEFAULT_INSPECTION_PROBE_TIMEOUT_MS;
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`Invalid inspection probe timeout '${String(timeoutMs)}': a positive, finite override is required.`);
  }
  return timeoutMs;
}

/**
 * Creates a runner that executes only previously registered {@link InspectionProbe} handles.
 *
 * The returned runner forces captured output, applies a bounded default timeout, and preserves
 * `cwd`, `env`, and `signal` unchanged. It exposes no stdin, logger, or output-mode option, and
 * always resolves the shared runner with `output: "capture"`.
 *
 * @param runner - Shared command runner used to execute the resolved command.
 * @returns An inspection probe runner backed by the shared command runner.
 */
export function createInspectionProbeRunner(runner: CommandRunner): InspectionProbeRunner {
  return {
    run: async (probe, options = {}) => {
      const command = probeCommands.get(probe);
      if (command === undefined) {
        throw new Error(`Unregistered inspection probe: '${probe.id}'.`);
      }

      const timeoutMs = resolveProbeTimeoutMs(options.timeoutMs);
      return runner.run(command, {
        ...(options.cwd === undefined ? {} : {cwd: options.cwd}),
        ...(options.env === undefined ? {} : {env: options.env}),
        ...(options.signal === undefined ? {} : {signal: options.signal}),
        timeoutMs,
        output: "capture",
      });
    },
  };
}

/** Matches C0/C1 control characters and DEL, rejected from every validated dynamic value. */
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;
/** Matches shell metacharacters rejected from path-shaped dynamic values, as defense-in-depth even though no shell is ever invoked. */
const SHELL_METACHARACTER_PATTERN = /[;&|`$(){}<>"'\r\n]/u;
/** Matches one bare token: alphanumeric with `.`, `_`, `-` separators; no path separators or whitespace. */
const BARE_TOKEN_NAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/u;
/** Matches a Windows drive-letter absolute path prefix (for example `C:\` or `C:/`). */
const WINDOWS_DRIVE_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:[\\/]/u;

/**
 * Validates one bare executable or resolvable token name.
 *
 * @param name - Candidate executable or token name.
 * @param label - Human-readable label used in the thrown error message.
 * @returns The validated name, unchanged.
 * @throws Error when the name is empty or contains whitespace, a path separator, a control
 * character, or a shell metacharacter.
 */
function validateBareTokenName(name: string, label: string): string {
  if (!BARE_TOKEN_NAME_PATTERN.test(name)) {
    throw new Error(`Invalid ${label}: '${name}'.`);
  }
  return name;
}

/**
 * Validates one path-shaped dynamic value shared by every path-accepting probe factory.
 *
 * @param path - Candidate path value.
 * @param label - Human-readable label used in the thrown error message.
 * @returns The validated path, unchanged.
 * @throws Error when the path is empty or contains a control character, a shell metacharacter, or
 * a leading `-` (which risks being interpreted as a flag by the invoked executable).
 */
function validatePathLikeValue(path: string, label: string): string {
  if (path.length === 0 || CONTROL_CHARACTER_PATTERN.test(path) || SHELL_METACHARACTER_PATTERN.test(path) || path.startsWith("-")) {
    throw new Error(`Invalid ${label}: '${path}'.`);
  }
  return path;
}

/**
 * Validates one Python interpreter path (absolute or relative) accepted by the `python` probe factories.
 *
 * @param pythonPath - Candidate interpreter executable path.
 * @returns The validated interpreter path, unchanged.
 * @throws Error when the path fails {@link validatePathLikeValue}.
 */
function validatePythonInterpreterPath(pythonPath: string): string {
  return validatePathLikeValue(pythonPath, "python interpreter path");
}

/**
 * Validates one repository-relative `.csproj` project path accepted by `dotnet.userSecrets`.
 *
 * @param projectPath - Candidate relative project path.
 * @returns The validated project path, unchanged.
 * @throws Error when the path fails {@link validatePathLikeValue}, is absolute, traverses parent
 * directories, or does not reference a `.csproj` file.
 */
function validateDotnetProjectPath(projectPath: string): string {
  const validated = validatePathLikeValue(projectPath, "dotnet project path");
  if (WINDOWS_DRIVE_ABSOLUTE_PATH_PATTERN.test(validated) || validated.startsWith("/") || validated.startsWith("\\")) {
    throw new Error(`Invalid dotnet project path '${projectPath}': the path must be relative to the repository root.`);
  }
  if (validated.split(/[\\/]/u).includes("..")) {
    throw new Error(`Invalid dotnet project path '${projectPath}': the path must not traverse parent directories.`);
  }
  if (!validated.endsWith(".csproj")) {
    throw new Error(`Invalid dotnet project path '${projectPath}': the path must reference a .csproj file.`);
  }
  return validated;
}

/** Supported local container runtime names, matching `container-runtime/types.ts`'s `ContainerEngine`. */
type InfrastructureRuntimeName = "rancher" | "podman";
const INFRASTRUCTURE_RUNTIME_NAMES: ReadonlySet<string> = new Set<InfrastructureRuntimeName>(["rancher", "podman"]);

/**
 * Validates one supported local container runtime name.
 *
 * @param runtime - Candidate runtime name.
 * @returns The validated runtime name, narrowed to the supported literal union.
 * @throws Error when the runtime name is not exactly `"rancher"` or `"podman"`.
 */
function validateInfrastructureRuntimeName(runtime: string): InfrastructureRuntimeName {
  if (!INFRASTRUCTURE_RUNTIME_NAMES.has(runtime)) {
    throw new Error(`Invalid infrastructure runtime name: '${runtime}'.`);
  }
  return runtime as InfrastructureRuntimeName;
}

/**
 * Validates one decimal TCP port.
 *
 * @param port - Candidate port number.
 * @returns The validated port, unchanged.
 * @throws Error when the port is not an integer within the valid TCP port range (1-65535).
 */
function validateTcpPort(port: number): number {
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error(`Invalid TCP port: '${String(port)}'.`);
  }
  return port;
}

/**
 * Validates one non-empty list of decimal TCP ports.
 *
 * @param ports - Candidate port numbers.
 * @returns The validated ports, unchanged.
 * @throws Error when the list is empty or any port fails {@link validateTcpPort}.
 */
function validateTcpPorts(ports: readonly number[]): readonly number[] {
  if (ports.length === 0) {
    throw new Error("Invalid TCP port list: at least one port is required.");
  }
  return ports.map((port) => validateTcpPort(port));
}

/**
 * Python interpreter metadata probe script.
 *
 * Duplicated verbatim from `doctor.types.ts`'s `PYTHON_INTERPRETER_METADATA_SNIPPET` (itself
 * duplicated again in `doctor.python.ts`). This inspection registry intentionally does not import
 * from doctor-policy modules, matching that established repository precedent of verbatim script
 * duplication rather than a cross-module import.
 */
const PYTHON_METADATA_PROBE_SCRIPT =
  "import json, platform, site, sys; print(json.dumps({'executable': sys.executable, 'version': platform.python_version(), 'prefix': sys.prefix, 'basePrefix': getattr(sys, 'base_prefix', sys.prefix), 'sitePackages': site.getsitepackages()}, separators=(',', ':')))";

/**
 * Windows read-only port-owner probe script.
 *
 * Duplicated verbatim from the private script embedded in `doctor.types.ts`'s port-owner probe
 * builder, for the same reason as {@link PYTHON_METADATA_PROBE_SCRIPT}.
 */
const WINDOWS_PORT_OWNER_PROBE_SCRIPT = [
  "& {",
  "$ports = @($args[0] -split ',');",
  "$(foreach ($port in $ports) {",
  "Get-NetTCPConnection -State Listen -LocalPort ([int]$port) -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, OwningProcess",
  "}) | ConvertTo-Json -Compress",
  "}",
].join(" ");
const MACOS_PORT_OWNER_PROBE_SCRIPT = 'for port in "$@"; do lsof -nP -a -iTCP:"$port" -sTCP:LISTEN -Fpcn; done';
const LINUX_PORT_OWNER_PROBE_SCRIPT = 'for port in "$@"; do ss -ltnp "sport = :$port"; done';

/**
 * Builds the exact, platform-specific read-only port-owner probe command.
 *
 * @param validatedPorts - Non-empty list of already-validated decimal TCP ports.
 * @returns The exact allowlisted command for the current process platform.
 * @throws Error when the current process platform has no supported port-owner probe.
 */
function buildPortOwnersCommand(validatedPorts: readonly number[]): CommandSpec {
  const portArguments = validatedPorts.map((port) => String(port));

  if (process.platform === "win32") {
    return {
      command: "powershell",
      args: ["-NoProfile", "-NonInteractive", "-Command", WINDOWS_PORT_OWNER_PROBE_SCRIPT, portArguments.join(",")],
    };
  }
  if (process.platform === "darwin") {
    return {command: "sh", args: ["-c", MACOS_PORT_OWNER_PROBE_SCRIPT, "--", ...portArguments]};
  }
  if (process.platform === "linux") {
    return {command: "sh", args: ["-c", LINUX_PORT_OWNER_PROBE_SCRIPT, "--", ...portArguments]};
  }
  throw new Error(`Invalid inspection probe platform for port ownership: '${process.platform}'.`);
}

/** Read-only `node --version` probe. */
function nodeVersion(): InspectionProbe {
  return registerProbe("workspace.node.version", {command: "node", args: ["--version"]});
}

/** Read-only `npm --version` probe. */
function npmVersion(): InspectionProbe {
  return registerProbe("workspace.npm.version", {command: "npm", args: ["--version"]});
}

/** Read-only full npm dependency tree probe. */
function npmTree(): InspectionProbe {
  return registerProbe("workspace.npm.tree", {command: "npm", args: ["ls", "--all", "--json"]});
}

/** Read-only npm cache location probe. */
function npmCache(): InspectionProbe {
  return registerProbe("workspace.npm.cache", {command: "npm", args: ["config", "get", "cache"]});
}

/** Read-only npm audit report probe. */
function npmAudit(): InspectionProbe {
  return registerProbe("workspace.npm.audit", {command: "npm", args: ["audit", "--json"]});
}

/** Read-only npm outdated report probe. */
function npmOutdated(): InspectionProbe {
  return registerProbe("workspace.npm.outdated", {command: "npm", args: ["outdated", "--json"]});
}

/** Read-only `git --version` probe. */
function gitVersion(): InspectionProbe {
  return registerProbe("workspace.git.version", {command: "git", args: ["--version"]});
}

/** Read-only short-form `git status` probe. */
function gitStatus(): InspectionProbe {
  return registerProbe("workspace.git.status", {command: "git", args: ["status", "--short", "--branch"]});
}

/** Read-only last-commit `git log` probe. */
function gitLastCommit(): InspectionProbe {
  return registerProbe("workspace.git.last-commit", {command: "git", args: ["log", "--oneline", "-1", "HEAD"]});
}

/**
 * Resolves one executable's location using the current platform's canonical read-only resolver
 * (`where.exe` on Windows, `which` elsewhere).
 *
 * @param executableName - Bare executable name or extension-qualified filename to resolve (for
 * example `git.exe`, `npm.cmd`, or `dotnet`).
 * @returns The registered probe handle.
 * @throws Error when `executableName` fails {@link validateBareTokenName}.
 */
function executableResolution(executableName: string): InspectionProbe {
  const validatedName = validateBareTokenName(executableName, "executable name");
  const command: CommandSpec =
    process.platform === "win32" ? {command: "where.exe", args: [validatedName]} : {command: "which", args: [validatedName]};
  return registerProbe(`workspace.executable-resolution:${validatedName}`, command);
}

/** Read-only `dotnet --version` probe. */
function dotnetVersion(): InspectionProbe {
  return registerProbe("dotnet.version", {command: "dotnet", args: ["--version"]});
}

/** Read-only installed SDK list probe. */
function dotnetSdkList(): InspectionProbe {
  return registerProbe("dotnet.sdk-list", {command: "dotnet", args: ["--list-sdks"]});
}

/** Read-only `dotnet --info` probe. */
function dotnetInfo(): InspectionProbe {
  return registerProbe("dotnet.info", {command: "dotnet", args: ["--info"]});
}

/** Read-only installed workload list probe. */
function dotnetWorkloads(): InspectionProbe {
  return registerProbe("dotnet.workloads", {command: "dotnet", args: ["workload", "list"]});
}

/** Read-only global NuGet package cache location probe. */
function dotnetNugetLocals(): InspectionProbe {
  return registerProbe("dotnet.nuget-locals", {command: "dotnet", args: ["nuget", "locals", "global-packages", "--list"]});
}

/** Read-only local .NET tool manifest probe. */
function dotnetLocalTools(): InspectionProbe {
  return registerProbe("dotnet.local-tools", {command: "dotnet", args: ["tool", "list", "--local"]});
}

/**
 * Read-only user-secrets listing probe for one repository-relative `.csproj` project.
 *
 * @param projectPath - Repository-relative `.csproj` path to list user secrets for.
 * @returns The registered probe handle.
 * @throws Error when `projectPath` fails {@link validateDotnetProjectPath}.
 */
function dotnetUserSecrets(projectPath: string): InspectionProbe {
  const validatedPath = validateDotnetProjectPath(projectPath);
  return registerProbe(`dotnet.user-secrets:${validatedPath}`, {
    command: "dotnet",
    args: ["user-secrets", "list", "--json", "--project", validatedPath],
  });
}

/** Read-only local HTTPS development certificate check probe. */
function dotnetCertificate(): InspectionProbe {
  return registerProbe("dotnet.certificate", {command: "dotnet", args: ["dev-certs", "https", "--check"]});
}

/**
 * Read-only Python interpreter version probe.
 *
 * @param pythonPath - Absolute or relative interpreter executable path.
 * @returns The registered probe handle.
 * @throws Error when `pythonPath` fails {@link validatePythonInterpreterPath}.
 */
function pythonVersion(pythonPath: string): InspectionProbe {
  const validatedPath = validatePythonInterpreterPath(pythonPath);
  return registerProbe(`python.version:${validatedPath}`, {command: validatedPath, args: ["--version"]});
}

/**
 * Read-only Python interpreter metadata probe.
 *
 * @param pythonPath - Absolute or relative interpreter executable path.
 * @returns The registered probe handle.
 * @throws Error when `pythonPath` fails {@link validatePythonInterpreterPath}.
 */
function pythonMetadata(pythonPath: string): InspectionProbe {
  const validatedPath = validatePythonInterpreterPath(pythonPath);
  return registerProbe(`python.metadata:${validatedPath}`, {command: validatedPath, args: ["-c", PYTHON_METADATA_PROBE_SCRIPT]});
}

/**
 * Read-only `pip --version` probe for one interpreter.
 *
 * @param pythonPath - Absolute or relative interpreter executable path.
 * @returns The registered probe handle.
 * @throws Error when `pythonPath` fails {@link validatePythonInterpreterPath}.
 */
function pythonPipVersion(pythonPath: string): InspectionProbe {
  const validatedPath = validatePythonInterpreterPath(pythonPath);
  return registerProbe(`python.pip-version:${validatedPath}`, {command: validatedPath, args: ["-m", "pip", "--version"]});
}

/**
 * Read-only installed-package `pip list` probe for one interpreter.
 *
 * @param pythonPath - Absolute or relative interpreter executable path.
 * @returns The registered probe handle.
 * @throws Error when `pythonPath` fails {@link validatePythonInterpreterPath}.
 */
function pythonPipList(pythonPath: string): InspectionProbe {
  const validatedPath = validatePythonInterpreterPath(pythonPath);
  return registerProbe(`python.pip-list:${validatedPath}`, {command: validatedPath, args: ["-m", "pip", "list", "--format", "json"]});
}

/**
 * Read-only dependency-consistency `pip check` probe for one interpreter.
 *
 * @param pythonPath - Absolute or relative interpreter executable path.
 * @returns The registered probe handle.
 * @throws Error when `pythonPath` fails {@link validatePythonInterpreterPath}.
 */
function pythonPipCheck(pythonPath: string): InspectionProbe {
  const validatedPath = validatePythonInterpreterPath(pythonPath);
  return registerProbe(`python.pip-check:${validatedPath}`, {command: validatedPath, args: ["-m", "pip", "check"]});
}

/** Read-only root npm dependency tree probe. */
function frontendPackageTree(): InspectionProbe {
  return registerProbe("frontend.package-tree", {command: "npm", args: ["ls", "--json"]});
}

/** Read-only installed Playwright browser inventory probe. */
function frontendPlaywrightInventory(): InspectionProbe {
  return registerProbe("frontend.playwright-inventory", {command: "npx", args: ["--no-install", "playwright", "install", "--list"]});
}

/**
 * Read-only container-runtime CLI version probe.
 *
 * @param runtime - Supported local container runtime name (`"rancher"` or `"podman"`).
 * @returns The registered probe handle.
 * @throws Error when `runtime` fails {@link validateInfrastructureRuntimeName}.
 */
function infrastructureRuntimeVersion(runtime: string): InspectionProbe {
  const validatedRuntime = validateInfrastructureRuntimeName(runtime);
  const command: CommandSpec =
    validatedRuntime === "rancher" ? {command: "docker", args: ["--version"]} : {command: "podman", args: ["--version"]};
  return registerProbe(`infrastructure.runtime-version:${validatedRuntime}`, command);
}

/**
 * Read-only Docker-compatible Compose version probe.
 *
 * @param runtime - Supported local container runtime name (`"rancher"` or `"podman"`).
 * @returns The registered probe handle.
 * @throws Error when `runtime` fails {@link validateInfrastructureRuntimeName}.
 */
function infrastructureComposeVersion(runtime: string): InspectionProbe {
  const validatedRuntime = validateInfrastructureRuntimeName(runtime);
  const command: CommandSpec =
    validatedRuntime === "rancher" ? {command: "docker", args: ["compose", "version"]} : {command: "podman", args: ["compose", "version"]};
  return registerProbe(`infrastructure.compose-version:${validatedRuntime}`, command);
}

/**
 * Read-only active runtime context/connection probe.
 *
 * @param runtime - Supported local container runtime name (`"rancher"` or `"podman"`).
 * @returns The registered probe handle.
 * @throws Error when `runtime` fails {@link validateInfrastructureRuntimeName}.
 */
function infrastructureRuntimeContext(runtime: string): InspectionProbe {
  const validatedRuntime = validateInfrastructureRuntimeName(runtime);
  const command: CommandSpec =
    validatedRuntime === "rancher"
      ? {command: "docker", args: ["context", "show"]}
      : {command: "podman", args: ["system", "connection", "list", "--format", "json"]};
  return registerProbe(`infrastructure.runtime-context:${validatedRuntime}`, command);
}

/**
 * Read-only local container list probe.
 *
 * @param runtime - Supported local container runtime name (`"rancher"` or `"podman"`).
 * @returns The registered probe handle.
 * @throws Error when `runtime` fails {@link validateInfrastructureRuntimeName}.
 */
function infrastructureContainerList(runtime: string): InspectionProbe {
  const validatedRuntime = validateInfrastructureRuntimeName(runtime);
  const command: CommandSpec =
    validatedRuntime === "rancher"
      ? {command: "docker", args: ["ps", "-a", "--format", "{{json .}}"]}
      : {command: "podman", args: ["ps", "-a", "--format", "{{json .}}"]};
  return registerProbe(`infrastructure.container-list:${validatedRuntime}`, command);
}

/** Read-only `mkcert --version` probe. */
function infrastructureMkcertVersion(): InspectionProbe {
  return registerProbe("infrastructure.mkcert-version", {command: "mkcert", args: ["--version"]});
}

/** Read-only local mkcert CA root location probe. */
function infrastructureMkcertCaRoot(): InspectionProbe {
  return registerProbe("infrastructure.mkcert-ca-root", {command: "mkcert", args: ["-CAROOT"]});
}

/**
 * Read-only local TCP port-owner probe for one or more ports.
 *
 * @param ports - Non-empty list of decimal TCP ports to inspect.
 * @returns The registered probe handle.
 * @throws Error when `ports` fails {@link validateTcpPorts} or the current process platform has no
 * supported port-owner probe.
 */
function infrastructurePortOwners(ports: readonly number[]): InspectionProbe {
  const validatedPorts = validateTcpPorts(ports);
  return registerProbe(`infrastructure.port-owners:${validatedPorts.join(",")}`, buildPortOwnersCommand(validatedPorts));
}

/** Domain-qualified registry of every allowlisted, read-only observational command probe factory. */
export const probes = {
  workspace: {
    nodeVersion,
    npmVersion,
    npmTree,
    npmCache,
    npmAudit,
    npmOutdated,
    gitVersion,
    gitStatus,
    gitLastCommit,
    executableResolution,
  },
  dotnet: {
    version: dotnetVersion,
    sdkList: dotnetSdkList,
    info: dotnetInfo,
    workloads: dotnetWorkloads,
    nugetLocals: dotnetNugetLocals,
    localTools: dotnetLocalTools,
    userSecrets: dotnetUserSecrets,
    certificate: dotnetCertificate,
  },
  python: {
    version: pythonVersion,
    metadata: pythonMetadata,
    pipVersion: pythonPipVersion,
    pipList: pythonPipList,
    pipCheck: pythonPipCheck,
  },
  frontend: {
    packageTree: frontendPackageTree,
    playwrightInventory: frontendPlaywrightInventory,
  },
  infrastructure: {
    runtimeVersion: infrastructureRuntimeVersion,
    composeVersion: infrastructureComposeVersion,
    runtimeContext: infrastructureRuntimeContext,
    containerList: infrastructureContainerList,
    mkcertVersion: infrastructureMkcertVersion,
    mkcertCaRoot: infrastructureMkcertCaRoot,
    portOwners: infrastructurePortOwners,
  },
} as const;
