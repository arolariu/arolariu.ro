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
import type {DotnetFacts} from "./inspection/dotnet.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";
import type {InspectionOutcome} from "./inspection/types.ts";
import {
  createDotnetSetupPhase,
  dotnetSetupPhase,
  generateLocalDevelopmentPassword,
  selectDotnetInstallationProposal,
} from "./setup.dotnet.ts";
import type {SetupAction, SetupActionDisposition, SetupActionExecutor, SetupContext, SetupOptions} from "./setup.types.ts";

const requiredDotnet: MinimumVersion = {major: 10, minor: 0, patch: 0};
const paths = createRepositoryPaths(resolve("C:\\fixture\\arolariu.ro"));
const appHostProject = resolve(paths.root, "tooling", "AppHost", "AppHost.csproj");
const sqlSecretKey = "Parameters:sql-password";
const redisSecretKey = "Parameters:redis-password";

function expectedPasswordForRepeatedByte(byte: number): string {
  return `Aa1!${Buffer.alloc(24, byte).toString("base64url")}`;
}

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

/** A {@link DotnetFacts} patch that may explicitly clear an optional field to `undefined`. */
type DotnetFactsPatch = Partial<Omit<DotnetFacts, "selectedVersion" | "host">> & {
  selectedVersion?: string | undefined;
  host?: DotnetFacts["host"] | undefined;
};

/** Builds one complete, compatible-by-default {@link DotnetFacts} value for tests to patch. */
function dotnetFacts(patch: DotnetFactsPatch = {}): DotnetFacts {
  const {selectedVersion, host, ...rest} = patch;
  // `"key" in patch` distinguishes an absent field (use the default) from an explicit `undefined`
  // (clear the optional field), which a destructuring default alone cannot tell apart.
  const includeSelectedVersion = !("selectedVersion" in patch) || selectedVersion !== undefined;
  const includeHost = !("host" in patch) || host !== undefined;
  return {
    executable: {available: true, resolvedPaths: ["C:\\Program Files\\dotnet\\dotnet.exe"]},
    sdks: ["10.0.100"],
    workloads: [],
    nugetCachePath: "C:\\fixture\\nuget\\packages",
    solutionIssues: [],
    solutionRestoreIssues: [],
    localTools: [{name: "defaultdocumentation.console", version: "1.2.4"}],
    certificate: {exists: true, trusted: true},
    appHost: {
      projectExists: true,
      missingParameterKeys: [],
      userSecretKeys: [sqlSecretKey, redisSecretKey],
    },
    ...rest,
    ...(includeSelectedVersion ? {selectedVersion: selectedVersion ?? "10.0.100"} : {}),
    ...(includeHost ? {host: host ?? {version: "10.0.0", architecture: "x64", rid: "win-x64"}} : {}),
  };
}

function availableOutcome(patch: DotnetFactsPatch = {}): InspectionOutcome<DotnetFacts> {
  return {kind: "available", value: dotnetFacts(patch), durationMs: 1};
}

function unavailableOutcome(reason = "The dotnet executable is unavailable."): InspectionOutcome<DotnetFacts> {
  return {kind: "unavailable", reason, durationMs: 1};
}

function invalidOutcome(issues: readonly string[] = ["dotnet --version returned malformed output."]): InspectionOutcome<DotnetFacts> {
  return {kind: "invalid", issues, durationMs: 1};
}

/**
 * Builds a `dotnet` inspection outcome sequence for tests. Every executed mutation invalidates and
 * re-inspects `dotnet` immediately, and the three restore actions execute by default, so `initial`
 * is repeated for the initial fetch plus those three restore refreshes before any further supplied
 * outcomes model the mutation actually under test (a secret write or certificate operation).
 */
function dotnetOutcomeSequence(
  initial: InspectionOutcome<DotnetFacts>,
  ...after: readonly InspectionOutcome<DotnetFacts>[]
): readonly InspectionOutcome<DotnetFacts>[] {
  return [initial, initial, initial, initial, ...after];
}

/** A controllable fake {@link RepositoryInspectionSession} that only ever resolves the `"dotnet"` key. */
function createDotnetInspectionHarness(outcomes: readonly InspectionOutcome<DotnetFacts>[] = [availableOutcome()]): Readonly<{
  session: RepositoryInspectionSession;
  inspect: ReturnType<typeof vi.fn>;
  invalidate: ReturnType<typeof vi.fn>;
}> {
  let callIndex = 0;
  const inspect = vi.fn(async (key: "dotnet") => {
    if (key !== "dotnet") {
      return {kind: "unavailable" as const, reason: "Not exercised by this test.", durationMs: 0};
    }
    const outcome = outcomes[Math.min(callIndex, outcomes.length - 1)]!;
    callIndex += 1;
    return outcome;
  });
  const invalidate = vi.fn();
  return {session: {inspect, invalidate} as unknown as RepositoryInspectionSession, inspect, invalidate};
}

function defaultResponse(): CommandResult {
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
      return configured[offset] ?? configured.at(-1) ?? defaultResponse();
    }
    return configured ?? defaultResponse();
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
    randomBytes?: (size: number) => Uint8Array;
    dotnetOutcomes?: readonly InspectionOutcome<DotnetFacts>[];
  }> = {},
): Readonly<{
  phase: ReturnType<typeof createDotnetSetupPhase>;
  context: SetupContext;
  run: ReturnType<typeof vi.fn<CommandRunner["run"]>>;
  actionIds: string[];
  actionRecords: SetupAction[];
  sink: InMemoryLoggerSink;
  redactions: string[];
  inspect: ReturnType<typeof vi.fn>;
  invalidate: ReturnType<typeof vi.fn>;
}> {
  const {runner, run} = createRunner(input.responses);
  const {actions, actionIds, actionRecords} = createActions(input.dispositions);
  const {session, inspect, invalidate} = createDotnetInspectionHarness(input.dotnetOutcomes);
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
    inspection: session,
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
  const phase = createDotnetSetupPhase({
    platform: input.platform ?? "win32",
    randomBytes: input.randomBytes ?? ((size) => new Uint8Array(size).fill(7)),
  });
  return {phase, context, run, actionIds, actionRecords, sink, redactions, inspect, invalidate};
}

describe("dotnet setup public contract", () => {
  it("publishes an independent required phase", () => {
    expect(dotnetSetupPhase).toMatchObject({
      id: "dotnet",
      required: true,
      dependsOn: [],
    });
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
    const bytes = Uint8Array.from({length: 24}, (_, index) => index + 240);
    const source = vi.fn<(size: number) => Uint8Array>().mockReturnValue(bytes);

    const password = generateLocalDevelopmentPassword(source);

    expect(source).toHaveBeenCalledExactlyOnceWith(24);
    expect(password).toBe(`Aa1!${Buffer.from(bytes).toString("base64url")}`);
    expect(password).toMatch(/^Aa1![A-Za-z0-9_-]{32}$/);
    expect(password).not.toMatch(/[+/=]/);
  });

  it("rejects a random source that returns the wrong byte count", () => {
    expect(() => generateLocalDevelopmentPassword(() => new Uint8Array(23))).toThrow(/exactly 24/i);
  });
});

describe("dotnet fact readiness", () => {
  it("accepts compatible facts without an SDK inspection round trip beyond the initial fetch", async () => {
    const harness = createHarness();

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds).not.toContain("dotnet.install-sdk");
    expect(harness.inspect).toHaveBeenCalledWith("dotnet");
  });

  it("fails explicitly with bounded evidence when dotnet is unavailable and unrecoverable", async () => {
    const wingetKey = commandKey({command: "winget", args: ["--version"]});
    const harness = createHarness({
      dotnetOutcomes: [unavailableOutcome("The dotnet executable is unavailable.")],
      responses: {[wingetKey]: commandResult({code: 1, stderr: "winget missing"})},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("The dotnet executable is unavailable.");
    expect(result.evidence.join("\n")).not.toContain("winget missing");
    expect(result.nextActions.join("\n")).toContain("https://dotnet.microsoft.com/download");
    expect(harness.actionIds).toEqual([]);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("fails explicitly with bounded evidence when the initial dotnet fact is invalid", async () => {
    const harness = createHarness({dotnetOutcomes: [invalidOutcome(["dotnet --version returned malformed output."])]});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("dotnet --version returned malformed output.");
    expect(harness.run).not.toHaveBeenCalled();
  });

  it.each([
    ["only older installed and selected SDKs", {sdks: ["9.0.400"], selectedVersion: "9.0.400"}],
    ["no selected SDK", {selectedVersion: undefined}],
    ["a selected-SDK mismatch", {sdks: ["10.0.100"], selectedVersion: "9.0.400"}],
  ])("requires installation for %s", async (_name, patch) => {
    const wingetKey = commandKey({command: "winget", args: ["--version"]});
    const harness = createHarness({
      dotnetOutcomes: [availableOutcome(patch)],
      responses: {[wingetKey]: commandResult({stdout: "v1.11.0\n"})},
      dispositions: {"dotnet.install-sdk": "declined"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("dotnet.install-sdk");
  });

  it("fails with official guidance when no supported installer is discoverable, without probing anything", async () => {
    const harness = createHarness({
      platform: "freebsd",
      dotnetOutcomes: [availableOutcome({sdks: [], selectedVersion: undefined})],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.nextActions.join("\n")).toContain("https://dotnet.microsoft.com/download");
    expect(harness.run).not.toHaveBeenCalled();
  });

  it("does not treat a successful install command as proof of readiness when refreshed facts remain incompatible", async () => {
    const wingetKey = commandKey({command: "winget", args: ["--version"]});
    const installKey = commandKey(
      selectDotnetInstallationProposal({platform: "win32", availablePackageManagers: new Set(["winget"]), required: requiredDotnet})!
        .command,
    );
    const harness = createHarness({
      dotnetOutcomes: [availableOutcome({sdks: [], selectedVersion: undefined}), availableOutcome({sdks: [], selectedVersion: undefined})],
      responses: {
        [wingetKey]: commandResult({stdout: "v1.11.0\n"}),
        [installKey]: commandResult(),
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.summary).toMatch(/remains incompatible/i);
    expect(harness.actionIds).toEqual(["dotnet.install-sdk"]);
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("dotnet");
    expect(harness.inspect).toHaveBeenCalledTimes(2);
  });

  it("installs, invalidates exactly dotnet, and verifies compatibility from refreshed facts", async () => {
    const wingetKey = commandKey({command: "winget", args: ["--version"]});
    const installKey = commandKey(
      selectDotnetInstallationProposal({platform: "win32", availablePackageManagers: new Set(["winget"]), required: requiredDotnet})!
        .command,
    );
    const harness = createHarness({
      dotnetOutcomes: [availableOutcome({sdks: [], selectedVersion: undefined}), availableOutcome()],
      responses: {
        [wingetKey]: commandResult({stdout: "v1.11.0\n"}),
        [installKey]: commandResult(),
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds[0]).toBe("dotnet.install-sdk");
    expect(harness.invalidate).toHaveBeenCalledWith("dotnet");
    expect(result.evidence.join("\n")).toContain("Executed and verified action: dotnet.install-sdk");
  });

  it("discovers an apt candidate and prefers the exact apt installation over dnf", async () => {
    const aptVersionKey = commandKey({command: "apt-get", args: ["--version"]});
    const dnfVersionKey = commandKey({command: "dnf", args: ["--version"]});
    const aptPolicyKey = commandKey({command: "apt-cache", args: ["policy", "dotnet-sdk-10.0"]});
    const aptInstallKey = commandKey({command: "sudo", args: ["apt-get", "install", "-y", "dotnet-sdk-10.0"]});
    const dnfInstallKey = commandKey({command: "sudo", args: ["dnf", "install", "-y", "dotnet-sdk-10.0"]});
    const harness = createHarness({
      platform: "linux",
      dotnetOutcomes: [availableOutcome({sdks: [], selectedVersion: undefined}), availableOutcome()],
      responses: {
        [aptVersionKey]: commandResult({stdout: "apt 2.9.0\n"}),
        [dnfVersionKey]: commandResult({stdout: "4.21.1\n"}),
        [aptPolicyKey]: commandResult({
          stdout: "dotnet-sdk-10.0:\n  Installed: (none)\n  Candidate: 10.0.100-1\n  Version table:\n",
        }),
        [aptInstallKey]: commandResult(),
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionRecords.find(({id}) => id === "dotnet.install-sdk")?.scope).toBe("system");
    expect(harness.run.mock.calls.find(([command]) => commandKey(command) === aptInstallKey)?.[1]).toMatchObject({
      cwd: paths.root,
      output: "inherit",
    });
    expect(harness.run.mock.calls.some(([command]) => commandKey(command) === dnfInstallKey)).toBe(false);
  });

  it("falls back to the exact dnf installation when apt reports no candidate", async () => {
    const aptVersionKey = commandKey({command: "apt-get", args: ["--version"]});
    const dnfVersionKey = commandKey({command: "dnf", args: ["--version"]});
    const aptPolicyKey = commandKey({command: "apt-cache", args: ["policy", "dotnet-sdk-10.0"]});
    const aptInstallKey = commandKey({command: "sudo", args: ["apt-get", "install", "-y", "dotnet-sdk-10.0"]});
    const dnfInstallKey = commandKey({command: "sudo", args: ["dnf", "install", "-y", "dotnet-sdk-10.0"]});
    const harness = createHarness({
      platform: "linux",
      dotnetOutcomes: [availableOutcome({sdks: [], selectedVersion: undefined}), availableOutcome()],
      responses: {
        [aptVersionKey]: commandResult({stdout: "apt 2.9.0\n"}),
        [dnfVersionKey]: commandResult({stdout: "4.21.1\n"}),
        [aptPolicyKey]: commandResult({
          stdout: "dotnet-sdk-10.0:\n  Installed: (none)\n  Candidate: (none)\n  Version table:\n",
        }),
        [dnfInstallKey]: commandResult(),
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.run.mock.calls.some(([command]) => commandKey(command) === aptInstallKey)).toBe(false);
    expect(harness.run.mock.calls.find(([command]) => commandKey(command) === dnfInstallKey)?.[1]).toMatchObject({
      cwd: paths.root,
      output: "inherit",
    });
  });

  it("discovers Homebrew and executes the exact macOS installation proposal", async () => {
    const brewVersionKey = commandKey({command: "brew", args: ["--version"]});
    const brewInstallKey = commandKey({command: "brew", args: ["install", "--cask", "dotnet-sdk"]});
    const harness = createHarness({
      platform: "darwin",
      dotnetOutcomes: [availableOutcome({sdks: [], selectedVersion: undefined}), availableOutcome()],
      responses: {
        [brewVersionKey]: commandResult({stdout: "Homebrew 4.6.0\n"}),
        [brewInstallKey]: commandResult(),
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.run.mock.calls.find(([command]) => commandKey(command) === brewInstallKey)?.[1]).toMatchObject({
      cwd: paths.root,
      output: "inherit",
    });
  });
});

describe("repository solution integrity", () => {
  it("fails immediately on non-empty solution issues without attempting any mutation", async () => {
    const harness = createHarness({
      dotnetOutcomes: [availableOutcome({solutionIssues: ["Missing solution project: src/Broken.csproj"]})],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("Missing solution project: src/Broken.csproj");
    expect(harness.run).not.toHaveBeenCalled();
    expect(harness.invalidate).not.toHaveBeenCalled();
  });
});

describe("restore ordering and failures", () => {
  it("runs the exact restore commands in order, invalidating and verifying after each one", async () => {
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
    expect(harness.invalidate).toHaveBeenCalledTimes(3);
    expect(harness.inspect).toHaveBeenCalledTimes(4);
  });

  it.each([
    ["nonzero", commandResult({code: 7, stdout: "restore output", stderr: "restore error"})],
    ["timeout", commandResult({code: 1, timedOut: true})],
    ["signal", commandResult({code: 1, signal: "SIGTERM"})],
    ["spawn error", commandResult({code: 1, spawnError: "EACCES"})],
  ])("retains explicit safe restore evidence for %s and invalidates the attempted mutation", async (_name, failure) => {
    const workloadKey = commandKey({command: "dotnet", args: ["workload", "restore", paths.solution]});
    const harness = createHarness({responses: {[workloadKey]: failure}});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/restore|timed out|SIGTERM|EACCES/i);
    if (failure.stderr !== "") {
      expect(result.evidence.join("\n")).toContain(failure.stderr);
    }
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("dotnet");
  });

  it("fails when the refreshed solution issues are non-empty after an otherwise successful restore", async () => {
    const harness = createHarness({
      dotnetOutcomes: [availableOutcome(), availableOutcome({solutionIssues: ["Missing solution project: X"]})],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("Missing solution project: X");
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("dotnet");
  });

  it("fails when refreshed facts are unavailable after an otherwise successful restore", async () => {
    const harness = createHarness({
      dotnetOutcomes: [availableOutcome(), unavailableOutcome("The dotnet executable is unavailable.")],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("The dotnet executable is unavailable.");
  });
});

describe("AppHost project and user secrets", () => {
  it("fails when the AppHost project does not exist, without attempting user-secret commands", async () => {
    const harness = createHarness({
      dotnetOutcomes: [availableOutcome({appHost: {projectExists: false, missingParameterKeys: [], userSecretKeys: []}})],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(harness.run.mock.calls.some(([command]) => command.args[0] === "user-secrets")).toBe(false);
  });

  it("succeeds without a user-secrets action when no required key is missing", async () => {
    const harness = createHarness();

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds).not.toContain("dotnet.user-secrets.set");
    expect(harness.run.mock.calls.some(([command]) => command.args[0] === "user-secrets")).toBe(false);
  });

  it("generates each missing key independently inside one action and sends values only through stdin", async () => {
    const random = vi
      .fn<(size: number) => Uint8Array>()
      .mockReturnValueOnce(new Uint8Array(24).fill(1))
      .mockReturnValueOnce(new Uint8Array(24).fill(2));
    const sqlPassword = expectedPasswordForRepeatedByte(1);
    const redisPassword = expectedPasswordForRepeatedByte(2);
    const setKey = commandKey({command: "dotnet", args: ["user-secrets", "set", "--project", appHostProject]});
    const missing = availableOutcome({
      appHost: {projectExists: true, missingParameterKeys: [sqlSecretKey, redisSecretKey], userSecretKeys: []},
    });
    const resolved = availableOutcome({
      appHost: {projectExists: true, missingParameterKeys: [], userSecretKeys: [sqlSecretKey, redisSecretKey]},
    });
    const harness = createHarness({
      randomBytes: random,
      dotnetOutcomes: dotnetOutcomeSequence(missing, resolved),
      responses: {[setKey]: commandResult()},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(random).toHaveBeenNthCalledWith(1, 24);
    expect(random).toHaveBeenNthCalledWith(2, 24);
    expect(harness.actionRecords.find(({id}) => id === "dotnet.user-secrets.set")?.scope).toBe("user");
    const setCall = harness.run.mock.calls.find(([command]) => commandKey(command) === setKey);
    expect(setCall?.[0].args).toEqual(["user-secrets", "set", "--project", appHostProject]);
    expect(sqlPassword).not.toBe(redisPassword);
    expect(JSON.parse(String(setCall?.[1]?.input))).toEqual({
      [sqlSecretKey]: sqlPassword,
      [redisSecretKey]: redisPassword,
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

  it("sets only the independently missing secret key named by facts", async () => {
    const random = vi.fn<(size: number) => Uint8Array>().mockReturnValue(new Uint8Array(24).fill(3));
    const missing = availableOutcome({
      appHost: {projectExists: true, missingParameterKeys: [redisSecretKey], userSecretKeys: [sqlSecretKey]},
    });
    const resolved = availableOutcome({
      appHost: {projectExists: true, missingParameterKeys: [], userSecretKeys: [sqlSecretKey, redisSecretKey]},
    });
    const harness = createHarness({randomBytes: random, dotnetOutcomes: dotnetOutcomeSequence(missing, resolved)});

    await expect(harness.phase.run(harness.context)).resolves.toMatchObject({status: "succeeded"});
    expect(random).toHaveBeenCalledOnce();
    const setCall = harness.run.mock.calls.find(([command]) => command.args[0] === "user-secrets" && command.args[1] === "set");
    expect(Object.keys(JSON.parse(String(setCall?.[1]?.input)) as object)).toEqual([redisSecretKey]);
  });

  it("fails post-set verification when refreshed facts still report a missing key, without leaking the generated value", async () => {
    const generated = expectedPasswordForRepeatedByte(4);
    const missing = availableOutcome({appHost: {projectExists: true, missingParameterKeys: [sqlSecretKey], userSecretKeys: []}});
    const harness = createHarness({
      randomBytes: () => new Uint8Array(24).fill(4),
      dotnetOutcomes: dotnetOutcomeSequence(missing, missing),
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).not.toContain(generated);
    expect(result.evidence.join("\n")).toMatch(/postcondition/i);
  });

  it("fails when the set command itself fails, sanitizing known generated values from child errors", async () => {
    const generated = expectedPasswordForRepeatedByte(4);
    const missing = availableOutcome({appHost: {projectExists: true, missingParameterKeys: [sqlSecretKey], userSecretKeys: []}});
    const harness = createHarness({
      randomBytes: () => new Uint8Array(24).fill(4),
      dotnetOutcomes: [missing, missing],
      responses: {
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
    const missing = availableOutcome({
      appHost: {projectExists: true, missingParameterKeys: [sqlSecretKey, redisSecretKey], userSecretKeys: []},
    });
    const harness = createHarness({
      options: setupOptions({dryRun: true}),
      randomBytes: random,
      dotnetOutcomes: [missing],
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
    expect(harness.invalidate).not.toHaveBeenCalled();
  });
});

describe("HTTPS development certificate", () => {
  it("accepts an already-trusted certificate without any mutation", async () => {
    const harness = createHarness();

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(result.evidence.join("\n")).toMatch(/certificate is trusted/i);
    expect(harness.actionIds).not.toContain("dotnet.certificate.trust");
    expect(harness.actionIds).not.toContain("dotnet.certificate.create");
  });

  it("creates an absent certificate and verifies existence from refreshed facts before checking trust", async () => {
    const createKey = commandKey({command: "dotnet", args: ["dev-certs", "https"]});
    const harness = createHarness({
      dotnetOutcomes: dotnetOutcomeSequence(availableOutcome({certificate: {exists: false, trusted: false}}), availableOutcome()),
      responses: {[createKey]: commandResult()},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionRecords.find(({id}) => id === "dotnet.certificate.create")?.scope).toBe("user");
    expect(harness.run.mock.calls.some(([command]) => commandKey(command) === createKey)).toBe(true);
  });

  it("fails when certificate creation cannot establish the required existence postcondition", async () => {
    const before = availableOutcome({certificate: {exists: false, trusted: false}});
    const harness = createHarness({dotnetOutcomes: dotnetOutcomeSequence(before, before)});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.nextActions.join("\n")).toMatch(/certificate/i);
  });

  it("declines certificate creation and fails as required", async () => {
    const before = availableOutcome({certificate: {exists: false, trusted: false}});
    const harness = createHarness({
      dotnetOutcomes: [before],
      dispositions: {"dotnet.certificate.create": "declined"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("dotnet.certificate.create");
  });

  it("plans certificate creation in dry-run without running dependent trust mutations", async () => {
    const before = availableOutcome({certificate: {exists: false, trusted: false}});
    const trustMutationKey = commandKey({command: "dotnet", args: ["dev-certs", "https", "--trust"]});
    const harness = createHarness({
      options: setupOptions({dryRun: true}),
      dotnetOutcomes: [before],
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
    expect(harness.actionIds).not.toContain("dotnet.certificate.trust");
    expect(harness.run.mock.calls.some(([command]) => commandKey(command) === trustMutationKey)).toBe(false);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("trusts an untrusted certificate and requires the refreshed trust postcondition", async () => {
    const trustMutationKey = commandKey({command: "dotnet", args: ["dev-certs", "https", "--trust"]});
    const harness = createHarness({
      dotnetOutcomes: dotnetOutcomeSequence(availableOutcome({certificate: {exists: true, trusted: false}}), availableOutcome()),
      responses: {[trustMutationKey]: commandResult()},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionRecords.find(({id}) => id === "dotnet.certificate.trust")?.scope).toBe("system");
    expect(harness.run.mock.calls.some(([command]) => commandKey(command) === trustMutationKey)).toBe(true);
  });

  it.each(["declined", "planned"] as const)("reports %s trust without fabricating trusted success", async (disposition) => {
    const before = availableOutcome({certificate: {exists: true, trusted: false}});
    const harness = createHarness({
      dotnetOutcomes: [before],
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
      dotnetOutcomes: [availableOutcome({certificate: {exists: true, trusted: false}})],
      responses: {[trustMutationKey]: commandResult({code: 1, stderr: "trust denied"})},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
    expect(result.evidence.join("\n")).toContain("dotnet.certificate.trust");
    expect(result.nextActions.join("\n")).toMatch(/trust/i);
  });

  it("degrades when the refreshed trust postcondition remains false after a successful trust command", async () => {
    const before = availableOutcome({certificate: {exists: true, trusted: false}});
    const harness = createHarness({dotnetOutcomes: dotnetOutcomeSequence(before, before)});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
    expect(result.evidence.join("\n")).toContain("dotnet.certificate.trust");
  });
});

describe("dry-run and safety contracts", () => {
  it("accumulates safely knowable planned actions without running mutations or postconditions", async () => {
    const harness = createHarness({
      options: setupOptions({dryRun: true}),
      dotnetOutcomes: [availableOutcome({certificate: {exists: true, trusted: false}})],
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
    expect(harness.invalidate).not.toHaveBeenCalled();
    expect(harness.inspect).toHaveBeenCalledTimes(1);
  });

  it("plans SDK installation and all safely knowable restore actions without post-install probes", async () => {
    const wingetKey = commandKey({command: "winget", args: ["--version"]});
    const harness = createHarness({
      options: setupOptions({dryRun: true}),
      dotnetOutcomes: [availableOutcome({sdks: [], selectedVersion: undefined})],
      responses: {[wingetKey]: commandResult({stdout: "v1.11.0"})},
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
    expect(harness.run.mock.calls.some(([command]) => command.args[0] === "workload")).toBe(false);
    expect(harness.invalidate).not.toHaveBeenCalled();
    expect(harness.inspect).toHaveBeenCalledTimes(1);
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
    expect(commands.join("\n")).not.toMatch(/--list-sdks|--check-trust-machine-readable|user-secrets list/i);
  });
});

describe("initially unavailable dotnet installation", () => {
  const wingetVersionKey = commandKey({command: "winget", args: ["--version"]});
  const wingetInstallKey = commandKey(
    selectDotnetInstallationProposal({platform: "win32", availablePackageManagers: new Set(["winget"]), required: requiredDotnet})!.command,
  );

  it("discovers an installer, installs, and completes when dotnet is initially unavailable", async () => {
    const harness = createHarness({
      dotnetOutcomes: [unavailableOutcome("The dotnet executable is unavailable."), availableOutcome()],
      responses: {[wingetVersionKey]: commandResult({stdout: "v1.11.0\n"}), [wingetInstallKey]: commandResult()},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds).toEqual(["dotnet.install-sdk", "dotnet.workload-restore", "dotnet.solution-restore", "dotnet.tool-restore"]);
    expect(result.evidence).toContain("The dotnet executable is unavailable.");
    expect(result.evidence.join("\n")).toContain("Executed and verified action: dotnet.install-sdk");
  });

  it("plans installation and dependent restores in dry-run when dotnet is initially unavailable", async () => {
    const harness = createHarness({
      options: setupOptions({dryRun: true}),
      dotnetOutcomes: [unavailableOutcome()],
      responses: {[wingetVersionKey]: commandResult({stdout: "v1.11.0\n"})},
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
    expect(harness.invalidate).not.toHaveBeenCalled();
    expect(harness.inspect).toHaveBeenCalledTimes(1);
  });

  it("fails with official guidance when dotnet is unavailable and no installer is discoverable", async () => {
    const harness = createHarness({platform: "freebsd", dotnetOutcomes: [unavailableOutcome()]});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.nextActions.join("\n")).toContain("https://dotnet.microsoft.com/download");
    expect(harness.run).not.toHaveBeenCalled();
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("keeps an initially invalid dotnet fact an explicit bounded failure without probing installers", async () => {
    const harness = createHarness({dotnetOutcomes: [invalidOutcome(["dotnet --version returned malformed output."])]});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("dotnet --version returned malformed output.");
    expect(harness.run).not.toHaveBeenCalled();
    expect(harness.actionIds).toEqual([]);
  });
});

describe("dotnet cache freshness around mutations", () => {
  const workloadKey = commandKey({command: "dotnet", args: ["workload", "restore", paths.solution]});
  const plannedRestores = {
    "dotnet.workload-restore": "planned" as const,
    "dotnet.solution-restore": "planned" as const,
    "dotnet.tool-restore": "planned" as const,
  };

  it("invalidates and re-inspects dotnet after each executed restore", async () => {
    const harness = createHarness();

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.invalidate).toHaveBeenCalledTimes(3);
    expect(harness.invalidate.mock.calls).toEqual([["dotnet"], ["dotnet"], ["dotnet"]]);
    expect(harness.inspect).toHaveBeenCalledTimes(4);
  });

  it("invalidates dotnet when an attempted restore mutation fails", async () => {
    const harness = createHarness({responses: {[workloadKey]: commandResult({code: 7, stderr: "restore error"})}});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("dotnet");
    expect(harness.actionIds).toEqual(["dotnet.workload-restore"]);
  });

  it("propagates a later AbortError after an earlier mutation already executed and invalidated", async () => {
    const interruption = new DOMException("interrupted", "AbortError");
    const harness = createHarness();
    const actions: SetupActionExecutor = {
      run: async (action) => {
        if (action.id === "dotnet.tool-restore") {
          throw interruption;
        }
        return harness.context.actions.run(action);
      },
    };

    await expect(harness.phase.run({...harness.context, actions})).rejects.toBe(interruption);
    expect(harness.actionIds).toEqual(["dotnet.workload-restore", "dotnet.solution-restore"]);
    expect(harness.invalidate).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["dotnet.workload-restore", ["dotnet.workload-restore"]],
    ["dotnet.solution-restore", ["dotnet.workload-restore", "dotnet.solution-restore"]],
    ["dotnet.tool-restore", ["dotnet.workload-restore", "dotnet.solution-restore", "dotnet.tool-restore"]],
  ])("declines %s without invalidating facts or running a later action", async (declined, expectedActionIds) => {
    const harness = createHarness({
      dispositions: {...plannedRestores, [declined]: "declined"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain(`Declined action: ${declined}`);
    expect(harness.actionIds).toEqual(expectedActionIds);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("declines a restore after an earlier executed restore and invalidates exactly once", async () => {
    const harness = createHarness({dispositions: {"dotnet.solution-restore": "declined"}});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(harness.actionIds).toEqual(["dotnet.workload-restore", "dotnet.solution-restore"]);
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("dotnet");
    expect(harness.inspect).toHaveBeenCalledTimes(2);
  });

  it("declines the user-secret write without invalidating facts or reaching certificate actions", async () => {
    const missing = availableOutcome({
      appHost: {projectExists: true, missingParameterKeys: [sqlSecretKey], userSecretKeys: []},
      certificate: {exists: false, trusted: false},
    });
    const harness = createHarness({
      dotnetOutcomes: [missing],
      dispositions: {...plannedRestores, "dotnet.user-secrets.set": "declined"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(harness.actionIds).toEqual([
      "dotnet.workload-restore",
      "dotnet.solution-restore",
      "dotnet.tool-restore",
      "dotnet.user-secrets.set",
    ]);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("invalidates and re-inspects exactly once for an executed user-secret write", async () => {
    const missing = availableOutcome({appHost: {projectExists: true, missingParameterKeys: [sqlSecretKey], userSecretKeys: []}});
    const resolved = availableOutcome({
      appHost: {projectExists: true, missingParameterKeys: [], userSecretKeys: [sqlSecretKey, redisSecretKey]},
    });
    const harness = createHarness({dotnetOutcomes: [missing, resolved], dispositions: plannedRestores});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("dotnet");
    expect(harness.inspect).toHaveBeenCalledTimes(2);
  });

  it("invalidates and re-inspects exactly once per executed certificate mutation", async () => {
    const absent = availableOutcome({certificate: {exists: false, trusted: false}});
    const untrusted = availableOutcome({certificate: {exists: true, trusted: false}});
    const harness = createHarness({dotnetOutcomes: [absent, untrusted, availableOutcome()], dispositions: plannedRestores});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(harness.actionIds).toEqual([
      "dotnet.workload-restore",
      "dotnet.solution-restore",
      "dotnet.tool-restore",
      "dotnet.certificate.create",
      "dotnet.certificate.trust",
    ]);
    expect(harness.invalidate).toHaveBeenCalledTimes(2);
    expect(harness.inspect).toHaveBeenCalledTimes(3);
  });

  it("reports bounded refresh evidence when the trust postcondition cannot be verified", async () => {
    const untrusted = availableOutcome({certificate: {exists: true, trusted: false}});
    const harness = createHarness({
      dotnetOutcomes: [untrusted, untrusted, untrusted, untrusted, unavailableOutcome("The dotnet executable is unavailable.")],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
    expect(result.evidence.join("\n")).toContain("dotnet.certificate.trust");
    expect(result.evidence).toContain("The dotnet executable is unavailable.");
  });
});

describe("restore postconditions", () => {
  it("fails when the workload restore drops a previously observed workload", async () => {
    const harness = createHarness({
      dotnetOutcomes: [availableOutcome({workloads: ["aspire", "wasm-tools"]}), availableOutcome({workloads: ["aspire"]})],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("wasm-tools");
    expect(harness.actionIds).toEqual(["dotnet.workload-restore"]);
  });

  it("fails when the solution restore leaves generated NuGet restore issues", async () => {
    const restoreIssue = "Missing NuGet restore assets: tooling/AppHost/AppHost.csproj";
    const harness = createHarness({
      dotnetOutcomes: [availableOutcome(), availableOutcome(), availableOutcome({solutionRestoreIssues: [restoreIssue]})],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain(restoreIssue);
    expect(harness.actionIds).toEqual(["dotnet.workload-restore", "dotnet.solution-restore"]);
  });

  it("fails when the tool restore does not install the manifest-pinned repository tool", async () => {
    const harness = createHarness({
      dotnetOutcomes: [availableOutcome(), availableOutcome(), availableOutcome(), availableOutcome({localTools: []})],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("defaultdocumentation.console");
    expect(result.evidence.join("\n")).not.toContain("1.2.4");
    expect(harness.actionIds).toEqual(["dotnet.workload-restore", "dotnet.solution-restore", "dotnet.tool-restore"]);
  });

  it("does not claim static solution structure proves every restore", async () => {
    const harness = createHarness();

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(result.evidence.join("\n")).not.toMatch(/remains structurally valid after restore/i);
    expect(result.evidence.join("\n")).toContain("Executed and verified action: dotnet.workload-restore");
    expect(result.evidence.join("\n")).toContain("Executed and verified action: dotnet.solution-restore");
    expect(result.evidence.join("\n")).toContain("Executed and verified action: dotnet.tool-restore");
  });
});

describe("user-secret provisioning policy", () => {
  const setKey = commandKey({command: "dotnet", args: ["user-secrets", "set", "--project", appHostProject]});
  const plannedRestores = {
    "dotnet.workload-restore": "planned" as const,
    "dotnet.solution-restore": "planned" as const,
    "dotnet.tool-restore": "planned" as const,
  };

  it("provisions per-machine user secrets when tracked configuration alone satisfies precedence", async () => {
    const trackedOnly = availableOutcome({appHost: {projectExists: true, missingParameterKeys: [], userSecretKeys: []}});
    const provisioned = availableOutcome({
      appHost: {projectExists: true, missingParameterKeys: [], userSecretKeys: [sqlSecretKey, redisSecretKey]},
    });
    const harness = createHarness({dotnetOutcomes: [trackedOnly, provisioned], dispositions: plannedRestores});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(harness.actionIds).toContain("dotnet.user-secrets.set");
    const setCall = harness.run.mock.calls.find(([command]) => commandKey(command) === setKey);
    expect(Object.keys(JSON.parse(String(setCall?.[1]?.input)) as object)).toEqual([sqlSecretKey, redisSecretKey]);
    expect(setCall?.[1]?.output).toBeUndefined();
  });

  it("provisions a required key whose user secret exists but remains blank", async () => {
    const blankRedis = availableOutcome({
      appHost: {projectExists: true, missingParameterKeys: [redisSecretKey], userSecretKeys: [sqlSecretKey, redisSecretKey]},
    });
    const provisioned = availableOutcome({
      appHost: {projectExists: true, missingParameterKeys: [], userSecretKeys: [sqlSecretKey, redisSecretKey]},
    });
    const harness = createHarness({dotnetOutcomes: [blankRedis, provisioned], dispositions: plannedRestores});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    const setCall = harness.run.mock.calls.find(([command]) => commandKey(command) === setKey);
    expect(Object.keys(JSON.parse(String(setCall?.[1]?.input)) as object)).toEqual([redisSecretKey]);
  });

  it("fails the user-secret postcondition when refreshed precedence succeeds without the written key", async () => {
    const generated = expectedPasswordForRepeatedByte(9);
    const trackedOnly = availableOutcome({appHost: {projectExists: true, missingParameterKeys: [], userSecretKeys: []}});
    const partial = availableOutcome({appHost: {projectExists: true, missingParameterKeys: [], userSecretKeys: [sqlSecretKey]}});
    const harness = createHarness({
      randomBytes: () => new Uint8Array(24).fill(9),
      dotnetOutcomes: [trackedOnly, partial],
      dispositions: plannedRestores,
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/postcondition/i);
    expect(result.evidence.join("\n")).toContain(redisSecretKey);
    expect(result.evidence.join("\n")).not.toContain(generated);
  });
});
