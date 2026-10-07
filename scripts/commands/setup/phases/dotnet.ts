/**
 * @fileoverview Independent .NET SDK, restore, AppHost, and HTTPS setup phase.
 * @module scripts/commands/setup/phases/dotnet
 *
 * @remarks
 * Every read-only .NET observation (executable/SDK availability, selected/installed SDK
 * compatibility, workloads, NuGet cache, local tools, repository solution integrity, generated
 * NuGet restore assets, AppHost project/parameter-key state, user-secret key names, and HTTPS
 * development-certificate state) is consumed exclusively through
 * `context.inspection.inspect("dotnet")`. This phase never re-parses `dotnet` command output
 * itself.
 *
 * Every attempted mutation runs through {@link runDotnetMutation}, which invalidates exactly
 * `"dotnet"` in a finalizer around the child command so a failed or interrupted attempt can never
 * leave the shared session cache stale, and then re-inspects `"dotnet"` immediately after an
 * `"executed"` disposition, before any later action may execute or be declined. Planned and
 * declined actions never invalidate anything. A successful mutation command or an `"executed"`
 * disposition alone is never treated as proof of readiness: each mutation asserts its own
 * action-specific postcondition against the refreshed facts.
 *
 * The phase runs its commands through `Process` with the setup command defaults and reads the host
 * platform from `Environment`. The only injected dependency it still owns is the cryptographic byte
 * source behind the generated local-development passwords, which is security-sensitive business
 * input rather than an ambient runtime capability. Generated passwords stay `Redacted` until the
 * `dotnet user-secrets set` invocation that needs their raw values.
 */

import {randomBytes as nodeRandomBytes} from "node:crypto";
import {resolve} from "node:path";

import {Clock, Effect, Redacted} from "effect";

import {satisfiesMinimum, type MinimumVersion} from "../../../common/requirements.ts";
import type {DotnetFacts} from "../../../inspection/dotnet.ts";
import type {InspectionOutcome} from "../../../inspection/types.ts";
import {Environment} from "../../../platform/Environment.ts";
import {formatProcessRequest, type ProcessError, type ProcessRequest} from "../../../platform/Process.ts";
import {SetupActionFailed} from "../errors.ts";
import {phaseResult, processFailureOutput, runPhaseCommand, submitSetupAction, type PhaseCommandOptions} from "../phase-support.ts";
import type {
  InstallationProposal,
  SetupActionScope,
  SetupContext,
  SetupPhaseDefinition,
  SetupPhaseResult,
  SetupRequirements,
} from "../types.ts";

type RandomByteSource = (size: number) => Uint8Array;

interface DotnetSetupDependencies {
  readonly randomBytes: RandomByteSource;
}

interface RestoreDefinition {
  readonly id: string;
  readonly scope: SetupActionScope;
  readonly summary: string;
  readonly command: ProcessRequest;
  /** Action-specific postcondition evaluated against the facts observed before and after the restore. */
  readonly verify: (input: Readonly<{before: DotnetFacts | undefined; after: DotnetFacts}>) => RestoreVerification;
}

/** Outcome of one action-specific restore postcondition. */
interface RestoreVerification {
  /** Bounded, non-secret reasons the postcondition was not satisfied. */
  readonly failures: readonly string[];
  /** Bounded, non-secret evidence describing what the refreshed facts actually proved. */
  readonly evidence: readonly string[];
}

/** One completed setup step: either a terminal phase result, or refreshed `dotnet` facts to continue with. */
type DotnetStepOutcome = Readonly<{result: SetupPhaseResult}> | Readonly<{facts: DotnetFacts}>;

/**
 * The restore step never fabricates facts: it reports the newest facts it actually verified, or
 * `undefined` when no restore executed and the caller had no facts to begin with.
 */
type DotnetRestoreOutcome = Readonly<{result: SetupPhaseResult}> | Readonly<{facts: DotnetFacts | undefined}>;

/** The `dotnet` state observed before any installation decision, without success-shaped placeholders. */
type InitialDotnetState = Readonly<{kind: "available"; facts: DotnetFacts}> | Readonly<{kind: "unavailable"; reason: string}>;

/** Result of evaluating one policy-controlled `dotnet` mutation and its immediate cache refresh. */
type DotnetMutationOutcome =
  | Readonly<{disposition: "planned"}>
  | Readonly<{disposition: "declined"}>
  | Readonly<{disposition: "executed"; outcome: InspectionOutcome<DotnetFacts>}>;

/** A step of the phase: fails with {@link SetupActionFailed} for a failed required mutation. */
type DotnetStep<A> = Effect.Effect<A, SetupActionFailed, SetupRequirements>;

const APPHOST_PROJECT_SEGMENTS = ["tooling", "src", "AppHost", "AppHost.csproj"] as const;
const REQUIRED_APPHOST_SECRET_KEYS = ["Parameters:sql-password", "Parameters:redis-password"] as const;
const REQUIRED_LOCAL_TOOL_NAME = "defaultdocumentation.console";
const DOTNET_MANUAL_INSTALL = "Install the required SDK from https://dotnet.microsoft.com/download, then rerun setup.";
const DOTNET_INSTALL_ACTION = "dotnet.install-sdk";
const USER_SECRETS_ACTION = "dotnet.user-secrets.set";
const CERTIFICATE_CREATE_ACTION = "dotnet.certificate.create";
const CERTIFICATE_TRUST_ACTION = "dotnet.certificate.trust";
const LEADING_VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)/u;
/**
 * Bounded ceiling for every long-running .NET installation, restore, and trust mutation.
 *
 * @remarks
 * Setup commands default to a probe-sized timeout, which is correct for a `--version` probe but
 * would truncate an SDK install or a full solution restore. Each such mutation therefore requests
 * this ceiling explicitly.
 */
const LONG_RUNNING_MUTATION_TIMEOUT_MS = 1_200_000;

/**
 * Describes one failed process the way the legacy `expectSuccess` failure did.
 *
 * @param error - The process failure.
 * @returns The failure summary.
 */
function describeProcessFailure(error: ProcessError): string {
  switch (error._tag) {
    case "ProcessExited":
      return `Process exited with code ${String(error.exitCode)}`;
    case "ProcessSignalled":
      return `Process terminated by ${error.signal}`;
    case "ProcessSpawnFailed":
      return "Process failed to start";
    case "ProcessTimedOut":
      return "Process timed out";
  }
}

/**
 * Renders a failed mutation command: `<failure>: <command>` followed by its bounded child output.
 *
 * @param request - The failed command.
 * @param error - The process failure.
 * @returns The failure message.
 */
function processFailureMessage(request: ProcessRequest, error: ProcessError): string {
  const head = `${describeProcessFailure(error)}: ${formatProcessRequest(request)}`;
  const output = processFailureOutput(error);
  return output === "" ? head : `${head}\n${output}`;
}

/**
 * Runs one mutation command and fails the submitting action when it does not succeed.
 *
 * @param context - The setup context.
 * @param actionId - The submitting action.
 * @param summary - Non-secret summary naming the mutation that failed.
 * @param request - The command.
 * @param options - Per-command overrides.
 * @returns The command effect; an interruption propagates.
 */
function runMutationCommand(
  context: SetupContext,
  actionId: string,
  summary: string,
  request: ProcessRequest,
  options: PhaseCommandOptions,
): DotnetStep<void> {
  return Effect.flatMap(runPhaseCommand(context, request, options), (outcome) =>
    outcome.kind === "succeeded"
      ? Effect.void
      : Effect.fail(new SetupActionFailed({actionId, message: [summary, processFailureMessage(request, outcome.error)].join("\n")})),
  );
}

/**
 * Renders one failed secret-carrying mutation without ever exposing child standard output.
 *
 * @remarks
 * The user-secret write is the only command in this phase that receives generated passwords. Its
 * stderr is still used for diagnostics, but its stdout is discarded before any evidence is
 * rendered, so a child that echoes part of its stdin payload can never surface it through phase
 * evidence.
 *
 * @param error - The secret write's process failure.
 * @returns Bounded evidence lines; the caller still sanitizes them.
 */
function secretCommandFailureEvidence(error: ProcessError): readonly string[] {
  const evidence = processFailureOutput(error, {stdout: false});
  return [
    ...(error._tag === "ProcessExited" ? [`Command exited with code ${String(error.exitCode)}.`] : []),
    ...(error._tag === "ProcessTimedOut" ? ["Command timed out."] : []),
    ...(error._tag === "ProcessSignalled" ? [`Command stopped with signal ${error.signal}.`] : []),
    ...(error._tag === "ProcessSpawnFailed" ? [`Unable to start command: ${error.message}`] : []),
    ...(evidence === "" ? [] : [`stderr: ${evidence.trim()}`]),
  ];
}

/**
 * Replaces every generated secret in a diagnostic text with `[REDACTED]`.
 *
 * @param value - The diagnostic text.
 * @param secrets - The generated secrets.
 * @returns The sanitized text.
 */
function sanitize(value: string, secrets: readonly Redacted.Redacted<string>[]): string {
  let sanitized = value;
  const rawSecrets = secrets.map((secret) => Redacted.value(secret)).filter((candidate) => candidate.length > 0);
  for (const secret of rawSecrets.toSorted((left, right) => right.length - left.length)) {
    sanitized = sanitized.replaceAll(secret, "[REDACTED]");
  }
  return sanitized;
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

/**
 * Decides whether already-available facts satisfy the required SDK.
 *
 * Executable availability is not re-checked here: an `"available"` `dotnet` outcome always
 * describes a machine whose `dotnet` executable ran, and a machine without one is modelled by the
 * `"unavailable"` {@link InitialDotnetState} branch instead of a success-shaped fact.
 *
 * @param facts - The newest verified `dotnet` facts.
 * @param required - The minimum SDK version to satisfy.
 * @returns Whether a listed SDK and the selected SDK both satisfy `required`.
 */
function isDotnetCompatible(facts: Readonly<DotnetFacts>, required: MinimumVersion): boolean {
  return (
    facts.selectedVersion !== undefined
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

/**
 * Runs one policy-controlled `dotnet` mutation with cache-freshness guarantees.
 *
 * The shared `"dotnet"` fact is invalidated exactly once in a finalizer whenever the child
 * mutation was actually attempted, so a failed, timed-out, or interrupted attempt can never leave a
 * partially mutated machine described by stale cached facts. A `"planned"` or `"declined"` action
 * never attempts the mutation and therefore never invalidates anything. After an `"executed"`
 * disposition the already-invalidated key is inspected exactly once, before any later action can
 * execute or be declined.
 *
 * @param context - The setup context, including the repository inspection session.
 * @param action - Action identity, scope, summary, and the mutation to attempt.
 * @returns The action disposition, plus the refreshed outcome when the mutation executed; fails
 * with {@link SetupActionFailed} when the action failed. An interruption propagates.
 */
function runDotnetMutation(
  context: SetupContext,
  action: Readonly<{id: string; scope: SetupActionScope; summary: string; mutate: DotnetStep<void>}>,
): DotnetStep<DotnetMutationOutcome> {
  return Effect.gen(function* () {
    let attempted = false;
    const submitted = yield* submitSetupAction({
      id: action.id,
      scope: action.scope,
      summary: action.summary,
      execute: Effect.suspend(() => {
        attempted = true;
        return action.mutate;
      }),
    }).pipe(Effect.ensuring(Effect.suspend(() => (attempted ? context.inspection.invalidate("dotnet") : Effect.void))));

    if (submitted.kind === "failed") {
      return yield* new SetupActionFailed({actionId: action.id, message: submitted.message});
    }
    if (submitted.kind === "planned" || submitted.kind === "declined") {
      return {disposition: submitted.kind};
    }
    return {disposition: "executed", outcome: yield* context.inspection.inspect("dotnet")};
  });
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
 * @returns A complexity-prefixed, unpadded base64url password, redacted from the moment it exists.
 * @throws When the source does not return exactly 24 bytes.
 */
export function generateLocalDevelopmentPassword(randomBytes: RandomByteSource = nodeRandomBytes): Redacted.Redacted<string> {
  const bytes = randomBytes(24);
  if (bytes.byteLength !== 24) {
    throw new Error("The local-development password source must return exactly 24 bytes.");
  }
  return Redacted.make(`Aa1!${Buffer.from(bytes).toString("base64url")}`);
}

/**
 * Discovers the qualified package managers of the host platform with read-only `--version` probes.
 *
 * @param context - The setup context.
 * @param platform - The host platform.
 * @returns The qualified package-manager markers.
 */
function discoverPackageManagers(context: SetupContext, platform: NodeJS.Platform): DotnetStep<ReadonlySet<string>> {
  return Effect.gen(function* () {
    const managers = new Set<string>();
    if (platform === "win32") {
      const winget = yield* runPhaseCommand(context, {command: "winget", args: ["--version"]}, {cwd: context.paths.root});
      if (winget.kind === "succeeded") {
        managers.add("winget");
      }
      return managers;
    }

    if (platform === "darwin") {
      const brew = yield* runPhaseCommand(context, {command: "brew", args: ["--version"]}, {cwd: context.paths.root});
      if (brew.kind === "succeeded") {
        managers.add("brew");
      }
      return managers;
    }

    if (platform !== "linux") {
      return managers;
    }

    const [apt, dnf] = yield* Effect.all(
      [
        runPhaseCommand(context, {command: "apt-get", args: ["--version"]}, {cwd: context.paths.root}),
        runPhaseCommand(context, {command: "dnf", args: ["--version"]}, {cwd: context.paths.root}),
      ],
      {concurrency: "unbounded"},
    );
    if (apt.kind === "succeeded") {
      const policy = yield* runPhaseCommand(
        context,
        {command: "apt-cache", args: ["policy", "dotnet-sdk-10.0"]},
        {cwd: context.paths.root},
      );
      if (policy.kind === "succeeded" && /^\s*Candidate:\s*(?!\(none\)\s*$)\S+/imu.test(policy.stdout)) {
        managers.add("apt-get");
      }
    }
    if (dnf.kind === "succeeded") {
      managers.add("dnf");
    }
    return managers;
  });
}

function restores(context: SetupContext): readonly RestoreDefinition[] {
  return [
    {
      id: "dotnet.workload-restore",
      scope: "system",
      summary: "Restore solution workloads required by the pinned SDK.",
      command: {command: "dotnet", args: ["workload", "restore", context.paths.solution]},
      verify: ({before, after}) => {
        const observed = before?.workloads ?? [];
        const dropped = observed.filter((workload) => !after.workloads.includes(workload));
        if (dropped.length > 0) {
          return {failures: [`Workloads observed before the restore are no longer installed: ${dropped.join(", ")}.`], evidence: []};
        }
        return {
          failures: [],
          evidence: [
            observed.length === 0
              ? "No installed workload was observed before the workload restore, and refreshed facts remain readable."
              : `Every workload observed before the restore is still installed: ${observed.join(", ")}.`,
          ],
        };
      },
    },
    {
      id: "dotnet.solution-restore",
      scope: "repository",
      summary: "Restore solution NuGet dependencies.",
      command: {command: "dotnet", args: ["restore", context.paths.solution]},
      verify: ({after}) =>
        after.solutionRestoreIssues.length > 0
          ? {failures: [...after.solutionRestoreIssues], evidence: []}
          : {failures: [], evidence: ["Every managed solution project reports generated NuGet restore assets."]},
    },
    {
      id: "dotnet.tool-restore",
      scope: "user",
      summary: "Restore manifest-pinned local .NET tools.",
      command: {command: "dotnet", args: ["tool", "restore"]},
      verify: ({after}) =>
        after.localTools.some((tool) => tool.name.toLowerCase() === REQUIRED_LOCAL_TOOL_NAME)
          ? {failures: [], evidence: [`The manifest-pinned local tool '${REQUIRED_LOCAL_TOOL_NAME}' is installed.`]}
          : {
              failures: [`The manifest-pinned local tool '${REQUIRED_LOCAL_TOOL_NAME}' is not installed after the tool restore.`],
              evidence: [],
            },
    },
  ];
}

/**
 * Plans or executes the exact repository restore commands in order, verifying every executed
 * restore against its own action-specific postcondition from immediately refreshed `dotnet` facts.
 *
 * Static solution structure is never presented as proof that a restore succeeded: the workload
 * restore must preserve every workload observed beforehand, the solution restore must leave no
 * generated NuGet restore issue, and the tool restore must install the manifest-pinned repository
 * tool.
 *
 * @param context - The setup context, including the repository inspection session.
 * @param initialFacts - The newest verified facts, or `undefined` when none were observable.
 * @param plannedActions - Mutable accumulator of dry-run-planned action identifiers.
 * @param evidence - Mutable accumulator of human-readable phase evidence.
 * @returns Either a terminal failed/declined phase result, or the facts to continue with.
 */
function runRestoreActions(
  context: SetupContext,
  initialFacts: DotnetFacts | undefined,
  plannedActions: string[],
  evidence: string[],
): DotnetStep<DotnetRestoreOutcome> {
  return Effect.gen(function* () {
    let facts = initialFacts;
    for (const restore of restores(context)) {
      const mutation = yield* runDotnetMutation(context, {
        id: restore.id,
        scope: restore.scope,
        summary: restore.summary,
        mutate: runMutationCommand(context, restore.id, `Restore action '${restore.id}' failed.`, restore.command, {
          cwd: context.paths.root,
          output: "tee",
          timeoutMs: LONG_RUNNING_MUTATION_TIMEOUT_MS,
        }),
      });

      if (mutation.disposition === "planned") {
        plannedActions.push(restore.id);
        evidence.push(`Planned action: ${restore.id}`);
        continue;
      }
      if (mutation.disposition === "declined") {
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
      }

      const refreshed = mutation.outcome;
      if (refreshed.kind !== "available") {
        return {
          result: {
            id: "dotnet",
            status: "failed",
            summary: `The .NET restore action '${restore.id}' could not be verified.`,
            evidence: [...evidence, `Failed postcondition for action: ${restore.id}`, ...unavailableOrInvalidEvidence(refreshed)],
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
            evidence: [...evidence, `Failed postcondition for action: ${restore.id}`, ...refreshed.value.solutionIssues],
            nextActions: ["Resolve the reported repository solution integrity issues, then rerun setup."],
            durationMs: 0,
          },
        };
      }

      const verification = restore.verify({before: facts, after: refreshed.value});
      if (verification.failures.length > 0) {
        return {
          result: {
            id: "dotnet",
            status: "failed",
            summary: `The .NET restore action '${restore.id}' did not satisfy its postcondition.`,
            evidence: [...evidence, `Failed postcondition for action: ${restore.id}`, ...verification.failures],
            nextActions: [`Resolve and rerun required action '${restore.id}'.`],
            durationMs: 0,
          },
        };
      }

      facts = refreshed.value;
      evidence.push(`Executed and verified action: ${restore.id}`, ...verification.evidence);
    }

    return {facts};
  });
}

/**
 * Names the required AppHost parameter keys that still need a per-machine user secret.
 *
 * `missingParameterKeys` alone cannot decide this: the shared provider collapses user-secret and
 * tracked-configuration precedence, so a key supplied only by tracked `appsettings.Development.json`
 * is reported as present while no per-machine user secret exists. A key therefore needs
 * provisioning when it is absent from `userSecretKeys`, or when it remains in
 * `missingParameterKeys` (which also covers a present-but-blank user-secret value).
 *
 * @param facts - The newest verified `dotnet` facts.
 * @returns The required keys needing provisioning, in stable setup-policy order.
 */
function userSecretKeysNeedingProvisioning(facts: Readonly<DotnetFacts>): readonly string[] {
  const present = new Set(facts.appHost.userSecretKeys.map((key) => key.toLowerCase()));
  const missing = new Set(facts.appHost.missingParameterKeys.map((key) => key.toLowerCase()));
  return REQUIRED_APPHOST_SECRET_KEYS.filter((key) => !present.has(key.toLowerCase()) || missing.has(key.toLowerCase()));
}

/**
 * Generates the missing AppHost secrets and writes them through `dotnet user-secrets set`.
 *
 * @remarks
 * Every password is generated `Redacted` and unwrapped only to build the JSON stdin payload of the
 * invocation; a failed write reports only its sanitized stderr (never stdout, which may echo the
 * payload).
 *
 * @param context - The setup context.
 * @param missing - The keys to provision.
 * @param dependencies - Independent random-byte source used to generate new passwords.
 * @returns The write effect.
 */
function writeUserSecrets(context: SetupContext, missing: readonly string[], dependencies: DotnetSetupDependencies): DotnetStep<void> {
  return Effect.gen(function* () {
    const secrets: Redacted.Redacted<string>[] = [];
    const payload: Record<string, Redacted.Redacted<string>> = {};
    for (const key of missing) {
      const value = yield* Effect.try({
        try: () => generateLocalDevelopmentPassword(dependencies.randomBytes),
        catch: (error) =>
          new SetupActionFailed({actionId: USER_SECRETS_ACTION, message: error instanceof Error ? error.message : String(error)}),
      });
      secrets.push(value);
      payload[key] = value;
    }

    const appHostProject = resolve(context.paths.root, ...APPHOST_PROJECT_SEGMENTS);
    const outcome = yield* runPhaseCommand(
      context,
      {command: "dotnet", args: ["user-secrets", "set", "--project", appHostProject]},
      {
        cwd: context.paths.root,
        input: JSON.stringify(Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, Redacted.value(value)]))),
      },
    );
    if (outcome.kind !== "succeeded") {
      const safeEvidence = secretCommandFailureEvidence(outcome.error).map((item) => sanitize(item, secrets));
      return yield* new SetupActionFailed({
        actionId: USER_SECRETS_ACTION,
        message: ["Unable to set missing AppHost user-secret keys.", ...safeEvidence].join("\n"),
      });
    }
  });
}

/**
 * Plans, executes, or reports on generating the AppHost user-secret parameter keys that setup
 * policy requires, then verifies every required key against refreshed facts.
 *
 * @param context - The setup context, including the repository inspection session.
 * @param facts - The `dotnet` facts observed before this step.
 * @param dependencies - Independent random-byte source used to generate new passwords.
 * @param plannedActions - Mutable accumulator of dry-run-planned action identifiers.
 * @param evidence - Mutable accumulator of human-readable phase evidence.
 * @returns Either a terminal declined phase result, or the facts to continue with; fails when the
 * write failed or the post-write postcondition is not satisfied by refreshed facts.
 */
function ensureUserSecrets(
  context: SetupContext,
  facts: Readonly<DotnetFacts>,
  dependencies: DotnetSetupDependencies,
  plannedActions: string[],
  evidence: string[],
): DotnetStep<DotnetStepOutcome> {
  return Effect.gen(function* () {
    const missing = userSecretKeysNeedingProvisioning(facts);
    if (missing.length === 0) {
      evidence.push("Required AppHost user-secret keys are present.");
      return {facts};
    }

    const mutation = yield* runDotnetMutation(context, {
      id: USER_SECRETS_ACTION,
      scope: "user",
      summary: "Set missing AppHost local-development parameters through JSON stdin.",
      mutate: writeUserSecrets(context, missing, dependencies),
    });

    if (mutation.disposition === "planned") {
      plannedActions.push(USER_SECRETS_ACTION);
      evidence.push(`Planned action: ${USER_SECRETS_ACTION}`);
      return {facts};
    }
    if (mutation.disposition === "declined") {
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

    const refreshed = mutation.outcome;
    if (refreshed.kind !== "available") {
      return yield* new SetupActionFailed({
        actionId: USER_SECRETS_ACTION,
        message: ["Unable to verify AppHost user-secret keys after the set action.", ...unavailableOrInvalidEvidence(refreshed)].join("\n"),
      });
    }
    const unsatisfied = userSecretKeysNeedingProvisioning(refreshed.value);
    if (unsatisfied.length > 0) {
      return yield* new SetupActionFailed({
        actionId: USER_SECRETS_ACTION,
        message: `AppHost user-secret postcondition failed; these required keys were not provisioned as user secrets: ${unsatisfied.join(", ")}.`,
      });
    }
    evidence.push(`Executed and verified action: ${USER_SECRETS_ACTION}`);
    return {facts: refreshed.value};
  });
}

/**
 * Plans, executes, or reports on creating and trusting the local HTTPS development certificate
 * from the observed `dotnet` facts, verifying each executed mutation against refreshed facts.
 *
 * @param context - The setup context, including the repository inspection session.
 * @param facts - The `dotnet` facts observed before this step.
 * @param plannedActions - Mutable accumulator of dry-run-planned action identifiers.
 * @param evidence - Mutable accumulator of human-readable phase evidence.
 * @returns A terminal phase result, or `null` to continue with overall phase success; fails when the
 * required certificate creation failed. A failed optional trust degrades the phase instead.
 */
function ensureCertificate(
  context: SetupContext,
  facts: Readonly<DotnetFacts>,
  plannedActions: string[],
  evidence: string[],
): DotnetStep<SetupPhaseResult | null> {
  return Effect.gen(function* () {
    let certificate = facts.certificate;

    if (!certificate.exists) {
      const createMutation = yield* runDotnetMutation(context, {
        id: CERTIFICATE_CREATE_ACTION,
        scope: "user",
        summary: "Create a local HTTPS development certificate.",
        mutate: runMutationCommand(
          context,
          CERTIFICATE_CREATE_ACTION,
          "HTTPS development certificate creation failed.",
          {command: "dotnet", args: ["dev-certs", "https"]},
          {cwd: context.paths.root},
        ),
      });
      if (createMutation.disposition === "planned") {
        plannedActions.push(CERTIFICATE_CREATE_ACTION);
        evidence.push(`Planned action: ${CERTIFICATE_CREATE_ACTION}`);
        return null;
      }
      if (createMutation.disposition === "declined") {
        return {
          id: "dotnet",
          status: "failed",
          summary: "Required HTTPS development certificate creation was declined.",
          evidence: [...evidence, `Declined action: ${CERTIFICATE_CREATE_ACTION}`],
          nextActions: [`Allow required action '${CERTIFICATE_CREATE_ACTION}', then rerun setup.`],
          durationMs: 0,
        };
      }

      const refreshed = createMutation.outcome;
      if (refreshed.kind !== "available" || !refreshed.value.certificate.exists) {
        return {
          id: "dotnet",
          status: "failed",
          summary: "No valid HTTPS development certificate exists after creation.",
          evidence: [
            ...evidence,
            `Failed postcondition for action: ${CERTIFICATE_CREATE_ACTION}`,
            ...unavailableOrInvalidEvidence(refreshed),
          ],
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

    const trust = yield* Effect.result(
      runDotnetMutation(context, {
        id: CERTIFICATE_TRUST_ACTION,
        scope: "system",
        summary: "Trust the local HTTPS development certificate.",
        mutate: runMutationCommand(
          context,
          CERTIFICATE_TRUST_ACTION,
          "HTTPS development certificate trust failed.",
          {command: "dotnet", args: ["dev-certs", "https", "--trust"]},
          {cwd: context.paths.root, output: "inherit", timeoutMs: LONG_RUNNING_MUTATION_TIMEOUT_MS},
        ),
      }),
    );
    if (trust._tag === "Failure") {
      return {
        id: "dotnet",
        status: plannedActions.length > 0 ? "skipped" : "degraded",
        summary: "Required .NET preparation completed, but certificate trust failed.",
        evidence: [...evidence, `Failed action: ${CERTIFICATE_TRUST_ACTION}`, trust.failure.message],
        nextActions: [`Resolve and rerun optional action '${CERTIFICATE_TRUST_ACTION}'.`],
        durationMs: 0,
      };
    }

    const trustMutationOutcome = trust.success;
    if (trustMutationOutcome.disposition === "planned") {
      plannedActions.push(CERTIFICATE_TRUST_ACTION);
      evidence.push(`Planned action: ${CERTIFICATE_TRUST_ACTION}`);
      return null;
    }
    if (trustMutationOutcome.disposition === "declined") {
      return {
        id: "dotnet",
        status: plannedActions.length > 0 ? "skipped" : "degraded",
        summary: "Required .NET preparation completed, but optional certificate trust was declined.",
        evidence: [...evidence, `Declined action: ${CERTIFICATE_TRUST_ACTION}`],
        nextActions: [`Allow optional action '${CERTIFICATE_TRUST_ACTION}' to trust local HTTPS.`],
        durationMs: 0,
      };
    }

    const refreshed = trustMutationOutcome.outcome;
    if (refreshed.kind !== "available" || !refreshed.value.certificate.trusted) {
      return {
        id: "dotnet",
        status: plannedActions.length > 0 ? "skipped" : "degraded",
        summary: "Required .NET preparation completed, but certificate trust was not established.",
        evidence: [...evidence, `Failed postcondition for action: ${CERTIFICATE_TRUST_ACTION}`, ...unavailableOrInvalidEvidence(refreshed)],
        nextActions: [`Resolve and rerun optional action '${CERTIFICATE_TRUST_ACTION}'.`],
        durationMs: 0,
      };
    }
    evidence.push(`Executed and verified action: ${CERTIFICATE_TRUST_ACTION}`);
    return null;
  });
}

/**
 * Ensures a compatible .NET SDK is selected and installed, consuming shared `dotnet` facts for
 * every readiness observation and installing only through the reviewed proposal contract.
 *
 * A machine where `dotnet` is entirely unavailable is a supported installation case, not an abort:
 * it still discovers a package manager, offers the reviewed proposal, and requires compatible
 * facts from the post-install refresh. No success-shaped placeholder facts are ever fabricated for
 * such a machine, so dry-run planning of dependent restores proceeds without any facts at all.
 *
 * @param context - The setup context, including the repository inspection session.
 * @param initial - The `dotnet` state observed before this step.
 * @param plannedActions - Mutable accumulator of dry-run-planned action identifiers.
 * @param evidence - Mutable accumulator of human-readable phase evidence.
 * @returns Either a terminal phase result (including a dry-run "planned installation" summary
 * that also plans dependent restores), or the facts to continue with.
 */
function ensureDotnetSdk(
  context: SetupContext,
  initial: InitialDotnetState,
  plannedActions: string[],
  evidence: string[],
): DotnetStep<DotnetStepOutcome> {
  return Effect.gen(function* () {
    if (initial.kind === "available" && isDotnetCompatible(initial.facts, context.requirements.dotnet)) {
      return {facts: initial.facts};
    }

    const {platform} = yield* Environment;
    const packageManagers = yield* discoverPackageManagers(context, platform);
    const proposal = selectDotnetInstallationProposal({
      platform,
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

    const installMutation = yield* runDotnetMutation(context, {
      id: DOTNET_INSTALL_ACTION,
      scope: "system",
      summary: proposal.explanation,
      mutate: runMutationCommand(context, DOTNET_INSTALL_ACTION, "The supported .NET SDK installation command failed.", proposal.command, {
        cwd: context.paths.root,
        output: "inherit",
        timeoutMs: LONG_RUNNING_MUTATION_TIMEOUT_MS,
      }),
    });

    if (installMutation.disposition === "declined") {
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

    if (installMutation.disposition === "planned") {
      plannedActions.push(DOTNET_INSTALL_ACTION);
      evidence.push(`Planned action: ${DOTNET_INSTALL_ACTION}`);
      const restoreOutcome = yield* runRestoreActions(
        context,
        initial.kind === "available" ? initial.facts : undefined,
        plannedActions,
        evidence,
      );
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
    const refreshed = installMutation.outcome;
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
  });
}

/**
 * Prepares the .NET toolchain up to its result, without its duration.
 *
 * @param context - The setup context.
 * @param dependencies - The random-byte source.
 * @param evidence - Mutable accumulator of human-readable phase evidence.
 * @returns The phase result (its duration is replaced); fails when a required mutation failed.
 */
function prepareDotnet(
  context: SetupContext,
  dependencies: DotnetSetupDependencies,
  evidence: string[],
): DotnetStep<Omit<SetupPhaseResult, "durationMs">> {
  return Effect.gen(function* () {
    const plannedActions: string[] = [];
    const initialOutcome = yield* context.inspection.inspect("dotnet");
    if (initialOutcome.kind === "invalid") {
      return {
        id: "dotnet",
        status: "failed",
        summary: "The .NET environment could not be inspected.",
        evidence: [...evidence, ...unavailableOrInvalidEvidence(initialOutcome)],
        nextActions: [DOTNET_MANUAL_INSTALL],
      };
    }

    // An unavailable `dotnet` is a supported missing-SDK machine, not an inspection failure: it
    // still reaches the reviewed installation proposal. Only `"invalid"` is a bounded abort.
    const initial: InitialDotnetState =
      initialOutcome.kind === "available"
        ? {kind: "available", facts: initialOutcome.value}
        : {kind: "unavailable", reason: initialOutcome.reason};
    evidence.push(
      ...(initial.kind === "available" ? dotnetCompatibilityEvidence(initial.facts, context.requirements.dotnet) : [initial.reason]),
    );

    const sdkOutcome = yield* ensureDotnetSdk(context, initial, plannedActions, evidence);
    if ("result" in sdkOutcome) {
      return sdkOutcome.result;
    }
    let facts = sdkOutcome.facts;

    if (facts.solutionIssues.length > 0) {
      return {
        id: "dotnet",
        status: "failed",
        summary: "The repository solution reports integrity issues.",
        evidence: [...evidence, ...facts.solutionIssues],
        nextActions: ["Resolve the reported repository solution integrity issues, then rerun setup."],
      };
    }

    const restoreOutcome = yield* runRestoreActions(context, facts, plannedActions, evidence);
    if ("result" in restoreOutcome) {
      return restoreOutcome.result;
    }
    facts = restoreOutcome.facts ?? facts;

    if (!facts.appHost.projectExists) {
      return {
        id: "dotnet",
        status: "failed",
        summary: "The required AppHost project does not exist.",
        evidence: [...evidence, `${APPHOST_PROJECT_SEGMENTS.join("/")} is missing.`],
        nextActions: ["Restore the tracked AppHost project, then rerun setup."],
      };
    }
    evidence.push("The AppHost project exists.");

    const secretsOutcome = yield* ensureUserSecrets(context, facts, dependencies, plannedActions, evidence);
    if ("result" in secretsOutcome) {
      return secretsOutcome.result;
    }
    facts = secretsOutcome.facts;

    const certificateOutcome = yield* ensureCertificate(context, facts, plannedActions, evidence);
    if (certificateOutcome !== null) {
      return certificateOutcome;
    }

    if (plannedActions.length > 0) {
      return {
        id: "dotnet",
        status: "skipped",
        summary: "Required .NET preparation actions are planned by dry-run.",
        evidence,
        nextActions: [],
      };
    }

    return {
      id: "dotnet",
      status: "succeeded",
      summary: "The .NET SDK, restores, AppHost parameters, and HTTPS certificate are ready.",
      evidence,
      nextActions: [],
    };
  });
}

/**
 * Runs the .NET phase: a failed required mutation becomes one failed result naming the reported
 * failure; an interruption propagates.
 *
 * @param context - The setup context.
 * @param dependencies - The random-byte source.
 * @returns The phase result.
 */
function runDotnetSetup(
  context: SetupContext,
  dependencies: DotnetSetupDependencies,
): Effect.Effect<SetupPhaseResult, never, SetupRequirements> {
  return Effect.gen(function* () {
    const startedAt = yield* Clock.currentTimeMillis;
    const evidence: string[] = [];
    const outcome = yield* Effect.result(prepareDotnet(context, dependencies, evidence));
    if (outcome._tag === "Success") {
      const {durationMs: _durationMs, ...result} = outcome.success as SetupPhaseResult;
      return yield* phaseResult(startedAt, result);
    }
    const failure = outcome.failure.message;
    return yield* phaseResult(startedAt, {
      id: "dotnet",
      status: "failed",
      summary: "The required .NET preparation phase failed.",
      evidence: [...evidence, failure],
      nextActions: [
        failure.toLowerCase().includes("certificate")
          ? "Resolve the reported HTTPS development certificate failure, then rerun setup."
          : "Resolve the reported .NET preparation failure, then rerun setup.",
      ],
    });
  }).pipe(Effect.withSpan("setup.dotnet"));
}

/**
 * Creates the .NET setup phase with an explicit random-byte source boundary.
 *
 * @remarks
 * The host platform is read from `Environment`, together with every other capability this phase
 * observes. Only the cryptographic byte source behind generated local-development passwords stays
 * injectable, because it is security-sensitive business input rather than an ambient capability.
 *
 * @param dependencies - Optional production-boundary replacements for tests.
 * @returns The independent .NET setup phase definition.
 */
export function createDotnetSetupPhase(dependencies: Partial<DotnetSetupDependencies> = {}): SetupPhaseDefinition {
  const resolvedDependencies: DotnetSetupDependencies = {
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
