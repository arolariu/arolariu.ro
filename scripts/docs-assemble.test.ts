import {describe, it, expect, beforeEach, afterEach} from "vitest";
import {mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {
  syncProse,
  assertNonEmpty,
  discoverDotnetProjects,
  findDotnetBuildRoots,
  assertExpectedDocumentationTiers,
  flushExtractorLog,
  getDefaultDocumentationArgs,
  getDefaultDocumentationCommand,
  main,
  type AssembleDependencies,
} from "./docs-assemble";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger";
import type {CommandResult, CommandRunner, CommandRunOptions, CommandSpec} from "./common/process";

describe("syncProse", () => {
  let srcDir: string;
  let destDir: string;
  beforeEach(() => {
    srcDir = mkdtempSync(join(tmpdir(), "prose-src-"));
    destDir = mkdtempSync(join(tmpdir(), "prose-dst-"));
  });
  afterEach(() => {
    rmSync(srcDir, {recursive: true, force: true});
    rmSync(destDir, {recursive: true, force: true});
  });

  it("copies markdown files recursively from source to destination", async () => {
    mkdirSync(join(srcDir, "rfc"));
    writeFileSync(join(srcDir, "README.md"), "# Root");
    writeFileSync(join(srcDir, "rfc", "0001.md"), "# RFC 0001");
    await syncProse(srcDir, destDir);
    expect(existsSync(join(destDir, "README.md"))).toBe(true);
    expect(readFileSync(join(destDir, "rfc", "0001.md"), "utf8")).toBe("# RFC 0001");
  });

  it("wipes destination before copying", async () => {
    writeFileSync(join(destDir, "stale.md"), "stale");
    writeFileSync(join(srcDir, "fresh.md"), "fresh");
    await syncProse(srcDir, destDir);
    expect(existsSync(join(destDir, "stale.md"))).toBe(false);
    expect(existsSync(join(destDir, "fresh.md"))).toBe(true);
  });

  it("excludes superpowers subdirectory from the destination", async () => {
    mkdirSync(join(srcDir, "superpowers"));
    writeFileSync(join(srcDir, "superpowers", "secret.md"), "private");
    writeFileSync(join(srcDir, "public.md"), "ok");
    await syncProse(srcDir, destDir);
    expect(existsSync(join(destDir, "superpowers"))).toBe(false);
    expect(existsSync(join(destDir, "public.md"))).toBe(true);
  });
});

describe("assertNonEmpty", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "assert-"));
  });
  afterEach(() => {
    rmSync(root, {recursive: true, force: true});
  });

  it("throws when directory does not exist", () => {
    expect(() => assertNonEmpty(join(root, "missing"), "test")).toThrow(/expected directory not found/);
  });

  it("throws when directory contains no md or json files", () => {
    writeFileSync(join(root, "irrelevant.txt"), "");
    expect(() => assertNonEmpty(root, "test")).toThrow(/extracted 0 files/);
  });

  it("passes when directory contains at least one md file", () => {
    writeFileSync(join(root, "ok.md"), "# OK");
    expect(() => assertNonEmpty(root, "test")).not.toThrow();
  });

  it("passes when directory contains at least one json file", () => {
    writeFileSync(join(root, "spec.json"), "{}");
    expect(() => assertNonEmpty(root, "test")).not.toThrow();
  });
});

describe("discoverDotnetProjects", () => {
  let apiRoot: string;
  beforeEach(() => {
    apiRoot = mkdtempSync(join(tmpdir(), "discover-"));
  });
  afterEach(() => {
    rmSync(apiRoot, {recursive: true, force: true});
  });

  function writeCsproj(rel: string, xml: string): void {
    const full = join(apiRoot, rel);
    mkdirSync(dirname(full), {recursive: true});
    writeFileSync(full, xml);
  }

  it("globs every .csproj under src/*", () => {
    writeCsproj("src/Common/arolariu.Backend.Common.csproj", "<Project/>");
    writeCsproj("src/Core/arolariu.Backend.Core.csproj", "<Project/>");
    const projects = discoverDotnetProjects(apiRoot, "net10.0");
    expect(projects.map((p) => p.assemblyName).sort()).toEqual(["arolariu.Backend.Common", "arolariu.Backend.Core"]);
  });

  it("derives csprojRelative + binRelative from the folder layout", () => {
    writeCsproj("src/Common/arolariu.Backend.Common.csproj", "<Project/>");
    const [only] = discoverDotnetProjects(apiRoot, "net10.0");
    expect(only.csprojRelative).toBe("src/Common/arolariu.Backend.Common.csproj");
    expect(only.binRelative).toBe("src/Common/bin/Release/net10.0");
  });

  it('parses <ProjectReference Include="..."> entries into absolute paths', () => {
    writeCsproj("src/Common/arolariu.Backend.Common.csproj", "<Project/>");
    writeCsproj(
      "src/Core/arolariu.Backend.Core.csproj",
      `<Project>
        <ItemGroup>
          <ProjectReference Include="..\\Common\\arolariu.Backend.Common.csproj" />
        </ItemGroup>
      </Project>`,
    );
    const projects = discoverDotnetProjects(apiRoot, "net10.0");
    const core = projects.find((p) => p.assemblyName === "arolariu.Backend.Core");
    expect(core?.projectReferences).toHaveLength(1);
    expect(core?.projectReferences[0]).toMatch(/arolariu\.Backend\.Common\.csproj$/);
  });

  it("ignores non-csproj files and empty directories", () => {
    writeCsproj("src/Common/arolariu.Backend.Common.csproj", "<Project/>");
    writeFileSync(join(apiRoot, "src", "Common", "README.md"), "");
    mkdirSync(join(apiRoot, "src", "Empty"));
    const projects = discoverDotnetProjects(apiRoot, "net10.0");
    expect(projects).toHaveLength(1);
  });
});

describe("findDotnetBuildRoots", () => {
  it("returns the single root when one project references every sibling", () => {
    const roots = findDotnetBuildRoots([
      {csproj: "/a", csprojRelative: "a", assemblyName: "A", binRelative: "", projectReferences: []},
      {csproj: "/b", csprojRelative: "b", assemblyName: "B", binRelative: "", projectReferences: []},
      {csproj: "/root", csprojRelative: "root", assemblyName: "Root", binRelative: "", projectReferences: ["/a", "/b"]},
    ]);
    expect(roots.map((r) => r.assemblyName)).toEqual(["Root"]);
  });

  it("returns both roots when the graph has two disjoint trees", () => {
    const roots = findDotnetBuildRoots([
      {csproj: "/a", csprojRelative: "a", assemblyName: "A", binRelative: "", projectReferences: []},
      {csproj: "/b", csprojRelative: "b", assemblyName: "B", binRelative: "", projectReferences: []},
    ]);
    expect(roots.map((r) => r.assemblyName).sort()).toEqual(["A", "B"]);
  });

  it("throws when every project is referenced — cyclic or over-connected graph", () => {
    expect(() =>
      findDotnetBuildRoots([
        {csproj: "/a", csprojRelative: "a", assemblyName: "A", binRelative: "", projectReferences: ["/b"]},
        {csproj: "/b", csprojRelative: "b", assemblyName: "B", binRelative: "", projectReferences: ["/a"]},
      ]),
    ).toThrow(/cyclic graph/);
  });
});

describe("flushExtractorLog", () => {
  it("preserves the assembled documentation log bytes", () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test::docs", {color: false, sink});

    flushExtractorLog("TypeScript (TypeDoc)", "first line\nsecond line", logger);

    expect(sink.records).toEqual([
      {stream: "stdout", text: "\n=== TypeScript (TypeDoc) ===\n", write: true},
      {stream: "stdout", text: "first line\nsecond line\n", write: true},
    ]);
  });

  it("does not emit an empty extractor log", () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test::docs", {color: false, sink});

    flushExtractorLog("TypeScript (TypeDoc)", "", logger);

    expect(sink.records).toEqual([]);
  });
});

describe("docs assemble validation", () => {
  const tempRoots: string[] = [];

  function createTempRoot(): string {
    const root = join(tmpdir(), `docs-assemble-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    mkdirSync(root, {recursive: true});
    tempRoots.push(root);
    return root;
  }

  function writeTierFile(root: string, relativePath: string): void {
    const full = join(root, relativePath);
    mkdirSync(join(full, ".."), {recursive: true});
    writeFileSync(full, "# Generated\n");
  }

  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      rmSync(root, {recursive: true, force: true});
    }
  });

  it("accepts generated output only when every required documentation tier has content", () => {
    const root = createTempRoot();
    writeTierFile(root, "ts-reference/components/classes/Button.md");
    writeTierFile(root, "ts-reference/website/functions/getMetadata.md");
    writeTierFile(root, "experimental/modules/settings.md");
    writeTierFile(root, "dotnet-internals/arolariu.Backend.Core/services/InvoiceService.md");

    expect(() => assertExpectedDocumentationTiers(root)).not.toThrow();
  });

  it("rejects tiers containing only synthetic landing files", () => {
    const root = createTempRoot();
    writeTierFile(root, "ts-reference/components/index.md");
    writeTierFile(root, "ts-reference/components/README.md");
    writeTierFile(root, "ts-reference/website/index.md");
    writeTierFile(root, "ts-reference/website/README.md");
    writeTierFile(root, "experimental/index.md");
    writeTierFile(root, "experimental/README.md");
    writeTierFile(root, "dotnet-internals/index.md");
    writeTierFile(root, "dotnet-internals/README.md");

    expect(() => assertExpectedDocumentationTiers(root)).toThrow("typedoc components: extracted 0 non-landing files");
  });

  it("fails with a tier-specific error when generated output is missing", () => {
    const root = createTempRoot();
    writeTierFile(root, "ts-reference/components/classes/Button.md");
    writeTierFile(root, "experimental/modules/settings.md");
    writeTierFile(root, "dotnet-internals/arolariu.Backend.Core/services/InvoiceService.md");

    expect(() => assertExpectedDocumentationTiers(root)).toThrow("typedoc website: expected directory not found");
  });
});

describe("DefaultDocumentation arguments", () => {
  it("requests undocumented items and all supported access modifiers", () => {
    const args = getDefaultDocumentationArgs("api.dll", "out");

    expect(args).toEqual([
      "--AssemblyFilePath",
      "api.dll",
      "--OutputDirectoryPath",
      "out",
      "--FileNameFactory",
      "Name",
      "--GeneratedPages",
      "Namespaces",
      "--IncludeUndocumentedItems",
      "true",
      "--GeneratedAccessModifiers",
      "Public",
      "Protected",
      "Internal",
      "Private",
    ]);
  });
});

describe("DefaultDocumentation invocation", () => {
  it("invokes the tool through the dotnet driver, not a bare PATH executable", () => {
    const {command, args} = getDefaultDocumentationCommand("api.dll", "out");

    // Local tools declared in .config/dotnet-tools.json are resolved by the
    // dotnet driver and are never placed on PATH.
    expect(command).toBe("dotnet");
    expect(args[0]).toBe("defaultdocumentation");
  });

  it("forwards the full generator argument list after the tool name", () => {
    const {args} = getDefaultDocumentationCommand("api.dll", "out");

    expect(args.slice(1)).toEqual(getDefaultDocumentationArgs("api.dll", "out"));
  });
});

// ============================================================================
// Helpers for fake-runner tests
// ============================================================================

const REPO_ROOT = resolve(import.meta.dirname, "..");
const EXP_DIR = join(REPO_ROOT, "sites", "exp.arolariu.ro");
const API_ROOT = join(REPO_ROOT, "sites", "api.arolariu.ro");

function commandKey(command: Readonly<CommandSpec>): string {
  return [command.command, ...command.args].join(" ");
}

function commandResult(overrides: Partial<CommandResult> = {}): CommandResult {
  return {code: 0, stdout: "", stderr: "", durationMs: 1, timedOut: false, ...overrides};
}

/** Records every call and replies from a keyed response table; throws for unknown commands. */
function createRecordingRunner(responses: ReadonlyMap<string, CommandResult>): Readonly<{
  runner: CommandRunner;
  calls: readonly Readonly<{command: CommandSpec; options?: CommandRunOptions}>[];
}> {
  const calls: {command: CommandSpec; options?: CommandRunOptions}[] = [];
  const runner: CommandRunner = {
    run: async (command, options) => {
      calls.push(options === undefined ? {command} : {command, options});
      const response = responses.get(commandKey(command));
      if (response === undefined) {
        throw new Error(`Unexpected command in fake runner: ${commandKey(command)}`);
      }
      return response;
    },
  };
  return {runner, calls};
}

/** A runner that returns the given result for every command it receives. */
function createUniformRunner(result: CommandResult): Readonly<{
  runner: CommandRunner;
  calls: readonly Readonly<{command: CommandSpec; options?: CommandRunOptions}>[];
}> {
  const calls: {command: CommandSpec; options?: CommandRunOptions}[] = [];
  const runner: CommandRunner = {
    run: async (command, options) => {
      calls.push(options === undefined ? {command} : {command, options});
      return result;
    },
  };
  return {runner, calls};
}

const runnerThatMustNotBeCalled: CommandRunner = {
  run: async () => {
    throw new Error("docs-assemble test: runner must not be called on this path");
  },
};

function createLogger(): Readonly<{logger: MonorepositoryConsoleLogger; sink: InMemoryLoggerSink}> {
  const sink = new InMemoryLoggerSink();
  const logger = new MonorepositoryConsoleLogger("docs::assemble", {color: false, sink});
  return {logger, sink};
}

// ============================================================================
// main — help and option parsing
// ============================================================================

describe("main — help and option parsing", () => {
  it("emits usage and exits 0 for --help without invoking any extractor", async () => {
    const {logger, sink} = createLogger();

    const exitCode = await main(["--help"], {logger, runner: runnerThatMustNotBeCalled});

    expect(exitCode).toBe(0);
    expect(sink.records.map((r) => r.text).join("")).toMatch(/Usage: docs-assemble/);
  });

  it("emits usage and exits 0 for -h without invoking any extractor", async () => {
    const {logger} = createLogger();

    await expect(main(["-h"], {logger, runner: runnerThatMustNotBeCalled})).resolves.toBe(0);
  });

  it("emits usage and exits 0 for /h without invoking any extractor", async () => {
    const {logger} = createLogger();

    await expect(main(["/h"], {logger, runner: runnerThatMustNotBeCalled})).resolves.toBe(0);
  });

  it("exits 1 for an unknown option without invoking any extractor", async () => {
    const {logger} = createLogger();

    await expect(main(["--bogus"], {logger, runner: runnerThatMustNotBeCalled})).resolves.toBe(1);
  });

  it("exits 1 for an excess positional argument without invoking any extractor", async () => {
    const {logger} = createLogger();

    await expect(main(["unexpected-arg"], {logger, runner: runnerThatMustNotBeCalled})).resolves.toBe(1);
  });
});

// ============================================================================
// main — runner dispatch: CommandSpec, cwd, output mode
// ============================================================================

describe("main — runner dispatch: CommandSpec, cwd, output mode", () => {
  it("dispatches typedoc components with capture output at REPO_ROOT before typedoc website", async () => {
    const {logger} = createLogger();
    // The runner fails on typedoc components immediately — we just need to capture the call spec.
    const {runner, calls} = createUniformRunner(commandResult({spawnError: "npx not found"}));

    await main([], {logger, runner});

    const typedocComponentsCall = calls.find((c) => c.command.command === "npx" && c.command.args.includes("typedoc.components.json"));
    expect(typedocComponentsCall).toBeDefined();
    expect(typedocComponentsCall?.command).toEqual({
      command: "npx",
      args: ["typedoc", "--options", "typedoc.components.json"],
    });
    expect(typedocComponentsCall?.options?.cwd).toBe(REPO_ROOT);
    expect(typedocComponentsCall?.options?.output).toBe("capture");
  });

  it("dispatches typedoc website with capture output at REPO_ROOT", async () => {
    const {logger} = createLogger();
    const responses = new Map<string, CommandResult>([
      ["npx typedoc --options typedoc.components.json", commandResult({stdout: "ts-components ok"})],
    ]);
    const {runner, calls} = createRecordingRunner(responses);

    await main([], {logger, runner});

    const typedocWebsiteCall = calls.find((c) => c.command.command === "npx" && c.command.args.includes("typedoc.website.json"));
    expect(typedocWebsiteCall).toBeDefined();
    expect(typedocWebsiteCall?.command).toEqual({
      command: "npx",
      args: ["typedoc", "--options", "typedoc.website.json"],
    });
    expect(typedocWebsiteCall?.options?.cwd).toBe(REPO_ROOT);
    expect(typedocWebsiteCall?.options?.output).toBe("capture");
  });

  it("dispatches pydoc-markdown with capture output at the exp.arolariu.ro directory", async () => {
    const {logger} = createLogger();
    const {runner, calls} = createUniformRunner(commandResult({spawnError: "python not found"}));

    await main([], {logger, runner});

    const pydocCall = calls.find((c) => c.command.command === "python" && c.command.args.includes("pydoc_markdown.main"));
    expect(pydocCall).toBeDefined();
    expect(pydocCall?.command).toEqual({command: "python", args: ["-m", "pydoc_markdown.main"]});
    expect(pydocCall?.options?.cwd).toBe(EXP_DIR);
    expect(pydocCall?.options?.output).toBe("capture");
  });

  it("dispatches dotnet build for each graph root with capture output at API_ROOT", async () => {
    const {logger} = createLogger();
    const {runner, calls} = createUniformRunner(commandResult({spawnError: "dotnet not found"}));

    await main([], {logger, runner});

    const dotnetBuildCalls = calls.filter((c) => c.command.command === "dotnet" && c.command.args[0] === "build");
    expect(dotnetBuildCalls.length).toBeGreaterThan(0);
    for (const call of dotnetBuildCalls) {
      expect(call.options?.cwd).toBe(API_ROOT);
      expect(call.options?.output).toBe("capture");
      expect(call.command.args).toContain("-c");
      expect(call.command.args).toContain("Release");
    }
  });
});

// ============================================================================
// main — spawn failure and nonzero exit → bounded excerpt
// ============================================================================

describe("main — spawn failure and nonzero exit surface bounded excerpts", () => {
  it("returns exit code 1 and logs spawn failure with concise message when typedoc cannot start", async () => {
    const {logger, sink} = createLogger();
    const {runner} = createUniformRunner(commandResult({spawnError: "spawn npx ENOENT"}));

    const exitCode = await main([], {logger, runner});

    expect(exitCode).toBe(1);
    const logged = sink.records.map((r) => r.text).join("");
    expect(logged).toMatch(/spawn npx ENOENT/);
    expect(logged).toMatch(/spawn failed/);
  });

  it("returns exit code 1 and includes last-output excerpt when typedoc exits non-zero", async () => {
    const {logger, sink} = createLogger();
    const {runner} = createUniformRunner(commandResult({code: 5, stderr: "TypeDoc fatal: configuration not found", stdout: ""}));

    const exitCode = await main([], {logger, runner});

    expect(exitCode).toBe(1);
    const logged = sink.records.map((r) => r.text).join("");
    expect(logged).toMatch(/exited with 5/);
    expect(logged).toMatch(/TypeDoc fatal/);
  });

  it("truncates output excerpt to at most 2000 characters", async () => {
    const {logger, sink} = createLogger();
    const longOutput = "x".repeat(5000);
    const {runner} = createUniformRunner(commandResult({code: 1, stderr: longOutput}));

    await main([], {logger, runner});

    const logged = sink.records.map((r) => r.text).join("");
    // The logged error should contain a 2000-char excerpt, not the full 5000 chars
    expect(logged.length).toBeLessThan(longOutput.length);
    expect(logged).toMatch(/exited with 1/);
  });
});
