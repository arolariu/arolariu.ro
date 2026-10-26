// @vitest-environment node
/**
 * @fileoverview Contract tests for the opaque inspection probe registry and its Effect runner.
 * @module scripts/inspection/probes.test
 *
 * @remarks
 * Every probe runs through `inspectionProbeRunner` over the harness's scripted `Process`, so each
 * case asserts the exact command and options the runner hands to `Process.run`.
 */

import {Cause, Duration, Effect, Exit} from "effect";
import {describe, expect, it} from "vitest";

import {ProcessExited, ProcessSignalled, ProcessSpawnFailed, ProcessTimedOut, type ProcessRequest} from "../platform/Process.ts";
import {effectTest, makeTestLayer, type RecordedProcessCall, type ScriptedProcess} from "../platform/testing.ts";
import {inspectionProbeRunner, probes, type InspectionProbe, type InspectionProbeRunOptions, type ProbeOutcome} from "./probes.ts";

/** Default scripted response: a successful run with empty output. */
const succeeded: ScriptedProcess["respond"] = {stdout: "", stderr: "", durationMs: 1};

/** Failure fields every scripted process error carries. */
const failure = {command: "git --version", stdout: "out", stderr: "err", durationMs: 42, message: "failed"} as const;

/**
 * Registers one effect test that runs a probe through `inspectionProbeRunner` over a fresh harness
 * whose `Process` answers every request with `respond`.
 *
 * @param name - The test name.
 * @param probe - Builds the probe to run.
 * @param assert - Receives the single recorded `Process.run` call and the probe outcome.
 * @param options - Probe run options.
 * @param respond - Scripted process response.
 */
function probeTest(
  name: string,
  probe: () => InspectionProbe,
  assert: (call: RecordedProcessCall, outcome: ProbeOutcome) => void,
  options?: InspectionProbeRunOptions,
  respond: ScriptedProcess["respond"] = succeeded,
): void {
  const harness = makeTestLayer({processes: [{match: () => true, respond}]});
  effectTest(
    name,
    () =>
      Effect.gen(function* () {
        // Act
        const outcome = yield* inspectionProbeRunner.run(probe(), options);

        // Assert
        const calls = harness.processCalls();
        expect(calls).toHaveLength(1);
        assert(calls[0] as RecordedProcessCall, outcome);
      }),
    harness.layer,
  );
}

/**
 * Registers one effect test asserting that running `probe` dies with a defect matching `pattern`
 * without starting a process.
 *
 * @param name - The test name.
 * @param probe - Builds the probe to run.
 * @param pattern - Expected defect message.
 * @param options - Probe run options.
 */
function probeDefectTest(name: string, probe: () => InspectionProbe, pattern: RegExp, options?: InspectionProbeRunOptions): void {
  const harness = makeTestLayer({processes: [{match: () => true, respond: succeeded}]});
  effectTest(
    name,
    () =>
      Effect.gen(function* () {
        // Act
        const exit = yield* Effect.exit(inspectionProbeRunner.run(probe(), options));

        // Assert
        expect(Exit.isFailure(exit) && Cause.hasDies(exit.cause)).toBe(true);
        expect(Exit.isFailure(exit) ? String(Cause.squash(exit.cause)) : "").toMatch(pattern);
        expect(harness.processCalls()).toEqual([]);
      }),
    harness.layer,
  );
}

/**
 * Reads the time limit a recorded call passed to `Process.run`.
 *
 * @param call - The recorded call.
 * @returns The timeout in milliseconds, or `undefined`.
 */
function timeoutMsOf(call: RecordedProcessCall): number | undefined {
  return call.options.timeout === undefined ? undefined : Duration.toMillis(call.options.timeout);
}

/**
 * Asserts that a recorded call ran exactly `command` with captured output.
 *
 * @param command - The expected request.
 * @returns The assertion for {@link probeTest}.
 */
function runsCommand(command: ProcessRequest): (call: RecordedProcessCall) => void {
  return (call) => {
    expect(call.request).toEqual(command);
    expect(call.options).toMatchObject({output: "capture"});
  };
}

describe("inspectionProbeRunner", () => {
  probeDefectTest(
    "dies on an unregistered probe",
    () => ({id: "workspace.git.version"}) as unknown as InspectionProbe,
    /unregistered inspection probe/iu,
  );

  probeDefectTest(
    "dies on a plain object with a matching id but no registration",
    () => ({id: probes.workspace.gitVersion().id}) as unknown as InspectionProbe,
    /unregistered inspection probe/iu,
  );

  probeDefectTest(
    "dies on a shallow-cloned probe object even though its own properties match",
    () => ({...probes.workspace.gitVersion()}) as unknown as InspectionProbe,
    /unregistered inspection probe/iu,
  );

  probeTest(
    "maps the git version probe to one exact command",
    probes.workspace.gitVersion,
    runsCommand({command: "git", args: ["--version"]}),
  );

  probeTest(
    "always forces captured output even if a caller casts extra options through the public type",
    probes.workspace.gitVersion,
    (call) => {
      expect(call.options.output).toBe("capture");
    },
    {output: "inherit"} as unknown as InspectionProbeRunOptions,
  );

  probeTest("applies the 15 second default timeout when no override is supplied", probes.workspace.gitVersion, (call) => {
    expect(timeoutMsOf(call)).toBe(15_000);
  });

  probeTest("keeps the full captured output of a failing probe", probes.workspace.npmTree, (call) => {
    expect(call.options.failureOutput).toBe("full");
  });

  probeTest(
    "applies a caller-supplied shorter timeout override",
    probes.workspace.gitVersion,
    (call) => {
      expect(timeoutMsOf(call)).toBe(500);
    },
    {timeoutMs: 500},
  );

  probeTest(
    "applies a caller-supplied longer timeout override",
    probes.workspace.gitVersion,
    (call) => {
      expect(timeoutMsOf(call)).toBe(60_000);
    },
    {timeoutMs: 60_000},
  );

  describe.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])("with a timeout override of %s", (timeoutMs) => {
    probeDefectTest("dies on the invalid override", probes.workspace.gitVersion, /timeout/iu, {timeoutMs});
  });

  probeTest(
    "preserves cwd and env unchanged",
    probes.workspace.gitVersion,
    (call) => {
      expect(call.options).toMatchObject({cwd: "C:\\repo", env: {CUSTOM: "value"}});
    },
    {cwd: "C:\\repo", env: {CUSTOM: "value"}},
  );

  probeTest("omits cwd and env from the forwarded options when not supplied", probes.workspace.gitVersion, (call) => {
    expect(call.options).not.toHaveProperty("cwd");
    expect(call.options).not.toHaveProperty("env");
  });

  probeTest(
    "maps a successful run to succeeded with its output",
    probes.workspace.gitVersion,
    (_call, outcome) => {
      expect(outcome).toEqual({kind: "succeeded", exitCode: 0, stdout: "git version 2.50.0", stderr: "", durationMs: 7});
    },
    undefined,
    {stdout: "git version 2.50.0", stderr: "", durationMs: 7},
  );

  probeTest(
    "maps ProcessExited to exited",
    probes.workspace.gitVersion,
    (_call, outcome) => {
      expect(outcome).toEqual({kind: "exited", exitCode: 3, stdout: "out", stderr: "err", durationMs: 42});
    },
    undefined,
    new ProcessExited({...failure, exitCode: 3}),
  );

  probeTest(
    "maps ProcessSignalled to signalled",
    probes.workspace.gitVersion,
    (_call, outcome) => {
      expect(outcome).toEqual({kind: "signalled", signal: "SIGKILL", stdout: "out", stderr: "err", durationMs: 42});
    },
    undefined,
    new ProcessSignalled({...failure, signal: "SIGKILL"}),
  );

  probeTest(
    "maps ProcessSpawnFailed to spawn-failed with the failure reason as its message",
    probes.workspace.gitVersion,
    (_call, outcome) => {
      expect(outcome).toEqual({kind: "spawn-failed", message: "ENOENT", stdout: "out", stderr: "err", durationMs: 42});
    },
    undefined,
    new ProcessSpawnFailed({...failure, reason: "ENOENT"}),
  );

  probeTest(
    "maps a hanging probe to timed-out within its budget",
    probes.workspace.gitVersion,
    (call, outcome) => {
      expect(outcome).toEqual({kind: "timed-out", stdout: "out", stderr: "err", durationMs: 42});
      expect(timeoutMsOf(call)).toBe(500);
    },
    {timeoutMs: 500},
    new ProcessTimedOut({...failure, timeoutMs: 500}),
  );
});
interface FixedProbeCase {
  readonly name: string;
  readonly factory: () => InspectionProbe;
  readonly command: ProcessRequest;
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
  probeTest("maps to its exact allowlisted command", factory, runsCommand(command));

  it("returns a distinct probe handle on every call", () => {
    expect(factory()).not.toBe(factory());
  });
});

describe("probes.dotnet.certificate", () => {
  probeTest(
    "defaults to the presence-check command when no mode is supplied",
    () => probes.dotnet.certificate(),
    runsCommand({command: "dotnet", args: ["dev-certs", "https", "--check"]}),
  );

  probeTest(
    "maps the explicit presence mode to the same plain check command",
    () => probes.dotnet.certificate("presence"),
    runsCommand({command: "dotnet", args: ["dev-certs", "https", "--check"]}),
  );

  probeTest(
    "maps the trust mode to the check-and-trust command",
    () => probes.dotnet.certificate("trust"),
    runsCommand({command: "dotnet", args: ["dev-certs", "https", "--check", "--trust"]}),
  );

  it("rejects an unsupported certificate mode", () => {
    expect(() => probes.dotnet.certificate("bogus" as never)).toThrow(/certificate mode/iu);
  });
});

describe("probes.workspace.executableResolution", () => {
  probeTest(
    "maps to the exact win32 resolver command",
    () => probes.workspace.executableResolution("git.exe", "win32"),
    runsCommand({command: "where.exe", args: ["git.exe"]}),
  );

  probeTest(
    "maps to the exact darwin resolver command",
    () => probes.workspace.executableResolution("git", "darwin"),
    runsCommand({command: "which", args: ["git"]}),
  );

  probeTest(
    "maps to the exact linux resolver command",
    () => probes.workspace.executableResolution("git", "linux"),
    runsCommand({command: "which", args: ["git"]}),
  );

  probeTest(
    "requires an explicit platform instead of reading the ambient process platform",
    () => probes.workspace.executableResolution("git.exe", "win32"),
    runsCommand({command: "where.exe", args: ["git.exe"]}),
  );

  it("rejects an unsupported platform", () => {
    expect(() => probes.workspace.executableResolution("git", "aix")).toThrow(/platform/iu);
  });

  it.each(["", "git version", "git;rm -rf /", "../git", "git\u0007", "../../bin/git"])("rejects an invalid executable name %j", (name) => {
    expect(() => probes.workspace.executableResolution(name, "linux")).toThrow();
  });
});

describe("probes.dotnet.userSecrets", () => {
  probeTest(
    "maps to the exact user-secrets command for the supplied project path",
    () => probes.dotnet.userSecrets("tooling/src/AppHost/AppHost.csproj"),
    runsCommand({command: "dotnet", args: ["user-secrets", "list", "--json", "--project", "tooling/src/AppHost/AppHost.csproj"]}),
  );

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
  probeTest(
    "maps to the exact command for the supplied interpreter path",
    () => factory(".venv/bin/python"),
    runsCommand({command: ".venv/bin/python", args}),
  );

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

  probeTest(
    "prefixes a valid numeric selector before the argument tail for the py launcher",
    () => factory("py", "-3.12"),
    runsCommand({command: "py", args: ["-3.12", ...args]}),
  );

  probeTest(
    "accepts a selector for the case-insensitive py.exe launcher basename",
    () => factory("C:\\Windows\\py.EXE", "-3"),
    runsCommand({command: "C:\\Windows\\py.EXE", args: ["-3", ...args]}),
  );

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
  readonly rancherCommand: ProcessRequest;
  readonly podmanCommand: ProcessRequest;
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
  probeTest("maps the rancher runtime to its Docker-compatible CLI command", () => factory("rancher"), runsCommand(rancherCommand));

  probeTest("maps the podman runtime to its CLI command", () => factory("podman"), runsCommand(podmanCommand));

  it.each(["docker", "", "rancher;rm -rf /", "Rancher", "podman "])("rejects an unsupported runtime name %j", (runtime) => {
    expect(() => factory(runtime)).toThrow();
  });
});

describe("probes.infrastructure.portOwners", () => {
  const WINDOWS_PORT_OWNER_SCRIPT =
    "& { $ports = @($args[0] -split ','); $(foreach ($port in $ports) { Get-NetTCPConnection -State Listen -LocalPort ([int]$port) -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, OwningProcess }) | ConvertTo-Json -Compress }";
  const MACOS_PORT_OWNER_SCRIPT = 'for port in "$@"; do lsof -nP -a -iTCP:"$port" -sTCP:LISTEN -Fpcn; done';
  const LINUX_PORT_OWNER_SCRIPT = 'for port in "$@"; do ss -ltnp "sport = :$port"; done';

  probeTest(
    "maps to the exact win32 port-owner probe command",
    () => probes.infrastructure.portOwners([3000, 5432], "win32"),
    runsCommand({command: "powershell", args: ["-NoProfile", "-NonInteractive", "-Command", WINDOWS_PORT_OWNER_SCRIPT, "3000,5432"]}),
  );

  probeTest(
    "maps to the exact darwin port-owner probe command",
    () => probes.infrastructure.portOwners([3000, 5432], "darwin"),
    runsCommand({command: "sh", args: ["-c", MACOS_PORT_OWNER_SCRIPT, "--", "3000", "5432"]}),
  );

  probeTest(
    "maps to the exact linux port-owner probe command",
    () => probes.infrastructure.portOwners([3000, 5432], "linux"),
    runsCommand({command: "sh", args: ["-c", LINUX_PORT_OWNER_SCRIPT, "--", "3000", "5432"]}),
  );

  probeTest(
    "requires an explicit platform instead of reading the ambient process platform",
    () => probes.infrastructure.portOwners([3000, 5432], "win32"),
    (call) => {
      expect(call.request.command).toBe("powershell");
      expect(call.request.args.join(" ")).toContain("3000");
      expect(call.request.args.join(" ")).toContain("5432");
    },
  );

  it("rejects an unsupported platform", () => {
    expect(() => probes.infrastructure.portOwners([3000], "aix")).toThrow(/platform/iu);
  });

  it("rejects an empty port list", () => {
    expect(() => probes.infrastructure.portOwners([], "linux")).toThrow();
  });

  it.each([0, -1, 65_536, 1.5, Number.NaN])("rejects an invalid TCP port %s", (port) => {
    expect(() => probes.infrastructure.portOwners([port], "linux")).toThrow();
  });
});
