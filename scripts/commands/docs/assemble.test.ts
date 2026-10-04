// @vitest-environment node
/**
 * @fileoverview Tests for the documentation assembler and its business helpers.
 * @module scripts/commands/docs/assemble.test
 *
 * @remarks
 * Every scenario runs on the in-memory harness: the helpers (`syncProse`, `assertNonEmpty`,
 * project discovery, build roots, `DefaultDocumentation` argument building, and tier validation)
 * read and write the harness filesystem, and {@link assembleDocumentation} runs against scripted
 * processes that write the output TypeDoc, pydoc-markdown, or DefaultDocumentation would have
 * produced instead of spawning them. No test touches real disk, spawns a real process, or reads
 * the live checkout.
 */

import {dirname, join} from "node:path";

import {Deferred, Effect, Exit, Fiber, FileSystem, type Scope} from "effect";
import {describe, expect, it} from "vitest";

import {createRepositoryPaths, type RepositoryPaths} from "../../common/repository-paths.ts";
import type {PlatformServices} from "../../platform/layers.ts";
import {ProcessExited, type ProcessError, type ProcessRequest, type ProcessResult} from "../../platform/Process.ts";
import {effectTest, makeTestLayer, repositoryFixtureRoot, type ScriptedProcess, type TestHarness} from "../../platform/testing.ts";
import {
  assembleDocumentation,
  assertExpectedDocumentationTiers,
  assertNonEmpty,
  discoverDotnetProjects,
  findDotnetBuildRoots,
  getDefaultDocumentationArgs,
  getDefaultDocumentationCommand,
  syncProse,
} from "./assemble.ts";
import {DocumentationOutputMissing, DotnetBuildRootUnresolved} from "./errors.ts";

/**
 * Reads one harness file as text.
 *
 * @param path - File path.
 * @returns The file contents.
 */
function readText(path: string): Effect.Effect<string, unknown, FileSystem.FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    return yield* fs.readFileString(path);
  });
}

/**
 * Reports whether a harness path exists.
 *
 * @param path - File or directory path.
 * @returns Whether the path exists.
 */
function exists(path: string): Effect.Effect<boolean, unknown, FileSystem.FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    return yield* fs.exists(path);
  });
}

// ============================================================================
// syncProse
// ============================================================================

describe("syncProse", () => {
  effectTest(
    "copies markdown files recursively from source to destination",
    () =>
      Effect.gen(function* () {
        yield* syncProse("/src", "/dest");
        expect(yield* exists("/dest/README.md")).toBe(true);
        expect(yield* readText("/dest/rfc/0001.md")).toBe("# RFC 0001");
      }),
    makeTestLayer({files: {"/src/README.md": "# Root", "/src/rfc/0001.md": "# RFC 0001"}}).layer,
  );

  effectTest(
    "wipes destination before copying",
    () =>
      Effect.gen(function* () {
        yield* syncProse("/src", "/dest");
        expect(yield* exists("/dest/stale.md")).toBe(false);
        expect(yield* exists("/dest/fresh.md")).toBe(true);
      }),
    makeTestLayer({files: {"/dest/stale.md": "stale", "/src/fresh.md": "fresh"}}).layer,
  );

  effectTest(
    "excludes superpowers subdirectory from the destination",
    () =>
      Effect.gen(function* () {
        yield* syncProse("/src", "/dest");
        expect(yield* exists("/dest/superpowers")).toBe(false);
        expect(yield* exists("/dest/public.md")).toBe(true);
      }),
    makeTestLayer({files: {"/src/superpowers/secret.md": "private", "/src/public.md": "ok"}}).layer,
  );
});

// ============================================================================
// assertNonEmpty
// ============================================================================

describe("assertNonEmpty", () => {
  effectTest(
    "fails when directory does not exist",
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(assertNonEmpty("/missing", "test"));
        expect(error).toBeInstanceOf(DocumentationOutputMissing);
        expect(error).toMatchObject({tier: "test", message: "test: expected directory not found at /missing"});
      }),
    makeTestLayer().layer,
  );

  effectTest(
    "fails when directory contains no md or json files",
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(assertNonEmpty("/root", "test"));
        expect(error).toMatchObject({_tag: "DocumentationOutputMissing", message: "test: extracted 0 files into /root"});
      }),
    makeTestLayer({files: {"/root/irrelevant.txt": ""}}).layer,
  );

  effectTest(
    "passes when directory contains at least one md file",
    () => assertNonEmpty("/root", "test"),
    makeTestLayer({files: {"/root/nested/ok.md": "# OK"}}).layer,
  );

  effectTest(
    "passes when directory contains at least one json file",
    () => assertNonEmpty("/root", "test"),
    makeTestLayer({files: {"/root/spec.json": "{}"}}).layer,
  );
});

// ============================================================================
// discoverDotnetProjects
// ============================================================================

describe("discoverDotnetProjects", () => {
  effectTest(
    "globs every .csproj under src/*",
    () =>
      Effect.gen(function* () {
        const projects = yield* discoverDotnetProjects("/api", "net10.0");
        expect(projects.map((p) => p.assemblyName).toSorted()).toEqual(["arolariu.Backend.Common", "arolariu.Backend.Core"]);
      }),
    makeTestLayer({
      files: {
        "/api/src/Common/arolariu.Backend.Common.csproj": "<Project/>",
        "/api/src/Core/arolariu.Backend.Core.csproj": "<Project/>",
      },
    }).layer,
  );

  effectTest(
    "derives csprojRelative + binRelative from the folder layout",
    () =>
      Effect.gen(function* () {
        const [only] = yield* discoverDotnetProjects("/api");
        expect(only?.csprojRelative).toBe("src/Common/arolariu.Backend.Common.csproj");
        expect(only?.binRelative).toBe("src/Common/bin/Release/net10.0");
      }),
    makeTestLayer({files: {"/api/src/Common/arolariu.Backend.Common.csproj": "<Project/>"}}).layer,
  );

  effectTest(
    'parses <ProjectReference Include="..."> entries into absolute paths',
    () =>
      Effect.gen(function* () {
        const projects = yield* discoverDotnetProjects("/api", "net10.0");
        const core = projects.find((p) => p.assemblyName === "arolariu.Backend.Core");
        expect(core?.projectReferences).toHaveLength(1);
        expect(core?.projectReferences[0]).toMatch(/arolariu\.Backend\.Common\.csproj$/);
      }),
    makeTestLayer({
      files: {
        "/api/src/Common/arolariu.Backend.Common.csproj": "<Project/>",
        "/api/src/Core/arolariu.Backend.Core.csproj": `<Project>
        <ItemGroup>
          <ProjectReference Include="..\\Common\\arolariu.Backend.Common.csproj" />
        </ItemGroup>
      </Project>`,
      },
    }).layer,
  );

  effectTest(
    "ignores non-csproj files and empty directories",
    () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.makeDirectory("/api/src/Empty", {recursive: true});
        const projects = yield* discoverDotnetProjects("/api", "net10.0");
        expect(projects).toHaveLength(1);
      }),
    makeTestLayer({
      files: {
        "/api/src/Common/arolariu.Backend.Common.csproj": "<Project/>",
        "/api/src/Common/README.md": "",
        "/api/src/stray.txt": "",
      },
    }).layer,
  );
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
    const cyclic = (): unknown =>
      findDotnetBuildRoots([
        {csproj: "/a", csprojRelative: "a", assemblyName: "A", binRelative: "", projectReferences: ["/b"]},
        {csproj: "/b", csprojRelative: "b", assemblyName: "B", binRelative: "", projectReferences: ["/a"]},
      ]);
    expect(cyclic).toThrow(/cyclic graph/);
    expect(cyclic).toThrow(DotnetBuildRootUnresolved);
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
  const writeTierFile = (root: string, relativePath: string): Effect.Effect<void, unknown, FileSystem.FileSystem> =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = join(root, relativePath);
      yield* fs.makeDirectory(dirname(path), {recursive: true});
      yield* fs.writeFileString(path, "# Generated\n");
    });

  effectTest(
    "accepts generated output only when every required documentation tier has content",
    () =>
      Effect.gen(function* () {
        const root = "/tiers-ok";
        yield* writeTierFile(root, "ts-reference/components/classes/Button.md");
        yield* writeTierFile(root, "ts-reference/website/functions/getMetadata.md");
        yield* writeTierFile(root, "experimental/modules/settings.md");
        yield* writeTierFile(root, "dotnet-internals/arolariu.Backend.Core/services/InvoiceService.md");

        yield* assertExpectedDocumentationTiers(root);
      }),
    makeTestLayer().layer,
  );

  effectTest(
    "rejects tiers containing only synthetic landing files",
    () =>
      Effect.gen(function* () {
        const root = "/tiers-landing-only";
        for (const tier of ["ts-reference/components", "ts-reference/website", "experimental", "dotnet-internals"]) {
          yield* writeTierFile(root, `${tier}/index.md`);
          yield* writeTierFile(root, `${tier}/README.md`);
        }

        const error = yield* Effect.flip(assertExpectedDocumentationTiers(root));

        expect(error).toMatchObject({_tag: "DocumentationOutputMissing", tier: "typedoc components"});
        expect(error.message).toContain("typedoc components: extracted 0 non-landing files");
      }),
    makeTestLayer().layer,
  );

  effectTest(
    "fails with a tier-specific error when generated output is missing",
    () =>
      Effect.gen(function* () {
        const root = "/tiers-missing";
        yield* writeTierFile(root, "ts-reference/components/classes/Button.md");
        yield* writeTierFile(root, "experimental/modules/settings.md");
        yield* writeTierFile(root, "dotnet-internals/arolariu.Backend.Core/services/InvoiceService.md");

        const error = yield* Effect.flip(assertExpectedDocumentationTiers(root));

        expect(error).toMatchObject({_tag: "DocumentationOutputMissing", tier: "typedoc website"});
        expect(error.message).toContain("typedoc website: expected directory not found");
      }),
    makeTestLayer().layer,
  );
});

// ============================================================================
// assembleDocumentation — fixture repository layout
// ============================================================================

/** Canonical paths of the in-memory repository fixture every assembly test resolves. */
const FIXTURE_PATHS: RepositoryPaths = createRepositoryPaths(repositoryFixtureRoot);
const GENERATED_ROOT = join(FIXTURE_PATHS.docsRoot, "_generated");
const TS_REFERENCE_DIR = join(GENERATED_ROOT, "ts-reference");
const PYTHON_DIR = join(GENERATED_ROOT, "experimental");
const DOTNET_INTERNALS_DIR = join(GENERATED_ROOT, "dotnet-internals");
const PROSE_DEST = join(FIXTURE_PATHS.docsRoot, "docs", "monorepo");

/**
 * The in-memory repository fixture the assembler resolves its paths from: a verified package
 * identity, one discoverable `.csproj`, and `/docs/` prose (including a `superpowers/` subtree, so
 * the exclusion is exercised end to end).
 */
const DOCUMENTATION_FIXTURE_FILES: Readonly<Record<string, string>> = {
  [FIXTURE_PATHS.packageJson]: JSON.stringify({name: "@arolariu/monorepo"}),
  [join(FIXTURE_PATHS.apiRoot, "src", "Common", "arolariu.Backend.Common.csproj")]: "<Project/>",
  [join(FIXTURE_PATHS.root, "docs", "README.md")]: "# Docs\n",
  [join(FIXTURE_PATHS.root, "docs", "superpowers", "secret.md")]: "private planning notes\n",
};

/** A successful scripted process result. */
const SUCCEEDED: ProcessResult = {stdout: "", stderr: "", durationMs: 1};

/** The harness filesystem scripted extractors write into; bound when each test body starts. */
interface ExtractorState {
  fs?: FileSystem.FileSystem;
}

/**
 * Writes one generated file, creating its directory.
 *
 * @param state - The bound harness filesystem.
 * @param dir - Output directory.
 * @param name - File name; `undefined` creates only the directory.
 * @param contents - File contents.
 * @returns The write, as a scripted success.
 */
function writeOutput(state: ExtractorState, dir: string, name?: string, contents = ""): Effect.Effect<ProcessResult, ProcessError> {
  const fs = state.fs;
  if (fs === undefined) {
    return Effect.die(new Error("The documentation extractor fixture is not bound."));
  }
  const create = fs.makeDirectory(dir, {recursive: true});
  const written = name === undefined ? create : Effect.andThen(create, fs.writeFileString(join(dir, name), contents));
  return Effect.orDie(written).pipe(Effect.as(SUCCEEDED));
}

/**
 * Simulates the output TypeDoc, pydoc-markdown, or DefaultDocumentation would have produced.
 *
 * @param state - The bound harness filesystem.
 * @param request - The scripted request.
 * @returns The simulated run.
 */
function simulateExtractor(state: ExtractorState, request: ProcessRequest): Effect.Effect<ProcessResult, ProcessError> {
  if (request.command === "npx" && request.args.includes("typedoc.components.json")) {
    return writeOutput(state, join(TS_REFERENCE_DIR, "components"), "Button.md", "# Button\n");
  }
  if (request.command === "npx" && request.args.includes("typedoc.website.json")) {
    return writeOutput(state, join(TS_REFERENCE_DIR, "website"), "getMetadata.md", "# getMetadata\n");
  }
  if (request.command === "python") {
    // pydoc-markdown emits CRLF on Windows; the fixture reproduces that so line endings are normalized.
    return writeOutput(state, PYTHON_DIR, "settings.md", "# settings\r\n");
  }
  if (request.command === "dotnet" && request.args[0] === "defaultdocumentation") {
    const outDir = request.args[request.args.indexOf("--OutputDirectoryPath") + 1];
    return outDir === undefined ? Effect.succeed(SUCCEEDED) : writeOutput(state, outDir, "Common.md", "# Common\n");
  }
  return Effect.succeed(SUCCEEDED);
}

/**
 * Matches one exact command line.
 *
 * @param commandLine - Executable followed by its arguments.
 * @returns A `ScriptedProcess.match` predicate.
 */
function commandIs(...commandLine: readonly string[]): ScriptedProcess["match"] {
  return (request) => JSON.stringify([request.command, ...request.args]) === JSON.stringify(commandLine);
}

/** One assembly test fixture. */
interface DocsFixture {
  /** The in-memory platform. */
  readonly harness: TestHarness;
  /** The extractor state bound to the harness filesystem. */
  readonly state: ExtractorState;
}

/**
 * Registers one assembly test on a fresh harness whose scripted extractors write their output.
 *
 * @param name - The test name.
 * @param overrides - Scripted processes consulted before the simulated extractors.
 * @param body - The test body; the extractors are bound to the harness filesystem first.
 * @param files - Extra seeded files.
 */
function docsTest(
  name: string,
  overrides: (state: ExtractorState) => readonly ScriptedProcess[],
  body: (fixture: DocsFixture) => Effect.Effect<void, unknown, PlatformServices | Scope.Scope>,
  files: Readonly<Record<string, string>> = {},
): void {
  const state: ExtractorState = {};
  const harness = makeTestLayer({
    files: {...DOCUMENTATION_FIXTURE_FILES, ...files},
    processes: [...overrides(state), {match: () => true, respond: (request) => simulateExtractor(state, request)}],
  });
  effectTest(
    name,
    () =>
      Effect.gen(function* () {
        state.fs = yield* FileSystem.FileSystem;
        yield* body({harness, state});
      }),
    harness.layer,
  );
}

/** Scripted processes without overrides. */
const NO_OVERRIDES = (): readonly ScriptedProcess[] => [];

/**
 * Reports whether any harness file remains under the generated tree.
 *
 * @param harness - The harness.
 * @returns Whether a generated file survived.
 */
function hasGeneratedFiles(harness: TestHarness): boolean {
  const prefix = `${GENERATED_ROOT.replaceAll("\\", "/")}/`;
  return [...harness.files().keys()].some((key) => key.startsWith(prefix));
}

/**
 * A scripted `ProcessExited` failure.
 *
 * @param command - The rendered command.
 * @param stderr - The captured standard error.
 * @returns The failure.
 */
function exited(command: string, stderr: string): ProcessExited {
  return new ProcessExited({command, stdout: "", stderr, durationMs: 1, exitCode: 1, message: `${command} exited with code 1`});
}

describe("assembleDocumentation", () => {
  docsTest("assembles every required documentation tier using scripted extractors", NO_OVERRIDES, () =>
    Effect.gen(function* () {
      const result = yield* assembleDocumentation;

      expect(result).toEqual({
        generatedTiers: ["ts-reference/components", "ts-reference/website", "experimental", "dotnet-internals"],
        extractorCount: 3,
      });

      // The generated tree persists after a successful run and every tier has a landing page.
      expect(yield* exists(join(TS_REFERENCE_DIR, "index.md"))).toBe(true);
      expect(yield* exists(join(PYTHON_DIR, "index.md"))).toBe(true);
      expect(yield* exists(join(DOTNET_INTERNALS_DIR, "index.md"))).toBe(true);
      expect(yield* readText(join(DOTNET_INTERNALS_DIR, "index.md"))).toBe(
        "---\ntitle: .NET internals\nsidebar_position: 0\n---\n\n# .NET internals\n\nReference documentation for internal types, services, and brokers of `api.arolariu.ro`. Generated from XML doc comments via `DefaultDocumentation`.\n\n- [arolariu.Backend.Common](/internals/dotnet/arolariu.Backend.Common/)\n",
      );

      // pydoc-markdown's CRLF output was normalized to LF, and frontmatter was filled in.
      expect(yield* readText(join(PYTHON_DIR, "settings.md"))).toBe("---\ntitle: settings\nsidebar_position: 1\n---\n# settings\n");

      // Prose was mirrored, excluding the superpowers subtree.
      expect(yield* exists(join(PROSE_DEST, "README.md"))).toBe(true);
      expect(yield* exists(join(PROSE_DEST, "superpowers"))).toBe(false);
    }),
  );

  docsTest("dispatches typedoc components before typedoc website, both with capture output at the repository root", NO_OVERRIDES, ({harness}) =>
    Effect.gen(function* () {
      yield* assembleDocumentation;

      const typedocCalls = harness.processCalls().filter((call) => call.request.command === "npx");
      expect(typedocCalls.map((call) => call.request.args)).toEqual([
        ["typedoc", "--options", "typedoc.components.json"],
        ["typedoc", "--options", "typedoc.website.json"],
      ]);
      for (const call of typedocCalls) {
        expect(call.options).toEqual({cwd: FIXTURE_PATHS.root, output: "capture"});
      }
    }),
  );

  docsTest("dispatches pydoc-markdown with capture output at the exp.arolariu.ro directory", NO_OVERRIDES, ({harness}) =>
    Effect.gen(function* () {
      yield* assembleDocumentation;

      const pydocCall = harness.processCalls().find((call) => call.request.command === "python");
      expect(pydocCall?.request).toEqual({command: "python", args: ["-m", "pydoc_markdown.main"]});
      expect(pydocCall?.options).toEqual({cwd: FIXTURE_PATHS.expRoot, output: "capture"});
    }),
  );

  docsTest(
    "builds each dotnet graph root before running defaultdocumentation, both with capture output at the API root",
    NO_OVERRIDES,
    ({harness}) =>
      Effect.gen(function* () {
        yield* assembleDocumentation;

        const dotnetCalls = harness.processCalls().filter((call) => call.request.command === "dotnet");
        expect(dotnetCalls[0]?.request.args.slice(0, 2)).toEqual(["build", "src/Common/arolariu.Backend.Common.csproj"]);
        expect(dotnetCalls[1]?.request.args[0]).toBe("defaultdocumentation");
        for (const call of dotnetCalls) {
          expect(call.options).toEqual({cwd: FIXTURE_PATHS.apiRoot, output: "capture"});
        }
      }),
  );

  docsTest("reports extractorCount as 3 regardless of how many child commands each family dispatches", NO_OVERRIDES, ({harness}) =>
    Effect.gen(function* () {
      const result = yield* assembleDocumentation;

      // Five child commands run (2 typedoc + 1 pydoc-markdown + 1 dotnet build + 1 defaultdocumentation)
      // across exactly 3 concurrent extractor families.
      expect(harness.processCalls()).toHaveLength(5);
      expect(result.extractorCount).toBe(3);
    }),
  );

  docsTest("runs extractors in legacy order", NO_OVERRIDES, ({harness}) =>
    Effect.gen(function* () {
      // Arrange
      const typedocComponents = ["npx", "typedoc", "--options", "typedoc.components.json"];
      const typedocWebsite = ["npx", "typedoc", "--options", "typedoc.website.json"];
      const pydocMarkdown = ["python", "-m", "pydoc_markdown.main"];
      const dotnetBuild = ["dotnet", "build", "src/Common/arolariu.Backend.Common.csproj", "-c", "Release"];
      const defaultDocumentation = [
        "dotnet",
        "defaultdocumentation",
        "--AssemblyFilePath",
        join(FIXTURE_PATHS.apiRoot, "src", "Common", "bin", "Release", "net10.0", "arolariu.Backend.Common.dll"),
        "--OutputDirectoryPath",
        join(DOTNET_INTERNALS_DIR, "arolariu.Backend.Common"),
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
      ];

      // Act
      yield* assembleDocumentation;

      // Assert
      const invocations = harness.processCalls().map((call) => [call.request.command, ...call.request.args]);
      // The three extractor groups run concurrently, so only the order within each group is a contract.
      expect(invocations.filter(([executable]) => executable === "npx")).toEqual([typedocComponents, typedocWebsite]);
      expect(invocations.filter(([executable]) => executable === "python")).toEqual([pydocMarkdown]);
      expect(invocations.filter(([executable]) => executable === "dotnet")).toEqual([dotnetBuild, defaultDocumentation]);
      const serialize = (invocation: readonly string[]): string => JSON.stringify(invocation);
      expect(invocations.map(serialize).toSorted()).toEqual(
        [typedocComponents, typedocWebsite, pydocMarkdown, dotnetBuild, defaultDocumentation].map(serialize).toSorted(),
      );
    }),
  );

  // ==========================================================================
  // Failure and cleanup
  // ==========================================================================

  docsTest(
    "removes the generated tree and fails with the process failure when an extractor exits non-zero",
    () => [
      {
        match: commandIs("npx", "typedoc", "--options", "typedoc.components.json"),
        respond: exited("npx typedoc --options typedoc.components.json", "TypeDoc fatal: configuration not found"),
      },
    ],
    ({harness}) =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(assembleDocumentation);

        expect(error).toBeInstanceOf(ProcessExited);
        expect(error.message).toMatch(/exited with code 1/);
        expect(error).toMatchObject({stderr: "TypeDoc fatal: configuration not found"});
        expect(yield* exists(GENERATED_ROOT)).toBe(false);
        expect(hasGeneratedFiles(harness)).toBe(false);
      }),
  );

  docsTest(
    "removes the generated tree when pydoc-markdown fails after its siblings wrote output",
    () => [{match: commandIs("python", "-m", "pydoc_markdown.main"), respond: exited("python -m pydoc_markdown.main", "x".repeat(5000))}],
    ({harness}) =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(assembleDocumentation);

        expect(error).toMatchObject({_tag: "ProcessExited", command: "python -m pydoc_markdown.main"});
        expect(hasGeneratedFiles(harness)).toBe(false);
      }),
  );

  docsTest(
    "removes the generated tree when required-tier validation fails after every extractor reports success",
    // typedoc website "succeeds" without writing, so the ts-reference walk inside the TypeDoc
    // group still sees the components tier while the required-tier check catches the missing
    // `ts-reference/website` subtree specifically.
    () => [{match: commandIs("npx", "typedoc", "--options", "typedoc.website.json"), respond: SUCCEEDED}],
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(assembleDocumentation);

        expect(error).toEqual(
          new DocumentationOutputMissing({
            tier: "typedoc website",
            message: `typedoc website: expected directory not found at ${join(TS_REFERENCE_DIR, "website")}`,
          }),
        );
        expect(yield* exists(GENERATED_ROOT)).toBe(false);
      }),
  );

  docsTest(
    "fails when a tier extracts no files",
    (state) => [{match: commandIs("python", "-m", "pydoc_markdown.main"), respond: () => writeOutput(state, PYTHON_DIR)}],
    () =>
      Effect.gen(function* () {
        // Act
        const error = yield* Effect.flip(assembleDocumentation);

        // Assert
        expect(error).toMatchObject({
          _tag: "DocumentationOutputMissing",
          tier: "pydoc-markdown",
          message: `pydoc-markdown: extracted 0 files into ${PYTHON_DIR}`,
        });
        expect(yield* exists(GENERATED_ROOT)).toBe(false);
      }),
  );

  docsTest(
    "fails without building when every .NET project references another",
    NO_OVERRIDES,
    ({harness}) =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(assembleDocumentation);

        expect(error).toEqual(
          new DotnetBuildRootUnresolved({
            message: ".NET projects: every project is referenced by another — cyclic graph, cannot pick a build root.",
          }),
        );
        expect(harness.processCalls().some((call) => call.request.args[0] === "build")).toBe(false);
        expect(yield* exists(GENERATED_ROOT)).toBe(false);
      }),
    {
      [join(FIXTURE_PATHS.apiRoot, "src", "Common", "arolariu.Backend.Common.csproj")]:
        '<Project><ProjectReference Include="../Core/arolariu.Backend.Core.csproj" /></Project>',
      [join(FIXTURE_PATHS.apiRoot, "src", "Core", "arolariu.Backend.Core.csproj")]:
        '<Project><ProjectReference Include="../Common/arolariu.Backend.Common.csproj" /></Project>',
    },
  );

  const typedocStarted = Deferred.makeUnsafe<void>();
  const pydocFinished = Deferred.makeUnsafe<void>();
  const dotnetFinished = Deferred.makeUnsafe<void>();
  docsTest(
    "removes generated output when interrupted",
    (state) => [
      {
        match: commandIs("npx", "typedoc", "--options", "typedoc.components.json"),
        respond: () => Deferred.succeed(typedocStarted, undefined).pipe(Effect.andThen(Effect.never)),
      },
      {
        match: commandIs("python", "-m", "pydoc_markdown.main"),
        respond: (request) => simulateExtractor(state, request).pipe(Effect.tap(() => Deferred.succeed(pydocFinished, undefined))),
      },
      {
        match: (request) => request.command === "dotnet" && request.args[0] === "defaultdocumentation",
        respond: (request) => simulateExtractor(state, request).pipe(Effect.tap(() => Deferred.succeed(dotnetFinished, undefined))),
      },
    ],
    ({harness}) =>
      Effect.gen(function* () {
        // Arrange
        const fiber = yield* Effect.forkChild(assembleDocumentation);
        yield* Deferred.await(typedocStarted);
        yield* Deferred.await(pydocFinished);
        yield* Deferred.await(dotnetFinished);
        expect(hasGeneratedFiles(harness)).toBe(true);

        // Act
        const exit = yield* Fiber.interrupt(fiber).pipe(Effect.andThen(Fiber.await(fiber)));

        // Assert
        expect(Exit.hasInterrupts(exit)).toBe(true);
        expect(hasGeneratedFiles(harness)).toBe(false);
        expect(yield* exists(GENERATED_ROOT)).toBe(false);
      }),
  );
});
