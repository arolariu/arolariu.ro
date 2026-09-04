// @vitest-environment node
/**
 * @fileoverview Contract tests for shared read-only Python inspection facts.
 * @module scripts/inspection/python.test
 */

import {mkdir, mkdtemp, rm, truncate, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {afterEach, describe, expect, it, vi} from "vitest";

import type {ProcessEnvironment, ProcessExecutionRequest} from "../core/process/process-execution-request.ts";
import type {ProcessExecutionResult} from "../core/process/process-execution-result.ts";
import type {ProcessRunner} from "../core/process/process-runner.ts";
import {nodeFileSystem} from "../common/runtime.node.ts";
import {asReadOnlyFileSystem, DefaultTaskScheduler, type Clock, type RuntimeEnvironment} from "../common/runtime.ts";
import {createRepositoryPaths, type RepositoryPaths} from "../common/repository-paths.ts";
import {createInspectionProbeRunner} from "./probes.ts";
import {createPythonProvider} from "./python.ts";

const fixtureRoots: string[] = [];

const PYTHON_METADATA_PROBE_SCRIPT =
  "import json, platform, site, sys; print(json.dumps({'executable': sys.executable, 'version': platform.python_version(), 'prefix': sys.prefix, 'basePrefix': getattr(sys, 'base_prefix', sys.prefix), 'sitePackages': site.getsitepackages()}, separators=(',', ':')))";

/** Legacy-shaped fixture description translated into one typed {@link ProcessExecutionResult}. */
interface ProcessOutcomeFixture {
  readonly code?: number;
  readonly stdout?: string;
  readonly stderr?: string;
  readonly durationMs?: number;
  readonly timedOut?: boolean;
  readonly signal?: NodeJS.Signals;
  readonly spawnError?: string;
}

/**
 * Builds one typed {@link ProcessExecutionResult} from a fixture description, so every suite keeps naming
 * the exact spawn/timeout/signal/exit classification it exercises.
 *
 * @param patch - Fixture description of the outcome under test.
 * @returns The equivalent typed process outcome.
 */
function commandResult(patch: ProcessOutcomeFixture = {}): ProcessExecutionResult {
  const output = {stdout: patch.stdout ?? "", stderr: patch.stderr ?? "", durationMs: patch.durationMs ?? 1};
  if (patch.spawnError !== undefined) {
    return {kind: "spawn-failed", message: patch.spawnError, ...output};
  }
  if (patch.timedOut === true) {
    return {kind: "timed-out", ...(patch.signal === undefined ? {} : {signal: patch.signal}), ...output};
  }
  if (patch.signal !== undefined) {
    return {kind: "signalled", signal: patch.signal, ...output};
  }
  const code = patch.code ?? 0;
  return code === 0 ? {kind: "succeeded", exitCode: 0, ...output} : {kind: "exited", exitCode: code, ...output};
}

/** Wraps one recorded `run` implementation in the full {@link ProcessRunner} probe contract. */
function asProcessRunner(run: ProcessRunner["run"]): ProcessRunner {
  return {
    run,
    expectSuccess: () => {
      throw new Error("Inspection probes never call expectSuccess.");
    },
    scope: () => {
      throw new Error("Inspection probes never scope the shared runner.");
    },
  };
}

/** Read-only filesystem capability every fixture provider observes its temporary root through. */
const testFiles = asReadOnlyFileSystem(nodeFileSystem);

/** Deterministic task scheduler replacing the previous explicit `Promise.all` calls. */
const testTasks = new DefaultTaskScheduler();

/**
 * Builds one immutable environment snapshot for a fixture provider.
 *
 * @param platform - Target platform the provider must observe.
 * @param variables - Environment variables the provider may forward to probes.
 * @returns The environment snapshot.
 */
function environmentFor(platform: NodeJS.Platform, variables: ProcessEnvironment = {}): RuntimeEnvironment {
  return {
    variables,
    cwd: "/repo",
    executablePath: "/usr/bin/node",
    platform,
    architecture: "x64",
    stdinIsTTY: false,
    stdoutIsTTY: false,
    isCI: true,
  };
}

function commandKey(command: Readonly<ProcessExecutionRequest>, cwd?: string): string {
  return `${cwd ?? ""}\u0000${command.command}\u0000${JSON.stringify(command.args)}`;
}

function clock(): Clock {
  let current = 100;
  return {
    monotonicNow: (): number => {
      current += 5;
      return current;
    },
    isoTimestamp: (): string => "2025-01-01T00:00:00.000Z",
    delay: (): Promise<void> => Promise.resolve(),
  };
}

function expectedProbeEnvironment(platform: NodeJS.Platform): Readonly<NodeJS.ProcessEnv> {
  return {
    NO_COLOR: "1",
    PIP_CONFIG_FILE: platform === "win32" ? "NUL" : "/dev/null",
    PIP_CERT: undefined,
    PIP_CLIENT_CERT: undefined,
    PIP_DISABLE_PIP_VERSION_CHECK: "1",
    PIP_EXTRA_INDEX_URL: undefined,
    PIP_INDEX_URL: undefined,
    PIP_NO_INPUT: "1",
    PIP_PROXY: undefined,
    PIP_TRUSTED_HOST: undefined,
    PYTHONDONTWRITEBYTECODE: "1",
    PYTHONHOME: undefined,
    PYTHONINSPECT: undefined,
    PYTHONNOUSERSITE: "1",
    PYTHONPATH: undefined,
    PYTHONSAFEPATH: "1",
    PYTHONSTARTUP: undefined,
    PYTHONUTF8: "1",
    PYTHONWARNINGS: undefined,
    VIRTUAL_ENV: undefined,
  };
}

function systemVersionCommands(platform: NodeJS.Platform): readonly Readonly<ProcessExecutionRequest>[] {
  return platform === "win32"
    ? [
        {command: "py", args: ["-3.12", "--version"]},
        {command: "python3.12", args: ["--version"]},
        {command: "python", args: ["--version"]},
      ]
    : [
        {command: "python3.12", args: ["--version"]},
        {command: "python3", args: ["--version"]},
        {command: "python", args: ["--version"]},
      ];
}

function venvRelativeCommand(platform: NodeJS.Platform): string {
  return platform === "win32" ? ".venv\\Scripts\\python.exe" : ".venv/bin/python";
}

function venvMetadataCommand(platform: NodeJS.Platform): Readonly<ProcessExecutionRequest> {
  return {
    command: venvRelativeCommand(platform),
    args: ["-c", PYTHON_METADATA_PROBE_SCRIPT],
  };
}

function venvPipVersionCommand(platform: NodeJS.Platform): Readonly<ProcessExecutionRequest> {
  return {command: venvRelativeCommand(platform), args: ["-m", "pip", "--isolated", "--version"]};
}

function venvPipListCommand(platform: NodeJS.Platform): Readonly<ProcessExecutionRequest> {
  return {command: venvRelativeCommand(platform), args: ["-m", "pip", "--isolated", "list", "--format", "json"]};
}

function venvPipCheckCommand(platform: NodeJS.Platform): Readonly<ProcessExecutionRequest> {
  return {command: venvRelativeCommand(platform), args: ["-m", "pip", "--isolated", "check"]};
}

function expectedVenvDirectory(paths: RepositoryPaths, platform: NodeJS.Platform): string {
  return platform === "win32" ? `${paths.expRoot}\\.venv` : `${paths.expRoot}/.venv`;
}

function expectedVenvInterpreter(paths: RepositoryPaths, platform: NodeJS.Platform): string {
  const directory = expectedVenvDirectory(paths, platform);
  return platform === "win32" ? `${directory}\\Scripts\\python.exe` : `${directory}/bin/python`;
}

function metadataOutput(
  input: Readonly<{
    executable: string;
    version?: string;
    prefix: string;
    basePrefix?: string;
  }>,
): string {
  return JSON.stringify({
    executable: input.executable,
    version: input.version ?? "3.12.6",
    prefix: input.prefix,
    basePrefix: input.basePrefix ?? resolve(input.prefix, "..", "base-python"),
    sitePackages: ["raw-site-packages-marker"],
  });
}

async function writeFixtureFile(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, contents, "utf8");
}

interface PythonFixture {
  readonly root: string;
  readonly paths: RepositoryPaths;
  readonly platform: NodeJS.Platform;
  readonly run: ReturnType<typeof vi.fn<ProcessRunner["run"]>>;
  readonly setResponse: (command: Readonly<ProcessExecutionRequest>, result: ProcessExecutionResult, cwd?: string) => void;
  readonly provider: ReturnType<typeof createPythonProvider>;
  readonly venvDirectory: string;
  readonly venvInterpreter: string;
}

async function createPythonFixture(
  input: Readonly<{
    platform?: NodeJS.Platform;
    createVenv?: boolean;
    pyproject?: string;
    requirements?: string | null;
    includedRequirements?: string;
    templateConfig?: string | null;
    dockerConfig?: string | null;
    aspireConfig?: string | null;
    clock?: Clock;
  }> = {},
): Promise<PythonFixture> {
  const root = await mkdtemp(join(tmpdir(), "arolariu-inspection-python-"));
  fixtureRoots.push(root);
  const paths = createRepositoryPaths(root);
  const platform = input.platform ?? "win32";
  const venvDirectory = expectedVenvDirectory(paths, platform);
  const venvInterpreter = expectedVenvInterpreter(paths, platform);
  const actualVenvInterpreter = resolve(
    paths.expRoot,
    ".venv",
    platform === "win32" ? "Scripts" : "bin",
    platform === "win32" ? "python.exe" : "python",
  );

  await Promise.all([
    writeFixtureFile(paths.pythonProject, input.pyproject ?? '[project]\nrequires-python = ">=3.12"\n'),
    ...(input.requirements === null
      ? []
      : [
          writeFixtureFile(
            paths.pythonRequirements,
            input.requirements ?? ["-r requirements.txt", "pytest==9.1.1", "opentelemetry-exporter-otlp-proto-http~=1.43", ""].join("\n"),
          ),
        ]),
    writeFixtureFile(
      resolve(paths.expRoot, "requirements.txt"),
      input.includedRequirements ?? ["requests==2.31.0", "fastapi==0.141.1", ""].join("\n"),
    ),
    ...(input.templateConfig === null
      ? []
      : [
          writeFixtureFile(
            resolve(paths.expRoot, "config.template.json"),
            input.templateConfig
              ?? JSON.stringify({
                "Auth:Clerk:SecretKey": "template-secret-value-marker",
                "Site:Name": "template-site-value-marker",
              }),
          ),
        ]),
    ...(input.dockerConfig === null
      ? []
      : [
          writeFixtureFile(
            resolve(paths.expRoot, "config.docker.json"),
            input.dockerConfig
              ?? JSON.stringify({
                "Auth:Clerk:SecretKey": "docker-secret-value-marker",
                "Site:Name": "docker-site-value-marker",
                "Docker:Only": "docker-only-value-marker",
              }),
          ),
        ]),
    ...(input.aspireConfig === null
      ? []
      : [
          writeFixtureFile(
            resolve(paths.expRoot, "config.aspire.json"),
            input.aspireConfig ?? JSON.stringify({Generated: "aspire-secret-value-marker"}),
          ),
        ]),
    ...(input.createVenv === false ? [] : [writeFixtureFile(actualVenvInterpreter, "placeholder")]),
  ]);

  const responses = new Map<string, ProcessExecutionResult>();
  const setResponse = (command: Readonly<ProcessExecutionRequest>, result: ProcessExecutionResult, cwd: string = paths.root): void => {
    responses.set(commandKey(command, cwd), result);
  };

  const candidates = systemVersionCommands(platform);
  setResponse(candidates[0]!, commandResult({stdout: "Python 3.12.6\n"}));
  setResponse(candidates[1]!, commandResult({code: 127, spawnError: "candidate-two-native-marker ENOENT"}));
  setResponse(candidates[2]!, commandResult({code: 127, spawnError: "candidate-three-native-marker ENOENT"}));

  if (input.createVenv !== false) {
    setResponse(
      venvMetadataCommand(platform),
      commandResult({
        stdout: metadataOutput({
          executable: venvInterpreter,
          prefix: venvDirectory,
          basePrefix: platform === "win32" ? String.raw`C:\Python312` : "/usr/local/python3.12",
        }),
      }),
      paths.expRoot,
    );
    setResponse(
      venvPipVersionCommand(platform),
      commandResult({stdout: "pip 24.3.1 from raw-secret-user-path-marker (python 3.12)\n"}),
      paths.expRoot,
    );
    setResponse(
      venvPipListCommand(platform),
      commandResult({
        stdout: JSON.stringify([
          {name: "requests", version: "2.31.0"},
          {name: "fastapi", version: "0.141.1"},
          {name: "pytest", version: "9.1.1"},
          {name: "unrelated-secret-marker", version: "1.0.0"},
        ]),
      }),
      paths.expRoot,
    );
    setResponse(
      venvPipCheckCommand(platform),
      commandResult({stdout: "No broken requirements found. raw-check-success-marker\n"}),
      paths.expRoot,
    );
  }

  const run = vi.fn<ProcessRunner["run"]>(
    async (command, options): Promise<ProcessExecutionResult> =>
      responses.get(commandKey(command, options?.cwd))
      ?? commandResult({code: 127, spawnError: `spawn ENOENT unexpected-native-command-marker:${command.command}`}),
  );
  const provider = createPythonProvider({
    paths,
    probes: createInspectionProbeRunner(asProcessRunner(run)),
    files: testFiles,
    clock: input.clock ?? clock(),
    tasks: testTasks,
    environment: environmentFor(platform),
  });
  return {root, paths, platform, run, setResponse, provider, venvDirectory, venvInterpreter};
}

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map(async (root) => rm(root, {recursive: true, force: true})));
});

describe("createPythonProvider", () => {
  it("projects healthy Windows Python facts through exact named probes without retaining raw or secret values", async () => {
    const fixture = await createPythonFixture();

    const outcome = await fixture.provider();

    expect(outcome).toEqual({
      kind: "available",
      value: {
        interpreters: [{command: "py", prefixArgs: ["-3.12"], version: "3.12.6"}],
        selected: {command: "py", prefixArgs: ["-3.12"], version: "3.12.6"},
        virtualEnvironment: {
          exists: true,
          compatible: true,
          interpreterPath: fixture.venvInterpreter,
          version: "3.12.6",
        },
        pip: {available: true, version: "24.3.1", conflicts: []},
        requirements: {
          declared: [
            {name: "requests", specifier: "2.31.0", source: "sites/exp.arolariu.ro/requirements.txt"},
            {name: "fastapi", specifier: "0.141.1", source: "sites/exp.arolariu.ro/requirements.txt"},
            {name: "pytest", specifier: "9.1.1", source: "sites/exp.arolariu.ro/requirements-dev.txt"},
          ],
          unverifiable: [
            "sites/exp.arolariu.ro/requirements-dev.txt:3 declares 'opentelemetry-exporter-otlp-proto-http' with a requirement that is not exactly comparable.",
          ],
          mismatches: [],
        },
        configurationIssues: [],
      },
      durationMs: 5,
    });
    expect(JSON.stringify(outcome)).not.toMatch(
      /raw-|secret-value-marker|site-value-marker|docker-only-value-marker|candidate-two-native-marker|candidate-three-native-marker|unrelated-secret-marker/iu,
    );

    const environment = expectedProbeEnvironment("win32");
    const rootOptions = {cwd: fixture.root, env: environment, timeoutMs: 15_000, output: "capture"} as const;
    const expOptions = {cwd: fixture.paths.expRoot, env: environment, timeoutMs: 15_000, output: "capture"} as const;
    expect(fixture.run.mock.calls).toEqual([
      [{command: "py", args: ["-3.12", "--version"]}, rootOptions],
      [{command: "python3.12", args: ["--version"]}, rootOptions],
      [{command: "python", args: ["--version"]}, rootOptions],
      [venvMetadataCommand("win32"), expOptions],
      [venvPipVersionCommand("win32"), expOptions],
      [venvPipListCommand("win32"), expOptions],
      [venvPipCheckCommand("win32"), expOptions],
    ]);
  });

  it("selects a POSIX python3 fallback and preserves a valid prerelease version", async () => {
    const fixture = await createPythonFixture({platform: "linux"});
    const [python312, python3, python] = systemVersionCommands("linux");
    fixture.setResponse(python312!, commandResult({code: 127, spawnError: "spawn ENOENT missing-python312-marker"}));
    fixture.setResponse(python3!, commandResult({stderr: "Python 3.13.0rc1\n"}));
    fixture.setResponse(python!, commandResult({stdout: "Python 3.11.9\n"}));
    fixture.setResponse(
      venvMetadataCommand("linux"),
      commandResult({
        stdout: metadataOutput({
          executable: fixture.venvInterpreter,
          version: "3.13.0rc1",
          prefix: fixture.venvDirectory,
          basePrefix: "/usr/local/python3.13",
        }),
      }),
      fixture.paths.expRoot,
    );

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {
        interpreters: [
          {command: "python3", prefixArgs: [], version: "3.13.0rc1"},
          {command: "python", prefixArgs: [], version: "3.11.9"},
        ],
        selected: {command: "python3", prefixArgs: [], version: "3.13.0rc1"},
        virtualEnvironment: {exists: true, compatible: true, version: "3.13.0rc1"},
      },
    });
    expect(fixture.run).toHaveBeenCalledWith(
      {command: "python3", args: ["--version"]},
      {
        cwd: fixture.root,
        env: expectedProbeEnvironment("linux"),
        timeoutMs: 15_000,
        output: "capture",
      },
    );
  });

  it("does not treat a prerelease of the exact minimum version as compatible", async () => {
    const fixture = await createPythonFixture();
    const [py, python312, python] = systemVersionCommands("win32");
    fixture.setResponse(py!, commandResult({stdout: "Python 3.12.0rc1\n"}));
    fixture.setResponse(python312!, commandResult({code: 127, spawnError: "spawn ENOENT missing"}));
    fixture.setResponse(python!, commandResult({code: 127, spawnError: "spawn ENOENT missing"}));
    fixture.setResponse(
      venvMetadataCommand("win32"),
      commandResult({
        stdout: metadataOutput({
          executable: fixture.venvInterpreter,
          version: "3.12.0rc1",
          prefix: fixture.venvDirectory,
          basePrefix: String.raw`C:\Python312`,
        }),
      }),
      fixture.paths.expRoot,
    );

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {
        interpreters: [{command: "py", prefixArgs: ["-3.12"], version: "3.12.0rc1"}],
        virtualEnvironment: {exists: true, compatible: false, version: "3.12.0rc1"},
      },
    });
    expect(outcome.kind === "available" ? outcome.value.selected : undefined).toBeUndefined();
  });

  it("returns available empty interpreter facts when every fixed candidate is absent", async () => {
    const fixture = await createPythonFixture({createVenv: false});
    for (const command of systemVersionCommands("win32")) {
      fixture.setResponse(command, commandResult({code: 127, spawnError: "spawn ENOENT native-missing-marker"}));
    }

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {
        interpreters: [],
        virtualEnvironment: {exists: false, compatible: false},
        pip: {available: false, conflicts: []},
      },
    });
    expect(outcome.kind === "available" ? outcome.value.selected : undefined).toBeUndefined();
    expect(JSON.stringify(outcome)).not.toContain("native-missing-marker");
  });

  it("rejects unsupported inspection platforms before executing probes", async () => {
    const fixture = await createPythonFixture({platform: "freebsd"});

    await expect(fixture.provider()).resolves.toEqual({
      kind: "invalid",
      issues: ["The requested Python inspection platform is unsupported."],
      durationMs: 5,
    });
    expect(fixture.run).not.toHaveBeenCalled();
  });

  it("maps successful malformed interpreter version output to a redacted invalid outcome", async () => {
    const fixture = await createPythonFixture();
    fixture.setResponse(systemVersionCommands("win32")[0]!, commandResult({stdout: "raw-malformed-version-marker"}));

    const outcome = await fixture.provider();

    expect(outcome).toEqual({
      kind: "invalid",
      issues: ["A Python interpreter version probe returned malformed output."],
      durationMs: 5,
    });
    expect(JSON.stringify(outcome)).not.toContain("raw-malformed-version-marker");
  });

  it("maps an interrupted interpreter candidate probe to unavailable without native output", async () => {
    const fixture = await createPythonFixture();
    fixture.setResponse(
      systemVersionCommands("win32")[0]!,
      commandResult({code: 1, timedOut: true, stderr: "raw-candidate-timeout-marker"}),
    );

    const outcome = await fixture.provider();

    expect(outcome).toEqual({
      kind: "unavailable",
      reason: "Python interpreter candidates could not be inspected.",
      durationMs: 5,
    });
    expect(JSON.stringify(outcome)).not.toContain("raw-candidate-timeout-marker");
  });

  it("skips every venv-owned probe when the canonical environment directory is absent", async () => {
    const fixture = await createPythonFixture({createVenv: false});

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {
        virtualEnvironment: {exists: false, compatible: false},
        pip: {available: false, conflicts: []},
        requirements: {mismatches: []},
      },
    });
    expect(fixture.run).toHaveBeenCalledTimes(3);
  });

  it("reports an existing older canonical environment as incompatible", async () => {
    const fixture = await createPythonFixture();
    fixture.setResponse(
      venvMetadataCommand("win32"),
      commandResult({
        stdout: metadataOutput({
          executable: fixture.venvInterpreter,
          version: "3.11.9",
          prefix: fixture.venvDirectory,
          basePrefix: String.raw`C:\Python311`,
        }),
      }),
      fixture.paths.expRoot,
    );

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {
        virtualEnvironment: {
          exists: true,
          compatible: false,
          interpreterPath: fixture.venvInterpreter,
          version: "3.11.9",
        },
        pip: {available: true},
      },
    });
  });

  it("does not expose an interpreter path outside the canonical environment", async () => {
    const fixture = await createPythonFixture();
    fixture.setResponse(
      venvMetadataCommand("win32"),
      commandResult({
        stdout: metadataOutput({
          executable: String.raw`C:\Users\secret-user-marker\python.exe`,
          prefix: String.raw`C:\Users\secret-user-marker`,
          basePrefix: String.raw`C:\Python312`,
        }),
      }),
      fixture.paths.expRoot,
    );

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {virtualEnvironment: {exists: true, compatible: false, version: "3.12.6"}},
    });
    expect(outcome.kind === "available" ? outcome.value.virtualEnvironment.interpreterPath : undefined).toBeUndefined();
    expect(JSON.stringify(outcome)).not.toContain("secret-user-marker");
  });

  it("maps malformed successful virtual-environment metadata to invalid without raw output", async () => {
    const fixture = await createPythonFixture();
    fixture.setResponse(
      venvMetadataCommand("win32"),
      commandResult({stdout: '{"version":"raw-venv-metadata-marker"}'}),
      fixture.paths.expRoot,
    );

    const outcome = await fixture.provider();

    expect(outcome).toEqual({
      kind: "invalid",
      issues: ["The Python virtual environment returned malformed metadata."],
      durationMs: 5,
    });
    expect(JSON.stringify(outcome)).not.toContain("raw-venv-metadata-marker");
  });

  it("maps an unobservable existing virtual environment to unavailable without native details", async () => {
    const fixture = await createPythonFixture();
    fixture.setResponse(
      venvMetadataCommand("win32"),
      commandResult({code: 1, spawnError: "native-venv-spawn-marker", stderr: "raw-venv-stderr-marker"}),
      fixture.paths.expRoot,
    );

    const outcome = await fixture.provider();

    expect(outcome).toEqual({
      kind: "unavailable",
      reason: "The Python virtual environment could not be inspected.",
      durationMs: 5,
    });
    expect(JSON.stringify(outcome)).not.toMatch(/native-venv-spawn-marker|raw-venv-stderr-marker/iu);
  });

  it("represents missing pip as an available fact and avoids redundant package probes", async () => {
    const fixture = await createPythonFixture();
    fixture.setResponse(
      venvPipVersionCommand("win32"),
      commandResult({code: 1, stderr: "No module named pip raw-pip-missing-marker"}),
      fixture.paths.expRoot,
    );

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {
        pip: {available: false, conflicts: []},
        requirements: {mismatches: []},
      },
    });
    expect(fixture.run).toHaveBeenCalledTimes(5);
    expect(JSON.stringify(outcome)).not.toContain("raw-pip-missing-marker");
  });

  it("maps malformed successful pip version output to invalid without retaining its install path", async () => {
    const fixture = await createPythonFixture();
    fixture.setResponse(
      venvPipVersionCommand("win32"),
      commandResult({stdout: "pip 1notapepversion from C:\\Users\\secret-user-marker\\.venv (python 3.12)"}),
      fixture.paths.expRoot,
    );

    const outcome = await fixture.provider();

    expect(outcome).toEqual({
      kind: "invalid",
      issues: ["pip --version returned malformed output."],
      durationMs: 5,
    });
    expect(JSON.stringify(outcome)).not.toMatch(/1notapepversion|secret-user-marker/iu);
  });

  it("accepts pip version output written to stderr without retaining the installation path", async () => {
    const fixture = await createPythonFixture();
    fixture.setResponse(
      venvPipVersionCommand("win32"),
      commandResult({stderr: "pip 25.1.1 from C:\\Users\\secret-user-marker\\.venv (python 3.12)\n"}),
      fixture.paths.expRoot,
    );

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({kind: "available", value: {pip: {available: true, version: "25.1.1"}}});
    expect(JSON.stringify(outcome)).not.toContain("secret-user-marker");
  });

  it("maps malformed successful pip list JSON to invalid without raw package data", async () => {
    const fixture = await createPythonFixture();
    fixture.setResponse(venvPipListCommand("win32"), commandResult({stdout: '{"raw-package-secret-marker":true}'}), fixture.paths.expRoot);

    const outcome = await fixture.provider();

    expect(outcome).toEqual({
      kind: "invalid",
      issues: ["pip list returned malformed package data."],
      durationMs: 5,
    });
    expect(JSON.stringify(outcome)).not.toContain("raw-package-secret-marker");
  });

  it("rejects duplicate normalized distributions in pip list output", async () => {
    const fixture = await createPythonFixture();
    fixture.setResponse(
      venvPipListCommand("win32"),
      commandResult({
        stdout: JSON.stringify([
          {name: "package.name", version: "1.0.0"},
          {name: "package-name", version: "1.0.0"},
        ]),
      }),
      fixture.paths.expRoot,
    );

    await expect(fixture.provider()).resolves.toEqual({
      kind: "invalid",
      issues: ["pip list returned malformed package data."],
      durationMs: 5,
    });
  });

  it("maps an unsuccessful pip list observation to unavailable without native details", async () => {
    const fixture = await createPythonFixture();
    fixture.setResponse(venvPipListCommand("win32"), commandResult({code: 2, stderr: "raw-pip-list-stderr-marker"}), fixture.paths.expRoot);

    const outcome = await fixture.provider();

    expect(outcome).toEqual({
      kind: "unavailable",
      reason: "Installed Python distributions could not be inspected.",
      durationMs: 5,
    });
    expect(JSON.stringify(outcome)).not.toContain("raw-pip-list-stderr-marker");
  });

  it("projects nonzero pip check output into bounded generated conflict facts", async () => {
    const fixture = await createPythonFixture();
    const conflicts = Array.from(
      {length: 75},
      (_, index) =>
        `broken-package-${index.toString().padStart(3, "0")} 1.0 has requirement dependency>=2, but you have dependency 1.0. C:\\Users\\secret-user-marker`,
    );
    fixture.setResponse(
      venvPipCheckCommand("win32"),
      commandResult({
        code: 1,
        stdout: [...conflicts, "https://credential-marker:password@example.invalid/simple"].join("\n"),
        stderr: "raw-pip-check-stderr-marker",
      }),
      fixture.paths.expRoot,
    );

    const outcome = await fixture.provider();

    expect(outcome.kind).toBe("available");
    if (outcome.kind !== "available") {
      return;
    }
    expect(outcome.value.pip.conflicts).toHaveLength(50);
    expect(outcome.value.pip.conflicts[0]).toBe("pip reported a dependency conflict for 'broken-package-000'.");
    expect(outcome.value.pip.conflicts.at(-1)).toBe("27 additional pip conflict reports were omitted.");
    expect(JSON.stringify(outcome)).not.toMatch(/secret-user-marker|credential-marker|password|raw-pip-check-stderr-marker/iu);
  });

  it("collapses oversized pip check output to one generated conflict fact", async () => {
    const fixture = await createPythonFixture();
    fixture.setResponse(
      venvPipCheckCommand("win32"),
      commandResult({code: 1, stdout: "raw-oversized-secret-marker".repeat(50_000)}),
      fixture.paths.expRoot,
    );

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {
        pip: {
          conflicts: ["pip reported dependency conflicts; detailed output exceeded the inspection limit."],
        },
      },
    });
    expect(JSON.stringify(outcome)).not.toContain("raw-oversized-secret-marker");
  });

  it("reports deterministic missing and version-mismatched exact requirements", async () => {
    const fixture = await createPythonFixture();
    fixture.setResponse(
      venvPipListCommand("win32"),
      commandResult({
        stdout: JSON.stringify([
          {name: "fastapi", version: "0.141.1"},
          {name: "pytest", version: "8.3.2"},
        ]),
      }),
      fixture.paths.expRoot,
    );

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {
        requirements: {
          mismatches: ["requests==2.31.0 is not installed.", "pytest requires 9.1.1 but 8.3.2 is installed."],
        },
      },
    });
  });

  it("uses PEP 440 equality for exact pins instead of raw version-string equality", async () => {
    const fixture = await createPythonFixture({
      requirements: "demo==1.0\n",
      includedRequirements: "",
    });
    fixture.setResponse(
      venvPipListCommand("win32"),
      commandResult({stdout: JSON.stringify([{name: "demo", version: "1.0.0+vendor.1"}])}),
      fixture.paths.expRoot,
    );

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {
        requirements: {
          declared: [{name: "demo", specifier: "1.0", source: "sites/exp.arolariu.ro/requirements-dev.txt"}],
          mismatches: [],
        },
      },
    });
  });

  it("normalizes PEP 440 epochs, prereleases, postreleases, development releases, and local versions", async () => {
    const fixture = await createPythonFixture({
      requirements: [
        "epoch-package==1!2.0",
        "pre-package==1.0alpha1",
        "post-package==1.0rev1",
        "dev-package==1.0.dev1",
        "local-package==1.0+ABC-1",
        "",
      ].join("\n"),
      includedRequirements: "",
    });
    fixture.setResponse(
      venvPipListCommand("win32"),
      commandResult({
        stdout: JSON.stringify([
          {name: "epoch-package", version: "1!2.0.0"},
          {name: "pre-package", version: "1.0a1"},
          {name: "post-package", version: "1.0-post1"},
          {name: "dev-package", version: "1.0_dev1"},
          {name: "local-package", version: "1.0+abc.1"},
        ]),
      }),
      fixture.paths.expRoot,
    );

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({kind: "available", value: {requirements: {mismatches: []}}});
  });

  it("rejects a digit-prefixed malformed version returned by pip list", async () => {
    const fixture = await createPythonFixture();
    fixture.setResponse(
      venvPipListCommand("win32"),
      commandResult({stdout: JSON.stringify([{name: "requests", version: "1notapepversion"}])}),
      fixture.paths.expRoot,
    );

    await expect(fixture.provider()).resolves.toEqual({
      kind: "invalid",
      issues: ["pip list returned malformed package data."],
      durationMs: 5,
    });
  });

  it("rejects an exact pin whose version is not valid PEP 440", async () => {
    const fixture = await createPythonFixture({
      requirements: "demo==1notapepversion\n",
      includedRequirements: "",
    });

    await expect(fixture.provider()).resolves.toEqual({
      kind: "invalid",
      issues: ["The Python requirements tree is malformed."],
      durationMs: 5,
    });
  });

  it("redacts unverifiable pip option contents while retaining their source location", async () => {
    const fixture = await createPythonFixture({
      requirements: [
        "-r requirements.txt",
        "--extra-index-url https://credential-marker:password@example.invalid/simple",
        'package-with-marker>=1.0; python_version >= "3.12"',
        "",
      ].join("\n"),
    });

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {
        requirements: {
          unverifiable: [
            "sites/exp.arolariu.ro/requirements-dev.txt:2 contains a pip option or directive that is not exactly comparable.",
            "sites/exp.arolariu.ro/requirements-dev.txt:3 declares 'package-with-marker' with a requirement that is not exactly comparable.",
          ],
        },
      },
    });
    expect(JSON.stringify(outcome)).not.toMatch(/credential-marker|password|python_version/iu);
  });

  it("retains valid extras, direct references, and bare marker requirements only as redacted unverifiable facts", async () => {
    const fixture = await createPythonFixture({
      requirements: [
        "extras-package[security, speed]>=1.0",
        "direct-package @ https://user:secret@example.invalid/direct-package.whl",
        'marker-package; python_version >= "3.12" and sys_platform != "win32"',
        "",
      ].join("\n"),
      includedRequirements: "",
    });

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {
        requirements: {
          unverifiable: [
            "sites/exp.arolariu.ro/requirements-dev.txt:1 declares 'extras-package' with a requirement that is not exactly comparable.",
            "sites/exp.arolariu.ro/requirements-dev.txt:2 declares 'direct-package' with a requirement that is not exactly comparable.",
            "sites/exp.arolariu.ro/requirements-dev.txt:3 declares 'marker-package' with a requirement that is not exactly comparable.",
          ],
        },
      },
    });
    expect(JSON.stringify(outcome)).not.toMatch(/user:secret|example\.invalid|python_version|sys_platform/iu);
  });

  it("rejects malformed requirements without copying the malformed line", async () => {
    const fixture = await createPythonFixture({requirements: '"unterminated-raw-secret-marker\n'});

    const outcome = await fixture.provider();

    expect(outcome).toEqual({
      kind: "invalid",
      issues: ["The Python requirements tree is malformed."],
      durationMs: 5,
    });
    expect(JSON.stringify(outcome)).not.toContain("unterminated-raw-secret-marker");
  });

  it("rejects a name-prefixed malformed requirement instead of classifying it as unverifiable", async () => {
    const fixture = await createPythonFixture({requirements: "demo==\n", includedRequirements: ""});

    await expect(fixture.provider()).resolves.toEqual({
      kind: "invalid",
      issues: ["The Python requirements tree is malformed."],
      durationMs: 5,
    });
  });

  it("rejects a malformed environment marker instead of classifying it as unverifiable", async () => {
    const fixture = await createPythonFixture({
      requirements: 'demo>=1; python_version >>> "3.12"\n',
      includedRequirements: "",
    });

    await expect(fixture.provider()).resolves.toEqual({
      kind: "invalid",
      issues: ["The Python requirements tree is malformed."],
      durationMs: 5,
    });
  });

  it("rejects duplicate normalized names across non-exact requirements", async () => {
    const fixture = await createPythonFixture({
      requirements: "demo>=1\nDemo~=2.0\n",
      includedRequirements: "",
    });

    await expect(fixture.provider()).resolves.toEqual({
      kind: "invalid",
      issues: ["The Python requirements tree is malformed."],
      durationMs: 5,
    });
  });

  it("rejects unknown pip requirement-file options", async () => {
    const fixture = await createPythonFixture({
      requirements: "--not-a-real-pip-option raw-option-secret-marker\n",
      includedRequirements: "",
    });

    const outcome = await fixture.provider();

    expect(outcome).toEqual({
      kind: "invalid",
      issues: ["The Python requirements tree is malformed."],
      durationMs: 5,
    });
    expect(JSON.stringify(outcome)).not.toContain("raw-option-secret-marker");
  });

  it("rejects requirement includes that escape the experimental-service root", async () => {
    const fixture = await createPythonFixture({requirements: "-r ../../outside-requirements.txt\n"});
    await writeFixtureFile(resolve(fixture.root, "outside-requirements.txt"), "outside-secret-marker==1.0\n");

    const outcome = await fixture.provider();

    expect(outcome).toEqual({
      kind: "invalid",
      issues: ["The Python requirements tree is malformed."],
      durationMs: 5,
    });
    expect(JSON.stringify(outcome)).not.toMatch(/outside-requirements|outside-secret-marker/iu);
  });

  it("allows a parent-relative requirement include that remains inside the experimental-service root", async () => {
    const fixture = await createPythonFixture({requirements: "-r nested/dev.txt\n"});
    await writeFixtureFile(resolve(fixture.paths.expRoot, "nested", "dev.txt"), "-r ../requirements.txt\npytest==9.1.1\n");

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {
        requirements: {
          declared: [
            {name: "requests", specifier: "2.31.0", source: "sites/exp.arolariu.ro/requirements.txt"},
            {name: "fastapi", specifier: "0.141.1", source: "sites/exp.arolariu.ro/requirements.txt"},
            {name: "pytest", specifier: "9.1.1", source: "sites/exp.arolariu.ro/nested/dev.txt"},
          ],
        },
      },
    });
  });

  it("rejects duplicate normalized requirements across included files", async () => {
    const fixture = await createPythonFixture({
      requirements: "-r requirements.txt\nRequests==2.31.0\n",
      includedRequirements: "requests==2.31.0\n",
    });

    await expect(fixture.provider()).resolves.toEqual({
      kind: "invalid",
      issues: ["The Python requirements tree is malformed."],
      durationMs: 5,
    });
  });

  it("rejects circular requirement includes", async () => {
    const fixture = await createPythonFixture({requirements: "-r requirements.txt\n", includedRequirements: "-r requirements-dev.txt\n"});

    await expect(fixture.provider()).resolves.toEqual({
      kind: "invalid",
      issues: ["The Python requirements tree is malformed."],
      durationMs: 5,
    });
  });

  it("returns key-only configuration parity issues without retaining configuration values", async () => {
    const fixture = await createPythonFixture({
      templateConfig: JSON.stringify({
        "Auth:Clerk:SecretKey": "template-secret-marker",
        "Site:Name": "template-site-marker",
      }),
      dockerConfig: JSON.stringify({"Site:Name": "docker-site-marker"}),
      aspireConfig: '{"Generated":"aspire-secret-marker"',
    });

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {
        configurationIssues: [
          "config.aspire.json is not a valid JSON object.",
          "config.docker.json is missing required key 'Auth:Clerk:SecretKey'.",
        ],
      },
    });
    expect(JSON.stringify(outcome)).not.toMatch(/template-secret-marker|template-site-marker|docker-site-marker|aspire-secret-marker/iu);
  });

  it("treats an absent Aspire overlay as valid while reporting missing required configuration files", async () => {
    const fixture = await createPythonFixture({
      templateConfig: null,
      dockerConfig: null,
      aspireConfig: null,
    });

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({
      kind: "available",
      value: {
        configurationIssues: ["config.docker.json is missing.", "config.template.json is missing."],
      },
    });
  });

  it("bounds a large configuration-parity failure without returning values", async () => {
    const template = Object.fromEntries(
      Array.from({length: 75}, (_, index) => [
        `Config:Key:${index.toString().padStart(3, "0")}`,
        `secret-configuration-value-marker-${String(index)}`,
      ]),
    );
    const fixture = await createPythonFixture({
      templateConfig: JSON.stringify(template),
      dockerConfig: "{}",
      aspireConfig: null,
    });

    const outcome = await fixture.provider();

    expect(outcome.kind).toBe("available");
    if (outcome.kind !== "available") {
      return;
    }
    expect(outcome.value.configurationIssues).toHaveLength(50);
    expect(outcome.value.configurationIssues[0]).toBe("config.docker.json is missing required key 'Config:Key:000'.");
    expect(outcome.value.configurationIssues.at(-1)).toBe("26 additional configuration issues were omitted.");
    expect(JSON.stringify(outcome)).not.toContain("secret-configuration-value-marker");
  });

  it("maps malformed Python requirement metadata to invalid without copying project contents", async () => {
    const fixture = await createPythonFixture({
      pyproject: '[project]\nrequires-python = "^3.12"\n# raw-project-secret-marker\n',
    });

    const outcome = await fixture.provider();

    expect(outcome).toEqual({
      kind: "invalid",
      issues: ["pyproject.toml declares an unsupported Python requirement."],
      durationMs: 5,
    });
    expect(JSON.stringify(outcome)).not.toContain("raw-project-secret-marker");
  });

  it("maps a missing requirements entry file to invalid", async () => {
    const fixture = await createPythonFixture({requirements: null});

    await expect(fixture.provider()).resolves.toEqual({
      kind: "invalid",
      issues: ["The Python requirements entry file is missing."],
      durationMs: 5,
    });
    expect(fixture.run).not.toHaveBeenCalled();
  });

  it("rejects an oversized sparse requirements file before launching probes", async () => {
    const fixture = await createPythonFixture();
    await truncate(fixture.paths.pythonRequirements, 1_048_577);

    await expect(fixture.provider()).resolves.toEqual({
      kind: "invalid",
      issues: ["The Python requirements tree is malformed."],
      durationMs: 5,
    });
    expect(fixture.run).not.toHaveBeenCalled();
  });

  it("rejects a non-directory object at the canonical virtual-environment path", async () => {
    const fixture = await createPythonFixture({createVenv: false});
    await writeFile(resolve(fixture.paths.expRoot, ".venv"), "not-a-directory", "utf8");

    await expect(fixture.provider()).resolves.toEqual({
      kind: "invalid",
      issues: ["The canonical Python virtual-environment path is not a directory."],
      durationMs: 5,
    });
  });

  it("executes fresh observations for every provider invocation", async () => {
    const fixture = await createPythonFixture({createVenv: false});

    await expect(fixture.provider()).resolves.toMatchObject({kind: "available"});
    await expect(fixture.provider()).resolves.toMatchObject({kind: "available"});

    expect(fixture.run).toHaveBeenCalledTimes(6);
  });

  it("measures duration after all fact projection completes", async () => {
    const events: string[] = [];
    let current = 100;
    const fixture = await createPythonFixture({
      createVenv: false,
      clock: {
        monotonicNow: (): number => {
          events.push("clock");
          current += 5;
          return current;
        },
        isoTimestamp: (): string => "2025-01-01T00:00:00.000Z",
        delay: (): Promise<void> => Promise.resolve(),
      },
    });

    const outcome = await fixture.provider();

    expect(outcome).toMatchObject({kind: "available", durationMs: 5});
    expect(events).toEqual(["clock", "clock"]);
  });
});
