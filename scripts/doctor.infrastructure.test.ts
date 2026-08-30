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
import {
  buildPortOwnerProbe,
  classifyContainerFailure,
  infrastructureDoctorModule,
} from "./doctor.infrastructure.ts";
import {createDoctorReport} from "./doctor.reporter.ts";
import {
  createPortOwnerProbeCommand,
  type DiagnosticCommandRunner,
  type DiagnosticNetworkResult,
  type DoctorContext,
  type DoctorOptions,
} from "./doctor.types.ts";

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

function doctorOptions(patch: Partial<DoctorOptions> = {}): DoctorOptions {
  return {
    verbose: false,
    ci: false,
    score: false,
    json: false,
    quick: false,
    help: false,
    ...patch,
  };
}

async function writeFixtureFile(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, contents, "utf8");
}

function containerListLine(input: Readonly<{name: string; state: string; ports?: string}>): string {
  return JSON.stringify({Names: input.name, State: input.state, Status: input.state, Ports: input.ports ?? ""});
}

interface InfrastructureFixture {
  readonly root: string;
  readonly context: DoctorContext;
  readonly run: Mock<DiagnosticCommandRunner["run"]>;
  readonly setResponse: (command: Readonly<CommandSpec>, result: CommandResult, cwd?: string) => void;
}

async function createInfrastructureFixture(
  input: Readonly<{
    options?: Partial<DoctorOptions>;
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
    await Promise.all(
      REQUIRED_MANIFEST_RELATIVE_SEGMENTS.map((segments) => writeFixtureFile(resolve(root, ...segments), "manifest\n")),
    );
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
      get: vi.fn(
        async (): Promise<DiagnosticNetworkResult> => ({status: "reachable", statusCode: 200, durationMs: 1}),
      ),
    },
    logger: new MonorepositoryConsoleLogger("doctor::infrastructure", {color: false, sink}),
    platform: input.platform ?? "linux",
    arch: "x64",
    env: input.env ?? {},
    now: () => ++now,
  };

  return {root, context, run, setResponse};
}

function seedHealthyRancherResponses(fixture: InfrastructureFixture): void {
  fixture.setResponse({command: "docker", args: ["--version"]}, commandResult({stdout: "Docker version 27.3.1, build abc123\n"}));
  fixture.setResponse({command: "docker", args: ["info"]}, commandResult({stdout: "Server:\n Version: 27.3.1\n"}));
  fixture.setResponse({command: "docker", args: ["compose", "version"]}, commandResult({stdout: "Docker Compose version v2.29.7\n"}));
  fixture.setResponse({command: "docker", args: ["version"]}, commandResult({stdout: "Client:\n Version: 27.3.1\nServer:\n Version: 27.3.1\n"}));
  fixture.setResponse({command: "docker", args: ["context", "show"]}, commandResult({stdout: "rancher-desktop\n"}));
  fixture.setResponse({command: "docker", args: ["ps", "-a", "--format", "{{json .}}"]}, commandResult({stdout: ""}));
  fixture.setResponse(createPortOwnerProbeCommand(fixture.context.platform, requiredLocalPorts), commandResult({stdout: ""}));
  fixture.setResponse({command: "mkcert", args: ["--version"]}, commandResult({code: 127, spawnError: "ENOENT"}));
}

function seedHealthyPodmanResponses(fixture: InfrastructureFixture): void {
  fixture.setResponse({command: "podman", args: ["--version"]}, commandResult({stdout: "podman version 5.8.2\n"}));
  fixture.setResponse({command: "podman", args: ["info", "--format", "json"]}, commandResult({stdout: JSON.stringify({host: {os: "linux"}})}));
  fixture.setResponse({command: "podman", args: ["compose", "version"]}, commandResult({stdout: "podman version 5.8.2\npodman-compose version 1.5.0\n"}));
  fixture.setResponse(
    {command: "podman", args: ["system", "connection", "list", "--format", "json"]},
    commandResult({stdout: "[]\n"}),
  );
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
      compose: commandResult({stdout: 'Executing external compose provider "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker-compose.exe"\n'}),
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

    for (const id of ["infrastructure.cli", "infrastructure.backend", "infrastructure.compose", "infrastructure.docker-conflict", "infrastructure.socket-context", "infrastructure.containers"]) {
      expect(results.find((result) => result.id === id)?.status).toBe("skipped");
    }

    // Host-level, engine-independent checks still run.
    expect(results.find(({id}) => id === "infrastructure.certificates")?.status).toBe("pass");
    expect(results.find(({id}) => id === "infrastructure.manifests")?.status).toBe("pass");

    expect(() => createDoctorReport(results, new Date().toISOString())).not.toThrow();
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
    for (const id of ["infrastructure.backend", "infrastructure.compose", "infrastructure.docker-conflict", "infrastructure.socket-context", "infrastructure.containers"]) {
      const result = results.find((entry) => entry.id === id);
      expect(result?.status).toBe("skipped");
    }
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
  });

  it("fails docker-conflict when Docker Desktop answers instead of Rancher Desktop", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}});
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
      commandResult({stdout: 'Executing external compose provider "/Applications/Docker.app/Contents/Resources/cli-plugins/docker-compose"\n'}),
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
    expect(fixture.run.mock.calls.some(([command]) => command.command === expectedCommand.command && JSON.stringify(command.args) === JSON.stringify(expectedCommand.args))).toBe(true);
  });

  it("skips the ports check without dispatching a command in --ci mode", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      options: {ci: true},
    });
    seedHealthyRancherResponses(fixture);

    const results = await infrastructureDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "infrastructure.ports")?.status).toBe("skipped");
    expect(results.find(({id}) => id === "infrastructure.certificates")?.status).toBe("skipped");
    expect(results.find(({id}) => id === "infrastructure.containers")?.status).toBe("skipped");
    expect(results.find(({id}) => id === "infrastructure.manifests")?.status).toBe("pass");
    expect(
      fixture.run.mock.calls.some(([command]) => command.command === "sh" || (command.command === "powershell" && command.args.includes("--"))),
    ).toBe(false);
  });

  it("warns that the known local stack already occupies a required port", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}, platform: "linux"});
    seedHealthyRancherResponses(fixture);
    const port = requiredLocalPorts[0] as number;
    fixture.setResponse(
      createPortOwnerProbeCommand("linux", requiredLocalPorts),
      commandResult({stdout: `LISTEN 0      4096      0.0.0.0:${String(port)}      0.0.0.0:*      users:(("docker-proxy",pid=4242,fd=7))\n`}),
    );
    fixture.setResponse(
      {command: "docker", args: ["ps", "-a", "--format", "{{json .}}"]},
      commandResult({stdout: containerListLine({name: "website-arolariu-ro", state: "running", ports: `0.0.0.0:${String(port)}->${String(port)}/tcp`})}),
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
    fixture.setResponse(
      createPortOwnerProbeCommand("linux", requiredLocalPorts),
      commandResult({code: 1, stderr: "Permission denied"}),
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
      {command: "powershell", args: ["-NoProfile", "-NonInteractive", "-Command", "Get-Process | Select-Object Id, ProcessName, Path | ConvertTo-Json -Compress"]},
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

  it("skips certificates in --ci mode without dispatching mkcert commands", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      options: {ci: true},
    });
    seedHealthyRancherResponses(fixture);

    await infrastructureDoctorModule.run(fixture.context);

    expect(fixture.run.mock.calls.some(([command]) => command.command === "mkcert")).toBe(false);
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
        stdout: [
          containerListLine({name: "mssql", state: "running"}),
          containerListLine({name: "redis", state: "running"}),
        ].join("\n"),
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
