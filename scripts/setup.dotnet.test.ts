// @vitest-environment node
/**
 * @fileoverview Contract tests for the independent .NET setup phase.
 * @module scripts.setup.dotnet.test
 */

import {resolve} from "node:path";
import {describe, expect, it, vi} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import type {CommandResult, CommandRunner, CommandSpec} from "./common/process.ts";
import {createRepositoryPaths} from "./common/repository-paths.ts";
import type {MinimumVersion, RepositoryRequirements} from "./common/requirements.ts";
import {
  createDotnetSetupPhase,
  dotnetSetupPhase,
  generateLocalDevelopmentPassword,
  parseDotnetSdks,
  selectDotnetInstallationProposal,
} from "./setup.dotnet.ts";
import type {SetupAction, SetupActionDisposition, SetupActionExecutor, SetupContext, SetupOptions} from "./setup.types.ts";

const requiredDotnet: MinimumVersion = {major: 10, minor: 0, patch: 0};
const paths = createRepositoryPaths(resolve("C:\\fixture\\arolariu.ro"));
const appHostProject = resolve(paths.root, "tooling", "AppHost", "AppHost.csproj");
const appHostSettings = resolve(paths.root, "tooling", "AppHost", "appsettings.Development.json");

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

function commandKey(command: Readonly<CommandSpec>): string {
  return [command.command, ...command.args].join("\u0000");
}

const commandKeys = {
  sdks: commandKey({command: "dotnet", args: ["--list-sdks"]}),
  selectedSdk: commandKey({command: "dotnet", args: ["--version"]}),
  secrets: commandKey({command: "dotnet", args: ["user-secrets", "list", "--json", "--project", appHostProject]}),
  certificate: commandKey({command: "dotnet", args: ["dev-certs", "https", "--check"]}),
  trust: commandKey({command: "dotnet", args: ["dev-certs", "https", "--check-trust-machine-readable"]}),
} as const;

function machineReadableTrustReport(...trustLevels: readonly ("None" | "Partial" | "Full")[]): string {
  return JSON.stringify(
    trustLevels.map((trustLevel) => ({
      Thumbprint: "0123456789ABCDEF0123456789ABCDEF01234567",
      Subject: "CN=localhost",
      X509SubjectAlternativeNameExtension: [
        "localhost",
        "*.dev.localhost",
        "*.dev.internal",
        "host.docker.internal",
        "host.containers.internal",
      ],
      Version: 6,
      ValidityNotBefore: "2026-01-14T12:00:01+02:00",
      ValidityNotAfter: "2027-01-14T12:00:01+02:00",
      IsHttpsDevelopmentCertificate: true,
      IsExportable: true,
      TrustLevel: trustLevel,
    })),
  );
}

function requirements(): RepositoryRequirements {
  return {
    node: {major: 24, minor: 0, patch: 0},
    npm: {major: 11, minor: 0, patch: 0},
    dotnet: requiredDotnet,
    python: {major: 3, minor: 12, patch: 0},
    packages: new Map(),
  };
}

function setupOptions(patch: Partial<SetupOptions> = {}): SetupOptions {
  return {
    verbose: false,
    dryRun: false,
    yes: false,
    ...patch,
  };
}

function defaultResponse(command: Readonly<CommandSpec>): CommandResult {
  const key = commandKey(command);
  if (key === commandKeys.sdks) {
    return commandResult({stdout: "10.0.100 [C:\\Program Files\\dotnet\\sdk]\n"});
  }
  if (key === commandKeys.selectedSdk) {
    return commandResult({stdout: "10.0.100\n"});
  }
  if (key === commandKeys.secrets) {
    return commandResult({
      stdout: '//BEGIN\n{"Parameters:sql-password":"existing-sql","Parameters:redis-password":"existing-redis"}\n//END\n',
    });
  }
  if (key === commandKeys.certificate) {
    return commandResult();
  }
  if (key === commandKeys.trust) {
    return commandResult({stdout: machineReadableTrustReport("Full")});
  }
  return commandResult();
}

function createRunner(responses: Readonly<Record<string, CommandResult | readonly CommandResult[]>> = {}): Readonly<{
  runner: CommandRunner;
  run: ReturnType<typeof vi.fn<CommandRunner["run"]>>;
}> {
  const offsets = new Map<string, number>();
  const run = vi.fn<CommandRunner["run"]>(async (command) => {
    const key = commandKey(command);
    const configured = responses[key];
    if (Array.isArray(configured)) {
      const offset = offsets.get(key) ?? 0;
      offsets.set(key, offset + 1);
      return configured[offset] ?? configured.at(-1) ?? defaultResponse(command);
    }
    return configured ?? defaultResponse(command);
  });
  return {runner: {run}, run};
}

function createActions(dispositions: Readonly<Record<string, SetupActionDisposition>> = {}): Readonly<{
  actions: SetupActionExecutor;
  actionIds: string[];
  actionRecords: SetupAction[];
}> {
  const actionIds: string[] = [];
  const actionRecords: SetupAction[] = [];
  const actions: SetupActionExecutor = {
    run: async (action) => {
      actionIds.push(action.id);
      actionRecords.push(action);
      const disposition = dispositions[action.id] ?? "executed";
      if (disposition === "executed") {
        await action.execute();
      }
      return disposition;
    },
  };
  return {actions, actionIds, actionRecords};
}

function createHarness(
  input: Readonly<{
    responses?: Readonly<Record<string, CommandResult | readonly CommandResult[]>>;
    dispositions?: Readonly<Record<string, SetupActionDisposition>>;
    options?: SetupOptions;
    platform?: NodeJS.Platform;
    settings?: string | Error;
    randomBytes?: (size: number) => Uint8Array;
  }> = {},
): Readonly<{
  phase: ReturnType<typeof createDotnetSetupPhase>;
  context: SetupContext;
  run: ReturnType<typeof vi.fn<CommandRunner["run"]>>;
  actionIds: string[];
  actionRecords: SetupAction[];
  sink: InMemoryLoggerSink;
  redactions: string[];
}> {
  const {runner, run} = createRunner(input.responses);
  const {actions, actionIds, actionRecords} = createActions(input.dispositions);
  const sink = new InMemoryLoggerSink();
  const redactions: string[] = [];
  const logger = new MonorepositoryConsoleLogger("setup::dotnet", {color: false, sink});
  const originalRedact = logger.redact.bind(logger);
  logger.redact = (value: string): void => {
    redactions.push(value);
    originalRedact(value);
  };
  let now = 0;
  const context: SetupContext = {
    options: input.options ?? setupOptions(),
    paths,
    requirements: requirements(),
    runner,
    prompts: {
      confirm: async () => true,
      select: async <TValue extends string>(
        _message: string,
        choices: readonly Readonly<{value: TValue; label: string}>[],
      ): Promise<TValue> => {
        const selected = choices[0]?.value;
        if (selected === undefined) {
          throw new Error("A test choice is required.");
        }
        return selected;
      },
      text: async () => "",
      secret: async () => "",
    },
    actions,
    logger,
    now: () => now++,
  };
  const settings =
    input.settings
    ?? JSON.stringify({
      Parameters: {
        "sql-password": "tracked-shape-only-sql",
        "redis-password": "tracked-shape-only-redis",
      },
    });
  const phase = createDotnetSetupPhase({
    platform: input.platform ?? "win32",
    readTextFile: async (path) => {
      expect(path).toBe(appHostSettings);
      if (settings instanceof Error) {
        throw settings;
      }
      return settings;
    },
    randomBytes: input.randomBytes ?? ((size) => new Uint8Array(size).fill(7)),
  });
  return {phase, context, run, actionIds, actionRecords, sink, redactions};
}

describe("dotnet setup public contract", () => {
  it("publishes an independent required phase", () => {
    expect(dotnetSetupPhase).toMatchObject({
      id: "dotnet",
      required: true,
      dependsOn: [],
    });
  });

  it("parses stable and preview SDK lines while ignoring malformed input", () => {
    expect(
      parseDotnetSdks(
        [
          "10.0.100 [C:\\Program Files\\dotnet\\sdk]",
          "11.0.0-preview.4.25258.110 [/usr/share/dotnet/sdk]",
          "9.0.301 [/usr/share/dotnet/sdk]",
          "10.0 [/missing/patch]",
          "text 10.0.200 [/not-leading]",
          "01.0.0 [/leading-zero]",
          "12.3.4",
        ].join("\n"),
      ),
    ).toEqual([
      {major: 10, minor: 0, patch: 100},
      {major: 11, minor: 0, patch: 0},
      {major: 9, minor: 0, patch: 301},
      {major: 12, minor: 3, patch: 4},
    ]);
  });

  it.each([
    [
      "Windows winget",
      {platform: "win32" as const, availablePackageManagers: new Set(["winget"]), required: requiredDotnet},
      {
        command: "winget",
        args: ["install", "--id", "Microsoft.DotNet.SDK.10", "--exact", "--accept-package-agreements", "--accept-source-agreements"],
      },
    ],
    [
      "macOS Homebrew",
      {platform: "darwin" as const, availablePackageManagers: new Set(["brew"]), required: requiredDotnet},
      {command: "brew", args: ["install", "--cask", "dotnet-sdk"]},
    ],
    [
      "Linux apt",
      {platform: "linux" as const, availablePackageManagers: new Set(["apt-get", "dnf"]), required: requiredDotnet},
      {command: "sudo", args: ["apt-get", "install", "-y", "dotnet-sdk-10.0"]},
    ],
    [
      "Linux dnf",
      {platform: "linux" as const, availablePackageManagers: new Set(["dnf"]), required: requiredDotnet},
      {command: "sudo", args: ["dnf", "install", "-y", "dotnet-sdk-10.0"]},
    ],
  ])("selects the supported $0 proposal", (_name, input, command) => {
    expect(selectDotnetInstallationProposal(input)?.command).toEqual(command);
  });

  it.each([
    ["missing manager", {platform: "linux" as const, availablePackageManagers: new Set<string>(), required: requiredDotnet}],
    ["apt without a candidate", {platform: "linux" as const, availablePackageManagers: new Set(["apt-cache"]), required: requiredDotnet}],
    ["unsupported platform", {platform: "freebsd" as const, availablePackageManagers: new Set(["winget"]), required: requiredDotnet}],
  ])("does not invent an installation path for $0", (_name, input) => {
    expect(selectDotnetInstallationProposal(input)).toBeNull();
  });
});

describe("generateLocalDevelopmentPassword", () => {
  it("requests exactly 24 bytes and emits an unpadded base64url password", () => {
    const source = vi.fn<(size: number) => Uint8Array>().mockReturnValue(Uint8Array.from({length: 24}, (_, index) => index + 240));

    const password = generateLocalDevelopmentPassword(source);

    expect(source).toHaveBeenCalledExactlyOnceWith(24);
    expect(password).toMatch(/^Aa1![A-Za-z0-9_-]{32}$/);
    expect(password).not.toMatch(/[+/=]/);
  });

  it("rejects a random source that returns the wrong byte count", () => {
    expect(() => generateLocalDevelopmentPassword(() => new Uint8Array(23))).toThrow(/exactly 24/i);
  });
});

describe("dotnet SDK readiness", () => {
  it("accepts a compatible listed stable SDK and selected preview SDK", async () => {
    const harness = createHarness({
      responses: {
        [commandKeys.sdks]: commandResult({stdout: "9.0.400 [sdk]\n10.0.100-preview.7.25380.108 [sdk]\n"}),
        [commandKeys.selectedSdk]: commandResult({stdout: "10.0.100-preview.7.25380.108\n"}),
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds).not.toContain("dotnet.install-sdk");
  });

  it.each([
    ["only older SDKs", commandResult({stdout: "9.0.400 [sdk]\n"}), commandResult({stdout: "9.0.400\n"})],
    ["a missing CLI", commandResult({code: 1, spawnError: "ENOENT"}), commandResult({code: 1, spawnError: "ENOENT"})],
    ["a selected-SDK mismatch", commandResult({stdout: "10.0.100 [sdk]\n"}), commandResult({stdout: "9.0.400\n"})],
  ])("requires installation for $0", async (_name, sdkResult, selectedResult) => {
    const wingetKey = commandKey({command: "winget", args: ["--version"]});
    const harness = createHarness({
      responses: {
        [commandKeys.sdks]: sdkResult,
        [commandKeys.selectedSdk]: selectedResult,
        [wingetKey]: commandResult({stdout: "v1.11.0\n"}),
      },
      dispositions: {"dotnet.install-sdk": "declined"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("dotnet.install-sdk");
  });

  it("fails with official guidance when no supported installer is discoverable", async () => {
    const harness = createHarness({
      platform: "freebsd",
      responses: {
        [commandKeys.sdks]: commandResult({code: 1, spawnError: "ENOENT"}),
        [commandKeys.selectedSdk]: commandResult({code: 1, spawnError: "ENOENT"}),
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.nextActions.join("\n")).toContain("https://dotnet.microsoft.com/download");
    expect(harness.run.mock.calls.flatMap(([command]) => command.args).join(" ")).not.toMatch(/curl|Invoke-WebRequest|dotnet-install/);
  });

  it("requires both SDK probes to pass after an executed installation", async () => {
    const wingetKey = commandKey({command: "winget", args: ["--version"]});
    const installKey = commandKey(
      selectDotnetInstallationProposal({
        platform: "win32",
        availablePackageManagers: new Set(["winget"]),
        required: requiredDotnet,
      })!.command,
    );
    const harness = createHarness({
      responses: {
        [commandKeys.sdks]: [commandResult({code: 1, spawnError: "ENOENT"}), commandResult({stdout: "10.0.100 [sdk]\n"})],
        [commandKeys.selectedSdk]: [commandResult({code: 1, spawnError: "ENOENT"}), commandResult({stdout: "malformed-selection\n"})],
        [wingetKey]: commandResult({stdout: "v1.11.0\n"}),
        [installKey]: commandResult(),
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.summary).toMatch(/SDK/i);
    expect(harness.actionIds).toEqual(["dotnet.install-sdk"]);
  });
});

describe("restore ordering and failures", () => {
  it("runs the exact restore commands in order with their scopes and logger-backed tee output", async () => {
    const harness = createHarness();

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionRecords.slice(0, 3).map(({id, scope}) => ({id, scope}))).toEqual([
      {id: "dotnet.workload-restore", scope: "system"},
      {id: "dotnet.solution-restore", scope: "repository"},
      {id: "dotnet.tool-restore", scope: "user"},
    ]);
    const restoreCalls = harness.run.mock.calls.filter(([command]) => command.command === "dotnet" && command.args.includes("restore"));
    expect(restoreCalls.map(([command]) => command.args)).toEqual([
      ["workload", "restore", paths.solution],
      ["restore", paths.solution],
      ["tool", "restore"],
    ]);
    for (const [, options] of restoreCalls) {
      expect(options).toMatchObject({cwd: paths.root, output: "tee", logger: harness.context.logger});
    }
  });

  it.each([
    ["nonzero", commandResult({code: 7, stdout: "restore output", stderr: "restore error"})],
    ["timeout", commandResult({code: 1, timedOut: true})],
    ["signal", commandResult({code: 1, signal: "SIGTERM"})],
    ["spawn error", commandResult({code: 1, spawnError: "EACCES"})],
  ])("retains explicit safe restore evidence for $0", async (_name, failure) => {
    const workloadKey = commandKey({command: "dotnet", args: ["workload", "restore", paths.solution]});
    const harness = createHarness({responses: {[workloadKey]: failure}});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/restore|timed out|SIGTERM|EACCES/i);
    if (failure.stderr !== "") {
      expect(result.evidence.join("\n")).toContain(failure.stderr);
    }
  });
});

describe("AppHost configuration and user secrets", () => {
  it.each([
    ["unreadable", new Error("EACCES")],
    ["malformed", "not json"],
    ["missing SQL parameter", '{"Parameters":{"redis-password":"shape-value"}}'],
    ["empty Redis parameter", '{"Parameters":{"sql-password":"shape-value","redis-password":""}}'],
  ])("fails tracked AppHost validation when it is $0 without exposing tracked values", async (_name, settings) => {
    const harness = createHarness({settings});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).not.toContain("shape-value");
    expect(harness.run.mock.calls.some(([command]) => command.args[0] === "user-secrets")).toBe(false);
  });

  it.each([
    [
      "wrapped",
      '//BEGIN\n{"Parameters:sql-password":"wrapped-sql","Parameters:redis-password":"wrapped-redis"}\n//END\n',
      ["wrapped-sql", "wrapped-redis"],
    ],
    ["plain", '{"Parameters:sql-password":"plain-sql","Parameters:redis-password":"plain-redis"}', ["plain-sql", "plain-redis"]],
  ])("accepts $0 JSON and immediately redacts discovered values", async (_name, stdout, secrets) => {
    const harness = createHarness({responses: {[commandKeys.secrets]: commandResult({stdout})}});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.redactions).toEqual(expect.arrayContaining(secrets));
    expect(result.evidence.join("\n")).not.toContain(stdout);
  });

  it("accepts a wrapped secret value containing the wrapper terminator text", async () => {
    const markerSecret = "existing-//END-value";
    const harness = createHarness({
      responses: {
        [commandKeys.secrets]: commandResult({
          stdout: `//BEGIN\n${JSON.stringify({
            "Parameters:sql-password": markerSecret,
            "Parameters:redis-password": "existing-redis",
          })}\n//END\n`,
        }),
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.redactions).toContain(markerSecret);
  });

  it("rejects malformed secret JSON without retaining raw stdout", async () => {
    const raw = "//BEGIN\nnot-json-SENSITIVE\n//END\n";
    const harness = createHarness({responses: {[commandKeys.secrets]: commandResult({stdout: raw})}});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).not.toContain("not-json-SENSITIVE");
  });

  it("generates each missing key independently inside one action and sends values only through stdin", async () => {
    const random = vi
      .fn<(size: number) => Uint8Array>()
      .mockReturnValueOnce(new Uint8Array(24).fill(1))
      .mockReturnValueOnce(new Uint8Array(24).fill(2));
    const setKey = commandKey({command: "dotnet", args: ["user-secrets", "set", "--project", appHostProject]});
    const harness = createHarness({
      randomBytes: random,
      responses: {
        [commandKeys.secrets]: [
          commandResult({stdout: "{}"}),
          commandResult({
            stdout:
              '{"Parameters:sql-password":"Aa1!AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB","Parameters:redis-password":"Aa1!AgICAgICAgICAgICAgICAgICAgICAgIC"}',
          }),
        ],
        [setKey]: commandResult(),
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(random).toHaveBeenNthCalledWith(1, 24);
    expect(random).toHaveBeenNthCalledWith(2, 24);
    expect(harness.actionRecords.find(({id}) => id === "dotnet.user-secrets.set")?.scope).toBe("user");
    const setCall = harness.run.mock.calls.find(([command]) => commandKey(command) === setKey);
    expect(setCall?.[0].args).toEqual(["user-secrets", "set", "--project", appHostProject]);
    expect(JSON.parse(String(setCall?.[1]?.input))).toEqual({
      "Parameters:sql-password": "Aa1!AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB",
      "Parameters:redis-password": "Aa1!AgICAgICAgICAgICAgICAgICAgICAgIC",
    });
    const secretValues = Object.values(JSON.parse(String(setCall?.[1]?.input)) as Readonly<Record<string, string>>);
    const retained = JSON.stringify({
      args: harness.run.mock.calls.map(([command]) => command.args),
      logs: harness.sink.records,
      result,
      actions: harness.actionRecords.map(({id, scope, summary}) => ({id, scope, summary})),
    });
    for (const secret of secretValues) {
      expect(harness.redactions).toContain(secret);
      expect(retained).not.toContain(secret);
    }
  });

  it("sets only the independently missing secret key", async () => {
    const random = vi.fn<(size: number) => Uint8Array>().mockReturnValue(new Uint8Array(24).fill(3));
    const harness = createHarness({
      randomBytes: random,
      responses: {
        [commandKeys.secrets]: [
          commandResult({stdout: '{"Parameters:sql-password":"existing-sql"}'}),
          commandResult({
            stdout: '{"Parameters:sql-password":"existing-sql","Parameters:redis-password":"Aa1!AwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD"}',
          }),
        ],
      },
    });

    await expect(harness.phase.run(harness.context)).resolves.toMatchObject({status: "succeeded"});
    expect(random).toHaveBeenCalledOnce();
    const setCall = harness.run.mock.calls.find(([command]) => command.args[0] === "user-secrets" && command.args[1] === "set");
    expect(Object.keys(JSON.parse(String(setCall?.[1]?.input)) as object)).toEqual(["Parameters:redis-password"]);
  });

  it("replaces a whitespace-only required secret without registering whitespace as a redaction", async () => {
    const random = vi.fn<(size: number) => Uint8Array>().mockReturnValue(new Uint8Array(24).fill(3));
    const harness = createHarness({
      randomBytes: random,
      responses: {
        [commandKeys.secrets]: [
          commandResult({stdout: '{"Parameters:sql-password":"   ","Parameters:redis-password":"existing-redis"}'}),
          commandResult({
            stdout: '{"Parameters:sql-password":"Aa1!AwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD","Parameters:redis-password":"existing-redis"}',
          }),
        ],
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(random).toHaveBeenCalledOnce();
    expect(harness.redactions).not.toContain("   ");
    const setCall = harness.run.mock.calls.find(([command]) => command.args[0] === "user-secrets" && command.args[1] === "set");
    expect(Object.keys(JSON.parse(String(setCall?.[1]?.input)) as object)).toEqual(["Parameters:sql-password"]);
  });

  it("fails post-set verification and sanitizes known values from child errors", async () => {
    const generated = "Aa1!BAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE";
    const harness = createHarness({
      randomBytes: () => new Uint8Array(24).fill(4),
      responses: {
        [commandKeys.secrets]: [
          commandResult({stdout: '{"Parameters:sql-password":"existing-sql"}'}),
          commandResult({stdout: '{"Parameters:sql-password":"existing-sql"}'}),
        ],
        [commandKey({command: "dotnet", args: ["user-secrets", "set", "--project", appHostProject]})]: commandResult({
          code: 1,
          stderr: `tool echoed ${generated}`,
        }),
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).not.toContain(generated);
  });

  it("plans a missing-secret action in dry-run without generating or setting", async () => {
    const random = vi.fn<(size: number) => Uint8Array>();
    const harness = createHarness({
      options: setupOptions({dryRun: true}),
      randomBytes: random,
      responses: {[commandKeys.secrets]: commandResult({stdout: "{}"})},
      dispositions: {
        "dotnet.workload-restore": "planned",
        "dotnet.solution-restore": "planned",
        "dotnet.tool-restore": "planned",
        "dotnet.user-secrets.set": "planned",
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(random).not.toHaveBeenCalled();
    expect(harness.actionIds).toEqual(
      expect.arrayContaining(["dotnet.workload-restore", "dotnet.solution-restore", "dotnet.tool-restore", "dotnet.user-secrets.set"]),
    );
    expect(harness.run.mock.calls.some(([command]) => command.args[0] === "user-secrets" && command.args[1] === "set")).toBe(false);
  });
});

describe("HTTPS development certificate", () => {
  it.each(["win32", "linux"] as const)("accepts the real machine-readable certificate array contract on %s", async (platform) => {
    const harness = createHarness({
      platform,
      responses: {[commandKeys.trust]: commandResult({stdout: machineReadableTrustReport("Full")})},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(result.evidence.join("\n")).toMatch(/certificate is trusted/i);
    expect(harness.actionIds).not.toContain("dotnet.certificate.trust");
  });

  it("accepts trust when any reported development certificate has full trust", async () => {
    const harness = createHarness({
      responses: {[commandKeys.trust]: commandResult({stdout: machineReadableTrustReport("None", "Full")})},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds).not.toContain("dotnet.certificate.trust");
  });

  it("creates an absent certificate and verifies it before checking trust", async () => {
    const createKey = commandKey({command: "dotnet", args: ["dev-certs", "https"]});
    const harness = createHarness({
      responses: {
        [commandKeys.certificate]: [commandResult({code: 1}), commandResult()],
        [createKey]: commandResult(),
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionRecords.find(({id}) => id === "dotnet.certificate.create")?.scope).toBe("user");
    expect(harness.run.mock.calls.filter(([command]) => commandKey(command) === commandKeys.certificate)).toHaveLength(2);
  });

  it("trusts an untrusted certificate and requires the machine-readable recheck", async () => {
    const trustMutationKey = commandKey({command: "dotnet", args: ["dev-certs", "https", "--trust"]});
    const harness = createHarness({
      responses: {
        [commandKeys.trust]: [
          commandResult({stdout: machineReadableTrustReport("None")}),
          commandResult({stdout: machineReadableTrustReport("Full")}),
        ],
        [trustMutationKey]: commandResult(),
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionRecords.find(({id}) => id === "dotnet.certificate.trust")?.scope).toBe("system");
    expect(harness.run.mock.calls.filter(([command]) => commandKey(command) === commandKeys.trust)).toHaveLength(2);
  });

  it.each(["declined", "planned"] as const)("reports $0 trust without fabricating trusted success", async (disposition) => {
    const harness = createHarness({
      responses: {[commandKeys.trust]: commandResult({stdout: machineReadableTrustReport("None")})},
      dispositions: {"dotnet.certificate.trust": disposition},
      ...(disposition === "planned"
        ? {
            options: setupOptions({dryRun: true}),
            dispositions: {
              "dotnet.workload-restore": "planned" as const,
              "dotnet.solution-restore": "planned" as const,
              "dotnet.tool-restore": "planned" as const,
              "dotnet.certificate.trust": "planned" as const,
            },
          }
        : {}),
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe(disposition === "planned" ? "skipped" : "degraded");
    expect(result.evidence.join("\n")).toContain("dotnet.certificate.trust");
    expect(result.summary).not.toMatch(/trusted successfully/i);
  });

  it("degrades when trust execution fails and names remediation", async () => {
    const trustMutationKey = commandKey({command: "dotnet", args: ["dev-certs", "https", "--trust"]});
    const harness = createHarness({
      responses: {
        [commandKeys.trust]: commandResult({stdout: machineReadableTrustReport("None")}),
        [trustMutationKey]: commandResult({code: 1, stderr: "trust denied"}),
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
    expect(result.evidence.join("\n")).toContain("dotnet.certificate.trust");
    expect(result.nextActions.join("\n")).toMatch(/trust/i);
  });

  it("degrades when the trust postcondition remains false", async () => {
    const harness = createHarness({
      responses: {
        [commandKeys.trust]: [
          commandResult({stdout: machineReadableTrustReport("None")}),
          commandResult({stdout: machineReadableTrustReport("Partial")}),
        ],
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
    expect(result.evidence.join("\n")).toContain("dotnet.certificate.trust");
  });

  it.each(["Full", "None"] as const)(
    "does not use a %s trust payload when the machine-readable probe exits nonzero",
    async (trustLevel) => {
      const harness = createHarness({
        responses: {[commandKeys.trust]: commandResult({code: 9, stdout: machineReadableTrustReport(trustLevel)})},
      });

      const result = await harness.phase.run(harness.context);

      expect(result.status).toBe("degraded");
      expect(result.summary).toMatch(/could not be determined/i);
      expect(harness.actionIds).not.toContain("dotnet.certificate.trust");
    },
  );

  it("degrades with explicit evidence when successful trust output has no recognized state", async () => {
    const harness = createHarness({
      responses: {[commandKeys.trust]: commandResult({stdout: "[]"})},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
    expect(result.evidence.join("\n")).toMatch(/recognizable.*trust level/i);
    expect(harness.actionIds).not.toContain("dotnet.certificate.trust");
  });

  it("fails when certificate creation cannot establish the required postcondition", async () => {
    const harness = createHarness({
      responses: {[commandKeys.certificate]: commandResult({code: 1})},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.nextActions.join("\n")).toMatch(/certificate/i);
  });
});

describe("dry-run and safety contracts", () => {
  it("accumulates safely knowable planned actions without running mutations or postconditions", async () => {
    const harness = createHarness({
      options: setupOptions({dryRun: true}),
      responses: {
        [commandKeys.trust]: commandResult({stdout: machineReadableTrustReport("None")}),
      },
      dispositions: {
        "dotnet.workload-restore": "planned",
        "dotnet.solution-restore": "planned",
        "dotnet.tool-restore": "planned",
        "dotnet.certificate.trust": "planned",
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(result.evidence).toEqual(expect.arrayContaining(harness.actionIds.map((actionId) => expect.stringContaining(actionId))));
    expect(harness.actionIds).toEqual([
      "dotnet.workload-restore",
      "dotnet.solution-restore",
      "dotnet.tool-restore",
      "dotnet.certificate.trust",
    ]);
    expect(harness.run.mock.calls.filter(([command]) => commandKey(command) === commandKeys.certificate)).toHaveLength(1);
    expect(harness.run.mock.calls.filter(([command]) => commandKey(command) === commandKeys.trust)).toHaveLength(1);
  });

  it("plans certificate creation without running dependent trust probes", async () => {
    const harness = createHarness({
      options: setupOptions({dryRun: true}),
      responses: {[commandKeys.certificate]: commandResult({code: 1})},
      dispositions: {
        "dotnet.workload-restore": "planned",
        "dotnet.solution-restore": "planned",
        "dotnet.tool-restore": "planned",
        "dotnet.certificate.create": "planned",
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(harness.actionIds).toContain("dotnet.certificate.create");
    expect(harness.run.mock.calls.some(([command]) => commandKey(command) === commandKeys.trust)).toBe(false);
    expect(harness.run.mock.calls.filter(([command]) => commandKey(command) === commandKeys.certificate)).toHaveLength(1);
  });

  it("plans SDK installation and all safely knowable restore actions without post-install probes", async () => {
    const wingetKey = commandKey({command: "winget", args: ["--version"]});
    const harness = createHarness({
      options: setupOptions({dryRun: true}),
      responses: {
        [commandKeys.sdks]: commandResult({code: 1, spawnError: "ENOENT"}),
        [commandKeys.selectedSdk]: commandResult({code: 1, spawnError: "ENOENT"}),
        [wingetKey]: commandResult({stdout: "v1.11.0"}),
      },
      dispositions: {
        "dotnet.install-sdk": "planned",
        "dotnet.workload-restore": "planned",
        "dotnet.solution-restore": "planned",
        "dotnet.tool-restore": "planned",
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(harness.actionIds).toEqual(["dotnet.install-sdk", "dotnet.workload-restore", "dotnet.solution-restore", "dotnet.tool-restore"]);
    expect(harness.run.mock.calls.filter(([command]) => commandKey(command) === commandKeys.sdks)).toHaveLength(1);
    expect(harness.run.mock.calls.some(([command]) => command.args[0] === "workload")).toBe(false);
  });

  it("rethrows AbortError interruption", async () => {
    const interruption = new DOMException("interrupted", "AbortError");
    const actions: SetupActionExecutor = {run: async () => Promise.reject(interruption)};
    const harness = createHarness();

    await expect(harness.phase.run({...harness.context, actions})).rejects.toBe(interruption);
  });

  it("never invokes build, test, service, update, or remote-installer commands", async () => {
    const harness = createHarness();

    await expect(harness.phase.run(harness.context)).resolves.toMatchObject({status: "succeeded"});

    const commands = harness.run.mock.calls.map(([command]) => [command.command, ...command.args].join(" "));
    expect(commands.join("\n")).not.toMatch(/\bdotnet (?:build|test|run|watch|workload update|tool update)\b/i);
    expect(commands.join("\n")).not.toMatch(/\bcurl\b|Invoke-WebRequest|dotnet-install\.(?:ps1|sh)/i);
  });
});
