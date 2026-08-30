/**
 * @fileoverview Read-only .NET SDK, workload, NuGet, solution, and AppHost diagnostics.
 * @module scripts.doctor.dotnet
 */

import {constants as fsConstants} from "node:fs";
import {access, readFile, readdir} from "node:fs/promises";
import {homedir} from "node:os";
import {resolve} from "node:path";

import type {CommandResult, CommandSpec} from "./common/process.ts";
import {satisfiesMinimum, type MinimumVersion} from "./common/requirements.ts";
import {
  DIAGNOSTIC_DEFAULT_TIMEOUT_MS,
  diagnosticResult,
  skippedDiagnostic,
  type DiagnosticFix,
  type DiagnosticPotentialCause,
  type DiagnosticResult,
  type DoctorContext,
  type DiagnosticModule,
} from "./doctor.types.ts";

const APPHOST_PROJECT_RELATIVE_PATH = ["tooling", "AppHost", "AppHost.csproj"] as const;
const APPHOST_PROJECT_RELATIVE_COMMAND_PATH = "tooling/AppHost/AppHost.csproj" as const;
const APPHOST_DEV_SETTINGS_RELATIVE_PATH = ["tooling", "AppHost", "appsettings.Development.json"] as const;
const REQUIRED_APPHOST_PARAMETER_KEYS = ["Parameters:sql-password", "Parameters:redis-password"] as const;
const NUGET_FEED_URL = new URL("https://api.nuget.org/v3/index.json");
const EXCLUDED_LOCK_FILE_DIRECTORIES: ReadonlySet<string> = new Set([
  "node_modules",
  ".git",
  "bin",
  "obj",
  "dist",
  "out",
  ".next",
  ".turbo",
  ".svelte-kit",
  "coverage",
]);
const MAX_LOCK_FILE_SEARCH_DEPTH = 8;
const DOTNET_ARCHITECTURE_TO_NODE_ARCH: Readonly<Record<string, string>> = {
  x64: "x64",
  arm64: "arm64",
  x86: "ia32",
  arm: "arm",
};

const DOTNET_VERSION_COMMAND = {command: "dotnet", args: ["--version"]} as const satisfies CommandSpec;
const DOTNET_INFO_COMMAND = {command: "dotnet", args: ["--info"]} as const satisfies CommandSpec;
const DOTNET_LIST_SDKS_COMMAND = {command: "dotnet", args: ["--list-sdks"]} as const satisfies CommandSpec;
const DOTNET_WORKLOAD_LIST_COMMAND = {command: "dotnet", args: ["workload", "list"]} as const satisfies CommandSpec;
const DOTNET_NUGET_LOCALS_COMMAND = {
  command: "dotnet",
  args: ["nuget", "locals", "global-packages", "--list"],
} as const satisfies CommandSpec;
const DOTNET_TOOL_LIST_LOCAL_COMMAND = {command: "dotnet", args: ["tool", "list", "--local"]} as const satisfies CommandSpec;
const DOTNET_DEV_CERTS_CHECK_COMMAND = {command: "dotnet", args: ["dev-certs", "https", "--check"]} as const satisfies CommandSpec;
const DOTNET_DEV_CERTS_CHECK_TRUST_COMMAND = {
  command: "dotnet",
  args: ["dev-certs", "https", "--check", "--trust"],
} as const satisfies CommandSpec;
const DOTNET_APPHOST_USER_SECRETS_COMMAND = {
  command: "dotnet",
  args: ["user-secrets", "list", "--json", "--project", APPHOST_PROJECT_RELATIVE_COMMAND_PATH],
} as const satisfies CommandSpec;

type UnknownRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isSuccessfulCommand(result: Readonly<CommandResult>): boolean {
  return result.code === 0 && !result.timedOut && result.signal === undefined && result.spawnError === undefined;
}

function isMissingExecutable(result: Readonly<CommandResult>): boolean {
  const detail = `${result.spawnError ?? ""}\n${result.stderr}`;
  return result.code === 127
    || /\bENOENT\b|command not found|not recognized as an internal or external command|no such file or directory/iu.test(detail);
}

function commandEvidence(result: Readonly<CommandResult>): readonly string[] {
  return [
    ...(result.spawnError === undefined ? [] : [`Unable to start command: ${result.spawnError}`]),
    ...(result.timedOut ? ["Command timed out."] : []),
    ...(result.signal === undefined ? [] : [`Command stopped with signal ${result.signal}.`]),
    ...(result.code === 0 ? [] : [`Command exited with code ${String(result.code)}.`]),
    ...(result.stdout.trim() === "" ? [] : [`stdout: ${result.stdout.trim()}`]),
    ...(result.stderr.trim() === "" ? [] : [`stderr: ${result.stderr.trim()}`]),
  ];
}

function diagnostic(
  context: Readonly<DoctorContext>,
  startedAt: number,
  input: Omit<DiagnosticResult, "durationMs" | "module">,
): DiagnosticResult {
  return diagnosticResult(
    {
      module: "dotnet",
      ...input,
    },
    startedAt,
    context.now,
  );
}

function issueDiagnostic(
  context: Readonly<DoctorContext>,
  startedAt: number,
  input: Readonly<{
    id: string;
    name: string;
    status: "warn" | "fail";
    summary: string;
    evidence: readonly string[];
    fixes: readonly DiagnosticFix[];
    rootCause?: string;
    potentialCauses?: readonly DiagnosticPotentialCause[];
  }>,
): DiagnosticResult {
  return diagnostic(context, startedAt, {
    id: input.id,
    name: input.name,
    status: input.status,
    summary: input.summary,
    evidence: input.evidence,
    ...(input.rootCause === undefined ? {} : {rootCause: input.rootCause}),
    potentialCauses: input.potentialCauses ?? [],
    fixes: input.fixes,
  });
}

function passDiagnostic(
  context: Readonly<DoctorContext>,
  startedAt: number,
  id: string,
  name: string,
  summary: string,
  evidence: readonly string[],
): DiagnosticResult {
  return diagnostic(context, startedAt, {
    id,
    name,
    status: "pass",
    summary,
    evidence,
    potentialCauses: [],
    fixes: [],
  });
}

function parseDotnetVersionText(value: string): MinimumVersion | null {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.]+)?$/u.exec(value.trim());
  if (match === null || match[1] === undefined || match[2] === undefined || match[3] === undefined) {
    return null;
  }
  return {major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3])};
}

function commonDotnetExecutableCandidates(context: Readonly<DoctorContext>): readonly string[] {
  if (context.platform === "win32") {
    const programFiles = context.env["ProgramFiles"];
    const programFilesX86 = context.env["ProgramFiles(x86)"];
    const localAppData = context.env["LOCALAPPDATA"];
    return [
      ...(programFiles === undefined ? [] : [resolve(programFiles, "dotnet", "dotnet.exe")]),
      ...(programFilesX86 === undefined ? [] : [resolve(programFilesX86, "dotnet", "dotnet.exe")]),
      ...(localAppData === undefined ? [] : [resolve(localAppData, "Microsoft", "dotnet", "dotnet.exe")]),
    ];
  }

  const home = context.env["HOME"] ?? homedir();
  return ["/usr/local/share/dotnet/dotnet", "/usr/share/dotnet/dotnet", resolve(home, ".dotnet", "dotnet")];
}

async function runDotnetResolutionProbe(context: Readonly<DoctorContext>): Promise<CommandResult> {
  const options = {cwd: context.paths.root};
  if (context.platform === "win32") {
    return context.runner.run({command: "where.exe", args: ["dotnet.exe"]}, options);
  }
  return context.runner.run({command: "which", args: ["dotnet"]}, options);
}

async function executableFailureEvidence(context: Readonly<DoctorContext>): Promise<readonly string[]> {
  if (context.options.quick) {
    return ["Quick mode omitted PATH and common-location follow-up probes."];
  }

  const resolution = await runDotnetResolutionProbe(context);
  const evidence = commandEvidence(resolution).map((entry) => `Resolution probe: ${entry}`);
  if (isSuccessfulCommand(resolution) && resolution.stdout.trim() !== "") {
    evidence.push(`Resolution candidates: ${resolution.stdout.trim()}`);
  }

  const existingCandidates: string[] = [];
  for (const candidate of commonDotnetExecutableCandidates(context)) {
    try {
      await access(candidate, fsConstants.X_OK);
      existingCandidates.push(candidate);
    } catch {
      // A failed read-only access probe is represented by absence from evidence.
    }
  }
  evidence.push(
    existingCandidates.length === 0
      ? "No dotnet executable was found in supported common installation locations."
      : `dotnet executable exists outside the active PATH: ${existingCandidates.join(", ")}`,
  );
  return evidence;
}

async function diagnoseExecutable(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.now();
  const result = await context.runner.run(DOTNET_VERSION_COMMAND, {cwd: context.paths.root});
  const version = parseDotnetVersionText(result.stdout);
  if (isSuccessfulCommand(result) && version !== null) {
    return passDiagnostic(
      context,
      startedAt,
      "dotnet.executable",
      "dotnet executable",
      "The dotnet executable is available and reports a valid version.",
      [result.stdout.trim()],
    );
  }

  const missing = isMissingExecutable(result);
  const followUp = missing ? await executableFailureEvidence(context) : [];
  return issueDiagnostic(context, startedAt, {
    id: "dotnet.executable",
    name: "dotnet executable",
    status: "fail",
    summary: missing ? "The dotnet executable was not found." : "dotnet returned an unrecognized version string.",
    evidence: [...commandEvidence(result), ...followUp],
    potentialCauses: [
      {cause: "The .NET SDK is not installed.", confidence: "high"},
      {cause: "PATH does not include the active dotnet installation.", confidence: "medium"},
    ],
    fixes: [{description: "Install the .NET SDK and ensure dotnet is available on PATH, then rerun doctor."}],
  });
}

interface ParsedSdkLine {
  readonly raw: string;
  readonly version: MinimumVersion | null;
}

function parseSdkListLines(stdout: string): readonly ParsedSdkLine[] {
  return stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => {
      const match = /^(\S+)\s+\[.+\]$/u.exec(line);
      const versionText = match?.[1];
      return {raw: line, version: versionText === undefined ? null : parseDotnetVersionText(versionText)};
    });
}

async function diagnoseSdkInventory(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  if (context.requirements.status === "invalid") {
    return skippedDiagnostic({
      id: "dotnet.sdk-inventory",
      module: "dotnet",
      name: "Installed SDK inventory",
      summary: "SDK comparison was skipped because requirement sources are invalid.",
      evidence: ["Blocked by invalid runtime requirement sources."],
    });
  }

  const startedAt = context.now();
  const result = await context.runner.run(DOTNET_LIST_SDKS_COMMAND, {cwd: context.paths.root});
  if (!isSuccessfulCommand(result)) {
    return issueDiagnostic(context, startedAt, {
      id: "dotnet.sdk-inventory",
      name: "Installed SDK inventory",
      status: "fail",
      summary: "Installed .NET SDKs could not be listed.",
      evidence: commandEvidence(result),
      potentialCauses: [{cause: "The dotnet executable is missing or not functioning.", confidence: "high"}],
      fixes: [{description: "Repair the .NET SDK installation, then rerun doctor."}],
    });
  }

  const required = context.requirements.requirements.dotnet;
  const entries = parseSdkListLines(result.stdout);
  const compatible = entries.filter((entry) => entry.version !== null && satisfiesMinimum(entry.version, required));

  if (compatible.length === 0) {
    return issueDiagnostic(context, startedAt, {
      id: "dotnet.sdk-inventory",
      name: "Installed SDK inventory",
      status: "fail",
      summary: "No installed .NET SDK satisfies the repository requirement.",
      evidence: entries.length === 0 ? ["dotnet --list-sdks returned no installed SDKs."] : entries.map((entry) => entry.raw),
      rootCause: `No installed SDK satisfies the repository minimum of net${String(required.major)}.${String(required.minor)}.`,
      fixes: [{description: "Install a .NET SDK meeting the repository minimum, then rerun doctor."}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "dotnet.sdk-inventory",
    "Installed SDK inventory",
    "At least one installed .NET SDK satisfies the repository requirement.",
    entries.map((entry) => entry.raw),
  );
}

function normalizedNodeArch(dotnetArchitecture: string): string {
  return DOTNET_ARCHITECTURE_TO_NODE_ARCH[dotnetArchitecture.toLowerCase()] ?? dotnetArchitecture.toLowerCase();
}

/**
 * Parses the SDK version, host version, architecture, and RID from `dotnet --info` output.
 *
 * @param stdout - Complete captured standard output of `dotnet --info`.
 * @returns The recognized fields; unresolved fields are omitted.
 */
export function parseDotnetInfo(stdout: string): Readonly<{
  sdkVersion?: string;
  hostVersion?: string;
  architecture?: string;
  rid?: string;
}> {
  const sdkVersion = /\.NET SDK:[\s\S]*?\n\s*Version:\s*([^\r\n]+)/u.exec(stdout)?.[1]?.trim();
  const rid = /Runtime Environment:[\s\S]*?\n\s*RID:\s*([^\r\n]+)/u.exec(stdout)?.[1]?.trim();
  const hostSection = /Host:\s*\r?\n((?:.*\r?\n?)*?)(?:\r?\n\s*\r?\n|$)/u.exec(stdout)?.[1];
  const hostVersion = hostSection === undefined ? undefined : /Version:\s*([^\r\n]+)/u.exec(hostSection)?.[1]?.trim();
  const architecture = hostSection === undefined ? undefined : /Architecture:\s*([^\r\n]+)/u.exec(hostSection)?.[1]?.trim();

  return {
    ...(sdkVersion === undefined || sdkVersion === "" ? {} : {sdkVersion}),
    ...(hostVersion === undefined || hostVersion === "" ? {} : {hostVersion}),
    ...(architecture === undefined || architecture === "" ? {} : {architecture}),
    ...(rid === undefined || rid === "" ? {} : {rid}),
  };
}

async function diagnoseHost(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.now();
  const result = await context.runner.run(DOTNET_INFO_COMMAND, {cwd: context.paths.root});
  if (!isSuccessfulCommand(result)) {
    return issueDiagnostic(context, startedAt, {
      id: "dotnet.host",
      name: ".NET host",
      status: "fail",
      summary: "dotnet --info could not be read.",
      evidence: commandEvidence(result),
      potentialCauses: [
        {cause: "The dotnet executable is missing or not functioning.", confidence: "high"},
        {cause: "The active .NET installation is corrupted.", confidence: "medium"},
      ],
      fixes: [{description: "Repair or reinstall the .NET SDK, then rerun doctor."}],
    });
  }

  const info = parseDotnetInfo(result.stdout);
  if (info.hostVersion === undefined || info.architecture === undefined) {
    return issueDiagnostic(context, startedAt, {
      id: "dotnet.host",
      name: ".NET host",
      status: "fail",
      summary: "dotnet --info returned an unrecognized Host section.",
      evidence: [`stdout: ${result.stdout.trim()}`],
      rootCause: "The dotnet --info output format could not be parsed.",
      fixes: [{description: "Run dotnet --info manually and inspect the complete output.", command: "dotnet --info"}],
    });
  }

  const normalizedHostArch = normalizedNodeArch(info.architecture);
  if (normalizedHostArch !== context.arch) {
    return issueDiagnostic(context, startedAt, {
      id: "dotnet.host",
      name: ".NET host",
      status: "fail",
      summary: "The installed .NET host architecture does not match the current process architecture.",
      evidence: [`Host architecture: ${info.architecture}`, `Process architecture: ${context.arch}`],
      rootCause: "A mismatched .NET host architecture can degrade native performance or break architecture-specific tooling.",
      fixes: [{description: "Install a .NET SDK matching the host process architecture, then rerun doctor."}],
    });
  }

  return passDiagnostic(context, startedAt, "dotnet.host", ".NET host", "The .NET host version and architecture are valid.", [
    `Host version: ${info.hostVersion}`,
    `Architecture: ${info.architecture}`,
    ...(info.rid === undefined ? [] : [`RID: ${info.rid}`]),
  ]);
}

async function diagnoseWorkloads(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.now();
  const result = await context.runner.run(DOTNET_WORKLOAD_LIST_COMMAND, {cwd: context.paths.root});
  if (!isSuccessfulCommand(result)) {
    return issueDiagnostic(context, startedAt, {
      id: "dotnet.workloads",
      name: "Installed workloads",
      status: "warn",
      summary: "Installed .NET workloads could not be read.",
      evidence: commandEvidence(result),
      rootCause: "dotnet workload metadata could not be read.",
      fixes: [{description: "Verify the .NET SDK installation providing workload manifests, then rerun doctor."}],
    });
  }

  const trimmed = result.stdout.trim();
  return passDiagnostic(
    context,
    startedAt,
    "dotnet.workloads",
    "Installed workloads",
    "Installed .NET workloads were read successfully.",
    [trimmed === "" ? "No workloads are installed." : trimmed],
  );
}

async function findPackagesLockFiles(root: string): Promise<readonly string[]> {
  const results: string[] = [];

  async function walk(directory: string, depth: number): Promise<void> {
    if (depth > MAX_LOCK_FILE_SEARCH_DEPTH) {
      return;
    }

    let entries;
    try {
      entries = await readdir(directory, {withFileTypes: true});
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (EXCLUDED_LOCK_FILE_DIRECTORIES.has(entry.name)) {
          continue;
        }
        await walk(resolve(directory, entry.name), depth + 1);
      } else if (entry.isFile() && entry.name === "packages.lock.json") {
        results.push(resolve(directory, entry.name));
      }
    }
  }

  await walk(root, 0);
  return results.toSorted();
}

async function diagnoseNugetState(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.now();
  const result = await context.runner.run(DOTNET_NUGET_LOCALS_COMMAND, {cwd: context.paths.root});
  if (!isSuccessfulCommand(result)) {
    return issueDiagnostic(context, startedAt, {
      id: "dotnet.nuget-state",
      name: "NuGet package cache",
      status: "fail",
      summary: "The NuGet global-packages cache location could not be resolved.",
      evidence: commandEvidence(result),
      potentialCauses: [{cause: "The dotnet executable is missing or not functioning.", confidence: "high"}],
      fixes: [{description: "Repair the .NET SDK installation, then rerun doctor."}],
    });
  }

  const cachePathMatch = /global-packages:\s*(.+)/iu.exec(result.stdout);
  const cachePath = cachePathMatch?.[1]?.trim();
  const evidence: string[] = [];
  let cacheExists = false;
  if (cachePath === undefined || cachePath === "") {
    evidence.push("dotnet nuget locals did not report a global-packages cache path.");
  } else {
    evidence.push(`Global-packages cache: ${cachePath}`);
    try {
      await access(cachePath, fsConstants.R_OK);
      cacheExists = true;
    } catch {
      evidence.push("The global-packages cache directory does not exist yet.");
    }
  }

  const lockFiles = await findPackagesLockFiles(context.paths.root);
  const invalidLockFiles: string[] = [];
  for (const lockFile of lockFiles) {
    try {
      const contents = await readFile(lockFile, "utf8");
      const parsed: unknown = JSON.parse(contents);
      if (!isRecord(parsed) || parsed["version"] === undefined) {
        invalidLockFiles.push(lockFile);
      }
    } catch {
      invalidLockFiles.push(lockFile);
    }
  }
  evidence.push(`${String(lockFiles.length)} packages.lock.json file${lockFiles.length === 1 ? "" : "s"} inspected.`);

  if (invalidLockFiles.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "dotnet.nuget-state",
      name: "NuGet package cache",
      status: "fail",
      summary: "One or more packages.lock.json files are invalid.",
      evidence: [...evidence, ...invalidLockFiles.map((path) => `Invalid packages.lock.json: ${path}`)],
      rootCause: "Tracked NuGet lock files are malformed or unreadable.",
      fixes: [{description: "Regenerate the affected packages.lock.json files, then rerun doctor."}],
    });
  }

  if (!cacheExists) {
    return issueDiagnostic(context, startedAt, {
      id: "dotnet.nuget-state",
      name: "NuGet package cache",
      status: "warn",
      summary: "The NuGet global-packages cache has not been populated.",
      evidence,
      rootCause: "NuGet packages have not been restored for this checkout.",
      fixes: [{description: "Restore NuGet dependencies for the solution, then rerun doctor."}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "dotnet.nuget-state",
    "NuGet package cache",
    "The NuGet global-packages cache and tracked lock files are valid.",
    evidence,
  );
}

function parseSolutionProjectPaths(contents: string): readonly string[] {
  return [...contents.matchAll(/<Project\s+Path="([^"]+)"/gu)]
    .map((match) => match[1] ?? "")
    .filter((value) => value !== "");
}

async function diagnoseSolution(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.now();
  let contents: string;
  try {
    contents = await readFile(context.paths.solution, "utf8");
  } catch (error: unknown) {
    return issueDiagnostic(context, startedAt, {
      id: "dotnet.solution",
      name: "Solution projects",
      status: "fail",
      summary: "The arolariu.slnx solution file could not be read.",
      evidence: [errorMessage(error)],
      rootCause: "The tracked solution file is missing or inaccessible.",
      fixes: [{description: "Restore a valid arolariu.slnx file, then rerun doctor."}],
    });
  }

  const projectPaths = parseSolutionProjectPaths(contents);
  if (projectPaths.length === 0) {
    return issueDiagnostic(context, startedAt, {
      id: "dotnet.solution",
      name: "Solution projects",
      status: "fail",
      summary: "The solution file declares no projects.",
      evidence: [context.paths.solution],
      rootCause: "The tracked solution file is malformed or empty.",
      fixes: [{description: "Restore a valid arolariu.slnx file, then rerun doctor."}],
    });
  }

  const missing: string[] = [];
  for (const projectPath of projectPaths) {
    try {
      await access(resolve(context.paths.root, projectPath), fsConstants.R_OK);
    } catch {
      missing.push(projectPath);
    }
  }

  if (missing.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "dotnet.solution",
      name: "Solution projects",
      status: "fail",
      summary: "One or more solution project references are missing.",
      evidence: missing.map((path) => `Missing project: ${path}`),
      rootCause: "The solution references project files that do not exist in this checkout.",
      fixes: [{description: "Restore the missing project files or correct arolariu.slnx, then rerun doctor."}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "dotnet.solution",
    "Solution projects",
    "All solution project references resolve to existing files.",
    [`${String(projectPaths.length)} project${projectPaths.length === 1 ? "" : "s"} validated.`],
  );
}

function parseToolListLocal(stdout: string): readonly string[] {
  return stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !/^-+$/u.test(line) && !/^package id\b/iu.test(line))
    .map((line) => line.split(/\s+/u)[0] ?? "")
    .filter((value) => value !== "");
}

async function diagnoseLocalTools(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.now();
  let manifestTools: readonly string[];
  try {
    const contents = await readFile(context.paths.dotnetToolManifest, "utf8");
    const parsed: unknown = JSON.parse(contents);
    manifestTools = isRecord(parsed) && isRecord(parsed["tools"]) ? Object.keys(parsed["tools"]) : [];
  } catch (error: unknown) {
    return issueDiagnostic(context, startedAt, {
      id: "dotnet.local-tools",
      name: "Local tool manifest",
      status: "fail",
      summary: "The local tool manifest could not be read.",
      evidence: [errorMessage(error)],
      rootCause: "The tracked .config/dotnet-tools.json manifest is missing or malformed.",
      fixes: [{description: "Restore a valid .config/dotnet-tools.json manifest, then rerun doctor."}],
    });
  }

  const result = await context.runner.run(DOTNET_TOOL_LIST_LOCAL_COMMAND, {cwd: context.paths.root});
  if (!isSuccessfulCommand(result)) {
    return issueDiagnostic(context, startedAt, {
      id: "dotnet.local-tools",
      name: "Local tool manifest",
      status: "fail",
      summary: "Installed local tools could not be listed.",
      evidence: commandEvidence(result),
      potentialCauses: [{cause: "The dotnet executable is missing or not functioning.", confidence: "high"}],
      fixes: [{description: "Repair the .NET SDK installation, then rerun doctor."}],
    });
  }

  const installedTools = new Set(parseToolListLocal(result.stdout).map((id) => id.toLowerCase()));
  const missingFromInstall = manifestTools
    .map((id) => id.toLowerCase())
    .filter((id) => !installedTools.has(id))
    .toSorted();

  if (missingFromInstall.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "dotnet.local-tools",
      name: "Local tool manifest",
      status: "warn",
      summary: "One or more manifest tools are not installed locally.",
      evidence: missingFromInstall.map((id) => `Missing local tool: ${id}`),
      rootCause: "Local tools declared in .config/dotnet-tools.json have not been restored.",
      fixes: [{description: "Restore local .NET tools for this checkout.", command: "dotnet tool restore"}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "dotnet.local-tools",
    "Local tool manifest",
    "Installed local tools satisfy the tracked manifest.",
    [`${String(manifestTools.length)} manifest tool${manifestTools.length === 1 ? "" : "s"} installed.`],
  );
}

async function diagnoseHttpsCertificate(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  if (context.options.ci) {
    return skippedDiagnostic({
      id: "dotnet.https-certificate",
      module: "dotnet",
      name: "HTTPS development certificate",
      summary: "Certificate trust inspection was skipped under CI.",
      evidence: ["--ci intentionally skips host-local certificate trust inspection."],
    });
  }

  const startedAt = context.now();
  const [checkResult, trustResult] = await Promise.all([
    context.runner.run(DOTNET_DEV_CERTS_CHECK_COMMAND, {cwd: context.paths.root}),
    context.runner.run(DOTNET_DEV_CERTS_CHECK_TRUST_COMMAND, {cwd: context.paths.root}),
  ]);

  if (!isSuccessfulCommand(checkResult)) {
    return issueDiagnostic(context, startedAt, {
      id: "dotnet.https-certificate",
      name: "HTTPS development certificate",
      status: "fail",
      summary: "No valid ASP.NET Core HTTPS development certificate was found.",
      evidence: commandEvidence(checkResult),
      rootCause: "The local HTTPS development certificate is missing or invalid.",
      fixes: [{description: "Generate and trust a local HTTPS development certificate.", command: "dotnet dev-certs https --trust"}],
    });
  }

  if (!isSuccessfulCommand(trustResult)) {
    return issueDiagnostic(context, startedAt, {
      id: "dotnet.https-certificate",
      name: "HTTPS development certificate",
      status: "warn",
      summary: "The HTTPS development certificate exists but is not trusted.",
      evidence: commandEvidence(trustResult),
      rootCause: "The local HTTPS development certificate is not trusted by this machine.",
      fixes: [{description: "Trust the local HTTPS development certificate.", command: "dotnet dev-certs https --trust"}],
    });
  }

  const evidence = commandEvidence(checkResult);
  return passDiagnostic(
    context,
    startedAt,
    "dotnet.https-certificate",
    "HTTPS development certificate",
    "A valid and trusted HTTPS development certificate is present.",
    evidence.length > 0 ? evidence : ["dotnet dev-certs https --check --trust succeeded."],
  );
}

/**
 * Determines which required Aspire AppHost parameters are configured.
 *
 * Values are inspected only for presence; they are never retained or returned.
 *
 * @param appSettings - Parsed tracked AppHost appsettings document.
 * @param userSecretsOutput - Optional captured `dotnet user-secrets list --json` output.
 * @returns The required parameter keys that are present and those still missing.
 */
export function inspectAppHostParameters(
  appSettings: unknown,
  userSecretsOutput?: string,
): Readonly<{
  present: readonly string[];
  missing: readonly string[];
}> {
  const present = new Set<string>();

  if (isRecord(appSettings)) {
    const parameters = appSettings["Parameters"];
    if (isRecord(parameters)) {
      for (const key of REQUIRED_APPHOST_PARAMETER_KEYS) {
        const suffix = key.split(":")[1];
        const value = suffix === undefined ? undefined : parameters[suffix];
        if (typeof value === "string" && value.trim() !== "") {
          present.add(key);
        }
      }
    }
  }

  if (userSecretsOutput !== undefined && userSecretsOutput.trim() !== "") {
    try {
      const parsed: unknown = JSON.parse(userSecretsOutput);
      if (isRecord(parsed)) {
        for (const key of REQUIRED_APPHOST_PARAMETER_KEYS) {
          const value = parsed[key];
          if (typeof value === "string" && value.trim() !== "") {
            present.add(key);
          }
        }
      }
    } catch {
      // Malformed secrets output contributes no additional parameter coverage.
    }
  }

  return {
    present: REQUIRED_APPHOST_PARAMETER_KEYS.filter((key) => present.has(key)),
    missing: REQUIRED_APPHOST_PARAMETER_KEYS.filter((key) => !present.has(key)),
  };
}

function parseAppHostTargetFramework(contents: string): Readonly<{major: number; minor: number}> | null {
  const match = /<TargetFramework>\s*net(\d+)\.(\d+)\s*<\/TargetFramework>/u.exec(contents);
  if (match === null || match[1] === undefined || match[2] === undefined) {
    return null;
  }
  return {major: Number(match[1]), minor: Number(match[2])};
}

async function diagnoseAppHost(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  if (context.options.ci) {
    return skippedDiagnostic({
      id: "dotnet.apphost",
      module: "dotnet",
      name: "AppHost configuration",
      summary: "AppHost local-parameter inspection was skipped under CI.",
      evidence: ["--ci intentionally skips host-local Aspire parameter inspection."],
    });
  }

  const startedAt = context.now();
  const projectPath = resolve(context.paths.root, ...APPHOST_PROJECT_RELATIVE_PATH);
  let projectContents: string;
  try {
    projectContents = await readFile(projectPath, "utf8");
  } catch (error: unknown) {
    return issueDiagnostic(context, startedAt, {
      id: "dotnet.apphost",
      name: "AppHost configuration",
      status: "fail",
      summary: "The AppHost project file could not be read.",
      evidence: [errorMessage(error)],
      rootCause: "tooling/AppHost/AppHost.csproj is missing or inaccessible.",
      fixes: [{description: "Restore the tooling/AppHost project, then rerun doctor."}],
    });
  }

  const targetFramework = parseAppHostTargetFramework(projectContents);
  if (targetFramework === null) {
    return issueDiagnostic(context, startedAt, {
      id: "dotnet.apphost",
      name: "AppHost configuration",
      status: "fail",
      summary: "The AppHost project does not declare a recognized TargetFramework.",
      evidence: [projectPath],
      rootCause: "tooling/AppHost/AppHost.csproj is malformed.",
      fixes: [{description: "Restore a valid TargetFramework in AppHost.csproj, then rerun doctor."}],
    });
  }

  if (
    context.requirements.status === "valid"
    && !satisfiesMinimum({major: targetFramework.major, minor: targetFramework.minor, patch: 0}, context.requirements.requirements.dotnet)
  ) {
    return issueDiagnostic(context, startedAt, {
      id: "dotnet.apphost",
      name: "AppHost configuration",
      status: "fail",
      summary: "The AppHost target framework is older than the repository requirement.",
      evidence: [`AppHost TargetFramework: net${String(targetFramework.major)}.${String(targetFramework.minor)}`],
      rootCause: "tooling/AppHost/AppHost.csproj targets an unsupported framework.",
      fixes: [{description: "Update the AppHost TargetFramework to match the repository requirement, then rerun doctor."}],
    });
  }

  let appSettings: unknown = {};
  try {
    appSettings = JSON.parse(await readFile(resolve(context.paths.root, ...APPHOST_DEV_SETTINGS_RELATIVE_PATH), "utf8"));
  } catch {
    appSettings = {};
  }

  let inspection = inspectAppHostParameters(appSettings);
  if (inspection.missing.length > 0) {
    const secretsResult = await context.runner.run(DOTNET_APPHOST_USER_SECRETS_COMMAND, {cwd: context.paths.root});
    if (isSuccessfulCommand(secretsResult)) {
      inspection = inspectAppHostParameters(appSettings, secretsResult.stdout);
    }
  }

  if (inspection.missing.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "dotnet.apphost",
      name: "AppHost configuration",
      status: "warn",
      summary: "One or more required Aspire parameters are not configured.",
      evidence: inspection.missing.map((key) => `Missing parameter key: ${key}`),
      rootCause: "Required Aspire parameters remain unset for local AppHost configuration.",
      fixes: [{description: "Set the missing Aspire parameters through dotnet user-secrets, then rerun doctor."}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "dotnet.apphost",
    "AppHost configuration",
    "The AppHost target framework and required Aspire parameters are configured.",
    [
      `AppHost TargetFramework: net${String(targetFramework.major)}.${String(targetFramework.minor)}`,
      ...inspection.present.map((key) => `Configured parameter key: ${key}`),
    ],
  );
}

/**
 * Validates that a NuGet v3 service index response body is a JSON object exposing a `resources` array.
 *
 * @param body - Captured HTTP response body, when the network probe recorded one.
 * @returns Whether the body is a well-formed NuGet v3 service index.
 */
function isValidNugetServiceIndex(body: string | undefined): boolean {
  if (body === undefined || body.trim() === "") {
    return false;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return false;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return false;
  }

  return Array.isArray((parsed as Readonly<Record<string, unknown>>)["resources"]);
}

async function diagnoseNugetFeed(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  if (context.options.quick) {
    return skippedDiagnostic({
      id: "dotnet.nuget-feed",
      module: "dotnet",
      name: "NuGet feed reachability",
      summary: "NuGet feed reachability was skipped in quick mode.",
      evidence: ["--quick intentionally skips network reachability probes."],
    });
  }

  const startedAt = context.now();
  const probe = await context.network.get(NUGET_FEED_URL, DIAGNOSTIC_DEFAULT_TIMEOUT_MS);
  if (probe.status !== "reachable") {
    return skippedDiagnostic({
      id: "dotnet.nuget-feed",
      module: "dotnet",
      name: "NuGet feed reachability",
      summary: "NuGet feed reachability could not be determined.",
      evidence: [probe.error ?? `Network probe reported status '${probe.status}'.`],
    });
  }

  if (probe.statusCode !== 200) {
    return issueDiagnostic(context, startedAt, {
      id: "dotnet.nuget-feed",
      name: "NuGet feed reachability",
      status: "warn",
      summary: "The NuGet feed returned an unexpected response.",
      evidence: [`HTTP status: ${String(probe.statusCode)}`],
      rootCause: "The public NuGet v3 feed responded without a successful status.",
      fixes: [{description: "Verify NuGet feed availability and configured sources, then rerun doctor."}],
    });
  }

  if (!isValidNugetServiceIndex(probe.body)) {
    return issueDiagnostic(context, startedAt, {
      id: "dotnet.nuget-feed",
      name: "NuGet feed reachability",
      status: "warn",
      summary: "The NuGet feed returned a malformed service index.",
      evidence: [
        `HTTP status: ${String(probe.statusCode)}`,
        probe.body === undefined || probe.body.trim() === ""
          ? "No response body was captured."
          : `Response body: ${probe.body.trim()}`,
      ],
      rootCause: "The NuGet v3 service index response did not contain a JSON object with a resources array.",
      fixes: [{description: "Verify NuGet feed availability and configured sources, then rerun doctor."}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "dotnet.nuget-feed",
    "NuGet feed reachability",
    "The public NuGet feed is reachable.",
    [`HTTP status: ${String(probe.statusCode)}`],
  );
}

/** Read-only .NET diagnostic module. */
export const dotnetDoctorModule: DiagnosticModule = {
  id: "dotnet",
  title: ".NET",
  async run(context): Promise<readonly DiagnosticResult[]> {
    return [
      await diagnoseExecutable(context),
      await diagnoseSdkInventory(context),
      await diagnoseHost(context),
      await diagnoseWorkloads(context),
      await diagnoseNugetState(context),
      await diagnoseSolution(context),
      await diagnoseLocalTools(context),
      await diagnoseHttpsCertificate(context),
      await diagnoseAppHost(context),
      await diagnoseNugetFeed(context),
    ];
  },
};
