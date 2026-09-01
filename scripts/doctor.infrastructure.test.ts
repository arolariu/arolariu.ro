// @vitest-environment node
/**
 * @fileoverview Contract tests for read-only infrastructure diagnostics sourced from shared facts.
 * @module scripts.doctor.infrastructure.test
 */

import {mkdir, mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {afterEach, describe, expect, it, vi} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import {createRepositoryPaths} from "./common/repository-paths.ts";
import type {RepositoryRequirements} from "./common/requirements.ts";
import {infrastructureDoctorModule} from "./doctor.infrastructure.ts";
import {createDoctorReport} from "./doctor.reporter.ts";
import {type DiagnosticNetworkResult, type DoctorContext, type DoctorRunOptions} from "./doctor.types.ts";
import type {InfrastructureFacts} from "./inspection/infrastructure.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";
import type {InspectionOutcome} from "./inspection/types.ts";

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

function doctorOptions(patch: Partial<DoctorRunOptions> = {}): DoctorRunOptions {
  return {verbose: false, quick: false, ...patch};
}

async function writeFixtureFile(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, contents, "utf8");
}

function healthyFacts(patch: Partial<InfrastructureFacts> = {}): InfrastructureFacts {
  return {
    selectedEngine: "rancher",
    cliAvailable: true,
    backendAvailable: true,
    composeAvailable: true,
    dockerConflict: false,
    socketContextIssues: [],
    ports: [],
    certificateIssues: [],
    manifestIssues: [],
    containers: [],
    ...patch,
  };
}

interface InfrastructureFixture {
  readonly root: string;
  readonly context: DoctorContext;
  readonly setInfrastructureFacts: (facts: InfrastructureFacts) => void;
  readonly setInfrastructureUnavailable: (reason?: string) => void;
}

async function createInfrastructureFixture(
  input: Readonly<{
    options?: Partial<DoctorRunOptions>;
    env?: Readonly<NodeJS.ProcessEnv>;
    toolingConfig?: string | null;
    createManifests?: boolean;
    createCertificates?: boolean;
    initialFacts?: InfrastructureFacts;
  }> = {},
): Promise<InfrastructureFixture> {
  const root = await mkdtemp(join(tmpdir(), "arolariu-doctor-infra-"));
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

  let infraOutcome: InspectionOutcome<InfrastructureFacts> =
    input.initialFacts !== undefined
      ? {kind: "available", value: input.initialFacts, durationMs: 0}
      : {kind: "unavailable", reason: "No facts configured.", durationMs: 0};

  const inspection: RepositoryInspectionSession = {
    inspect: async (key: string): Promise<InspectionOutcome<unknown>> => {
      if (key === "infrastructure") {
        return infraOutcome;
      }
      return {kind: "unavailable", reason: "Not needed.", durationMs: 0};
    },
    invalidate: (): void => {},
    updateInfrastructureEngine: (): void => {},
  } as unknown as RepositoryInspectionSession;

  const sink = new InMemoryLoggerSink();
  let now = 0;
  const context: DoctorContext = {
    options: doctorOptions(input.options),
    paths,
    requirements: {status: "valid", requirements: validRequirements},
    runner: {
      run: vi.fn(async () => {
        throw new Error("runner should not be invoked in infrastructure fact tests.");
      }),
    },
    network: {
      get: vi.fn(async (): Promise<DiagnosticNetworkResult> => ({status: "reachable", statusCode: 200, durationMs: 1})),
    },
    logger: new MonorepositoryConsoleLogger("doctor::infrastructure", {color: false, sink}),
    platform: "linux",
    arch: "x64",
    env: input.env ?? {},
    now: () => ++now,
    inspection,
    probes: {
      run: vi.fn(async () => {
        throw new Error("probes should not be invoked in infrastructure fact tests.");
      }),
    },
  };

  return {
    root,
    context,
    setInfrastructureFacts: (facts: InfrastructureFacts): void => {
      infraOutcome = {kind: "available", value: facts, durationMs: 0};
    },
    setInfrastructureUnavailable: (reason = "Infrastructure inspection unavailable."): void => {
      infraOutcome = {kind: "unavailable", reason, durationMs: 0};
    },
  };
}

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map((root) => rm(root, {recursive: true, force: true})));
  vi.restoreAllMocks();
});

describe("infrastructureDoctorModule – stable ID ordering", () => {
  it("returns every stable infrastructure check in order for a healthy Rancher baseline", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      initialFacts: healthyFacts({selectedEngine: "rancher"}),
    });

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
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "podman"},
      initialFacts: healthyFacts({selectedEngine: "podman"}),
    });

    const results = await infrastructureDoctorModule.run(fixture.context);

    expect(results.map(({id}) => id)).toEqual(STABLE_INFRASTRUCTURE_IDS);
    expect(results.every((r) => r.status === "pass" || r.id === "infrastructure.socket-context")).toBe(true);
    expect(() => createDoctorReport(results, new Date().toISOString())).not.toThrow();
  });
});

describe("infrastructureDoctorModule – selection", () => {
  it("resolves the engine from persisted local tooling configuration when no environment override exists", async () => {
    const fixture = await createInfrastructureFixture({
      toolingConfig: JSON.stringify({schemaVersion: 1, containerEngine: "podman"}),
      initialFacts: healthyFacts({selectedEngine: "podman"}),
    });

    const results = await infrastructureDoctorModule.run(fixture.context);

    const selection = results.find(({id}) => id === "infrastructure.selection");
    expect(selection?.status).toBe("pass");
    expect(selection?.evidence.join("\n")).toContain("configuration");
  });

  it("fails selection and skips engine-dependent checks when no engine is selected", async () => {
    const fixture = await createInfrastructureFixture({
      toolingConfig: null,
      initialFacts: (() => {
        const {selectedEngine: _omit, ...rest} = healthyFacts({
          cliAvailable: false,
          backendAvailable: false,
          composeAvailable: false,
          containers: [],
        });
        return rest;
      })(),
    });

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
      expect(results.find((r) => r.id === id)?.status).toBe("skipped");
    }
    expect(results.find(({id}) => id === "infrastructure.certificates")?.status).toBe("pass");
    expect(results.find(({id}) => id === "infrastructure.manifests")?.status).toBe("pass");
    expect(() => createDoctorReport(results, new Date().toISOString())).not.toThrow();
  });

  it("fails selection with an invalid-configuration root cause for an unsupported engine value", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "docker"}});

    const results = await infrastructureDoctorModule.run(fixture.context);

    const selection = results.find(({id}) => id === "infrastructure.selection");
    expect(selection?.status).toBe("fail");
    expect(selection?.rootCause).toMatch(/invalid|unsupported|deprecated/iu);
    expect(selection?.rootCause?.toLowerCase()).not.toContain("no container engine is selected");
    expect(selection?.evidence.join("\n")).toMatch(/deprecated/iu);
  });

  it("warns selection when tooling configuration is invalid but the environment resolves an engine", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      toolingConfig: "{not-valid-json",
      initialFacts: healthyFacts({selectedEngine: "rancher"}),
    });

    const results = await infrastructureDoctorModule.run(fixture.context);

    const selection = results.find(({id}) => id === "infrastructure.selection");
    expect(selection?.status).toBe("warn");
    expect(selection?.evidence.join("\n")).toContain("Local tooling configuration");
  });
});

describe("infrastructureDoctorModule – CLI", () => {
  it("fails CLI and skips downstream engine checks when cliAvailable is false", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      initialFacts: healthyFacts({cliAvailable: false}),
    });

    const results = await infrastructureDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "infrastructure.cli")?.status).toBe("fail");
    for (const id of [
      "infrastructure.backend",
      "infrastructure.compose",
      "infrastructure.docker-conflict",
      "infrastructure.socket-context",
      "infrastructure.containers",
    ]) {
      expect(results.find((r) => r.id === id)?.status).toBe("skipped");
    }
    expect(results.find(({id}) => id === "infrastructure.ports")?.status).toBe("pass");
    expect(results.find(({id}) => id === "infrastructure.certificates")?.status).toBe("pass");
    expect(results.find(({id}) => id === "infrastructure.manifests")?.status).toBe("pass");
    expect(() => createDoctorReport(results, new Date().toISOString())).not.toThrow();
  });

  it("CLI unavailability produces potentialCauses without claiming the daemon is not running", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      initialFacts: healthyFacts({cliAvailable: false}),
    });

    const results = await infrastructureDoctorModule.run(fixture.context);

    const cli = results.find(({id}) => id === "infrastructure.cli");
    expect(cli?.status).toBe("fail");
    expect(cli?.potentialCauses.length).toBeGreaterThanOrEqual(1);
    expect(
      cli?.potentialCauses
        .map((c) => c.cause)
        .join("\n")
        .toLowerCase(),
    ).not.toContain("backend is not running");
  });
});

describe("infrastructureDoctorModule – backend and compose", () => {
  it("fails backend when backendAvailable is false with ambiguous potentialCauses (not a rootCause failure)", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      initialFacts: healthyFacts({backendAvailable: false}),
    });

    const results = await infrastructureDoctorModule.run(fixture.context);

    const backend = results.find(({id}) => id === "infrastructure.backend");
    expect(backend?.status).toBe("fail");
    expect(backend?.rootCause).toBeUndefined();
    expect(backend?.potentialCauses.length).toBeGreaterThan(0);
    expect(results.find(({id}) => id === "infrastructure.socket-context")?.status).not.toBe("skipped");
  });

  it("fails compose when composeAvailable is false", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      initialFacts: healthyFacts({composeAvailable: false}),
    });

    const results = await infrastructureDoctorModule.run(fixture.context);

    const compose = results.find(({id}) => id === "infrastructure.compose");
    expect(compose?.status).toBe("fail");
    expect(compose?.potentialCauses.length).toBeGreaterThan(0);
  });
});

describe("infrastructureDoctorModule – Docker Desktop conflict", () => {
  it("fails docker-conflict for Rancher engine when dockerConflict is true", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      initialFacts: healthyFacts({dockerConflict: true}),
    });

    const results = await infrastructureDoctorModule.run(fixture.context);

    const conflict = results.find(({id}) => id === "infrastructure.docker-conflict");
    expect(conflict?.status).toBe("fail");
    expect(conflict?.rootCause).toMatch(/Docker Desktop/u);
    expect(conflict?.rootCause?.toLowerCase()).not.toContain("delegated");
  });

  it("fails docker-conflict for Podman engine when dockerConflict is true (Compose delegation)", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "podman"},
      initialFacts: healthyFacts({selectedEngine: "podman", dockerConflict: true}),
    });

    const results = await infrastructureDoctorModule.run(fixture.context);

    const conflict = results.find(({id}) => id === "infrastructure.docker-conflict");
    expect(conflict?.status).toBe("fail");
    expect(conflict?.rootCause).toMatch(/delegated/u);
  });

  it("passes docker-conflict when dockerConflict is false", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      initialFacts: healthyFacts({dockerConflict: false}),
    });

    expect((await infrastructureDoctorModule.run(fixture.context)).find(({id}) => id === "infrastructure.docker-conflict")?.status).toBe(
      "pass",
    );
  });
});

describe("infrastructureDoctorModule – socket-context", () => {
  it("skips socket-context when backend and compose both pass and not verbose", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      initialFacts: healthyFacts(),
    });

    expect((await infrastructureDoctorModule.run(fixture.context)).find(({id}) => id === "infrastructure.socket-context")?.status).toBe(
      "skipped",
    );
  });

  it("passes socket-context with non-empty evidence when triggered by a failed backend", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      initialFacts: healthyFacts({backendAvailable: false, socketContextIssues: []}),
    });

    const results = await infrastructureDoctorModule.run(fixture.context);
    const socketContext = results.find(({id}) => id === "infrastructure.socket-context");
    expect(socketContext?.status).toBe("pass");
    expect(socketContext?.evidence.length).toBeGreaterThan(0);
  });

  it("warns socket-context when socketContextIssues is non-empty and follow-up is triggered", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      initialFacts: healthyFacts({
        backendAvailable: false,
        socketContextIssues: ["The active container runtime context or connection state could not be determined."],
      }),
    });

    const results = await infrastructureDoctorModule.run(fixture.context);
    const socketContext = results.find(({id}) => id === "infrastructure.socket-context");
    expect(socketContext?.status).toBe("warn");
    expect(socketContext?.evidence.join("\n")).toContain("context or connection state");
  });

  it("forces socket-context evidence collection under --verbose even when backend and compose pass", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      options: {verbose: true},
      initialFacts: healthyFacts(),
    });

    const results = await infrastructureDoctorModule.run(fixture.context);
    const socketContext = results.find(({id}) => id === "infrastructure.socket-context");
    expect(socketContext?.status).toBe("pass");
    expect(socketContext?.evidence.length).toBeGreaterThan(0);
  });
});

describe("infrastructureDoctorModule – ports", () => {
  it("passes ports when all required ports are available", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      initialFacts: healthyFacts({
        ports: [
          {port: 3000, available: true},
          {port: 6379, available: true},
        ],
      }),
    });

    expect((await infrastructureDoctorModule.run(fixture.context)).find(({id}) => id === "infrastructure.ports")?.status).toBe("pass");
  });

  it("warns ports when the known local stack occupies a port (via container published ports)", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      initialFacts: healthyFacts({
        ports: [{port: 6379, available: false, pid: 1234, processName: "redis"}],
        containers: [{name: "redis", state: "running", publishedPorts: [6379], repositoryOwned: true}],
      }),
    });

    const results = await infrastructureDoctorModule.run(fixture.context);
    const ports = results.find(({id}) => id === "infrastructure.ports");
    expect(ports?.status).toBe("warn");
    expect(ports?.rootCause).toMatch(/already running/u);
  });

  it("warns ports when a port is marked repositoryOwned via aggregate", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      initialFacts: healthyFacts({
        ports: [{port: 3000, available: false, repositoryOwned: true, pid: 4242, processName: "node"}],
        containers: [],
      }),
    });

    expect((await infrastructureDoctorModule.run(fixture.context)).find(({id}) => id === "infrastructure.ports")?.status).toBe("warn");
  });

  it("fails ports when an unrelated process occupies a required port", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      initialFacts: healthyFacts({
        ports: [{port: 3000, available: false, pid: 9001, processName: "java", repositoryOwned: false}],
        containers: [],
      }),
    });

    const results = await infrastructureDoctorModule.run(fixture.context);
    const ports = results.find(({id}) => id === "infrastructure.ports");
    expect(ports?.status).toBe("fail");
    expect(ports?.evidence.join("\n")).toContain("9001");
    expect(ports?.evidence.join("\n")).toContain("java");
  });

  it("fails ports when a port is occupied with no repository ownership context and not in known containers", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      initialFacts: healthyFacts({
        ports: [{port: 4040, available: false, pid: 7777, processName: "someproc"}],
        containers: [],
      }),
    });

    const results = await infrastructureDoctorModule.run(fixture.context);
    expect(results.find(({id}) => id === "infrastructure.ports")?.status).toBe("fail");
    expect(results.find(({id}) => id === "infrastructure.ports")?.evidence.join("\n")).toContain("7777");
  });

  it("warns ports when port has an error field (probe inspection failure)", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      initialFacts: healthyFacts({
        ports: [{port: 3000, available: false, error: "Port ownership could not be determined for the required local ports."}],
      }),
    });

    const results = await infrastructureDoctorModule.run(fixture.context);
    const ports = results.find(({id}) => id === "infrastructure.ports");
    expect(ports?.status).toBe("warn");
    expect(ports?.potentialCauses.length).toBeGreaterThan(0);
  });
});

describe("infrastructureDoctorModule – certificates", () => {
  it("warns when certificateIssues is non-empty", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      initialFacts: healthyFacts({certificateIssues: ["Missing selfhost certificate file: infra/Local/Management/certs/local-cert.pem"]}),
    });

    const results = await infrastructureDoctorModule.run(fixture.context);
    const cert = results.find(({id}) => id === "infrastructure.certificates");
    expect(cert?.status).toBe("warn");
    expect(cert?.evidence.join("\n")).toContain("local-cert.pem");
    expect(cert?.fixes.some((f) => f.command === "npm run setup")).toBe(true);
  });

  it("passes certificates when certificateIssues is empty", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      initialFacts: healthyFacts({certificateIssues: []}),
    });

    expect((await infrastructureDoctorModule.run(fixture.context)).find(({id}) => id === "infrastructure.certificates")?.status).toBe(
      "pass",
    );
  });
});

describe("infrastructureDoctorModule – manifests", () => {
  it("fails manifests when manifestIssues is non-empty", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      initialFacts: healthyFacts({manifestIssues: ["Missing required manifest: tooling/AppHost/AppHost.csproj"]}),
    });

    const results = await infrastructureDoctorModule.run(fixture.context);
    const manifests = results.find(({id}) => id === "infrastructure.manifests");
    expect(manifests?.status).toBe("fail");
    expect(manifests?.evidence.join("\n")).toContain("AppHost.csproj");
  });

  it("passes manifests when manifestIssues is empty", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      initialFacts: healthyFacts({manifestIssues: []}),
    });

    expect((await infrastructureDoctorModule.run(fixture.context)).find(({id}) => id === "infrastructure.manifests")?.status).toBe("pass");
  });
});

describe("infrastructureDoctorModule – containers", () => {
  it("passes containers when no known containers are present", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      initialFacts: healthyFacts({containers: []}),
    });

    expect((await infrastructureDoctorModule.run(fixture.context)).find(({id}) => id === "infrastructure.containers")?.status).toBe("pass");
  });

  it("passes containers when all known containers are running", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      initialFacts: healthyFacts({
        containers: [
          {name: "mssql", state: "running", publishedPorts: [], repositoryOwned: true},
          {name: "redis", state: "running", publishedPorts: [6379], repositoryOwned: true},
        ],
      }),
    });

    expect((await infrastructureDoctorModule.run(fixture.context)).find(({id}) => id === "infrastructure.containers")?.status).toBe("pass");
  });

  it("warns containers when a known container is stopped or stale", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      initialFacts: healthyFacts({
        containers: [{name: "mssql", state: "exited", publishedPorts: [], repositoryOwned: true}],
      }),
    });

    const results = await infrastructureDoctorModule.run(fixture.context);
    const containers = results.find(({id}) => id === "infrastructure.containers");
    expect(containers?.status).toBe("warn");
    expect(containers?.evidence.join("\n")).toContain("mssql");
  });

  it("warns (not pass) a running container that reports an unhealthy status", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      initialFacts: healthyFacts({
        containers: [{name: "mssql", state: "running", status: "Up 3 hours (unhealthy)", publishedPorts: [], repositoryOwned: true}],
      }),
    });

    const results = await infrastructureDoctorModule.run(fixture.context);
    const containers = results.find(({id}) => id === "infrastructure.containers");
    expect(containers?.status).toBe("warn");
    expect(containers?.status).not.toBe("pass");
    expect(containers?.evidence.join("\n")).toContain("unhealthy");
  });

  it("recognizes a healthchecks container as a known repository container", async () => {
    const fixture = await createInfrastructureFixture({
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      initialFacts: healthyFacts({
        containers: [{name: "healthchecks", state: "running", publishedPorts: [8000], repositoryOwned: true}],
      }),
    });

    expect((await infrastructureDoctorModule.run(fixture.context)).find(({id}) => id === "infrastructure.containers")?.status).toBe("pass");
  });
});

describe("infrastructureDoctorModule – degraded facts", () => {
  it("produces fail rows for all fact-dependent checks when infrastructure facts are unavailable", async () => {
    const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}});
    fixture.setInfrastructureUnavailable("Worker could not be reached.");

    const results = await infrastructureDoctorModule.run(fixture.context);

    expect(results.map(({id}) => id)).toEqual(STABLE_INFRASTRUCTURE_IDS);
    for (const id of STABLE_INFRASTRUCTURE_IDS.slice(1)) {
      expect(results.find((r) => r.id === id)?.status).toBe("fail");
    }
    expect(() => createDoctorReport(results, new Date().toISOString())).not.toThrow();
  });
});

describe("infrastructureDoctorModule – CI parity", () => {
  it("CI=true and CI=false produce the same diagnostic IDs and statuses", async () => {
    const initialFacts = healthyFacts();

    const fixtureCI = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher", CI: "true"}, initialFacts});
    const fixtureNoCI = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}, initialFacts});

    const resultsCI = await infrastructureDoctorModule.run(fixtureCI.context);
    const resultsNoCI = await infrastructureDoctorModule.run(fixtureNoCI.context);

    expect(resultsCI.map(({id}) => id)).toEqual(resultsNoCI.map(({id}) => id));
    expect(resultsCI.map(({status}) => status)).toEqual(resultsNoCI.map(({status}) => status));
  });

  it("all warn/fail diagnoses are compatible with the reporter semantic contract", async () => {
    const scenarios: InfrastructureFacts[] = [
      healthyFacts({cliAvailable: false}),
      healthyFacts({backendAvailable: false}),
      healthyFacts({composeAvailable: false}),
      healthyFacts({dockerConflict: true}),
      healthyFacts({ports: [{port: 3000, available: false, repositoryOwned: false}]}),
      healthyFacts({certificateIssues: ["Missing selfhost certificate file: infra/Local/Management/certs/local-cert.pem"]}),
      healthyFacts({manifestIssues: ["Missing required manifest: tooling/AppHost/AppHost.csproj"]}),
      healthyFacts({containers: [{name: "mssql", state: "exited", publishedPorts: [], repositoryOwned: true}]}),
    ];

    for (const facts of scenarios) {
      const fixture = await createInfrastructureFixture({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}, initialFacts: facts});
      const results = await infrastructureDoctorModule.run(fixture.context);
      expect(() => createDoctorReport(results, new Date().toISOString())).not.toThrow();
    }
  });
});
