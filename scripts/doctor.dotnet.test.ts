// @vitest-environment node
/**
 * @fileoverview Contract tests for read-only .NET diagnostics sourced from shared DotnetFacts.
 * @module scripts.doctor.dotnet.test
 *
 * @remarks
 * `doctor.dotnet.ts` is sourced exclusively from `context.inspection.inspect("dotnet")`,
 * `context.requirements` for version policy, and `context.network.get()` for NuGet reachability.
 * These tests never write a fixture file, spawn a command, or construct a `CommandSpec`: they
 * configure a fake inspection session that returns a deterministic `InspectionOutcome<DotnetFacts>`,
 * and assert on the produced `DiagnosticResult` rows. `context.probes` is wired to throw if the
 * module ever touches it, and a source guard proves the module never references `context.runner`.
 */

import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {afterEach, describe, expect, it, vi, type Mock} from "vitest";

import {ComposedTerminalPresenter} from "./core/presentation/composed-terminal-presenter.ts";
import {RecordingTerminalPresenterSink} from "./testing/fixtures/terminal.fixture.ts";
import {createRepositoryPaths} from "./common/repository-paths.ts";
import type {RepositoryRequirements} from "./common/requirements.ts";
import {asReadOnlyFileSystem, type Clock, type RuntimeEnvironment} from "./core/runtime/runtime-capability.ts";
import {createMemoryFileSystem} from "./testing/fixtures/memory-filesystem.fixture.ts";
import {dotnetDoctorModule} from "./doctor.dotnet.ts";
import {createDoctorReport} from "./doctor.reporter.ts";
import type {DiagnosticNetworkResult, DiagnosticResult, DoctorContext, DoctorInput} from "./doctor.types.ts";
import type {DotnetFacts} from "./inspection/dotnet.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";
import type {InspectionOutcome} from "./inspection/types.ts";

const DOTNET_IDS = [
  "dotnet.executable",
  "dotnet.sdk-inventory",
  "dotnet.host",
  "dotnet.workloads",
  "dotnet.nuget-state",
  "dotnet.solution",
  "dotnet.local-tools",
  "dotnet.https-certificate",
  "dotnet.apphost",
  "dotnet.nuget-feed",
] as const;

function validRequirements(): RepositoryRequirements {
  return {
    node: {major: 24, minor: 0, patch: 0},
    npm: {major: 11, minor: 0, patch: 0},
    dotnet: {major: 10, minor: 0, patch: 0},
    python: {major: 3, minor: 12, patch: 0},
    packages: new Map(),
  };
}

function doctorOptions(patch: Partial<DoctorInput> = {}): DoctorInput {
  return {verbose: false, quick: false, ...patch};
}

/** Deterministic monotonic clock every fixture context observes. */
function fixtureClock(): Clock {
  let current = 0;
  return {
    monotonicNow: (): number => ++current,
    isoTimestamp: (): string => "2026-08-29T00:00:00.000Z",
    delay: (): Promise<void> => Promise.resolve(),
  };
}

/** Immutable environment snapshot every fixture context observes. */
function fixtureEnvironment(variables: Readonly<Record<string, string | undefined>> = {}): RuntimeEnvironment {
  return {
    variables,
    cwd: "C:\\fixture\\arolariu.ro",
    executablePath: "C:\\Program Files\\nodejs\\node.exe",
    platform: "win32",
    architecture: "x64",
    stdinIsTTY: false,
    stdoutIsTTY: false,
    isCI: false,
  };
}

function healthyDotnetFacts(overrides: Readonly<Partial<DotnetFacts>> = {}): DotnetFacts {
  return {
    executable: {available: true, resolvedPaths: ["C:\\Program Files\\dotnet\\dotnet.exe"]},
    selectedVersion: "10.0.111",
    sdks: ["8.0.130", "10.0.111"],
    host: {version: "10.0.11", architecture: "x64", rid: "win-x64"},
    workloads: [],
    nugetCachePath: "C:\\Users\\test\\.nuget\\packages",
    solutionIssues: [],
    solutionRestoreIssues: [],
    localTools: [{name: "defaultdocumentation.console", version: "1.2.4"}],
    certificate: {exists: true, trusted: true},
    appHost: {projectExists: true, missingParameterKeys: [], userSecretKeys: ["Parameters:sql-password", "Parameters:redis-password"]},
    ...overrides,
  };
}

function resultIds(results: readonly DiagnosticResult[]): readonly string[] {
  return results.map((r) => r.id);
}

function resultById(results: readonly DiagnosticResult[], id: string): DiagnosticResult {
  const found = results.find((r) => r.id === id);
  if (found === undefined) {
    throw new Error(`Diagnostic '${id}' was not produced.`);
  }
  return found;
}

interface DotnetFixture {
  readonly context: DoctorContext;
  readonly inspect: Mock<(key: string) => Promise<InspectionOutcome<unknown>>>;
  readonly probeRun: Mock<(...args: readonly unknown[]) => Promise<never>>;
}

function createDotnetFixture(
  input: Readonly<{
    options?: Partial<DoctorInput>;
    requirements?: RepositoryRequirements | "invalid";
    outcome?: InspectionOutcome<DotnetFacts>;
    networkResult?: DiagnosticNetworkResult;
    env?: Readonly<Record<string, string | undefined>>;
  }> = {},
): DotnetFixture {
  const outcome: InspectionOutcome<DotnetFacts> = input.outcome ?? {
    kind: "available",
    value: healthyDotnetFacts(),
    durationMs: 0,
  };

  const inspect = vi.fn(async (key: string): Promise<InspectionOutcome<unknown>> => {
    if (key !== "dotnet") {
      throw new Error(`Unexpected inspection key requested: '${key}'.`);
    }
    return outcome;
  });

  const probeRun = vi.fn(async (): Promise<never> => {
    throw new Error("doctor.dotnet.ts must never call context.probes.");
  });

  const networkGet = vi.fn(
    async (): Promise<DiagnosticNetworkResult> =>
      input.networkResult ?? {
        status: "reachable",
        statusCode: 200,
        durationMs: 3,
        body: JSON.stringify({
          version: "3.0.0",
          resources: [{"@id": "https://api.nuget.org/v3-flatcontainer/", "@type": "PackageBaseAddress/3.0.0"}],
        }),
      },
  );

  const sink = new RecordingTerminalPresenterSink();
  const context: DoctorContext = {
    options: doctorOptions(input.options),
    paths: createRepositoryPaths(process.cwd()),
    requirements:
      input.requirements === "invalid"
        ? {status: "invalid", errors: [".nvmrc disagrees with package.json#engines.node"]}
        : {status: "valid", requirements: input.requirements ?? validRequirements()},
    network: {get: networkGet},
    logger: new ComposedTerminalPresenter("doctor::dotnet", {color: false, sink}),
    files: asReadOnlyFileSystem(createMemoryFileSystem()),
    clock: fixtureClock(),
    environment: fixtureEnvironment(input.env ?? {}),
    probes: {run: probeRun as unknown as DoctorContext["probes"]["run"]},
    inspection: {
      inspect: inspect as unknown as RepositoryInspectionSession["inspect"],
      invalidate: vi.fn(),
      updateInfrastructureEngine: vi.fn(),
    } as RepositoryInspectionSession,
  };

  return {context, inspect, probeRun};
}

afterEach(() => {
  vi.restoreAllMocks();
});

/** Strips block and line comments so source-guard assertions never match prose in doc comments. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/\/\/[^\n]*/gu, "");
}

describe("source guards", () => {
  const source = stripComments(readFileSync(resolve(process.cwd(), "scripts", "doctor.dotnet.ts"), "utf8"));

  it("never touches context.runner", () => {
    expect(source).not.toMatch(/context\.runner/u);
  });

  it("never touches context.probes", () => {
    expect(source).not.toMatch(/context\.probes/u);
  });

  it("never imports or constructs CommandSpec", () => {
    expect(source).not.toMatch(/CommandSpec/u);
  });

  it("never imports node:fs or node:fs/promises", () => {
    expect(source).not.toMatch(/from\s+["']node:fs(?:\/promises)?["']/u);
  });

  it("never constructs dotnet commands", () => {
    expect(source).not.toMatch(/command:\s*["']dotnet["']/u);
    expect(source).not.toMatch(/command:\s*["']where\.exe["']/u);
  });

  it("does not use the CI environment variable to alter behavior", () => {
    expect(source).not.toMatch(/\bCI\b.*=\s*["']true["']/u);
    expect(source).not.toMatch(/process\.env\.CI/u);
  });
});

describe("dotnetDoctorModule", () => {
  it("returns every stable dotnet check in order for a healthy baseline", async () => {
    const fixture = createDotnetFixture();

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(resultIds(results)).toEqual([...DOTNET_IDS]);
    for (const result of results) {
      expect(result.status, `${result.id} should pass`).toBe("pass");
      expect(result.module).toBe("dotnet");
    }
    expect(fixture.inspect).toHaveBeenCalledExactlyOnceWith("dotnet");
  });

  it("never calls context.probes in normal mode", async () => {
    const fixture = createDotnetFixture();

    await dotnetDoctorModule.run(fixture.context);

    expect(fixture.probeRun).not.toHaveBeenCalled();
  });

  it("never calls context.probes in quick mode", async () => {
    const fixture = createDotnetFixture({options: {quick: true}});

    await dotnetDoctorModule.run(fixture.context);

    expect(fixture.probeRun).not.toHaveBeenCalled();
  });

  // --- Executable ---

  it("passes dotnet.executable when the executable is available with resolved paths", async () => {
    const fixture = createDotnetFixture();

    const results = await dotnetDoctorModule.run(fixture.context);

    const exec = resultById(results, "dotnet.executable");
    expect(exec.status).toBe("pass");
  });

  it("fails dotnet.executable when the executable is unavailable", async () => {
    const facts = healthyDotnetFacts({executable: {available: false, resolvedPaths: []}});
    const fixture = createDotnetFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await dotnetDoctorModule.run(fixture.context);

    const exec = resultById(results, "dotnet.executable");
    expect(exec.status).toBe("fail");
    expect(exec.fixes.length).toBeGreaterThan(0);
  });

  it("reports the resolver count in executable evidence", async () => {
    const facts = healthyDotnetFacts({
      executable: {available: true, resolvedPaths: ["C:\\A\\dotnet.exe", "C:\\B\\dotnet.exe"]},
    });
    const fixture = createDotnetFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await dotnetDoctorModule.run(fixture.context);

    const exec = resultById(results, "dotnet.executable");
    expect(exec.evidence.join("\n")).toContain("2");
  });

  // --- SDK Inventory ---

  it("passes sdk-inventory when a compatible SDK is installed", async () => {
    const fixture = createDotnetFixture();

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(resultById(results, "dotnet.sdk-inventory").status).toBe("pass");
  });

  it("fails sdk-inventory when only incompatible SDKs are installed", async () => {
    const facts = healthyDotnetFacts({sdks: ["8.0.130", "9.0.317"]});
    const fixture = createDotnetFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await dotnetDoctorModule.run(fixture.context);

    const sdk = resultById(results, "dotnet.sdk-inventory");
    expect(sdk.status).toBe("fail");
    expect(sdk.rootCause).toBeDefined();
    expect(sdk.fixes.length).toBeGreaterThan(0);
  });

  it("passes sdk-inventory for a compatible .NET 10 preview SDK", async () => {
    const facts = healthyDotnetFacts({selectedVersion: "10.0.400-preview.0.26356.102", sdks: ["9.0.317", "10.0.400-preview.0.26356.102"]});
    const fixture = createDotnetFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(resultById(results, "dotnet.sdk-inventory").status).toBe("pass");
  });

  it("detects SDK selection mismatch when selectedVersion is not among installed SDKs", async () => {
    const facts = healthyDotnetFacts({selectedVersion: "10.0.999", sdks: ["10.0.111"]});
    const fixture = createDotnetFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await dotnetDoctorModule.run(fixture.context);

    const sdk = resultById(results, "dotnet.sdk-inventory");
    expect(sdk.status).toBe("warn");
    expect(sdk.evidence.join("\n")).toContain("10.0.999");
  });

  it("skips sdk-inventory when requirement sources are invalid", async () => {
    const fixture = createDotnetFixture({requirements: "invalid"});

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(resultById(results, "dotnet.sdk-inventory").status).toBe("skipped");
  });

  // --- Host ---

  it("passes dotnet.host when host facts are present and architecture matches", async () => {
    const fixture = createDotnetFixture();

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(resultById(results, "dotnet.host").status).toBe("pass");
  });

  it("fails dotnet.host when host facts are missing", async () => {
    const {host: _host, ...noHost} = healthyDotnetFacts();
    const fixture = createDotnetFixture({outcome: {kind: "available", value: noHost as DotnetFacts, durationMs: 0}});

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(resultById(results, "dotnet.host").status).toBe("fail");
  });

  it("fails dotnet.host on an architecture mismatch", async () => {
    const facts = healthyDotnetFacts({host: {version: "10.0.11", architecture: "arm64", rid: "win-arm64"}});
    const fixture = createDotnetFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await dotnetDoctorModule.run(fixture.context);

    const host = resultById(results, "dotnet.host");
    expect(host.status).toBe("fail");
    expect(host.evidence.join("\n")).toContain("arm64");
  });

  // --- Workloads ---

  it("passes dotnet.workloads for an empty workload list", async () => {
    const fixture = createDotnetFixture();

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(resultById(results, "dotnet.workloads").status).toBe("pass");
  });

  it("passes dotnet.workloads for installed workloads", async () => {
    const facts = healthyDotnetFacts({workloads: ["aspire", "wasm-tools"]});
    const fixture = createDotnetFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await dotnetDoctorModule.run(fixture.context);

    const workloads = resultById(results, "dotnet.workloads");
    expect(workloads.status).toBe("pass");
    expect(workloads.evidence.join("\n")).toContain("aspire");
  });

  // --- NuGet State ---

  it("passes dotnet.nuget-state when cache path is present", async () => {
    const fixture = createDotnetFixture();

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(resultById(results, "dotnet.nuget-state").status).toBe("pass");
  });

  it("warns dotnet.nuget-state when cache path is missing", async () => {
    const {nugetCachePath: _nugetCachePath, ...noCacheFacts} = healthyDotnetFacts();
    const fixture = createDotnetFixture({outcome: {kind: "available", value: noCacheFacts as DotnetFacts, durationMs: 0}});

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(resultById(results, "dotnet.nuget-state").status).toBe("warn");
  });

  // --- Solution ---

  it("passes dotnet.solution when there are no issues", async () => {
    const fixture = createDotnetFixture();

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(resultById(results, "dotnet.solution").status).toBe("pass");
  });

  it("fails dotnet.solution when there are structural issues", async () => {
    const facts = healthyDotnetFacts({solutionIssues: ["Missing solution project: sites/api.arolariu.ro/src/Common/Common.csproj"]});
    const fixture = createDotnetFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await dotnetDoctorModule.run(fixture.context);

    const solution = resultById(results, "dotnet.solution");
    expect(solution.status).toBe("fail");
    expect(solution.evidence.join("\n")).toContain("Common.csproj");
  });

  it("warns dotnet.solution for restore issues only", async () => {
    const facts = healthyDotnetFacts({solutionRestoreIssues: ["Missing NuGet restore assets: tooling/AppHost/AppHost.csproj"]});
    const fixture = createDotnetFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await dotnetDoctorModule.run(fixture.context);

    const solution = resultById(results, "dotnet.solution");
    expect(solution.status).toBe("warn");
    expect(solution.evidence.join("\n")).toContain("restore");
  });

  it("bounds solution issues beyond evidence limits", async () => {
    const issues = Array.from({length: 10}, (_, i) => `Issue ${String(i)}`);
    const facts = healthyDotnetFacts({solutionIssues: issues});
    const fixture = createDotnetFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await dotnetDoctorModule.run(fixture.context);

    const solution = resultById(results, "dotnet.solution");
    expect(solution.status).toBe("fail");
    expect(solution.evidence.length).toBeLessThanOrEqual(6);
    expect(solution.evidence.at(-1)).toContain("omitted");
  });

  // --- Local Tools ---

  it("passes dotnet.local-tools when the required tool is installed", async () => {
    const fixture = createDotnetFixture();

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(resultById(results, "dotnet.local-tools").status).toBe("pass");
  });

  it("warns dotnet.local-tools when defaultdocumentation.console is missing", async () => {
    const facts = healthyDotnetFacts({localTools: [{name: "other-tool", version: "1.0.0"}]});
    const fixture = createDotnetFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await dotnetDoctorModule.run(fixture.context);

    const tools = resultById(results, "dotnet.local-tools");
    expect(tools.status).toBe("warn");
    expect(tools.evidence.join("\n")).toContain("defaultdocumentation.console");
  });

  it("warns dotnet.local-tools when tool list is empty", async () => {
    const facts = healthyDotnetFacts({localTools: []});
    const fixture = createDotnetFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(resultById(results, "dotnet.local-tools").status).toBe("warn");
  });

  // --- HTTPS Certificate ---

  it("passes dotnet.https-certificate when certificate exists and is trusted", async () => {
    const fixture = createDotnetFixture();

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(resultById(results, "dotnet.https-certificate").status).toBe("pass");
  });

  it("warns dotnet.https-certificate when a certificate exists but is not trusted", async () => {
    const facts = healthyDotnetFacts({certificate: {exists: true, trusted: false}});
    const fixture = createDotnetFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(resultById(results, "dotnet.https-certificate").status).toBe("warn");
  });

  it("fails dotnet.https-certificate when no certificate is present", async () => {
    const facts = healthyDotnetFacts({certificate: {exists: false, trusted: false}});
    const fixture = createDotnetFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await dotnetDoctorModule.run(fixture.context);

    const cert = resultById(results, "dotnet.https-certificate");
    expect(cert.status).toBe("fail");
    expect(cert.fixes.length).toBeGreaterThan(0);
  });

  // --- AppHost ---

  it("passes dotnet.apphost when project exists and all parameters are configured", async () => {
    const fixture = createDotnetFixture();

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(resultById(results, "dotnet.apphost").status).toBe("pass");
  });

  it("fails dotnet.apphost when the project is missing", async () => {
    const facts = healthyDotnetFacts({
      appHost: {projectExists: false, missingParameterKeys: [], userSecretKeys: []},
    });
    const fixture = createDotnetFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(resultById(results, "dotnet.apphost").status).toBe("fail");
  });

  it("warns dotnet.apphost when parameter keys are missing", async () => {
    const facts = healthyDotnetFacts({
      appHost: {projectExists: true, missingParameterKeys: ["Parameters:redis-password"], userSecretKeys: ["Parameters:sql-password"]},
    });
    const fixture = createDotnetFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await dotnetDoctorModule.run(fixture.context);

    const appHost = resultById(results, "dotnet.apphost");
    expect(appHost.status).toBe("warn");
    expect(appHost.evidence.join("\n")).toContain("Parameters:redis-password");
  });

  it("reports user-secret key names without values", async () => {
    const facts = healthyDotnetFacts({
      appHost: {projectExists: true, missingParameterKeys: [], userSecretKeys: ["Parameters:sql-password", "Custom:Key"]},
    });
    const fixture = createDotnetFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await dotnetDoctorModule.run(fixture.context);

    const appHost = resultById(results, "dotnet.apphost");
    expect(appHost.status).toBe("pass");
    expect(appHost.evidence.join("\n")).toContain("user-secret");
  });

  // --- NuGet Feed ---

  it("skips dotnet.nuget-feed in quick mode without probing the network", async () => {
    const fixture = createDotnetFixture({options: {quick: true}});

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(resultById(results, "dotnet.nuget-feed").status).toBe("skipped");
    expect(fixture.context.network.get).not.toHaveBeenCalled();
  });

  it("passes dotnet.nuget-feed for a healthy NuGet service index", async () => {
    const fixture = createDotnetFixture();

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(resultById(results, "dotnet.nuget-feed").status).toBe("pass");
  });

  it("skips dotnet.nuget-feed when the network probe is unavailable", async () => {
    const fixture = createDotnetFixture({networkResult: {status: "unavailable", durationMs: 1, error: "offline"}});

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(resultById(results, "dotnet.nuget-feed").status).toBe("skipped");
  });

  it("warns dotnet.nuget-feed on a non-200 response", async () => {
    const fixture = createDotnetFixture({networkResult: {status: "reachable", statusCode: 503, durationMs: 2}});

    const results = await dotnetDoctorModule.run(fixture.context);

    const feed = resultById(results, "dotnet.nuget-feed");
    expect(feed.status).toBe("warn");
    expect(feed.evidence.join("\n")).toContain("503");
  });

  it("warns dotnet.nuget-feed on malformed successful content", async () => {
    const fixture = createDotnetFixture({
      networkResult: {status: "reachable", statusCode: 200, durationMs: 2, body: "not-json"},
    });

    const results = await dotnetDoctorModule.run(fixture.context);

    const feed = resultById(results, "dotnet.nuget-feed");
    expect(feed.status).toBe("warn");
    expect(feed.evidence.length).toBeGreaterThan(0);
    expect(feed.fixes.length).toBeGreaterThan(0);
  });

  it("warns dotnet.nuget-feed when the successful response has no body", async () => {
    const fixture = createDotnetFixture({
      networkResult: {status: "reachable", statusCode: 200, durationMs: 2},
    });

    const results = await dotnetDoctorModule.run(fixture.context);

    const feed = resultById(results, "dotnet.nuget-feed");
    expect(feed.status).toBe("warn");
  });

  it("warns dotnet.nuget-feed when the response body lacks a resources array", async () => {
    const fixture = createDotnetFixture({
      networkResult: {status: "reachable", statusCode: 200, durationMs: 2, body: JSON.stringify({version: "3.0.0"})},
    });

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(resultById(results, "dotnet.nuget-feed").status).toBe("warn");
  });

  // --- Degraded outcomes ---

  it("produces degraded results when dotnet inspection is unavailable", async () => {
    const fixture = createDotnetFixture({
      outcome: {kind: "unavailable", reason: "The dotnet executable is unavailable.", durationMs: 0},
    });

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(resultIds(results)).toEqual([...DOTNET_IDS]);
    for (const result of results) {
      if (result.id === "dotnet.nuget-feed") {
        expect(result.status === "pass" || result.status === "skipped" || result.status === "warn").toBe(true);
      } else {
        expect(result.status, `${result.id} should fail on unavailable`).toBe("fail");
        expect(result.evidence.join("\n")).toContain("unavailable");
      }
    }
  });

  it("produces degraded results when dotnet inspection is invalid", async () => {
    const issues = Array.from({length: 7}, (_, i) => `Dotnet inspection issue ${String(i)}.`);
    const fixture = createDotnetFixture({outcome: {kind: "invalid", issues, durationMs: 0}});

    const results = await dotnetDoctorModule.run(fixture.context);

    for (const result of results) {
      if (result.id === "dotnet.nuget-feed") {
        continue;
      }
      expect(result.status).toBe("fail");
      expect(result.evidence.join("\n")).toContain("issue");
    }
    expect(() => createDoctorReport(results, "2026-09-01T00:00:00.000Z")).not.toThrow();
  });

  it("preserves independent NuGet feed behavior when facts are unavailable in normal mode", async () => {
    const fixture = createDotnetFixture({
      outcome: {kind: "unavailable", reason: "The dotnet executable is unavailable.", durationMs: 0},
    });

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(resultById(results, "dotnet.nuget-feed").status).toBe("pass");
    expect(fixture.context.network.get).toHaveBeenCalled();
  });

  it("skips sdk-inventory when facts are unavailable and requirements are invalid", async () => {
    const fixture = createDotnetFixture({
      requirements: "invalid",
      outcome: {kind: "unavailable", reason: "test", durationMs: 0},
    });

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(resultById(results, "dotnet.sdk-inventory").status).toBe("skipped");
  });

  it("skips NuGet feed in quick mode even when facts are unavailable", async () => {
    const fixture = createDotnetFixture({
      options: {quick: true},
      outcome: {kind: "unavailable", reason: "test", durationMs: 0},
    });

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(resultById(results, "dotnet.nuget-feed").status).toBe("skipped");
    expect(fixture.context.network.get).not.toHaveBeenCalled();
  });

  // --- CI environment ---

  it("produces identical results with CI=true and CI=false", async () => {
    const factsCi = createDotnetFixture({env: {CI: "true"}});
    const resultsCi = await dotnetDoctorModule.run(factsCi.context);

    const factsNoCi = createDotnetFixture({env: {CI: "false"}});
    const resultsNoCi = await dotnetDoctorModule.run(factsNoCi.context);

    expect(resultIds(resultsCi)).toEqual(resultIds(resultsNoCi));
    for (const [index, result] of resultsCi.entries()) {
      expect(result.status).toBe(resultsNoCi[index]?.status);
    }
  });
});
