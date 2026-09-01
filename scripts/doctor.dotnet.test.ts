// @vitest-environment node
/**
 * @fileoverview Contract tests for read-only .NET diagnostics.
 * @module scripts.doctor.dotnet.test
 */

import {mkdir, mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {afterEach, describe, expect, it, vi, type Mock} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import type {CommandResult, CommandSpec} from "./common/process.ts";
import {createRepositoryPaths} from "./common/repository-paths.ts";
import type {RepositoryRequirements} from "./common/requirements.ts";
import {dotnetDoctorModule, inspectAppHostParameters, parseDotnetInfo} from "./doctor.dotnet.ts";
import type {DiagnosticCommandRunner, DiagnosticNetworkResult, DoctorContext, DoctorRunOptions} from "./doctor.types.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";

const fixtureRoots: string[] = [];

const validRequirements: RepositoryRequirements = {
  node: {major: 24, minor: 0, patch: 0},
  npm: {major: 11, minor: 0, patch: 0},
  dotnet: {major: 10, minor: 0, patch: 0},
  python: {major: 3, minor: 12, patch: 0},
  packages: new Map(),
};

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

function dotnetInfoOutput(input: Readonly<{sdkVersion?: string; hostVersion?: string; architecture?: string; rid?: string}> = {}): string {
  const sdkVersion = input.sdkVersion ?? "10.0.111";
  const hostVersion = input.hostVersion ?? "10.0.11";
  const architecture = input.architecture ?? "x64";
  const rid = input.rid ?? "win-x64";
  return [
    ".NET SDK:",
    ` Version:           ${sdkVersion}`,
    " Commit:            8286f720fd",
    "",
    "Runtime Environment:",
    " OS Name:     Windows",
    ` RID:         ${rid}`,
    "",
    "Host:",
    `  Version:      ${hostVersion}`,
    `  Architecture: ${architecture}`,
    "  Commit:       e2f47b0110",
    "",
    ".NET SDKs installed:",
    `  ${sdkVersion} [C:\\Program Files\\dotnet\\sdk]`,
    "",
  ].join("\n");
}

async function writeFixtureFile(path: string, contents = "{}\n"): Promise<void> {
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, contents, "utf8");
}

interface DotnetFixture {
  readonly root: string;
  readonly cacheRoot: string;
  readonly appHostProjectPath: string;
  readonly context: DoctorContext;
  readonly run: Mock<DiagnosticCommandRunner["run"]>;
  readonly responses: Map<string, CommandResult>;
  readonly setResponse: (command: CommandSpec, result: CommandResult, cwd?: string) => void;
}

async function createDotnetFixture(
  input: Readonly<{
    options?: Partial<DoctorRunOptions>;
    requirementsValid?: boolean;
    networkResult?: DiagnosticNetworkResult;
  }> = {},
): Promise<DotnetFixture> {
  const root = await mkdtemp(join(tmpdir(), "arolariu-doctor-dotnet-"));
  fixtureRoots.push(root);
  const paths = createRepositoryPaths(root);
  const cacheRoot = resolve(root, ".nuget-cache");
  const appHostProjectPath = resolve(root, "tooling", "AppHost", "AppHost.csproj");
  const appHostDevSettingsPath = resolve(root, "tooling", "AppHost", "appsettings.Development.json");
  const commonProjectPath = resolve(root, "sites", "api.arolariu.ro", "src", "Common", "arolariu.Backend.Common.csproj");
  const lockFilePath = resolve(root, "sites", "api.arolariu.ro", "src", "Common", "packages.lock.json");

  await Promise.all([
    writeFixtureFile(
      paths.solution,
      [
        "<Solution>",
        '  <Folder Name="/sites/">',
        '    <Project Path="sites/api.arolariu.ro/src/Common/arolariu.Backend.Common.csproj" />',
        "  </Folder>",
        '  <Folder Name="/tooling/">',
        '    <Project Path="tooling/AppHost/AppHost.csproj" />',
        "  </Folder>",
        "</Solution>",
        "",
      ].join("\n"),
    ),
    writeFixtureFile(
      paths.dotnetToolManifest,
      JSON.stringify({
        version: 1,
        isRoot: true,
        tools: {"defaultdocumentation.console": {version: "1.2.4", commands: ["defaultdocumentation"]}},
      }),
    ),
    writeFixtureFile(commonProjectPath, '<Project Sdk="Microsoft.NET.Sdk" />\n'),
    writeFixtureFile(lockFilePath, JSON.stringify({version: 1, dependencies: {}})),
    writeFixtureFile(
      appHostProjectPath,
      [
        '<Project Sdk="Microsoft.NET.Sdk">',
        "  <PropertyGroup>",
        "    <TargetFramework>net10.0</TargetFramework>",
        "  </PropertyGroup>",
        "</Project>",
        "",
      ].join("\n"),
    ),
    writeFixtureFile(
      appHostDevSettingsPath,
      JSON.stringify({Parameters: {"sql-password": "qazWSXedcRFV1234!", "redis-password": "RedisPassword123!"}}),
    ),
  ]);

  const responses = new Map<string, CommandResult>();
  const setResponse = (command: CommandSpec, result: CommandResult, cwd = root): void => {
    responses.set(commandKey(command, cwd), result);
  };

  setResponse({command: "dotnet", args: ["--version"]}, commandResult({stdout: "10.0.111\n"}));
  setResponse({command: "dotnet", args: ["--info"]}, commandResult({stdout: dotnetInfoOutput()}));
  setResponse(
    {command: "dotnet", args: ["--list-sdks"]},
    commandResult({stdout: "8.0.130 [C:\\Program Files\\dotnet\\sdk]\n10.0.111 [C:\\Program Files\\dotnet\\sdk]\n"}),
  );
  setResponse(
    {command: "dotnet", args: ["workload", "list"]},
    commandResult({stdout: "Installed Workload Id      Manifest Version\n--------------------------\nNo workloads installed.\n"}),
  );
  setResponse(
    {command: "dotnet", args: ["nuget", "locals", "global-packages", "--list"]},
    commandResult({stdout: `global-packages: ${cacheRoot}\n`}),
  );
  setResponse(
    {command: "dotnet", args: ["tool", "list", "--local"]},
    commandResult({
      stdout: [
        "Package Id                   Version      Commands",
        "-------------------------------------------------------",
        "defaultdocumentation.console 1.2.4        defaultdocumentation",
        "",
      ].join("\n"),
    }),
  );
  setResponse({command: "dotnet", args: ["dev-certs", "https", "--check"]}, commandResult({stdout: "3 valid certificates were found\n"}));
  setResponse(
    {command: "dotnet", args: ["dev-certs", "https", "--check", "--trust"]},
    commandResult({stdout: "A trusted certificate was found\n"}),
  );

  await mkdir(cacheRoot, {recursive: true});

  const run = vi.fn<DiagnosticCommandRunner["run"]>(
    async (command: Readonly<CommandSpec>, options): Promise<CommandResult> =>
      responses.get(commandKey(command, options?.cwd)) ?? commandResult({code: 127, spawnError: `Unexpected command ${command.command}`}),
  );
  const runner: DiagnosticCommandRunner = {run};
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
  const sink = new InMemoryLoggerSink();
  let now = 0;
  const context: DoctorContext = {
    options: doctorOptions(input.options),
    paths,
    requirements:
      input.requirementsValid === false
        ? {status: "invalid", errors: [".nvmrc disagrees with package.json#engines.node"]}
        : {status: "valid", requirements: validRequirements},
    runner,
    network: {get: networkGet},
    logger: new MonorepositoryConsoleLogger("doctor::dotnet", {color: false, sink}),
    platform: "win32",
    arch: "x64",
    env: {
      PATH: resolve(root, "bin"),
      ProgramFiles: resolve(root, "Program Files"),
      LOCALAPPDATA: resolve(root, "Local"),
    },
    now: () => ++now,
    inspection: {
      inspect: async () => ({kind: "unavailable" as const, reason: "test", durationMs: 0}),
      invalidate: () => {},
      updateInfrastructureEngine: () => {},
    } as RepositoryInspectionSession,
    probes: {
      run: vi.fn(async () => {
        throw new Error("Probe runner should not be invoked by dotnet tests.");
      }),
    },
  };

  return {root, cacheRoot, appHostProjectPath, context, run, responses, setResponse};
}

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map((root) => rm(root, {recursive: true, force: true})));
});

describe("parseDotnetInfo", () => {
  it("extracts the SDK version, host version, architecture, and RID from a healthy dotnet --info document", () => {
    const parsed = parseDotnetInfo(
      dotnetInfoOutput({sdkVersion: "10.0.400-preview.0.26356.102", hostVersion: "10.0.11", architecture: "arm64", rid: "win-arm64"}),
    );

    expect(parsed).toEqual({
      sdkVersion: "10.0.400-preview.0.26356.102",
      hostVersion: "10.0.11",
      architecture: "arm64",
      rid: "win-arm64",
    });
  });

  it("omits fields that could not be located in a malformed document", () => {
    const parsed = parseDotnetInfo("Not a recognized dotnet --info document.\n");

    expect(parsed.hostVersion).toBeUndefined();
    expect(parsed.architecture).toBeUndefined();
  });
});

describe("inspectAppHostParameters", () => {
  it("reports both parameters present when tracked development configuration supplies them", () => {
    const result = inspectAppHostParameters({Parameters: {"sql-password": "a", "redis-password": "b"}});

    expect(result).toEqual({
      present: ["Parameters:sql-password", "Parameters:redis-password"],
      missing: [],
    });
  });

  it("fills gaps from user-secrets output without retaining values", () => {
    const result = inspectAppHostParameters(
      {Parameters: {"sql-password": "a"}},
      JSON.stringify({"Parameters:redis-password": "secret-value"}),
    );

    expect(result.present).toEqual(["Parameters:sql-password", "Parameters:redis-password"]);
    expect(result.missing).toEqual([]);
    expect(JSON.stringify(result)).not.toContain("secret-value");
  });

  it("reports missing keys when neither source supplies them", () => {
    const result = inspectAppHostParameters({Parameters: {}}, "not-json");

    expect(result.present).toEqual([]);
    expect(result.missing).toEqual(["Parameters:sql-password", "Parameters:redis-password"]);
  });
});

describe("dotnetDoctorModule", () => {
  it("returns every stable dotnet check in order for a healthy local baseline", async () => {
    const fixture = await createDotnetFixture();

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(results.map(({id}) => id)).toEqual([
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
    ]);
    expect(results.every(({status}) => status === "pass")).toBe(true);
    expect(results.every(({module}) => module === "dotnet")).toBe(true);
  });

  it("reports a missing dotnet executable with PATH and common-location follow-up outside quick mode", async () => {
    const fixture = await createDotnetFixture();
    fixture.setResponse({command: "dotnet", args: ["--version"]}, commandResult({code: 127, spawnError: "ENOENT"}));
    fixture.setResponse({command: "where.exe", args: ["dotnet.exe"]}, commandResult({code: 1, stderr: "INFO: Could not find files"}));

    const results = await dotnetDoctorModule.run(fixture.context);

    const executable = results.find(({id}) => id === "dotnet.executable");
    expect(executable?.status).toBe("fail");
    expect(executable?.evidence.join("\n")).toContain("common installation locations");
    expect(fixture.run).toHaveBeenCalledWith({command: "where.exe", args: ["dotnet.exe"]}, expect.any(Object));
  });

  it("omits PATH and common-location follow-up probes in quick mode", async () => {
    const fixture = await createDotnetFixture({options: {quick: true}});
    fixture.setResponse({command: "dotnet", args: ["--version"]}, commandResult({code: 127, spawnError: "ENOENT"}));

    const results = await dotnetDoctorModule.run(fixture.context);

    const executable = results.find(({id}) => id === "dotnet.executable");
    expect(executable?.status).toBe("fail");
    expect(executable?.evidence.join("\n")).toContain("Quick mode omitted");
    expect(fixture.run.mock.calls.some(([command]) => command.command === "where.exe" && command.args[0] === "dotnet.exe")).toBe(false);
  });

  it("fails sdk-inventory when only incompatible SDKs are installed", async () => {
    const fixture = await createDotnetFixture();
    fixture.setResponse(
      {command: "dotnet", args: ["--list-sdks"]},
      commandResult({stdout: "8.0.130 [C:\\Program Files\\dotnet\\sdk]\n9.0.317 [C:\\Program Files\\dotnet\\sdk]\n"}),
    );

    const results = await dotnetDoctorModule.run(fixture.context);

    const sdkInventory = results.find(({id}) => id === "dotnet.sdk-inventory");
    expect(sdkInventory?.status).toBe("fail");
    expect(sdkInventory?.rootCause).toBeDefined();
    expect(sdkInventory?.fixes).not.toEqual([]);
  });

  it("passes sdk-inventory for a compatible .NET 10 preview SDK", async () => {
    const fixture = await createDotnetFixture();
    fixture.setResponse(
      {command: "dotnet", args: ["--list-sdks"]},
      commandResult({stdout: "9.0.317 [C:\\Program Files\\dotnet\\sdk]\n10.0.400-preview.0.26356.102 [C:\\Program Files\\dotnet\\sdk]\n"}),
    );

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "dotnet.sdk-inventory")?.status).toBe("pass");
  });

  it("skips sdk-inventory when requirement sources are invalid", async () => {
    const fixture = await createDotnetFixture({requirementsValid: false});

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "dotnet.sdk-inventory")?.status).toBe("skipped");
  });

  it("fails dotnet.host on a malformed dotnet --info document", async () => {
    const fixture = await createDotnetFixture();
    fixture.setResponse({command: "dotnet", args: ["--info"]}, commandResult({stdout: "Not a recognized document.\n"}));

    const results = await dotnetDoctorModule.run(fixture.context);

    const host = results.find(({id}) => id === "dotnet.host");
    expect(host?.status).toBe("fail");
    expect(host?.rootCause).toBeDefined();
  });

  it("fails dotnet.host on an architecture mismatch", async () => {
    const fixture = await createDotnetFixture();
    fixture.setResponse({command: "dotnet", args: ["--info"]}, commandResult({stdout: dotnetInfoOutput({architecture: "arm64"})}));

    const results = await dotnetDoctorModule.run(fixture.context);

    const host = results.find(({id}) => id === "dotnet.host");
    expect(host?.status).toBe("fail");
    expect(host?.evidence.join("\n")).toContain("arm64");
  });

  it("warns dotnet.workloads when the command fails", async () => {
    const fixture = await createDotnetFixture();
    fixture.setResponse({command: "dotnet", args: ["workload", "list"]}, commandResult({code: 1, stderr: "workload manifest error"}));

    const results = await dotnetDoctorModule.run(fixture.context);

    const workloads = results.find(({id}) => id === "dotnet.workloads");
    expect(workloads?.status).toBe("warn");
    expect(workloads?.evidence).not.toEqual([]);
    expect(workloads?.fixes).not.toEqual([]);
  });

  it("warns dotnet.nuget-state when the global-packages cache has not been populated", async () => {
    const fixture = await createDotnetFixture();
    const missingCache = resolve(fixture.root, "does-not-exist-cache");
    fixture.setResponse(
      {command: "dotnet", args: ["nuget", "locals", "global-packages", "--list"]},
      commandResult({stdout: `global-packages: ${missingCache}\n`}),
    );

    const results = await dotnetDoctorModule.run(fixture.context);

    const nugetState = results.find(({id}) => id === "dotnet.nuget-state");
    expect(nugetState?.status).toBe("warn");
    expect(nugetState?.rootCause).toBeDefined();
  });

  it("fails dotnet.nuget-state when a packages.lock.json file is malformed", async () => {
    const fixture = await createDotnetFixture();
    await writeFixtureFile(resolve(fixture.root, "sites", "api.arolariu.ro", "src", "Common", "packages.lock.json"), "{not-json");

    const results = await dotnetDoctorModule.run(fixture.context);

    const nugetState = results.find(({id}) => id === "dotnet.nuget-state");
    expect(nugetState?.status).toBe("fail");
    expect(nugetState?.evidence.join("\n")).toContain("packages.lock.json");
  });

  it("fails dotnet.solution when a referenced project is missing", async () => {
    const fixture = await createDotnetFixture();
    await rm(resolve(fixture.root, "sites", "api.arolariu.ro", "src", "Common", "arolariu.Backend.Common.csproj"));

    const results = await dotnetDoctorModule.run(fixture.context);

    const solution = results.find(({id}) => id === "dotnet.solution");
    expect(solution?.status).toBe("fail");
    expect(solution?.evidence.join("\n")).toContain("Common.csproj");
  });

  it("warns dotnet.local-tools when a manifest tool is not installed locally", async () => {
    const fixture = await createDotnetFixture();
    fixture.setResponse(
      {command: "dotnet", args: ["tool", "list", "--local"]},
      commandResult({stdout: "Package Id   Version   Commands\n----------------------------\n"}),
    );

    const results = await dotnetDoctorModule.run(fixture.context);

    const localTools = results.find(({id}) => id === "dotnet.local-tools");
    expect(localTools?.status).toBe("warn");
    expect(localTools?.evidence.join("\n")).toContain("defaultdocumentation.console");
  });

  it("warns dotnet.https-certificate when a certificate exists but is not trusted", async () => {
    const fixture = await createDotnetFixture();
    fixture.setResponse(
      {command: "dotnet", args: ["dev-certs", "https", "--check", "--trust"]},
      commandResult({code: 7, stdout: "none of them is trusted\n"}),
    );

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "dotnet.https-certificate")?.status).toBe("warn");
  });

  it("fails dotnet.https-certificate when no certificate is present", async () => {
    const fixture = await createDotnetFixture();
    fixture.setResponse(
      {command: "dotnet", args: ["dev-certs", "https", "--check"]},
      commandResult({code: 1, stdout: "No valid certificate was found\n"}),
    );

    const results = await dotnetDoctorModule.run(fixture.context);

    const certificate = results.find(({id}) => id === "dotnet.https-certificate");
    expect(certificate?.status).toBe("fail");
    expect(certificate?.fixes).not.toEqual([]);
  });

  it("warns dotnet.apphost when required parameters are missing from tracked config and user-secrets", async () => {
    const fixture = await createDotnetFixture();
    await writeFixtureFile(
      resolve(fixture.root, "tooling", "AppHost", "appsettings.Development.json"),
      JSON.stringify({Parameters: {"sql-password": "qazWSXedcRFV1234!"}}),
    );
    fixture.setResponse(
      {command: "dotnet", args: ["user-secrets", "list", "--json", "--project", "tooling/AppHost/AppHost.csproj"]},
      commandResult({code: 1, stderr: "No secrets configured for this application."}),
    );

    const results = await dotnetDoctorModule.run(fixture.context);

    const appHost = results.find(({id}) => id === "dotnet.apphost");
    expect(appHost?.status).toBe("warn");
    expect(appHost?.evidence.join("\n")).toContain("Parameters:redis-password");
    expect(appHost?.evidence.join("\n")).not.toContain("RedisPassword123!");
  });

  it("recovers a missing AppHost parameter from dotnet user-secrets", async () => {
    const fixture = await createDotnetFixture();
    await writeFixtureFile(
      resolve(fixture.root, "tooling", "AppHost", "appsettings.Development.json"),
      JSON.stringify({Parameters: {"sql-password": "qazWSXedcRFV1234!"}}),
    );
    fixture.setResponse(
      {command: "dotnet", args: ["user-secrets", "list", "--json", "--project", "tooling/AppHost/AppHost.csproj"]},
      commandResult({stdout: JSON.stringify({"Parameters:redis-password": "RedisPassword123!"})}),
    );

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "dotnet.apphost")?.status).toBe("pass");
  });

  it("fails dotnet.apphost when the AppHost project file is missing", async () => {
    const fixture = await createDotnetFixture();
    await rm(resolve(fixture.root, "tooling", "AppHost", "AppHost.csproj"));

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "dotnet.apphost")?.status).toBe("fail");
  });

  it("skips dotnet.nuget-feed in quick mode without probing the network", async () => {
    const fixture = await createDotnetFixture({options: {quick: true}});

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "dotnet.nuget-feed")?.status).toBe("skipped");
    expect(fixture.context.network.get).not.toHaveBeenCalled();
  });

  it("skips dotnet.nuget-feed when the network probe is unavailable", async () => {
    const fixture = await createDotnetFixture({networkResult: {status: "unavailable", durationMs: 1, error: "offline"}});

    const results = await dotnetDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "dotnet.nuget-feed")?.status).toBe("skipped");
  });

  it("warns dotnet.nuget-feed on a non-200 response", async () => {
    const fixture = await createDotnetFixture({networkResult: {status: "reachable", statusCode: 503, durationMs: 2}});

    const results = await dotnetDoctorModule.run(fixture.context);

    const nugetFeed = results.find(({id}) => id === "dotnet.nuget-feed");
    expect(nugetFeed?.status).toBe("warn");
    expect(nugetFeed?.evidence.join("\n")).toContain("503");
  });

  it("warns dotnet.nuget-feed on malformed successful content", async () => {
    const fixture = await createDotnetFixture({
      networkResult: {status: "reachable", statusCode: 200, durationMs: 2, body: "not-json"},
    });

    const results = await dotnetDoctorModule.run(fixture.context);

    const nugetFeed = results.find(({id}) => id === "dotnet.nuget-feed");
    expect(nugetFeed?.status).toBe("warn");
    expect(nugetFeed?.evidence).not.toEqual([]);
    expect(nugetFeed?.fixes).not.toEqual([]);
    expect([nugetFeed?.rootCause !== undefined, (nugetFeed?.potentialCauses ?? []).length > 0].filter(Boolean)).toHaveLength(1);
  });

  it("warns dotnet.nuget-feed when the successful response has no body", async () => {
    const fixture = await createDotnetFixture({
      networkResult: {status: "reachable", statusCode: 200, durationMs: 2},
    });

    const results = await dotnetDoctorModule.run(fixture.context);

    const nugetFeed = results.find(({id}) => id === "dotnet.nuget-feed");
    expect(nugetFeed?.status).toBe("warn");
    expect(nugetFeed?.evidence).not.toEqual([]);
    expect(nugetFeed?.fixes).not.toEqual([]);
  });

  it("warns dotnet.nuget-feed when the successful response body lacks a resources array", async () => {
    const fixture = await createDotnetFixture({
      networkResult: {status: "reachable", statusCode: 200, durationMs: 2, body: JSON.stringify({version: "3.0.0"})},
    });

    const results = await dotnetDoctorModule.run(fixture.context);

    const nugetFeed = results.find(({id}) => id === "dotnet.nuget-feed");
    expect(nugetFeed?.status).toBe("warn");
  });
});
