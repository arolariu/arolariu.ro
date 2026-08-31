// @vitest-environment node
/**
 * @fileoverview Contract tests for local infrastructure preparation.
 * @module scripts.setup.infrastructure.test
 */

import {dirname, isAbsolute, join, resolve} from "node:path";
import {createServer} from "node:net";
import {describe, expect, it, vi} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import {defaultCommandRunner, type CommandResult, type CommandRunner, type CommandSpec} from "./common/process.ts";
import {createRepositoryPaths} from "./common/repository-paths.ts";
import type {RepositoryRequirements} from "./common/requirements.ts";
import type {ToolingConfigReadResult, ToolingConfigV1} from "./common/tooling-config.ts";
import {requiredLocalPorts} from "./container-runtime/preflight.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";
import {
  createInfrastructureSetupPhase,
  defaultDependencies,
  infrastructureSetupPhase,
  inspectRequiredPorts,
  selectContainerInstallationProposal,
  type PortState,
} from "./setup.infrastructure.ts";
import type {SetupAction, SetupActionDisposition, SetupActionExecutor, SetupContext, SetupOptions} from "./setup.types.ts";

/** A typed fake {@link RepositoryInspectionSession} that never resolves a real repository fact. */
function createFakeInspectionSession(): RepositoryInspectionSession {
  return {
    inspect: async () => ({kind: "unavailable", reason: "Not exercised by this test.", durationMs: 0}),
    invalidate: () => {},
  };
}

const ROOT = resolve(process.cwd(), ".synthetic", "setup-infrastructure-root");
const paths = createRepositoryPaths(ROOT);
const requiredFiles = [
  join(paths.root, "tooling", "AppHost", "AppHost.csproj"),
  join(paths.root, "infra", "Local", "Management", "docker-compose.yml"),
  join(paths.root, "infra", "Local", "Storage", "docker-compose.yml"),
  join(paths.root, "infra", "Local", "Backend", "docker-compose.yml"),
  join(paths.root, "infra", "Local", "Frontend", "docker-compose.yml"),
] as const;
const certificatePath = join(paths.root, "infra", "Local", "Management", "certs", "local-cert.pem");
const certificateKeyPath = join(paths.root, "infra", "Local", "Management", "certs", "local-key.pem");
const SYNTHETIC_INSPECTION_PORT = 49_151;

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
  return [command.command, ...command.args].join(" ");
}

function successfulRuntimeResponse(command: Readonly<CommandSpec>): CommandResult {
  const key = commandKey(command);
  if (key === "docker --version" || key === "docker version") {
    return commandResult({stdout: "Rancher Desktop 1.20.0"});
  }
  if (key === "podman --version") {
    return commandResult({stdout: "podman version 5.8.2"});
  }
  if (key === "podman compose version") {
    return commandResult({stdout: "podman-compose version 1.5.0"});
  }
  if (key === "podman info --format json") {
    return commandResult({stdout: "{}"});
  }
  if (key.endsWith(" ps --format {{.Names}}\t{{.Ports}}") || key.endsWith(" ps -a --format {{.Names}}")) {
    return commandResult();
  }
  return commandResult();
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

interface HarnessInput {
  readonly options?: SetupOptions | undefined;
  readonly environment?: Readonly<NodeJS.ProcessEnv> | undefined;
  readonly interactive?: boolean | undefined;
  readonly platform?: NodeJS.Platform | undefined;
  readonly root?: string | undefined;
  readonly config?: ToolingConfigReadResult | undefined;
  readonly readConfig?: ((path: string) => Promise<ToolingConfigReadResult>) | undefined;
  readonly writeConfig?: ((path: string, config: Readonly<ToolingConfigV1>) => Promise<void>) | undefined;
  readonly runner?: CommandRunner | undefined;
  readonly ports?: readonly PortState[] | undefined;
  readonly inspectFile?: ((path: string) => Promise<"file" | "missing" | "directory" | "other">) | undefined;
  readonly createDirectory?: ((path: string) => Promise<void>) | undefined;
  readonly dispositions?: Readonly<Record<string, SetupActionDisposition>> | undefined;
  readonly actions?: SetupActionExecutor | undefined;
  readonly select?: SetupContext["prompts"]["select"] | undefined;
}

function createHarness(input: HarnessInput = {}): Readonly<{
  phase: ReturnType<typeof createInfrastructureSetupPhase>;
  context: SetupContext;
  run: ReturnType<typeof vi.fn<CommandRunner["run"]>>;
  select: ReturnType<typeof vi.fn<SetupContext["prompts"]["select"]>>;
  actionRecords: SetupAction[];
  writeConfig: ReturnType<typeof vi.fn<(path: string, config: Readonly<ToolingConfigV1>) => Promise<void>>>;
  inspectedPorts: number[][];
}> {
  const run = vi.fn<CommandRunner["run"]>(async (command, options) =>
    input.runner === undefined ? successfulRuntimeResponse(command) : input.runner.run(command, options),
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
  const inspectedPorts: number[][] = [];
  let now = 10;
  const context: SetupContext = {
    options: input.options ?? setupOptions(),
    paths: input.root === undefined ? paths : {...paths, root: input.root},
    requirements: requirements(),
    inspection: createFakeInspectionSession(),
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
    inspectPorts: async (ports) => {
      inspectedPorts.push([...ports]);
      return input.ports ?? ports.map((port) => ({port, available: true}));
    },
    inspectFile: input.inspectFile ?? (async () => "file"),
    createDirectory: input.createDirectory ?? (async () => undefined),
  });

  return {phase, context, run, select, actionRecords, writeConfig, inspectedPorts};
}

describe("infrastructure setup public contract", () => {
  it("uses a host-native absolute synthetic repository root", () => {
    expect(paths.root).toBe(resolve(process.cwd(), ".synthetic", "setup-infrastructure-root"));
    expect(isAbsolute(paths.root)).toBe(true);
  });

  it("publishes an independent required phase", () => {
    expect(infrastructureSetupPhase).toMatchObject({
      id: "infrastructure",
      title: "Local infrastructure",
      required: true,
      dependsOn: [],
      run: expect.any(Function),
    });
    expect(createInfrastructureSetupPhase).toEqual(expect.any(Function));
    expect(inspectRequiredPorts).toEqual(expect.any(Function));
    expect(selectContainerInstallationProposal).toEqual(expect.any(Function));
  });
});

describe("selectContainerInstallationProposal", () => {
  it.each([
    [
      "win32",
      "rancher",
      ["winget"],
      {
        command: {
          command: "winget",
          args: ["install", "--id", "SUSE.RancherDesktop", "--exact", "--accept-package-agreements", "--accept-source-agreements"],
        },
      },
    ],
    [
      "win32",
      "podman",
      ["winget"],
      {
        command: {
          command: "winget",
          args: ["install", "--id", "RedHat.Podman-Desktop", "--exact", "--accept-package-agreements", "--accept-source-agreements"],
        },
      },
    ],
    ["darwin", "rancher", ["brew"], {command: {command: "brew", args: ["install", "--cask", "rancher"]}}],
    ["darwin", "podman", ["brew"], {command: {command: "brew", args: ["install", "--cask", "podman-desktop"]}}],
    ["linux", "podman", ["apt-get"], {command: {command: "sudo", args: ["apt-get", "install", "-y", "podman", "podman-compose"]}}],
    ["linux", "podman", ["dnf"], {command: {command: "sudo", args: ["dnf", "install", "-y", "podman", "podman-compose"]}}],
  ] as const)("returns the reviewed %s/%s proposal", (platform, engine, managers, expected) => {
    expect(
      selectContainerInstallationProposal({
        engine,
        platform,
        availablePackageManagers: new Set(managers),
      }),
    ).toMatchObject(expected);
  });

  it.each([
    ["linux", "rancher", ["apt-get"]],
    ["linux", "rancher", ["dnf"]],
    ["win32", "rancher", []],
    ["darwin", "podman", []],
    ["freebsd", "podman", ["pkg"]],
  ] as const)("returns null for unsupported %s/%s automation", (platform, engine, managers) => {
    expect(
      selectContainerInstallationProposal({
        engine,
        platform,
        availablePackageManagers: new Set(managers),
      }),
    ).toBeNull();
  });
});

describe("engine selection and persistence", () => {
  it("prefers the CLI option and persists it while preserving fingerprints", async () => {
    const harness = createHarness({
      options: setupOptions({engine: "podman"}),
      environment: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      config: {
        status: "valid",
        config: {
          schemaVersion: 1,
          containerEngine: "rancher",
          fingerprints: {nodeVersion: "24.0.0"},
        },
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(result.evidence).toContain("Selected Podman Desktop from argument.");
    expect(harness.writeConfig).toHaveBeenCalledWith(paths.toolingConfig, {
      schemaVersion: 1,
      containerEngine: "podman",
      fingerprints: {nodeVersion: "24.0.0"},
    });
    expect(harness.select).not.toHaveBeenCalled();
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
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(result.evidence).toContain("Selected Podman Desktop from configuration.");
    expect(harness.actionRecords.map(({id}) => id)).not.toContain("infrastructure.engine.persist");
    expect(harness.writeConfig).not.toHaveBeenCalled();
  });

  it("prompts with explicit runtime requirements only when interactive selection is required", async () => {
    const harness = createHarness({
      options: setupOptions({engine: undefined, yes: true}),
      interactive: true,
      select: async <TValue extends string>(_message: string, choices: readonly Readonly<{value: TValue; label: string}>[]) => {
        expect(choices).toEqual([
          {
            value: "rancher",
            label: "Rancher Desktop (Moby/dockerd; Docker Desktop must be stopped)",
          },
          {
            value: "podman",
            label: "Podman Desktop (podman compose provider required)",
          },
        ]);
        const podman = choices.find(({value}) => value === "podman");
        if (podman === undefined) {
          throw new Error("Expected the Podman choice.");
        }
        return podman.value;
      },
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
    expect(harness.select).not.toHaveBeenCalled();
  });

  it("blocks invalid configuration without prompting or overwriting it", async () => {
    const harness = createHarness({
      options: setupOptions({engine: undefined}),
      config: {status: "invalid", error: "Invalid local tooling configuration: secret-shaped key."},
    });

    const result = await harness.phase.run(harness.context);

    expect(result).toMatchObject({
      status: "failed",
      summary: expect.stringContaining("tooling configuration is invalid"),
    });
    expect(harness.select).not.toHaveBeenCalled();
    expect(harness.writeConfig).not.toHaveBeenCalled();
    expect(harness.actionRecords).toHaveLength(0);
  });

  it("plans changed selection persistence without writing during dry-run", async () => {
    const harness = createHarness({
      options: setupOptions({engine: "podman", dryRun: true}),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
      dispositions: {"infrastructure.engine.persist": "planned"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(result.evidence).toContain("Planned action: infrastructure.engine.persist");
    expect(harness.writeConfig).not.toHaveBeenCalled();
  });

  it.each(["config", "prompt", "action"] as const)("rethrows AbortError from the %s boundary", async (boundary) => {
    const interruption = Object.assign(new Error(`interrupted ${boundary}`), {name: "AbortError"});
    const actions: SetupActionExecutor = {
      run: async () => {
        throw interruption;
      },
    };
    const harness = createHarness({
      options: setupOptions({engine: boundary === "prompt" ? undefined : "podman"}),
      config: boundary === "action" ? {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}} : undefined,
      readConfig: boundary === "config" ? async () => Promise.reject(interruption) : undefined,
      select: boundary === "prompt" ? async () => Promise.reject(interruption) : undefined,
      actions: boundary === "action" ? actions : undefined,
    });

    await expect(harness.phase.run(harness.context)).rejects.toBe(interruption);
  });
});

describe("container runtime readiness", () => {
  it("delegates the complete Rancher readiness contract to shared preflight", async () => {
    const harness = createHarness({
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.run.mock.calls.map(([command]) => commandKey(command))).toEqual([
      "docker --version",
      "docker version",
      "docker compose version",
      "docker ps -a --format {{.Names}}",
      "docker ps --format {{.Names}}\t{{.Ports}}",
    ]);
    expect(result.evidence).toContain("Rancher Desktop runtime postcondition is satisfied.");
  });

  it("requires Podman machine information after shared preflight", async () => {
    const harness = createHarness({
      options: setupOptions({engine: "podman"}),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "podman"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.run.mock.calls.map(([command]) => commandKey(command))).toContain("podman info --format json");
    expect(result.evidence).toContain("Podman Desktop runtime postcondition is satisfied.");
  });

  it("blocks Docker Desktop backend evidence without proposing installation", async () => {
    const runner: CommandRunner = {
      run: async (command) =>
        commandKey(command) === "docker version" ? commandResult({stdout: "Docker Desktop 4.50.0"}) : successfulRuntimeResponse(command),
    };
    const harness = createHarness({
      runner,
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Docker Desktop appears to be active");
    expect(harness.actionRecords.map(({id}) => id)).not.toContain("infrastructure.container.install");
  });

  it("blocks Docker Desktop before proposing installation when Podman is missing", async () => {
    const runner: CommandRunner = {
      run: async (command) => {
        const key = commandKey(command);
        if (key === "podman --version") {
          return commandResult({code: 1, spawnError: "ENOENT"});
        }
        if (key === "docker version") {
          return commandResult({stdout: "Docker Desktop 4.50.0"});
        }
        if (key === "winget --version") {
          return commandResult({stdout: "v1.10"});
        }
        return successfulRuntimeResponse(command);
      },
    };
    const harness = createHarness({
      options: setupOptions({engine: "podman"}),
      runner,
      dispositions: {"infrastructure.container.install": "planned"},
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "podman"}},
    });

    const result = await harness.phase.run(harness.context);
    const commands = harness.run.mock.calls.map(([command]) => commandKey(command));

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Docker Desktop is the active backend");
    expect(harness.actionRecords.map(({id}) => id)).not.toContain("infrastructure.container.install");
    expect(commands).toContain("docker version");
    expect(commands).not.toContain("winget --version");
  });

  it("reports manual desktop startup when an installed Rancher CLI cannot reach its backend", async () => {
    const runner: CommandRunner = {
      run: async (command) => {
        const key = commandKey(command);
        if (key === "docker --version") {
          return commandResult({stdout: "Docker version 28.0.0"});
        }
        if (key === "docker version") {
          return commandResult({code: 1, stderr: "Cannot connect to the Docker daemon"});
        }
        return successfulRuntimeResponse(command);
      },
    };
    const harness = createHarness({
      runner,
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.nextActions.join("\n")).toContain("Start or restart Rancher Desktop");
    expect(harness.actionRecords.map(({id}) => id)).not.toContain("infrastructure.container.install");
  });

  it("treats a failed Podman info probe as a manual machine-start blocker", async () => {
    const runner: CommandRunner = {
      run: async (command) =>
        commandKey(command) === "podman info --format json"
          ? commandResult({code: 125, stderr: "cannot connect to Podman socket"})
          : successfulRuntimeResponse(command),
    };
    const harness = createHarness({
      options: setupOptions({engine: "podman"}),
      runner,
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "podman"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("podman info --format json");
    expect(result.nextActions.join("\n")).toContain("Start or restart Podman Desktop");
  });

  it.each([
    ["win32", "winget --version"],
    ["darwin", "brew --version"],
    ["linux", "apt-get --version|dnf --version"],
  ] as const)("probes only platform-relevant package managers on %s", async (platform, expected) => {
    const runner: CommandRunner = {
      run: async (command) => {
        const key = commandKey(command);
        if (key === "docker --version") {
          return commandResult({code: 1, spawnError: "ENOENT"});
        }
        if (key.endsWith("--version")) {
          return commandResult({stdout: "available"});
        }
        return successfulRuntimeResponse(command);
      },
    };
    const harness = createHarness({
      platform,
      runner,
      dispositions: {"infrastructure.container.install": "planned"},
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    await harness.phase.run(harness.context);

    const packageProbes = harness.run.mock.calls
      .map(([command]) => commandKey(command))
      .filter((command) => /^(?:winget|brew|apt-get|dnf) --version$/u.test(command));
    expect(packageProbes.join("|")).toBe(expected);
  });

  it.each([
    ["declined", "failed"],
    ["planned", "skipped"],
  ] as const)("honors a %s required container installation action", async (disposition, expectedStatus) => {
    const runner: CommandRunner = {
      run: async (command) => {
        const key = commandKey(command);
        if (key === "docker --version") {
          return commandResult({code: 1, spawnError: "ENOENT"});
        }
        if (key === "winget --version") {
          return commandResult({stdout: "v1.10"});
        }
        return successfulRuntimeResponse(command);
      },
    };
    const harness = createHarness({
      runner,
      dispositions: {"infrastructure.container.install": disposition},
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe(expectedStatus);
    expect(harness.actionRecords).toContainEqual(expect.objectContaining({id: "infrastructure.container.install", scope: "system"}));
  });

  it("executes an installer with inherited output and reruns the complete runtime postcondition", async () => {
    let cliProbes = 0;
    const runner: CommandRunner = {
      run: async (command) => {
        const key = commandKey(command);
        if (key === "docker --version") {
          cliProbes++;
          return cliProbes === 1 ? commandResult({code: 1, spawnError: "ENOENT"}) : commandResult({stdout: "Docker version 28.0.0"});
        }
        if (key === "winget --version") {
          return commandResult({stdout: "v1.10"});
        }
        return successfulRuntimeResponse(command);
      },
    };
    const harness = createHarness({
      runner,
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(cliProbes).toBe(2);
    expect(harness.run.mock.calls.filter(([command]) => commandKey(command) === "docker version")).toHaveLength(1);
    expect(harness.run.mock.calls).toContainEqual([
      expect.objectContaining({command: "winget", args: expect.arrayContaining(["install", "SUSE.RancherDesktop"])}),
      expect.objectContaining({output: "inherit"}),
    ]);
  });

  it("proposes an installation when Compose capability is missing", async () => {
    let composeProbes = 0;
    const runner: CommandRunner = {
      run: async (command) => {
        const key = commandKey(command);
        if (key === "docker compose version") {
          composeProbes++;
          return commandResult({code: 1, stderr: "compose unavailable"});
        }
        if (key === "winget --version") {
          return commandResult({stdout: "v1.10"});
        }
        return successfulRuntimeResponse(command);
      },
    };
    const harness = createHarness({
      runner,
      dispositions: {"infrastructure.container.install": "planned"},
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(composeProbes).toBe(1);
    expect(harness.actionRecords.map(({id}) => id)).toContain("infrastructure.container.install");
  });
});

describe("required port inspection", () => {
  it("passes every required port to the injected read-only boundary in stable order", async () => {
    const harness = createHarness({
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(harness.inspectedPorts).toEqual([[3000, 3002, 4173, 5000, 5002, 6379, 8081, 8082, 10000]]);
    for (const port of requiredLocalPorts) {
      expect(result.evidence).toContain(`Port ${port} is available.`);
    }
  });

  it("returns explicit invalid states without attempting to bind invalid public inputs", async () => {
    await expect(inspectRequiredPorts([0, 65_536, -1, 3000.5, Number.NaN])).resolves.toEqual([
      {port: 0, available: false, error: "Invalid TCP port 0."},
      {port: 65_536, available: false, error: "Invalid TCP port 65536."},
      {port: -1, available: false, error: "Invalid TCP port -1."},
      {port: 3000.5, available: false, error: "Invalid TCP port 3000.5."},
      {port: Number.NaN, available: false, error: "Invalid TCP port NaN."},
    ]);
  });

  it("propagates AbortError from an injected bind probe without inspecting later ports", async () => {
    const interruption = Object.assign(new Error("bind probe interrupted"), {name: "AbortError"});
    const inspected: number[] = [];

    const inspection = inspectRequiredPorts([SYNTHETIC_INSPECTION_PORT, SYNTHETIC_INSPECTION_PORT + 1], {
      probePort: async (port) => {
        inspected.push(port);
        throw interruption;
      },
    });

    await expect(inspection).rejects.toBe(interruption);
    expect(inspected).toEqual([SYNTHETIC_INSPECTION_PORT]);
  });

  it("propagates AbortError from an injected listener runner without inspecting later ports", async () => {
    const interruption = Object.assign(new Error("listener lookup interrupted"), {name: "AbortError"});
    const probed: number[] = [];
    const run = vi.fn<CommandRunner["run"]>(async () => Promise.reject(interruption));

    const inspection = inspectRequiredPorts([SYNTHETIC_INSPECTION_PORT, SYNTHETIC_INSPECTION_PORT + 1], {
      platform: "win32",
      probePort: async (port) => {
        probed.push(port);
        return {status: "occupied"};
      },
      listenerRunner: {run},
    });

    await expect(inspection).rejects.toBe(interruption);
    expect(probed).toEqual([SYNTHETIC_INSPECTION_PORT]);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      "exact IPv4",
      [
        {
          localAddress: "127.0.0.1",
          family: "IPv4",
          pid: 701,
          processName: "node",
          commandLine: "node exact-listener.js",
        },
      ],
      {pid: 701, processName: "node exact-listener.js"},
    ],
    [
      "wildcard IPv4",
      [
        {
          localAddress: "0.0.0.0",
          family: "IPv4",
          pid: 702,
          processName: "dotnet",
          commandLine: "dotnet wildcard-listener.dll",
        },
      ],
      {pid: 702, processName: "dotnet wildcard-listener.dll"},
    ],
    [
      "same-PID duplicate address",
      [
        {
          localAddress: "0.0.0.0",
          family: "IPv4",
          pid: 703,
          processName: "python",
          commandLine: "python duplicate-listener.py",
        },
        {
          localAddress: "127.0.0.1",
          family: "IPv4",
          pid: 703,
          processName: "python",
          commandLine: "python duplicate-listener.py",
        },
      ],
      {pid: 703, processName: "python duplicate-listener.py"},
    ],
  ] as const)("correlates injected %s listener evidence to the IPv4 bind", async (_case, listeners, expected) => {
    const result = await inspectRequiredPorts([SYNTHETIC_INSPECTION_PORT], {
      probePort: async () => ({status: "occupied"}),
      lookupListeners: async () => listeners,
    });

    expect(result).toEqual([{port: SYNTHETIC_INSPECTION_PORT, available: false, ...expected}]);
  });

  it("returns a distinct ownership error for an unrelated IPv6-only listener", async () => {
    const result = await inspectRequiredPorts([SYNTHETIC_INSPECTION_PORT], {
      probePort: async () => ({status: "occupied"}),
      lookupListeners: async () => [
        {
          localAddress: "::1",
          family: "IPv6",
          pid: 704,
          processName: "node",
          commandLine: "node ipv6-only.js",
        },
      ],
    });

    expect(result).toEqual([
      {
        port: SYNTHETIC_INSPECTION_PORT,
        available: false,
        error: "Listener ownership failed: no listener record matched 127.0.0.1 or a wildcard address.",
      },
    ]);
  });

  it("returns a distinct ownership error when multiple PIDs can block the IPv4 bind", async () => {
    const result = await inspectRequiredPorts([SYNTHETIC_INSPECTION_PORT], {
      probePort: async () => ({status: "occupied"}),
      lookupListeners: async () => [
        {
          localAddress: "127.0.0.1",
          family: "IPv4",
          pid: 705,
          processName: "node",
          commandLine: "node exact.js",
        },
        {
          localAddress: "::",
          family: "IPv6",
          pid: 706,
          processName: "dotnet",
          commandLine: "dotnet wildcard.dll",
        },
      ],
    });

    expect(result).toEqual([
      {
        port: SYNTHETIC_INSPECTION_PORT,
        available: false,
        error: "Listener ownership is ambiguous: multiple PIDs (705, 706) can block 127.0.0.1.",
      },
    ]);
  });

  it("passes the SQL password removal override to the listener command runner", async () => {
    const run = vi.fn<CommandRunner["run"]>(async () =>
      commandResult({
        stdout: JSON.stringify([
          {
            localAddress: "0.0.0.0",
            family: "IPv4",
            pid: 707,
            processName: "node.exe",
            commandLine: "node exact-listener.js",
          },
          {
            localAddress: "127.0.0.1",
            family: "IPv4",
            pid: 707,
            processName: "node.exe",
            commandLine: "node exact-listener.js",
          },
        ]),
      }),
    );

    const result = await inspectRequiredPorts([SYNTHETIC_INSPECTION_PORT], {
      platform: "win32",
      probePort: async () => ({status: "occupied"}),
      listenerRunner: {run},
    });

    expect(result).toEqual([
      {
        port: SYNTHETIC_INSPECTION_PORT,
        available: false,
        pid: 707,
        processName: "node exact-listener.js",
      },
    ]);
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0]?.[1]?.env).toHaveProperty("MSSQL_SA_PASSWORD", undefined);
    expect(run.mock.calls[0]?.[0].args.join(" ")).toContain("foreach ($connection in $connections)");
    expect(run.mock.calls[0]?.[0].args.join(" ")).not.toContain("Select-Object -First");
  });

  it("retains POSIX listener addresses and resolves each exact PID command line", async () => {
    const run = vi.fn<CommandRunner["run"]>(async (command) => {
      const key = commandKey(command);
      if (key.includes("-i4TCP:")) {
        return commandResult({stdout: `p708\ncnode\nn127.0.0.1:${SYNTHETIC_INSPECTION_PORT}\n`});
      }
      if (key.includes("-i6TCP:")) {
        return commandResult({stdout: `p709\ncnode\nn[::1]:${SYNTHETIC_INSPECTION_PORT}\n`});
      }
      if (key === "ps -p 708 -o command=") {
        return commandResult({stdout: "node exact-posix-listener.js\n"});
      }
      if (key === "ps -p 709 -o command=") {
        return commandResult({stdout: "node unrelated-ipv6-listener.js\n"});
      }
      return commandResult({code: 1, stderr: `Unexpected command: ${key}`});
    });

    const result = await inspectRequiredPorts([SYNTHETIC_INSPECTION_PORT], {
      platform: "linux",
      probePort: async () => ({status: "occupied"}),
      listenerRunner: {run},
    });

    expect(result).toEqual([
      {
        port: SYNTHETIC_INSPECTION_PORT,
        available: false,
        pid: 708,
        processName: "node exact-posix-listener.js",
      },
    ]);
    expect(run.mock.calls.map(([command]) => commandKey(command))).toEqual(
      expect.arrayContaining([
        `lsof -nP -a -i4TCP:${SYNTHETIC_INSPECTION_PORT} -sTCP:LISTEN -Fpcn`,
        `lsof -nP -a -i6TCP:${SYNTHETIC_INSPECTION_PORT} -sTCP:LISTEN -Fpcn`,
        "ps -p 708 -o command=",
        "ps -p 709 -o command=",
      ]),
    );
    for (const [, options] of run.mock.calls) {
      expect(options?.env).toHaveProperty("MSSQL_SA_PASSWORD", undefined);
    }
  });

  it("bounds the Windows listener lookup command with the default timeout", async () => {
    const run = vi.fn<CommandRunner["run"]>(async () =>
      commandResult({
        stdout: JSON.stringify([
          {localAddress: "127.0.0.1", family: "IPv4", pid: 710, processName: "node.exe", commandLine: "node bounded-listener.js"},
        ]),
      }),
    );

    await inspectRequiredPorts([SYNTHETIC_INSPECTION_PORT], {
      platform: "win32",
      probePort: async () => ({status: "occupied"}),
      listenerRunner: {run},
    });

    expect(run).toHaveBeenCalledOnce();
    expect(run.mock.calls[0]?.[1]).toMatchObject({timeoutMs: 120_000});
  });

  it("bounds POSIX listener lookup commands with the default timeout", async () => {
    const run = vi.fn<CommandRunner["run"]>(async (command) => {
      const key = commandKey(command);
      if (key.includes("-i4TCP:")) {
        return commandResult({stdout: `p711\ncnode\nn127.0.0.1:${SYNTHETIC_INSPECTION_PORT}\n`});
      }
      if (key.includes("-i6TCP:")) {
        return commandResult({stdout: ""});
      }
      if (key === "ps -p 711 -o command=") {
        return commandResult({stdout: "node bounded-posix-listener.js\n"});
      }
      return commandResult({code: 1, stderr: `Unexpected command: ${key}`});
    });

    await inspectRequiredPorts([SYNTHETIC_INSPECTION_PORT], {
      platform: "linux",
      probePort: async () => ({status: "occupied"}),
      listenerRunner: {run},
    });

    expect(run.mock.calls.length).toBeGreaterThan(0);
    for (const [, options] of run.mock.calls) {
      expect(options).toMatchObject({timeoutMs: 120_000});
    }
  });

  it("routes production listener lookups through the supplied phase runner instead of a detached default runner", async () => {
    const port = 49_567;
    const server = createServer();
    await new Promise<void>((resolveListen, rejectListen) => {
      server.once("error", rejectListen);
      server.listen({host: "127.0.0.1", port, exclusive: true}, () => resolveListen());
    });

    try {
      const run = vi.fn<CommandRunner["run"]>(async () => {
        throw new Error("phase-runner-sentinel-invoked");
      });

      const [state] = await defaultDependencies.inspectPorts([port], {run});

      expect(run.mock.calls.length).toBeGreaterThan(0);
      expect(state).toMatchObject({
        port,
        available: false,
        error: expect.stringContaining("phase-runner-sentinel-invoked"),
      });
    } finally {
      await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    }
  });

  it("blocks an unrelated listener with exact PID and process evidence", async () => {
    const harness = createHarness({
      ports: [
        {port: 3000, available: false, pid: 8124, processName: "node C:\\other\\unrelated-server.js"},
        ...requiredLocalPorts.slice(1).map((port) => ({port, available: true})),
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Port 3000 is occupied by PID 8124 (node C:\\other\\unrelated-server.js)");
  });

  it.each([
    [3000, `node ${join(paths.root, "node_modules", "next", "dist", "bin", "next")} dev`],
    [5000, `dotnet run --project ${join(paths.root, "tooling", "AppHost", "AppHost.csproj")}`],
    [5002, `python -m uvicorn main:app --app-dir ${join(paths.root, "sites", "exp.arolariu.ro")}`],
  ] as const)("recognizes the repository host process for port %s", async (port, processName) => {
    const harness = createHarness({
      ports: requiredLocalPorts.map((candidate) =>
        candidate === port ? {port, available: false, pid: 4100 + port, processName} : {port: candidate, available: true},
      ),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
    expect(result.nextActions).toContain("npm run dev:selfhost:stop -- --engine rancher");
    expect(result.nextActions.join("\n")).toContain("Stop the owning foreground Aspire/npm process directly.");
  });

  it.each([
    [3000, "node C:\\tools\\next\\dist\\bin\\next dev"],
    [3002, "node C:\\tools\\nx\\bin\\nx serve status"],
    [4173, "node C:\\tools\\vite\\bin\\vite"],
    [5000, "dotnet C:\\tools\\AppHost.dll"],
    [5000, "dotnet C:\\tools\\api.dll"],
    [5002, "python -m uvicorn main:app"],
    [5002, "python C:\\tools\\exp\\main.py"],
  ] as const)("uses bounded repository process markers for port %s: %s", async (port, processName) => {
    const harness = createHarness({
      ports: requiredLocalPorts.map((candidate) =>
        candidate === port ? {port, available: false, pid: 5100 + port, processName} : {port: candidate, available: true},
      ),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
  });

  it.each([
    [3000, "node C:\\unrelated\\nextcloud\\server.js"],
    [5000, "dotnet C:\\unrelated\\capital.dll"],
    [5002, "python C:\\unrelated\\express\\main.py"],
  ] as const)("does not classify incidental process substrings for port %s: %s", async (port, processName) => {
    const harness = createHarness({
      ports: requiredLocalPorts.map((candidate) =>
        candidate === port ? {port, available: false, pid: 6100 + port, processName} : {port: candidate, available: true},
      ),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).not.toContain("occupied by repository");
  });

  it.each([
    ["a sibling-prefix path on Windows", "win32", paths.root, `redis-server "${paths.root}-copy\\redis.conf"`],
    ["a case-distinct path on POSIX", "linux", "/work/arolariu.ro", 'redis-server "/work/AROLARIU.RO/redis.conf"'],
  ] as const)("does not classify %s as the repository root", async (_case, platform, root, processName) => {
    const harness = createHarness({
      platform,
      root,
      ports: requiredLocalPorts.map((port) =>
        port === 6379 ? {port, available: false, pid: 7_379, processName} : {port, available: true},
      ),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).not.toContain("occupied by repository");
  });

  it.each([
    ["mssql", "0.0.0.0:8082->1433/tcp"],
    ["dcp-mssql-74f9", "0.0.0.0:8082->1433/tcp"],
    ["aspire-website-a12c", "0.0.0.0:3000->3000/tcp"],
  ] as const)("attributes a known repository container %s", async (name, publishedPorts) => {
    const runner: CommandRunner = {
      run: async (command) =>
        commandKey(command) === "docker ps --format {{.Names}}\t{{.Ports}}"
          ? commandResult({stdout: `${name}\t${publishedPorts}\n`})
          : successfulRuntimeResponse(command),
    };
    const occupiedPort = publishedPorts.includes("8082") ? 8082 : 3000;
    const harness = createHarness({
      runner,
      ports: requiredLocalPorts.map((port) =>
        port === occupiedPort ? {port, available: false, pid: 991, processName: "container proxy"} : {port, available: true},
      ),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
    expect(result.evidence.join("\n")).toContain(`repository container '${name}'`);
  });

  it("does not attribute an arbitrary container that publishes a required port", async () => {
    const runner: CommandRunner = {
      run: async (command) =>
        commandKey(command) === "docker ps --format {{.Names}}\t{{.Ports}}"
          ? commandResult({stdout: "personal-postgres\t0.0.0.0:3000->5432/tcp\n"})
          : successfulRuntimeResponse(command),
    };
    const harness = createHarness({
      runner,
      ports: requiredLocalPorts.map((port) =>
        port === 3000 ? {port, available: false, pid: 911, processName: "container proxy"} : {port, available: true},
      ),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).not.toContain("repository container");
  });

  it.each(["aspire-capital", "myaspire-website", "dcpanel-website"] as const)(
    "does not attribute container name near-miss %s",
    async (name) => {
      const runner: CommandRunner = {
        run: async (command) =>
          commandKey(command) === "docker ps --format {{.Names}}\t{{.Ports}}"
            ? commandResult({stdout: `${name}\t0.0.0.0:3000->3000/tcp\n`})
            : successfulRuntimeResponse(command),
      };
      const harness = createHarness({
        runner,
        ports: requiredLocalPorts.map((port) =>
          port === 3000 ? {port, available: false, pid: 921, processName: "container proxy"} : {port, available: true},
        ),
        config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
      });

      const result = await harness.phase.run(harness.context);

      expect(result.status).toBe("failed");
      expect(result.evidence.join("\n")).not.toContain("repository container");
    },
  );

  it("blocks ownership lookup errors distinctly from identified occupied listeners", async () => {
    const harness = createHarness({
      ports: requiredLocalPorts.map((port) =>
        port === 5000 ? {port, available: false, error: "Listener lookup failed: lsof exited with code 1."} : {port, available: true},
      ),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("Port 5000 inspection failed: Listener lookup failed: lsof exited with code 1.");
    expect(result.evidence.join("\n")).not.toContain("occupied by an unknown process");
  });
});

describe("required runtime files", () => {
  it("reports every required tracked runtime file as a regular file", async () => {
    const inspected: string[] = [];
    const harness = createHarness({
      inspectFile: async (path) => {
        inspected.push(path);
        return "file";
      },
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(inspected).toEqual([...requiredFiles, certificatePath, certificateKeyPath]);
    for (const path of requiredFiles) {
      expect(result.evidence).toContain(`Required runtime file is present: ${path}`);
    }
  });

  it.each(["missing", "other"] as const)("blocks a %s tracked runtime file", async (kind) => {
    const target = requiredFiles[2];
    const harness = createHarness({
      inspectFile: async (path) => (path === target ? kind : "file"),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain(target);
    expect(result.evidence.join("\n")).toContain(kind === "missing" ? "is missing" : "is not a regular file");
  });

  it("structures a tracked-file inspection failure", async () => {
    const target = requiredFiles[4];
    const harness = createHarness({
      inspectFile: async (path) => {
        if (path === target) {
          throw new Error("EACCES simulated");
        }
        return "file";
      },
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain(`Unable to inspect required runtime file ${target}: EACCES simulated`);
  });
});

describe("optional selfhost certificates", () => {
  it("treats existing regular certificate files as idempotently satisfied", async () => {
    const harness = createHarness({
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(result.evidence).toContain("Optional selfhost certificate and key are present.");
    expect(harness.run.mock.calls.map(([command]) => commandKey(command))).not.toContain("mkcert --version");
    expect(harness.actionRecords.map(({id}) => id)).not.toContain("infrastructure.certificates.generate");
  });

  it.each([
    ["win32", "winget", ["install", "--id", "FiloSottile.mkcert", "--exact", "--accept-package-agreements", "--accept-source-agreements"]],
    ["darwin", "brew", ["install", "mkcert"]],
    ["linux", "sudo", ["apt-get", "install", "-y", "mkcert", "libnss3-tools"]],
  ] as const)("uses the reviewed mkcert installer on %s", async (platform, commandName, args) => {
    let mkcertProbes = 0;
    const runner: CommandRunner = {
      run: async (command) => {
        const key = commandKey(command);
        if (key === "mkcert --version") {
          mkcertProbes++;
          return mkcertProbes === 1 ? commandResult({code: 1, spawnError: "ENOENT"}) : commandResult({stdout: "v1.4.4"});
        }
        if (/^(?:winget|brew|apt-get|dnf) --version$/u.test(key)) {
          return commandResult({stdout: "available"});
        }
        return successfulRuntimeResponse(command);
      },
    };
    let generated = false;
    const harness = createHarness({
      platform,
      runner,
      inspectFile: async (path) => (path === certificatePath || path === certificateKeyPath ? (generated ? "file" : "missing") : "file"),
      createDirectory: async () => {
        generated = true;
      },
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    const install = harness.actionRecords.find(({id}) => id === "infrastructure.mkcert.install");
    expect(install).toMatchObject({scope: "system"});
    expect(harness.run.mock.calls).toContainEqual([{command: commandName, args: [...args]}, expect.objectContaining({output: "inherit"})]);
  });

  it("returns degraded manual guidance when mkcert cannot be installed safely", async () => {
    const runner: CommandRunner = {
      run: async (command) =>
        commandKey(command) === "mkcert --version" ? commandResult({code: 1, spawnError: "ENOENT"}) : successfulRuntimeResponse(command),
    };
    const harness = createHarness({
      platform: "freebsd",
      runner,
      inspectFile: async (path) => (path === certificatePath || path === certificateKeyPath ? "missing" : "file"),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
    expect(result.nextActions.join("\n")).toContain("https://github.com/FiloSottile/mkcert#installation");
    expect(harness.actionRecords).toHaveLength(0);
  });

  it("does not trust or generate when mkcert installation is declined", async () => {
    const runner: CommandRunner = {
      run: async (command) => {
        const key = commandKey(command);
        if (key === "mkcert --version") {
          return commandResult({code: 1, spawnError: "ENOENT"});
        }
        return key === "winget --version" ? commandResult({stdout: "v1.10"}) : successfulRuntimeResponse(command);
      },
    };
    const harness = createHarness({
      runner,
      dispositions: {"infrastructure.mkcert.install": "declined"},
      inspectFile: async (path) => (path === certificatePath || path === certificateKeyPath ? "missing" : "file"),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
    expect(harness.actionRecords.map(({id}) => id)).toEqual(["infrastructure.mkcert.install"]);
    expect(result.nextActions).toEqual([
      "Allow action 'infrastructure.mkcert.install' or install mkcert manually from https://github.com/FiloSottile/mkcert#installation, then rerun setup.",
    ]);
  });

  it("plans the complete mkcert dependency chain without executing commands or creating a directory", async () => {
    const runner: CommandRunner = {
      run: async (command) => {
        const key = commandKey(command);
        if (key === "mkcert --version") {
          return commandResult({code: 1, spawnError: "ENOENT"});
        }
        return key === "winget --version" ? commandResult({stdout: "v1.10"}) : successfulRuntimeResponse(command);
      },
    };
    const createDirectory = vi.fn(async () => undefined);
    const harness = createHarness({
      options: setupOptions({dryRun: true}),
      runner,
      dispositions: {
        "infrastructure.mkcert.install": "planned",
        "infrastructure.mkcert.trust": "planned",
        "infrastructure.certificates.generate": "planned",
      },
      inspectFile: async (path) => (path === certificatePath || path === certificateKeyPath ? "missing" : "file"),
      createDirectory,
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(harness.actionRecords.map(({id}) => id)).toEqual([
      "infrastructure.mkcert.install",
      "infrastructure.mkcert.trust",
      "infrastructure.certificates.generate",
    ]);
    expect(createDirectory).not.toHaveBeenCalled();
    expect(harness.run.mock.calls.map(([command]) => commandKey(command))).not.toContain("mkcert -install");
  });

  it("runs trust as a system action and generation as a user action with the exact paths", async () => {
    let generated = false;
    const createdDirectories: string[] = [];
    const harness = createHarness({
      inspectFile: async (path) => (path === certificatePath || path === certificateKeyPath ? (generated ? "file" : "missing") : "file"),
      createDirectory: async (path) => {
        createdDirectories.push(path);
        generated = true;
      },
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionRecords).toContainEqual(expect.objectContaining({id: "infrastructure.mkcert.trust", scope: "system"}));
    expect(harness.actionRecords).toContainEqual(expect.objectContaining({id: "infrastructure.certificates.generate", scope: "user"}));
    expect(createdDirectories).toEqual([dirname(certificatePath)]);
    expect(harness.run.mock.calls).toContainEqual([
      {
        command: "mkcert",
        args: ["-key-file", certificateKeyPath, "-cert-file", certificatePath, "localhost", "*.localhost"],
      },
      expect.objectContaining({output: "inherit"}),
    ]);
  });

  it("degrades when trust is declined and never invokes generation", async () => {
    const harness = createHarness({
      dispositions: {"infrastructure.mkcert.trust": "declined"},
      inspectFile: async (path) => (path === certificatePath || path === certificateKeyPath ? "missing" : "file"),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
    expect(harness.actionRecords.map(({id}) => id)).toEqual(["infrastructure.mkcert.trust"]);
    expect(result.nextActions).toEqual(["Allow action 'infrastructure.mkcert.trust', then rerun setup."]);
    expect(result.nextActions.join("\n")).not.toContain("mkcert#installation");
  });

  it("uses generation-specific guidance when certificate generation is declined", async () => {
    const harness = createHarness({
      dispositions: {"infrastructure.certificates.generate": "declined"},
      inspectFile: async (path) => (path === certificatePath || path === certificateKeyPath ? "missing" : "file"),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
    expect(harness.actionRecords.map(({id}) => id)).toEqual(["infrastructure.mkcert.trust", "infrastructure.certificates.generate"]);
    expect(result.nextActions).toEqual(["Allow action 'infrastructure.certificates.generate', then rerun setup."]);
    expect(result.nextActions.join("\n")).not.toContain("mkcert#installation");
  });

  it("degrades when either generated certificate postcondition is not a regular file", async () => {
    let generationAttempted = false;
    const harness = createHarness({
      inspectFile: async (path) => {
        if (path === certificatePath) {
          return generationAttempted ? "file" : "missing";
        }
        if (path === certificateKeyPath) {
          return "missing";
        }
        return "file";
      },
      createDirectory: async () => {
        generationAttempted = true;
      },
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
    expect(result.evidence.join("\n")).toContain("certificate generation postcondition failed");
    expect(result.nextActions).toEqual(["Resolve the reported certificate generation failure, then rerun setup."]);
    expect(result.nextActions.join("\n")).not.toContain("mkcert#installation");
  });

  it("structures an ordinary certificate generation failure as degraded", async () => {
    const runner: CommandRunner = {
      run: async (command) =>
        commandKey(command).startsWith("mkcert -key-file")
          ? commandResult({code: 1, stderr: "generation denied"})
          : successfulRuntimeResponse(command),
    };
    const harness = createHarness({
      runner,
      inspectFile: async (path) => (path === certificatePath || path === certificateKeyPath ? "missing" : "file"),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
    expect(result.evidence.join("\n")).toContain("generation denied");
    expect(result.nextActions).toEqual(["Resolve the reported certificate preparation failure, then rerun setup."]);
    expect(result.nextActions.join("\n")).not.toContain("mkcert#installation");
  });

  it("degrades an invalid certificate path kind without attempting replacement", async () => {
    const harness = createHarness({
      inspectFile: async (path) => (path === certificatePath ? "other" : "file"),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
    expect(result.evidence).toContain(`Optional selfhost certificate paths have invalid kinds: ${certificatePath} (other).`);
    expect(result.nextActions).toEqual([`Replace or remove the invalid optional certificate path ${certificatePath}, then rerun setup.`]);
    expect(result.nextActions.join("\n")).not.toContain("mkcert#installation");
    expect(harness.actionRecords).toHaveLength(0);
  });

  it("identifies every invalid certificate path with its exact inspected kind", async () => {
    const harness = createHarness({
      inspectFile: async (path) => {
        if (path === certificatePath) {
          return "directory";
        }
        return path === certificateKeyPath ? "other" : "file";
      },
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
    expect(result.evidence).toContain(
      `Optional selfhost certificate paths have invalid kinds: ${certificatePath} (directory), ${certificateKeyPath} (other).`,
    );
    expect(result.nextActions).toEqual([
      `Replace or remove the invalid optional certificate paths ${certificatePath}, ${certificateKeyPath}, then rerun setup.`,
    ]);
    expect(harness.actionRecords).toHaveLength(0);
  });

  it("uses access guidance for an optional certificate inspection error", async () => {
    const harness = createHarness({
      inspectFile: async (path) => {
        if (path === certificatePath) {
          throw new Error("EACCES simulated");
        }
        return "file";
      },
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
    expect(result.evidence).toContain(`Unable to inspect optional selfhost certificate path ${certificatePath}: EACCES simulated`);
    expect(result.nextActions).toEqual(["Check access and permissions for the optional certificate and key paths, then rerun setup."]);
    expect(result.nextActions.join("\n")).not.toContain("mkcert#installation");
  });

  it("uses the dnf mkcert proposal when apt is unavailable", async () => {
    let generated = false;
    let mkcertProbes = 0;
    const runner: CommandRunner = {
      run: async (command) => {
        const key = commandKey(command);
        if (key === "mkcert --version") {
          mkcertProbes++;
          return mkcertProbes === 1 ? commandResult({code: 1, spawnError: "ENOENT"}) : commandResult({stdout: "v1.4.4"});
        }
        if (key === "apt-get --version") {
          return commandResult({code: 1, spawnError: "ENOENT"});
        }
        if (key === "dnf --version") {
          return commandResult({stdout: "dnf 4"});
        }
        return successfulRuntimeResponse(command);
      },
    };
    const harness = createHarness({
      platform: "linux",
      runner,
      inspectFile: async (path) => (path === certificatePath || path === certificateKeyPath ? (generated ? "file" : "missing") : "file"),
      createDirectory: async () => {
        generated = true;
      },
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    await harness.phase.run(harness.context);

    expect(harness.run.mock.calls).toContainEqual([
      {command: "sudo", args: ["dnf", "install", "-y", "mkcert", "nss-tools"]},
      expect.objectContaining({output: "inherit"}),
    ]);
  });
});

describe("failure, precedence, and safety", () => {
  it("gathers independent port, file, and certificate evidence before returning a runtime blocker", async () => {
    const inspectedFiles: string[] = [];
    const runner: CommandRunner = {
      run: async (command) =>
        commandKey(command) === "docker version" ? commandResult({stdout: "Docker Desktop 4.50.0"}) : successfulRuntimeResponse(command),
    };
    const harness = createHarness({
      runner,
      inspectFile: async (path) => {
        inspectedFiles.push(path);
        return "file";
      },
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(harness.inspectedPorts).toEqual([[...requiredLocalPorts]]);
    expect(inspectedFiles).toEqual([...requiredFiles, certificatePath, certificateKeyPath]);
    expect(result.evidence).toContain("Optional selfhost certificate and key are present.");
  });

  it("executes no mutation or lifecycle/build/test command during dry-run", async () => {
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
      inspectFile: async (path) => (path === certificatePath || path === certificateKeyPath ? "missing" : "file"),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);
    const commands = harness.run.mock.calls.map(([command]) => commandKey(command));

    expect(result.status).toBe("skipped");
    expect(executed).toEqual(["planned:infrastructure.mkcert.trust", "planned:infrastructure.certificates.generate"]);
    expect(commands).not.toContain("mkcert -install");
    expect(commands.some((command) => /\b(?:start|stop|down|up|build|test|run)\b/u.test(command))).toBe(false);
  });

  it("gives required port blockers precedence over a planned persistence action", async () => {
    const harness = createHarness({
      options: setupOptions({engine: "podman", dryRun: true}),
      dispositions: {"infrastructure.engine.persist": "planned"},
      ports: requiredLocalPorts.map((port) =>
        port === 3000 ? {port, available: false, pid: 7, processName: "unrelated listener"} : {port, available: true},
      ),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
  });

  it("gives planned certificate actions precedence over repository-owned degraded ports", async () => {
    const harness = createHarness({
      options: setupOptions({dryRun: true}),
      dispositions: {
        "infrastructure.mkcert.trust": "planned",
        "infrastructure.certificates.generate": "planned",
      },
      ports: requiredLocalPorts.map((port) =>
        port === 3000
          ? {
              port,
              available: false,
              pid: 81,
              processName: `node ${join(paths.root, "node_modules", "next", "dist", "bin", "next")} dev`,
            }
          : {port, available: true},
      ),
      inspectFile: async (path) => (path === certificatePath || path === certificateKeyPath ? "missing" : "file"),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
  });

  it("structures ordinary runner and port-boundary failures", async () => {
    const runnerFailure = createHarness({
      runner: {run: async () => Promise.reject(new Error("runner exploded"))},
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });
    const portFailure = createHarness({
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });
    const phaseWithPortFailure = createInfrastructureSetupPhase({
      platform: "win32",
      environment: {},
      interactive: true,
      readConfig: async () => ({status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}}),
      writeConfig: async () => undefined,
      inspectPorts: async () => Promise.reject(new Error("port boundary exploded")),
      inspectFile: async () => "file",
      createDirectory: async () => undefined,
    });

    const [runnerResult, portResult] = await Promise.all([
      runnerFailure.phase.run(runnerFailure.context),
      phaseWithPortFailure.run(portFailure.context),
    ]);

    expect(runnerResult).toMatchObject({status: "failed", evidence: expect.arrayContaining([expect.stringContaining("runner exploded")])});
    expect(portResult).toMatchObject({status: "failed", evidence: ["port boundary exploded"]});
  });

  it.each(["runner", "ports", "files", "directory"] as const)("rethrows AbortError from the %s boundary", async (boundary) => {
    const interruption = Object.assign(new Error(`interrupted ${boundary}`), {name: "AbortError"});
    let generated = false;
    const harness = createHarness({
      runner: boundary === "runner" ? {run: async () => Promise.reject(interruption)} : undefined,
      ports: boundary === "ports" ? undefined : requiredLocalPorts.map((port) => ({port, available: true})),
      inspectFile:
        boundary === "files"
          ? async () => Promise.reject(interruption)
          : async (path) => (path === certificatePath || path === certificateKeyPath ? (generated ? "file" : "missing") : "file"),
      createDirectory: async () => {
        if (boundary === "directory") {
          throw interruption;
        }
        generated = true;
      },
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });
    const phase =
      boundary === "ports"
        ? createInfrastructureSetupPhase({
            platform: "win32",
            environment: {},
            interactive: true,
            readConfig: async () => ({status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}}),
            writeConfig: async () => undefined,
            inspectPorts: async () => Promise.reject(interruption),
            inspectFile: async () => "file",
            createDirectory: async () => undefined,
          })
        : harness.phase;

    await expect(phase.run(harness.context)).rejects.toBe(interruption);
  });

  it("never reads or forwards MSSQL_SA_PASSWORD", async () => {
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
    const serializedCommands = JSON.stringify(harness.run.mock.calls.map(([command, options]) => ({command, options})));

    expect(result.status).toBe("succeeded");
    expect(serializedCommands).not.toContain("MSSQL_SA_PASSWORD");
  });

  it("removes the parent MSSQL_SA_PASSWORD from every phase child environment", async () => {
    const key = "MSSQL_SA_PASSWORD";
    const hadPreviousValue = Object.hasOwn(process.env, key);
    const previousValue = process.env[key];
    process.env[key] = "phase-parent-sentinel";
    const childEnvironmentStates: string[] = [];
    const commandEnvironments: Array<Readonly<NodeJS.ProcessEnv> | undefined> = [];
    let podmanProbes = 0;
    let mkcertProbes = 0;
    let generated = false;
    const runner: CommandRunner = {
      run: async (command, options) => {
        commandEnvironments.push(options?.env);
        const verification = await defaultCommandRunner.run(
          {
            command: process.execPath,
            args: ["-e", `process.stdout.write(Object.hasOwn(process.env, ${JSON.stringify(key)}) ? "present" : "absent")`],
          },
          options?.env === undefined ? {} : {env: options.env},
        );
        childEnvironmentStates.push(verification.stdout);

        const commandText = commandKey(command);
        if (commandText === "podman --version") {
          podmanProbes++;
          return podmanProbes === 1 ? commandResult({code: 1, spawnError: "ENOENT"}) : commandResult({stdout: "podman version 5.8.2"});
        }
        if (commandText === "mkcert --version") {
          mkcertProbes++;
          return mkcertProbes === 1 ? commandResult({code: 1, spawnError: "ENOENT"}) : commandResult({stdout: "mkcert v1.4.4"});
        }
        if (commandText === "podman compose version") {
          return commandResult({stdout: "podman-compose version 1.5.0"});
        }
        if (commandText === "podman info --format json") {
          return commandResult({stdout: "{}"});
        }
        if (commandText === "winget --version") {
          return commandResult({stdout: "v1.10"});
        }
        return commandResult();
      },
    };
    const harness = createHarness({
      options: setupOptions({engine: "podman"}),
      runner,
      inspectFile: async (path) => (path === certificatePath || path === certificateKeyPath ? (generated ? "file" : "missing") : "file"),
      createDirectory: async () => {
        generated = true;
      },
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "podman"}},
    });

    try {
      const result = await harness.phase.run(harness.context);
      const commands = harness.run.mock.calls.map(([command]) => commandKey(command));

      expect(result.status).toBe("succeeded");
      expect(commands).toEqual(
        expect.arrayContaining([
          "docker version",
          "podman --version",
          "podman compose version",
          "podman info --format json",
          "podman ps --format {{.Names}}\t{{.Ports}}",
          "winget --version",
          "winget install --id RedHat.Podman-Desktop --exact --accept-package-agreements --accept-source-agreements",
          "mkcert --version",
          "winget install --id FiloSottile.mkcert --exact --accept-package-agreements --accept-source-agreements",
          "mkcert -install",
          `mkcert -key-file ${certificateKeyPath} -cert-file ${certificatePath} localhost *.localhost`,
        ]),
      );
      expect(childEnvironmentStates).not.toHaveLength(0);
      expect(childEnvironmentStates).toEqual(commandEnvironments.map(() => "absent"));
      for (const environment of commandEnvironments) {
        expect(environment).toHaveProperty(key, undefined);
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
