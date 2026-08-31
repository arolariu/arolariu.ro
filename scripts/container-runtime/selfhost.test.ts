/**
 * @fileoverview Tests for engine-aware selfhost orchestration.
 * @module scripts/container-runtime/selfhost.test
 */

import {afterEach, describe, expect, it} from "vitest";
import {readFile} from "node:fs/promises";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "../common/logger.ts";
import type {CommandRunner, CommandRunOptions} from "../common/process.ts";
import {getContainerAdapter} from "./adapters.ts";
import {
  buildLocalStorageBootstrapCommand,
  buildSelfhostPlan,
  getRequiredSqlPassword,
  runSelfhost,
  runSelfhostEntrypoint,
  shouldGenerateTaxonomyArtifacts,
} from "./selfhost.ts";

const originalSqlPassword = process.env["MSSQL_SA_PASSWORD"];
const originalExitCode = process.exitCode;

const launcherCases = [
  {
    path: "../../infra/Local/selfhost-start.bat",
    action: "start",
    forwarding: "%*",
    shell: "batch",
  },
  {
    path: "../../infra/Local/selfhost-stop.bat",
    action: "stop",
    forwarding: "%*",
    shell: "batch",
  },
  {
    path: "../../infra/Local/selfhost-start.sh",
    action: "start",
    forwarding: '"$@"',
    shell: "bash",
  },
  {
    path: "../../infra/Local/selfhost-stop.sh",
    action: "stop",
    forwarding: '"$@"',
    shell: "bash",
  },
] as const;

afterEach(() => {
  if (originalSqlPassword === undefined) {
    delete process.env["MSSQL_SA_PASSWORD"];
  } else {
    process.env["MSSQL_SA_PASSWORD"] = originalSqlPassword;
  }
  process.exitCode = originalExitCode;
});

describe("supported selfhost launchers", () => {
  it.each(launcherCases)(
    "routes $path through the TypeScript entrypoint with argument and exit-code propagation",
    async ({path, action, forwarding, shell}) => {
      const source = await readFile(new URL(path, import.meta.url), "utf8");
      const command = `node scripts/container-runtime/selfhost.ts ${action} ${forwarding}`;

      expect(source).not.toContain("scripts/dev-selfhost.mjs");
      expect(source).toContain(command);

      if (shell === "batch") {
        expect(source).toContain('pushd "%~dp0..\\.."');
        expect(source).toMatch(
          /node scripts\/container-runtime\/selfhost\.ts (?:start|stop) %\*\r?\nset "EXIT_CODE=%ERRORLEVEL%"\r?\npopd\r?\nexit \/b %EXIT_CODE%/,
        );
      } else {
        expect(source).toContain("set -euo pipefail");
        expect(source).toContain('cd "$(dirname "$0")/../.."');
        expect(source.trimEnd().endsWith(command)).toBe(true);
      }
    },
  );
});

describe("buildSelfhostPlan", () => {
  it("builds a Rancher-only start plan", () => {
    const plan = buildSelfhostPlan({
      action: "start",
      adapter: getContainerAdapter("rancher"),
    });

    expect(plan.map((command) => command.command)).toEqual(["docker", "docker", "docker", "docker"]);
    expect(plan.map((command) => command.args.join(" "))).toEqual([
      "compose -f Management/docker-compose.yml up -d",
      "compose -f Storage/docker-compose.yml --profile selfhost up -d",
      "compose -f Backend/docker-compose.yml up -d",
      "compose -f Frontend/docker-compose.yml up -d",
    ]);
  });

  it("builds a Podman-only stop plan", () => {
    const plan = buildSelfhostPlan({
      action: "stop",
      adapter: getContainerAdapter("podman"),
    });

    expect(plan.map((command) => command.command)).toEqual(["podman", "podman", "podman", "podman"]);
    expect(plan.map((command) => command.args.join(" "))).toEqual([
      "compose -f Frontend/docker-compose.yml down",
      "compose -f Backend/docker-compose.yml down",
      "compose -f Storage/docker-compose.yml down",
      "compose -f Management/docker-compose.yml down",
    ]);
  });

  it("builds engine-owned logs commands", () => {
    const plan = buildSelfhostPlan({
      action: "logs",
      adapter: getContainerAdapter("podman"),
    });

    expect(plan.map((command) => [command.command, command.args.join(" ")])).toEqual([
      ["podman", "logs --tail 100 exp-arolariu-ro"],
      ["podman", "logs --tail 100 api-arolariu-ro"],
      ["podman", "logs --tail 100 website-arolariu-ro"],
    ]);
  });
});

describe("runSelfhost", () => {
  it("routes command output through the injected logger", async () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {
      color: false,
      sink,
    });
    const receivedOptions: Array<CommandRunOptions | undefined> = [];
    const runner: CommandRunner = {
      run: async (_command, options) => {
        receivedOptions.push(options);
        return {
          code: 0,
          stdout: "podman version 5.8.2\npodman-compose version 1.5.0",
          stderr: "",
          durationMs: 0,
          timedOut: false,
        };
      },
    };

    await runSelfhost("logs", {requestedEngine: "podman", runner, logger});

    expect(sink.records.some((record) => record.text.includes("$ podman logs --tail 100 exp-arolariu-ro"))).toBe(true);
    const teeOptions = receivedOptions.filter((options) => options?.output === "tee");
    expect(teeOptions.length).toBeGreaterThan(0);
    expect(teeOptions.every((options) => options?.logger !== undefined)).toBe(true);
  });

  it("resolves the engine from the explicit requestedEngine option only", async () => {
    const commands: string[] = [];
    const spyRunner: CommandRunner = {
      run: async (command) => {
        commands.push(command.command);
        return {
          code: 0,
          stdout: "podman version 5.8.2\npodman-compose version 1.5.0",
          stderr: "",
          durationMs: 0,
          timedOut: false,
        };
      },
    };

    await runSelfhost("logs", {requestedEngine: "podman", runner: spyRunner});

    // The selfhost plan's own logs commands (the final three calls) are
    // executed through podman, proving engine selection came from the
    // explicit requestedEngine option rather than any global process state.
    expect(commands.slice(-3)).toEqual(["podman", "podman", "podman"]);
  });
});

describe("runSelfhostEntrypoint", () => {
  it.each(["--help", "-h", "/h"])("routes %s through the injected logger without executing anything", async (helpFlag) => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});
    let executed = false;
    const runner: CommandRunner = {
      run: async () => {
        executed = true;
        return {code: 0, stdout: "", stderr: "", durationMs: 0, timedOut: false};
      },
    };

    await expect(runSelfhostEntrypoint([helpFlag], {runner, logger})).resolves.toBeUndefined();

    expect(executed).toBe(false);
    expect(process.exitCode).toBe(originalExitCode);
    expect(sink.records.some((record) => record.text.includes("Usage:"))).toBe(true);
  });

  it("routes an unknown option through the existing exitWithError boundary instead of an unhandled rejection", async () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});
    let executed = false;
    const runner: CommandRunner = {
      run: async () => {
        executed = true;
        return {code: 0, stdout: "", stderr: "", durationMs: 0, timedOut: false};
      },
    };

    await expect(runSelfhostEntrypoint(["--bogus"], {runner, logger})).resolves.toBeUndefined();

    expect(executed).toBe(false);
    expect(process.exitCode).toBe(1);
    expect(sink.records.some((record) => record.text.toLowerCase().includes("unknown option"))).toBe(true);
  });

  it("routes a missing --engine argument through the existing exitWithError boundary instead of an unhandled rejection", async () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});
    let executed = false;
    const runner: CommandRunner = {
      run: async () => {
        executed = true;
        return {code: 0, stdout: "", stderr: "", durationMs: 0, timedOut: false};
      },
    };

    await expect(runSelfhostEntrypoint(["start", "--engine"], {runner, logger})).resolves.toBeUndefined();

    expect(executed).toBe(false);
    expect(process.exitCode).toBe(1);
    expect(sink.records.some((record) => record.text.toLowerCase().includes("argument missing"))).toBe(true);
  });
});

describe("getRequiredSqlPassword", () => {
  it("reads the SQL password from the process environment", () => {
    process.env["MSSQL_SA_PASSWORD"] = "local-strong-password";

    expect(getRequiredSqlPassword()).toBe("local-strong-password");
  });

  describe("buildLocalStorageBootstrapCommand", () => {
    it("uses the shared .NET local storage provisioner", () => {
      expect(buildLocalStorageBootstrapCommand()).toEqual({
        command: "dotnet",
        args: ["run", "--project", "../../tooling/LocalDevelopment.Bootstrap", "--", "--ensure-storage-only"],
      });
    });
  });

  describe("shouldGenerateTaxonomyArtifacts", () => {
    it("generates artifacts before selfhost start", () => {
      expect(shouldGenerateTaxonomyArtifacts("start")).toBe(true);
    });

    it.each(["stop", "logs"] as const)("does not generate artifacts for %s", (action) => {
      expect(shouldGenerateTaxonomyArtifacts(action)).toBe(false);
    });
  });

  it("rejects a missing SQL password", () => {
    delete process.env["MSSQL_SA_PASSWORD"];

    expect(() => getRequiredSqlPassword()).toThrow("MSSQL_SA_PASSWORD environment variable is required");
  });
});
