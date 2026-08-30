// @vitest-environment node
/**
 * @fileoverview Contract tests for read-only Python diagnostics.
 * @module scripts.doctor.python.test
 */

import {mkdir, mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {afterEach, describe, expect, it, vi, type Mock} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import type {CommandResult, CommandSpec} from "./common/process.ts";
import {createRepositoryPaths} from "./common/repository-paths.ts";
import type {RepositoryRequirements} from "./common/requirements.ts";
import {
  compareInstalledDistributions,
  parseRequirementsTree,
  pythonDoctorModule,
  RequirementsParseError,
  type ParsedRequirement,
} from "./doctor.python.ts";
import {
  PYTHON_INTERPRETER_METADATA_SNIPPET,
  type DiagnosticCommandRunner,
  type DiagnosticNetworkResult,
  type DoctorContext,
  type DoctorOptions,
} from "./doctor.types.ts";

const fixtureRoots: string[] = [];

const validRequirements: RepositoryRequirements = {
  node: {major: 24, minor: 0, patch: 0},
  npm: {major: 11, minor: 0, patch: 0},
  dotnet: {major: 10, minor: 0, patch: 0},
  python: {major: 3, minor: 12, patch: 0},
  packages: new Map(),
};

const SYSTEM_METADATA_COMMAND: Readonly<Record<"win32" | "posix", Readonly<CommandSpec>>> = {
  win32: {command: "py", args: ["-3.12", "-c", PYTHON_INTERPRETER_METADATA_SNIPPET]},
  posix: {command: "python3.12", args: ["-c", PYTHON_INTERPRETER_METADATA_SNIPPET]},
};
const VENV_PYTHON_RELATIVE: Readonly<Record<"win32" | "posix", string>> = {
  win32: ".venv\\Scripts\\python.exe",
  posix: ".venv/bin/python",
};
const VENV_METADATA_COMMAND: Readonly<Record<"win32" | "posix", Readonly<CommandSpec>>> = {
  win32: {command: VENV_PYTHON_RELATIVE.win32, args: ["-c", PYTHON_INTERPRETER_METADATA_SNIPPET]},
  posix: {command: VENV_PYTHON_RELATIVE.posix, args: ["-c", PYTHON_INTERPRETER_METADATA_SNIPPET]},
};
const VENV_PIP_VERSION_COMMAND: Readonly<Record<"win32" | "posix", Readonly<CommandSpec>>> = {
  win32: {command: VENV_PYTHON_RELATIVE.win32, args: ["-m", "pip", "--version"]},
  posix: {command: VENV_PYTHON_RELATIVE.posix, args: ["-m", "pip", "--version"]},
};
const VENV_PIP_LIST_COMMAND: Readonly<Record<"win32" | "posix", Readonly<CommandSpec>>> = {
  win32: {command: VENV_PYTHON_RELATIVE.win32, args: ["-m", "pip", "list", "--format", "json"]},
  posix: {command: VENV_PYTHON_RELATIVE.posix, args: ["-m", "pip", "list", "--format", "json"]},
};
const VENV_PIP_CHECK_COMMAND: Readonly<Record<"win32" | "posix", Readonly<CommandSpec>>> = {
  win32: {command: VENV_PYTHON_RELATIVE.win32, args: ["-m", "pip", "check"]},
  posix: {command: VENV_PYTHON_RELATIVE.posix, args: ["-m", "pip", "check"]},
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

function doctorOptions(patch: Partial<DoctorOptions> = {}): DoctorOptions {
  return {
    verbose: false,
    ci: false,
    score: false,
    json: false,
    quick: false,
    help: false,
    ...patch,
  };
}

function metadataOutput(
  input: Readonly<{executable: string; version?: string; prefix: string; basePrefix?: string}>,
): string {
  return JSON.stringify({
    executable: input.executable,
    version: input.version ?? "3.12.6",
    prefix: input.prefix,
    basePrefix: input.basePrefix ?? input.prefix,
    sitePackages: [],
  });
}

interface PythonFixture {
  readonly root: string;
  readonly context: DoctorContext;
  readonly run: Mock<DiagnosticCommandRunner["run"]>;
  readonly setResponse: (command: Readonly<CommandSpec>, result: CommandResult, cwd: string) => void;
  readonly expectedVenvDirectory: string;
  readonly venvPythonPath: string;
}

async function createPythonFixture(
  input: Readonly<{
    options?: Partial<DoctorOptions>;
    requirementsValid?: boolean;
    platform?: NodeJS.Platform;
    networkResult?: DiagnosticNetworkResult;
    requirementsTxt?: string;
    requirementsDevTxt?: string;
    templateConfig?: Readonly<Record<string, string>>;
    dockerConfig?: Readonly<Record<string, string>>;
    /** Pass `null` to omit config.aspire.json entirely; omit the field for the default fixture content. */
    aspireConfig?: string | null;
  }> = {},
): Promise<PythonFixture> {
  const root = await mkdtemp(join(tmpdir(), "arolariu-doctor-python-"));
  fixtureRoots.push(root);
  const paths = createRepositoryPaths(root);
  const platform = input.platform ?? "win32";
  const isWin32 = platform === "win32";
  const kind = isWin32 ? "win32" : "posix";

  const expectedVenvDirectory = isWin32 ? `${paths.expRoot}\\.venv` : `${paths.expRoot}/.venv`;
  const venvPythonPath = isWin32 ? `${expectedVenvDirectory}\\Scripts\\python.exe` : `${expectedVenvDirectory}/bin/python`;
  const systemPythonPath = isWin32 ? resolve(root, "Python312", "python.exe") : resolve(root, "usr", "bin", "python3.12");

  await mkdir(paths.expRoot, {recursive: true});
  await writeFile(resolve(paths.expRoot, "requirements.txt"), input.requirementsTxt ?? "requests==2.31.0\n", "utf8");
  await writeFile(
    paths.pythonRequirements,
    input.requirementsDevTxt ?? "# Dev-only dependencies\n-r requirements.txt\npytest==8.3.2\n",
    "utf8",
  );
  await writeFile(
    resolve(paths.expRoot, "config.template.json"),
    JSON.stringify(input.templateConfig ?? {"Auth:Clerk:PublishableKey": "template-value", "Site:Name": "template-name"}),
    "utf8",
  );
  await writeFile(
    resolve(paths.expRoot, "config.docker.json"),
    JSON.stringify(
      input.dockerConfig
      ?? {"Auth:Clerk:PublishableKey": "docker-value", "Site:Name": "docker-name", "Endpoints:AI:OpenAI": "extra-docker-only-key"},
    ),
    "utf8",
  );
  if (input.aspireConfig !== null) {
    await writeFile(resolve(paths.expRoot, "config.aspire.json"), input.aspireConfig ?? JSON.stringify({Generated: true}), "utf8");
  }

  const responses = new Map<string, CommandResult>();
  const setResponse = (command: Readonly<CommandSpec>, result: CommandResult, cwd: string): void => {
    responses.set(commandKey(command, cwd), result);
  };

  setResponse(
    SYSTEM_METADATA_COMMAND[kind],
    commandResult({stdout: metadataOutput({executable: systemPythonPath, prefix: resolve(root, "Python312")})}),
    paths.root,
  );
  setResponse(
    VENV_METADATA_COMMAND[kind],
    commandResult({stdout: metadataOutput({executable: venvPythonPath, prefix: expectedVenvDirectory, basePrefix: resolve(root, "Python312")})}),
    paths.expRoot,
  );
  setResponse(VENV_PIP_VERSION_COMMAND[kind], commandResult({stdout: "pip 24.0 from .venv (python 3.12)\n"}), paths.expRoot);
  setResponse(
    VENV_PIP_LIST_COMMAND[kind],
    commandResult({stdout: JSON.stringify([{name: "requests", version: "2.31.0"}, {name: "pytest", version: "8.3.2"}])}),
    paths.expRoot,
  );
  setResponse(VENV_PIP_CHECK_COMMAND[kind], commandResult({stdout: "No broken requirements found.\n"}), paths.expRoot);

  const run = vi.fn<DiagnosticCommandRunner["run"]>(
    async (command: Readonly<CommandSpec>, options): Promise<CommandResult> =>
      responses.get(commandKey(command, options?.cwd))
      ?? commandResult({code: 127, spawnError: `Unexpected command ${command.command}`}),
  );
  const runner: DiagnosticCommandRunner = {run};
  const networkGet = vi.fn(
    async (): Promise<DiagnosticNetworkResult> =>
      input.networkResult ?? {
        status: "reachable",
        statusCode: 200,
        durationMs: 3,
        body: JSON.stringify({info: {name: "pip"}}),
      },
  );
  const sink = new InMemoryLoggerSink();
  let now = 0;
  const context: DoctorContext = {
    options: doctorOptions(input.options),
    paths,
    requirements:
      input.requirementsValid === false
        ? {status: "invalid", errors: ["pyproject.toml#requires-python uses unsupported syntax; expected >=3.12"]}
        : {status: "valid", requirements: validRequirements},
    runner,
    network: {get: networkGet},
    logger: new MonorepositoryConsoleLogger("doctor::python", {color: false, sink}),
    platform,
    arch: "x64",
    env: {},
    now: () => ++now,
  };

  return {root, context, run, setResponse, expectedVenvDirectory, venvPythonPath};
}

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map((root) => rm(root, {recursive: true, force: true})));
});

describe("parseRequirementsTree", () => {
  it("recursively resolves -r includes and normalizes PEP 503 distribution names", async () => {
    const devPath = resolve("virtual-repo", "requirements-dev.txt");
    const basePath = resolve("virtual-repo", "requirements.txt");
    const files: Record<string, string> = {
      [devPath]: "# comment\n-r requirements.txt\npytest==8.3.2\n",
      [basePath]: "Azure_Identity==1.25.3\nFastAPI.Core==0.141.1  # inline comment\n",
    };

    const parsed = await parseRequirementsTree(devPath, async (path) => {
      const contents = files[path];
      if (contents === undefined) {
        throw new Error(`ENOENT: ${path}`);
      }
      return contents;
    });

    expect(parsed).toEqual<readonly ParsedRequirement[]>([
      {name: "azure-identity", specifier: "1.25.3", source: basePath},
      {name: "fastapi-core", specifier: "0.141.1", source: basePath},
      {name: "pytest", specifier: "8.3.2", source: devPath},
    ]);
  });

  it("rejects a circular -r include", async () => {
    const aPath = resolve("virtual-repo", "a.txt");
    const bPath = resolve("virtual-repo", "b.txt");
    const files: Record<string, string> = {
      [aPath]: "-r b.txt\n",
      [bPath]: "-r a.txt\n",
    };

    await expect(
      parseRequirementsTree(aPath, async (path) => files[path] ?? Promise.reject(new Error("ENOENT"))),
    ).rejects.toThrow(RequirementsParseError);
  });

  it("rejects a duplicate -r include of the same file", async () => {
    const rootPath = resolve("virtual-repo", "root.txt");
    const sharedPath = resolve("virtual-repo", "shared.txt");
    const files: Record<string, string> = {
      [rootPath]: "-r shared.txt\n-r shared.txt\n",
      [sharedPath]: "requests==2.31.0\n",
    };

    await expect(
      parseRequirementsTree(rootPath, async (path) => files[path] ?? Promise.reject(new Error("ENOENT"))),
    ).rejects.toThrow(/Duplicate requirements include/u);
  });

  it("rejects a duplicate requirement name declared in two files", async () => {
    const rootPath = resolve("virtual-repo", "root.txt");
    const includedPath = resolve("virtual-repo", "included.txt");
    const files: Record<string, string> = {
      [rootPath]: "-r included.txt\nrequests==2.31.0\n",
      [includedPath]: "Requests==2.30.0\n",
    };

    await expect(
      parseRequirementsTree(rootPath, async (path) => files[path] ?? Promise.reject(new Error("ENOENT"))),
    ).rejects.toThrow(/Duplicate requirement 'requests'/u);
  });

  it("rejects a non-exact requirement specifier as malformed/unsupported", async () => {
    const rootPath = resolve("virtual-repo", "root.txt");
    const files: Record<string, string> = {[rootPath]: "opentelemetry-exporter-otlp-proto-http~=1.43\n"};

    await expect(
      parseRequirementsTree(rootPath, async (path) => files[path] ?? Promise.reject(new Error("ENOENT"))),
    ).rejects.toThrow(/only exact == pins are supported/u);
  });

  it("rejects a malformed -r include directive with no path", async () => {
    const rootPath = resolve("virtual-repo", "root.txt");
    const files: Record<string, string> = {[rootPath]: '-r ""\n'};

    await expect(
      parseRequirementsTree(rootPath, async (path) => files[path] ?? Promise.reject(new Error("ENOENT"))),
    ).rejects.toThrow(/Malformed requirements include directive/u);
  });
});

describe("compareInstalledDistributions", () => {
  it("reports no gaps when every pin is installed at its exact version", () => {
    const requirements: readonly ParsedRequirement[] = [{name: "requests", specifier: "2.31.0", source: "requirements.txt"}];
    const comparison = compareInstalledDistributions(requirements, [{name: "requests", version: "2.31.0"}]);

    expect(comparison).toEqual({missing: [], mismatched: []});
  });

  it("reports a missing distribution", () => {
    const requirements: readonly ParsedRequirement[] = [{name: "requests", specifier: "2.31.0", source: "requirements.txt"}];
    const comparison = compareInstalledDistributions(requirements, []);

    expect(comparison.missing).toEqual(["requests==2.31.0"]);
    expect(comparison.mismatched).toEqual([]);
  });

  it("reports a version mismatch and normalizes distribution names before comparing", () => {
    const requirements: readonly ParsedRequirement[] = [{name: "azure-identity", specifier: "1.25.3", source: "requirements.txt"}];
    const comparison = compareInstalledDistributions(requirements, [{name: "Azure_Identity", version: "1.25.2"}]);

    expect(comparison.missing).toEqual([]);
    expect(comparison.mismatched).toEqual(["azure-identity requires 1.25.3 but 1.25.2 is installed."]);
  });
});

describe("pythonDoctorModule", () => {
  it("returns every stable python check in order for a healthy win32 baseline", async () => {
    const fixture = await createPythonFixture({platform: "win32"});

    const results = await pythonDoctorModule.run(fixture.context);

    expect(results.map(({id}) => id)).toEqual([
      "python.runtime",
      "python.virtual-environment",
      "python.pip",
      "python.requirements",
      "python.conflicts",
      "python.configuration",
      "python.pypi",
    ]);
    expect(results.every(({status}) => status === "pass")).toBe(true);
    expect(results.every(({module}) => module === "python")).toBe(true);
  });

  it("returns every stable python check in order for a healthy posix baseline", async () => {
    const fixture = await createPythonFixture({platform: "linux"});

    const results = await pythonDoctorModule.run(fixture.context);

    expect(results.map(({id}) => id)).toEqual([
      "python.runtime",
      "python.virtual-environment",
      "python.pip",
      "python.requirements",
      "python.conflicts",
      "python.configuration",
      "python.pypi",
    ]);
    expect(results.every(({status}) => status === "pass")).toBe(true);
  });

  it("issues the fixed metadata snippet exported by doctor.types.ts to both the system and venv probes", async () => {
    const fixture = await createPythonFixture({platform: "win32"});

    await pythonDoctorModule.run(fixture.context);

    expect(fixture.run).toHaveBeenCalledWith(
      {command: "py", args: ["-3.12", "-c", PYTHON_INTERPRETER_METADATA_SNIPPET]},
      expect.objectContaining({cwd: fixture.context.paths.root}),
    );
    expect(fixture.run).toHaveBeenCalledWith(
      {command: ".venv\\Scripts\\python.exe", args: ["-c", PYTHON_INTERPRETER_METADATA_SNIPPET]},
      expect.objectContaining({cwd: fixture.context.paths.expRoot}),
    );
  });

  it("fails python.runtime when the Windows py -3.12 launcher is missing", async () => {
    const fixture = await createPythonFixture({platform: "win32"});
    fixture.setResponse(
      SYSTEM_METADATA_COMMAND.win32,
      commandResult({code: 127, spawnError: "not recognized as an internal or external command"}),
      fixture.context.paths.root,
    );

    const results = await pythonDoctorModule.run(fixture.context);

    const runtime = results.find(({id}) => id === "python.runtime");
    expect(runtime?.status).toBe("fail");
    expect(runtime?.summary).toContain("No compatible system Python interpreter");
  });

  it("fails python.runtime when the Unix python3.12 interpreter is missing", async () => {
    const fixture = await createPythonFixture({platform: "linux"});
    fixture.setResponse(
      SYSTEM_METADATA_COMMAND.posix,
      commandResult({code: 127, spawnError: "ENOENT"}),
      fixture.context.paths.root,
    );

    const results = await pythonDoctorModule.run(fixture.context);

    const runtime = results.find(({id}) => id === "python.runtime");
    expect(runtime?.status).toBe("fail");
    expect(runtime?.summary).toContain("No compatible system Python interpreter");
  });

  it("fails python.runtime when the system interpreter is older than the repository minimum", async () => {
    const fixture = await createPythonFixture({platform: "win32"});
    fixture.setResponse(
      SYSTEM_METADATA_COMMAND.win32,
      commandResult({stdout: metadataOutput({executable: "C:\\Python310\\python.exe", version: "3.10.9", prefix: "C:\\Python310"})}),
      fixture.context.paths.root,
    );

    const results = await pythonDoctorModule.run(fixture.context);

    const runtime = results.find(({id}) => id === "python.runtime");
    expect(runtime?.status).toBe("fail");
    expect(runtime?.summary).toContain("does not satisfy the repository minimum");
  });

  it("fails python.runtime when the system probe returns malformed JSON", async () => {
    const fixture = await createPythonFixture({platform: "win32"});
    fixture.setResponse(SYSTEM_METADATA_COMMAND.win32, commandResult({stdout: "not-json"}), fixture.context.paths.root);

    const results = await pythonDoctorModule.run(fixture.context);

    const runtime = results.find(({id}) => id === "python.runtime");
    expect(runtime?.status).toBe("fail");
    expect(runtime?.summary).toContain("malformed metadata");
  });

  it("skips python.runtime and python.virtual-environment when repository requirements are invalid", async () => {
    const fixture = await createPythonFixture({platform: "win32", requirementsValid: false});

    const results = await pythonDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "python.runtime")?.status).toBe("skipped");
    expect(results.find(({id}) => id === "python.virtual-environment")?.status).toBe("skipped");
    expect(results.find(({id}) => id === "python.pip")?.status).toBe("skipped");
    expect(results.find(({id}) => id === "python.requirements")?.status).toBe("skipped");
    expect(results.find(({id}) => id === "python.conflicts")?.status).toBe("skipped");
    expect(results.find(({id}) => id === "python.configuration")?.status).toBe("pass");
    expect(results.find(({id}) => id === "python.pypi")?.status).toBe("pass");
  });

  it("fails python.virtual-environment and cascades explicit skips naming the blocker when the venv is absent", async () => {
    const fixture = await createPythonFixture({platform: "win32"});
    fixture.setResponse(
      VENV_METADATA_COMMAND.win32,
      commandResult({code: 127, spawnError: "ENOENT: no such file or directory"}),
      fixture.context.paths.expRoot,
    );

    const results = await pythonDoctorModule.run(fixture.context);

    const virtualEnvironment = results.find(({id}) => id === "python.virtual-environment");
    expect(virtualEnvironment?.status).toBe("fail");
    expect(virtualEnvironment?.summary).toContain("not found");

    for (const id of ["python.pip", "python.requirements", "python.conflicts"] as const) {
      const result = results.find((entry) => entry.id === id);
      expect(result?.status).toBe("skipped");
      expect(result?.evidence.join("\n")).toContain("python.virtual-environment");
    }

    expect(results.find(({id}) => id === "python.configuration")?.status).toBe("pass");
    expect(results.find(({id}) => id === "python.pypi")?.status).toBe("pass");
  });

  it("fails python.virtual-environment when its Python version is older than the repository minimum", async () => {
    const fixture = await createPythonFixture({platform: "win32"});
    fixture.setResponse(
      VENV_METADATA_COMMAND.win32,
      commandResult({
        stdout: metadataOutput({executable: fixture.venvPythonPath, version: "3.10.1", prefix: fixture.expectedVenvDirectory, basePrefix: "C:\\Python312"}),
      }),
      fixture.context.paths.expRoot,
    );

    const results = await pythonDoctorModule.run(fixture.context);

    const virtualEnvironment = results.find(({id}) => id === "python.virtual-environment");
    expect(virtualEnvironment?.status).toBe("fail");
    expect(virtualEnvironment?.summary).toContain("does not satisfy the repository minimum");
    expect(results.find(({id}) => id === "python.pip")?.status).toBe("skipped");
  });

  it("fails python.virtual-environment when the interpreter is outside the canonical .venv directory", async () => {
    const fixture = await createPythonFixture({platform: "win32"});
    const outsideExecutable = resolve(fixture.root, "Some", "Other", "python.exe");
    fixture.setResponse(
      VENV_METADATA_COMMAND.win32,
      commandResult({stdout: metadataOutput({executable: outsideExecutable, prefix: outsideExecutable})}),
      fixture.context.paths.expRoot,
    );

    const results = await pythonDoctorModule.run(fixture.context);

    const virtualEnvironment = results.find(({id}) => id === "python.virtual-environment");
    expect(virtualEnvironment?.status).toBe("fail");
    expect(virtualEnvironment?.summary).toContain("not owned by the canonical");
  });

  it("fails python.virtual-environment when sys.prefix does not identify an isolated environment", async () => {
    const fixture = await createPythonFixture({platform: "win32"});
    fixture.setResponse(
      VENV_METADATA_COMMAND.win32,
      commandResult({
        stdout: metadataOutput({executable: fixture.venvPythonPath, prefix: "C:\\Python312", basePrefix: "C:\\Python312"}),
      }),
      fixture.context.paths.expRoot,
    );

    const results = await pythonDoctorModule.run(fixture.context);

    const virtualEnvironment = results.find(({id}) => id === "python.virtual-environment");
    expect(virtualEnvironment?.status).toBe("fail");
    expect(virtualEnvironment?.summary).toContain("does not identify itself as an isolated");
  });

  it("fails python.virtual-environment when the venv probe returns malformed JSON", async () => {
    const fixture = await createPythonFixture({platform: "win32"});
    fixture.setResponse(VENV_METADATA_COMMAND.win32, commandResult({stdout: "not-json"}), fixture.context.paths.expRoot);

    const results = await pythonDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "python.virtual-environment")?.status).toBe("fail");
    expect(results.find(({id}) => id === "python.pip")?.status).toBe("skipped");
  });

  it("independently fails python.pip when pip is absent without skipping python.virtual-environment", async () => {
    const fixture = await createPythonFixture({platform: "win32"});
    fixture.setResponse(
      VENV_PIP_VERSION_COMMAND.win32,
      commandResult({code: 1, stderr: "C:\\...\\python.exe: No module named pip\n"}),
      fixture.context.paths.expRoot,
    );

    const results = await pythonDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "python.virtual-environment")?.status).toBe("pass");
    expect(results.find(({id}) => id === "python.pip")?.status).toBe("fail");
  });

  it("fails python.requirements when a pinned distribution is missing", async () => {
    const fixture = await createPythonFixture({platform: "win32"});
    fixture.setResponse(
      VENV_PIP_LIST_COMMAND.win32,
      commandResult({stdout: JSON.stringify([{name: "requests", version: "2.31.0"}])}),
      fixture.context.paths.expRoot,
    );

    const results = await pythonDoctorModule.run(fixture.context);

    const requirements = results.find(({id}) => id === "python.requirements");
    expect(requirements?.status).toBe("fail");
    expect(requirements?.evidence.join("\n")).toContain("Missing: pytest==8.3.2");
  });

  it("fails python.requirements when an installed version does not match its pin", async () => {
    const fixture = await createPythonFixture({platform: "win32"});
    fixture.setResponse(
      VENV_PIP_LIST_COMMAND.win32,
      commandResult({stdout: JSON.stringify([{name: "requests", version: "2.31.0"}, {name: "pytest", version: "8.0.0"}])}),
      fixture.context.paths.expRoot,
    );

    const results = await pythonDoctorModule.run(fixture.context);

    const requirements = results.find(({id}) => id === "python.requirements");
    expect(requirements?.status).toBe("fail");
    expect(requirements?.evidence.join("\n")).toContain("Mismatched: pytest requires 8.3.2 but 8.0.0 is installed.");
  });

  it("fails python.requirements when pip list returns malformed JSON", async () => {
    const fixture = await createPythonFixture({platform: "win32"});
    fixture.setResponse(VENV_PIP_LIST_COMMAND.win32, commandResult({stdout: "not-json"}), fixture.context.paths.expRoot);

    const results = await pythonDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "python.requirements")?.status).toBe("fail");
  });

  it("fails python.requirements when the repository requirements tree contains a non-exact pin", async () => {
    const fixture = await createPythonFixture({platform: "win32", requirementsTxt: "opentelemetry-exporter-otlp-proto-http~=1.43\n"});

    const results = await pythonDoctorModule.run(fixture.context);

    const requirements = results.find(({id}) => id === "python.requirements");
    expect(requirements?.status).toBe("fail");
    expect(requirements?.rootCause).toContain("only exact == pins are supported");
  });

  it("fails python.conflicts when pip check reports broken requirement sets", async () => {
    const fixture = await createPythonFixture({platform: "win32"});
    fixture.setResponse(
      VENV_PIP_CHECK_COMMAND.win32,
      commandResult({code: 1, stdout: "some-package 1.0.0 requires other-package>=2.0.0, but you have other-package 1.0.0.\n"}),
      fixture.context.paths.expRoot,
    );

    const results = await pythonDoctorModule.run(fixture.context);

    const conflicts = results.find(({id}) => id === "python.conflicts");
    expect(conflicts?.status).toBe("fail");
    expect(conflicts?.summary).toContain("dependency conflicts");
  });

  it("fails python.configuration when config.docker.json is missing a template-required key", async () => {
    const fixture = await createPythonFixture({
      platform: "win32",
      templateConfig: {"Auth:Clerk:PublishableKey": "a", "Site:Name": "b", "Only:In:Template": "c"},
      dockerConfig: {"Auth:Clerk:PublishableKey": "a2", "Site:Name": "b2"},
    });

    const results = await pythonDoctorModule.run(fixture.context);

    const configuration = results.find(({id}) => id === "python.configuration");
    expect(configuration?.status).toBe("fail");
    expect(configuration?.evidence).toContain("Missing key: Only:In:Template");
    expect(JSON.stringify(configuration)).not.toContain("template-value");
  });

  it("passes python.configuration when config.docker.json declares extra keys beyond the template", async () => {
    const fixture = await createPythonFixture({platform: "win32"});

    const results = await pythonDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "python.configuration")?.status).toBe("pass");
  });

  it("passes python.configuration and notes absence when config.aspire.json does not yet exist", async () => {
    const fixture = await createPythonFixture({platform: "win32", aspireConfig: null});

    const results = await pythonDoctorModule.run(fixture.context);

    const configuration = results.find(({id}) => id === "python.configuration");
    expect(configuration?.status).toBe("pass");
    expect(configuration?.evidence.join("\n")).toContain("absent");
  });

  it("warns python.configuration when config.aspire.json is present but not valid JSON", async () => {
    const fixture = await createPythonFixture({platform: "win32", aspireConfig: "not-json"});

    const results = await pythonDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "python.configuration")?.status).toBe("warn");
  });

  it("skips python.pypi without a network call in quick mode", async () => {
    const fixture = await createPythonFixture({platform: "win32", options: {quick: true}});

    const results = await pythonDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "python.pypi")?.status).toBe("skipped");
    expect(fixture.context.network.get).not.toHaveBeenCalled();
  });

  it("skips python.pypi when the network probe is unreachable", async () => {
    const fixture = await createPythonFixture({
      platform: "win32",
      networkResult: {status: "unavailable", durationMs: 2, error: "getaddrinfo ENOTFOUND pypi.org"},
    });

    const results = await pythonDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "python.pypi")?.status).toBe("skipped");
  });

  it("warns python.pypi when the response status code is not 200", async () => {
    const fixture = await createPythonFixture({
      platform: "win32",
      networkResult: {status: "reachable", statusCode: 503, durationMs: 5, body: "Service Unavailable"},
    });

    const results = await pythonDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "python.pypi")?.status).toBe("warn");
  });

  it("warns python.pypi when the response body is malformed or not the expected pip package index", async () => {
    const fixture = await createPythonFixture({
      platform: "win32",
      networkResult: {status: "reachable", statusCode: 200, durationMs: 5, body: "not-json"},
    });

    const results = await pythonDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "python.pypi")?.status).toBe("warn");
  });

  it("passes python.pypi for a well-formed reachable pip package index response", async () => {
    const fixture = await createPythonFixture({platform: "win32"});

    const results = await pythonDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "python.pypi")?.status).toBe("pass");
  });
});
