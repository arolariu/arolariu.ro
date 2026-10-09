/**
 * @fileoverview SvelteKit workspace validation and generated-state preparation.
 * @module scripts/commands/setup/phases/svelte
 *
 * @remarks
 * Every read-only SvelteKit observation (manifest, required lifecycle scripts and their Nx/Vite
 * wiring, validated `engines.node` range, configured adapter, and generated
 * `.svelte-kit/tsconfig.json` existence) is consumed exclusively through
 * `context.inspection.inspect("svelte.cv")` and `context.inspection.inspect("svelte.status")`,
 * over the one shared installed-package inventory resolved through
 * `context.inspection.inspect("packages")`. This phase never runs `npm ls`, never reads a
 * manifest, Svelte config, or Vite config, and never stats a generated path itself.
 *
 * Setup still owns the policy those observations cannot express: comparing installed package
 * versions to the manifest-derived locked requirements, and comparing each validated project Node
 * engine range to the root Node minimum.
 *
 * The single `svelte.prepare` mutation invalidates exactly `"svelte.cv"` and `"svelte.status"` in
 * a finalizer whenever it is attempted, then re-inspects both immediately after an `"executed"`
 * disposition. The shared `"packages"` fact is never invalidated: `svelte-kit sync` cannot change
 * installed package metadata. Planned and declined actions never invalidate or fabricate facts, and
 * a successful command is never treated as proof of readiness.
 *
 * The phase runs its one command through `Process` with the setup command defaults and measures its
 * duration from `Clock`. It reads no ambient Node state and owns no filesystem access of its own.
 */

import {Clock, Effect} from "effect";

import {formatVersionRequirement, parseNodeRequirement, requirementSatisfies, type MinimumVersion} from "../../../common/requirements.ts";
import type {SvelteFacts, SvelteProjectId} from "../../../inspection/frontend.ts";
import {SVELTE_INSPECTED_PACKAGE_NAMES, type PackageInventoryFacts} from "../../../inspection/packages.ts";
import type {InspectionOutcome} from "../../../inspection/types.ts";
import type {ProcessRequest} from "../../../platform/Process.ts";
import {SetupActionFailed} from "../errors.ts";
import {commandFailureEvidence, phaseResult, runPhaseCommand, submitSetupAction} from "../phase-support.ts";
import type {SetupContext, SetupPhaseDefinition, SetupPhaseResult, SetupRequirements} from "../types.ts";

/** Result of evaluating the `svelte.prepare` mutation and its immediate cache refresh. */
type SveltePrepareOutcome =
  Readonly<{disposition: "planned"}> | Readonly<{disposition: "declined"}> | Readonly<{disposition: "executed"; outcomes: ProjectOutcomes}>;

type ProjectOutcomes = Readonly<Record<SvelteProjectId, InspectionOutcome<SvelteFacts>>>;
type ProjectFacts = Readonly<Record<SvelteProjectId, SvelteFacts>>;

/** A step of the phase: fails with {@link SetupActionFailed} when the required preparation failed. */
type SvelteStep<A> = Effect.Effect<A, SetupActionFailed, SetupRequirements>;

interface InventoryComparison {
  readonly absent: readonly string[];
  readonly defects: readonly string[];
}

const PROJECT_IDS = ["cv", "status"] as const;
const PROJECT_KEYS = {cv: "svelte.cv", status: "svelte.status"} as const;
const ROOT_DEPENDENCIES_ACTION = "workspace.root-dependencies";
const PREPARE_ACTION_ID = "svelte.prepare";
/**
 * Bounded ceiling for the long-running generated-state preparation this phase owns.
 *
 * @remarks
 * Setup commands default to a probe-sized timeout, which would truncate a two-workspace
 * `svelte-kit sync`. The mutation therefore requests this ceiling explicitly.
 */
const LONG_RUNNING_MUTATION_TIMEOUT_MS = 1_200_000;
const PREPARE_COMMAND: ProcessRequest = {
  command: "npm",
  args: ["run", "prepare", "--workspace=sites/cv.arolariu.ro", "--workspace=sites/status.arolariu.ro"],
};

function normalizedVersion(version: MinimumVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function failedResult(summary: string, evidence: readonly string[], nextActions: readonly string[]): SetupPhaseResult {
  return {
    id: "svelte",
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
 * Determines whether one shared Svelte issue reports absence a planned restoration can repair.
 *
 * @param issue - One deterministic package or adapter issue from the shared project facts.
 * @returns Whether the issue reports an uninstalled package rather than a static defect.
 */
function isAbsentInstallationIssue(issue: string): boolean {
  return issue.endsWith(" is not installed.");
}

/**
 * Selects the manifest-derived locked versions this phase enforces for both projects.
 *
 * @param context - Active setup context carrying the manifest-derived requirements.
 * @returns Locked versions and every unusable root requirement.
 */
function lockedPackageVersions(context: SetupContext): Readonly<{versions: ReadonlyMap<string, string>; problems: readonly string[]}> {
  const versions = new Map<string, string>();
  const problems: string[] = [];
  for (const packageName of SVELTE_INSPECTED_PACKAGE_NAMES) {
    const requirement = context.requirements.packages.get(packageName);
    if (requirement === undefined || requirement.version.trim() === "") {
      problems.push(`Manifest-derived root requirement '${packageName}' is missing or blank.`);
      continue;
    }
    versions.set(packageName, requirement.version);
  }
  return {versions, problems};
}

function comparePackageInventory(locked: ReadonlyMap<string, string>, inventory: Readonly<PackageInventoryFacts>): InventoryComparison {
  const absent: string[] = [];
  const defects: string[] = [];
  for (const [packageName, expected] of locked) {
    if (inventory.malformed.includes(packageName)) {
      defects.push(`Installed package metadata is malformed for '${packageName}'.`);
      continue;
    }
    const installed = inventory.installed[packageName];
    if (installed === undefined) {
      absent.push(packageName);
      continue;
    }
    if (installed.version !== expected) {
      defects.push(`Required package '${packageName}' expected ${expected}, but the installed inventory reported ${installed.version}.`);
    }
  }
  return {absent, defects};
}

/**
 * Collects every setup-owned problem for one project from its shared facts.
 *
 * @param facts - The newest verified facts for one standalone SvelteKit project.
 * @param rootNode - Manifest-derived root Node minimum.
 * @param deferAbsentInstallations - Whether absent-package issues are deferred to a planned action.
 * @returns Deterministically ordered, project-prefixed problems.
 */
function projectProblems(facts: Readonly<SvelteFacts>, rootNode: MinimumVersion, deferAbsentInstallations: boolean): readonly string[] {
  const relevant = (issues: readonly string[]): readonly string[] =>
    deferAbsentInstallations ? issues.filter((issue) => !isAbsentInstallationIssue(issue)) : issues;

  const problems = [...relevant(facts.packageIssues), ...facts.scriptIssues, ...relevant(facts.adapterIssues)];

  if (facts.nodeEngine !== undefined) {
    const projectMinimum = parseNodeRequirement(facts.nodeEngine);
    if (projectMinimum === null) {
      problems.push(`package.json#engines.node uses unsupported engine syntax '${facts.nodeEngine}'.`);
    } else if (!requirementSatisfies(rootNode, projectMinimum)) {
      problems.push(
        `Root Node requirement ${formatVersionRequirement(rootNode)} does not satisfy the project requirement ${formatVersionRequirement(projectMinimum)}.`,
      );
    }
  }

  return problems.map((problem) => `${facts.id}: ${problem}`);
}

/**
 * Inspects both shared standalone SvelteKit project facts, in fixed order.
 *
 * @param context - The setup context, including the repository inspection session.
 * @returns One inspection outcome per project.
 */
function inspectProjects(context: SetupContext): Effect.Effect<ProjectOutcomes> {
  return Effect.gen(function* () {
    const cv = yield* context.inspection.inspect(PROJECT_KEYS.cv);
    const status = yield* context.inspection.inspect(PROJECT_KEYS.status);
    return {cv, status};
  });
}

function unresolvedProjectEvidence(outcomes: ProjectOutcomes): readonly string[] {
  return PROJECT_IDS.flatMap((id) => outcomeEvidence(outcomes[id]).map((line) => `${id}: ${line}`));
}

function resolvedProjectFacts(outcomes: ProjectOutcomes): ProjectFacts | null {
  const cv = outcomes.cv;
  const status = outcomes.status;
  if (cv.kind !== "available" || status.kind !== "available") {
    return null;
  }
  return {cv: cv.value, status: status.value};
}

/**
 * Runs the single policy-controlled `svelte.prepare` mutation with cache-freshness guarantees.
 *
 * @remarks
 * Both Svelte fact keys are invalidated exactly once in a finalizer whenever the mutation was
 * actually attempted, so a failed or interrupted `svelte-kit sync` can never leave a partially
 * generated workspace described by stale cached facts. A `"planned"` or `"declined"` action never
 * attempts the mutation and therefore never invalidates anything. After an `"executed"`
 * disposition both already-invalidated keys are inspected exactly once.
 *
 * @param context - The setup context, including the repository inspection session.
 * @returns The action disposition, plus both refreshed outcomes when the mutation executed; fails
 * when the action failed. An interruption propagates.
 */
function runSveltePrepare(context: SetupContext): SvelteStep<SveltePrepareOutcome> {
  return Effect.gen(function* () {
    let attempted = false;
    const submitted = yield* submitSetupAction({
      id: PREPARE_ACTION_ID,
      scope: "repository",
      summary: "Prepare generated SvelteKit workspace configuration.",
      execute: Effect.gen(function* () {
        attempted = true;
        const prepareResult = yield* runPhaseCommand(context, PREPARE_COMMAND, {
          cwd: context.paths.root,
          output: "tee",
          timeoutMs: LONG_RUNNING_MUTATION_TIMEOUT_MS,
        });
        if (prepareResult.kind !== "succeeded") {
          return yield* new SetupActionFailed({
            actionId: PREPARE_ACTION_ID,
            message: ["svelte.prepare command failed.", ...commandFailureEvidence(prepareResult)].join("\n"),
          });
        }
      }),
    }).pipe(
      Effect.ensuring(
        Effect.suspend(() => (attempted ? context.inspection.invalidate(PROJECT_KEYS.cv, PROJECT_KEYS.status) : Effect.void)),
      ),
    );

    if (submitted.kind === "failed") {
      return yield* new SetupActionFailed({actionId: PREPARE_ACTION_ID, message: submitted.message});
    }
    if (submitted.kind === "planned" || submitted.kind === "declined") {
      return {disposition: submitted.kind};
    }
    return {disposition: "executed", outcomes: yield* inspectProjects(context)};
  });
}

/**
 * Ensures both generated SvelteKit configurations exist, verified from refreshed facts.
 *
 * @param context - The setup context.
 * @param facts - The facts observed before this step.
 * @param rootNode - Manifest-derived root Node minimum.
 * @param deferAbsentInstallations - Whether absent-package issues are deferred to a planned action.
 * @param evidence - Mutable accumulator of human-readable phase evidence.
 * @returns Either a terminal phase result, or whether preparation was planned.
 */
function ensureGeneratedConfiguration(
  context: SetupContext,
  facts: ProjectFacts,
  rootNode: MinimumVersion,
  deferAbsentInstallations: boolean,
  evidence: string[],
): SvelteStep<Readonly<{result: SetupPhaseResult}> | Readonly<{planned: boolean}>> {
  return Effect.gen(function* () {
    const absentProjects = PROJECT_IDS.filter((id) => !facts[id].generatedConfigExists);
    if (absentProjects.length === 0) {
      return {planned: false};
    }

    const mutation = yield* runSveltePrepare(context);
    if (mutation.disposition === "declined") {
      return {
        result: failedResult(
          "Required SvelteKit generated-state preparation was declined.",
          [...evidence, `Declined action: ${PREPARE_ACTION_ID}`],
          [`Allow the repository-scoped ${PREPARE_ACTION_ID} action, then rerun setup.`],
        ),
      };
    }
    if (mutation.disposition === "planned") {
      evidence.push(
        `Planned action: ${PREPARE_ACTION_ID}`,
        ...absentProjects.map((id) => `${id}: the generated config remains a postcondition for ${PREPARE_ACTION_ID}.`),
      );
      return {planned: true};
    }

    // A successful `svelte-kit sync` command is never sufficient proof of readiness: both generated
    // configs, and every package/script/adapter contract, must hold in refreshed, invalidated facts.
    const refreshed = resolvedProjectFacts(mutation.outcomes);
    if (refreshed === null) {
      return {
        result: failedResult(
          "The SvelteKit workspaces could not be verified after preparation.",
          [...evidence, `Failed postcondition for action: ${PREPARE_ACTION_ID}`, ...unresolvedProjectEvidence(mutation.outcomes)],
          [`Resolve and rerun required action '${PREPARE_ACTION_ID}'.`],
        ),
      };
    }

    const problems = PROJECT_IDS.flatMap((id) => [
      ...(refreshed[id].generatedConfigExists ? [] : [`${id}: the generated config is still absent.`]),
      ...projectProblems(refreshed[id], rootNode, deferAbsentInstallations),
    ]);
    if (problems.length > 0) {
      return {
        result: failedResult(
          "SvelteKit preparation completed without every generated config postcondition.",
          [...evidence, `Failed postcondition for action: ${PREPARE_ACTION_ID}`, ...problems],
          ["Inspect the SvelteKit prepare scripts; do not replace them with a build, type-check, or test command."],
        ),
      };
    }
    evidence.push(`Executed and verified action: ${PREPARE_ACTION_ID}`);
    return {planned: false};
  });
}

/**
 * Validates and prepares both SvelteKit workspaces up to the phase result, without its duration.
 *
 * @param context - The setup context.
 * @param evidence - Mutable accumulator of human-readable phase evidence.
 * @returns The phase result (its duration is replaced); fails when the required preparation failed.
 */
function prepareSvelte(context: SetupContext, evidence: string[]): SvelteStep<Omit<SetupPhaseResult, "durationMs">> {
  return Effect.gen(function* () {
    const locked = lockedPackageVersions(context);
    if (locked.problems.length > 0) {
      return failedResult(
        "The manifest-derived Svelte package requirements are invalid.",
        [...evidence, ...locked.problems],
        ["Correct the root package requirements, then rerun setup."],
      );
    }

    const packagesOutcome = yield* context.inspection.inspect("packages");
    if (packagesOutcome.kind !== "available") {
      return failedResult(
        "The shared installed-package inventory could not be inspected.",
        [...evidence, ...outcomeEvidence(packagesOutcome)],
        ["Resolve the reported Svelte setup failure, then rerun setup."],
      );
    }

    const outcomes = yield* inspectProjects(context);
    const facts = resolvedProjectFacts(outcomes);
    if (facts === null) {
      return failedResult(
        "The shared Svelte workspace facts could not be inspected.",
        [...evidence, ...unresolvedProjectEvidence(outcomes)],
        ["Resolve the reported Svelte setup failure, then rerun setup."],
      );
    }

    const comparison = comparePackageInventory(locked.versions, packagesOutcome.value);
    if (comparison.defects.length > 0) {
      return failedResult(
        "The installed Svelte packages do not satisfy their locked requirements.",
        [...evidence, ...comparison.defects],
        ["Correct the reported Svelte workspace contracts, then rerun setup."],
      );
    }
    const deferAbsentInstallations = comparison.absent.length > 0 && context.options.dryRun;
    if (comparison.absent.length > 0 && !context.options.dryRun) {
      return failedResult(
        "Required Svelte packages are not installed.",
        [...evidence, `Absent required package(s): ${comparison.absent.join(", ")}.`],
        [`Complete ${ROOT_DEPENDENCIES_ACTION}, then rerun setup.`],
      );
    }
    evidence.push(
      deferAbsentInstallations
        ? `Deferred absent required package(s) to the planned ${ROOT_DEPENDENCIES_ACTION} action: ${comparison.absent.join(", ")}.`
        : `Verified ${locked.versions.size} locked Svelte package(s) from shared facts.`,
    );

    const problems = PROJECT_IDS.flatMap((id) => projectProblems(facts[id], context.requirements.node, deferAbsentInstallations));
    if (problems.length > 0) {
      return failedResult(
        "The required Svelte workspace contracts are invalid.",
        [...evidence, ...problems],
        ["Correct the reported Svelte workspace contracts, then rerun setup."],
      );
    }
    evidence.push(...PROJECT_IDS.map((id) => `${id}: package, script, adapter, and Node engine contracts are valid.`));

    const generated = yield* ensureGeneratedConfiguration(context, facts, context.requirements.node, deferAbsentInstallations, evidence);
    if ("result" in generated) {
      return generated.result;
    }

    if (generated.planned || deferAbsentInstallations) {
      return {
        id: "svelte",
        status: "skipped",
        summary: "Svelte workspace preparation actions and postconditions are planned by dry-run.",
        evidence,
        nextActions: [],
      };
    }

    return {
      id: "svelte",
      status: "succeeded",
      summary: "Both Svelte workspaces have valid package contracts and generated configuration.",
      evidence,
      nextActions: [],
    };
  });
}

/**
 * Runs the Svelte phase: a failed required preparation becomes one failed result naming the
 * reported failure; an interruption propagates.
 *
 * @param context - The setup context.
 * @returns The phase result.
 */
function runSvelteSetup(context: SetupContext): Effect.Effect<SetupPhaseResult, never, SetupRequirements> {
  return Effect.gen(function* () {
    const startedAt = yield* Clock.currentTimeMillis;
    const evidence: string[] = [];
    const outcome = yield* Effect.result(prepareSvelte(context, evidence));
    if (outcome._tag === "Success") {
      const {durationMs: _durationMs, ...result} = outcome.success as SetupPhaseResult;
      return yield* phaseResult(startedAt, result);
    }
    return yield* phaseResult(startedAt, {
      id: "svelte",
      status: "failed",
      summary: "The required Svelte workspace preparation phase failed.",
      evidence: [...evidence, outcome.failure.message],
      nextActions: ["Resolve the reported Svelte setup failure, then rerun setup."],
    });
  }).pipe(Effect.withSpan("setup.svelte"));
}

/**
 * Creates the Svelte setup phase over the shared repository inspection session.
 *
 * @returns The required Svelte setup phase definition.
 */
export function createSvelteSetupPhase(): SetupPhaseDefinition {
  return {
    id: "svelte",
    title: "Svelte workspaces",
    required: true,
    dependsOn: [ROOT_DEPENDENCIES_ACTION],
    run: (context) => runSvelteSetup(context),
  };
}

/** Required phase that validates and prepares both SvelteKit workspaces. */
export const svelteSetupPhase: SetupPhaseDefinition = createSvelteSetupPhase();
