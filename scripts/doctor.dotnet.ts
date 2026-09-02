/**
 * @fileoverview Read-only .NET diagnostics sourced exclusively from shared DotnetFacts.
 * @module scripts.doctor.dotnet
 *
 * @remarks
 * Every diagnostic row in this module is derived exclusively from the shared `DotnetFacts`
 * produced by `context.inspection.inspect("dotnet")`, `context.requirements` for version policy,
 * and `context.network.get()` for NuGet feed reachability. This module never spawns a command,
 * never reads a file, and never uses an unrestricted runner or `context.probes`. When the shared
 * inspection outcome is `unavailable` or `invalid`, every fact-dependent row is an explicit
 * failure; no diagnostic ever fabricates a healthy value from missing facts.
 */

import {satisfiesMinimum, type MinimumVersion} from "./common/requirements.ts";
import {boundEvidence, diagnosticResult, STANDARD_EVIDENCE_LIMIT} from "./doctor.diagnostics.ts";
import {
  DIAGNOSTIC_DEFAULT_TIMEOUT_MS,
  skippedDiagnostic,
  type DiagnosticFix,
  type DiagnosticModule,
  type DiagnosticPotentialCause,
  type DiagnosticResult,
  type DoctorContext,
} from "./doctor.types.ts";
import type {DotnetFacts} from "./inspection/dotnet.ts";
import type {InspectionOutcome} from "./inspection/types.ts";

const NUGET_FEED_URL = new URL("https://api.nuget.org/v3/index.json");
const REQUIRED_LOCAL_TOOL = "defaultdocumentation.console";
const DOTNET_ARCHITECTURE_TO_NODE_ARCH: Readonly<Record<string, string>> = {
  x64: "x64",
  arm64: "arm64",
  x86: "ia32",
  arm: "arm",
};

const DOTNET_INSPECTION_RESOLUTION_FIX = "Resolve the reported .NET inspection problem, then rerun doctor.";

type UnknownRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function diagnostic(
  ctx: Readonly<DoctorContext>,
  startedAt: number,
  input: Omit<DiagnosticResult, "durationMs" | "module">,
): DiagnosticResult {
  return diagnosticResult({module: "dotnet", ...input}, startedAt, ctx.clock.monotonicNow);
}

function issueDiagnostic(
  ctx: Readonly<DoctorContext>,
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
  return diagnostic(ctx, startedAt, {
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
  ctx: Readonly<DoctorContext>,
  startedAt: number,
  id: string,
  name: string,
  summary: string,
  evidence: readonly string[],
): DiagnosticResult {
  return diagnostic(ctx, startedAt, {id, name, status: "pass", summary, evidence, potentialCauses: [], fixes: []});
}

function boundedIssues(issues: readonly string[]): readonly string[] {
  return boundEvidence(issues, false);
}

function buildIssueDiagnosis(
  issues: readonly string[],
): Readonly<{rootCause?: string; potentialCauses: readonly DiagnosticPotentialCause[]}> {
  const [rootCause] = issues;
  if (issues.length === 1 && rootCause !== undefined) {
    return {rootCause, potentialCauses: []};
  }
  return {
    potentialCauses: issues.slice(0, STANDARD_EVIDENCE_LIMIT).map((cause) => ({cause, confidence: "high" as const})),
  };
}

function normalizedNodeArch(dotnetArchitecture: string): string {
  return DOTNET_ARCHITECTURE_TO_NODE_ARCH[dotnetArchitecture.toLowerCase()] ?? dotnetArchitecture.toLowerCase();
}

function parseSdkMajorMinor(version: string): MinimumVersion | null {
  const match = /^(\d+)\.(\d+)\.(\d+)/u.exec(version);
  if (match === null || match[1] === undefined || match[2] === undefined || match[3] === undefined) {
    return null;
  }
  return {major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3])};
}

// ============================================================================
// Individual diagnostic functions
// ============================================================================

function diagnoseExecutable(ctx: Readonly<DoctorContext>, facts: Readonly<DotnetFacts>): DiagnosticResult {
  const startedAt = ctx.clock.monotonicNow();
  if (!facts.executable.available) {
    return issueDiagnostic(ctx, startedAt, {
      id: "dotnet.executable",
      name: "dotnet executable",
      status: "fail",
      summary: "The dotnet executable was not found.",
      evidence: [`Resolved paths: ${String(facts.executable.resolvedPaths.length)}`],
      potentialCauses: [
        {cause: "The .NET SDK is not installed.", confidence: "high"},
        {cause: "PATH does not include the active dotnet installation.", confidence: "medium"},
      ],
      fixes: [{description: "Install the .NET SDK and ensure dotnet is available on PATH, then rerun doctor."}],
    });
  }

  return passDiagnostic(
    ctx,
    startedAt,
    "dotnet.executable",
    "dotnet executable",
    "The dotnet executable is available and reports a valid version.",
    [
      ...(facts.selectedVersion === undefined ? [] : [facts.selectedVersion]),
      `${String(facts.executable.resolvedPaths.length)} resolved path${facts.executable.resolvedPaths.length === 1 ? "" : "s"}.`,
    ],
  );
}

function diagnoseSdkInventory(ctx: Readonly<DoctorContext>, facts: Readonly<DotnetFacts>): DiagnosticResult {
  if (ctx.requirements.status === "invalid") {
    return skippedDiagnostic({
      id: "dotnet.sdk-inventory",
      module: "dotnet",
      name: "Installed SDK inventory",
      summary: "SDK comparison was skipped because requirement sources are invalid.",
      evidence: ["Blocked by invalid runtime requirement sources."],
    });
  }

  const startedAt = ctx.clock.monotonicNow();
  const required = ctx.requirements.requirements.dotnet;
  const compatible = facts.sdks.filter((sdk) => {
    const parsed = parseSdkMajorMinor(sdk);
    return parsed !== null && satisfiesMinimum(parsed, required);
  });

  if (compatible.length === 0) {
    return issueDiagnostic(ctx, startedAt, {
      id: "dotnet.sdk-inventory",
      name: "Installed SDK inventory",
      status: "fail",
      summary: "No installed .NET SDK satisfies the repository requirement.",
      evidence: facts.sdks.length === 0 ? ["No installed SDKs were reported."] : facts.sdks.map((sdk) => `Installed: ${sdk}`),
      rootCause: `No installed SDK satisfies the repository minimum of net${String(required.major)}.${String(required.minor)}.`,
      fixes: [{description: "Install a .NET SDK meeting the repository minimum, then rerun doctor."}],
    });
  }

  // Warn if the selected version is not among the installed SDKs
  if (facts.selectedVersion !== undefined && !facts.sdks.includes(facts.selectedVersion)) {
    return issueDiagnostic(ctx, startedAt, {
      id: "dotnet.sdk-inventory",
      name: "Installed SDK inventory",
      status: "warn",
      summary: "The selected SDK version is not among the installed SDK inventory.",
      evidence: [`Selected: ${facts.selectedVersion}`, ...facts.sdks.map((sdk) => `Installed: ${sdk}`)],
      rootCause: `The active SDK ${facts.selectedVersion} does not appear in the installed SDK list.`,
      fixes: [{description: "Verify .NET SDK installation consistency, then rerun doctor."}],
    });
  }

  return passDiagnostic(
    ctx,
    startedAt,
    "dotnet.sdk-inventory",
    "Installed SDK inventory",
    "At least one installed .NET SDK satisfies the repository requirement.",
    facts.sdks.map((sdk) => `Installed: ${sdk}`),
  );
}

function diagnoseHost(ctx: Readonly<DoctorContext>, facts: Readonly<DotnetFacts>): DiagnosticResult {
  const startedAt = ctx.clock.monotonicNow();
  if (facts.host === undefined) {
    return issueDiagnostic(ctx, startedAt, {
      id: "dotnet.host",
      name: ".NET host",
      status: "fail",
      summary: "The .NET host information could not be determined.",
      evidence: ["Host facts are unavailable from the inspection."],
      rootCause: "The dotnet --info output format could not be parsed.",
      fixes: [{description: "Run dotnet --info manually and inspect the complete output.", command: "dotnet --info"}],
    });
  }

  const normalizedHostArch = normalizedNodeArch(facts.host.architecture);
  if (normalizedHostArch !== ctx.environment.architecture) {
    return issueDiagnostic(ctx, startedAt, {
      id: "dotnet.host",
      name: ".NET host",
      status: "fail",
      summary: "The installed .NET host architecture does not match the current process architecture.",
      evidence: [`Host architecture: ${facts.host.architecture}`, `Process architecture: ${ctx.environment.architecture}`],
      rootCause: "A mismatched .NET host architecture can degrade native performance or break architecture-specific tooling.",
      fixes: [{description: "Install a .NET SDK matching the host process architecture, then rerun doctor."}],
    });
  }

  return passDiagnostic(ctx, startedAt, "dotnet.host", ".NET host", "The .NET host version and architecture are valid.", [
    `Host version: ${facts.host.version}`,
    `Architecture: ${facts.host.architecture}`,
    `RID: ${facts.host.rid}`,
  ]);
}

function diagnoseWorkloads(ctx: Readonly<DoctorContext>, facts: Readonly<DotnetFacts>): DiagnosticResult {
  const startedAt = ctx.clock.monotonicNow();
  return passDiagnostic(
    ctx,
    startedAt,
    "dotnet.workloads",
    "Installed workloads",
    "Installed .NET workloads were read successfully.",
    facts.workloads.length === 0 ? ["No workloads are installed."] : facts.workloads.map((w) => `Workload: ${w}`),
  );
}

function diagnoseNugetState(ctx: Readonly<DoctorContext>, facts: Readonly<DotnetFacts>): DiagnosticResult {
  const startedAt = ctx.clock.monotonicNow();
  if (facts.nugetCachePath === undefined) {
    return issueDiagnostic(ctx, startedAt, {
      id: "dotnet.nuget-state",
      name: "NuGet package cache",
      status: "warn",
      summary: "The NuGet global-packages cache path could not be resolved.",
      evidence: ["No global-packages cache path was reported."],
      rootCause: "NuGet packages have not been restored for this checkout.",
      fixes: [{description: "Restore NuGet dependencies for the solution, then rerun doctor."}],
    });
  }

  return passDiagnostic(ctx, startedAt, "dotnet.nuget-state", "NuGet package cache", "The NuGet global-packages cache is available.", [
    "Global-packages cache is configured.",
  ]);
}

function diagnoseSolution(ctx: Readonly<DoctorContext>, facts: Readonly<DotnetFacts>): DiagnosticResult {
  const startedAt = ctx.clock.monotonicNow();
  if (facts.solutionIssues.length > 0) {
    const evidence = boundedIssues(facts.solutionIssues);
    const diagnosis = buildIssueDiagnosis(facts.solutionIssues);
    return issueDiagnostic(ctx, startedAt, {
      id: "dotnet.solution",
      name: "Solution projects",
      status: "fail",
      summary: `The solution has ${String(facts.solutionIssues.length)} structural issue${facts.solutionIssues.length === 1 ? "" : "s"}.`,
      evidence,
      ...diagnosis,
      fixes: [{description: "Restore the missing project files or correct arolariu.slnx, then rerun doctor."}],
    });
  }

  if (facts.solutionRestoreIssues.length > 0) {
    const evidence = boundedIssues(facts.solutionRestoreIssues);
    return issueDiagnostic(ctx, startedAt, {
      id: "dotnet.solution",
      name: "Solution projects",
      status: "warn",
      summary: `${String(facts.solutionRestoreIssues.length)} NuGet restore issue${facts.solutionRestoreIssues.length === 1 ? "" : "s"} detected.`,
      evidence,
      rootCause: "Generated NuGet restore assets are missing or invalid for some projects.",
      fixes: [{description: "Restore NuGet dependencies for the solution, then rerun doctor.", command: "dotnet restore"}],
    });
  }

  return passDiagnostic(
    ctx,
    startedAt,
    "dotnet.solution",
    "Solution projects",
    "All solution project references and restore assets are valid.",
    ["No structural or restore issues detected."],
  );
}

function diagnoseLocalTools(ctx: Readonly<DoctorContext>, facts: Readonly<DotnetFacts>): DiagnosticResult {
  const startedAt = ctx.clock.monotonicNow();
  const installedNames = new Set(facts.localTools.map((t) => t.name.toLowerCase()));

  if (!installedNames.has(REQUIRED_LOCAL_TOOL.toLowerCase())) {
    return issueDiagnostic(ctx, startedAt, {
      id: "dotnet.local-tools",
      name: "Local tool manifest",
      status: "warn",
      summary: "The required local tool is not installed.",
      evidence: [`Missing local tool: ${REQUIRED_LOCAL_TOOL}`],
      rootCause: `Local tool '${REQUIRED_LOCAL_TOOL}' declared in .config/dotnet-tools.json has not been restored.`,
      fixes: [{description: "Restore local .NET tools for this checkout.", command: "dotnet tool restore"}],
    });
  }

  return passDiagnostic(
    ctx,
    startedAt,
    "dotnet.local-tools",
    "Local tool manifest",
    "Installed local tools satisfy the tracked manifest.",
    [`${String(facts.localTools.length)} local tool${facts.localTools.length === 1 ? "" : "s"} installed.`],
  );
}

function diagnoseHttpsCertificate(ctx: Readonly<DoctorContext>, facts: Readonly<DotnetFacts>): DiagnosticResult {
  const startedAt = ctx.clock.monotonicNow();
  if (!facts.certificate.exists) {
    return issueDiagnostic(ctx, startedAt, {
      id: "dotnet.https-certificate",
      name: "HTTPS development certificate",
      status: "fail",
      summary: "No valid ASP.NET Core HTTPS development certificate was found.",
      evidence: ["No certificate exists."],
      rootCause: "The local HTTPS development certificate is missing or invalid.",
      fixes: [{description: "Generate and trust a local HTTPS development certificate.", command: "dotnet dev-certs https --trust"}],
    });
  }

  if (!facts.certificate.trusted) {
    return issueDiagnostic(ctx, startedAt, {
      id: "dotnet.https-certificate",
      name: "HTTPS development certificate",
      status: "warn",
      summary: "The HTTPS development certificate exists but is not trusted.",
      evidence: ["A certificate exists but is not trusted."],
      rootCause: "The local HTTPS development certificate is not trusted by this machine.",
      fixes: [{description: "Trust the local HTTPS development certificate.", command: "dotnet dev-certs https --trust"}],
    });
  }

  return passDiagnostic(
    ctx,
    startedAt,
    "dotnet.https-certificate",
    "HTTPS development certificate",
    "A valid and trusted HTTPS development certificate is present.",
    ["Certificate exists and is trusted."],
  );
}

function diagnoseAppHost(ctx: Readonly<DoctorContext>, facts: Readonly<DotnetFacts>): DiagnosticResult {
  const startedAt = ctx.clock.monotonicNow();
  if (!facts.appHost.projectExists) {
    return issueDiagnostic(ctx, startedAt, {
      id: "dotnet.apphost",
      name: "AppHost configuration",
      status: "fail",
      summary: "The AppHost project file could not be found.",
      evidence: ["tooling/AppHost/AppHost.csproj is missing."],
      rootCause: "tooling/AppHost/AppHost.csproj is missing or inaccessible.",
      fixes: [{description: "Restore the tooling/AppHost project, then rerun doctor."}],
    });
  }

  if (facts.appHost.missingParameterKeys.length > 0) {
    return issueDiagnostic(ctx, startedAt, {
      id: "dotnet.apphost",
      name: "AppHost configuration",
      status: "warn",
      summary: "One or more required Aspire parameters are not configured.",
      evidence: facts.appHost.missingParameterKeys.map((key) => `Missing parameter key: ${key}`),
      rootCause: "Required Aspire parameters remain unset for local AppHost configuration.",
      fixes: [{description: "Set the missing Aspire parameters through dotnet user-secrets, then rerun doctor."}],
    });
  }

  const evidence = ["AppHost project exists.", ...facts.appHost.userSecretKeys.map((key) => `Configured user-secret key: ${key}`)];
  return passDiagnostic(
    ctx,
    startedAt,
    "dotnet.apphost",
    "AppHost configuration",
    "The AppHost project and required Aspire parameters are configured.",
    evidence,
  );
}

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
  if (!isRecord(parsed)) {
    return false;
  }
  return Array.isArray(parsed["resources"]);
}

async function diagnoseNugetFeed(ctx: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  if (ctx.options.quick) {
    return skippedDiagnostic({
      id: "dotnet.nuget-feed",
      module: "dotnet",
      name: "NuGet feed reachability",
      summary: "NuGet feed reachability was skipped in quick mode.",
      evidence: ["--quick intentionally skips network reachability probes."],
    });
  }

  const startedAt = ctx.clock.monotonicNow();
  const probe = await ctx.network.get(NUGET_FEED_URL, DIAGNOSTIC_DEFAULT_TIMEOUT_MS);
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
    return issueDiagnostic(ctx, startedAt, {
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
    return issueDiagnostic(ctx, startedAt, {
      id: "dotnet.nuget-feed",
      name: "NuGet feed reachability",
      status: "warn",
      summary: "The NuGet feed returned a malformed service index.",
      evidence: [
        `HTTP status: ${String(probe.statusCode)}`,
        probe.body === undefined || probe.body.trim() === "" ? "No response body was captured." : "Response body is malformed.",
      ],
      rootCause: "The NuGet v3 service index response did not contain a JSON object with a resources array.",
      fixes: [{description: "Verify NuGet feed availability and configured sources, then rerun doctor."}],
    });
  }

  return passDiagnostic(ctx, startedAt, "dotnet.nuget-feed", "NuGet feed reachability", "The public NuGet feed is reachable.", [
    `HTTP status: ${String(probe.statusCode)}`,
  ]);
}

// ============================================================================
// Degraded outcome handling
// ============================================================================

function degradedResults(ctx: Readonly<DoctorContext>, issues: readonly string[]): readonly DiagnosticResult[] {
  const startedAt = ctx.clock.monotonicNow();
  const summary = "The shared .NET inspection facts could not be produced.";
  const evidence = boundedIssues(issues);
  const diagnosis = buildIssueDiagnosis(issues);

  const genericFail = (id: string, name: string): DiagnosticResult =>
    issueDiagnostic(ctx, startedAt, {
      id,
      name,
      status: "fail",
      summary,
      evidence,
      ...diagnosis,
      fixes: [{description: DOTNET_INSPECTION_RESOLUTION_FIX}],
    });

  const sdkResult =
    ctx.requirements.status === "invalid"
      ? skippedDiagnostic({
          id: "dotnet.sdk-inventory",
          module: "dotnet",
          name: "Installed SDK inventory",
          summary: "SDK comparison was skipped because requirement sources are invalid.",
          evidence: ["Blocked by invalid runtime requirement sources."],
        })
      : genericFail("dotnet.sdk-inventory", "Installed SDK inventory");

  return [
    genericFail("dotnet.executable", "dotnet executable"),
    sdkResult,
    genericFail("dotnet.host", ".NET host"),
    genericFail("dotnet.workloads", "Installed workloads"),
    genericFail("dotnet.nuget-state", "NuGet package cache"),
    genericFail("dotnet.solution", "Solution projects"),
    genericFail("dotnet.local-tools", "Local tool manifest"),
    genericFail("dotnet.https-certificate", "HTTPS development certificate"),
    genericFail("dotnet.apphost", "AppHost configuration"),
  ];
}

/** Read-only .NET diagnostic module, sourced exclusively from shared `DotnetFacts`. */
export const dotnetDoctorModule: DiagnosticModule = {
  id: "dotnet",
  title: ".NET",
  async run(context): Promise<readonly DiagnosticResult[]> {
    const outcome: InspectionOutcome<DotnetFacts> = await context.inspection.inspect("dotnet");

    let factResults: readonly DiagnosticResult[];

    if (outcome.kind === "unavailable") {
      factResults = degradedResults(context, [outcome.reason]);
    } else if (outcome.kind === "invalid") {
      factResults = degradedResults(context, outcome.issues);
    } else {
      const facts = outcome.value;
      factResults = [
        diagnoseExecutable(context, facts),
        diagnoseSdkInventory(context, facts),
        diagnoseHost(context, facts),
        diagnoseWorkloads(context, facts),
        diagnoseNugetState(context, facts),
        diagnoseSolution(context, facts),
        diagnoseLocalTools(context, facts),
        diagnoseHttpsCertificate(context, facts),
        diagnoseAppHost(context, facts),
      ];
    }

    const nugetFeed = await diagnoseNugetFeed(context);
    return [...factResults, nugetFeed];
  },
};
