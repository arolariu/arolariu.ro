import {describe, it, expect, beforeEach, afterEach} from "vitest";
import {mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {dirname, join} from "node:path";
import {
  syncProse,
  assertNonEmpty,
  runCommand,
  discoverDotnetProjects,
  findDotnetBuildRoots,
  assertExpectedDocumentationTiers,
  flushExtractorLog,
  getDefaultDocumentationArgs,
  getDefaultDocumentationCommand,
} from "./docs-assemble";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger";

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

describe("runCommand (buffered mode)", () => {
  it("captures stdout and returns it as a string", async () => {
    const out = await runCommand(process.execPath, ["-e", "process.stdout.write('hello-buffered')"], process.cwd(), {buffered: true});
    expect(out).toContain("hello-buffered");
  });

  it("non-buffered mode returns the empty string", async () => {
    const out = await runCommand(process.execPath, ["-e", "process.stdout.write('streamed')"], process.cwd());
    expect(out).toBe("");
  });

  it("rejects with exit code AND output tail when buffered child exits non-zero", async () => {
    await expect(
      runCommand(process.execPath, ["-e", "process.stderr.write('boom'); process.exit(7)"], process.cwd(), {buffered: true}),
    ).rejects.toThrow(/exited with 7[\s\S]*boom/);
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
