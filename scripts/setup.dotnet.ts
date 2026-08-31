/**
 * @fileoverview Independent .NET SDK, restore, AppHost, and HTTPS setup phase.
 * @module scripts.setup.dotnet
 *
 * @remarks
 * Every read-only .NET observation (executable/SDK availability, selected/installed SDK
 * compatibility, workloads, NuGet cache, local tools, repository solution integrity, AppHost
 * project/parameter-key state, user-secret key names, and HTTPS development-certificate state) is
 * consumed exclusively through `context.inspection.inspect("dotnet")`. This phase never re-parses
 * `dotnet` command output itself. After every executed SDK install, restore, user-secret write, or
 * certificate mutation, it invalidates exactly `"dotnet"`, re-inspects it, and requires the
 * relevant postcondition from the refreshed facts; a successful mutation command or a `"planned"`/
 * `"executed"` action disposition alone is never treated as proof of readiness.
 */

import {randomBytes as nodeRandomBytes} from "node:crypto";
import {resolve} from "node:path";

import type {CommandResult, CommandSpec} from "./common/process.ts";
import {satisfiesMinimum, type MinimumVersion} from "./common/requirements.ts";
import type {DotnetFacts} from "./inspection/dotnet.ts";
import type {InspectionOutcome} from "./inspection/types.ts";
import type {
  InstallationProposal,
  SetupActionDisposition,
  SetupActionScope,
  SetupContext,
  SetupPhaseDefinition,
  SetupPhaseResult,
} from "./setup.types.ts";

type RandomByteSource = (size: number) => Uint8Array;

interface DotnetSetupDependencies {
  readonly platform: NodeJS.Platform;
  readonly randomBytes: RandomByteSource;
}

interface RestoreDefinition {
  readonly id: string;
  readonly scope: SetupActionScope;
  readonly summary: string;
  readonly command: CommandSpec;
}

/** One completed setup step: either a terminal phase result, or refreshed `dotnet` facts to continue with. */
type DotnetStepOutcome = Readonly<{result: SetupPhaseResult}> | Readonly<{facts: DotnetFacts}>;

const APPHOST_PROJECT_SEGMENTS = ["tooling", "AppHost", "AppHost.csproj"] as const;
const DOTNET_MANUAL_INSTALL = "Install the required SDK from https://dotnet.microsoft.com/download, then rerun setup.";
const DOTNET_INSTALL_ACTION = "dotnet.install-sdk";
const USER_SECRETS_ACTION = "dotnet.user-secrets.set";
const CERTIFICATE_CREATE_ACTION = "dotnet.certificate.create";
const CERTIFICATE_TRUST_ACTION = "dotnet.certificate.trust";
const LEADING_VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)/u;

function isSuccessfulCommand(result: Readonly<CommandResult>): boolean {
  return result.code === 0 && !result.timedOut && result.signal === undefined && result.spawnError === undefined;
}

function isInterrupted(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function duration(startedAt: number, context: SetupContext): number {
  return Math.max(0, context.now() - startedAt);
}

function phaseResult(context: SetupContext, startedAt: number, input: Omit<SetupPhaseResult, "durationMs">): SetupPhaseResult {
  return {
    ...input,
    durationMs: duration(startedAt, context),
  };
}

function commandFailureEvidence(result: Readonly<CommandResult>, options: Readonly<{includeStdout?: boolean}> = {}): readonly string[] {
  return [
    ...(result.spawnError === undefined ? [] : [`Unable to start command: ${result.spawnError}`]),
    ...(result.timedOut ? ["Command timed out."] : []),
    ...(result.signal === undefined ? [] : [`Command stopped with signal ${result.signal}.`]),
    ...(result.code === 0 ? [] : [`Command exited with code ${result.code}.`]),
    ...(options.includeStdout === false || result.stdout.trim() === "" ? [] : [`stdout: ${result.stdout.trim()}`]),
    ...(result.stderr.trim() === "" ? [] : [`stderr: ${result.stderr.trim()}`]),
  ];
}

function sanitize(value: string, secrets: readonly string[]): string {
  let sanitized = value;
  for (const secret of [...secrets].filter((candidate) => candidate.length > 0).toSorted((left, right) => right.length - left.length)) {
    sanitized = sanitized.replaceAll(secret, "[REDACTED]");
  }
  return sanitized;
}

function errorMessage(error: unknown, secrets: readonly string[]): string {
  return sanitize(error instanceof Error ? error.message : String(error), secrets);
}

function normalizedVersion(version: MinimumVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

/**
 * Reads the leading `major.minor.patch` components already guaranteed present in one fact-provided
 * `dotnet` version string and compares them against a required minimum.
 *
 * @param version - An already-validated fact version string (never raw, unparsed command output).
 * @param required - The minimum version to satisfy.
 * @returns Whether `version` satisfies `required`.
 */
function versionSatisfiesRequirement(version: string, required: MinimumVersion): boolean {
  const match = LEADING_VERSION_PATTERN.exec(version);
  if (match === null) {
    return false;
  }
  return satisfiesMinimum({major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3])}, required);
}

function isDotnetCompatible(facts: Readonly<DotnetFacts>, required: MinimumVersion): boolean {
  return (
    facts.executable.available
    && facts.selectedVersion !== undefined
    && versionSatisfiesRequirement(facts.selectedVersion, required)
    && facts.sdks.some((sdk) => versionSatisfiesRequirement(sdk, required))
  );
}

function dotnetCompatibilityEvidence(facts: Readonly<DotnetFacts>, required: MinimumVersion): readonly string[] {
  const normalized = normalizedVersion(required);
  const evidence: string[] = [];
  if (!facts.sdks.some((sdk) => versionSatisfiesRequirement(sdk, required))) {
    evidence.push(
      facts.sdks.length === 0
        ? "The installed SDK listing contained no valid SDK versions."
        : `No installed SDK satisfies >=${normalized}.`,
    );
  }
  if (facts.selectedVersion === undefined || !versionSatisfiesRequirement(facts.selectedVersion, required)) {
    evidence.push(
      facts.selectedVersion === undefined
        ? "dotnet reported no selected SDK version."
        : `The selected SDK ${facts.selectedVersion} does not satisfy >=${normalized}.`,
    );
  }
  if (evidence.length === 0) {
    evidence.push(`A listed SDK and selected SDK satisfy >=${normalized}.`);
  }
  return evidence;
}

/**
 * Converts an unavailable/invalid `dotnet` inspection outcome into bounded, non-secret evidence.
 *
 * @param outcome - A non-`"available"` {@link InspectionOutcome} for `dotnet`.
 * @returns At least one evidence line; never raw command output.
 */
function unavailableOrInvalidEvidence(outcome: Readonly<InspectionOutcome<DotnetFacts>>): readonly string[] {
  if (outcome.kind === "unavailable") {
    return [outcome.reason];
  }
  if (outcome.kind === "invalid") {
    return [...outcome.issues];
  }
  return [];
}

async function refreshDotnetFacts(context: SetupContext): Promise<InspectionOutcome<DotnetFacts>> {
  context.inspection.invalidate("dotnet");
  return context.inspection.inspect("dotnet");
}

/**
 * Selects a reviewed package-manager proposal without inspecting the host.
 *
 * @param input - Platform, qualified manager markers, and SDK requirement.
 * @returns A supported installation proposal, or `null`.
 */
export function selectDotnetInstallationProposal(
  input: Readonly<{
    platform: NodeJS.Platform;
    availablePackageManagers: ReadonlySet<string>;
    required: MinimumVersion;
  }>,
): InstallationProposal | null {
  if (input.required.major !== 10) {
    return null;
  }

  if (input.platform === "win32" && input.availablePackageManagers.has("winget")) {
    return {
      command: {
        command: "winget",
        args: ["install", "--id", "Microsoft.DotNet.SDK.10", "--exact", "--accept-package-agreements", "--accept-source-agreements"],
      },
      explanation: "Install the required .NET 10 SDK with Windows Package Manager.",
    };
  }

  if (input.platform === "darwin" && input.availablePackageManagers.has("brew")) {
    return {
      command: {command: "brew", args: ["install", "--cask", "dotnet-sdk"]},
      explanation: "Install the required .NET SDK with Homebrew.",
    };
  }

  if (input.platform === "linux" && input.availablePackageManagers.has("apt-get")) {
    return {
      command: {command: "sudo", args: ["apt-get", "install", "-y", "dotnet-sdk-10.0"]},
      explanation: "Install the available .NET 10 SDK package with apt.",
    };
  }

  if (input.platform === "linux" && input.availablePackageManagers.has("dnf")) {
    return {
      command: {command: "sudo", args: ["dnf", "install", "-y", "dotnet-sdk-10.0"]},
      explanation: "Install the .NET 10 SDK package with dnf.",
    };
  }

  return null;
}

/**
 * Generates one independent local-development password.
 *
 * @param randomBytes - Cryptographically secure byte source.
 * @returns A complexity-prefixed, unpadded base64url password.
 * @throws When the source does not return exactly 24 bytes.
 */
export function generateLocalDevelopmentPassword(randomBytes: RandomByteSource = nodeRandomBytes): string {
  const bytes = randomBytes(24);
  if (bytes.byteLength !== 24) {
    throw new Error("The local-development password source must return exactly 24 bytes.");
  }
  return `Aa1!${Buffer.from(bytes).toString("base64url")}`;
}

async function discoverPackageManagers(context: SetupContext, platform: NodeJS.Platform): Promise<ReadonlySet<string>> {
  const managers = new Set<string>();
  if (platform === "win32") {
    const winget = await context.runner.run({command: "winget", args: ["--version"]}, {cwd: context.paths.root});
    if (isSuccessfulCommand(winget)) {
      managers.add("winget");
    }
    return managers;
  }

  if (platform === "darwin") {
    const brew = await context.runner.run({command: "brew", args: ["--version"]}, {cwd: context.paths.root});
    if (isSuccessfulCommand(brew)) {
      managers.add("brew");
    }
    return managers;
  }

  if (platform !== "linux") {
    return managers;
  }

  const [apt, dnf] = await Promise.all([
    context.runner.run({command: "apt-get", args: ["--version"]}, {cwd: context.paths.root}),
    context.runner.run({command: "dnf", args: ["--version"]}, {cwd: context.paths.root}),
  ]);
  if (isSuccessfulCommand(apt)) {
    const policy = await context.runner.run({command: "apt-cache", args: ["policy", "dotnet-sdk-10.0"]}, {cwd: context.paths.root});
    if (isSuccessfulCommand(policy) && /^\s*Candidate:\s*(?!\(none\)\s*$)\S+/imu.test(policy.stdout)) {
      managers.add("apt-get");
    }
  }
  if (isSuccessfulCommand(dnf)) {
    managers.add("dnf");
  }
  return managers;
}

function restores(context: SetupContext): readonly RestoreDefinition[] {
  return [
    {
      id: "dotnet.workload-restore",
      scope: "system",
      summary: "Restore solution workloads required by the pinned SDK.",
      command: {command: "dotnet", args: ["workload", "restore", context.paths.solution]},
    },
    {
      id: "dotnet.solution-restore",
      scope: "repository",
      summary: "Restore solution NuGet dependencies.",
      command: {command: "dotnet", args: ["restore", context.paths.solution]},
    },
    {
      id: "dotnet.tool-restore",
      scope: "user",
      summary: "Restore manifest-pinned local .NET tools.",
      command: {command: "dotnet", args: ["tool", "restore"]},
    },
  ];
}

/**
 * Plans or executes the exact repository restore commands, then verifies the repository solution
 * remains structurally valid from refreshed `dotnet` facts whenever a restore actually executed.
 *
 * @param context - Shared setup dependencies, including the repository inspection session.
 * @param facts - The `dotnet` facts observed before this step.
 * @param plannedActions - Mutable accumulator of dry-run-planned action identifiers.
 * @param evidence - Mutable accumulator of human-readable phase evidence.
 * @returns Either a terminal failed/declined phase result, or the facts to continue with.
 */
async function runRestoreActions(
  context: SetupContext,
  facts: Readonly<DotnetFacts>,
  plannedActions: string[],
  evidence: string[],
): Promise<DotnetStepOutcome> {
  let executedAny = false;
  for (const restore of restores(context)) {
    const disposition = await context.actions.run({
      id: restore.id,
      scope: restore.scope,
      summary: restore.summary,
      execute: async () => {
        const restoreResult = await context.runner.run(restore.command, {
          cwd: context.paths.root,
          output: "tee",
          logger: context.logger,
        });
        if (!isSuccessfulCommand(restoreResult)) {
          throw new Error([`Restore action '${restore.id}' failed.`, ...commandFailureEvidence(restoreResult)].join("\n"));
        }
      },
    });
    if (disposition === "planned") {
      plannedActions.push(restore.id);
      evidence.push(`Planned action: ${restore.id}`);
    } else if (disposition === "declined") {
      return {
        result: {
          id: "dotnet",
          status: "failed",
          summary: "A required .NET restore action was declined.",
          evidence: [...evidence, `Declined action: ${restore.id}`],
          nextActions: [`Allow required action '${restore.id}', then rerun setup.`],
          durationMs: 0,
        },
      };
    } else {
      executedAny = true;
      evidence.push(`Executed action: ${restore.id}`);
    }
  }

  if (!executedAny) {
    return {facts};
  }

  const refreshed = await refreshDotnetFacts(context);
  if (refreshed.kind !== "available") {
    return {
      result: {
        id: "dotnet",
        status: "failed",
        summary: "The .NET restore result could not be verified.",
        evidence: [...evidence, ...unavailableOrInvalidEvidence(refreshed)],
        nextActions: ["Resolve the reported .NET restore verification failure, then rerun setup."],
        durationMs: 0,
      },
    };
  }
  if (refreshed.value.solutionIssues.length > 0) {
    return {
      result: {
        id: "dotnet",
        status: "failed",
        summary: "The repository solution reports integrity issues after restore.",
        evidence: [...evidence, ...refreshed.value.solutionIssues],
        nextActions: ["Resolve the reported repository solution integrity issues, then rerun setup."],
        durationMs: 0,
      },
    };
  }
  evidence.push("The repository solution remains structurally valid after restore.");
  return {facts: refreshed.value};
}

/**
 * Plans, executes, or reports on generating the missing AppHost user-secret parameter keys named
 * by the observed `dotnet` facts, then verifies none remain missing from refreshed facts.
 *
 * @param context - Shared setup dependencies, including the repository inspection session.
 * @param facts - The `dotnet` facts observed before this step.
 * @param dependencies - Independent random-byte source used to generate new passwords.
 * @param plannedActions - Mutable accumulator of dry-run-planned action identifiers.
 * @param evidence - Mutable accumulator of human-readable phase evidence.
 * @param knownSecrets - Mutable accumulator of generated secret values to redact and sanitize.
 * @returns Either a terminal declined phase result, or the facts to continue with.
 * @throws When the post-write postcondition is not satisfied by refreshed facts.
 */
async function ensureUserSecrets(
  context: SetupContext,
  facts: Readonly<DotnetFacts>,
  dependencies: DotnetSetupDependencies,
  plannedActions: string[],
  evidence: string[],
  knownSecrets: string[],
): Promise<DotnetStepOutcome> {
  const missing = facts.appHost.missingParameterKeys;
  if (missing.length === 0) {
    evidence.push("Required AppHost user-secret keys are present.");
    return {facts};
  }

  const appHostProject = resolve(context.paths.root, ...APPHOST_PROJECT_SEGMENTS);
  const disposition = await context.actions.run({
    id: USER_SECRETS_ACTION,
    scope: "user",
    summary: "Set missing AppHost local-development parameters through JSON stdin.",
    execute: async () => {
      const payload: Record<string, string> = {};
      for (const key of missing) {
        const value = generateLocalDevelopmentPassword(dependencies.randomBytes);
        knownSecrets.push(value);
        context.logger.redact(value);
        payload[key] = value;
      }
      const setResult = await context.runner.run(
        {command: "dotnet", args: ["user-secrets", "set", "--project", appHostProject]},
        {cwd: context.paths.root, input: JSON.stringify(payload)},
      );
      if (!isSuccessfulCommand(setResult)) {
        const safeEvidence = commandFailureEvidence(setResult, {includeStdout: false}).map((item) => sanitize(item, knownSecrets));
        throw new Error(["Unable to set missing AppHost user-secret keys.", ...safeEvidence].join("\n"));
      }
    },
  });

  if (disposition === "planned") {
    plannedActions.push(USER_SECRETS_ACTION);
    evidence.push(`Planned action: ${USER_SECRETS_ACTION}`);
    return {facts};
  }
  if (disposition === "declined") {
    return {
      result: {
        id: "dotnet",
        status: "failed",
        summary: "Required AppHost user-secret preparation was declined.",
        evidence: [...evidence, `Declined action: ${USER_SECRETS_ACTION}`],
        nextActions: [`Allow required action '${USER_SECRETS_ACTION}', then rerun setup.`],
        durationMs: 0,
      },
    };
  }

  const refreshed = await refreshDotnetFacts(context);
  if (refreshed.kind !== "available") {
    throw new Error(
      ["Unable to verify AppHost user-secret keys after the set action.", ...unavailableOrInvalidEvidence(refreshed)].join("\n"),
    );
  }
  if (refreshed.value.appHost.missingParameterKeys.length > 0) {
    throw new Error("AppHost user-secret postcondition failed; one or more required keys remain missing.");
  }
  evidence.push(`Executed and verified action: ${USER_SECRETS_ACTION}`);
  return {facts: refreshed.value};
}

/**
 * Plans, executes, or reports on creating and trusting the local HTTPS development certificate
 * from the observed `dotnet` facts, verifying each executed mutation against refreshed facts.
 *
 * @param context - Shared setup dependencies, including the repository inspection session.
 * @param facts - The `dotnet` facts observed before this step.
 * @param plannedActions - Mutable accumulator of dry-run-planned action identifiers.
 * @param evidence - Mutable accumulator of human-readable phase evidence.
 * @param knownSecrets - Known generated secret values to sanitize from child-process errors.
 * @returns A terminal phase result, or `null` to continue with overall phase success.
 */
async function ensureCertificate(
  context: SetupContext,
  facts: Readonly<DotnetFacts>,
  plannedActions: string[],
  evidence: string[],
  knownSecrets: string[],
): Promise<SetupPhaseResult | null> {
  let certificate = facts.certificate;

  if (!certificate.exists) {
    const createDisposition = await context.actions.run({
      id: CERTIFICATE_CREATE_ACTION,
      scope: "user",
      summary: "Create a local HTTPS development certificate.",
      execute: async () => {
        const createResult = await context.runner.run({command: "dotnet", args: ["dev-certs", "https"]}, {cwd: context.paths.root});
        if (!isSuccessfulCommand(createResult)) {
          throw new Error(["HTTPS development certificate creation failed.", ...commandFailureEvidence(createResult)].join("\n"));
        }
      },
    });
    if (createDisposition === "planned") {
      plannedActions.push(CERTIFICATE_CREATE_ACTION);
      evidence.push(`Planned action: ${CERTIFICATE_CREATE_ACTION}`);
      return null;
    }
    if (createDisposition === "declined") {
      return {
        id: "dotnet",
        status: "failed",
        summary: "Required HTTPS development certificate creation was declined.",
        evidence: [...evidence, `Declined action: ${CERTIFICATE_CREATE_ACTION}`],
        nextActions: [`Allow required action '${CERTIFICATE_CREATE_ACTION}', then rerun setup.`],
        durationMs: 0,
      };
    }

    const refreshed = await refreshDotnetFacts(context);
    if (refreshed.kind !== "available" || !refreshed.value.certificate.exists) {
      return {
        id: "dotnet",
        status: "failed",
        summary: "No valid HTTPS development certificate exists after creation.",
        evidence: [...evidence, ...(refreshed.kind === "available" ? [] : unavailableOrInvalidEvidence(refreshed))],
        nextActions: [`Resolve and rerun required action '${CERTIFICATE_CREATE_ACTION}'.`],
        durationMs: 0,
      };
    }
    certificate = refreshed.value.certificate;
    evidence.push(`Executed and verified action: ${CERTIFICATE_CREATE_ACTION}`);
  } else {
    evidence.push("A valid HTTPS development certificate exists.");
  }

  if (certificate.trusted) {
    evidence.push("The HTTPS development certificate is trusted.");
    return null;
  }

  let disposition: SetupActionDisposition;
  try {
    disposition = await context.actions.run({
      id: CERTIFICATE_TRUST_ACTION,
      scope: "system",
      summary: "Trust the local HTTPS development certificate.",
      execute: async () => {
        const trustMutation = await context.runner.run(
          {command: "dotnet", args: ["dev-certs", "https", "--trust"]},
          {cwd: context.paths.root, output: "inherit"},
        );
        if (!isSuccessfulCommand(trustMutation)) {
          throw new Error(["HTTPS development certificate trust failed.", ...commandFailureEvidence(trustMutation)].join("\n"));
        }
      },
    });
  } catch (error: unknown) {
    if (isInterrupted(error)) {
      throw error;
    }
    return {
      id: "dotnet",
      status: plannedActions.length > 0 ? "skipped" : "degraded",
      summary: "Required .NET preparation completed, but certificate trust failed.",
      evidence: [...evidence, `Failed action: ${CERTIFICATE_TRUST_ACTION}`, errorMessage(error, knownSecrets)],
      nextActions: [`Resolve and rerun optional action '${CERTIFICATE_TRUST_ACTION}'.`],
      durationMs: 0,
    };
  }

  if (disposition === "planned") {
    plannedActions.push(CERTIFICATE_TRUST_ACTION);
    evidence.push(`Planned action: ${CERTIFICATE_TRUST_ACTION}`);
    return null;
  }
  if (disposition === "declined") {
    return {
      id: "dotnet",
      status: plannedActions.length > 0 ? "skipped" : "degraded",
      summary: "Required .NET preparation completed, but optional certificate trust was declined.",
      evidence: [...evidence, `Declined action: ${CERTIFICATE_TRUST_ACTION}`],
      nextActions: [`Allow optional action '${CERTIFICATE_TRUST_ACTION}' to trust local HTTPS.`],
      durationMs: 0,
    };
  }

  const refreshed = await refreshDotnetFacts(context);
  if (refreshed.kind !== "available" || !refreshed.value.certificate.trusted) {
    return {
      id: "dotnet",
      status: plannedActions.length > 0 ? "skipped" : "degraded",
      summary: "Required .NET preparation completed, but certificate trust was not established.",
      evidence: [...evidence, `Failed postcondition for action: ${CERTIFICATE_TRUST_ACTION}`],
      nextActions: [`Resolve and rerun optional action '${CERTIFICATE_TRUST_ACTION}'.`],
      durationMs: 0,
    };
  }
  evidence.push(`Executed and verified action: ${CERTIFICATE_TRUST_ACTION}`);
  return null;
}

/**
 * Ensures a compatible .NET SDK is selected and installed, consuming shared `dotnet` facts for
 * every readiness observation and installing only through the reviewed proposal contract.
 *
 * @param context - Shared setup dependencies, including the repository inspection session.
 * @param dependencies - Independent platform boundary used to select an installation proposal.
 * @param facts - The `dotnet` facts observed before this step.
 * @param plannedActions - Mutable accumulator of dry-run-planned action identifiers.
 * @param evidence - Mutable accumulator of human-readable phase evidence.
 * @returns Either a terminal phase result (including a dry-run "planned installation" summary
 * that also plans dependent restores), or the facts to continue with.
 */
async function ensureDotnetSdk(
  context: SetupContext,
  dependencies: DotnetSetupDependencies,
  facts: Readonly<DotnetFacts>,
  plannedActions: string[],
  evidence: string[],
): Promise<DotnetStepOutcome> {
  if (isDotnetCompatible(facts, context.requirements.dotnet)) {
    return {facts};
  }

  const packageManagers = await discoverPackageManagers(context, dependencies.platform);
  const proposal = selectDotnetInstallationProposal({
    platform: dependencies.platform,
    availablePackageManagers: packageManagers,
    required: context.requirements.dotnet,
  });
  if (proposal === null) {
    return {
      result: {
        id: "dotnet",
        status: "failed",
        summary: "A compatible .NET SDK is unavailable and no supported installer was discovered.",
        evidence,
        nextActions: [DOTNET_MANUAL_INSTALL],
        durationMs: 0,
      },
    };
  }

  const installDisposition = await context.actions.run({
    id: DOTNET_INSTALL_ACTION,
    scope: "system",
    summary: proposal.explanation,
    execute: async () => {
      const installResult = await context.runner.run(proposal.command, {cwd: context.paths.root, output: "inherit"});
      if (!isSuccessfulCommand(installResult)) {
        throw new Error(["The supported .NET SDK installation command failed.", ...commandFailureEvidence(installResult)].join("\n"));
      }
    },
  });

  if (installDisposition === "declined") {
    return {
      result: {
        id: "dotnet",
        status: "failed",
        summary: "Required .NET SDK installation was declined.",
        evidence: [...evidence, `Declined action: ${DOTNET_INSTALL_ACTION}`],
        nextActions: [DOTNET_MANUAL_INSTALL],
        durationMs: 0,
      },
    };
  }

  if (installDisposition === "planned") {
    plannedActions.push(DOTNET_INSTALL_ACTION);
    evidence.push(`Planned action: ${DOTNET_INSTALL_ACTION}`);
    const restoreOutcome = await runRestoreActions(context, facts, plannedActions, evidence);
    if ("result" in restoreOutcome) {
      return restoreOutcome;
    }
    return {
      result: {
        id: "dotnet",
        status: "skipped",
        summary: "Required .NET SDK installation and dependent restores are planned by dry-run.",
        evidence,
        nextActions: [],
        durationMs: 0,
      },
    };
  }

  // The install command exiting successfully is never sufficient proof of readiness: the SDK
  // requirement is only satisfied once refreshed, invalidated facts confirm compatibility.
  const refreshed = await refreshDotnetFacts(context);
  if (refreshed.kind !== "available") {
    return {
      result: {
        id: "dotnet",
        status: "failed",
        summary: "The .NET SDK could not be verified after installation.",
        evidence: [...evidence, ...unavailableOrInvalidEvidence(refreshed)],
        nextActions: [DOTNET_MANUAL_INSTALL],
        durationMs: 0,
      },
    };
  }
  evidence.push(...dotnetCompatibilityEvidence(refreshed.value, context.requirements.dotnet));
  if (!isDotnetCompatible(refreshed.value, context.requirements.dotnet)) {
    return {
      result: {
        id: "dotnet",
        status: "failed",
        summary: "The .NET SDK remains incompatible after installation.",
        evidence,
        nextActions: [DOTNET_MANUAL_INSTALL],
        durationMs: 0,
      },
    };
  }
  evidence.push(`Executed and verified action: ${DOTNET_INSTALL_ACTION}`);
  return {facts: refreshed.value};
}

async function runDotnetSetup(context: SetupContext, dependencies: DotnetSetupDependencies): Promise<SetupPhaseResult> {
  const startedAt = context.now();
  const evidence: string[] = [];
  const plannedActions: string[] = [];
  const knownSecrets: string[] = [];

  try {
    const initialOutcome = await context.inspection.inspect("dotnet");
    if (initialOutcome.kind !== "available") {
      return phaseResult(context, startedAt, {
        id: "dotnet",
        status: "failed",
        summary: "The .NET environment could not be inspected.",
        evidence: [...evidence, ...unavailableOrInvalidEvidence(initialOutcome)],
        nextActions: [DOTNET_MANUAL_INSTALL],
      });
    }
    evidence.push(...dotnetCompatibilityEvidence(initialOutcome.value, context.requirements.dotnet));

    const sdkOutcome = await ensureDotnetSdk(context, dependencies, initialOutcome.value, plannedActions, evidence);
    if ("result" in sdkOutcome) {
      return phaseResult(context, startedAt, sdkOutcome.result);
    }
    let facts = sdkOutcome.facts;

    if (facts.solutionIssues.length > 0) {
      return phaseResult(context, startedAt, {
        id: "dotnet",
        status: "failed",
        summary: "The repository solution reports integrity issues.",
        evidence: [...evidence, ...facts.solutionIssues],
        nextActions: ["Resolve the reported repository solution integrity issues, then rerun setup."],
      });
    }

    const restoreOutcome = await runRestoreActions(context, facts, plannedActions, evidence);
    if ("result" in restoreOutcome) {
      return phaseResult(context, startedAt, restoreOutcome.result);
    }
    facts = restoreOutcome.facts;

    if (!facts.appHost.projectExists) {
      return phaseResult(context, startedAt, {
        id: "dotnet",
        status: "failed",
        summary: "The required AppHost project does not exist.",
        evidence: [...evidence, `${APPHOST_PROJECT_SEGMENTS.join("/")} is missing.`],
        nextActions: ["Restore the tracked AppHost project, then rerun setup."],
      });
    }
    evidence.push("The AppHost project exists.");

    const secretsOutcome = await ensureUserSecrets(context, facts, dependencies, plannedActions, evidence, knownSecrets);
    if ("result" in secretsOutcome) {
      return phaseResult(context, startedAt, secretsOutcome.result);
    }
    facts = secretsOutcome.facts;

    const certificateOutcome = await ensureCertificate(context, facts, plannedActions, evidence, knownSecrets);
    if (certificateOutcome !== null) {
      return phaseResult(context, startedAt, certificateOutcome);
    }

    if (plannedActions.length > 0) {
      return phaseResult(context, startedAt, {
        id: "dotnet",
        status: "skipped",
        summary: "Required .NET preparation actions are planned by dry-run.",
        evidence,
        nextActions: [],
      });
    }

    return phaseResult(context, startedAt, {
      id: "dotnet",
      status: "succeeded",
      summary: "The .NET SDK, restores, AppHost parameters, and HTTPS certificate are ready.",
      evidence,
      nextActions: [],
    });
  } catch (error: unknown) {
    if (isInterrupted(error)) {
      throw error;
    }
    const safeError = errorMessage(error, knownSecrets);
    return phaseResult(context, startedAt, {
      id: "dotnet",
      status: "failed",
      summary: "The required .NET preparation phase failed.",
      evidence: [...evidence, safeError],
      nextActions: [
        safeError.toLowerCase().includes("certificate")
          ? "Resolve the reported HTTPS development certificate failure, then rerun setup."
          : "Resolve the reported .NET preparation failure, then rerun setup.",
      ],
    });
  }
}

/**
 * Creates the .NET setup phase with an explicit platform and random-byte source boundary.
 *
 * @param dependencies - Optional production-boundary replacements for tests.
 * @returns The independent .NET setup phase definition.
 */
export function createDotnetSetupPhase(dependencies: Partial<DotnetSetupDependencies> = {}): SetupPhaseDefinition {
  const resolvedDependencies: DotnetSetupDependencies = {
    platform: dependencies.platform ?? process.platform,
    randomBytes: dependencies.randomBytes ?? nodeRandomBytes,
  };
  return {
    id: "dotnet",
    title: ".NET toolchain",
    required: true,
    dependsOn: [],
    run: (context) => runDotnetSetup(context, resolvedDependencies),
  };
}

/** Independent required phase that prepares the repository .NET toolchain. */
export const dotnetSetupPhase: SetupPhaseDefinition = createDotnetSetupPhase();
