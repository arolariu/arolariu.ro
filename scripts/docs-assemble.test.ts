// @vitest-environment node
/**
 * @fileoverview Tests for the documentation assembly command and its business helpers.
 * @module scripts/docs-assemble.test
 *
 * @remarks
 * Every scenario runs through deterministic in-memory fixtures: pure helpers (`syncProse`,
 * `assertNonEmpty`, project discovery, build roots, `DefaultDocumentation` argument building, and
 * tier validation) are exercised directly against a fake {@link FileSystem}, while
 * {@link createDocsAssembleCommand} scenarios run through the declarative command runtime's test
 * factory with a fake {@link ProcessRunner} that simulates extractor output instead of spawning
 * TypeDoc, pydoc-markdown, or DefaultDocumentation. No test in this file touches real disk,
 * spawns a real process, or reads the live checkout.
 */

import {join} from "node:path";
import {describe, expect, it} from "vitest";

import {createRepositoryPaths, type RepositoryPaths} from "./common/repository-paths.ts";
import {AbstractProcessRunner, type ProcessOutcome, type ProcessRequest, type ProcessRunOptions} from "./common/runner.ts";
import {createMemoryFileSystem, createTestRuntimeFactory, repositoryFixtureRoot} from "./common/runtime.testing.ts";
import type {FileSystem} from "./common/runtime.ts";
import {
  assertExpectedDocumentationTiers,
  assertNonEmpty,
  createDocsAssembleCommand,
  discoverDotnetProjects,
  findDotnetBuildRoots,
  getDefaultDocumentationArgs,
  getDefaultDocumentationCommand,
  syncProse,
} from "./docs-assemble.ts";

// ============================================================================
// syncProse
// ============================================================================

describe("syncProse", () => {
  it("copies markdown files recursively from source to destination", async () => {
    const files = createMemoryFileSystem({"/src/README.md": "# Root", "/src/rfc/0001.md": "# RFC 0001"});
    await syncProse(files, "/src", "/dest");
    expect(await files.exists("/dest/README.md")).toBe(true);
    expect(await files.readText("/dest/rfc/0001.md")).toBe("# RFC 0001");
  });

  it("wipes destination before copying", async () => {
    const files = createMemoryFileSystem({"/dest/stale.md": "stale", "/src/fresh.md": "fresh"});
    await syncProse(files, "/src", "/dest");
    expect(await files.exists("/dest/stale.md")).toBe(false);
    expect(await files.exists("/dest/fresh.md")).toBe(true);
  });

  it("excludes superpowers subdirectory from the destination", async () => {
    const files = createMemoryFileSystem({"/src/superpowers/secret.md": "private", "/src/public.md": "ok"});
    await syncProse(files, "/src", "/dest");
    expect(await files.exists("/dest/superpowers")).toBe(false);
    expect(await files.exists("/dest/public.md")).toBe(true);
  });
});

// ============================================================================
// assertNonEmpty
// ============================================================================

describe("assertNonEmpty", () => {
  it("throws when directory does not exist", async () => {
    const files = createMemoryFileSystem();
    await expect(assertNonEmpty(files, "/missing", "test")).rejects.toThrow(/expected directory not found/);
  });

  it("throws when directory contains no md or json files", async () => {
    const files = createMemoryFileSystem({"/root/irrelevant.txt": ""});
    await expect(assertNonEmpty(files, "/root", "test")).rejects.toThrow(/extracted 0 files/);
  });

  it("passes when directory contains at least one md file", async () => {
    const files = createMemoryFileSystem({"/root/ok.md": "# OK"});
    await expect(assertNonEmpty(files, "/root", "test")).resolves.toBeUndefined();
  });

  it("passes when directory contains at least one json file", async () => {
    const files = createMemoryFileSystem({"/root/spec.json": "{}"});
    await expect(assertNonEmpty(files, "/root", "test")).resolves.toBeUndefined();
  });
});

// ============================================================================
// discoverDotnetProjects
// ============================================================================

describe("discoverDotnetProjects", () => {
  it("globs every .csproj under src/*", async () => {
    const files = createMemoryFileSystem({
      "/api/src/Common/arolariu.Backend.Common.csproj": "<Project/>",
      "/api/src/Core/arolariu.Backend.Core.csproj": "<Project/>",
    });
    const projects = await discoverDotnetProjects(files, "/api", "net10.0");
    expect(projects.map((p) => p.assemblyName).toSorted()).toEqual(["arolariu.Backend.Common", "arolariu.Backend.Core"]);
  });

  it("derives csprojRelative + binRelative from the folder layout", async () => {
    const files = createMemoryFileSystem({"/api/src/Common/arolariu.Backend.Common.csproj": "<Project/>"});
    const [only] = await discoverDotnetProjects(files, "/api", "net10.0");
    expect(only).toBeDefined();
    if (!only) return;
    expect(only.csprojRelative).toBe("src/Common/arolariu.Backend.Common.csproj");
    expect(only.binRelative).toBe("src/Common/bin/Release/net10.0");
  });

  it('parses <ProjectReference Include="..."> entries into absolute paths', async () => {
    const files = createMemoryFileSystem({
      "/api/src/Common/arolariu.Backend.Common.csproj": "<Project/>",
      "/api/src/Core/arolariu.Backend.Core.csproj": `<Project>
        <ItemGroup>
          <ProjectReference Include="..\\Common\\arolariu.Backend.Common.csproj" />
        </ItemGroup>
      </Project>`,
    });
    const projects = await discoverDotnetProjects(files, "/api", "net10.0");
    const core = projects.find((p) => p.assemblyName === "arolariu.Backend.Core");
    expect(core?.projectReferences).toHaveLength(1);
    expect(core?.projectReferences[0]).toMatch(/arolariu\.Backend\.Common\.csproj$/);
  });

  it("ignores non-csproj files and empty directories", async () => {
    const files = createMemoryFileSystem({
      "/api/src/Common/arolariu.Backend.Common.csproj": "<Project/>",
      "/api/src/Common/README.md": "",
    });
    await files.createDirectory("/api/src/Empty", {recursive: true});
    const projects = await discoverDotnetProjects(files, "/api", "net10.0");
    expect(projects).toHaveLength(1);
  });
});

// ============================================================================
// findDotnetBuildRoots
// ============================================================================

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
    expect(roots.map((r) => r.assemblyName).toSorted()).toEqual(["A", "B"]);
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

// ============================================================================
// DefaultDocumentation argument and command building
// ============================================================================

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
// assertExpectedDocumentationTiers
// ============================================================================

describe("assertExpectedDocumentationTiers", () => {
  function writeTierFile(files: FileSystem, root: string, relativePath: string): Promise<void> {
    return files.writeTextAtomic(join(root, relativePath), "# Generated\n");
  }

  it("accepts generated output only when every required documentation tier has content", async () => {
    const files = createMemoryFileSystem();
    const root = "/tiers-ok";
    await writeTierFile(files, root, "ts-reference/components/classes/Button.md");
    await writeTierFile(files, root, "ts-reference/website/functions/getMetadata.md");
    await writeTierFile(files, root, "experimental/modules/settings.md");
    await writeTierFile(files, root, "dotnet-internals/arolariu.Backend.Core/services/InvoiceService.md");

    await expect(assertExpectedDocumentationTiers(files, root)).resolves.toBeUndefined();
  });

  it("rejects tiers containing only synthetic landing files", async () => {
    const files = createMemoryFileSystem();
    const root = "/tiers-landing-only";
    await writeTierFile(files, root, "ts-reference/components/index.md");
    await writeTierFile(files, root, "ts-reference/components/README.md");
    await writeTierFile(files, root, "ts-reference/website/index.md");
    await writeTierFile(files, root, "ts-reference/website/README.md");
    await writeTierFile(files, root, "experimental/index.md");
    await writeTierFile(files, root, "experimental/README.md");
    await writeTierFile(files, root, "dotnet-internals/index.md");
    await writeTierFile(files, root, "dotnet-internals/README.md");

    await expect(assertExpectedDocumentationTiers(files, root)).rejects.toThrow("typedoc components: extracted 0 non-landing files");
  });

  it("fails with a tier-specific error when generated output is missing", async () => {
    const files = createMemoryFileSystem();
    const root = "/tiers-missing";
    await writeTierFile(files, root, "ts-reference/components/classes/Button.md");
    await writeTierFile(files, root, "experimental/modules/settings.md");
    await writeTierFile(files, root, "dotnet-internals/arolariu.Backend.Core/services/InvoiceService.md");

    await expect(assertExpectedDocumentationTiers(files, root)).rejects.toThrow("typedoc website: expected directory not found");
  });
});

// ============================================================================
// createDocsAssembleCommand — fixture repository layout
// ============================================================================

/** Canonical paths of the in-memory repository fixture every command test resolves. */
const FIXTURE_PATHS: RepositoryPaths = createRepositoryPaths(repositoryFixtureRoot);
const GENERATED_ROOT = join(FIXTURE_PATHS.docsRoot, "_generated");
const TS_REFERENCE_DIR = join(GENERATED_ROOT, "ts-reference");
const PYTHON_DIR = join(GENERATED_ROOT, "experimental");
const DOTNET_INTERNALS_DIR = join(GENERATED_ROOT, "dotnet-internals");
const PROSE_DEST = join(FIXTURE_PATHS.docsRoot, "docs", "monorepo");

/**
 * Builds the in-memory repository fixture the command resolves its paths from: a verified
 * package identity, one discoverable `.csproj`, and `/docs/` prose (including a `superpowers/`
 * subtree, so the command's own exclusion is exercised end to end).
 *
 * @returns A deterministic filesystem capability anchored to the fixture repository root.
 */
function documentationFixtureFileSystem(): FileSystem {
  return createMemoryFileSystem({
    [FIXTURE_PATHS.packageJson]: JSON.stringify({name: "@arolariu/monorepo"}),
    [join(FIXTURE_PATHS.apiRoot, "src", "Common", "arolariu.Backend.Common.csproj")]: "<Project/>",
    [join(FIXTURE_PATHS.root, "docs", "README.md")]: "# Docs\n",
    [join(FIXTURE_PATHS.root, "docs", "superpowers", "secret.md")]: "private planning notes\n",
  });
}

/** One recorded invocation of {@link DocumentationFixtureRunner}. */
type RecordedCall = Readonly<{request: ProcessRequest; options: ProcessRunOptions}>;

function succeeded(patch: Readonly<{stdout?: string; stderr?: string}> = {}): ProcessOutcome {
  return {kind: "succeeded", exitCode: 0, stdout: patch.stdout ?? "", stderr: patch.stderr ?? "", durationMs: 1};
}

function exited(exitCode: number, patch: Readonly<{stdout?: string; stderr?: string}> = {}): ProcessOutcome {
  return {kind: "exited", exitCode, stdout: patch.stdout ?? "", stderr: patch.stderr ?? "", durationMs: 1};
}

function commandKey(request: Readonly<ProcessRequest>): string {
  return [request.command, ...request.args].join("\u0000");
}

/**
 * Fake {@link ProcessRunner} that records every invocation and, instead of spawning TypeDoc,
 * pydoc-markdown, or DefaultDocumentation, writes the same generated tiers those tools would have
 * produced directly onto the injected fixture filesystem — so the command's own normalization,
 * validation, landing-page, and prose-mirroring logic runs against real (fixture) content without
 * ever spawning a process.
 */
class DocumentationFixtureRunner extends AbstractProcessRunner {
  readonly #files: FileSystem;
  readonly #overrides: ReadonlyMap<string, ProcessOutcome>;
  readonly #calls: RecordedCall[] = [];

  public constructor(files: FileSystem, overrides: ReadonlyMap<string, ProcessOutcome> = new Map()) {
    super();
    this.#files = files;
    this.#overrides = overrides;
  }

  /** Every recorded invocation, in call order. */
  public get calls(): readonly RecordedCall[] {
    return this.#calls;
  }

  /** {@inheritDoc AbstractProcessRunner.execute} */
  protected override async execute(request: Readonly<ProcessRequest>, options: Readonly<ProcessRunOptions>): Promise<ProcessOutcome> {
    this.#calls.push({request, options});
    const override = this.#overrides.get(commandKey(request));
    if (override !== undefined) {
      return override;
    }

    await this.simulateExtractorOutput(request);
    return succeeded();
  }

  private async simulateExtractorOutput(request: Readonly<ProcessRequest>): Promise<void> {
    if (request.command === "npx" && request.args.includes("typedoc.components.json")) {
      const dir = join(TS_REFERENCE_DIR, "components");
      await this.#files.createDirectory(dir, {recursive: true});
      await this.#files.writeText(join(dir, "Button.md"), "# Button\n");
      return;
    }
    if (request.command === "npx" && request.args.includes("typedoc.website.json")) {
      const dir = join(TS_REFERENCE_DIR, "website");
      await this.#files.createDirectory(dir, {recursive: true});
      await this.#files.writeText(join(dir, "getMetadata.md"), "# getMetadata\n");
      return;
    }
    if (request.command === "python") {
      await this.#files.createDirectory(PYTHON_DIR, {recursive: true});
      // pydoc-markdown emits CRLF on Windows; the fixture reproduces that so `normalizeLineEndings`
      // is exercised the same way it is in production.
      await this.#files.writeText(join(PYTHON_DIR, "settings.md"), "# settings\r\n");
      return;
    }
    if (request.command === "dotnet" && request.args[0] === "build") {
      return;
    }
    if (request.command === "dotnet" && request.args[0] === "defaultdocumentation") {
      const outDirIndex = request.args.indexOf("--OutputDirectoryPath");
      const outDir = outDirIndex === -1 ? undefined : request.args[outDirIndex + 1];
      if (outDir === undefined) return;
      await this.#files.createDirectory(outDir, {recursive: true});
      await this.#files.writeText(join(outDir, "Common.md"), "# Common\n");
    }
  }
}

// ============================================================================
// createDocsAssembleCommand — successful assembly
// ============================================================================

describe("createDocsAssembleCommand", () => {
  it("assembles every required documentation tier using a fake runner and in-memory filesystem", async () => {
    const files = documentationFixtureFileSystem();
    const runner = new DocumentationFixtureRunner(files);
    const command = createDocsAssembleCommand(createTestRuntimeFactory({files, runner}));

    const execution = await command.invoke({}, {presentation: "silent"});

    expect(execution).toMatchObject({
      status: "completed",
      exitCode: 0,
      value: {
        generatedTiers: ["ts-reference/components", "ts-reference/website", "experimental", "dotnet-internals"],
        extractorCount: 3,
      },
    });

    // The generated tree persists after a successful run and every tier has a landing page.
    expect(await files.exists(join(TS_REFERENCE_DIR, "index.md"))).toBe(true);
    expect(await files.exists(join(PYTHON_DIR, "index.md"))).toBe(true);
    expect(await files.exists(join(DOTNET_INTERNALS_DIR, "index.md"))).toBe(true);

    // pydoc-markdown's CRLF output was normalized to LF.
    expect(await files.readText(join(PYTHON_DIR, "settings.md"))).not.toContain("\r\n");

    // Prose was mirrored, excluding the superpowers subtree.
    expect(await files.exists(join(PROSE_DEST, "README.md"))).toBe(true);
    expect(await files.exists(join(PROSE_DEST, "superpowers"))).toBe(false);
  });

  it("dispatches typedoc components before typedoc website, both with capture output at the repository root", async () => {
    const files = documentationFixtureFileSystem();
    const runner = new DocumentationFixtureRunner(files);
    const command = createDocsAssembleCommand(createTestRuntimeFactory({files, runner}));

    const execution = await command.invoke({}, {presentation: "silent"});
    expect(execution.status).toBe("completed");

    const typedocCalls = runner.calls.filter((call) => call.request.command === "npx");
    expect(typedocCalls.map((call) => call.request.args)).toEqual([
      ["typedoc", "--options", "typedoc.components.json"],
      ["typedoc", "--options", "typedoc.website.json"],
    ]);
    for (const call of typedocCalls) {
      expect(call.options.cwd).toBe(FIXTURE_PATHS.root);
      expect(call.options.output).toBe("capture");
    }
  });

  it("dispatches pydoc-markdown with capture output at the exp.arolariu.ro directory", async () => {
    const files = documentationFixtureFileSystem();
    const runner = new DocumentationFixtureRunner(files);
    const command = createDocsAssembleCommand(createTestRuntimeFactory({files, runner}));

    const execution = await command.invoke({}, {presentation: "silent"});
    expect(execution.status).toBe("completed");

    const pydocCall = runner.calls.find((call) => call.request.command === "python");
    expect(pydocCall).toBeDefined();
    expect(pydocCall?.request).toEqual({command: "python", args: ["-m", "pydoc_markdown.main"]});
    expect(pydocCall?.options.cwd).toBe(FIXTURE_PATHS.expRoot);
    expect(pydocCall?.options.output).toBe("capture");
  });

  it("builds each dotnet graph root before running defaultdocumentation, both with capture output at the API root", async () => {
    const files = documentationFixtureFileSystem();
    const runner = new DocumentationFixtureRunner(files);
    const command = createDocsAssembleCommand(createTestRuntimeFactory({files, runner}));

    const execution = await command.invoke({}, {presentation: "silent"});
    expect(execution.status).toBe("completed");

    const dotnetCalls = runner.calls.filter((call) => call.request.command === "dotnet");
    expect(dotnetCalls[0]?.request.args.slice(0, 2)).toEqual(["build", "src/Common/arolariu.Backend.Common.csproj"]);
    expect(dotnetCalls[1]?.request.args[0]).toBe("defaultdocumentation");
    for (const call of dotnetCalls) {
      expect(call.options.cwd).toBe(FIXTURE_PATHS.apiRoot);
      expect(call.options.output).toBe("capture");
    }
  });

  it("reports extractorCount as 3 regardless of how many child commands each family dispatches", async () => {
    const files = documentationFixtureFileSystem();
    const runner = new DocumentationFixtureRunner(files);
    const command = createDocsAssembleCommand(createTestRuntimeFactory({files, runner}));

    const execution = await command.invoke({}, {presentation: "silent"});

    // Five child commands run (2 typedoc + 1 pydoc-markdown + 1 dotnet build + 1 defaultdocumentation)
    // across exactly 3 concurrent extractor families.
    expect(runner.calls).toHaveLength(5);
    expect(execution).toMatchObject({value: {extractorCount: 3}});
  });

  // ==========================================================================
  // Failure and cleanup
  // ==========================================================================

  it("removes the generated tree and reports a RunnerError-bounded failure when an extractor exits non-zero", async () => {
    const files = documentationFixtureFileSystem();
    const overrides = new Map<string, ProcessOutcome>([
      [
        ["npx", "typedoc", "--options", "typedoc.components.json"].join("\u0000"),
        exited(1, {stderr: "TypeDoc fatal: configuration not found"}),
      ],
    ]);
    const runner = new DocumentationFixtureRunner(files, overrides);
    const command = createDocsAssembleCommand(createTestRuntimeFactory({files, runner}));

    const execution = await command.invoke({}, {presentation: "silent"});

    expect(execution).toMatchObject({status: "failed", exitCode: 1, failure: {kind: "operational"}});
    expect(execution.status === "failed" ? execution.failure.message : "").toMatch(/exited with code 1/);
    expect(execution.status === "failed" ? execution.failure.message : "").toMatch(/TypeDoc fatal/);
    expect(await files.exists(GENERATED_ROOT)).toBe(false);
  });

  it("bounds a RunnerError's failure evidence to 2000 characters", async () => {
    const files = documentationFixtureFileSystem();
    const longOutput = "x".repeat(5000);
    const overrides = new Map<string, ProcessOutcome>([
      [["python", "-m", "pydoc_markdown.main"].join("\u0000"), exited(1, {stderr: longOutput})],
    ]);
    const runner = new DocumentationFixtureRunner(files, overrides);
    const command = createDocsAssembleCommand(createTestRuntimeFactory({files, runner}));

    const execution = await command.invoke({}, {presentation: "silent"});

    expect(execution.status).toBe("failed");
    const message = execution.status === "failed" ? execution.failure.message : "";
    expect(message.length).toBeLessThan(longOutput.length);
    expect(await files.exists(GENERATED_ROOT)).toBe(false);
  });

  it("removes the generated tree when required-tier validation fails after every extractor reports success", async () => {
    const files = documentationFixtureFileSystem();
    // typedoc website "succeeds" but is overridden to skip the fixture's own output-writing step,
    // so `assertNonEmpty` inside `runTypedoc` (which checks the whole ts-reference tree and still
    // sees the components tier's content) passes, while the top-level required-tier check later
    // catches the missing `ts-reference/website` subtree specifically.
    const overrides = new Map<string, ProcessOutcome>([
      [["npx", "typedoc", "--options", "typedoc.website.json"].join("\u0000"), succeeded()],
    ]);
    const runner = new DocumentationFixtureRunner(files, overrides);
    const command = createDocsAssembleCommand(createTestRuntimeFactory({files, runner}));

    const execution = await command.invoke({}, {presentation: "silent"});

    expect(execution).toMatchObject({status: "failed", exitCode: 1});
    expect(execution.status === "failed" ? execution.failure.message : "").toMatch(/typedoc website: expected directory not found/);
    expect(await files.exists(GENERATED_ROOT)).toBe(false);
  });

  it("propagates cancellation instead of downgrading it to a business failure, and still removes the generated tree", async () => {
    const files = documentationFixtureFileSystem();
    const controller = new AbortController();
    const overrides = new Map<string, ProcessOutcome>();
    const runner = new DocumentationFixtureRunner(files, overrides);
    const command = createDocsAssembleCommand(createTestRuntimeFactory({files, runner}));

    controller.abort();
    const execution = await command.invoke({}, {presentation: "silent", signal: controller.signal});

    expect(execution.status).toBe("cancelled");
    expect(await files.exists(GENERATED_ROOT)).toBe(false);
  });

  // ==========================================================================
  // Help and argument parsing
  // ==========================================================================

  it("reports help for --help instead of running any extractor", async () => {
    const runnerThatMustNotBeCalled = new DocumentationFixtureRunner(createMemoryFileSystem());
    const command = createDocsAssembleCommand(createTestRuntimeFactory({runner: runnerThatMustNotBeCalled}));

    const execution = await command.run(["--help"]);

    expect(execution).toEqual({status: "help", exitCode: 0});
    expect(runnerThatMustNotBeCalled.calls).toHaveLength(0);
  });

  it("rejects an unknown option without invoking any extractor", async () => {
    const runnerThatMustNotBeCalled = new DocumentationFixtureRunner(createMemoryFileSystem());
    const command = createDocsAssembleCommand(createTestRuntimeFactory({runner: runnerThatMustNotBeCalled}));

    const execution = await command.run(["--bogus"]);

    expect(execution).toMatchObject({status: "failed", exitCode: 2, failure: {kind: "usage"}});
    expect(runnerThatMustNotBeCalled.calls).toHaveLength(0);
  });

  it("rejects an excess positional argument without invoking any extractor", async () => {
    const runnerThatMustNotBeCalled = new DocumentationFixtureRunner(createMemoryFileSystem());
    const command = createDocsAssembleCommand(createTestRuntimeFactory({runner: runnerThatMustNotBeCalled}));

    const execution = await command.run(["unexpected-arg"]);

    expect(execution).toMatchObject({status: "failed", exitCode: 2, failure: {kind: "usage"}});
    expect(runnerThatMustNotBeCalled.calls).toHaveLength(0);
  });
});
