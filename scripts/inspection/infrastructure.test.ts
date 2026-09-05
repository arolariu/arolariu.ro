// @vitest-environment node
/**
 * @fileoverview Contract tests for shared read-only infrastructure inspection facts.
 * @module scripts/inspection/infrastructure.test
 */

import {mkdir, mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {afterEach, describe, expect, it, vi} from "vitest";

import type {ProcessEnvironment, ProcessExecutionRequest} from "../core/process/process-execution-request.ts";
import type {ProcessExecutionResult} from "../core/process/process-execution-result.ts";
import type {ProcessRunner} from "../core/process/process-runner.ts";
import {nodeFileSystem} from "../adapters/node/node-filesystem.ts";
import {asReadOnlyFileSystem, type Clock, type RuntimeEnvironment} from "../core/runtime/runtime-capability.ts";
import {DefaultTaskScheduler} from "../core/runtime/task-scheduler.ts";
import {createRepositoryPaths, type RepositoryPaths} from "../common/repository-paths.ts";
import {requiredLocalPorts} from "../container-runtime/preflight.ts";
import type {ContainerEngine} from "../container-runtime/types.ts";
import type {AggregateFacts} from "./aggregate.ts";
import type {HostFacts, HostPortOwnerFact} from "./host.ts";
import {createInspectionProbeRunner} from "./probes.ts";
import {createInfrastructureProvider, type InfrastructureFacts} from "./infrastructure.ts";
import type {InspectionOutcome} from "./types.ts";

const fixtureRoots: string[] = [];

/**
 * Duplicated verbatim from `probes.ts`'s private port-owner probe scripts (itself duplicated from
 * `doctor.types.ts`), matching the repository's established precedent of verbatim script
 * duplication for exact per-platform command matching in tests.
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

/** Legacy-shaped fixture description translated into one typed {@link ProcessExecutionResult}. */
interface ProcessOutcomeFixture {
  readonly code?: number;
  readonly stdout?: string;
  readonly stderr?: string;
  readonly durationMs?: number;
  readonly timedOut?: boolean;
  readonly signal?: NodeJS.Signals;
  readonly spawnError?: string;
}

/**
 * Builds one typed {@link ProcessExecutionResult} from a fixture description, so every suite keeps naming
 * the exact spawn/timeout/signal/exit classification it exercises.
 *
 * @param patch - Fixture description of the outcome under test.
 * @returns The equivalent typed process outcome.
 */
function commandResult(patch: ProcessOutcomeFixture = {}): ProcessExecutionResult {
  const output = {stdout: patch.stdout ?? "", stderr: patch.stderr ?? "", durationMs: patch.durationMs ?? 1};
  if (patch.spawnError !== undefined) {
    return {kind: "spawn-failed", message: patch.spawnError, ...output};
  }
  if (patch.timedOut === true) {
    return {kind: "timed-out", ...(patch.signal === undefined ? {} : {signal: patch.signal}), ...output};
  }
  if (patch.signal !== undefined) {
    return {kind: "signalled", signal: patch.signal, ...output};
  }
  const code = patch.code ?? 0;
  return code === 0 ? {kind: "succeeded", exitCode: 0, ...output} : {kind: "exited", exitCode: code, ...output};
}

/** Wraps one recorded `run` implementation in the full {@link ProcessRunner} probe contract. */
function asProcessRunner(run: ProcessRunner["run"]): ProcessRunner {
  return {
    run,
    expectSuccess: () => {
      throw new Error("Inspection probes never call expectSuccess.");
    },
    scope: () => {
      throw new Error("Inspection probes never scope the shared runner.");
    },
  };
}

/** Read-only filesystem capability every fixture provider observes its temporary root through. */
const testFiles = asReadOnlyFileSystem(nodeFileSystem);

/** Deterministic task scheduler replacing the previous explicit `Promise.all` calls. */
const testTasks = new DefaultTaskScheduler();

/**
 * Builds one immutable environment snapshot for a fixture provider.
 *
 * @param platform - Target platform the provider must observe.
 * @param variables - Environment variables the provider may forward to probes.
 * @returns The environment snapshot.
 */
function environmentFor(platform: NodeJS.Platform, variables: ProcessEnvironment = {}): RuntimeEnvironment {
  return {
    variables,
    cwd: "/repo",
    executablePath: "/usr/bin/node",
    platform,
    architecture: "x64",
    stdinIsTTY: false,
    stdoutIsTTY: false,
    isCI: true,
  };
}

function commandKey(command: Readonly<ProcessExecutionRequest>, cwd?: string): string {
  return `${cwd ?? ""}\u0000${command.command}\u0000${JSON.stringify(command.args)}`;
}

function clock(): Clock {
  let current = 100;
  return {
    monotonicNow: (): number => {
      current += 5;
      return current;
    },
    isoTimestamp: (): string => "2025-01-01T00:00:00.000Z",
    delay: (): Promise<void> => Promise.resolve(),
  };
}

function runtimeVersionCommand(engine: ContainerEngine): ProcessExecutionRequest {
  return engine === "rancher" ? {command: "docker", args: ["--version"]} : {command: "podman", args: ["--version"]};
}

function composeVersionCommand(engine: ContainerEngine): ProcessExecutionRequest {
  return engine === "rancher" ? {command: "docker", args: ["compose", "version"]} : {command: "podman", args: ["compose", "version"]};
}

function runtimeContextCommand(engine: ContainerEngine): ProcessExecutionRequest {
  return engine === "rancher"
    ? {command: "docker", args: ["context", "show"]}
    : {command: "podman", args: ["system", "connection", "list", "--format", "json"]};
}

function containerListCommand(engine: ContainerEngine): ProcessExecutionRequest {
  return engine === "rancher"
    ? {command: "docker", args: ["ps", "-a", "--format", "{{json .}}"]}
    : {command: "podman", args: ["ps", "-a", "--format", "{{json .}}"]};
}

function runtimeInfoCommand(engine: ContainerEngine): ProcessExecutionRequest {
  return engine === "rancher" ? {command: "docker", args: ["info"]} : {command: "podman", args: ["info", "--format", "json"]};
}

function portOwnersCommand(platform: NodeJS.Platform, ports: readonly number[] = [...requiredLocalPorts]): ProcessExecutionRequest {
  const portArguments = ports.map((port) => String(port));
  if (platform === "win32") {
    return {
      command: "powershell",
      args: ["-NoProfile", "-NonInteractive", "-Command", WINDOWS_PORT_OWNER_PROBE_SCRIPT, portArguments.join(",")],
    };
  }
  if (platform === "darwin") {
    return {command: "sh", args: ["-c", MACOS_PORT_OWNER_PROBE_SCRIPT, "--", ...portArguments]};
  }
  return {command: "sh", args: ["-c", LINUX_PORT_OWNER_PROBE_SCRIPT, "--", ...portArguments]};
}

function unavailableOutcome<T>(): InspectionOutcome<T> {
  return {kind: "unavailable", reason: "not needed for this test", durationMs: 1};
}

function availableOutcome<T>(value: T): InspectionOutcome<T> {
  return {kind: "available", value, durationMs: 1};
}

function validHostFacts(portOwners: readonly HostPortOwnerFact[] = []): HostFacts {
  return {
    os: {platform: "linux", distro: "distro", release: "1", arch: "x64"},
    cpu: {brand: "cpu", cores: 4, physicalCores: 2, virtualization: false},
    memory: {totalBytes: 100, usedBytes: 40, availableBytes: 60},
    load: {currentPercent: 5},
    filesystems: [],
    processes: {total: 10, running: 1, blocked: 0},
    portOwners,
    containers: {available: false, running: 0, stopped: 0, images: 0, repositoryContainers: []},
    network: {},
  };
}

function aggregateWithPortOwners(portOwners: readonly HostPortOwnerFact[]): () => Promise<InspectionOutcome<AggregateFacts>> {
  return async () => availableOutcome({tooling: unavailableOutcome(), host: availableOutcome(validHostFacts(portOwners))});
}

function unavailableAggregate(): () => Promise<InspectionOutcome<AggregateFacts>> {
  return async () => unavailableOutcome();
}

function invalidHostAggregate(): () => Promise<InspectionOutcome<AggregateFacts>> {
  return async () =>
    availableOutcome({tooling: unavailableOutcome(), host: {kind: "invalid", issues: ["not needed for this test"], durationMs: 1}});
}

async function writeFixtureFile(path: string, contents: string): Promise<void> {
  await mkdir(resolve(path, ".."), {recursive: true});
  await writeFile(path, contents, "utf8");
}

interface InfrastructureFixture {
  readonly root: string;
  readonly paths: RepositoryPaths;
  readonly run: ReturnType<typeof vi.fn<ProcessRunner["run"]>>;
  readonly setResponse: (command: Readonly<ProcessExecutionRequest>, result: ProcessExecutionResult) => void;
}

async function createInfrastructureFixture(
  input: Readonly<{writeManifests?: boolean; writeCertificates?: boolean}> = {},
): Promise<InfrastructureFixture> {
  const root = await mkdtemp(join(tmpdir(), "arolariu-inspection-infrastructure-"));
  fixtureRoots.push(root);
  const paths = createRepositoryPaths(root);

  if (input.writeManifests !== false) {
    await Promise.all(
      [
        ["tooling", "AppHost", "AppHost.csproj"],
        ["infra", "Local", "Management", "docker-compose.yml"],
        ["infra", "Local", "Storage", "docker-compose.yml"],
        ["infra", "Local", "Backend", "docker-compose.yml"],
        ["infra", "Local", "Frontend", "docker-compose.yml"],
      ].map((segments) => writeFixtureFile(resolve(root, ...segments), "manifest-marker")),
    );
  }

  if (input.writeCertificates !== false) {
    await Promise.all([
      writeFixtureFile(resolve(root, "infra", "Local", "Management", "certs", "local-cert.pem"), "cert-marker"),
      writeFixtureFile(resolve(root, "infra", "Local", "Management", "certs", "local-key.pem"), "key-marker"),
    ]);
  }

  const responses = new Map<string, ProcessExecutionResult>();
  const setResponse = (command: Readonly<ProcessExecutionRequest>, result: ProcessExecutionResult): void => {
    responses.set(commandKey(command, paths.root), result);
  };

  const run = vi.fn<ProcessRunner["run"]>(
    async (command, options): Promise<ProcessExecutionResult> =>
      responses.get(commandKey(command, options?.cwd))
      ?? commandResult({code: 127, spawnError: `unexpected-native-command-marker:${command.command}`}),
  );

  return {root, paths, run, setResponse};
}

function createProvider(
  fixture: InfrastructureFixture,
  overrides: Readonly<{
    aggregate?: () => Promise<InspectionOutcome<AggregateFacts>>;
    requestedEngine?: ContainerEngine | undefined;
    resolveEngine?: () => ContainerEngine | undefined;
    env?: ProcessEnvironment;
    platform?: NodeJS.Platform;
    clock?: Clock;
  }> = {},
): ReturnType<typeof createInfrastructureProvider> {
  return createInfrastructureProvider({
    paths: fixture.paths,
    probes: createInspectionProbeRunner(asProcessRunner(fixture.run)),
    aggregate: overrides.aggregate ?? aggregateWithPortOwners([]),
    ...(overrides.requestedEngine === undefined ? {} : {requestedEngine: overrides.requestedEngine}),
    ...(overrides.resolveEngine === undefined ? {} : {resolveEngine: overrides.resolveEngine}),
    files: testFiles,
    clock: overrides.clock ?? clock(),
    tasks: testTasks,
    environment: environmentFor(overrides.platform ?? "linux", overrides.env ?? {}),
  });
}

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map(async (root) => rm(root, {recursive: true, force: true})));
});

// ============================================================================
// Ports
// ============================================================================

describe("createInfrastructureProvider ports", () => {
  it("prefers already-aggregated host port facts and never calls the fallback probe", async () => {
    const fixture = await createInfrastructureFixture();
    const owners: readonly HostPortOwnerFact[] = [{port: 3000, pid: 111, processName: "node", repositoryOwned: true}];
    const provider = createProvider(fixture, {aggregate: aggregateWithPortOwners(owners), requestedEngine: undefined});

    const outcome = await provider();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.ports).toEqual(
      requiredLocalPorts.map((port) =>
        port === 3000 ? {port, available: false, pid: 111, processName: "node", repositoryOwned: true} : {port, available: true},
      ),
    );
    expect(fixture.run).not.toHaveBeenCalledWith(expect.objectContaining({command: "powershell"}), expect.anything());
    expect(fixture.run).not.toHaveBeenCalledWith(expect.objectContaining({command: "sh"}), expect.anything());
  });

  it("falls back to the platform-specific probe when the aggregate outcome is unavailable", async () => {
    const fixture = await createInfrastructureFixture();
    fixture.setResponse(
      portOwnersCommand("linux"),
      commandResult({stdout: 'LISTEN 0 128 0.0.0.0:3000 0.0.0.0:* users:(("node",pid=222,fd=10))\n'}),
    );
    const provider = createProvider(fixture, {aggregate: unavailableAggregate(), platform: "linux"});

    const outcome = await provider();

    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.ports.find((fact) => fact.port === 3000)).toEqual({port: 3000, available: false, pid: 222, processName: "node"});
    expect(facts.ports.filter((fact) => fact.port !== 3000).every((fact) => fact.available)).toBe(true);
  });

  it("falls back to the platform-specific probe when the aggregate host outcome is invalid", async () => {
    const fixture = await createInfrastructureFixture();
    fixture.setResponse(portOwnersCommand("linux"), commandResult({stdout: ""}));
    const provider = createProvider(fixture, {aggregate: invalidHostAggregate(), platform: "linux"});

    const outcome = await provider();

    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.ports.every((fact) => fact.available)).toBe(true);
  });

  it("parses Windows port owners without a process name, since the registered probe never reports one", async () => {
    const fixture = await createInfrastructureFixture();
    fixture.setResponse(
      portOwnersCommand("win32"),
      commandResult({stdout: JSON.stringify([{LocalAddress: "0.0.0.0", LocalPort: 3000, OwningProcess: 4242}])}),
    );
    const provider = createProvider(fixture, {aggregate: unavailableAggregate(), platform: "win32"});

    const outcome = await provider();

    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.ports.find((fact) => fact.port === 3000)).toEqual({port: 3000, available: false, pid: 4242});
  });

  it("tolerates the benign macOS nonzero-exit shape for the multi-port lsof loop", async () => {
    const fixture = await createInfrastructureFixture();
    fixture.setResponse(portOwnersCommand("darwin"), commandResult({code: 1, stdout: "p111\nctraefik\nn*:3000\n", stderr: ""}));
    const provider = createProvider(fixture, {aggregate: unavailableAggregate(), platform: "darwin"});

    const outcome = await provider();

    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.ports.find((fact) => fact.port === 3000)).toEqual({port: 3000, available: false, pid: 111, processName: "traefik"});
  });

  it("reports a bounded error per port when the fallback probe genuinely fails", async () => {
    const fixture = await createInfrastructureFixture();
    fixture.setResponse(portOwnersCommand("linux"), commandResult({code: 1, stderr: "permission denied"}));
    const provider = createProvider(fixture, {aggregate: unavailableAggregate(), platform: "linux"});

    const outcome = await provider();

    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.ports).toHaveLength(requiredLocalPorts.length);
    for (const fact of facts.ports) {
      expect(fact.available).toBe(false);
      expect(fact.error).toBe("Port ownership could not be determined for the required local ports.");
      expect(fact.error).not.toContain("permission denied");
    }
  });

  it("reports a bounded error when the platform is unsupported for port ownership", async () => {
    const fixture = await createInfrastructureFixture();
    const provider = createProvider(fixture, {aggregate: unavailableAggregate(), platform: "aix" as NodeJS.Platform});

    const outcome = await provider();

    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    for (const fact of facts.ports) {
      expect(fact).toEqual({port: fact.port, available: false, error: "Port ownership inspection is not supported on this platform."});
    }
  });
});

// ============================================================================
// Engine-dependent facts
// ============================================================================

describe("createInfrastructureProvider engine facts", () => {
  it("omits engine facts when no engine is selected, while still inspecting ports/certificates/manifests", async () => {
    const fixture = await createInfrastructureFixture();
    const provider = createProvider(fixture, {requestedEngine: undefined});

    const outcome = await provider();

    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.selectedEngine).toBeUndefined();
    expect(facts.cliAvailable).toBe(false);
    expect(facts.backendAvailable).toBe(false);
    expect(facts.composeAvailable).toBe(false);
    expect(facts.dockerConflict).toBe(false);
    expect(facts.socketContextIssues).toEqual([]);
    expect(facts.containers).toEqual([]);
    expect(facts.certificateIssues).toEqual([]);
    expect(facts.manifestIssues).toEqual([]);
    expect(fixture.run).not.toHaveBeenCalled();
  });

  it("reports cliAvailable false and skips every backend-dependent check when the CLI is unavailable", async () => {
    const fixture = await createInfrastructureFixture();
    fixture.setResponse(runtimeVersionCommand("rancher"), commandResult({code: 127, spawnError: "ENOENT"}));
    const provider = createProvider(fixture, {requestedEngine: "rancher"});

    const outcome = await provider();

    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.selectedEngine).toBe("rancher");
    expect(facts.cliAvailable).toBe(false);
    expect(facts.backendAvailable).toBe(false);
    expect(facts.composeAvailable).toBe(false);
    expect(facts.dockerConflict).toBe(false);
    expect(facts.socketContextIssues).toEqual([]);
    expect(facts.containers).toEqual([]);
    expect(fixture.run).not.toHaveBeenCalledWith(composeVersionCommand("rancher"), expect.anything());
    expect(fixture.run).not.toHaveBeenCalledWith(containerListCommand("rancher"), expect.anything());
  });

  it("reports a healthy rancher engine's cliAvailable, composeAvailable, and backendAvailable facts", async () => {
    const fixture = await createInfrastructureFixture();
    fixture.setResponse(runtimeVersionCommand("rancher"), commandResult({stdout: "Docker version 24.0.5, build abc\n"}));
    fixture.setResponse(composeVersionCommand("rancher"), commandResult({stdout: "Docker Compose version v2.23.0\n"}));
    fixture.setResponse(runtimeContextCommand("rancher"), commandResult({stdout: "rancher-desktop\n"}));
    fixture.setResponse(containerListCommand("rancher"), commandResult({stdout: ""}));
    const provider = createProvider(fixture, {requestedEngine: "rancher"});

    const outcome = await provider();

    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.selectedEngine).toBe("rancher");
    expect(facts.cliAvailable).toBe(true);
    expect(facts.composeAvailable).toBe(true);
    expect(facts.backendAvailable).toBe(true);
    expect(facts.dockerConflict).toBe(false);
    expect(facts.socketContextIssues).toEqual([]);
    expect(facts.containers).toEqual([]);
  });

  it("projects only approved repository containers with sorted, deduplicated Docker-shape published ports", async () => {
    const fixture = await createInfrastructureFixture();
    fixture.setResponse(runtimeVersionCommand("rancher"), commandResult({stdout: "Docker version 24.0.5\n"}));
    fixture.setResponse(composeVersionCommand("rancher"), commandResult({stdout: "Docker Compose version v2.23.0\n"}));
    fixture.setResponse(runtimeContextCommand("rancher"), commandResult({stdout: "rancher-desktop\n"}));
    fixture.setResponse(
      containerListCommand("rancher"),
      commandResult({
        stdout: [
          JSON.stringify({Names: "traefik", State: "running", Ports: "0.0.0.0:8082->80/tcp, :::8082->80/tcp"}),
          JSON.stringify({Names: "some-unrelated-dev-container", State: "running", Ports: ""}),
          JSON.stringify({Names: "mssql", State: "exited", Ports: ""}),
        ].join("\n"),
      }),
    );
    const provider = createProvider(fixture, {requestedEngine: "rancher"});

    const outcome = await provider();

    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.containers).toEqual([
      {name: "mssql", state: "exited", publishedPorts: [], repositoryOwned: true},
      {name: "traefik", state: "running", publishedPorts: [8082], repositoryOwned: true},
    ]);
  });

  it("parses Podman's array-based Names/Ports container shape", async () => {
    const fixture = await createInfrastructureFixture();
    fixture.setResponse(runtimeVersionCommand("podman"), commandResult({stdout: "podman version 4.9.0\n"}));
    fixture.setResponse(composeVersionCommand("podman"), commandResult({stdout: "podman-compose version 1.0.6\n"}));
    fixture.setResponse(runtimeContextCommand("podman"), commandResult({stdout: "[]\n"}));
    fixture.setResponse(
      containerListCommand("podman"),
      commandResult({
        stdout: JSON.stringify({
          Names: ["azurite"],
          State: "running",
          Ports: [{host_ip: "0.0.0.0", container_port: 10000, host_port: 10000, protocol: "tcp"}],
        }),
      }),
    );
    const provider = createProvider(fixture, {requestedEngine: "podman"});

    const outcome = await provider();

    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.containers).toEqual([{name: "azurite", state: "running", publishedPorts: [10000], repositoryOwned: true}]);
  });

  it("reports dockerConflict true when Podman Compose is delegated to a Docker Desktop indicator", async () => {
    const fixture = await createInfrastructureFixture();
    fixture.setResponse(runtimeVersionCommand("podman"), commandResult({stdout: "podman version 4.9.0\n"}));
    fixture.setResponse(composeVersionCommand("podman"), commandResult({stdout: "Docker Compose version v2.23.0 (docker-compose)\n"}));
    fixture.setResponse(runtimeContextCommand("podman"), commandResult({stdout: "[]\n"}));
    fixture.setResponse(containerListCommand("podman"), commandResult({stdout: ""}));
    const provider = createProvider(fixture, {requestedEngine: "podman"});

    const outcome = await provider();

    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.dockerConflict).toBe(true);
  });

  it("reports dockerConflict false when Podman Compose uses podman-compose", async () => {
    const fixture = await createInfrastructureFixture();
    fixture.setResponse(runtimeVersionCommand("podman"), commandResult({stdout: "podman version 4.9.0\n"}));
    fixture.setResponse(composeVersionCommand("podman"), commandResult({stdout: "podman-compose version 1.0.6\n"}));
    fixture.setResponse(runtimeContextCommand("podman"), commandResult({stdout: "[]\n"}));
    fixture.setResponse(containerListCommand("podman"), commandResult({stdout: ""}));
    const provider = createProvider(fixture, {requestedEngine: "podman"});

    const outcome = await provider();

    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.dockerConflict).toBe(false);
  });

  it("reports dockerConflict true when rancher docker info reports the Docker Desktop backend, even on the Desktop default context", async () => {
    const fixture = await createInfrastructureFixture();
    fixture.setResponse(runtimeVersionCommand("rancher"), commandResult({stdout: "Docker version 24.0.5\n"}));
    fixture.setResponse(composeVersionCommand("rancher"), commandResult({stdout: "Docker Compose version v2.23.0\n"}));
    fixture.setResponse(runtimeContextCommand("rancher"), commandResult({stdout: "default\n"}));
    fixture.setResponse(containerListCommand("rancher"), commandResult({stdout: ""}));
    fixture.setResponse(
      runtimeInfoCommand("rancher"),
      commandResult({stdout: "Server Version: 24.0.5\nOperating System: Docker Desktop\nKernel Version: 6.6.0\n"}),
    );
    const provider = createProvider(fixture, {requestedEngine: "rancher"});

    const outcome = await provider();

    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.dockerConflict).toBe(true);
    expect(fixture.run).toHaveBeenCalledWith(runtimeInfoCommand("rancher"), expect.anything());
  });

  it("reports dockerConflict false when rancher docker info does not mention Docker Desktop, even on a Desktop-shaped context name", async () => {
    const fixture = await createInfrastructureFixture();
    fixture.setResponse(runtimeVersionCommand("rancher"), commandResult({stdout: "Docker version 24.0.5\n"}));
    fixture.setResponse(composeVersionCommand("rancher"), commandResult({stdout: "Docker Compose version v2.23.0\n"}));
    fixture.setResponse(runtimeContextCommand("rancher"), commandResult({stdout: "desktop-linux\n"}));
    fixture.setResponse(containerListCommand("rancher"), commandResult({stdout: ""}));
    fixture.setResponse(
      runtimeInfoCommand("rancher"),
      commandResult({stdout: "Server Version: 24.0.5\nOperating System: Ubuntu 22.04.3 LTS\nKernel Version: 5.15.0\n"}),
    );
    const provider = createProvider(fixture, {requestedEngine: "rancher"});

    const outcome = await provider();

    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.dockerConflict).toBe(false);
  });

  it("reports dockerConflict false, without leaking raw evidence, when the rancher runtime-info probe fails", async () => {
    const fixture = await createInfrastructureFixture();
    fixture.setResponse(runtimeVersionCommand("rancher"), commandResult({stdout: "Docker version 24.0.5\n"}));
    fixture.setResponse(composeVersionCommand("rancher"), commandResult({stdout: "Docker Compose version v2.23.0\n"}));
    fixture.setResponse(runtimeContextCommand("rancher"), commandResult({stdout: "rancher-desktop\n"}));
    fixture.setResponse(containerListCommand("rancher"), commandResult({stdout: ""}));
    fixture.setResponse(runtimeInfoCommand("rancher"), commandResult({code: 1, stderr: "raw-secret-docker-info-detail-marker"}));
    const provider = createProvider(fixture, {requestedEngine: "rancher"});

    const outcome = await provider();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.dockerConflict).toBe(false);
    expect(JSON.stringify(facts)).not.toContain("raw-secret-docker-info-detail-marker");
  });

  it("does not invoke the runtime-info probe for the podman engine, preserving its Compose-delegation classification", async () => {
    const fixture = await createInfrastructureFixture();
    fixture.setResponse(runtimeVersionCommand("podman"), commandResult({stdout: "podman version 4.9.0\n"}));
    fixture.setResponse(composeVersionCommand("podman"), commandResult({stdout: "podman-compose version 1.0.6\n"}));
    fixture.setResponse(runtimeContextCommand("podman"), commandResult({stdout: "[]\n"}));
    fixture.setResponse(containerListCommand("podman"), commandResult({stdout: ""}));
    const provider = createProvider(fixture, {requestedEngine: "podman"});

    const outcome = await provider();

    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.dockerConflict).toBe(false);
    expect(fixture.run).not.toHaveBeenCalledWith(runtimeInfoCommand("podman"), expect.anything());
  });

  it("reports a bounded socketContextIssues entry when the context probe fails", async () => {
    const fixture = await createInfrastructureFixture();
    fixture.setResponse(runtimeVersionCommand("rancher"), commandResult({stdout: "Docker version 24.0.5\n"}));
    fixture.setResponse(composeVersionCommand("rancher"), commandResult({stdout: "Docker Compose version v2.23.0\n"}));
    fixture.setResponse(runtimeContextCommand("rancher"), commandResult({code: 1, stderr: "raw-secret-context-detail-marker"}));
    fixture.setResponse(containerListCommand("rancher"), commandResult({stdout: ""}));
    const provider = createProvider(fixture, {requestedEngine: "rancher"});

    const outcome = await provider();

    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.socketContextIssues).toEqual(["The active container runtime context or connection state could not be determined."]);
    expect(facts.socketContextIssues.join()).not.toContain("raw-secret-context-detail-marker");
  });

  it("reports backendAvailable false and empty containers when the container listing command fails", async () => {
    const fixture = await createInfrastructureFixture();
    fixture.setResponse(runtimeVersionCommand("rancher"), commandResult({stdout: "Docker version 24.0.5\n"}));
    fixture.setResponse(composeVersionCommand("rancher"), commandResult({stdout: "Docker Compose version v2.23.0\n"}));
    fixture.setResponse(runtimeContextCommand("rancher"), commandResult({stdout: "rancher-desktop\n"}));
    fixture.setResponse(containerListCommand("rancher"), commandResult({code: 1, stderr: "Cannot connect to the Docker daemon"}));
    const provider = createProvider(fixture, {requestedEngine: "rancher"});

    const outcome = await provider();

    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.backendAvailable).toBe(false);
    expect(facts.containers).toEqual([]);
  });
});

// ============================================================================
// Certificates and manifests
// ============================================================================

describe("createInfrastructureProvider certificates and manifests", () => {
  it("reports no certificate issues when both files are present regular files", async () => {
    const fixture = await createInfrastructureFixture();
    const provider = createProvider(fixture, {requestedEngine: undefined});

    const outcome = await provider();

    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.certificateIssues).toEqual([]);
  });

  it("reports missing certificate and key issues", async () => {
    const fixture = await createInfrastructureFixture({writeCertificates: false});
    const provider = createProvider(fixture, {requestedEngine: undefined});

    const outcome = await provider();

    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.certificateIssues).toEqual([
      "Missing selfhost certificate file: infra/Local/Management/certs/local-cert.pem",
      "Missing selfhost certificate key: infra/Local/Management/certs/local-key.pem",
    ]);
  });

  it("reports an invalid-kind certificate issue when the certificate path is a directory", async () => {
    const fixture = await createInfrastructureFixture({writeCertificates: false});
    await mkdir(resolve(fixture.root, "infra", "Local", "Management", "certs", "local-cert.pem"), {recursive: true});
    await writeFixtureFile(resolve(fixture.root, "infra", "Local", "Management", "certs", "local-key.pem"), "key-marker");
    const provider = createProvider(fixture, {requestedEngine: undefined});

    const outcome = await provider();

    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.certificateIssues).toEqual([
      "Selfhost certificate path is not a file: infra/Local/Management/certs/local-cert.pem (directory).",
    ]);
  });

  it("reports no manifest issues when every required manifest is present", async () => {
    const fixture = await createInfrastructureFixture();
    const provider = createProvider(fixture, {requestedEngine: undefined});

    const outcome = await provider();

    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.manifestIssues).toEqual([]);
  });

  it("reports a bounded issue for every missing required manifest", async () => {
    const fixture = await createInfrastructureFixture({writeManifests: false});
    await writeFixtureFile(resolve(fixture.root, "tooling", "AppHost", "AppHost.csproj"), "manifest-marker");
    const provider = createProvider(fixture, {requestedEngine: undefined});

    const outcome = await provider();

    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.manifestIssues).toEqual([
      "Missing required manifest: infra/Local/Management/docker-compose.yml",
      "Missing required manifest: infra/Local/Storage/docker-compose.yml",
      "Missing required manifest: infra/Local/Backend/docker-compose.yml",
      "Missing required manifest: infra/Local/Frontend/docker-compose.yml",
    ]);
  });
});

// ============================================================================
// Environment isolation and timing
// ============================================================================

describe("createInfrastructureProvider environment isolation", () => {
  it("never forwards MSSQL_SA_PASSWORD to any diagnostic command it issues", async () => {
    const fixture = await createInfrastructureFixture();
    fixture.setResponse(runtimeVersionCommand("rancher"), commandResult({stdout: "Docker version 24.0.5\n"}));
    fixture.setResponse(composeVersionCommand("rancher"), commandResult({stdout: "Docker Compose version v2.23.0\n"}));
    fixture.setResponse(runtimeContextCommand("rancher"), commandResult({stdout: "rancher-desktop\n"}));
    fixture.setResponse(containerListCommand("rancher"), commandResult({stdout: ""}));
    const provider = createProvider(fixture, {
      requestedEngine: "rancher",
      env: {MSSQL_SA_PASSWORD: "super-secret-marker", KEEP_ME: "kept-value-marker"},
    });

    await provider();

    expect(fixture.run).toHaveBeenCalled();
    for (const call of fixture.run.mock.calls) {
      const options = call[1];
      expect(options?.env?.["MSSQL_SA_PASSWORD"]).toBeUndefined();
      expect(options?.env?.["KEEP_ME"]).toBe("kept-value-marker");
    }
  });
});

describe("createInfrastructureProvider timing", () => {
  it("reports elapsed duration from the injected monotonic clock", async () => {
    const fixture = await createInfrastructureFixture();
    const provider = createProvider(fixture, {requestedEngine: undefined, clock: clock()});

    const outcome = await provider();

    expect(outcome.durationMs).toBeGreaterThan(0);
  });
});

// ============================================================================
// resolveEngine precedence
// ============================================================================

describe("createInfrastructureProvider resolveEngine", () => {
  it("resolveEngine takes precedence over requestedEngine on each invocation", async () => {
    const fixture = await createInfrastructureFixture();
    fixture.setResponse(runtimeVersionCommand("podman"), commandResult({stdout: "podman version 4.9.0\n"}));
    fixture.setResponse(composeVersionCommand("podman"), commandResult({stdout: "podman-compose version 1.0.6\n"}));
    fixture.setResponse(runtimeContextCommand("podman"), commandResult({stdout: "[]\n"}));
    fixture.setResponse(containerListCommand("podman"), commandResult({stdout: ""}));

    const provider = createProvider(fixture, {
      requestedEngine: "rancher",
      resolveEngine: () => "podman",
    });

    const outcome = await provider();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.selectedEngine).toBe("podman");
    expect(facts.cliAvailable).toBe(true);
    // The rancher CLI should never have been probed since resolveEngine returned "podman".
    expect(fixture.run).not.toHaveBeenCalledWith(runtimeVersionCommand("rancher"), expect.anything());
  });

  it("resolveEngine is evaluated lazily on each provider invocation", async () => {
    const fixture = await createInfrastructureFixture();

    // Wire both engines' commands so either path can succeed.
    fixture.setResponse(runtimeVersionCommand("rancher"), commandResult({stdout: "Docker version 24.0.5\n"}));
    fixture.setResponse(composeVersionCommand("rancher"), commandResult({stdout: "Docker Compose version v2.23.0\n"}));
    fixture.setResponse(runtimeContextCommand("rancher"), commandResult({stdout: "rancher-desktop\n"}));
    fixture.setResponse(containerListCommand("rancher"), commandResult({stdout: ""}));
    fixture.setResponse(runtimeVersionCommand("podman"), commandResult({stdout: "podman version 4.9.0\n"}));
    fixture.setResponse(composeVersionCommand("podman"), commandResult({stdout: "podman-compose version 1.0.6\n"}));
    fixture.setResponse(runtimeContextCommand("podman"), commandResult({stdout: "[]\n"}));
    fixture.setResponse(containerListCommand("podman"), commandResult({stdout: ""}));

    let currentEngine: ContainerEngine = "rancher";
    const provider = createProvider(fixture, {
      resolveEngine: () => currentEngine,
    });

    // First invocation: resolveEngine returns "rancher".
    const first = await provider();
    expect(first.kind).toBe("available");
    expect((first as Readonly<{value: InfrastructureFacts}>).value.selectedEngine).toBe("rancher");

    // Update the closure's captured engine.
    currentEngine = "podman";

    // Second invocation: resolveEngine now returns "podman".
    const second = await provider();
    expect(second.kind).toBe("available");
    expect((second as Readonly<{value: InfrastructureFacts}>).value.selectedEngine).toBe("podman");
  });

  it("falls back to requestedEngine when resolveEngine returns undefined", async () => {
    const fixture = await createInfrastructureFixture();
    fixture.setResponse(runtimeVersionCommand("rancher"), commandResult({stdout: "Docker version 24.0.5\n"}));
    fixture.setResponse(composeVersionCommand("rancher"), commandResult({stdout: "Docker Compose version v2.23.0\n"}));
    fixture.setResponse(runtimeContextCommand("rancher"), commandResult({stdout: "rancher-desktop\n"}));
    fixture.setResponse(containerListCommand("rancher"), commandResult({stdout: ""}));

    const provider = createProvider(fixture, {
      requestedEngine: "rancher",
      resolveEngine: () => undefined,
    });

    const outcome = await provider();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Readonly<{value: InfrastructureFacts}>).value;
    expect(facts.selectedEngine).toBe("rancher");
    expect(facts.cliAvailable).toBe(true);
  });
});
