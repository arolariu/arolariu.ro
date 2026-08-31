// @vitest-environment node
/**
 * @fileoverview Contract tests for the opaque inspection probe registry.
 * @module scripts/inspection/probes.test
 */

import {describe, expect, it, vi, type Mock} from "vitest";

import type {CommandResult, CommandRunner, CommandSpec} from "../common/process.ts";
import {createInspectionProbeRunner, probes, type InspectionProbe, type InspectionProbeRunOptions} from "./probes.ts";

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

function createFakeCommandRunner(): {runner: CommandRunner; run: Mock<CommandRunner["run"]>} {
  const run = vi.fn<CommandRunner["run"]>(async () => commandResult());
  return {runner: {run}, run};
}

describe("createInspectionProbeRunner", () => {
  it("rejects a forged probe object", async () => {
    const {runner} = createFakeCommandRunner();
    const forged = {id: "workspace.git.version"} as unknown as InspectionProbe;

    await expect(createInspectionProbeRunner(runner).run(forged)).rejects.toThrow(/unregistered inspection probe/iu);
  });

  it("rejects a plain object with a matching id but no registration", async () => {
    const {runner} = createFakeCommandRunner();
    const real = probes.workspace.gitVersion();
    const plainClone = {id: real.id} as unknown as InspectionProbe;

    await expect(createInspectionProbeRunner(runner).run(plainClone)).rejects.toThrow(/unregistered inspection probe/iu);
  });

  it("rejects a shallow-cloned probe object even though its own properties match", async () => {
    const {runner} = createFakeCommandRunner();
    const real = probes.workspace.gitVersion();
    const cloned = {...real} as unknown as InspectionProbe;

    await expect(createInspectionProbeRunner(runner).run(cloned)).rejects.toThrow(/unregistered inspection probe/iu);
  });

  it("maps the git version probe to one exact command", async () => {
    const {runner, run} = createFakeCommandRunner();

    await createInspectionProbeRunner(runner).run(probes.workspace.gitVersion());

    expect(run).toHaveBeenCalledWith({command: "git", args: ["--version"]}, expect.objectContaining({output: "capture"}));
  });

  it("always forces captured output even if a caller casts extra options through the public type", async () => {
    const {runner, run} = createFakeCommandRunner();
    const sneaky = {output: "inherit"} as unknown as Readonly<InspectionProbeRunOptions>;

    await createInspectionProbeRunner(runner).run(probes.workspace.gitVersion(), sneaky);

    expect(run).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({output: "capture"}));
  });

  it("applies the 15 second default timeout when no override is supplied", async () => {
    const {runner, run} = createFakeCommandRunner();

    await createInspectionProbeRunner(runner).run(probes.workspace.gitVersion());

    expect(run).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({timeoutMs: 15_000}));
  });

  it("applies a caller-supplied shorter timeout override", async () => {
    const {runner, run} = createFakeCommandRunner();

    await createInspectionProbeRunner(runner).run(probes.workspace.gitVersion(), {timeoutMs: 500});

    expect(run).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({timeoutMs: 500}));
  });

  it("applies a caller-supplied longer timeout override", async () => {
    const {runner, run} = createFakeCommandRunner();

    await createInspectionProbeRunner(runner).run(probes.workspace.gitVersion(), {timeoutMs: 60_000});

    expect(run).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({timeoutMs: 60_000}));
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects an invalid timeout override of %s",
    async (timeoutMs) => {
      const {runner} = createFakeCommandRunner();

      await expect(createInspectionProbeRunner(runner).run(probes.workspace.gitVersion(), {timeoutMs})).rejects.toThrow(/timeout/iu);
    },
  );

  it("preserves cwd, env, and signal unchanged", async () => {
    const {runner, run} = createFakeCommandRunner();
    const controller = new AbortController();

    await createInspectionProbeRunner(runner).run(probes.workspace.gitVersion(), {
      cwd: "C:\\repo",
      env: {CUSTOM: "value"},
      signal: controller.signal,
    });

    expect(run).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({cwd: "C:\\repo", env: {CUSTOM: "value"}, signal: controller.signal}),
    );
  });

  it("omits cwd, env, and signal from the forwarded options when not supplied", async () => {
    const {runner, run} = createFakeCommandRunner();

    await createInspectionProbeRunner(runner).run(probes.workspace.gitVersion());

    const [, forwardedOptions] = run.mock.calls[0] ?? [];
    expect(forwardedOptions).not.toHaveProperty("cwd");
    expect(forwardedOptions).not.toHaveProperty("env");
    expect(forwardedOptions).not.toHaveProperty("signal");
  });

  it("preserves the exact CommandResult returned by the shared runner", async () => {
    const result = commandResult({code: 2, stdout: "out", stderr: "err", durationMs: 42, timedOut: true, signal: "SIGTERM"});
    const run = vi.fn<CommandRunner["run"]>(async () => result);

    const outcome = await createInspectionProbeRunner({run}).run(probes.workspace.gitVersion());

    expect(outcome).toBe(result);
  });
});

interface FixedProbeCase {
  readonly name: string;
  readonly factory: () => InspectionProbe;
  readonly command: CommandSpec;
}

const fixedProbeCases: readonly FixedProbeCase[] = [
  {name: "workspace.nodeVersion", factory: probes.workspace.nodeVersion, command: {command: "node", args: ["--version"]}},
  {name: "workspace.npmVersion", factory: probes.workspace.npmVersion, command: {command: "npm", args: ["--version"]}},
  {name: "workspace.npmTree", factory: probes.workspace.npmTree, command: {command: "npm", args: ["ls", "--all", "--json"]}},
  {name: "workspace.npmCache", factory: probes.workspace.npmCache, command: {command: "npm", args: ["config", "get", "cache"]}},
  {name: "workspace.npmAudit", factory: probes.workspace.npmAudit, command: {command: "npm", args: ["audit", "--json"]}},
  {name: "workspace.npmOutdated", factory: probes.workspace.npmOutdated, command: {command: "npm", args: ["outdated", "--json"]}},
  {name: "workspace.gitVersion", factory: probes.workspace.gitVersion, command: {command: "git", args: ["--version"]}},
  {
    name: "workspace.gitStatus",
    factory: probes.workspace.gitStatus,
    command: {command: "git", args: ["status", "--short", "--branch"]},
  },
  {
    name: "workspace.gitLastCommit",
    factory: probes.workspace.gitLastCommit,
    command: {command: "git", args: ["log", "--oneline", "-1", "HEAD"]},
  },
  {name: "dotnet.version", factory: probes.dotnet.version, command: {command: "dotnet", args: ["--version"]}},
  {name: "dotnet.sdkList", factory: probes.dotnet.sdkList, command: {command: "dotnet", args: ["--list-sdks"]}},
  {name: "dotnet.info", factory: probes.dotnet.info, command: {command: "dotnet", args: ["--info"]}},
  {name: "dotnet.workloads", factory: probes.dotnet.workloads, command: {command: "dotnet", args: ["workload", "list"]}},
  {
    name: "dotnet.nugetLocals",
    factory: probes.dotnet.nugetLocals,
    command: {command: "dotnet", args: ["nuget", "locals", "global-packages", "--list"]},
  },
  {name: "dotnet.localTools", factory: probes.dotnet.localTools, command: {command: "dotnet", args: ["tool", "list", "--local"]}},
  {name: "frontend.packageTree", factory: probes.frontend.packageTree, command: {command: "npm", args: ["ls", "--json"]}},
  {
    name: "frontend.playwrightInventory",
    factory: probes.frontend.playwrightInventory,
    command: {command: "npx", args: ["--no-install", "playwright", "install", "--list"]},
  },
  {
    name: "infrastructure.mkcertVersion",
    factory: probes.infrastructure.mkcertVersion,
    command: {command: "mkcert", args: ["--version"]},
  },
  {
    name: "infrastructure.mkcertCaRoot",
    factory: probes.infrastructure.mkcertCaRoot,
    command: {command: "mkcert", args: ["-CAROOT"]},
  },
];

describe.each(fixedProbeCases)("probes.$name", ({factory, command}) => {
  it("maps to its exact allowlisted command", async () => {
    const {runner, run} = createFakeCommandRunner();

    await createInspectionProbeRunner(runner).run(factory());

    expect(run).toHaveBeenCalledWith(command, expect.objectContaining({output: "capture"}));
  });

  it("returns a distinct probe handle on every call", () => {
    expect(factory()).not.toBe(factory());
  });
});

describe("probes.dotnet.certificate", () => {
  it("defaults to the presence-check command when no mode is supplied", async () => {
    const {runner, run} = createFakeCommandRunner();

    await createInspectionProbeRunner(runner).run(probes.dotnet.certificate());

    expect(run).toHaveBeenCalledWith(
      {command: "dotnet", args: ["dev-certs", "https", "--check"]},
      expect.objectContaining({output: "capture"}),
    );
  });

  it("maps the explicit presence mode to the same plain check command", async () => {
    const {runner, run} = createFakeCommandRunner();

    await createInspectionProbeRunner(runner).run(probes.dotnet.certificate("presence"));

    expect(run).toHaveBeenCalledWith(
      {command: "dotnet", args: ["dev-certs", "https", "--check"]},
      expect.objectContaining({output: "capture"}),
    );
  });

  it("maps the trust mode to the check-and-trust command", async () => {
    const {runner, run} = createFakeCommandRunner();

    await createInspectionProbeRunner(runner).run(probes.dotnet.certificate("trust"));

    expect(run).toHaveBeenCalledWith(
      {command: "dotnet", args: ["dev-certs", "https", "--check", "--trust"]},
      expect.objectContaining({output: "capture"}),
    );
  });

  it("rejects an unsupported certificate mode", () => {
    expect(() => probes.dotnet.certificate("bogus" as never)).toThrow(/certificate mode/iu);
  });
});

describe("probes.workspace.executableResolution", () => {
  it("maps to the exact win32 resolver command", async () => {
    const {runner, run} = createFakeCommandRunner();

    await createInspectionProbeRunner(runner).run(probes.workspace.executableResolution("git.exe", "win32"));

    expect(run).toHaveBeenCalledWith({command: "where.exe", args: ["git.exe"]}, expect.objectContaining({output: "capture"}));
  });

  it("maps to the exact darwin resolver command", async () => {
    const {runner, run} = createFakeCommandRunner();

    await createInspectionProbeRunner(runner).run(probes.workspace.executableResolution("git", "darwin"));

    expect(run).toHaveBeenCalledWith({command: "which", args: ["git"]}, expect.objectContaining({output: "capture"}));
  });

  it("maps to the exact linux resolver command", async () => {
    const {runner, run} = createFakeCommandRunner();

    await createInspectionProbeRunner(runner).run(probes.workspace.executableResolution("git", "linux"));

    expect(run).toHaveBeenCalledWith({command: "which", args: ["git"]}, expect.objectContaining({output: "capture"}));
  });

  it("defaults to the current process platform when no override is supplied", async () => {
    const {runner, run} = createFakeCommandRunner();

    await createInspectionProbeRunner(runner).run(probes.workspace.executableResolution("git.exe"));

    const expected: CommandSpec =
      process.platform === "win32" ? {command: "where.exe", args: ["git.exe"]} : {command: "which", args: ["git.exe"]};
    expect(run).toHaveBeenCalledWith(expected, expect.objectContaining({output: "capture"}));
  });

  it("rejects an unsupported platform", () => {
    expect(() => probes.workspace.executableResolution("git", "aix")).toThrow(/platform/iu);
  });

  it.each(["", "git version", "git;rm -rf /", "../git", "git\u0007", "../../bin/git"])("rejects an invalid executable name %j", (name) => {
    expect(() => probes.workspace.executableResolution(name)).toThrow();
  });
});

describe("probes.dotnet.userSecrets", () => {
  it("maps to the exact user-secrets command for the supplied project path", async () => {
    const {runner, run} = createFakeCommandRunner();

    await createInspectionProbeRunner(runner).run(probes.dotnet.userSecrets("tooling/AppHost/AppHost.csproj"));

    expect(run).toHaveBeenCalledWith(
      {command: "dotnet", args: ["user-secrets", "list", "--json", "--project", "tooling/AppHost/AppHost.csproj"]},
      expect.objectContaining({output: "capture"}),
    );
  });

  it.each([
    "",
    "/tooling/AppHost/AppHost.csproj",
    "C:\\tooling\\AppHost\\AppHost.csproj",
    "tooling/../AppHost.csproj",
    "tooling/AppHost/AppHost.sln",
    "-x",
    "tooling/AppHost/App\u0007Host.csproj",
  ])("rejects an invalid project path %j", (projectPath) => {
    expect(() => probes.dotnet.userSecrets(projectPath)).toThrow();
  });

  it.each(["tooling/AppHost (v2)/AppHost.csproj", "src/$feature/App.csproj", "src/it's-fine/App.csproj", "src/(shared)/App.csproj"])(
    "accepts a legitimate project path containing safe special characters %j",
    (projectPath) => {
      expect(() => probes.dotnet.userSecrets(projectPath)).not.toThrow();
    },
  );
});

interface PythonProbeCase {
  readonly name: string;
  readonly factory: (pythonPath: string, selector?: string) => InspectionProbe;
  readonly args: readonly string[];
}

const pythonProbeCases: readonly PythonProbeCase[] = [
  {name: "python.version", factory: probes.python.version, args: ["--version"]},
  {
    name: "python.metadata",
    factory: probes.python.metadata,
    args: [
      "-c",
      "import json, platform, site, sys; print(json.dumps({'executable': sys.executable, 'version': platform.python_version(), 'prefix': sys.prefix, 'basePrefix': getattr(sys, 'base_prefix', sys.prefix), 'sitePackages': site.getsitepackages()}, separators=(',', ':')))",
    ],
  },
  {name: "python.pipVersion", factory: probes.python.pipVersion, args: ["-m", "pip", "--isolated", "--version"]},
  {
    name: "python.pipList",
    factory: probes.python.pipList,
    args: ["-m", "pip", "--isolated", "list", "--format", "json"],
  },
  {name: "python.pipCheck", factory: probes.python.pipCheck, args: ["-m", "pip", "--isolated", "check"]},
];

describe.each(pythonProbeCases)("probes.$name", ({factory, args}) => {
  it("maps to the exact command for the supplied interpreter path", async () => {
    const {runner, run} = createFakeCommandRunner();

    await createInspectionProbeRunner(runner).run(factory(".venv/bin/python"));

    expect(run).toHaveBeenCalledWith({command: ".venv/bin/python", args}, expect.objectContaining({output: "capture"}));
  });

  it.each(["", "-c", "python\u0000", "curl", "curl.exe", "../../evil", "../python", ".venv/bin/../python"])(
    "rejects an invalid interpreter path %j",
    (path) => {
      expect(() => factory(path)).toThrow();
    },
  );

  it.each(["C:\\Program Files (x86)\\Python312\\python.exe", "/opt/homebrew/opt/python's$env/bin/python3.12", "./My Apps (2024)/python"])(
    "accepts a legitimate interpreter path containing safe special characters %j",
    (path) => {
      expect(() => factory(path)).not.toThrow();
    },
  );

  it("prefixes a valid numeric selector before the argument tail for the py launcher", async () => {
    const {runner, run} = createFakeCommandRunner();

    await createInspectionProbeRunner(runner).run(factory("py", "-3.12"));

    expect(run).toHaveBeenCalledWith({command: "py", args: ["-3.12", ...args]}, expect.objectContaining({output: "capture"}));
  });

  it("accepts a selector for the case-insensitive py.exe launcher basename", async () => {
    const {runner, run} = createFakeCommandRunner();

    await createInspectionProbeRunner(runner).run(factory("C:\\Windows\\py.EXE", "-3"));

    expect(run).toHaveBeenCalledWith({command: "C:\\Windows\\py.EXE", args: ["-3", ...args]}, expect.objectContaining({output: "capture"}));
  });

  it("rejects a selector when the interpreter basename is not the py launcher", () => {
    expect(() => factory("python", "-3.12")).toThrow(/launcher/iu);
  });

  it.each(["3.12", "-x", "-3.12.1", "-3 12", "-3.", "-", ""])("rejects an invalid py launcher selector %j", (selector) => {
    expect(() => factory("py", selector)).toThrow();
  });
});

interface RuntimeProbeCase {
  readonly name: string;
  readonly factory: (runtime: string) => InspectionProbe;
  readonly rancherCommand: CommandSpec;
  readonly podmanCommand: CommandSpec;
}

const runtimeProbeCases: readonly RuntimeProbeCase[] = [
  {
    name: "infrastructure.runtimeVersion",
    factory: probes.infrastructure.runtimeVersion,
    rancherCommand: {command: "docker", args: ["--version"]},
    podmanCommand: {command: "podman", args: ["--version"]},
  },
  {
    name: "infrastructure.composeVersion",
    factory: probes.infrastructure.composeVersion,
    rancherCommand: {command: "docker", args: ["compose", "version"]},
    podmanCommand: {command: "podman", args: ["compose", "version"]},
  },
  {
    name: "infrastructure.runtimeContext",
    factory: probes.infrastructure.runtimeContext,
    rancherCommand: {command: "docker", args: ["context", "show"]},
    podmanCommand: {command: "podman", args: ["system", "connection", "list", "--format", "json"]},
  },
  {
    name: "infrastructure.containerList",
    factory: probes.infrastructure.containerList,
    rancherCommand: {command: "docker", args: ["ps", "-a", "--format", "{{json .}}"]},
    podmanCommand: {command: "podman", args: ["ps", "-a", "--format", "{{json .}}"]},
  },
  {
    name: "infrastructure.runtimeInfo",
    factory: probes.infrastructure.runtimeInfo,
    rancherCommand: {command: "docker", args: ["info"]},
    podmanCommand: {command: "podman", args: ["info", "--format", "json"]},
  },
];

describe.each(runtimeProbeCases)("probes.$name", ({factory, rancherCommand, podmanCommand}) => {
  it("maps the rancher runtime to its Docker-compatible CLI command", async () => {
    const {runner, run} = createFakeCommandRunner();

    await createInspectionProbeRunner(runner).run(factory("rancher"));

    expect(run).toHaveBeenCalledWith(rancherCommand, expect.objectContaining({output: "capture"}));
  });

  it("maps the podman runtime to its CLI command", async () => {
    const {runner, run} = createFakeCommandRunner();

    await createInspectionProbeRunner(runner).run(factory("podman"));

    expect(run).toHaveBeenCalledWith(podmanCommand, expect.objectContaining({output: "capture"}));
  });

  it.each(["docker", "", "rancher;rm -rf /", "Rancher", "podman "])("rejects an unsupported runtime name %j", (runtime) => {
    expect(() => factory(runtime)).toThrow();
  });
});

describe("probes.infrastructure.portOwners", () => {
  const WINDOWS_PORT_OWNER_SCRIPT =
    "& { $ports = @($args[0] -split ','); $(foreach ($port in $ports) { Get-NetTCPConnection -State Listen -LocalPort ([int]$port) -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, OwningProcess }) | ConvertTo-Json -Compress }";
  const MACOS_PORT_OWNER_SCRIPT = 'for port in "$@"; do lsof -nP -a -iTCP:"$port" -sTCP:LISTEN -Fpcn; done';
  const LINUX_PORT_OWNER_SCRIPT = 'for port in "$@"; do ss -ltnp "sport = :$port"; done';

  it("maps to the exact win32 port-owner probe command", async () => {
    const {runner, run} = createFakeCommandRunner();

    await createInspectionProbeRunner(runner).run(probes.infrastructure.portOwners([3000, 5432], "win32"));

    expect(run).toHaveBeenCalledWith(
      {command: "powershell", args: ["-NoProfile", "-NonInteractive", "-Command", WINDOWS_PORT_OWNER_SCRIPT, "3000,5432"]},
      expect.objectContaining({output: "capture"}),
    );
  });

  it("maps to the exact darwin port-owner probe command", async () => {
    const {runner, run} = createFakeCommandRunner();

    await createInspectionProbeRunner(runner).run(probes.infrastructure.portOwners([3000, 5432], "darwin"));

    expect(run).toHaveBeenCalledWith(
      {command: "sh", args: ["-c", MACOS_PORT_OWNER_SCRIPT, "--", "3000", "5432"]},
      expect.objectContaining({output: "capture"}),
    );
  });

  it("maps to the exact linux port-owner probe command", async () => {
    const {runner, run} = createFakeCommandRunner();

    await createInspectionProbeRunner(runner).run(probes.infrastructure.portOwners([3000, 5432], "linux"));

    expect(run).toHaveBeenCalledWith(
      {command: "sh", args: ["-c", LINUX_PORT_OWNER_SCRIPT, "--", "3000", "5432"]},
      expect.objectContaining({output: "capture"}),
    );
  });

  it("defaults to the current process platform when no override is supplied", async () => {
    const {runner, run} = createFakeCommandRunner();

    await createInspectionProbeRunner(runner).run(probes.infrastructure.portOwners([3000, 5432]));

    const [actualCommand] = run.mock.calls[0] ?? [];
    expect(actualCommand?.command).toBe(process.platform === "win32" ? "powershell" : "sh");
    expect(actualCommand?.args.join(" ")).toContain("3000");
    expect(actualCommand?.args.join(" ")).toContain("5432");
  });

  it("rejects an unsupported platform", () => {
    expect(() => probes.infrastructure.portOwners([3000], "aix")).toThrow(/platform/iu);
  });

  it("rejects an empty port list", () => {
    expect(() => probes.infrastructure.portOwners([])).toThrow();
  });

  it.each([0, -1, 65_536, 1.5, Number.NaN])("rejects an invalid TCP port %s", (port) => {
    expect(() => probes.infrastructure.portOwners([port])).toThrow();
  });
});
