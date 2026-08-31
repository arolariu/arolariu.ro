// @vitest-environment node
/**
 * @fileoverview Contract tests for shared read-only .NET inspection facts.
 * @module scripts/inspection/dotnet.test
 */

import {mkdir, mkdtemp, rm, symlink, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {afterEach, describe, expect, it, vi} from "vitest";

import type {CommandResult, CommandRunner, CommandSpec} from "../common/process.ts";
import {createRepositoryPaths, type RepositoryPaths} from "../common/repository-paths.ts";
import {createDotnetProvider} from "./dotnet.ts";
import {createInspectionProbeRunner} from "./probes.ts";

const fixtureRoots: string[] = [];
const APPHOST_PROJECT = "tooling/AppHost/AppHost.csproj";

const DOTNET_VERSION = {command: "dotnet", args: ["--version"]} as const satisfies CommandSpec;
const DOTNET_SDKS = {command: "dotnet", args: ["--list-sdks"]} as const satisfies CommandSpec;
const DOTNET_INFO = {command: "dotnet", args: ["--info"]} as const satisfies CommandSpec;
const DOTNET_WORKLOADS = {command: "dotnet", args: ["workload", "list"]} as const satisfies CommandSpec;
const DOTNET_NUGET = {
  command: "dotnet",
  args: ["nuget", "locals", "global-packages", "--list"],
} as const satisfies CommandSpec;
const DOTNET_TOOLS = {command: "dotnet", args: ["tool", "list", "--local"]} as const satisfies CommandSpec;
const DOTNET_CERTIFICATE = {
  command: "dotnet",
  args: ["dev-certs", "https", "--check"],
} as const satisfies CommandSpec;
const DOTNET_CERTIFICATE_TRUST = {
  command: "dotnet",
  args: ["dev-certs", "https", "--check", "--trust"],
} as const satisfies CommandSpec;
const DOTNET_USER_SECRETS = {
  command: "dotnet",
  args: ["user-secrets", "list", "--json", "--project", APPHOST_PROJECT],
} as const satisfies CommandSpec;
const DOTNET_ENVIRONMENT = {DOTNET_CLI_UI_LANGUAGE: "en-US"} as const;

function commandResult(patch: Partial<CommandResult> = {}): CommandResult {
  return {
    code: 0,
    stdout: "",
    stderr: "",
    durationMs: 1,
    timedOut: false,
    ...patch,
  };
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

function dotnetInfoOutput(input: Readonly<{sdkVersion?: string; hostVersion?: string; architecture?: string; rid?: string}> = {}): string {
  return [
    ".NET SDK:",
    ` Version:           ${input.sdkVersion ?? "10.0.400-preview.0.26356.102"}`,
    " Commit:            sdk-commit",
    "",
    "Runtime Environment:",
    " OS Name:     Windows",
    ` RID:         ${input.rid ?? "win-x64"}`,
    "",
    "Host:",
    `  Version:      ${input.hostVersion ?? "10.0.11"}`,
    `  Architecture: ${input.architecture ?? "x64"}`,
    "  Commit:       host-commit",
    "",
  ].join("\n");
}

function workloadOutput(rows: readonly string[] = ["aspire 9.0.0 SDK", "wasm-tools 10.0.0 SDK"]): string {
  return [
    "Installed Workload Id      Manifest Version      Installation Source",
    "--------------------------------------------------------------------",
    ...rows,
    "",
  ].join("\n");
}

function localToolOutput(rows: readonly string[] = ["defaultdocumentation.console 1.2.4 defaultdocumentation"]): string {
  return ["Package Id Version Commands", "---------------------------", ...rows, ""].join("\n");
}

async function writeFixtureFile(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, contents, "utf8");
}

interface DotnetFixture {
  readonly root: string;
  readonly paths: RepositoryPaths;
  readonly run: ReturnType<typeof vi.fn<CommandRunner["run"]>>;
  readonly setResponse: (command: Readonly<CommandSpec>, result: CommandResult) => void;
  readonly provider: ReturnType<typeof createDotnetProvider>;
}

async function createDotnetFixture(platform: NodeJS.Platform = "win32"): Promise<DotnetFixture> {
  const root = await mkdtemp(join(tmpdir(), "arolariu-inspection-dotnet-"));
  fixtureRoots.push(root);
  const paths = createRepositoryPaths(root);
  const commonProject = "sites/api.arolariu.ro/src/Common/arolariu.Backend.Common.csproj";

  await Promise.all([
    writeFixtureFile(
      paths.solution,
      ["<Solution>", `  <Project Path="${commonProject}" />`, `  <Project Path="${APPHOST_PROJECT}" />`, "</Solution>", ""].join("\n"),
    ),
    writeFixtureFile(resolve(root, commonProject), '<Project Sdk="Microsoft.NET.Sdk" />\n'),
    writeFixtureFile(resolve(root, APPHOST_PROJECT), '<Project Sdk="Microsoft.NET.Sdk" />\n'),
    writeFixtureFile(
      resolve(root, "tooling", "AppHost", "appsettings.Development.json"),
      JSON.stringify({Parameters: {"sql-password": "tracked-value-marker"}}),
    ),
  ]);

  const responses = new Map<string, CommandResult>();
  const setResponse = (command: Readonly<CommandSpec>, result: CommandResult): void => {
    responses.set(commandKey(command, root), result);
  };

  const resolutionCommand =
    platform === "win32" ? ({command: "where.exe", args: ["dotnet.exe"]} as const) : ({command: "which", args: ["dotnet"]} as const);
  const resolvedDotnet = platform === "win32" ? String.raw`C:\Program Files\dotnet\dotnet.exe` : "/usr/local/share/dotnet/dotnet";

  setResponse(DOTNET_VERSION, commandResult({stdout: "10.0.400-preview.0.26356.102\n"}));
  setResponse(resolutionCommand, commandResult({stdout: `${resolvedDotnet}\n`}));
  setResponse(
    DOTNET_SDKS,
    commandResult({
      stdout: ["8.0.408 [C:\\Program Files\\dotnet\\sdk]", "10.0.400-preview.0.26356.102 [C:\\Program Files\\dotnet\\sdk]", ""].join("\n"),
    }),
  );
  setResponse(DOTNET_INFO, commandResult({stdout: dotnetInfoOutput()}));
  setResponse(DOTNET_WORKLOADS, commandResult({stdout: workloadOutput()}));
  const nugetCachePath = platform === "win32" ? resolve(root, ".nuget", "packages") : "/home/arolariu/.nuget/packages";
  setResponse(DOTNET_NUGET, commandResult({stdout: `global-packages: ${nugetCachePath}\n`}));
  setResponse(DOTNET_TOOLS, commandResult({stdout: localToolOutput()}));
  setResponse(DOTNET_CERTIFICATE, commandResult({stdout: "A valid certificate was found.\n"}));
  setResponse(DOTNET_CERTIFICATE_TRUST, commandResult({stdout: "A trusted certificate was found.\n"}));
  setResponse(
    DOTNET_USER_SECRETS,
    commandResult({
      stdout: JSON.stringify({
        "Parameters:redis-password": "secret-value-marker",
        "Unrelated:Marker": "other-value-marker",
      }),
    }),
  );

  const run = vi.fn<CommandRunner["run"]>(
    async (command, options): Promise<CommandResult> =>
      responses.get(commandKey(command, options?.cwd))
      ?? commandResult({code: 127, spawnError: `unexpected-command-marker:${command.command}`}),
  );
  const provider = createDotnetProvider({
    paths,
    probes: createInspectionProbeRunner({run}),
    platform,
    now: clock(),
  });
  return {root, paths, run, setResponse, provider};
}

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map(async (root) => rm(root, {recursive: true, force: true})));
});

describe("createDotnetProvider", () => {
  it("projects one complete healthy .NET inventory without retaining secret values or SDK roots", async () => {
    const fixture = await createDotnetFixture();

    const outcome = await fixture.provider();

    expect(outcome).toEqual({
      kind: "available",
      value: {
        executable: {
          available: true,
          resolvedPaths: [String.raw`C:\Program Files\dotnet\dotnet.exe`],
        },
        selectedVersion: "10.0.400-preview.0.26356.102",
        sdks: ["8.0.408", "10.0.400-preview.0.26356.102"],
        host: {version: "10.0.11", architecture: "x64", rid: "win-x64"},
        workloads: ["aspire", "wasm-tools"],
        nugetCachePath: resolve(fixture.root, ".nuget", "packages"),
        solutionIssues: [],
        localTools: [{name: "defaultdocumentation.console", version: "1.2.4"}],
        certificate: {exists: true, trusted: true},
        appHost: {
          projectExists: true,
          missingParameterKeys: [],
          userSecretKeys: ["Parameters:redis-password", "Unrelated:Marker"],
        },
      },
      durationMs: 5,
    });
    expect(JSON.stringify(outcome)).not.toMatch(/tracked-value-marker|secret-value-marker|other-value-marker|Program Files\\dotnet\\sdk/iu);

    const dotnetOptions = {
      cwd: fixture.root,
      env: DOTNET_ENVIRONMENT,
      timeoutMs: 15_000,
      output: "capture",
    } as const;
    expect(fixture.run.mock.calls).toEqual([
      [DOTNET_VERSION, dotnetOptions],
      [
        {command: "where.exe", args: ["dotnet.exe"]},
        {cwd: fixture.root, timeoutMs: 15_000, output: "capture"},
      ],
      [DOTNET_SDKS, dotnetOptions],
      [DOTNET_INFO, dotnetOptions],
      [DOTNET_WORKLOADS, dotnetOptions],
      [DOTNET_NUGET, dotnetOptions],
      [DOTNET_TOOLS, dotnetOptions],
      [DOTNET_CERTIFICATE, dotnetOptions],
      [DOTNET_CERTIFICATE_TRUST, dotnetOptions],
      [DOTNET_USER_SECRETS, dotnetOptions],
    ]);
  });

  it("returns unavailable for a missing executable without retaining native failure text", async () => {
    const fixture = await createDotnetFixture();
    fixture.setResponse(DOTNET_VERSION, commandResult({code: 1, spawnError: "ENOENT C:\\Users\\raw-user\\dotnet.exe raw-spawn-marker"}));

    const outcome = await fixture.provider();

    expect(outcome).toEqual({
      kind: "unavailable",
      reason: "The dotnet executable is unavailable.",
      durationMs: 5,
    });
    expect(JSON.stringify(outcome)).not.toMatch(/raw-user|raw-spawn-marker/iu);
    expect(fixture.run).toHaveBeenCalledTimes(1);
  });

  it("returns invalid for a malformed selected SDK version", async () => {
    const fixture = await createDotnetFixture();
    fixture.setResponse(DOTNET_VERSION, commandResult({stdout: "selected-version-raw-marker\n"}));

    const outcome = await fixture.provider();

    expect(outcome).toEqual({
      kind: "invalid",
      issues: ["dotnet --version returned malformed output."],
      durationMs: 5,
    });
    expect(JSON.stringify(outcome)).not.toContain("selected-version-raw-marker");
  });

  it.each([
    ["SDK list", DOTNET_SDKS, "not-an-sdk-line raw-sdk-marker", "dotnet --list-sdks returned malformed output."],
    ["host information", DOTNET_INFO, "Host:\n Version: 10.0.11\n", "dotnet --info returned malformed output."],
    ["workload list", DOTNET_WORKLOADS, "raw-workload-marker", "dotnet workload list returned malformed output."],
    ["NuGet cache", DOTNET_NUGET, "raw-nuget-marker", "dotnet nuget locals returned malformed output."],
    ["local tools", DOTNET_TOOLS, "raw-tool-marker", "dotnet tool list returned malformed output."],
    ["user secrets", DOTNET_USER_SECRETS, "{raw-secret-json-marker", "dotnet user-secrets returned malformed output."],
  ] as const)("returns invalid when successful %s output is malformed", async (_case, command, stdout, issue) => {
    const fixture = await createDotnetFixture();
    fixture.setResponse(command, commandResult({stdout}));

    const outcome = await fixture.provider();

    expect(outcome).toEqual({kind: "invalid", issues: [issue], durationMs: 5});
    expect(JSON.stringify(outcome)).not.toMatch(/raw-(?:sdk|workload|nuget|tool|secret)-marker|raw-secret-json-marker/iu);
  });

  it.each([
    [
      "unknown host architecture",
      DOTNET_INFO,
      dotnetInfoOutput({architecture: "rawarchitecturemarker"}),
      "dotnet --info returned malformed output.",
      /rawarchitecturemarker/iu,
    ],
    [
      "path-shaped host RID",
      DOTNET_INFO,
      dotnetInfoOutput({rid: "win-x64/raw-rid-marker"}),
      "dotnet --info returned malformed output.",
      /raw-rid-marker/iu,
    ],
    [
      "relative NuGet cache path",
      DOTNET_NUGET,
      "global-packages: raw-nuget-marker\n",
      "dotnet nuget locals returned malformed output.",
      /raw-nuget-marker/iu,
    ],
    [
      "multi-line NuGet cache payload",
      DOTNET_NUGET,
      `global-packages: C:\\Users\\raw-user\\.nuget\\packages\nraw-nuget-marker\n`,
      "dotnet nuget locals returned malformed output.",
      /raw-user|raw-nuget-marker/iu,
    ],
  ] as const)("rejects a successful but malformed %s without exposing it", async (_case, command, stdout, issue, marker) => {
    const fixture = await createDotnetFixture();
    fixture.setResponse(command, commandResult({stdout}));

    const outcome = await fixture.provider();

    expect(outcome).toEqual({kind: "invalid", issues: [issue], durationMs: 5});
    expect(JSON.stringify(outcome)).not.toMatch(marker);
  });

  it("returns unavailable when a required secondary probe cannot run", async () => {
    const fixture = await createDotnetFixture();
    fixture.setResponse(DOTNET_INFO, commandResult({code: 1, timedOut: true, stderr: "C:\\Users\\raw-user\\raw-timeout-marker"}));

    const outcome = await fixture.provider();

    expect(outcome).toEqual({
      kind: "unavailable",
      reason: "Required .NET host information could not be inspected.",
      durationMs: 5,
    });
    expect(JSON.stringify(outcome)).not.toMatch(/raw-user|raw-timeout-marker/iu);
  });

  it("normalizes the no-workloads table to an empty workload list", async () => {
    const fixture = await createDotnetFixture();
    fixture.setResponse(DOTNET_WORKLOADS, commandResult({stdout: workloadOutput(["No workloads installed."])}));

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({kind: "available", value: {workloads: []}});
  });

  it("accepts a valid four-component NuGet version for a local tool", async () => {
    const fixture = await createDotnetFixture();
    fixture.setResponse(
      DOTNET_TOOLS,
      commandResult({stdout: localToolOutput(["defaultdocumentation.console 1.2.3.4 defaultdocumentation"])}),
    );

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {localTools: [{name: "defaultdocumentation.console", version: "1.2.3.4"}]},
    });
  });

  it("represents an absent certificate without running the trust probe", async () => {
    const fixture = await createDotnetFixture();
    fixture.setResponse(DOTNET_CERTIFICATE, commandResult({code: 1, stdout: "No valid certificate was found.\n"}));

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {certificate: {exists: false, trusted: false}},
    });
    expect(
      fixture.run.mock.calls.some(
        ([command]) => command.command === "dotnet" && command.args.join(" ") === "dev-certs https --check --trust",
      ),
    ).toBe(false);
  });

  it("represents an existing untrusted certificate", async () => {
    const fixture = await createDotnetFixture();
    fixture.setResponse(DOTNET_CERTIFICATE_TRUST, commandResult({code: 1, stdout: "Certificate is not trusted.\n"}));

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {certificate: {exists: true, trusted: false}},
    });
  });

  it("returns repository-relative solution issues for missing and escaping project references", async () => {
    const fixture = await createDotnetFixture();
    await writeFixtureFile(
      fixture.paths.solution,
      [
        "<Solution>",
        '  <Project Path="sites/api.arolariu.ro/src/Missing/Missing.csproj" />',
        '  <Project Path="../outside/Outside.csproj" />',
        '  <Project Path="C:\\Users\\raw-user\\Outside.csproj" />',
        "</Solution>",
      ].join("\n"),
    );

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {
        solutionIssues: [
          "Invalid solution project path: ../outside/Outside.csproj",
          "Missing solution project: sites/api.arolariu.ro/src/Missing/Missing.csproj",
          "The repository solution contains an invalid project path.",
        ],
      },
    });
    if (outcome.kind === "available") {
      expect(JSON.stringify(outcome.value.solutionIssues)).not.toMatch(/raw-user|arolariu-inspection-dotnet/iu);
    }
  });

  it("redacts URI and drive-relative solution references instead of treating them as repository paths", async () => {
    const fixture = await createDotnetFixture();
    await writeFixtureFile(
      fixture.paths.solution,
      [
        "<Solution>",
        '  <Project Path="file:///C:/Users/raw-uri-user/Outside.csproj" />',
        '  <Project Path="C:Users/raw-drive-user/Outside.csproj" />',
        "</Solution>",
      ].join("\n"),
    );

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {solutionIssues: ["The repository solution contains an invalid project path."]},
    });
    expect(JSON.stringify(outcome)).not.toMatch(/raw-uri-user|raw-drive-user/iu);
  });

  it("rejects an existing solution project path that names a directory", async () => {
    const fixture = await createDotnetFixture();
    const directoryProject = "sites/api.arolariu.ro/src/Directory.csproj";
    await mkdir(resolve(fixture.root, directoryProject), {recursive: true});
    await writeFixtureFile(fixture.paths.solution, ["<Solution>", `  <Project Path="${directoryProject}" />`, "</Solution>"].join("\n"));

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {solutionIssues: [`Invalid solution project path: ${directoryProject}`]},
    });
  });

  it("rejects a solution project reached through a repository link that escapes the canonical root", async () => {
    const fixture = await createDotnetFixture();
    const externalRoot = await mkdtemp(join(tmpdir(), "arolariu-inspection-dotnet-external-"));
    fixtureRoots.push(externalRoot);
    await writeFixtureFile(resolve(externalRoot, "External.csproj"), '<Project Sdk="Microsoft.NET.Sdk" />\n');
    await symlink(externalRoot, resolve(fixture.root, "linked-project"), process.platform === "win32" ? "junction" : "dir");
    await writeFixtureFile(
      fixture.paths.solution,
      ["<Solution>", '  <Project Path="linked-project/External.csproj" />', "</Solution>"].join("\n"),
    );

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {solutionIssues: ["Invalid solution project path: linked-project/External.csproj"]},
    });
  });

  it("returns an explicit solution issue when the solution file is missing", async () => {
    const fixture = await createDotnetFixture();
    await rm(fixture.paths.solution);

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {solutionIssues: ["The repository solution file is missing."]},
    });
  });

  it("represents a missing AppHost project and skips project-scoped user-secret inspection", async () => {
    const fixture = await createDotnetFixture();
    await rm(resolve(fixture.root, APPHOST_PROJECT));

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {
        appHost: {
          projectExists: false,
          missingParameterKeys: ["Parameters:sql-password", "Parameters:redis-password"],
          userSecretKeys: [],
        },
      },
    });
    expect(fixture.run.mock.calls.some(([command]) => command.args[0] === "user-secrets")).toBe(false);
  });

  it("combines tracked and wrapped user-secret parameter presence without retaining values", async () => {
    const fixture = await createDotnetFixture();
    fixture.setResponse(
      DOTNET_USER_SECRETS,
      commandResult({
        stdout: [
          "prefix ignored by wrapper",
          "//BEGIN",
          JSON.stringify({
            "Parameters:redis-password": "wrapped-secret-value-marker",
            "Other:Key": "other-secret-value-marker",
          }),
          "//END",
          "suffix ignored by wrapper",
        ].join("\n"),
      }),
    );

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {
        appHost: {
          missingParameterKeys: [],
          userSecretKeys: ["Other:Key", "Parameters:redis-password"],
        },
      },
    });
    expect(JSON.stringify(outcome)).not.toMatch(/wrapped-secret-value-marker|other-secret-value-marker/iu);
  });

  it("returns missing AppHost parameter keys when neither tracked config nor user secrets supplies them", async () => {
    const fixture = await createDotnetFixture();
    await writeFixtureFile(resolve(fixture.root, "tooling", "AppHost", "appsettings.Development.json"), JSON.stringify({Parameters: {}}));
    fixture.setResponse(DOTNET_USER_SECRETS, commandResult({stdout: "{}"}));

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {
        appHost: {
          missingParameterKeys: ["Parameters:sql-password", "Parameters:redis-password"],
          userSecretKeys: [],
        },
      },
    });
  });

  it("returns invalid for malformed tracked AppHost development configuration", async () => {
    const fixture = await createDotnetFixture();
    await writeFixtureFile(resolve(fixture.root, "tooling", "AppHost", "appsettings.Development.json"), "{apphost-raw-marker");

    const outcome = await fixture.provider();

    expect(outcome).toEqual({
      kind: "invalid",
      issues: ["AppHost development configuration is malformed."],
      durationMs: 5,
    });
    expect(JSON.stringify(outcome)).not.toContain("apphost-raw-marker");
  });

  it("uses the injected POSIX platform for executable resolution", async () => {
    const fixture = await createDotnetFixture("linux");

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {
        executable: {
          resolvedPaths: ["/usr/local/share/dotnet/dotnet"],
        },
      },
    });
    expect(fixture.run).toHaveBeenCalledWith(
      {command: "which", args: ["dotnet"]},
      {cwd: fixture.root, timeoutMs: 15_000, output: "capture"},
    );
  });
});
