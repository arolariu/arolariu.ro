// @vitest-environment node
/**
 * @fileoverview Contract tests for shared read-only infrastructure inspection facts.
 * @module scripts/inspection/infrastructure.test
 */

import {mkdir, mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {afterEach, describe, expect, it, vi} from "vitest";

import type {CommandResult, CommandRunner, CommandSpec} from "../common/process.ts";
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

function commandResult(patch: Partial<CommandResult> = {}): CommandResult {
  return {code: 0, stdout: "", stderr: "", durationMs: 1, timedOut: false, ...patch};
}

function commandKey(command: Readonly<CommandSpec>, cwd?: string): string {
  return `${cwd ?? ""}\u0000${command.command}\u0000${JSON.stringify(command.args)}`;
}

function clock(): () => number {
  let current = 100;
  return () => {
    current += 5;
    return current;
  };
}

function runtimeVersionCommand(engine: ContainerEngine): CommandSpec {
  return engine === "rancher" ? {command: "docker", args: ["--version"]} : {command: "podman", args: ["--version"]};
}

function composeVersionCommand(engine: ContainerEngine): CommandSpec {
  return engine === "rancher" ? {command: "docker", args: ["compose", "version"]} : {command: "podman", args: ["compose", "version"]};
}

function runtimeContextCommand(engine: ContainerEngine): CommandSpec {
  return engine === "rancher"
    ? {command: "docker", args: ["context", "show"]}
    : {command: "podman", args: ["system", "connection", "list", "--format", "json"]};
}

function containerListCommand(engine: ContainerEngine): CommandSpec {
  return engine === "rancher"
    ? {command: "docker", args: ["ps", "-a", "--format", "{{json .}}"]}
    : {command: "podman", args: ["ps", "-a", "--format", "{{json .}}"]};
}

function runtimeInfoCommand(engine: ContainerEngine): CommandSpec {
  return engine === "rancher" ? {command: "docker", args: ["info"]} : {command: "podman", args: ["info", "--format", "json"]};
}

function portOwnersCommand(platform: NodeJS.Platform, ports: readonly number[] = [...requiredLocalPorts]): CommandSpec {
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
  readonly run: ReturnType<typeof vi.fn<CommandRunner["run"]>>;
  readonly setResponse: (command: Readonly<CommandSpec>, result: CommandResult) => void;
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

  const responses = new Map<string, CommandResult>();
  const setResponse = (command: Readonly<CommandSpec>, result: CommandResult): void => {
    responses.set(commandKey(command, paths.root), result);
  };

  const run = vi.fn<CommandRunner["run"]>(
    async (command, options): Promise<CommandResult> =>
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
    env?: Readonly<NodeJS.ProcessEnv>;
    platform?: NodeJS.Platform;
    now?: () => number;
  }> = {},
): ReturnType<typeof createInfrastructureProvider> {
  return createInfrastructureProvider({
    paths: fixture.paths,
    probes: createInspectionProbeRunner({run: fixture.run}),
    aggregate: overrides.aggregate ?? aggregateWithPortOwners([]),
    ...(overrides.requestedEngine === undefined ? {} : {requestedEngine: overrides.requestedEngine}),
    env: overrides.env ?? {},
    platform: overrides.platform ?? "linux",
    now: overrides.now ?? clock(),
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
    const provider = createProvider(fixture, {requestedEngine: undefined, now: clock()});

    const outcome = await provider();

    expect(outcome.durationMs).toBeGreaterThan(0);
  });
});
