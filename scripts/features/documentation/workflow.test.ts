// @vitest-environment node
/**
 * @fileoverview Documentation assembly orchestration, extractor, and tier-assembly evidence.
 * Extractor and assembly helpers run directly against a fake filesystem; orchestration scenarios run
 * the real composed command through a programmable runner that writes the tiers TypeDoc,
 * pydoc-markdown, and DefaultDocumentation would have produced. Nothing here touches real disk,
 * spawns a process, or reads the live checkout.
 * @module scripts/features/documentation/workflow.test
 */

import {join} from "node:path";
import {describe, expect, it} from "vitest";

import {createRepositoryPaths, type RepositoryPaths} from "../../common/repository-paths.ts";
import type {CommandExecution, CommandExecutionContext} from "../../core/command/command-execution.ts";
import type {ProcessExecutionRequest} from "../../core/process/process-execution-request.ts";
import type {ProcessExecutionResult} from "../../core/process/process-execution-result.ts";
import {LifoCleanupRegistry, type CleanupFailure, type CleanupRegistry} from "../../core/runtime/cleanup.ts";
import type {FileSystem} from "../../core/runtime/runtime-capability.ts";
import type {RuntimeExecutionContext} from "../../core/runtime/runtime-execution-context.ts";
import type {WorkflowExecutionResult} from "../../core/workflow/workflow-execution-result.ts";
import {buildCommandHost} from "../../testing/builders/command-host.builder.ts";
import {
  buildExitedProcessExecutionResult,
  buildProgrammableProcessRunner,
  buildSucceededProcessExecutionResult,
} from "../../testing/builders/process-result.builder.ts";
import {buildRuntimeExecutionContext} from "../../testing/builders/runtime-context.builder.ts";
import {createMemoryFileSystem} from "../../testing/fixtures/memory-filesystem.fixture.ts";
import {repositoryFixtureRoot} from "../../testing/fixtures/repository.fixture.ts";
import {buildRecordingPresenter} from "../../testing/fixtures/terminal.fixture.ts";
import {assertExpectedDocumentationTiers, syncProse, writeDocumentationLandingPages} from "./assembly.ts";
import {createDocumentationCommand} from "./command.ts";
import {
  assertNonEmpty,
  discoverDotnetProjects,
  findDotnetBuildRoots,
  getDefaultDocumentationArgs,
  getDefaultDocumentationCommand,
} from "./extractors.ts";
import {documentationAssemblyWorkflowModule, type DocumentationAssemblyFailure, type DocumentationAssemblyResult} from "./workflow.ts";

const paths: RepositoryPaths = createRepositoryPaths(repositoryFixtureRoot);
const generatedRoot = join(paths.docsRoot, "_generated");
const tsReferenceDirectory = join(generatedRoot, "ts-reference");
const pythonDirectory = join(generatedRoot, "experimental");
const dotnetInternalsDirectory = join(generatedRoot, "dotnet-internals");
const proseDestination = join(paths.docsRoot, "docs", "monorepo");

const key = (command: string, ...args: readonly string[]): string => [command, ...args].join("\u0000");
const typedocComponentsKey = key("npx", "typedoc", "--options", "typedoc.components.json");
const typedocWebsiteKey = key("npx", "typedoc", "--options", "typedoc.website.json");
const pydocMarkdownKey = key("python", "-m", "pydoc_markdown.main");
const dotnetBuildKey = key("dotnet", "build", "src/Common/arolariu.Backend.Common.csproj", "-c", "Release");
type ProcessOverrides = ReadonlyMap<string, ProcessExecutionResult>;

/** The in-memory repository the feature resolves its paths from, including a `superpowers/` subtree. */
const documentationFixtureFileSystem = (): FileSystem =>
  createMemoryFileSystem({
    [paths.packageJson]: JSON.stringify({name: "@arolariu/monorepo"}),
    [join(paths.apiRoot, "src", "Common", "arolariu.Backend.Common.csproj")]: "<Project/>",
    [join(paths.root, "docs", "README.md")]: "# Docs\n",
    [join(paths.root, "docs", "superpowers", "secret.md")]: "private planning notes\n",
  });

/** Writes what each extractor family would have produced, so the real assembly steps run on it. */
async function simulateExtractorOutput(files: FileSystem, request: Readonly<ProcessExecutionRequest>): Promise<void> {
  if (request.command === "npx" && request.args.includes("typedoc.components.json")) {
    await files.writeTextAtomic(join(tsReferenceDirectory, "components", "Button.md"), "# Button\n");
  } else if (request.command === "npx" && request.args.includes("typedoc.website.json")) {
    await files.writeTextAtomic(join(tsReferenceDirectory, "website", "getMetadata.md"), "# getMetadata\n");
  } else if (request.command === "python") {
    // pydoc-markdown emits CRLF on Windows; the fixture reproduces it so the CRLF pass is exercised.
    await files.writeTextAtomic(join(pythonDirectory, "settings.md"), "# settings\r\n");
  } else if (request.command === "dotnet" && request.args[0] === "defaultdocumentation") {
    const outputDirectory = request.args[request.args.indexOf("--OutputDirectoryPath") + 1];
    if (outputDirectory !== undefined) await files.writeTextAtomic(join(outputDirectory, "Common.md"), "# Common\n");
  }
}

const buildDocumentationRunner = (
  files: FileSystem,
  overrides: ProcessOverrides = new Map(),
): ReturnType<typeof buildProgrammableProcessRunner> =>
  buildProgrammableProcessRunner(async (request) => {
    const override = overrides.get(key(request.command, ...request.args));
    if (override !== undefined) return override;
    await simulateExtractorOutput(files, request);
    return buildSucceededProcessExecutionResult();
  });

/** Invokes the real composed command against one fixture repository. */
async function invokeDocumentation(
  overrides?: ProcessOverrides,
  runtime: Readonly<Partial<RuntimeExecutionContext>> = {},
  signal?: AbortSignal,
) {
  const files = (runtime.files ?? documentationFixtureFileSystem()) as FileSystem;
  const runner = runtime.runner ?? buildDocumentationRunner(files, overrides);
  const command = createDocumentationCommand({host: buildCommandHost({runtime: {...runtime, files, runner}})});
  const presentation = runtime.presenter === undefined ? "silent" : "human";
  const execution: CommandExecution<DocumentationAssemblyResult> = await command.invoke(
    {},
    {presentation, ...(signal === undefined ? {} : {signal})},
  );
  return {files, runner, execution};
}

const failureOf = (execution: CommandExecution<DocumentationAssemblyResult>) =>
  execution.status === "failed" ? execution.failure : {message: "", evidence: [] as readonly string[]};

/** Runs the workflow module directly, so a typed decision is observable without the lifecycle. */
function runWorkflowDirectly(files: FileSystem, overrides?: ProcessOverrides, signal?: AbortSignal) {
  const runner = buildDocumentationRunner(files, overrides);
  const runtime = buildRuntimeExecutionContext({files, runner, ...(signal === undefined ? {} : {signal})});
  const context: CommandExecutionContext = {runtime, presentation: "silent"};
  const result: Promise<WorkflowExecutionResult<DocumentationAssemblyResult, DocumentationAssemblyFailure>> =
    documentationAssemblyWorkflowModule.runWorkflow(documentationAssemblyWorkflowModule.createContext({}, context), {
      monotonicNow: () => 0,
      signal: runtime.signal,
      publishEvent: () => undefined,
    });
  return {runtime, runner, result};
}

describe("extractor families", () => {
  it("discovers every .csproj under src, deriving relative, bin, and reference paths", async () => {
    const files = createMemoryFileSystem({
      "/api/src/Common/arolariu.Backend.Common.csproj": "<Project/>",
      "/api/src/Common/README.md": "",
      "/api/src/Core/arolariu.Backend.Core.csproj":
        '<Project><ItemGroup><ProjectReference Include="..\\Common\\arolariu.Backend.Common.csproj" /></ItemGroup></Project>',
    });
    await files.createDirectory("/api/src/Empty", {recursive: true});

    const projects = await discoverDotnetProjects(files, "/api", "net10.0");

    expect(projects.map((project) => project.assemblyName)).toEqual(["arolariu.Backend.Common", "arolariu.Backend.Core"]);
    expect(projects[0]?.csprojRelative).toBe("src/Common/arolariu.Backend.Common.csproj");
    expect(projects[0]?.binRelative).toBe("src/Common/bin/Release/net10.0");
    expect(projects[1]?.projectReferences).toEqual([expect.stringMatching(/arolariu\.Backend\.Common\.csproj$/u)]);
  });

  it("selects only unreferenced projects as build roots and rejects a cyclic graph", () => {
    const project = (assemblyName: string, projectReferences: readonly string[] = []) => ({
      csproj: `/${assemblyName}`,
      csprojRelative: assemblyName,
      assemblyName,
      binRelative: "",
      projectReferences,
    });

    expect(findDotnetBuildRoots([project("A"), project("B"), project("Root", ["/A", "/B"])]).map((r) => r.assemblyName)).toEqual(["Root"]);
    expect(
      findDotnetBuildRoots([project("A"), project("B")])
        .map((r) => r.assemblyName)
        .toSorted(),
    ).toEqual(["A", "B"]);
    expect(() => findDotnetBuildRoots([project("A", ["/B"]), project("B", ["/A"])])).toThrow(/cyclic graph/u);
  });

  it("requests undocumented items and every access modifier through the dotnet driver", () => {
    const {command, args} = getDefaultDocumentationCommand("api.dll", "out");

    // prettier-ignore
    expect(getDefaultDocumentationArgs("api.dll", "out")).toEqual([
      "--AssemblyFilePath", "api.dll",
      "--OutputDirectoryPath", "out",
      "--FileNameFactory", "Name",
      "--GeneratedPages", "Namespaces",
      "--IncludeUndocumentedItems", "true",
      "--GeneratedAccessModifiers", "Public", "Protected", "Internal", "Private",
    ]);
    // Local tools in .config/dotnet-tools.json are resolved by the driver and never placed on PATH.
    expect([command, args[0]]).toEqual(["dotnet", "defaultdocumentation"]);
    expect(args.slice(1)).toEqual(getDefaultDocumentationArgs("api.dll", "out"));
  });

  it.each([
    {label: "rejects a missing output directory", files: {}, expected: /expected directory not found/u},
    {label: "rejects output with no markdown or JSON", files: {"/root/x.txt": ""}, expected: /extracted 0 files/u},
    {label: "accepts markdown output", files: {"/root/ok.md": "# OK"}, expected: undefined},
    {label: "accepts JSON output", files: {"/root/spec.json": "{}"}, expected: undefined},
  ])("$label", async ({files, expected}) => {
    const guard = assertNonEmpty(createMemoryFileSystem({...files}), "/root", "test");

    if (expected === undefined) await expect(guard).resolves.toBeUndefined();
    else await expect(guard).rejects.toThrow(expected);
  });
});

describe("tier validation, landing pages, and prose mirroring", () => {
  const contentTier = (tier: string): Readonly<Record<string, string>> => ({[join("/tiers", tier, "nested", "Page.md")]: "# Generated\n"});
  const landingTier = (tier: string): Readonly<Record<string, string>> => ({
    [join("/tiers", tier, "index.md")]: "# Landing\n",
    [join("/tiers", tier, "README.md")]: "# Landing\n",
  });
  const allTiers = ["ts-reference/components", "ts-reference/website", "experimental", "dotnet-internals"];

  it.each([
    {label: "accepts every tier with non-landing content", seed: allTiers.map(contentTier), expected: undefined},
    {
      label: "rejects a tier holding only synthetic landing files",
      seed: allTiers.map(landingTier),
      expected: "typedoc components: extracted 0 non-landing files",
    },
    {
      label: "reports the tier-specific message verbatim when a tier is missing",
      seed: allTiers.filter((tier) => tier !== "ts-reference/website").map(contentTier),
      expected: "typedoc website: expected directory not found",
    },
  ])("$label", async ({seed, expected}) => {
    const files = createMemoryFileSystem(Object.assign({}, ...seed) as Record<string, string>);
    const validation = assertExpectedDocumentationTiers(files, "/tiers");

    if (expected === undefined) await expect(validation).resolves.toBeUndefined();
    else await expect(validation).rejects.toThrow(expected);
  });

  it("wipes the destination, copies prose recursively, and excludes the superpowers subtree", async () => {
    const files = createMemoryFileSystem({
      "/dest/stale.md": "stale",
      "/src/README.md": "# Root",
      "/src/rfc/0001.md": "# RFC 0001",
      "/src/superpowers/secret.md": "private",
    });

    await syncProse(files, "/src", "/dest");

    expect(await files.exists("/dest/stale.md")).toBe(false);
    expect(await files.readText("/dest/README.md")).toBe("# Root");
    expect(await files.readText("/dest/rfc/0001.md")).toBe("# RFC 0001");
    expect(await files.exists("/dest/superpowers")).toBe(false);
  });

  it("writes byte-identical landing titles, summaries, and route bases, and skips a missing tier", async () => {
    const files = createMemoryFileSystem();
    await files.writeTextAtomic(join(tsReferenceDirectory, "components", "Button.md"), "# Button\n");
    await files.writeTextAtomic(join(pythonDirectory, "settings.md"), "# settings\n");

    await writeDocumentationLandingPages(files, {tsReferenceDirectory, pythonDirectory, dotnetInternalsDirectory});

    expect(await files.readText(join(tsReferenceDirectory, "index.md"))).toBe(
      "---\ntitle: TypeScript reference\nsidebar_position: 0\n---\n\n# TypeScript reference\n\n"
        + "Generated from TSDoc / JSDoc comments across `@arolariu/components` and the `arolariu.ro` website.\n\n"
        + "- [components](/reference/typescript/components/)\n",
    );
    expect(await files.readText(join(pythonDirectory, "index.md"))).toBe(
      "---\ntitle: Experimental service (Python)\nsidebar_position: 0\n---\n\n# Experimental service (Python)\n\n"
        + "Internal documentation for `exp.arolariu.ro`, a FastAPI configuration-proxy service."
        + " Extracted from Google-style docstrings via `pydoc-markdown`.\n\n- [settings](/internals/experimental/settings)\n",
    );
    expect(await files.exists(join(dotnetInternalsDirectory, "index.md"))).toBe(false);
  });
});

describe("documentation assembly orchestration", () => {
  it("assembles every required tier, normalizes line endings, and mirrors prose without superpowers", async () => {
    const {files, execution} = await invokeDocumentation();

    expect(execution).toMatchObject({
      status: "completed",
      exitCode: 0,
      value: {generatedTiers: ["ts-reference/components", "ts-reference/website", "experimental", "dotnet-internals"], extractorCount: 3},
    });
    expect(await files.exists(join(tsReferenceDirectory, "index.md"))).toBe(true);
    expect(await files.exists(join(pythonDirectory, "index.md"))).toBe(true);
    expect(await files.readText(join(dotnetInternalsDirectory, "index.md"))).toContain("# .NET internals");
    expect(await files.readText(join(pythonDirectory, "settings.md"))).not.toContain("\r\n");
    expect(await files.readText(join(proseDestination, "README.md"))).toBe("# Docs\n");
    expect(await files.exists(join(proseDestination, "superpowers"))).toBe(false);
  });

  it("dispatches five child processes across three families, each captured at its own directory", async () => {
    const {runner, execution} = await invokeDocumentation();
    const callsOf = (command: string): readonly string[] =>
      runner.calls.filter((call) => call.request.command === command).map((call) => call.request.args.join(" "));
    const directoriesOf = (command: string): readonly (string | undefined)[] =>
      runner.calls.filter((call) => call.request.command === command).map((call) => call.options.cwd);

    expect(execution).toMatchObject({status: "completed", value: {extractorCount: 3}});
    expect(runner.calls).toHaveLength(5);
    expect(runner.calls.every((call) => call.options.output === "capture")).toBe(true);
    expect(callsOf("npx")).toEqual(["typedoc --options typedoc.components.json", "typedoc --options typedoc.website.json"]);
    expect(directoriesOf("npx")).toEqual([paths.root, paths.root]);
    expect(callsOf("python")).toEqual(["-m pydoc_markdown.main"]);
    expect(directoriesOf("python")).toEqual([paths.expRoot]);
    expect(callsOf("dotnet")[0]).toBe("build src/Common/arolariu.Backend.Common.csproj -c Release");
    expect(callsOf("dotnet")[1]).toContain(
      `defaultdocumentation --AssemblyFilePath ${join(paths.apiRoot, "src/Common/bin/Release/net10.0")}`,
    );
    expect(callsOf("dotnet")[1]).toContain(`--OutputDirectoryPath ${join(dotnetInternalsDirectory, "arolariu.Backend.Common")}`);
    expect(directoriesOf("dotnet")).toEqual([paths.apiRoot, paths.apiRoot]);
  });

  it("registers the staging cleanup right after creation and unregisters it only once every step succeeded", async () => {
    const files = documentationFixtureFileSystem();
    const runner = buildDocumentationRunner(files);
    const transitions: string[] = [];
    const inner = new LifoCleanupRegistry();
    const cleanup: CleanupRegistry = {
      register: (label, callback) => {
        transitions.push(`register ${label} after ${String(runner.calls.length)}`);
        const unregister = inner.register(label, callback);
        return (): void => {
          transitions.push(`unregister ${label} after ${String(runner.calls.length)}`);
          unregister();
        };
      },
      drain: (): Promise<readonly CleanupFailure[]> => inner.drain(),
    };

    const {execution} = await invokeDocumentation(undefined, {files, runner, cleanup});

    expect(execution.status).toBe("completed");
    expect(transitions).toEqual(["register generated documentation tree after 0", "unregister generated documentation tree after 5"]);
    // The lifecycle drained the registry after the unregistration, so the tree survived.
    expect(await files.exists(generatedRoot)).toBe(true);
  });

  it("removes the generated tree and reports bounded process evidence when an extractor exits non-zero", async () => {
    const {presenter, sink} = buildRecordingPresenter();
    const overrides = new Map([[typedocComponentsKey, buildExitedProcessExecutionResult(1, {stderr: "TypeDoc fatal: config not found"})]]);

    const {files, execution} = await invokeDocumentation(overrides, {presenter});

    expect(execution).toMatchObject({status: "failed", exitCode: 1, failure: {kind: "operational"}});
    expect(failureOf(execution).message).toMatch(/exited with code 1/u);
    expect(failureOf(execution).message).toMatch(/TypeDoc fatal/u);
    expect(failureOf(execution).evidence).toEqual(["command: npx typedoc --options typedoc.components.json", "outcome: exited"]);
    expect(sink.records.filter((record) => record.level === "error").map((record) => record.text.includes("TypeDoc fatal"))).toEqual([
      true,
    ]);
    expect(await files.exists(generatedRoot)).toBe(false);
  });

  it("bounds process failure evidence to 2000 characters", async () => {
    const longOutput = "x".repeat(5000);

    const {files, execution} = await invokeDocumentation(
      new Map([[pydocMarkdownKey, buildExitedProcessExecutionResult(1, {stderr: longOutput})]]),
    );

    expect(execution.status).toBe("failed");
    expect(failureOf(execution).message).toContain("x".repeat(100));
    expect(failureOf(execution).message.length).toBeLessThan(longOutput.length);
    expect(await files.exists(generatedRoot)).toBe(false);
  });

  it("lets every family settle before deciding, and reports the first failing family in dispatch order", async () => {
    const overrides = new Map([
      [pydocMarkdownKey, buildExitedProcessExecutionResult(1, {stderr: "pydoc-markdown failed"})],
      [dotnetBuildKey, buildExitedProcessExecutionResult(1, {stderr: "dotnet build failed"})],
    ]);

    const {runner, execution} = await invokeDocumentation(overrides);

    expect(execution.status).toBe("failed");
    expect(failureOf(execution).message).toContain("pydoc-markdown failed");
    // Both TypeDoc invocations still completed even though two sibling families had already failed.
    expect(runner.calls.map((call) => call.request.command).toSorted()).toEqual(["dotnet", "npx", "npx", "python"]);
  });

  it("validates required tiers before normalization, landing pages, and prose mirroring", async () => {
    // TypeDoc's website invocation "succeeds" without writing, so the family-level guard still
    // passes on the components tier while the required-tier check catches the missing subtree.
    const {files, execution} = await invokeDocumentation(new Map([[typedocWebsiteKey, buildSucceededProcessExecutionResult()]]));

    expect(execution).toMatchObject({status: "failed", exitCode: 1});
    expect(failureOf(execution).message).toMatch(/typedoc website: expected directory not found/u);
    expect(await files.exists(generatedRoot)).toBe(false);
    expect(await files.exists(proseDestination)).toBe(false);
  });

  it("propagates cancellation as a cancelled command instead of a business failure, and still removes the tree", async () => {
    const controller = new AbortController();
    controller.abort();

    const {files, execution} = await invokeDocumentation(undefined, {}, controller.signal);

    expect(execution.status).toBe("cancelled");
    expect(await files.exists(generatedRoot)).toBe(false);
  });

  it("renders the success line once through the presenter", async () => {
    const {presenter, sink} = buildRecordingPresenter();

    await invokeDocumentation(undefined, {presenter});

    expect(sink.records.filter((record) => record.level === "success").map((record) => record.text)).toEqual([
      "[arolariu::test] ✅ Assembled documentation from 3 extractor(s) across 4 tier(s).",
    ]);
  });
});

describe("documentation assembly workflow module", () => {
  it("narrows the runtime to exactly the capabilities it declares", () => {
    const context: CommandExecutionContext = {runtime: buildRuntimeExecutionContext(), presentation: "silent"};

    const featureContext = documentationAssemblyWorkflowModule.createContext({}, context);

    expect(Object.keys(featureContext).toSorted()).toEqual([...documentationAssemblyWorkflowModule.runtimeCapabilities].toSorted());
  });

  it("surfaces cancellation as an interrupted decision, leaving the staging cleanup registered", async () => {
    const files = documentationFixtureFileSystem();
    const controller = new AbortController();
    controller.abort();
    const {runtime, runner, result} = runWorkflowDirectly(files, undefined, controller.signal);

    expect((await result).kind).toBe("interrupted");
    expect(runner.calls).toEqual([]);
    expect(await runtime.cleanup.drain()).toEqual([]);
    expect(await files.exists(generatedRoot)).toBe(false);
  });

  it("classifies a failed extractor and a missing tier as typed failures carrying their cause", async () => {
    const extractorOverrides = new Map([[typedocComponentsKey, buildExitedProcessExecutionResult(1, {stderr: "TypeDoc fatal"})]]);
    const tierOverrides = new Map([[typedocWebsiteKey, buildSucceededProcessExecutionResult()]]);

    const extractorResult = await runWorkflowDirectly(documentationFixtureFileSystem(), extractorOverrides).result;
    const tierResult = await runWorkflowDirectly(documentationFixtureFileSystem(), tierOverrides).result;

    expect(extractorResult.kind === "failed" ? extractorResult.failure : undefined).toMatchObject({
      kind: "extractor-failed",
      extractor: "typedoc",
    });
    expect(tierResult.kind === "failed" ? tierResult.failure : undefined).toMatchObject({
      kind: "tier-missing",
      tierLabel: "typedoc website",
      tierPath: join(tsReferenceDirectory, "website"),
    });
  });
});
