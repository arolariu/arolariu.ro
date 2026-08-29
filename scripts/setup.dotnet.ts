/**
 * @fileoverview Independent .NET SDK, restore, AppHost, and HTTPS setup phase.
 * @module scripts.setup.dotnet
 */

import {randomBytes as nodeRandomBytes} from "node:crypto";
import {readFile} from "node:fs/promises";
import {resolve} from "node:path";

import type {CommandResult, CommandSpec} from "./common/process.ts";
import {satisfiesMinimum, type MinimumVersion} from "./common/requirements.ts";
import type {
  InstallationProposal,
  SetupActionDisposition,
  SetupActionScope,
  SetupContext,
  SetupPhaseDefinition,
  SetupPhaseResult,
} from "./setup.types.ts";

type UnknownRecord = Readonly<Record<string, unknown>>;
type ReadTextFile = (path: string, encoding: "utf8") => Promise<string>;
type RandomByteSource = (size: number) => Uint8Array;

interface DotnetSetupDependencies {
  readonly platform: NodeJS.Platform;
  readonly readTextFile: ReadTextFile;
  readonly randomBytes: RandomByteSource;
}

interface DotnetReadiness {
  readonly ready: boolean;
  readonly evidence: readonly string[];
}

interface RestoreDefinition {
  readonly id: string;
  readonly scope: SetupActionScope;
  readonly summary: string;
  readonly command: CommandSpec;
}

const APPHOST_SECRET_KEYS = ["Parameters:sql-password", "Parameters:redis-password"] as const;
const DOTNET_MANUAL_INSTALL = "Install the required SDK from https://dotnet.microsoft.com/download, then rerun setup.";
const DOTNET_INSTALL_ACTION = "dotnet.install-sdk";
const USER_SECRETS_ACTION = "dotnet.user-secrets.set";
const CERTIFICATE_CREATE_ACTION = "dotnet.certificate.create";
const CERTIFICATE_TRUST_ACTION = "dotnet.certificate.trust";

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

function normalizedVersion(version: MinimumVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function parseLeadingVersion(value: string): MinimumVersion | null {
  const match = /^\s*(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?=$|[-+\s])/u.exec(value);
  if (match === null) {
    return null;
  }
  const version = {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
  return Object.values(version).every(Number.isSafeInteger) ? version : null;
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

/**
 * Parses the leading numeric version from every valid `dotnet --list-sdks`
 * line.
 *
 * @param output - Untrusted SDK listing output.
 * @returns Parsed stable and prerelease SDK versions in output order.
 */
export function parseDotnetSdks(output: string): readonly MinimumVersion[] {
  const versions: MinimumVersion[] = [];
  for (const line of output.split(/\r?\n/u)) {
    const version = parseLeadingVersion(line);
    if (version !== null) {
      versions.push(version);
    }
  }
  return versions;
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

async function inspectDotnetReadiness(context: SetupContext): Promise<DotnetReadiness> {
  const sdkResult = await context.runner.run({command: "dotnet", args: ["--list-sdks"]}, {cwd: context.paths.root});
  const selectedResult = await context.runner.run({command: "dotnet", args: ["--version"]}, {cwd: context.paths.root});
  const evidence: string[] = [];

  const sdks = isSuccessfulCommand(sdkResult) ? parseDotnetSdks(sdkResult.stdout) : [];
  const compatibleSdk = sdks.some((sdk) => satisfiesMinimum(sdk, context.requirements.dotnet));
  if (!isSuccessfulCommand(sdkResult)) {
    evidence.push("The dotnet SDK listing probe failed.", ...commandFailureEvidence(sdkResult));
  } else if (!compatibleSdk) {
    evidence.push(
      sdks.length === 0
        ? "The dotnet SDK listing contained no valid SDK versions."
        : `No listed SDK satisfies >=${normalizedVersion(context.requirements.dotnet)}.`,
    );
  }

  const selected = isSuccessfulCommand(selectedResult) ? parseLeadingVersion(selectedResult.stdout.trim()) : null;
  const compatibleSelected = selected !== null && satisfiesMinimum(selected, context.requirements.dotnet);
  if (!isSuccessfulCommand(selectedResult)) {
    evidence.push("The selected dotnet SDK probe failed.", ...commandFailureEvidence(selectedResult));
  } else if (!compatibleSelected) {
    evidence.push(
      selected === null
        ? "dotnet --version returned a malformed selected SDK version."
        : `The selected SDK ${normalizedVersion(selected)} does not satisfy >=${normalizedVersion(context.requirements.dotnet)}.`,
    );
  }

  if (compatibleSdk && compatibleSelected) {
    evidence.push(`A listed SDK and selected SDK satisfy >=${normalizedVersion(context.requirements.dotnet)}.`);
  }
  return {ready: compatibleSdk && compatibleSelected, evidence};
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

async function runRestoreActions(context: SetupContext, plannedActions: string[], evidence: string[]): Promise<SetupPhaseResult | null> {
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
        id: "dotnet",
        status: "failed",
        summary: "A required .NET restore action was declined.",
        evidence: [...evidence, `Declined action: ${restore.id}`],
        nextActions: [`Allow required action '${restore.id}', then rerun setup.`],
        durationMs: 0,
      };
    } else {
      evidence.push(`Executed action: ${restore.id}`);
    }
  }
  return null;
}

async function validateAppHostSettings(path: string, readTextFile: ReadTextFile): Promise<void> {
  let contents: string;
  try {
    contents = await readTextFile(path, "utf8");
  } catch (error: unknown) {
    throw new Error(`Unable to read tracked AppHost development configuration: ${error instanceof Error ? error.message : String(error)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new Error("Tracked AppHost development configuration is not valid JSON.");
  }
  const parameters = isRecord(parsed) ? parsed["Parameters"] : undefined;
  if (!isRecord(parameters)) {
    throw new Error("Tracked AppHost development configuration must contain a Parameters object.");
  }
  for (const key of ["sql-password", "redis-password"] as const) {
    const value = parameters[key];
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`Tracked AppHost development configuration is missing required parameter '${key}'.`);
    }
  }
}

function parseUserSecrets(output: string, logger: SetupContext["logger"]): ReadonlyMap<string, string> {
  const begin = output.indexOf("//BEGIN");
  const end = output.indexOf("//END");
  let document = output;
  if (begin >= 0 || end >= 0) {
    if (begin < 0 || end < 0 || end <= begin) {
      throw new Error("The user-secrets JSON wrapper is malformed.");
    }
    document = output.slice(begin + "//BEGIN".length, end).trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(document);
  } catch {
    throw new Error("The user-secrets command returned malformed JSON.");
  }
  if (!isRecord(parsed) || !Object.values(parsed).every((value) => typeof value === "string")) {
    throw new Error("The user-secrets command must return a JSON object of string values.");
  }

  const secrets = new Map<string, string>();
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== "string") {
      throw new Error("The user-secrets command must return a JSON object of string values.");
    }
    secrets.set(key, value);
    if (value.length > 0) {
      logger.redact(value);
    }
  }
  return secrets;
}

async function listUserSecrets(context: SetupContext, project: string, knownSecrets: string[]): Promise<ReadonlyMap<string, string>> {
  const result = await context.runner.run(
    {command: "dotnet", args: ["user-secrets", "list", "--json", "--project", project]},
    {cwd: context.paths.root},
  );
  if (!isSuccessfulCommand(result)) {
    const safeEvidence = commandFailureEvidence(result, {includeStdout: false}).map((item) => sanitize(item, knownSecrets));
    throw new Error(["Unable to inspect AppHost user-secret keys.", ...safeEvidence].join("\n"));
  }
  const secrets = parseUserSecrets(result.stdout, context.logger);
  for (const value of secrets.values()) {
    if (value.length > 0 && !knownSecrets.includes(value)) {
      knownSecrets.push(value);
    }
  }
  return secrets;
}

function missingSecretKeys(secrets: ReadonlyMap<string, string>): readonly (typeof APPHOST_SECRET_KEYS)[number][] {
  return APPHOST_SECRET_KEYS.filter((key) => (secrets.get(key)?.length ?? 0) === 0);
}

async function ensureUserSecrets(
  context: SetupContext,
  project: string,
  dependencies: DotnetSetupDependencies,
  knownSecrets: string[],
  plannedActions: string[],
  evidence: string[],
): Promise<SetupPhaseResult | null> {
  const existing = await listUserSecrets(context, project, knownSecrets);
  const missing = missingSecretKeys(existing);
  if (missing.length === 0) {
    evidence.push("Required AppHost user-secret keys are present.");
    return null;
  }

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
        {command: "dotnet", args: ["user-secrets", "set", "--project", project]},
        {
          cwd: context.paths.root,
          input: JSON.stringify(payload),
        },
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
    return null;
  }
  if (disposition === "declined") {
    return {
      id: "dotnet",
      status: "failed",
      summary: "Required AppHost user-secret preparation was declined.",
      evidence: [...evidence, `Declined action: ${USER_SECRETS_ACTION}`],
      nextActions: [`Allow required action '${USER_SECRETS_ACTION}', then rerun setup.`],
      durationMs: 0,
    };
  }

  const verified = await listUserSecrets(context, project, knownSecrets);
  const stillMissing = missingSecretKeys(verified);
  if (stillMissing.length > 0) {
    throw new Error("AppHost user-secret postcondition failed; one or more required keys remain missing.");
  }
  evidence.push(`Executed and verified action: ${USER_SECRETS_ACTION}`);
  return null;
}

function commandTransportSucceeded(result: Readonly<CommandResult>): boolean {
  return !result.timedOut && result.signal === undefined && result.spawnError === undefined;
}

function parseTrustState(output: string): boolean | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) {
    return null;
  }
  for (const [key, value] of Object.entries(parsed)) {
    if (key.toLowerCase() === "trusted" && typeof value === "boolean") {
      return value;
    }
    if (key.toLowerCase() === "status" && typeof value === "string") {
      const status = value.toLowerCase();
      if (status === "trusted") {
        return true;
      }
      if (status === "untrusted") {
        return false;
      }
    }
  }
  return null;
}

async function runCertificateProbe(context: SetupContext): Promise<CommandResult> {
  return context.runner.run({command: "dotnet", args: ["dev-certs", "https", "--check"]}, {cwd: context.paths.root});
}

async function runTrustProbe(context: SetupContext): Promise<CommandResult> {
  return context.runner.run({command: "dotnet", args: ["dev-certs", "https", "--check-trust-machine-readable"]}, {cwd: context.paths.root});
}

async function ensureCertificate(
  context: SetupContext,
  plannedActions: string[],
  evidence: string[],
  knownSecrets: string[],
): Promise<SetupPhaseResult | null> {
  const initialCertificate = await runCertificateProbe(context);
  if (!commandTransportSucceeded(initialCertificate)) {
    throw new Error(["Unable to inspect the HTTPS development certificate.", ...commandFailureEvidence(initialCertificate)].join("\n"));
  }

  if (!isSuccessfulCommand(initialCertificate)) {
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
    } else if (createDisposition === "declined") {
      return {
        id: "dotnet",
        status: "failed",
        summary: "Required HTTPS development certificate creation was declined.",
        evidence: [...evidence, `Declined action: ${CERTIFICATE_CREATE_ACTION}`],
        nextActions: [`Allow required action '${CERTIFICATE_CREATE_ACTION}', then rerun setup.`],
        durationMs: 0,
      };
    } else {
      const verifiedCertificate = await runCertificateProbe(context);
      if (!isSuccessfulCommand(verifiedCertificate)) {
        throw new Error(
          ["No valid HTTPS development certificate exists after creation.", ...commandFailureEvidence(verifiedCertificate)].join("\n"),
        );
      }
      evidence.push(`Executed and verified action: ${CERTIFICATE_CREATE_ACTION}`);
    }
  } else {
    evidence.push("A valid HTTPS development certificate exists.");
  }

  const trustResult = await runTrustProbe(context);
  const trustState = commandTransportSucceeded(trustResult) ? parseTrustState(trustResult.stdout) : null;
  if (trustState === null || (trustState && !isSuccessfulCommand(trustResult))) {
    return {
      id: "dotnet",
      status: plannedActions.length > 0 ? "skipped" : "degraded",
      summary: "Required .NET preparation completed, but certificate trust could not be determined.",
      evidence: [
        ...evidence,
        "The machine-readable HTTPS certificate trust probe was unavailable or malformed.",
        ...commandFailureEvidence(trustResult, {includeStdout: false}).map((item) => sanitize(item, knownSecrets)),
      ],
      nextActions: ["Run 'dotnet dev-certs https --check-trust-machine-readable' and correct local certificate trust."],
      durationMs: 0,
    };
  }
  if (trustState) {
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

  const verifiedTrust = await runTrustProbe(context);
  if (!isSuccessfulCommand(verifiedTrust) || parseTrustState(verifiedTrust.stdout) !== true) {
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

async function runDotnetSetup(context: SetupContext, dependencies: DotnetSetupDependencies): Promise<SetupPhaseResult> {
  const startedAt = context.now();
  const evidence: string[] = [];
  const plannedActions: string[] = [];
  const knownSecrets: string[] = [];

  try {
    let readiness = await inspectDotnetReadiness(context);
    evidence.push(...readiness.evidence);
    if (!readiness.ready) {
      const packageManagers = await discoverPackageManagers(context, dependencies.platform);
      const proposal = selectDotnetInstallationProposal({
        platform: dependencies.platform,
        availablePackageManagers: packageManagers,
        required: context.requirements.dotnet,
      });
      if (proposal === null) {
        return phaseResult(context, startedAt, {
          id: "dotnet",
          status: "failed",
          summary: "A compatible .NET SDK is unavailable and no supported installer was discovered.",
          evidence,
          nextActions: [DOTNET_MANUAL_INSTALL],
        });
      }

      const installDisposition = await context.actions.run({
        id: DOTNET_INSTALL_ACTION,
        scope: "system",
        summary: proposal.explanation,
        execute: async () => {
          const installResult = await context.runner.run(proposal.command, {
            cwd: context.paths.root,
            output: "inherit",
          });
          if (!isSuccessfulCommand(installResult)) {
            throw new Error(["The supported .NET SDK installation command failed.", ...commandFailureEvidence(installResult)].join("\n"));
          }
        },
      });
      if (installDisposition === "declined") {
        return phaseResult(context, startedAt, {
          id: "dotnet",
          status: "failed",
          summary: "Required .NET SDK installation was declined.",
          evidence: [...evidence, `Declined action: ${DOTNET_INSTALL_ACTION}`],
          nextActions: [DOTNET_MANUAL_INSTALL],
        });
      }
      if (installDisposition === "planned") {
        plannedActions.push(DOTNET_INSTALL_ACTION);
        evidence.push(`Planned action: ${DOTNET_INSTALL_ACTION}`);
        const restoreFailure = await runRestoreActions(context, plannedActions, evidence);
        if (restoreFailure !== null) {
          return phaseResult(context, startedAt, {
            id: restoreFailure.id,
            status: restoreFailure.status,
            summary: restoreFailure.summary,
            evidence: restoreFailure.evidence,
            nextActions: restoreFailure.nextActions,
          });
        }
        return phaseResult(context, startedAt, {
          id: "dotnet",
          status: "skipped",
          summary: "Required .NET SDK installation and dependent restores are planned by dry-run.",
          evidence,
          nextActions: [],
        });
      }

      readiness = await inspectDotnetReadiness(context);
      evidence.push(...readiness.evidence);
      if (!readiness.ready) {
        return phaseResult(context, startedAt, {
          id: "dotnet",
          status: "failed",
          summary: "The .NET SDK remains incompatible after installation.",
          evidence,
          nextActions: [DOTNET_MANUAL_INSTALL],
        });
      }
      evidence.push(`Executed and verified action: ${DOTNET_INSTALL_ACTION}`);
    }

    const restoreFailure = await runRestoreActions(context, plannedActions, evidence);
    if (restoreFailure !== null) {
      return phaseResult(context, startedAt, {
        id: restoreFailure.id,
        status: restoreFailure.status,
        summary: restoreFailure.summary,
        evidence: restoreFailure.evidence,
        nextActions: restoreFailure.nextActions,
      });
    }

    const appHostSettings = resolve(context.paths.root, "tooling", "AppHost", "appsettings.Development.json");
    const appHostProject = resolve(context.paths.root, "tooling", "AppHost", "AppHost.csproj");
    await validateAppHostSettings(appHostSettings, dependencies.readTextFile);
    evidence.push("Tracked AppHost development parameter shape is valid.");

    const secretFailure = await ensureUserSecrets(context, appHostProject, dependencies, knownSecrets, plannedActions, evidence);
    if (secretFailure !== null) {
      return phaseResult(context, startedAt, {
        id: secretFailure.id,
        status: secretFailure.status,
        summary: secretFailure.summary,
        evidence: secretFailure.evidence,
        nextActions: secretFailure.nextActions,
      });
    }

    const certificateOutcome = await ensureCertificate(context, plannedActions, evidence, knownSecrets);
    if (certificateOutcome !== null) {
      return phaseResult(context, startedAt, {
        id: certificateOutcome.id,
        status: certificateOutcome.status,
        summary: certificateOutcome.summary,
        evidence: certificateOutcome.evidence,
        nextActions: certificateOutcome.nextActions,
      });
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
 * Creates the .NET setup phase with explicit platform, filesystem, and random
 * boundaries.
 *
 * @param dependencies - Optional production-boundary replacements for tests.
 * @returns The independent .NET setup phase definition.
 */
export function createDotnetSetupPhase(dependencies: Partial<DotnetSetupDependencies> = {}): SetupPhaseDefinition {
  const resolvedDependencies: DotnetSetupDependencies = {
    platform: dependencies.platform ?? process.platform,
    readTextFile: dependencies.readTextFile ?? ((path, encoding) => readFile(path, encoding)),
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
