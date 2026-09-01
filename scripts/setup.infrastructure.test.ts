// @vitest-environment node
/**
 * @fileoverview Contract tests for local infrastructure preparation.
 * @module scripts.setup.infrastructure.test
 *
 * @remarks
 * All readiness observations are consumed from shared {@link InfrastructureFacts} via
 * `context.inspection.inspect("infrastructure")`. Tests inject a controllable fake
 * {@link RepositoryInspectionSession} that resolves the `"infrastructure"` key through
 * a call-ordered sequence, tracks invalidation events, and records
 * `updateInfrastructureEngine` calls.
 */

import {dirname, resolve} from "node:path";
import {describe, expect, it, vi} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import type {CommandResult, CommandRunner, CommandSpec} from "./common/process.ts";
import {createRepositoryPaths} from "./common/repository-paths.ts";
import type {RepositoryRequirements} from "./common/requirements.ts";
import type {ToolingConfigReadResult, ToolingConfigV1} from "./common/tooling-config.ts";
import {requiredLocalPorts} from "./container-runtime/preflight.ts";
import type {ContainerEngine} from "./container-runtime/types.ts";
import type {InfrastructureFacts, PortFact} from "./inspection/infrastructure.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";
import type {InspectionOutcome} from "./inspection/types.ts";
import {createInfrastructureSetupPhase, infrastructureSetupPhase, selectContainerInstallationProposal} from "./setup.infrastructure.ts";
import type {SetupAction, SetupActionDisposition, SetupActionExecutor, SetupContext, SetupOptions} from "./setup.types.ts";

// ---------------------------------------------------------------------------
// Fact fixtures
// ---------------------------------------------------------------------------

const ROOT = resolve(process.cwd(), ".synthetic", "setup-infrastructure-root");
const paths = createRepositoryPaths(ROOT);
const certificatePath = resolve(ROOT, "infra", "Local", "Management", "certs", "local-cert.pem");
const certificateKeyPath = resolve(ROOT, "infra", "Local", "Management", "certs", "local-key.pem");

function allPortsAvailable(): readonly PortFact[] {
  return requiredLocalPorts.map((port) => ({port, available: true}));
}

function infrastructureAvailable(patch: Partial<InfrastructureFacts> = {}): InspectionOutcome<InfrastructureFacts> {
  return {
    kind: "available",
    value: {
      selectedEngine: "rancher",
      cliAvailable: true,
      backendAvailable: true,
      composeAvailable: true,
      dockerConflict: false,
      socketContextIssues: [],
      ports: allPortsAvailable(),
      certificateIssues: [],
      manifestIssues: [],
      containers: [],
      ...patch,
    },
    durationMs: 1,
  };
}

function unavailableInfra(reason = "Test unavailable."): InspectionOutcome<InfrastructureFacts> {
  return {kind: "unavailable", reason, durationMs: 1};
}

// ---------------------------------------------------------------------------
// Inspection harness
// ---------------------------------------------------------------------------

interface InspectionHarness {
  readonly session: RepositoryInspectionSession;
  readonly inspect: ReturnType<typeof vi.fn>;
  readonly invalidate: ReturnType<typeof vi.fn>;
  readonly updateInfrastructureEngine: ReturnType<typeof vi.fn>;
  readonly events: string[];
}

function createInspectionHarness(
  input: Readonly<{
    infrastructure?: readonly InspectionOutcome<InfrastructureFacts>[];
  }> = {},
): InspectionHarness {
  const sequences: Readonly<Record<string, readonly InspectionOutcome<unknown>[]>> = {
    infrastructure: input.infrastructure ?? [infrastructureAvailable()],
  };
  const offsets = new Map<string, number>();
  const events: string[] = [];
  const inspect = vi.fn(async (key: string) => {
    events.push(`inspect:${key}`);
    const sequence = sequences[key];
    if (sequence === undefined || sequence.length === 0) {
      return {kind: "unavailable" as const, reason: "Not exercised by this test.", durationMs: 0};
    }
    const offset = offsets.get(key) ?? 0;
    offsets.set(key, offset + 1);
    return sequence[Math.min(offset, sequence.length - 1)]!;
  });
  const invalidate = vi.fn((...keys: readonly string[]) => {
    events.push(`invalidate:${keys.join("+")}`);
  });
  const updateInfrastructureEngine = vi.fn((_engine: ContainerEngine) => {
    events.push("updateInfrastructureEngine");
  });
  return {
    session: {inspect, invalidate, updateInfrastructureEngine} as unknown as RepositoryInspectionSession,
    inspect,
    invalidate,
    updateInfrastructureEngine,
    events,
  };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function commandResult(patch: Partial<CommandResult> = {}): CommandResult {
  return {code: 0, stdout: "", stderr: "", durationMs: 1, timedOut: false, ...patch};
}

function commandKey(command: Readonly<CommandSpec>): string {
  return [command.command, ...command.args].join(" ");
}

function requirements(): RepositoryRequirements {
  return {
    node: {major: 24, minor: 0, patch: 0},
    npm: {major: 11, minor: 0, patch: 0},
    dotnet: {major: 10, minor: 0, patch: 0},
    python: {major: 3, minor: 12, patch: 0},
    packages: new Map(),
  };
}

type SetupOptionsPatch = Partial<Omit<SetupOptions, "engine">> & {
  readonly engine?: SetupOptions["engine"] | undefined;
};

function setupOptions(patch: SetupOptionsPatch = {}): SetupOptions {
  const engine = Object.hasOwn(patch, "engine") ? patch.engine : "rancher";
  return {
    verbose: patch.verbose ?? false,
    dryRun: patch.dryRun ?? false,
    yes: patch.yes ?? false,
    ...(engine === undefined ? {} : {engine}),
  };
}

function createActions(dispositions: Readonly<Record<string, SetupActionDisposition>> = {}): Readonly<{
  actions: SetupActionExecutor;
  records: SetupAction[];
}> {
  const records: SetupAction[] = [];
  return {
    records,
    actions: {
      run: async (action) => {
        records.push(action);
        const disposition = dispositions[action.id] ?? "executed";
        if (disposition === "executed") {
          await action.execute();
        }
        return disposition;
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

interface HarnessInput {
  readonly options?: SetupOptions;
  readonly environment?: Readonly<NodeJS.ProcessEnv>;
  readonly interactive?: boolean;
  readonly platform?: NodeJS.Platform;
  readonly config?: ToolingConfigReadResult;
  readonly readConfig?: (path: string) => Promise<ToolingConfigReadResult>;
  readonly writeConfig?: (path: string, config: Readonly<ToolingConfigV1>) => Promise<void>;
  readonly runner?: CommandRunner;
  readonly createDirectory?: (path: string) => Promise<void>;
  readonly dispositions?: Readonly<Record<string, SetupActionDisposition>>;
  readonly actions?: SetupActionExecutor;
  readonly select?: SetupContext["prompts"]["select"];
  readonly infrastructure?: readonly InspectionOutcome<InfrastructureFacts>[];
}

function createHarness(input: HarnessInput = {}) {
  const run = vi.fn<CommandRunner["run"]>(async (command, options) =>
    input.runner === undefined ? commandResult() : input.runner.run(command, options),
  );
  const selected =
    input.select
    ?? (async <TValue extends string>(_message: string, choices: readonly Readonly<{value: TValue; label: string}>[]): Promise<TValue> => {
      const choice = choices[0]?.value;
      if (choice === undefined) {
        throw new Error("Expected an interactive choice.");
      }
      return choice;
    });
  const select = vi.fn<SetupContext["prompts"]["select"]>(selected);
  const {actions: builtActions, records: actionRecords} = createActions(input.dispositions);
  const writeConfig = vi.fn(input.writeConfig ?? (async () => undefined));
  const inspection = createInspectionHarness({
    ...(input.infrastructure === undefined ? {} : {infrastructure: input.infrastructure}),
  });
  let now = 10;
  const context: SetupContext = {
    options: input.options ?? setupOptions(),
    paths,
    requirements: requirements(),
    inspection: inspection.session,
    runner: {run},
    prompts: {
      confirm: async () => true,
      select: select as SetupContext["prompts"]["select"],
      text: async () => "",
      secret: async () => "",
    },
    actions: input.actions ?? builtActions,
    logger: new MonorepositoryConsoleLogger("setup::infrastructure", {
      color: false,
      sink: new InMemoryLoggerSink(),
    }),
    now: () => now++,
  };
  const phase = createInfrastructureSetupPhase({
    platform: input.platform ?? "win32",
    environment: input.environment ?? {},
    interactive: input.interactive ?? true,
    readConfig: input.readConfig ?? (async () => input.config ?? {status: "missing"}),
    writeConfig,
    createDirectory: input.createDirectory ?? (async () => undefined),
  });

  return {phase, context, run, select, actionRecords, writeConfig, inspection};
}

// ============================================================================
// Tests
// ============================================================================

describe("infrastructure setup public contract", () => {
  it("publishes an independent required phase", () => {
    expect(infrastructureSetupPhase).toMatchObject({
      id: "infrastructure",
      title: "Local infrastructure",
      required: true,
      dependsOn: [],
      run: expect.any(Function),
    });
    expect(createInfrastructureSetupPhase).toEqual(expect.any(Function));
    expect(selectContainerInstallationProposal).toEqual(expect.any(Function));
  });
});

describe("selectContainerInstallationProposal", () => {
  it.each([
    ["win32", "rancher", ["winget"], {command: {command: "winget", args: expect.arrayContaining(["SUSE.RancherDesktop"])}}],
    ["win32", "podman", ["winget"], {command: {command: "winget", args: expect.arrayContaining(["RedHat.Podman-Desktop"])}}],
    ["darwin", "rancher", ["brew"], {command: {command: "brew", args: ["install", "--cask", "rancher"]}}],
    ["darwin", "podman", ["brew"], {command: {command: "brew", args: ["install", "--cask", "podman-desktop"]}}],
    ["linux", "podman", ["apt-get"], {command: {command: "sudo", args: expect.arrayContaining(["podman"])}}],
    ["linux", "podman", ["dnf"], {command: {command: "sudo", args: expect.arrayContaining(["podman"])}}],
  ] as const)("returns the reviewed %s/%s proposal", (platform, engine, managers, expected) => {
    expect(selectContainerInstallationProposal({engine, platform, availablePackageManagers: new Set(managers)})).toMatchObject(expected);
  });

  it.each([
    ["linux", "rancher", ["apt-get"]],
    ["win32", "rancher", []],
    ["darwin", "podman", []],
    ["freebsd", "podman", ["pkg"]],
  ] as const)("returns null for unsupported %s/%s automation", (platform, engine, managers) => {
    expect(selectContainerInstallationProposal({engine, platform, availablePackageManagers: new Set(managers)})).toBeNull();
  });
});

describe("engine selection and persistence", () => {
  it("prefers the CLI option and persists only the schema and container engine", async () => {
    const harness = createHarness({
      options: setupOptions({engine: "podman"}),
      environment: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(result.evidence).toContain("Selected Podman Desktop from argument.");
    expect(harness.writeConfig).toHaveBeenCalledWith(paths.toolingConfig, {schemaVersion: 1, containerEngine: "podman"});
  });

  it("prefers the environment over persisted configuration", async () => {
    const harness = createHarness({
      options: setupOptions({engine: undefined}),
      environment: {AROLARIU_CONTAINER_ENGINE: "podman"},
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.evidence).toContain("Selected Podman Desktop from environment.");
    expect(harness.writeConfig).toHaveBeenCalledWith(paths.toolingConfig, expect.objectContaining({containerEngine: "podman"}));
  });

  it("uses the persisted selection without scheduling a redundant write", async () => {
    const harness = createHarness({
      options: setupOptions({engine: undefined}),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "podman"}},
      infrastructure: [infrastructureAvailable({selectedEngine: "podman"})],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(result.evidence).toContain("Selected Podman Desktop from configuration.");
    expect(harness.actionRecords.map(({id}) => id)).not.toContain("infrastructure.engine.persist");
    expect(harness.writeConfig).not.toHaveBeenCalled();
  });

  it("calls updateInfrastructureEngine with the selected engine", async () => {
    const harness = createHarness({
      options: setupOptions({engine: "podman"}),
      infrastructure: [infrastructureAvailable({selectedEngine: "podman"})],
    });

    await harness.phase.run(harness.context);

    expect(harness.inspection.updateInfrastructureEngine).toHaveBeenCalledWith("podman");
  });

  it("prompts with explicit runtime requirements only when interactive selection is required", async () => {
    const harness = createHarness({
      options: setupOptions({engine: undefined, yes: true}),
      interactive: true,
      select: async <TValue extends string>(_message: string, choices: readonly Readonly<{value: TValue; label: string}>[]) => {
        expect(choices).toEqual([
          {value: "rancher", label: "Rancher Desktop (Moby/dockerd; Docker Desktop must be stopped)"},
          {value: "podman", label: "Podman Desktop (podman compose provider required)"},
        ]);
        const podman = choices.find(({value}) => value === "podman");
        if (podman === undefined) {
          throw new Error("Expected the Podman choice.");
        }
        return podman.value;
      },
      infrastructure: [infrastructureAvailable({selectedEngine: "podman"})],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.evidence).toContain("Selected Podman Desktop interactively.");
    expect(harness.select).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])("does not invent a noninteractive selection when --yes is %s", async (yes) => {
    const harness = createHarness({
      options: setupOptions({engine: undefined, yes}),
      interactive: false,
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.nextActions[0]).toBe("npm run setup -- --engine rancher|podman");
    expect(harness.select).not.toHaveBeenCalled();
  });

  it.each(["docker", "docker-desktop", "colima"])("blocks unsupported environment selection %s without prompting", async (value) => {
    const harness = createHarness({
      options: setupOptions({engine: undefined}),
      environment: {AROLARIU_CONTAINER_ENGINE: value},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(value === "colima" ? /Unsupported container engine/u : /Docker Desktop is deprecated/u);
  });

  it("blocks invalid configuration without prompting or overwriting it", async () => {
    const harness = createHarness({
      options: setupOptions({engine: undefined}),
      config: {status: "invalid", error: "Invalid local tooling configuration: secret-shaped key."},
    });

    const result = await harness.phase.run(harness.context);

    expect(result).toMatchObject({status: "failed", summary: expect.stringContaining("tooling configuration is invalid")});
    expect(harness.writeConfig).not.toHaveBeenCalled();
    expect(harness.actionRecords).toHaveLength(0);
  });

  it("plans changed selection persistence without writing during dry-run", async () => {
    const harness = createHarness({
      options: setupOptions({engine: "podman", dryRun: true}),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
      dispositions: {"infrastructure.engine.persist": "planned"},
      infrastructure: [infrastructureAvailable({selectedEngine: "podman"})],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(result.evidence).toContain("Planned action: infrastructure.engine.persist");
    expect(harness.writeConfig).not.toHaveBeenCalled();
  });

  it("invalidates infrastructure after executed engine persistence", async () => {
    const harness = createHarness({
      options: setupOptions({engine: "podman"}),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
      infrastructure: [infrastructureAvailable({selectedEngine: "podman"})],
    });

    await harness.phase.run(harness.context);

    expect(harness.inspection.events).toContain("invalidate:infrastructure");
  });

  it("does not invalidate for planned engine persistence", async () => {
    const harness = createHarness({
      options: setupOptions({engine: "podman", dryRun: true}),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
      dispositions: {"infrastructure.engine.persist": "planned"},
      infrastructure: [infrastructureAvailable({selectedEngine: "podman"})],
    });

    await harness.phase.run(harness.context);

    expect(harness.inspection.invalidate).not.toHaveBeenCalled();
  });
});

describe("runtime readiness from shared facts", () => {
  it("reports Docker Desktop conflict without proposing installation", async () => {
    const harness = createHarness({
      infrastructure: [infrastructureAvailable({dockerConflict: true})],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Docker Desktop appears to be active");
    expect(harness.actionRecords.map(({id}) => id)).not.toContain("infrastructure.container.install");
  });

  it("reports manual backend start when CLI is available but backend is not", async () => {
    const harness = createHarness({
      infrastructure: [infrastructureAvailable({backendAvailable: false})],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.nextActions.join("\n")).toContain("Start or restart Rancher Desktop");
  });

  it("proposes installation when CLI is not available", async () => {
    const harness = createHarness({
      runner: {
        run: async (command) => (commandKey(command) === "winget --version" ? commandResult({stdout: "v1.10"}) : commandResult()),
      },
      infrastructure: [
        infrastructureAvailable({cliAvailable: false}),
        infrastructureAvailable(), // refreshed after install
      ],
      dispositions: {"infrastructure.container.install": "planned"},
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(harness.actionRecords.map(({id}) => id)).toContain("infrastructure.container.install");
  });

  it("proposes installation when compose is not available", async () => {
    const harness = createHarness({
      runner: {
        run: async (command) => (commandKey(command) === "winget --version" ? commandResult({stdout: "v1.10"}) : commandResult()),
      },
      infrastructure: [
        infrastructureAvailable({composeAvailable: false}),
        infrastructureAvailable(), // refreshed
      ],
      dispositions: {"infrastructure.container.install": "planned"},
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(harness.actionRecords.map(({id}) => id)).toContain("infrastructure.container.install");
  });

  it("invalidates infrastructure and aggregate after container installation", async () => {
    const harness = createHarness({
      runner: {
        run: async (command) => (commandKey(command) === "winget --version" ? commandResult({stdout: "v1.10"}) : commandResult()),
      },
      infrastructure: [
        infrastructureAvailable({cliAvailable: false}),
        infrastructureAvailable(), // refreshed after install
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    await harness.phase.run(harness.context);

    expect(harness.inspection.invalidate).toHaveBeenCalledWith("infrastructure", "aggregate");
  });

  it("fails when refreshed facts are unavailable after successful installation command", async () => {
    const harness = createHarness({
      runner: {
        run: async (command) => (commandKey(command) === "winget --version" ? commandResult({stdout: "v1.10"}) : commandResult()),
      },
      infrastructure: [
        infrastructureAvailable({cliAvailable: false}),
        unavailableInfra("Runtime is gone."), // refreshed returns unavailable
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("refreshed infrastructure facts are unavailable");
  });

  it("fails when refreshed facts still show runtime not ready", async () => {
    const harness = createHarness({
      runner: {
        run: async (command) => (commandKey(command) === "winget --version" ? commandResult({stdout: "v1.10"}) : commandResult()),
      },
      infrastructure: [
        infrastructureAvailable({cliAvailable: false}),
        infrastructureAvailable({cliAvailable: false}), // still not ready
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("CLI is not available");
  });

  it("does not invalidate for declined container installation", async () => {
    const harness = createHarness({
      runner: {
        run: async (command) => (commandKey(command) === "winget --version" ? commandResult({stdout: "v1.10"}) : commandResult()),
      },
      infrastructure: [infrastructureAvailable({cliAvailable: false})],
      dispositions: {"infrastructure.container.install": "declined"},
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    await harness.phase.run(harness.context);

    expect(harness.inspection.invalidate).not.toHaveBeenCalled();
  });
});

describe("port readiness from shared facts", () => {
  it("reports all required ports available from shared facts", async () => {
    const harness = createHarness({
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    for (const port of requiredLocalPorts) {
      expect(result.evidence).toContain(`Port ${port} is available.`);
    }
  });

  it("blocks an unrelated port occupant", async () => {
    const harness = createHarness({
      infrastructure: [
        infrastructureAvailable({
          ports: requiredLocalPorts.map((port) =>
            port === 3000 ? {port, available: false, pid: 8124, processName: "unrelated-server.exe"} : {port, available: true},
          ),
        }),
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Port 3000 is occupied by PID 8124 (unrelated-server.exe)");
  });

  it("accepts a repository-owned port occupant as degraded", async () => {
    const harness = createHarness({
      infrastructure: [
        infrastructureAvailable({
          ports: requiredLocalPorts.map((port) =>
            port === 3000
              ? {port, available: false, pid: 4100, processName: "node next dev", repositoryOwned: true}
              : {port, available: true},
          ),
        }),
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
    expect(result.evidence.join("\n")).toContain("Port 3000 is occupied by repository PID 4100 (node next dev)");
    expect(result.nextActions).toContain("npm run dev:selfhost:stop -- --engine rancher");
  });

  it("blocks a port with inspection error", async () => {
    const harness = createHarness({
      infrastructure: [
        infrastructureAvailable({
          ports: requiredLocalPorts.map((port) =>
            port === 5000 ? {port, available: false, error: "Listener lookup failed: lsof exited with code 1."} : {port, available: true},
          ),
        }),
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("Port 5000 inspection failed: Listener lookup failed: lsof exited with code 1.");
  });

  it("reports unknown port ownership as blocked", async () => {
    const harness = createHarness({
      infrastructure: [
        infrastructureAvailable({
          ports: requiredLocalPorts.map((port) => (port === 6379 ? {port, available: false} : {port, available: true})),
        }),
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Port 6379 is occupied by an unidentified listener");
  });
});

describe("manifest readiness from shared facts", () => {
  it("blocks when manifest issues are present", async () => {
    const harness = createHarness({
      infrastructure: [
        infrastructureAvailable({
          manifestIssues: ["Missing required manifest: tooling/AppHost/AppHost.csproj"],
        }),
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("Missing required manifest: tooling/AppHost/AppHost.csproj");
    expect(result.nextActions).toContain("Restore the required tracked local infrastructure files, then rerun setup.");
  });
});

describe("certificate readiness from shared facts", () => {
  it("treats no certificate issues as idempotently satisfied", async () => {
    const harness = createHarness({
      infrastructure: [infrastructureAvailable({certificateIssues: []})],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(result.evidence).toContain("Optional selfhost certificate and key are present.");
    expect(harness.actionRecords.map(({id}) => id)).not.toContain("infrastructure.certificates.generate");
  });

  it("degrades for invalid certificate path kinds without attempting repair", async () => {
    const harness = createHarness({
      infrastructure: [
        infrastructureAvailable({
          certificateIssues: ["Selfhost certificate path is not a file: infra/Local/Management/certs/local-cert.pem (directory)."],
        }),
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
    expect(result.evidence.join("\n")).toContain("invalid kinds");
    expect(harness.actionRecords).toHaveLength(0);
  });

  it("attempts mkcert chain when certificates are missing", async () => {
    const harness = createHarness({
      infrastructure: [
        infrastructureAvailable({
          certificateIssues: [
            "Missing selfhost certificate file: infra/Local/Management/certs/local-cert.pem",
            "Missing selfhost certificate key: infra/Local/Management/certs/local-key.pem",
          ],
        }),
        infrastructureAvailable({certificateIssues: []}), // after mkcert install invalidation
        infrastructureAvailable({certificateIssues: []}), // after trust invalidation
        infrastructureAvailable({certificateIssues: []}), // after generate invalidation
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionRecords.map(({id}) => id)).toEqual(["infrastructure.mkcert.trust", "infrastructure.certificates.generate"]);
    expect(result.evidence).toContain("Optional selfhost certificate generation postcondition is satisfied.");
  });

  it("installs mkcert when unavailable and certificates are missing", async () => {
    const runner: CommandRunner = {
      run: async (command) => {
        const key = commandKey(command);
        if (key === "mkcert --version") {
          return commandResult({code: 1, spawnError: "ENOENT"});
        }
        if (key === "winget --version") {
          return commandResult({stdout: "v1.10"});
        }
        return commandResult();
      },
    };
    const harness = createHarness({
      runner,
      infrastructure: [
        infrastructureAvailable({
          certificateIssues: ["Missing selfhost certificate file: infra/Local/Management/certs/local-cert.pem"],
        }),
        infrastructureAvailable({certificateIssues: []}), // refreshed after mkcert install
        infrastructureAvailable({certificateIssues: []}), // refreshed after trust
        infrastructureAvailable({certificateIssues: []}), // refreshed after generate
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    await harness.phase.run(harness.context);
    expect(harness.actionRecords.map(({id}) => id)).toContain("infrastructure.mkcert.install");
  });

  it("verifies certificate postcondition from refreshed facts after generation", async () => {
    const harness = createHarness({
      infrastructure: [
        infrastructureAvailable({
          certificateIssues: ["Missing selfhost certificate file: infra/Local/Management/certs/local-cert.pem"],
        }),
        infrastructureAvailable({certificateIssues: []}), // after trust
        infrastructureAvailable({certificateIssues: ["Missing selfhost certificate file: still missing"]}), // after generate - still bad
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
    expect(result.evidence.join("\n")).toContain("certificate generation postcondition failed");
  });

  it("invalidates infrastructure after certificate generation even on failure", async () => {
    const runner: CommandRunner = {
      run: async (command) => {
        if (commandKey(command).startsWith("mkcert -key-file")) {
          return commandResult({code: 1, stderr: "generation denied"});
        }
        return commandResult();
      },
    };
    const harness = createHarness({
      runner,
      infrastructure: [
        infrastructureAvailable({
          certificateIssues: ["Missing selfhost certificate file: infra/Local/Management/certs/local-cert.pem"],
        }),
        infrastructureAvailable({certificateIssues: []}), // after trust
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
    expect(result.evidence.join("\n")).toContain("generation denied");
    // Invalidation still happened in finally
    expect(harness.inspection.events.filter((e) => e === "invalidate:infrastructure").length).toBeGreaterThanOrEqual(1);
  });

  it("plans the complete mkcert dependency chain during dry-run", async () => {
    const runner: CommandRunner = {
      run: async (command) => {
        if (commandKey(command) === "mkcert --version") {
          return commandResult({code: 1, spawnError: "ENOENT"});
        }
        if (commandKey(command) === "winget --version") {
          return commandResult({stdout: "v1.10"});
        }
        return commandResult();
      },
    };
    const harness = createHarness({
      options: setupOptions({dryRun: true}),
      runner,
      dispositions: {
        "infrastructure.mkcert.install": "planned",
        "infrastructure.mkcert.trust": "planned",
        "infrastructure.certificates.generate": "planned",
      },
      infrastructure: [
        infrastructureAvailable({
          certificateIssues: ["Missing selfhost certificate file: infra/Local/Management/certs/local-cert.pem"],
        }),
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(harness.actionRecords.map(({id}) => id)).toEqual([
      "infrastructure.mkcert.install",
      "infrastructure.mkcert.trust",
      "infrastructure.certificates.generate",
    ]);
    // No invalidation because actions were only planned
    expect(harness.inspection.invalidate).not.toHaveBeenCalled();
  });

  it("creates the certificate directory and uses exact paths for mkcert generate", async () => {
    const createdDirectories: string[] = [];
    const harness = createHarness({
      createDirectory: async (path) => {
        createdDirectories.push(path);
      },
      infrastructure: [
        infrastructureAvailable({
          certificateIssues: ["Missing selfhost certificate file: infra/Local/Management/certs/local-cert.pem"],
        }),
        infrastructureAvailable({certificateIssues: []}), // after trust
        infrastructureAvailable({certificateIssues: []}), // after generate
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    await harness.phase.run(harness.context);

    expect(createdDirectories).toEqual([dirname(certificatePath)]);
    expect(harness.run.mock.calls.map(([cmd]) => commandKey(cmd))).toContain(
      `mkcert -key-file ${certificateKeyPath} -cert-file ${certificatePath} localhost *.localhost`,
    );
  });
});

describe("credential isolation", () => {
  it("never reads or forwards MSSQL_SA_PASSWORD to mutation commands", async () => {
    const environment = new Proxy<NodeJS.ProcessEnv>(
      {AROLARIU_CONTAINER_ENGINE: "rancher"},
      {
        get(target, property, receiver) {
          if (property === "MSSQL_SA_PASSWORD") {
            throw new Error("SQL password was accessed");
          }
          return Reflect.get(target, property, receiver);
        },
      },
    );
    const harness = createHarness({
      options: setupOptions({engine: undefined}),
      environment,
      config: {status: "missing"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    const serializedCommands = JSON.stringify(harness.run.mock.calls.map(([command, options]) => ({command, options})));
    expect(serializedCommands).not.toContain("MSSQL_SA_PASSWORD");
  });

  it("removes MSSQL_SA_PASSWORD from every phase child environment", async () => {
    const key = "MSSQL_SA_PASSWORD";
    const hadPreviousValue = Object.hasOwn(process.env, key);
    const previousValue = process.env[key];
    process.env[key] = "phase-parent-sentinel";
    const commandEnvironments: Array<Readonly<NodeJS.ProcessEnv> | undefined> = [];
    const runner: CommandRunner = {
      run: async (_command, options) => {
        commandEnvironments.push(options?.env);
        return commandResult();
      },
    };
    const harness = createHarness({
      runner,
      infrastructure: [
        infrastructureAvailable({
          certificateIssues: ["Missing selfhost certificate file: infra/Local/Management/certs/local-cert.pem"],
        }),
        infrastructureAvailable({certificateIssues: []}), // after trust
        infrastructureAvailable({certificateIssues: []}), // after generate
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    try {
      const result = await harness.phase.run(harness.context);

      expect(result.status).toBe("succeeded");
      expect(commandEnvironments.length).toBeGreaterThan(0);
      for (const env of commandEnvironments) {
        expect(env).toHaveProperty(key, undefined);
      }
    } finally {
      if (hadPreviousValue) {
        process.env[key] = previousValue;
      } else {
        delete process.env[key];
      }
    }
  });
});

describe("abort and failure", () => {
  it.each(["config", "prompt", "action"] as const)("rethrows AbortError from the %s boundary", async (boundary) => {
    const interruption = Object.assign(new Error(`interrupted ${boundary}`), {name: "AbortError"});
    const actions: SetupActionExecutor = {
      run: async () => {
        throw interruption;
      },
    };
    const harness = createHarness({
      options: setupOptions({engine: boundary === "prompt" ? undefined : "podman"}),
      ...(boundary === "action"
        ? {config: {status: "valid" as const, config: {schemaVersion: 1, containerEngine: "rancher" as const}}}
        : {}),
      ...(boundary === "config" ? {readConfig: async () => Promise.reject(interruption)} : {}),
      ...(boundary === "prompt" ? {select: async () => Promise.reject(interruption)} : {}),
      ...(boundary === "action" ? {actions} : {}),
    });

    await expect(harness.phase.run(harness.context)).rejects.toBe(interruption);
  });

  it("invalidates before propagating AbortError during an attempted mutation", async () => {
    const interruption = Object.assign(new Error("interrupted mutation"), {name: "AbortError"});
    const actionRecords: SetupAction[] = [];
    const actions: SetupActionExecutor = {
      run: async (action) => {
        actionRecords.push(action);
        // Execute the callback to set attempted = true, then throw
        await action.execute();
        throw interruption;
      },
    };
    const harness = createHarness({
      options: setupOptions({engine: "podman"}),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
      actions,
    });

    await expect(harness.phase.run(harness.context)).rejects.toBe(interruption);
    // Engine persist action was attempted, so infrastructure should have been invalidated in finally
    expect(harness.inspection.invalidate).toHaveBeenCalledWith("infrastructure");
  });

  it("fails when shared infrastructure inspection returns unavailable", async () => {
    const harness = createHarness({
      infrastructure: [unavailableInfra("Certificate path is unreadable.")],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.summary).toContain("Shared infrastructure inspection failed");
    expect(result.evidence.join("\n")).toContain("Certificate path is unreadable.");
  });

  it("executes no mutation during dry-run", async () => {
    const executed: string[] = [];
    const actions: SetupActionExecutor = {
      run: async (action) => {
        executed.push(`planned:${action.id}`);
        return "planned";
      },
    };
    const harness = createHarness({
      options: setupOptions({dryRun: true}),
      actions,
      infrastructure: [
        infrastructureAvailable({
          certificateIssues: ["Missing selfhost certificate file: infra/Local/Management/certs/local-cert.pem"],
        }),
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(executed.every((e) => e.startsWith("planned:"))).toBe(true);
  });

  it("gives port blockers precedence over planned persistence", async () => {
    const harness = createHarness({
      options: setupOptions({engine: "podman", dryRun: true}),
      dispositions: {"infrastructure.engine.persist": "planned"},
      infrastructure: [
        infrastructureAvailable({
          selectedEngine: "podman",
          ports: requiredLocalPorts.map((port) =>
            port === 3000 ? {port, available: false, pid: 7, processName: "unrelated"} : {port, available: true},
          ),
        }),
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
  });

  it("inspection event order: updateEngine, inspect, invalidate cycle", async () => {
    const harness = createHarness({
      options: setupOptions({engine: "podman"}),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
      infrastructure: [
        infrastructureAvailable({selectedEngine: "podman"}), // persistence re-inspect
        infrastructureAvailable({selectedEngine: "podman"}), // main inspect
      ],
    });

    await harness.phase.run(harness.context);

    // First: updateInfrastructureEngine, then invalidate:infrastructure (persist), then inspect (persist refresh),
    // then inspect:infrastructure (main readiness)
    expect(harness.inspection.events[0]).toBe("updateInfrastructureEngine");
    expect(harness.inspection.events).toContain("invalidate:infrastructure");
    expect(harness.inspection.events).toContain("inspect:infrastructure");
  });
});
