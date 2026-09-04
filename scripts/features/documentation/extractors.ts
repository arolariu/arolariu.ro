/**
 * @fileoverview Extractor families of the documentation pipeline: TypeDoc, pydoc-markdown, and
 * DefaultDocumentation, plus the .NET project graph, argument assembly, and output guards each
 * needs. `scripts/features/documentation/workflow.ts` decides only *when* a family runs. Every
 * process and filesystem effect flows through the injected `ProcessRunner` and `FileSystem`, which
 * is what every `runner`, `files`, and `signal` parameter below carries.
 * @module scripts/features/documentation/extractors
 */

import {dirname, join, resolve} from "node:path";

import type {ProcessRunner} from "../../core/process/process-runner.ts";
import type {FileSystem} from "../../core/runtime/runtime-capability.ts";

/**
 * .NET target framework shared by every project under `sites/api.arolariu.ro/src/`, declared
 * centrally in that project's `Directory.Build.props` and duplicated here only so
 * {@link discoverDotnetProjects} can locate each built DLL without parsing MSBuild props per run.
 */
const DOTNET_TFM = "net10.0";

/** One .NET project whose XML documentation is published on the docs site. */
export interface DotnetProject {
  /** Absolute path to the `.csproj` file. */
  readonly csproj: string;
  /** Path to the `.csproj` relative to `sites/api.arolariu.ro/`, for logging. */
  readonly csprojRelative: string;
  /** Final assembly filename without the `.dll` extension. */
  readonly assemblyName: string;
  /** Directory, relative to the API root, holding the built DLL. */
  readonly binRelative: string;
  /** Absolute paths of every `<ProjectReference>` declared in the csproj. */
  readonly projectReferences: readonly string[];
}

const isDocumentationOutputFile = (fileName: string): boolean => /\.mdx?$|\.json$/i.test(fileName);

/**
 * Guards the silent-failure case where an extractor exits `0` but produces nothing.
 *
 * @param label - Extractor name used in the thrown message, for example `typedoc`.
 * @throws When `dir` is missing or holds no `.md`/`.mdx`/`.json` file.
 */
export async function assertNonEmpty(files: FileSystem, dir: string, label: string): Promise<void> {
  if (!(await files.exists(dir))) throw new Error(`${label}: expected directory not found at ${dir}`);
  let count = 0;
  const walk = async (current: string): Promise<void> => {
    for (const entry of await files.readDirectory(current)) {
      if (entry.kind === "directory") await walk(join(current, entry.name));
      else if (isDocumentationOutputFile(entry.name)) count++;
    }
  };
  await walk(dir);
  if (count === 0) throw new Error(`${label}: extracted 0 files into ${dir}`);
}

/** Extracts every `<ProjectReference Include="..." />` target of one csproj as an absolute path. */
async function parseProjectReferences(files: FileSystem, csprojPath: string): Promise<readonly string[]> {
  const content = await files.readText(csprojPath);
  const refs: string[] = [];
  const regex = /<ProjectReference\s+Include\s*=\s*["']([^"']+)["']/g;
  for (let match: RegExpExecArray | null; (match = regex.exec(content)) !== null;) {
    const capture = match[1];
    if (capture !== undefined) refs.push(resolve(dirname(csprojPath), capture.replaceAll("\\", "/")));
  }
  return refs;
}

/**
 * Walks `<apiRoot>/src/*` for every `.csproj`, returning its assembly name, bin output path, and
 * declared references so {@link findDotnetBuildRoots} can compute the minimum build set instead of
 * maintaining a hardcoded list.
 *
 * @param tfm - Target framework moniker used to locate each project's bin output.
 * @returns Every discovered project, ordered by absolute csproj path.
 */
export async function discoverDotnetProjects(
  files: FileSystem,
  apiRoot: string,
  tfm: string = DOTNET_TFM,
): Promise<readonly DotnetProject[]> {
  const srcRoot = join(apiRoot, "src");
  const projects: DotnetProject[] = [];
  for (const dirEntry of await files.readDirectory(srcRoot)) {
    if (dirEntry.kind !== "directory") continue;
    const dirPath = join(srcRoot, dirEntry.name);
    for (const fileEntry of await files.readDirectory(dirPath)) {
      if (fileEntry.kind !== "file" || !fileEntry.name.endsWith(".csproj")) continue;
      const csproj = join(dirPath, fileEntry.name);
      projects.push({
        csproj,
        csprojRelative: `src/${dirEntry.name}/${fileEntry.name}`,
        assemblyName: fileEntry.name.replace(/\.csproj$/, ""),
        binRelative: `src/${dirEntry.name}/bin/Release/${tfm}`,
        projectReferences: await parseProjectReferences(files, csproj),
      });
    }
  }
  return projects.toSorted((left, right) => left.csproj.localeCompare(right.csproj));
}

/**
 * Returns the projects no sibling references — the minimum MSBuild entry points, since building one
 * cascades through its whole graph via the default `BuildProjectReferences=true`.
 *
 * @returns The graph roots to build.
 * @throws When every project is referenced, which means the graph is cyclic.
 */
export function findDotnetBuildRoots(projects: readonly DotnetProject[]): readonly DotnetProject[] {
  const referenced = new Set(projects.flatMap((project) => project.projectReferences));
  const roots = projects.filter((project) => !referenced.has(project.csproj));
  if (roots.length === 0) {
    throw new Error(".NET projects: every project is referenced by another — cyclic graph, cannot pick a build root.");
  }
  return roots;
}

/**
 * Builds the DefaultDocumentation CLI arguments for assembly `dll` and markdown directory `outDir`;
 * the multi-value `--GeneratedAccessModifiers` form follows the DefaultDocumentation.Console 1.2.4
 * option shape.
 *
 * @returns The generator arguments.
 */
export function getDefaultDocumentationArgs(dll: string, outDir: string): readonly string[] {
  // prettier-ignore
  return [
    "--AssemblyFilePath", dll,
    "--OutputDirectoryPath", outDir,
    "--FileNameFactory", "Name",
    "--GeneratedPages", "Namespaces",
    "--IncludeUndocumentedItems", "true",
    "--GeneratedAccessModifiers", "Public", "Protected", "Internal", "Private",
  ];
}

/**
 * Builds the full DefaultDocumentation invocation. `DefaultDocumentation.Console` is a **local**
 * tool in `.config/dotnet-tools.json`: local tools are resolved by the dotnet driver and never
 * placed on `PATH`, so they must run as `dotnet <command>`, and the command name is lowercase
 * because NuGet registers tool commands in lower case regardless of package casing.
 *
 * @returns The command and arguments to spawn.
 */
export function getDefaultDocumentationCommand(dll: string, outDir: string): {readonly command: string; readonly args: readonly string[]} {
  return {command: "dotnet", args: ["defaultdocumentation", ...getDefaultDocumentationArgs(dll, outDir)]};
}

/**
 * Invokes TypeDoc for `@arolariu/components` and then for selected website modules, emitting
 * markdown under `<tsReferenceDir>/{components,website}/` with `repoRoot` as working directory.
 */
export async function runTypedoc(
  runner: ProcessRunner,
  files: FileSystem,
  repoRoot: string,
  tsReferenceDir: string,
  signal: AbortSignal,
): Promise<void> {
  const options = {cwd: repoRoot, output: "capture", signal} as const;
  await runner.expectSuccess({command: "npx", args: ["typedoc", "--options", "typedoc.components.json"]}, options);
  await runner.expectSuccess({command: "npx", args: ["typedoc", "--options", "typedoc.website.json"]}, options);
  await assertNonEmpty(files, tsReferenceDir, "typedoc");
}

/** Rewrites CRLF to LF across a tree so the frontmatter parser stays platform-agnostic. */
async function normalizeLineEndings(files: FileSystem, dir: string): Promise<void> {
  for (const entry of await files.readDirectory(dir)) {
    const full = join(dir, entry.name);
    if (entry.kind === "directory") {
      await normalizeLineEndings(files, full);
    } else if (isDocumentationOutputFile(entry.name)) {
      const content = await files.readText(full);
      if (content.includes("\r\n")) await files.writeText(full, content.replaceAll("\r\n", "\n"));
    }
  }
}

/**
 * Runs `pydoc-markdown` in `expRoot` with the config committed there, emitting `pythonDir`, then
 * rewrites the Windows CRLF output the frontmatter pass must never see.
 */
export async function runPydocMarkdown(
  runner: ProcessRunner,
  files: FileSystem,
  expRoot: string,
  pythonDir: string,
  signal: AbortSignal,
): Promise<void> {
  await runner.expectSuccess({command: "python", args: ["-m", "pydoc_markdown.main"]}, {cwd: expRoot, output: "capture", signal});
  await assertNonEmpty(files, pythonDir, "pydoc-markdown");
  await normalizeLineEndings(files, pythonDir);
}

/**
 * Builds the minimum set of .NET graph roots under `apiRoot`, then runs `DefaultDocumentation`
 * against every compiled DLL into `<dotnetInternalsDir>/<assembly>/`.
 */
export async function runDotnetInternals(
  runner: ProcessRunner,
  files: FileSystem,
  apiRoot: string,
  dotnetInternalsDir: string,
  signal: AbortSignal,
): Promise<void> {
  const options = {cwd: apiRoot, output: "capture", signal} as const;
  const projects = await discoverDotnetProjects(files, apiRoot);
  for (const root of findDotnetBuildRoots(projects)) {
    await runner.expectSuccess({command: "dotnet", args: ["build", root.csprojRelative, "-c", "Release"]}, options);
  }
  await files.createDirectory(dotnetInternalsDir, {recursive: true});
  for (const project of projects) {
    const outDir = join(dotnetInternalsDir, project.assemblyName);
    await files.createDirectory(outDir, {recursive: true});
    await runner.expectSuccess(
      getDefaultDocumentationCommand(join(apiRoot, project.binRelative, `${project.assemblyName}.dll`), outDir),
      options,
    );
  }
  await assertNonEmpty(files, dotnetInternalsDir, "defaultdocumentation");
}
