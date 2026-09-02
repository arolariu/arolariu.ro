/**
 * @fileoverview React workspace, website environment, and Playwright setup phase.
 * @module scripts.setup.react
 *
 * @remarks
 * Every read-only React observation (installed package inventory, the `@arolariu/components`
 * workspace link, website `.env` key/syntax classification, generated artifacts, i18n and
 * framework contracts, and the installed Playwright browser inventory) is consumed exclusively
 * through `context.inspection.inspect("packages")` and `context.inspection.inspect("react")`.
 * This phase never runs `npm ls`, never parses a Playwright inventory listing, and never reads a
 * package manifest, lock file, or generated artifact itself.
 *
 * Setup still owns policy that no shared fact models: comparing the shared inventory against the
 * manifest-derived locked versions, the secret-bearing website `.env` read/prompt/additive atomic
 * write, and the Linux Playwright host-library probe and installation.
 *
 * Every attempted fact-changing mutation runs through {@link runReactMutation}, which invalidates
 * exactly `"react"` in a `finally` block around the mutation so a failed or interrupted attempt can
 * never leave the shared session cache stale, and then re-inspects `"react"` immediately after an
 * `"executed"` disposition. Planned and declined actions never invalidate anything, and a
 * successful command is never treated as proof: each mutation asserts its own postcondition
 * against the refreshed facts. The Linux system-dependency action is deliberately excluded because
 * the shared fact contract does not model host libraries.
 *
 * The phase reads every capability from the invocation-scoped {@link SetupPhaseRuntime}: the
 * process runner, the atomic filesystem, the clock, and the immutable environment snapshot that
 * supplies both the host platform and the non-interactive decision. It owns no ambient Node state
 * and no injected host boundary of its own; {@link prepareWebsiteEnvironment} stays exported
 * because the secret-bearing additive `.env` policy is business logic, not a runtime capability.
 */

import type {ProcessOutcome, ProcessRequest, SucceededProcessOutcome} from "./common/runner.ts";
import {CommandCancellation, type FileSystem} from "./common/runtime.ts";
import {appendMissingEnvironmentValues, parseEnvironmentFile} from "./generate.env.ts";
import type {ReactFacts} from "./inspection/frontend.ts";
import type {PackageInventoryFacts} from "./inspection/packages.ts";
import type {InspectionOutcome} from "./inspection/types.ts";
import {
  requireSetupPhaseRuntime,
  type SetupActionDisposition,
  type SetupActionScope,
  type SetupContext,
  type SetupPhaseDefinition,
  type SetupPhaseResult,
  type SetupPhaseRuntime,
} from "./setup.types.ts";

type ClerkMode = "test" | "live";

/** Outcome of additive website environment preparation. */
export interface EnvironmentPreparationResult {
  /** Whether both Clerk credentials are valid and mode-compatible. */
  readonly status: "complete" | "degraded";
  /** Existing setup-owned key names in canonical order. */
  readonly preservedKeys: readonly string[];
  /** Newly written or dry-run-planned key names in canonical order. */
  readonly writtenKeys: readonly string[];
  /** Absent or invalid external credential key names. */
  readonly missingExternalKeys: readonly string[];
}

interface EnvironmentPreparationOutcome extends EnvironmentPreparationResult {
  readonly actionDisposition?: SetupActionDisposition;
  readonly refreshed?: InspectionOutcome<ReactFacts>;
}

/** Result of evaluating one policy-controlled `react` mutation and its immediate cache refresh. */
type ReactMutationOutcome =
  | Readonly<{disposition: "planned"}>
  | Readonly<{disposition: "declined"}>
  | Readonly<{disposition: "executed"; outcome: InspectionOutcome<ReactFacts>}>;

/** One completed setup step: either a terminal phase result, or refreshed `react` facts to continue with. */
type ReactStepOutcome = Readonly<{result: SetupPhaseResult}> | Readonly<{facts: ReactFacts}>;

interface PackagePolicy {
  readonly lockedVersions: ReadonlyMap<string, string>;
  readonly playwrightVersion: string;
}

interface InventoryComparison {
  readonly absent: readonly string[];
  readonly defects: readonly string[];
}

const LOCKED_PACKAGES = ["react", "react-dom", "next", "@clerk/nextjs", "@docusaurus/core", "@playwright/test", "playwright"] as const;
const WORKSPACE_LINKED_PACKAGE = "@arolariu/components";
const WORKSPACE_LINKED_ROOT = "packages/components";
const ROOT_DEPENDENCIES_ACTION = "workspace.root-dependencies";
const GENERATORS_ACTION = "workspace.generators";
const LOCAL_DEFAULTS = new Map<string, string>([
  ["SITE_ENV", "DEVELOPMENT"],
  ["SITE_NAME", "dev.arolariu.ro"],
  ["SITE_URL", "https://localhost:3000"],
  ["USE_CDN", "false"],
]);
const CLERK_KEYS = ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"] as const;
const SETUP_OWNED_KEYS = [...LOCAL_DEFAULTS.keys(), ...CLERK_KEYS] as const;
const ENVIRONMENT_WRITE_ACTION = "react.environment.write";
const BROWSER_INSTALL_ACTION = "react.playwright.chromium.install";
const SYSTEM_DEPENDENCIES_ACTION = "react.playwright.system-dependencies.install";
const CHROMIUM_BROWSER_PREFIX = "chromium-";
const REACT_NEXT_ACTION = "Resolve the reported React setup failure, then rerun setup.";
/** POSIX permission bits the secret-bearing website environment file is created and kept at. */
const ENVIRONMENT_FILE_MODE = 0o600;
/**
 * Bounded ceiling for the long-running Playwright installation mutations this phase owns.
 *
 * @remarks
 * The invocation-scoped runner defaults to a probe-sized timeout, which is correct for the
 * `install-deps --dry-run` probe but would truncate a browser or host-library download. Both
 * installs therefore request this ceiling explicitly, preserving the pre-migration `tee` mutation
 * timeout the deprecated setup runner bridge used to supply implicitly.
 */
const LONG_RUNNING_MUTATION_TIMEOUT_MS = 1_200_000;
const BROWSER_INSTALL_COMMAND: ProcessRequest = {
  command: "npx",
  args: ["--no-install", "playwright", "install", "chromium"],
};
const SYSTEM_DEPENDENCIES_PROBE: ProcessRequest = {
  command: "npx",
  args: ["--no-install", "playwright", "install-deps", "--dry-run", "chromium"],
};
const SYSTEM_DEPENDENCIES_INSTALL: ProcessRequest = {
  command: "npx",
  args: ["--no-install", "playwright", "install-deps", "chromium"],
};

function isSuccessfulOutcome(outcome: Readonly<ProcessOutcome>): outcome is SucceededProcessOutcome {
  return outcome.kind === "succeeded";
}

/**
 * Reports whether the child actually ran to completion and produced its own exit code.
 *
 * @param outcome - Completed process outcome.
 * @returns Whether the outcome carries a child-reported exit code rather than a transport failure.
 */
function transportCompleted(outcome: Readonly<ProcessOutcome>): boolean {
  return outcome.kind === "succeeded" || outcome.kind === "exited";
}

function isInterrupted(error: unknown): boolean {
  return error instanceof CommandCancellation || (error instanceof Error && error.name === "AbortError");
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

/**
 * Renders one failed process outcome as concise, secret-free setup evidence.
 *
 * @param outcome - Completed process outcome.
 * @returns Evidence lines naming the transport failure and any captured output.
 */
function commandFailureEvidence(outcome: Readonly<ProcessOutcome>): readonly string[] {
  const evidence: string[] = [];
  switch (outcome.kind) {
    case "succeeded":
      break;
    case "exited":
      evidence.push(`Command exited with code ${String(outcome.exitCode)}.`);
      break;
    case "signalled":
      evidence.push(`Command stopped with signal ${outcome.signal}.`);
      break;
    case "spawn-failed":
      evidence.push(`Unable to start command: ${outcome.message}`);
      break;
    case "timed-out":
      evidence.push("Command timed out.");
      if (outcome.signal !== undefined) {
        evidence.push(`Command stopped with signal ${outcome.signal}.`);
      }
      break;
    case "cancelled":
      evidence.push("Command was cancelled.");
      break;
  }

  if (outcome.stdout.trim() !== "") {
    evidence.push(`stdout: ${outcome.stdout.trim()}`);
  }
  if (outcome.stderr.trim() !== "") {
    evidence.push(`stderr: ${outcome.stderr.trim()}`);
  }

  return evidence;
}

function sanitize(value: string, secrets: readonly string[]): string {
  let sanitized = value;
  for (const secret of [...secrets].filter((candidate) => candidate !== "").toSorted((left, right) => right.length - left.length)) {
    sanitized = sanitized.replaceAll(secret, "[REDACTED]");
  }
  return sanitized;
}

function errorMessage(error: unknown, secrets: readonly string[]): string {
  return sanitize(error instanceof Error ? error.message : String(error), secrets);
}

function duration(startedAt: number, runtime: SetupPhaseRuntime): number {
  return Math.max(0, runtime.clock.monotonicNow() - startedAt);
}

function phaseResult(runtime: SetupPhaseRuntime, startedAt: number, input: Omit<SetupPhaseResult, "durationMs">): SetupPhaseResult {
  return {
    ...input,
    durationMs: duration(startedAt, runtime),
  };
}

function failedResult(
  summary: string,
  evidence: readonly string[],
  nextActions: readonly string[] = [REACT_NEXT_ACTION],
): SetupPhaseResult {
  return {
    id: "react",
    status: "failed",
    summary,
    evidence,
    nextActions,
    durationMs: 0,
  };
}

/**
 * Converts a non-`"available"` inspection outcome into bounded, non-secret evidence.
 *
 * @param outcome - An inspection outcome that did not resolve a value.
 * @returns Zero or more bounded evidence lines; never raw command output.
 */
function outcomeEvidence(outcome: Readonly<InspectionOutcome<unknown>>): readonly string[] {
  if (outcome.kind === "unavailable") {
    return [outcome.reason];
  }
  if (outcome.kind === "invalid") {
    return [...outcome.issues];
  }
  return [];
}

/**
 * Runs one policy-controlled `react` mutation with cache-freshness guarantees.
 *
 * @remarks
 * The shared `"react"` fact is invalidated exactly once inside a `finally` block whenever the
 * mutation was actually attempted, so a thrown, failed, or interrupted attempt can never leave a
 * partially mutated repository described by stale cached facts. A `"planned"` or `"declined"`
 * action never attempts the mutation and therefore never invalidates anything. After an
 * `"executed"` disposition the already-invalidated key is inspected exactly once, before any later
 * action can execute or be declined.
 *
 * @param context - Shared setup dependencies, including the repository inspection session.
 * @param action - Action identity, scope, summary, and the mutation to attempt.
 * @returns The action disposition, plus the refreshed outcome when the mutation executed.
 * @throws Whatever the mutation or the action executor throws, including `AbortError`.
 */
async function runReactMutation(
  context: SetupContext,
  action: Readonly<{id: string; scope: SetupActionScope; summary: string; mutate: () => Promise<void>}>,
): Promise<ReactMutationOutcome> {
  let attempted = false;
  try {
    const disposition = await context.actions.run({
      id: action.id,
      scope: action.scope,
      summary: action.summary,
      execute: async () => {
        attempted = true;
        await action.mutate();
      },
    });
    if (disposition !== "executed") {
      return disposition === "planned" ? {disposition: "planned"} : {disposition: "declined"};
    }
  } finally {
    if (attempted) {
      context.inspection.invalidate("react");
    }
  }
  return {disposition: "executed", outcome: await context.inspection.inspect("react")};
}

/**
 * Selects the manifest-derived locked versions this phase enforces.
 *
 * @param context - Active setup context carrying the manifest-derived requirements.
 * @returns The locked version policy, including the single locked Playwright version.
 * @throws When a required root requirement is absent, blank, or internally inconsistent.
 */
function lockedPackagePolicy(context: SetupContext): PackagePolicy {
  const lockedVersions = new Map<string, string>();
  for (const name of LOCKED_PACKAGES) {
    const requirement = context.requirements.packages.get(name);
    if (requirement === undefined || requirement.version.trim() === "") {
      throw new Error(`Manifest-derived package requirement '${name}' is missing.`);
    }
    lockedVersions.set(name, requirement.version);
  }

  const playwrightVersion = lockedVersions.get("@playwright/test");
  const playwrightLibraryVersion = lockedVersions.get("playwright");
  if (playwrightVersion === undefined || playwrightLibraryVersion === undefined || playwrightVersion !== playwrightLibraryVersion) {
    throw new Error("The root playwright and @playwright/test requirements must exist and use the same version.");
  }
  return {lockedVersions, playwrightVersion};
}

function comparePackageInventory(policy: PackagePolicy, inventory: Readonly<PackageInventoryFacts>): InventoryComparison {
  const absent: string[] = [];
  const defects: string[] = [];

  for (const [name, expected] of policy.lockedVersions) {
    if (inventory.malformed.includes(name)) {
      defects.push(`Installed package metadata is malformed for '${name}'.`);
      continue;
    }
    const installed = inventory.installed[name];
    if (installed === undefined) {
      absent.push(name);
      continue;
    }
    if (installed.version !== expected) {
      defects.push(`Required package '${name}' expected ${expected}, but the installed inventory reported ${installed.version}.`);
    }
  }

  if (inventory.malformed.includes(WORKSPACE_LINKED_PACKAGE)) {
    defects.push(`Installed package metadata is malformed for '${WORKSPACE_LINKED_PACKAGE}'.`);
  } else {
    const linked = inventory.installed[WORKSPACE_LINKED_PACKAGE];
    if (linked === undefined) {
      absent.push(WORKSPACE_LINKED_PACKAGE);
    } else if (linked.workspaceRoot !== WORKSPACE_LINKED_ROOT) {
      defects.push(
        `Required package '${WORKSPACE_LINKED_PACKAGE}' must resolve to the linked '${WORKSPACE_LINKED_ROOT}' workspace, not a published release.`,
      );
    }
  }

  return {absent, defects};
}

function requiredPackageCount(policy: PackagePolicy): number {
  return policy.lockedVersions.size + 1;
}

/**
 * Determines whether one generated-artifact issue reports absence a planned generator can repair.
 *
 * @param issue - One deterministic generated-artifact issue from the shared React facts.
 * @returns Whether the issue reports an absent artifact rather than an invalid one.
 */
function isAbsentArtifactIssue(issue: string): boolean {
  return issue.endsWith(" is missing.");
}

function chromiumEntryPresent(facts: Readonly<ReactFacts>): boolean {
  return facts.playwright.browsers.some((browser) => browser.startsWith(CHROMIUM_BROWSER_PREFIX));
}

function playwrightReadinessIssues(facts: Readonly<ReactFacts>, lockedVersion: string): readonly string[] {
  return [
    ...(facts.playwright.version === lockedVersion
      ? []
      : [
          `The installed Playwright browser inventory reports version ${facts.playwright.version ?? "none"} instead of the locked ${lockedVersion}.`,
        ]),
    ...(chromiumEntryPresent(facts) ? [] : [`The installed Playwright browser inventory has no Chromium browser entry.`]),
  ];
}

function clerkMode(key: (typeof CLERK_KEYS)[number], value: string | undefined): ClerkMode | null {
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  const prefix = key === "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" ? "pk" : "sk";
  for (const mode of ["test", "live"] as const) {
    const requiredPrefix = `${prefix}_${mode}_`;
    if (trimmed.startsWith(requiredPrefix) && trimmed.length > requiredPrefix.length) {
      return mode;
    }
  }
  return null;
}

function registerSensitiveValue(context: SetupContext, knownSecrets: string[], value: string): void {
  if (value === "") {
    return;
  }
  knownSecrets.push(value);
  context.logger.redact(value);
}

async function readEnvironment(path: string, files: FileSystem): Promise<string> {
  try {
    return await files.readText(path);
  } catch (error: unknown) {
    if (hasErrorCode(error, "ENOENT")) {
      return "";
    }
    throw new Error(`Unable to read website environment file '${path}': ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Additively prepares the secret-bearing website environment file.
 *
 * @remarks
 * The shared `"react"` environment fact deliberately never exposes configured values, so this
 * mutation policy is the one place setup reads them: Clerk mode compatibility cannot be decided
 * from key names alone. Existing content is preserved byte-for-byte, only absent setup-owned keys
 * are appended, and every observed or entered credential is registered for redaction before it can
 * reach retained output.
 *
 * Interactivity is decided from the immutable {@link SetupPhaseRuntime.environment} snapshot,
 * using the same standard-input terminal signal the injected prompt provider itself requires, so
 * a non-interactive invocation degrades instead of rejecting inside a prompt.
 *
 * @param context - Active setup context.
 * @param runtime - Invocation-scoped filesystem, environment, and clock capabilities.
 * @param knownSecrets - Mutable accumulator of values that must never reach evidence.
 * @returns Preserved, written, and degraded credential state plus the mutation disposition.
 */
async function prepareEnvironment(
  context: SetupContext,
  runtime: SetupPhaseRuntime,
  knownSecrets: string[],
): Promise<EnvironmentPreparationOutcome> {
  const original = await readEnvironment(context.paths.websiteEnvironment, runtime.files);
  const existing = parseEnvironmentFile(original);
  const additions = new Map<string, string>();
  const prompted = new Map<(typeof CLERK_KEYS)[number], string>();

  for (const [key, value] of LOCAL_DEFAULTS) {
    if (!existing.has(key)) {
      additions.set(key, value);
    }
  }

  for (const key of CLERK_KEYS) {
    const current = existing.get(key)?.trim();
    if (current !== undefined && current !== "") {
      registerSensitiveValue(context, knownSecrets, current);
    }
    if (existing.has(key) || context.options.dryRun || !runtime.environment.stdinIsTTY) {
      continue;
    }

    const answer = (
      key === "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" ? await context.prompts.text(key) : await context.prompts.secret(key)
    ).trim();
    registerSensitiveValue(context, knownSecrets, answer);
    if (answer !== "") {
      prompted.set(key, answer);
    }
  }

  const candidateValues = new Map<(typeof CLERK_KEYS)[number], string>();
  for (const key of CLERK_KEYS) {
    const existingValue = existing.get(key);
    if (existingValue !== undefined) {
      candidateValues.set(key, existingValue);
      continue;
    }
    const promptedValue = prompted.get(key);
    if (promptedValue !== undefined) {
      candidateValues.set(key, promptedValue);
    }
  }

  const publishableMode = clerkMode("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", candidateValues.get("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"));
  const secretMode = clerkMode("CLERK_SECRET_KEY", candidateValues.get("CLERK_SECRET_KEY"));
  const modesMismatch = publishableMode !== null && secretMode !== null && publishableMode !== secretMode;
  const missingExternalKeys = CLERK_KEYS.filter((key) => {
    const mode = clerkMode(key, candidateValues.get(key));
    return mode === null || modesMismatch;
  });

  for (const key of CLERK_KEYS) {
    const value = prompted.get(key);
    if (value !== undefined && clerkMode(key, value) !== null && !modesMismatch) {
      additions.set(key, value);
    }
  }

  const nextContent = appendMissingEnvironmentValues(original, additions);
  let actionDisposition: SetupActionDisposition | undefined;
  let refreshed: InspectionOutcome<ReactFacts> | undefined;
  if (nextContent !== original) {
    const mutation = await runReactMutation(context, {
      id: ENVIRONMENT_WRITE_ACTION,
      scope: "repository",
      summary: "Append missing setup-owned website environment keys.",
      mutate: async () => {
        await runtime.files.writeTextAtomic(context.paths.websiteEnvironment, nextContent, {mode: ENVIRONMENT_FILE_MODE});
        if (runtime.environment.platform !== "win32") {
          await runtime.files.setMode(context.paths.websiteEnvironment, ENVIRONMENT_FILE_MODE);
        }
      },
    });
    if (mutation.disposition === "declined") {
      throw new Error(`Required action '${ENVIRONMENT_WRITE_ACTION}' was declined.`);
    }
    actionDisposition = mutation.disposition;
    if (mutation.disposition === "executed") {
      refreshed = mutation.outcome;
    }
  }

  return {
    status: missingExternalKeys.length === 0 ? "complete" : "degraded",
    preservedKeys: SETUP_OWNED_KEYS.filter((key) => existing.has(key)),
    writtenKeys: SETUP_OWNED_KEYS.filter((key) => additions.has(key)),
    missingExternalKeys,
    ...(actionDisposition === undefined ? {} : {actionDisposition}),
    ...(refreshed === undefined ? {} : {refreshed}),
  };
}

/**
 * Additively prepares the website environment over the invocation-scoped capabilities.
 *
 * @remarks
 * The secret-bearing `.env` policy stays business logic here; every boundary it needs — the atomic
 * filesystem, the host platform, and the terminal snapshot — comes from the setup phase runtime.
 *
 * @param context - Active setup context.
 * @returns Preserved, written, and degraded credential state.
 * @throws When the context carries no invocation-scoped setup phase runtime.
 */
export function prepareWebsiteEnvironment(context: SetupContext): Promise<EnvironmentPreparationResult> {
  return prepareEnvironment(context, requireSetupPhaseRuntime(context), []);
}

/**
 * Probes and, with consent, installs the Linux host libraries Playwright Chromium requires.
 *
 * @remarks
 * Retained as setup-owned behavior because the shared frontend fact contract deliberately models
 * only the installed browser inventory, never host system libraries. This action therefore never
 * invalidates the shared `"react"` fact: it cannot change any observation that fact carries.
 *
 * @param context - Active setup context.
 * @param runtime - Invocation-scoped capabilities the probe and installation run through.
 * @param evidence - Mutable accumulator of human-readable phase evidence.
 * @param plannedActions - Mutable accumulator of dry-run-planned action identifiers.
 * @throws When the probe is inconclusive, the required action is declined, or the install fails.
 */
async function ensureLinuxDependencies(
  context: SetupContext,
  runtime: SetupPhaseRuntime,
  evidence: string[],
  plannedActions: string[],
): Promise<void> {
  const initialProbe = await runtime.runner.run(SYSTEM_DEPENDENCIES_PROBE, {cwd: context.paths.root});
  if (!transportCompleted(initialProbe)) {
    throw new Error(["Playwright Linux dependency probe was inconclusive.", ...commandFailureEvidence(initialProbe)].join("\n"));
  }
  if (isSuccessfulOutcome(initialProbe)) {
    evidence.push("Playwright Chromium Linux system dependencies are ready.");
    return;
  }

  const disposition = await context.actions.run({
    id: SYSTEM_DEPENDENCIES_ACTION,
    scope: "system",
    summary: "Install Playwright Chromium Linux system dependencies.",
    execute: async () => {
      const installation = await runtime.runner.run(SYSTEM_DEPENDENCIES_INSTALL, {
        cwd: context.paths.root,
        output: "tee",
        logger: context.logger,
        timeoutMs: LONG_RUNNING_MUTATION_TIMEOUT_MS,
      });
      if (!isSuccessfulOutcome(installation)) {
        throw new Error(["Playwright Linux dependency installation failed.", ...commandFailureEvidence(installation)].join("\n"));
      }
    },
  });
  if (disposition === "declined") {
    throw new Error(`Required action '${SYSTEM_DEPENDENCIES_ACTION}' was declined after the dependency probe failed.`);
  }
  if (disposition === "planned") {
    plannedActions.push(SYSTEM_DEPENDENCIES_ACTION);
    evidence.push(`Planned action: ${SYSTEM_DEPENDENCIES_ACTION}`);
    return;
  }

  const verifiedProbe = await runtime.runner.run(SYSTEM_DEPENDENCIES_PROBE, {cwd: context.paths.root});
  if (!isSuccessfulOutcome(verifiedProbe)) {
    throw new Error(
      ["Playwright Linux dependencies remain unavailable after installation.", ...commandFailureEvidence(verifiedProbe)].join("\n"),
    );
  }
  evidence.push(`Executed and verified action: ${SYSTEM_DEPENDENCIES_ACTION}`);
}

/**
 * Ensures the locked Playwright Chromium browser is installed, verified from refreshed facts.
 *
 * @param context - Active setup context.
 * @param runtime - Invocation-scoped capabilities, including the host-platform snapshot.
 * @param lockedVersion - Manifest-derived locked Playwright version.
 * @param facts - The newest verified `react` facts.
 * @param evidence - Mutable accumulator of human-readable phase evidence.
 * @param plannedActions - Mutable accumulator of dry-run-planned action identifiers.
 * @returns Either a terminal phase result, or the facts to continue with.
 */
async function preparePlaywright(
  context: SetupContext,
  runtime: SetupPhaseRuntime,
  lockedVersion: string,
  facts: Readonly<ReactFacts>,
  evidence: string[],
  plannedActions: string[],
): Promise<ReactStepOutcome> {
  const readinessIssues = playwrightReadinessIssues(facts, lockedVersion);

  if (runtime.environment.platform === "linux") {
    await ensureLinuxDependencies(context, runtime, evidence, plannedActions);
  }

  if (readinessIssues.length === 0) {
    evidence.push(`Playwright Chromium is installed for locked version ${lockedVersion}.`);
    return {facts};
  }
  evidence.push(...readinessIssues);

  const mutation = await runReactMutation(context, {
    id: BROWSER_INSTALL_ACTION,
    scope: "repository",
    summary: "Install the locked Playwright Chromium browser.",
    mutate: async () => {
      const installation = await runtime.runner.run(BROWSER_INSTALL_COMMAND, {
        cwd: context.paths.root,
        output: "tee",
        logger: context.logger,
        timeoutMs: LONG_RUNNING_MUTATION_TIMEOUT_MS,
      });
      if (!isSuccessfulOutcome(installation)) {
        throw new Error(["Playwright Chromium installation failed.", ...commandFailureEvidence(installation)].join("\n"));
      }
    },
  });
  if (mutation.disposition === "declined") {
    return {
      result: failedResult(
        "Required Playwright Chromium installation was declined.",
        [...evidence, `Declined action: ${BROWSER_INSTALL_ACTION}`],
        [`Allow required action '${BROWSER_INSTALL_ACTION}', then rerun setup.`],
      ),
    };
  }
  if (mutation.disposition === "planned") {
    plannedActions.push(BROWSER_INSTALL_ACTION);
    evidence.push(`Planned action: ${BROWSER_INSTALL_ACTION}`);
    return {facts};
  }

  // A successful installation command is never sufficient proof of readiness: Chromium is only
  // ready once refreshed, invalidated facts report the locked version and a Chromium entry.
  const refreshed = mutation.outcome;
  if (refreshed.kind !== "available") {
    return {
      result: failedResult(
        "The Playwright browser inventory could not be verified after installation.",
        [...evidence, `Failed postcondition for action: ${BROWSER_INSTALL_ACTION}`, ...outcomeEvidence(refreshed)],
        [`Resolve and rerun required action '${BROWSER_INSTALL_ACTION}'.`],
      ),
    };
  }
  const remainingIssues = playwrightReadinessIssues(refreshed.value, lockedVersion);
  if (remainingIssues.length > 0) {
    return {
      result: failedResult(
        "The locked Playwright Chromium browser remains unavailable after installation.",
        [...evidence, `Failed postcondition for action: ${BROWSER_INSTALL_ACTION}`, ...remainingIssues],
        [`Resolve and rerun required action '${BROWSER_INSTALL_ACTION}'.`],
      ),
    };
  }
  evidence.push(`Executed and verified action: ${BROWSER_INSTALL_ACTION}`);
  return {facts: refreshed.value};
}

/**
 * Plans, but never verifies, React postconditions when the shared inventory proves a fresh checkout.
 *
 * @remarks
 * Reached only when the available shared inventory reports every required package absent and the
 * `"react"` fact is `"unavailable"` during a dry-run: the already-planned
 * `workspace.root-dependencies` action is what creates the missing state, and no repository
 * mutation happens on this path. An `"invalid"` React fact is a defect, never a deferral.
 *
 * @param context - Active setup context.
 * @param runtime - Invocation-scoped filesystem, environment, and clock capabilities.
 * @param knownSecrets - Mutable accumulator of values that must never reach evidence.
 * @param evidence - Mutable accumulator of human-readable phase evidence.
 * @returns The deferred, dry-run-only phase result.
 */
async function planFreshCheckoutDryRun(
  context: SetupContext,
  runtime: SetupPhaseRuntime,
  knownSecrets: string[],
  evidence: string[],
): Promise<SetupPhaseResult> {
  const environment = await prepareEnvironment(context, runtime, knownSecrets);
  const browser = await runReactMutation(context, {
    id: BROWSER_INSTALL_ACTION,
    scope: "repository",
    summary: "Install the locked Playwright Chromium browser after root dependencies are restored.",
    mutate: async () => {
      throw new Error("A fresh-checkout dry-run must not execute deferred Playwright installation.");
    },
  });
  if (browser.disposition === "declined") {
    throw new Error(`Required action '${BROWSER_INSTALL_ACTION}' was declined.`);
  }

  evidence.push(
    `Deferred every shared React package, workspace link, generated artifact, and Playwright postcondition to the planned ${ROOT_DEPENDENCIES_ACTION} action.`,
  );
  if (environment.actionDisposition === "planned") {
    evidence.push(`Planned action: ${ENVIRONMENT_WRITE_ACTION}`);
  }
  if (browser.disposition === "planned") {
    evidence.push(`Planned action: ${BROWSER_INSTALL_ACTION}`);
  }
  if (environment.missingExternalKeys.length > 0) {
    evidence.push(`Missing or invalid external keys: ${environment.missingExternalKeys.join(", ")}.`);
  }
  return {
    id: "react",
    status: "skipped",
    summary: "React package and Playwright postconditions are deferred by fresh-checkout dry-run.",
    evidence,
    nextActions: [],
    durationMs: 0,
  };
}

/**
 * Verifies the environment write postcondition against refreshed, invalidated facts.
 *
 * @param environment - Completed environment preparation outcome.
 * @param evidence - Mutable accumulator of human-readable phase evidence.
 * @returns Either a terminal phase result, or the refreshed facts to continue with.
 */
function verifyEnvironmentWrite(environment: EnvironmentPreparationOutcome, evidence: string[]): ReactStepOutcome | null {
  if (environment.actionDisposition !== "executed") {
    return null;
  }
  const refreshed = environment.refreshed;
  if (refreshed === undefined || refreshed.kind !== "available") {
    return {
      result: failedResult(
        "The website environment could not be verified after the setup-owned write.",
        [
          ...evidence,
          `Failed postcondition for action: ${ENVIRONMENT_WRITE_ACTION}`,
          ...(refreshed === undefined ? [] : outcomeEvidence(refreshed)),
        ],
        [`Resolve and rerun required action '${ENVIRONMENT_WRITE_ACTION}'.`],
      ),
    };
  }

  const absentKeys = environment.writtenKeys.filter((key) => !refreshed.value.environment.presentKeys.includes(key));
  const problems = [
    ...(absentKeys.length === 0 ? [] : [`Written setup-owned environment key(s) remain absent: ${absentKeys.join(", ")}.`]),
    ...refreshed.value.environment.syntaxErrors,
  ];
  if (problems.length > 0) {
    return {
      result: failedResult(
        "The website environment write did not satisfy its postcondition.",
        [...evidence, `Failed postcondition for action: ${ENVIRONMENT_WRITE_ACTION}`, ...problems],
        [`Resolve and rerun required action '${ENVIRONMENT_WRITE_ACTION}'.`],
      ),
    };
  }
  evidence.push(`Executed and verified action: ${ENVIRONMENT_WRITE_ACTION}`);
  return {facts: refreshed.value};
}

async function runReactSetup(context: SetupContext): Promise<SetupPhaseResult> {
  const runtime = requireSetupPhaseRuntime(context);
  const startedAt = runtime.clock.monotonicNow();
  const evidence: string[] = [];
  const knownSecrets: string[] = [];
  const plannedActions: string[] = [];

  try {
    const policy = lockedPackagePolicy(context);

    const packagesOutcome = await context.inspection.inspect("packages");
    if (packagesOutcome.kind !== "available") {
      return phaseResult(
        runtime,
        startedAt,
        failedResult("The shared installed-package inventory could not be inspected.", [...evidence, ...outcomeEvidence(packagesOutcome)]),
      );
    }
    const comparison = comparePackageInventory(policy, packagesOutcome.value);
    const freshCheckout = context.options.dryRun && comparison.absent.length === requiredPackageCount(policy);

    const reactOutcome = await context.inspection.inspect("react");
    if (reactOutcome.kind !== "available") {
      if (freshCheckout && reactOutcome.kind === "unavailable") {
        return phaseResult(runtime, startedAt, await planFreshCheckoutDryRun(context, runtime, knownSecrets, evidence));
      }
      return phaseResult(
        runtime,
        startedAt,
        failedResult("The shared React workspace facts could not be inspected.", [...evidence, ...outcomeEvidence(reactOutcome)]),
      );
    }
    let facts = reactOutcome.value;

    if (comparison.defects.length > 0) {
      return phaseResult(
        runtime,
        startedAt,
        failedResult("The installed React workspace packages do not satisfy their locked requirements.", [
          ...evidence,
          ...comparison.defects,
        ]),
      );
    }
    const deferredPackages = comparison.absent.length > 0;
    if (deferredPackages) {
      if (!context.options.dryRun) {
        return phaseResult(
          runtime,
          startedAt,
          failedResult(
            "Required React workspace packages are not installed.",
            [...evidence, `Absent required package(s): ${comparison.absent.join(", ")}.`],
            [`Complete ${ROOT_DEPENDENCIES_ACTION}, then rerun setup.`],
          ),
        );
      }
      evidence.push(
        `Deferred absent required package(s) and the ${WORKSPACE_LINKED_PACKAGE} workspace link to the planned ${ROOT_DEPENDENCIES_ACTION} action: ${comparison.absent.join(", ")}.`,
      );
    } else {
      if (facts.workspaceLinkIssues.length > 0) {
        return phaseResult(
          runtime,
          startedAt,
          failedResult("The website does not consume the linked component workspace.", [...evidence, ...facts.workspaceLinkIssues]),
        );
      }
      evidence.push(
        `Verified ${requiredPackageCount(policy)} locked React workspace package(s) and the ${WORKSPACE_LINKED_PACKAGE} workspace link from shared facts.`,
      );
    }

    const contractIssues = [...facts.i18nIssues, ...facts.frameworkIssues];
    if (contractIssues.length > 0) {
      return phaseResult(
        runtime,
        startedAt,
        failedResult("The website i18n or framework configuration contracts are invalid.", [...evidence, ...contractIssues]),
      );
    }
    evidence.push("Verified the website message dictionary and framework configuration contracts.");

    const absentArtifacts = facts.artifactIssues.filter(isAbsentArtifactIssue);
    const invalidArtifacts = facts.artifactIssues.filter((issue) => !isAbsentArtifactIssue(issue));
    if (invalidArtifacts.length > 0) {
      return phaseResult(
        runtime,
        startedAt,
        failedResult("The generated website artifacts are invalid.", [...evidence, ...invalidArtifacts]),
      );
    }
    const deferredArtifacts = absentArtifacts.length > 0;
    if (deferredArtifacts) {
      if (!context.options.dryRun) {
        return phaseResult(
          runtime,
          startedAt,
          failedResult(
            "The generated website artifacts are incomplete.",
            [...evidence, ...absentArtifacts],
            [`Complete ${GENERATORS_ACTION}, then rerun setup.`],
          ),
        );
      }
      evidence.push(
        `Deferred ${absentArtifacts.length} absent generated artifact postcondition(s) to the planned ${GENERATORS_ACTION} action.`,
      );
    } else {
      evidence.push("Verified every generated website taxonomy, license, and locale artifact.");
    }

    if (facts.environment.syntaxErrors.length > 0) {
      return phaseResult(
        runtime,
        startedAt,
        failedResult("The website environment file has syntax errors.", [...evidence, ...facts.environment.syntaxErrors]),
      );
    }

    const environment = await prepareEnvironment(context, runtime, knownSecrets);
    evidence.push(
      `Preserved setup-owned environment keys: ${environment.preservedKeys.join(", ") || "none"}.`,
      `${environment.actionDisposition === "planned" ? "Planned" : "Wrote"} setup-owned environment keys: ${
        environment.writtenKeys.join(", ") || "none"
      }.`,
    );
    if (environment.actionDisposition === "planned") {
      evidence.push(`Planned action: ${ENVIRONMENT_WRITE_ACTION}`);
    }
    const environmentVerification = verifyEnvironmentWrite(environment, evidence);
    if (environmentVerification !== null) {
      if ("result" in environmentVerification) {
        return phaseResult(runtime, startedAt, environmentVerification.result);
      }
      facts = environmentVerification.facts;
    }
    if (environment.missingExternalKeys.length > 0) {
      evidence.push(`Missing or invalid external keys: ${environment.missingExternalKeys.join(", ")}.`);
    }

    const playwright = await preparePlaywright(context, runtime, policy.playwrightVersion, facts, evidence, plannedActions);
    if ("result" in playwright) {
      return phaseResult(runtime, startedAt, playwright.result);
    }

    if (plannedActions.length > 0 || environment.actionDisposition === "planned" || deferredArtifacts || deferredPackages) {
      return phaseResult(runtime, startedAt, {
        id: "react",
        status: "skipped",
        summary: "React workspace preparation actions and postconditions are planned by dry-run.",
        evidence,
        nextActions: [],
      });
    }

    if (environment.status === "degraded") {
      return phaseResult(runtime, startedAt, {
        id: "react",
        status: "degraded",
        summary: "React tooling is ready, but Clerk credentials are incomplete or invalid outside keyless local development.",
        evidence,
        nextActions: ["Provide a valid mode-compatible Clerk credential pair for CI, production, or authenticated local development."],
      });
    }

    return phaseResult(runtime, startedAt, {
      id: "react",
      status: "succeeded",
      summary: "React packages, generated artifacts, website environment, and Playwright Chromium are ready.",
      evidence,
      nextActions: [],
    });
  } catch (error: unknown) {
    if (isInterrupted(error)) {
      throw error;
    }
    return phaseResult(runtime, startedAt, {
      id: "react",
      status: "failed",
      summary: "The required React workspace preparation phase failed.",
      evidence: [...evidence, errorMessage(error, knownSecrets)],
      nextActions: [REACT_NEXT_ACTION],
    });
  }
}

/**
 * Creates the React setup phase over the invocation-scoped setup phase runtime.
 *
 * @remarks
 * The phase no longer accepts host or filesystem boundaries: the platform, the terminal snapshot,
 * the atomic filesystem, the process runner, and the clock all come from
 * {@link SetupPhaseRuntime}, so a test replaces capabilities on the runtime rather than on this
 * factory.
 *
 * @returns The required React setup phase definition.
 */
export function createReactSetupPhase(): SetupPhaseDefinition {
  return {
    id: "react",
    title: "React workspace",
    required: true,
    dependsOn: [ROOT_DEPENDENCIES_ACTION, GENERATORS_ACTION],
    run: (context) => runReactSetup(context),
  };
}

/** Required phase that prepares React workspaces, website environment, and Playwright. */
export const reactSetupPhase: SetupPhaseDefinition = createReactSetupPhase();
