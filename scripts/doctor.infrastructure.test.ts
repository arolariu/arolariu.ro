// @vitest-environment node
/**
 * @fileoverview Contract tests for read-only infrastructure diagnostics.
 * @module scripts.doctor.infrastructure.test
 */

import {mkdir, mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {afterEach, describe, expect, it, vi, type Mock} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import type {CommandResult, CommandSpec} from "./common/process.ts";
import {createRepositoryPaths} from "./common/repository-paths.ts";
import type {RepositoryRequirements} from "./common/requirements.ts";
import {requiredLocalPorts} from "./container-runtime/preflight.ts";
import {buildPortOwnerProbe, classifyContainerFailure, infrastructureDoctorModule} from "./doctor.infrastructure.ts";
import {createDoctorReport} from "./doctor.reporter.ts";
import {
  createPortOwnerProbeCommand,
  type DiagnosticCommandRunner,
  type DiagnosticNetworkResult,
  type DoctorContext,
  type DoctorRunOptions,
} from "./doctor.types.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";

const fixtureRoots: string[] = [];

const validRequirements: RepositoryRequirements = {
  node: {major: 24, minor: 0, patch: 0},
  npm: {major: 11, minor: 0, patch: 0},
  dotnet: {major: 10, minor: 0, patch: 0},
  python: {major: 3, minor: 12, patch: 0},
  packages: new Map(),
};

const STABLE_INFRASTRUCTURE_IDS = [
  "infrastructure.selection",
  "infrastructure.cli",
  "infrastructure.backend",
  "infrastructure.compose",
  "infrastructure.docker-conflict",
  "infrastructure.socket-context",
  "infrastructure.ports",
  "infrastructure.certificates",
  "infrastructure.manifests",
  "infrastructure.containers",
] as const;

const REQUIRED_MANIFEST_RELATIVE_SEGMENTS: readonly (readonly string[])[] = [
  ["tooling", "AppHost", "AppHost.csproj"],
  ["infra", "Local", "Management", "docker-compose.yml"],
  ["infra", "Local", "Storage", "docker-compose.yml"],
  ["infra", "Local", "Backend", "docker-compose.yml"],
  ["infra", "Local", "Frontend", "docker-compose.yml"],
];
const CERT_RELATIVE_SEGMENTS = ["infra", "Local", "Management", "certs", "local-cert.pem"];
const KEY_RELATIVE_SEGMENTS = ["infra", "Local", "Management", "certs", "local-key.pem"];

function commandResult(patch: Partial<CommandResult> = {}): CommandResult {
  return {
    code: 0,
    stdout: "",
    stderr: "",
    durationMs: 4,
    timedOut: false,
    ...patch,
  };
}

function commandKey(command: Readonly<CommandSpec>, cwd?: string): string {
  return `${cwd ?? ""}\u0000${command.command}\u0000${JSON.stringify(command.args)}`;
}

function doctorOptions(patch: Partial<DoctorRunOptions> = {}): DoctorRunOptions {
  return {
    verbose: false,
    quick: false,
    ...patch,
  };
}

async function writeFixtureFile(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, contents, "utf8");
}

function containerListLine(input: Readonly<{name: string; state: string; status?: string; ports?: string}>): string {
  // Real Docker `ps -a --format {{json .}}` output never mirrors `Status` from `State`: `Status`
  // is a distinct human-readable field (for example `"Up 3 hours"` or `"Exited (0) 2 hours ago"`)
  // that can additionally carry health-check evidence (for example `"Up 3 hours (unhealthy)"`).
  const defaultStatus = input.state.toLowerCase() === "running" ? "Up 3 hours" : "Exited (0) 2 hours ago";
  return JSON.stringify({Names: input.name, State: input.state, Status: input.status ?? defaultStatus, Ports: input.ports ?? ""});
}

/**
 * Builds one real Podman `ps -a --format {{json .}}` JSON line.
 *
 * Podman's shape materially differs from Docker's: `Names` is a JSON array of strings (not a
 * single comma-joined string) and `Ports` is a JSON array of port-mapping objects (not a single
 * human-readable string), each carrying `host_ip`/`container_port`/`host_port`/`protocol` fields.
 */
function podmanContainerListLine(
  input: Readonly<{
    names: readonly string[];
    state: string;
    status?: string;
    ports?: readonly Readonly<{hostIp?: string; containerPort: number; hostPort: number; protocol?: string}>[];
  }>,
): string {
  const defaultStatus = input.state.toLowerCase() === "running" ? "Up 3 hours" : "Exited (0) 2 hours ago";
  return JSON.stringify({
    Command: ["/entrypoint.sh"],
    CreatedAt: "2026-08-29 10:00:00 +0000 UTC",
    Id: "a1b2c3d4e5f6",
    Image: "docker.io/library/redis:7",
    Labels: {},
    Names: input.names,
    Pid: 4242,
    Pod: "",
    PodName: "",
    Ports: (input.ports ?? []).map((port) => ({
      host_ip: port.hostIp ?? "0.0.0.0",
      container_port: port.containerPort,
      host_port: port.hostPort,
      range: 1,
      protocol: port.protocol ?? "tcp",
    })),
    Size: null,
    StartedAt: 1756468800,
    State: input.state,
    Status: input.status ?? defaultStatus,
  });
}

interface InfrastructureFixture {
  readonly root: string;
  readonly context: DoctorContext;
  readonly run: Mock<DiagnosticCommandRunner["run"]>;
  readonly setResponse: (command: Readonly<CommandSpec>, result: CommandResult, cwd?: string) => void;
}

async function createInfrastructureFixture(
  input: Readonly<{
    options?: Partial<DoctorRunOptions>;
    platform?: NodeJS.Platform;
    env?: Readonly<NodeJS.ProcessEnv>;
    /** Pass `null` to omit the local tooling configuration file entirely. */
    toolingConfig?: string | null;
    createManifests?: boolean;
    createCertificates?: boolean;
  }> = {},
): Promise<InfrastructureFixture> {
  const root = await mkdtemp(join(tmpdir(), "arolariu-doctor-infrastructure-"));
  fixtureRoots.push(root);
  const paths = createRepositoryPaths(root);

  if (input.createManifests !== false) {
    await Promise.all(REQUIRED_MANIFEST_RELATIVE_SEGMENTS.map((segments) => writeFixtureFile(resolve(root, ...segments), "manifest\n")));
  }
  if (input.createCertificates !== false) {
    await Promise.all([
      writeFixtureFile(resolve(root, ...CERT_RELATIVE_SEGMENTS), "cert\n"),
      writeFixtureFile(resolve(root, ...KEY_RELATIVE_SEGMENTS), "key\n"),
    ]);
  }
  if (input.toolingConfig !== null) {
    await writeFixtureFile(paths.toolingConfig, input.toolingConfig ?? JSON.stringify({schemaVersion: 1}));
  }

  const responses = new Map<string, CommandResult>();
  const setResponse = (command: Readonly<CommandSpec>, result: CommandResult, cwd = root): void => {
    responses.set(commandKey(command, cwd), result);
  };

  const run = vi.fn<DiagnosticCommandRunner["run"]>(
    async (command: Readonly<CommandSpec>, options): Promise<CommandResult> =>
      responses.get(commandKey(command, options?.cwd))
      ?? commandResult({code: 127, spawnError: `Unexpected command ${command.command} ${command.args.join(" ")}`}),
  );
  const runner: DiagnosticCommandRunner = {run};
  const sink = new InMemoryLoggerSink();
  let now = 0;
  const context: DoctorContext = {
    options: doctorOptions(input.options),
    paths,
    requirements: {status: "valid", requirements: validRequirements},
    runner,
    network: {
      get: vi.fn(async (): Promise<DiagnosticNetworkResult> => ({status: "reachable", statusCode: 200, durationMs: 1})),
    },
    logger: new MonorepositoryConsoleLogger("doctor::infrastructure", {color: false, sink}),
    platform: input.platform ?? "linux",
    arch: "x64",
    env: input.env ?? {},
    now: () => ++now,
    inspection: {
      inspect: async () => ({kind: "unavailable" as const, reason: "test", durationMs: 0}),
      invalidate: () => {},
      updateInfrastructureEngine: () => {},
    } as RepositoryInspectionSession,
    probes: {
      run: vi.fn(async () => {
        throw new Error("Probe runner should not be invoked by infrastructure tests.");
      }),
    },
  };

  return {root, context, run, setResponse};
}

function seedHealthyRancherResponses(fixture: InfrastructureFixture): void {
  fixture.setResponse({command: "docker", args: ["--version"]}, commandResult({stdout: "Docker version 27.3.1, build abc123\n"}));
  fixture.setResponse({command: "docker", args: ["info"]}, commandResult({stdout: "Server:\n Version: 27.3.1\n"}));
  fixture.setResponse({command: "docker", args: ["compose", "version"]}, commandResult({stdout: "Docker Compose version v2.29.7\n"}));
  fixture.setResponse(
    {command: "docker", args: ["version"]},
    commandResult({stdout: "Client:\n Version: 27.3.1\nServer:\n Version: 27.3.1\n"}),
  );
  fixture.setResponse({command: "docker", args: ["context", "show"]}, commandResult({stdout: "rancher-desktop\n"}));
  fixture.setResponse({command: "docker", args: ["ps", "-a", "--format", "{{json .}}"]}, commandResult({stdout: ""}));
  fixture.setResponse(createPortOwnerProbeCommand(fixture.context.platform, requiredLocalPorts), commandResult({stdout: ""}));
  fixture.setResponse({command: "mkcert", args: ["--version"]}, commandResult({code: 127, spawnError: "ENOENT"}));
}

function seedHealthyPodmanResponses(fixture: InfrastructureFixture): void {
  fixture.setResponse({command: "podman", args: ["--version"]}, commandResult({stdout: "podman version 5.8.2\n"}));
  fixture.setResponse(
    {command: "podman", args: ["info", "--format", "json"]},
    commandResult({stdout: JSON.stringify({host: {os: "linux"}})}),
  );
  fixture.setResponse(
    {command: "podman", args: ["compose", "version"]},
    commandResult({stdout: "podman version 5.8.2\npodman-compose version 1.5.0\n"}),
  );
  fixture.setResponse({command: "podman", args: ["system", "connection", "list", "--format", "json"]}, commandResult({stdout: "[]\n"}));
  fixture.setResponse({command: "podman", args: ["machine", "list", "--format", "json"]}, commandResult({stdout: "[]\n"}));
  fixture.setResponse({command: "podman", args: ["ps", "-a", "--format", "{{json .}}"]}, commandResult({stdout: ""}));
  fixture.setResponse(createPortOwnerProbeCommand(fixture.context.platform, requiredLocalPorts), commandResult({stdout: ""}));
  fixture.setResponse({command: "mkcert", args: ["--version"]}, commandResult({code: 127, spawnError: "ENOENT"}));
}

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map((root) => rm(root, {recursive: true, force: true})));
});

describe("buildPortOwnerProbe", () => {
  it("matches the shared factory command for every supported platform", () => {
    for (const platform of ["win32", "darwin", "linux"] as const) {
      expect(buildPortOwnerProbe(platform, [3000, 5000])).toEqual(createPortOwnerProbeCommand(platform, [3000, 5000]));
    }
  });

  it("returns null for an unsupported platform", () => {
    expect(buildPortOwnerProbe("aix", [3000])).toBeNull();
  });

  it("returns null for an empty port list", () => {
    expect(buildPortOwnerProbe("linux", [])).toBeNull();
  });

  it("returns null for an out-of-range port", () => {
    expect(buildPortOwnerProbe("linux", [70_000])).toBeNull();
    expect(buildPortOwnerProbe("linux", [0])).toBeNull();
  });
});

describe("classifyContainerFailure", () => {
  it("identifies a missing CLI with a single root cause", () => {
    const classification = classifyContainerFailure({
      engine: "rancher",
      cli: commandResult({code: 127, spawnError: "ENOENT"}),
    });

    expect(classification.rootCause).toMatch(/not installed|not on PATH/u);
    expect(classification.potentialCauses).toEqual([]);
    expect(classification.fixes.length).toBeGreaterThan(0);
  });

  it("identifies a Docker Desktop conflict for the Rancher engine", () => {
    const classification = classifyContainerFailure({
      engine: "rancher",
      cli: commandResult({stdout: "Docker version 27.3.1\n"}),
      backend: commandResult({stdout: "Server:\n Version: 27.3.1\n Name: Docker Desktop\n"}),
    });

    expect(classification.rootCause).toMatch(/Docker Desktop/u);
    expect(classification.potentialCauses).toEqual([]);
  });

  it("identifies a Podman Compose delegated to Docker Desktop", () => {
    const classification = classifyContainerFailure({
      engine: "podman",
      cli: commandResult({stdout: "podman version 5.8.2\n"}),
      compose: commandResult({
        stdout: 'Executing external compose provider "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker-compose.exe"\n',
      }),
    });

    expect(classification.rootCause).toMatch(/delegated/u);
  });

  it("falls back to ambiguous potential causes for an unrecognized failure", () => {
    const classification = classifyContainerFailure({
      engine: "rancher",
      cli: commandResult({stdout: "Docker version 27.3.1\n"}),
      backend: commandResult({code: 1, stderr: "Cannot connect to the Docker daemon. Is the docker daemon running?"}),
    });

    expect(classification.rootCause).toBeUndefined();
    expect(classification.potentialCauses.length).toBeGreaterThan(0);
    expect(classification.fixes.length).toBeGreaterThan(0);
  });

  it("classifies a non-missing CLI probe failure as a CLI probe failure, not a stopped daemon or socket diagnosis", () => {
    const classification = classifyContainerFailure({
      engine: "rancher",
      cli: commandResult({code: 1, timedOut: true, stdout: "", stderr: ""}),
    });

    expect(classification.rootCause).toMatch(/failed, timed out, or was terminated/u);
    expect(classification.rootCause?.toLowerCase()).not.toContain("backend is not running");
    expect(classification.rootCause?.toLowerCase()).not.toContain("socket");
    expect(classification.potentialCauses).toEqual([]);
  });

  it("does not classify a genuinely failed backend probe (cli already successful) as a CLI probe failure", () => {
    const classification = classifyContainerFailure({
      engine: "podman",
      cli: commandResult({stdout: "podman version 5.8.2\n"}),
      backend: commandResult({code: 1, stderr: "Cannot connect to the Podman socket."}),
    });

    // This must fall through to the ambiguous backend/socket fallback, not the CLI-probe-failure
    // branch, because the CLI itself succeeded.
    expect(classification.rootCause).toBeUndefined();
    expect(classification.potentialCauses.some((cause) => /backend is not running/u.test(cause.cause))).toBe(true);
  });
});

describe("infrastructureDoctorModule", () => {
  it("returns every stable infrastructure check in order for a healthy Rancher baseline", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}});
    seedHealthyRancherResponses(fixture);

    const results = await infrastructureDoctorModule.run(fixture.context);

    expect(results.map(({id}) => id)).toEqual(STABLE_INFRASTRUCTURE_IDS);
    expect(results.every(({module}) => module === "infrastructure")).toBe(true);
    expect(results.find(({id}) => id === "infrastructure.selection")?.status).toBe("pass");
    expect(results.find(({id}) => id === "infrastructure.cli")?.status).toBe("pass");
    expect(results.find(({id}) => id === "infrastructure.backend")?.status).toBe("pass");
    expect(results.find(({id}) => id === "infrastructure.compose")?.status).toBe("pass");
    expect(results.find(({id}) => id === "infrastructure.docker-conflict")?.status).toBe("pass");
    expect(results.find(({id}) => id === "infrastructure.socket-context")?.status).toBe("skipped");
    expect(results.find(({id}) => id === "infrastructure.ports")?.status).toBe("pass");
    expect(results.find(({id}) => id === "infrastructure.certificates")?.status).toBe("pass");
    expect(results.find(({id}) => id === "infrastructure.manifests")?.status).toBe("pass");
    expect(results.find(({id}) => id === "infrastructure.containers")?.status).toBe("pass");

    expect(() => createDoctorReport(results, new Date().toISOString())).not.toThrow();

    // Regression proof: the healthy, non-verbose default path must derive the docker-conflict
    // outcome from the already-captured `docker info` evidence and must never dispatch a
    // redundant `docker version` follow-up.
    expect(fixture.run.mock.calls.some(([command]) => command.command === "docker" && command.args[0] === "version")).toBe(false);
  });

  it("returns every stable infrastructure check in order for a healthy Podman baseline", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "podman"}});
    seedHealthyPodmanResponses(fixture);

    const results = await infrastructureDoctorModule.run(fixture.context);

    expect(results.map(({id}) => id)).toEqual(STABLE_INFRASTRUCTURE_IDS);
    expect(results.every((result) => result.status === "pass" || result.id === "infrastructure.socket-context")).toBe(true);
    expect(results.find(({id}) => id === "infrastructure.socket-context")?.status).toBe("skipped");

    expect(() => createDoctorReport(results, new Date().toISOString())).not.toThrow();
  });

  it("resolves the engine from persisted local tooling configuration when no environment override exists", async () => {
    const fixture = await createInfrastructureFixture({
      toolingConfig: JSON.stringify({schemaVersion: 1, containerEngine: "podman"}),
    });
    seedHealthyPodmanResponses(fixture);

    const results = await infrastructureDoctorModule.run(fixture.context);

    const selection = results.find(({id}) => id === "infrastructure.selection");
    expect(selection?.status).toBe("pass");
    expect(selection?.evidence.join("\n")).toContain("configuration");
    expect(results.find(({id}) => id === "infrastructure.cli")?.status).toBe("pass");
  });

  it("fails selection and skips every engine-dependent check when no engine is selected", async () => {
    const fixture = await createInfrastructureFixture({toolingConfig: null});

    const results = await infrastructureDoctorModule.run(fixture.context);

    expect(results.map(({id}) => id)).toEqual(STABLE_INFRASTRUCTURE_IDS);
    const selection = results.find(({id}) => id === "infrastructure.selection");
    expect(selection?.status).toBe("fail");
    expect(selection?.fixes.some((fix) => fix.command === "npm run setup")).toBe(true);

    for (const id of [
      "infrastructure.cli",
      "infrastructure.backend",
      "infrastructure.compose",
      "infrastructure.docker-conflict",
      "infrastructure.socket-context",
      "infrastructure.containers",
    ]) {
      expect(results.find((result) => result.id === id)?.status).toBe("skipped");
    }

    // Host-level, engine-independent checks still run.
    expect(results.find(({id}) => id === "infrastructure.certificates")?.status).toBe("pass");
    expect(results.find(({id}) => id === "infrastructure.manifests")?.status).toBe("pass");

    expect(() => createDoctorReport(results, new Date().toISOString())).not.toThrow();
  });

  it("fails selection with an invalid-configuration root cause (not a 'no selection' root cause) for an unsupported engine value", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "docker"}});

    const results = await infrastructureDoctorModule.run(fixture.context);

    const selection = results.find(({id}) => id === "infrastructure.selection");
    expect(selection?.status).toBe("fail");
    expect(selection?.rootCause).toMatch(/invalid|unsupported|deprecated/iu);
    expect(selection?.rootCause?.toLowerCase()).not.toContain("no container engine is selected");
    expect(selection?.evidence.join("\n")).toMatch(/deprecated/iu);
  });

  it("warns selection when persisted local tooling configuration is invalid but the environment resolves an engine", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      toolingConfig: "{not-valid-json",
    });
    seedHealthyRancherResponses(fixture);

    const results = await infrastructureDoctorModule.run(fixture.context);

    const selection = results.find(({id}) => id === "infrastructure.selection");
    expect(selection?.status).toBe("warn");
    expect(selection?.evidence.join("\n")).toContain("Local tooling configuration");
  });

  it("fails the CLI check and skips downstream engine checks when the docker executable is missing", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}});
    seedHealthyRancherResponses(fixture);
    fixture.setResponse({command: "docker", args: ["--version"]}, commandResult({code: 127, spawnError: "ENOENT"}));

    const results = await infrastructureDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "infrastructure.cli")?.status).toBe("fail");
    for (const id of [
      "infrastructure.backend",
      "infrastructure.compose",
      "infrastructure.docker-conflict",
      "infrastructure.socket-context",
      "infrastructure.containers",
    ]) {
      const result = results.find((entry) => entry.id === id);
      expect(result?.status).toBe("skipped");
    }
  });

  it("classifies a timed-out (present) docker CLI as a CLI probe failure, not a stopped daemon diagnosis", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}});
    seedHealthyRancherResponses(fixture);
    fixture.setResponse({command: "docker", args: ["--version"]}, commandResult({code: 1, timedOut: true}));

    const results = await infrastructureDoctorModule.run(fixture.context);

    const cli = results.find(({id}) => id === "infrastructure.cli");
    expect(cli?.status).toBe("fail");
    expect(cli?.rootCause).toMatch(/failed, timed out, or was terminated/u);
    expect(cli?.rootCause?.toLowerCase()).not.toContain("not installed");
    expect(cli?.rootCause?.toLowerCase()).not.toContain("backend is not running");
  });

  it("decouples a stopped backend from Compose availability and marks the backend failure ambiguous", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}});
    seedHealthyRancherResponses(fixture);
    fixture.setResponse(
      {command: "docker", args: ["info"]},
      commandResult({code: 1, stderr: "Cannot connect to the Docker daemon. Is the docker daemon running?"}),
    );
    fixture.setResponse(
      {command: "docker", args: ["version"]},
      commandResult({code: 1, stderr: "Cannot connect to the Docker daemon. Is the docker daemon running?"}),
    );

    const results = await infrastructureDoctorModule.run(fixture.context);

    const backend = results.find(({id}) => id === "infrastructure.backend");
    expect(backend?.status).toBe("fail");
    expect(backend?.rootCause).toBeUndefined();
    expect(backend?.potentialCauses.length).toBeGreaterThan(0);

    expect(results.find(({id}) => id === "infrastructure.compose")?.status).toBe("pass");
    expect(results.find(({id}) => id === "infrastructure.docker-conflict")?.status).toBe("warn");
    // Backend/compose evidence should still trigger follow-up socket/context probing.
    expect(results.find(({id}) => id === "infrastructure.socket-context")?.status).toBe("pass");
    // Regression proof: a backend failure must trigger the docker-conflict follow-up dispatch.
    expect(fixture.run.mock.calls.some(([command]) => command.command === "docker" && command.args[0] === "version")).toBe(true);
  });

  it("derives a Docker Desktop conflict from already-captured docker info evidence without a docker version follow-up on the healthy default path", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}});
    seedHealthyRancherResponses(fixture);
    fixture.setResponse(
      {command: "docker", args: ["info"]},
      commandResult({stdout: "Server:\n Version: 27.3.1\n Operating System: Docker Desktop\n"}),
    );

    const results = await infrastructureDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "infrastructure.backend")?.status).toBe("pass");
    const conflict = results.find(({id}) => id === "infrastructure.docker-conflict");
    expect(conflict?.status).toBe("fail");
    expect(conflict?.rootCause).toMatch(/Docker Desktop/u);
    expect(fixture.run.mock.calls.some(([command]) => command.command === "docker" && command.args[0] === "version")).toBe(false);
  });

  it("dispatches a docker version follow-up under --verbose even on an otherwise healthy default path", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      options: {verbose: true},
    });
    seedHealthyRancherResponses(fixture);

    const results = await infrastructureDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "infrastructure.docker-conflict")?.status).toBe("pass");
    expect(fixture.run.mock.calls.some(([command]) => command.command === "docker" && command.args[0] === "version")).toBe(true);
  });

  it("fails docker-conflict from a triggered docker version follow-up when Docker Desktop answers instead of Rancher Desktop", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      options: {verbose: true},
    });
    seedHealthyRancherResponses(fixture);
    fixture.setResponse(
      {command: "docker", args: ["version"]},
      commandResult({stdout: "Client:\n Version: 27.3.1\nServer: Docker Desktop\n Version: 27.3.1\n"}),
    );

    const results = await infrastructureDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "infrastructure.backend")?.status).toBe("pass");
    const conflict = results.find(({id}) => id === "infrastructure.docker-conflict");
    expect(conflict?.status).toBe("fail");
    expect(conflict?.rootCause).toMatch(/Docker Desktop/u);
  });

  it("fails docker-conflict when Podman Compose is delegated to Docker Desktop while Compose itself still succeeds", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "podman"}});
    seedHealthyPodmanResponses(fixture);
    fixture.setResponse(
      {command: "podman", args: ["compose", "version"]},
      commandResult({
        stdout: 'Executing external compose provider "/Applications/Docker.app/Contents/Resources/cli-plugins/docker-compose"\n',
      }),
    );

    const results = await infrastructureDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "infrastructure.compose")?.status).toBe("pass");
    const conflict = results.find(({id}) => id === "infrastructure.docker-conflict");
    expect(conflict?.status).toBe("fail");
    expect(conflict?.rootCause).toMatch(/delegated/u);
  });

  it("forces socket/context evidence collection under --verbose even when backend and Compose already pass", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      options: {verbose: true},
    });
    seedHealthyRancherResponses(fixture);

    const results = await infrastructureDoctorModule.run(fixture.context);

    const socketContext = results.find(({id}) => id === "infrastructure.socket-context");
    expect(socketContext?.status).toBe("pass");
    expect(socketContext?.evidence.length).toBeGreaterThan(0);
  });

  it("builds the exact port owner probe for the active platform", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}, platform: "linux"});
    seedHealthyRancherResponses(fixture);

    await infrastructureDoctorModule.run(fixture.context);

    const expectedCommand = createPortOwnerProbeCommand("linux", requiredLocalPorts);
    expect(
      fixture.run.mock.calls.some(
        ([command]) => command.command === expectedCommand.command && JSON.stringify(command.args) === JSON.stringify(expectedCommand.args),
      ),
    ).toBe(true);
  });

  it("warns that the known local stack already occupies a required port", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}, platform: "linux"});
    seedHealthyRancherResponses(fixture);
    const port = requiredLocalPorts[0] as number;
    fixture.setResponse(
      createPortOwnerProbeCommand("linux", requiredLocalPorts),
      commandResult({
        stdout: `LISTEN 0      4096      0.0.0.0:${String(port)}      0.0.0.0:*      users:(("docker-proxy",pid=4242,fd=7))\n`,
      }),
    );
    fixture.setResponse(
      {command: "docker", args: ["ps", "-a", "--format", "{{json .}}"]},
      commandResult({
        stdout: containerListLine({name: "website-arolariu-ro", state: "running", ports: `0.0.0.0:${String(port)}->${String(port)}/tcp`}),
      }),
    );

    const results = await infrastructureDoctorModule.run(fixture.context);

    const ports = results.find(({id}) => id === "infrastructure.ports");
    expect(ports?.status).toBe("warn");
    expect(ports?.rootCause).toMatch(/already running/u);
  });

  it("fails when an unrelated process occupies a required port", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}, platform: "linux"});
    seedHealthyRancherResponses(fixture);
    const port = requiredLocalPorts[0] as number;
    fixture.setResponse(
      createPortOwnerProbeCommand("linux", requiredLocalPorts),
      commandResult({stdout: `LISTEN 0      4096      0.0.0.0:${String(port)}      0.0.0.0:*      users:(("java",pid=9001,fd=11))\n`}),
    );

    const results = await infrastructureDoctorModule.run(fixture.context);

    const ports = results.find(({id}) => id === "infrastructure.ports");
    expect(ports?.status).toBe("fail");
    expect(ports?.evidence.join("\n")).toContain("9001");
    expect(ports?.evidence.join("\n")).toContain("java");
  });

  it("warns about port ownership when the probe reports a permission or tool limitation", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}, platform: "linux"});
    seedHealthyRancherResponses(fixture);
    fixture.setResponse(createPortOwnerProbeCommand("linux", requiredLocalPorts), commandResult({code: 1, stderr: "Permission denied"}));

    const results = await infrastructureDoctorModule.run(fixture.context);

    const ports = results.find(({id}) => id === "infrastructure.ports");
    expect(ports?.status).toBe("warn");
    expect(ports?.potentialCauses.length).toBeGreaterThan(0);
  });

  it("retains an earlier macOS lsof -Fpcn owner despite the loop's expected trailing no-match exit 1", async () => {
    // The macOS probe script runs one `lsof` invocation per port in a shell loop without
    // `set -e`. `lsof` exits 1 for any port with no listener, so if the *last* requested port
    // has no listener the whole `sh -c` invocation's exit code is 1 even though an *earlier*
    // port's `lsof` invocation already produced valid, flushed stdout. That benign shape (exit
    // 1, no stderr, no timeout, no spawn error) must not discard the earlier owner's evidence.
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}, platform: "darwin"});
    seedHealthyRancherResponses(fixture);
    fixture.setResponse(
      createPortOwnerProbeCommand("darwin", requiredLocalPorts),
      commandResult({code: 1, stdout: "p4242\ncjava\nn*:3000\n", stderr: ""}),
    );

    const results = await infrastructureDoctorModule.run(fixture.context);

    const ports = results.find(({id}) => id === "infrastructure.ports");
    expect(ports?.status).toBe("fail");
    expect(ports?.evidence.join("\n")).toContain("4242");
    expect(ports?.evidence.join("\n")).toContain("java");
  });

  it("treats an all-free macOS lsof exit 1 with empty stdout as evidence that every required port is free", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}, platform: "darwin"});
    seedHealthyRancherResponses(fixture);
    fixture.setResponse(createPortOwnerProbeCommand("darwin", requiredLocalPorts), commandResult({code: 1, stdout: "", stderr: ""}));

    const results = await infrastructureDoctorModule.run(fixture.context);

    const ports = results.find(({id}) => id === "infrastructure.ports");
    expect(ports?.status).toBe("pass");
  });

  it("still warns for a genuine macOS lsof tool/permission error sharing the same exit code as the benign no-match shape", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}, platform: "darwin"});
    seedHealthyRancherResponses(fixture);
    fixture.setResponse(
      createPortOwnerProbeCommand("darwin", requiredLocalPorts),
      commandResult({code: 1, stdout: "", stderr: "lsof: command not found"}),
    );

    const results = await infrastructureDoctorModule.run(fixture.context);

    const ports = results.find(({id}) => id === "infrastructure.ports");
    expect(ports?.status).toBe("warn");
    expect(ports?.potentialCauses.length).toBeGreaterThan(0);
  });

  it("resolves Windows port owners by combining the port probe with a process list probe", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}, platform: "win32"});
    seedHealthyRancherResponses(fixture);
    const port = requiredLocalPorts[0] as number;
    fixture.setResponse(
      createPortOwnerProbeCommand("win32", requiredLocalPorts),
      commandResult({stdout: JSON.stringify({LocalAddress: "0.0.0.0", LocalPort: port, OwningProcess: 4242})}),
    );
    fixture.setResponse(
      {
        command: "powershell",
        args: ["-NoProfile", "-NonInteractive", "-Command", "Get-Process | Select-Object Id, ProcessName, Path | ConvertTo-Json -Compress"],
      },
      commandResult({stdout: JSON.stringify([{Id: 4242, ProcessName: "node", Path: "C:\\Program Files\\nodejs\\node.exe"}])}),
    );

    const results = await infrastructureDoctorModule.run(fixture.context);

    const ports = results.find(({id}) => id === "infrastructure.ports");
    expect(ports?.status).toBe("fail");
    expect(ports?.evidence.join("\n")).toContain("node");
    expect(ports?.evidence.join("\n")).toContain("4242");
  });

  it("warns when selfhost TLS certificates are missing", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      createCertificates: false,
    });
    seedHealthyRancherResponses(fixture);

    const results = await infrastructureDoctorModule.run(fixture.context);

    const certificates = results.find(({id}) => id === "infrastructure.certificates");
    expect(certificates?.status).toBe("warn");
    expect(certificates?.evidence.join("\n")).toContain("local-cert.pem");
  });

  it("performs bounded mkcert probing when both certificates and mkcert are present", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}});
    seedHealthyRancherResponses(fixture);
    fixture.setResponse({command: "mkcert", args: ["--version"]}, commandResult({stdout: "v1.4.4\n"}));
    fixture.setResponse({command: "mkcert", args: ["-CAROOT"]}, commandResult({stdout: "/home/dev/.local/share/mkcert\n"}));

    const results = await infrastructureDoctorModule.run(fixture.context);

    const certificates = results.find(({id}) => id === "infrastructure.certificates");
    expect(certificates?.status).toBe("pass");
    expect(certificates?.evidence.join("\n")).toContain("mkcert");
  });

  it("fails manifests when a required runtime manifest is missing", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      createManifests: false,
    });
    seedHealthyRancherResponses(fixture);
    await Promise.all(
      REQUIRED_MANIFEST_RELATIVE_SEGMENTS.slice(1).map((segments) => writeFixtureFile(resolve(fixture.root, ...segments), "manifest\n")),
    );

    const results = await infrastructureDoctorModule.run(fixture.context);

    const manifests = results.find(({id}) => id === "infrastructure.manifests");
    expect(manifests?.status).toBe("fail");
    expect(manifests?.evidence.join("\n")).toContain("AppHost.csproj");
  });

  it("passes containers when no known local containers are present", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}});
    seedHealthyRancherResponses(fixture);

    const results = await infrastructureDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "infrastructure.containers")?.status).toBe("pass");
  });

  it("passes containers when known containers are present and running", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}});
    seedHealthyRancherResponses(fixture);
    fixture.setResponse(
      {command: "docker", args: ["ps", "-a", "--format", "{{json .}}"]},
      commandResult({
        stdout: [containerListLine({name: "mssql", state: "running"}), containerListLine({name: "redis", state: "running"})].join("\n"),
      }),
    );

    const results = await infrastructureDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "infrastructure.containers")?.status).toBe("pass");
  });

  it("warns containers when a known container is stopped or stale", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}});
    seedHealthyRancherResponses(fixture);
    fixture.setResponse(
      {command: "docker", args: ["ps", "-a", "--format", "{{json .}}"]},
      commandResult({stdout: containerListLine({name: "mssql", state: "exited"})}),
    );

    const results = await infrastructureDoctorModule.run(fixture.context);

    const containers = results.find(({id}) => id === "infrastructure.containers");
    expect(containers?.status).toBe("warn");
    expect(containers?.evidence.join("\n")).toContain("mssql");
  });

  it("warns (does not PASS) a known Docker container that is running but reports an unhealthy Status", async () => {
    // `Status` is a distinct field from `State` and must never be inferred by mirroring `State`:
    // Docker's real `Status` string carries health-check evidence (for example
    // `"Up 3 hours (unhealthy)"`) that `State: running` alone cannot reveal.
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}});
    seedHealthyRancherResponses(fixture);
    fixture.setResponse(
      {command: "docker", args: ["ps", "-a", "--format", "{{json .}}"]},
      commandResult({stdout: containerListLine({name: "mssql", state: "running", status: "Up 3 hours (unhealthy)"})}),
    );

    const results = await infrastructureDoctorModule.run(fixture.context);

    const containers = results.find(({id}) => id === "infrastructure.containers");
    expect(containers?.status).not.toBe("pass");
    expect(containers?.status).toBe("warn");
    expect(containers?.evidence.join("\n")).toContain("unhealthy");
  });

  it("recognizes a real Podman-shaped container record (array Names, port-mapping objects) and classifies its required host port as known-stack WARN, not unrelated FAIL", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "podman"}, platform: "linux"});
    seedHealthyPodmanResponses(fixture);
    const port = requiredLocalPorts.find((candidate) => candidate === 6379) as number;
    fixture.setResponse(
      {command: "podman", args: ["ps", "-a", "--format", "{{json .}}"]},
      commandResult({
        stdout: podmanContainerListLine({
          names: ["redis"],
          state: "running",
          ports: [{containerPort: 6379, hostPort: port}],
        }),
      }),
    );
    fixture.setResponse(
      createPortOwnerProbeCommand("linux", requiredLocalPorts),
      commandResult({stdout: `LISTEN 0      4096      0.0.0.0:${String(port)}      0.0.0.0:*      users:(("podman",pid=4242,fd=7))\n`}),
    );

    const results = await infrastructureDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "infrastructure.containers")?.status).toBe("pass");
    const ports = results.find(({id}) => id === "infrastructure.ports");
    expect(ports?.status).toBe("warn");
    expect(ports?.status).not.toBe("fail");
    expect(ports?.rootCause).toMatch(/already running/u);
  });

  it("recognizes a real Podman-shaped stale (non-running) known container", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "podman"}});
    seedHealthyPodmanResponses(fixture);
    fixture.setResponse(
      {command: "podman", args: ["ps", "-a", "--format", "{{json .}}"]},
      commandResult({
        stdout: podmanContainerListLine({names: ["mssql"], state: "exited", ports: []}),
      }),
    );

    const results = await infrastructureDoctorModule.run(fixture.context);

    const containers = results.find(({id}) => id === "infrastructure.containers");
    expect(containers?.status).toBe("warn");
    expect(containers?.evidence.join("\n")).toContain("mssql");
  });

  it("tolerates a malformed container listing line alongside a well-formed one", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}});
    seedHealthyRancherResponses(fixture);
    fixture.setResponse(
      {command: "docker", args: ["ps", "-a", "--format", "{{json .}}"]},
      commandResult({stdout: `not-json-garbage\n${containerListLine({name: "redis", state: "running"})}`}),
    );

    const results = await infrastructureDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "infrastructure.containers")?.status).toBe("pass");
  });

  it("warns containers and preserves nonzero evidence when the listing command fails", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}});
    seedHealthyRancherResponses(fixture);
    fixture.setResponse(
      {command: "docker", args: ["ps", "-a", "--format", "{{json .}}"]},
      commandResult({code: 1, stderr: "Cannot connect to the Docker daemon"}),
    );

    const results = await infrastructureDoctorModule.run(fixture.context);

    const containers = results.find(({id}) => id === "infrastructure.containers");
    expect(containers?.status).toBe("warn");
    expect(containers?.evidence.join("\n")).toContain("Cannot connect to the Docker daemon");
  });

  it("emits every warn/fail diagnosis compatible with the reporter's semantic contract across degraded scenarios", async () => {
    const missingSelectionFixture = await createInfrastructureFixture({toolingConfig: null});
    const missingSelectionResults = await infrastructureDoctorModule.run(missingSelectionFixture.context);
    expect(() => createDoctorReport(missingSelectionResults, new Date().toISOString())).not.toThrow();

    const cliMissingFixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}});
    seedHealthyRancherResponses(cliMissingFixture);
    cliMissingFixture.setResponse({command: "docker", args: ["--version"]}, commandResult({code: 127, spawnError: "ENOENT"}));
    const cliMissingResults = await infrastructureDoctorModule.run(cliMissingFixture.context);
    expect(() => createDoctorReport(cliMissingResults, new Date().toISOString())).not.toThrow();
  });
});
