/**
 * @fileoverview Dependency-free workspace bootstrap phases for repository setup.
 * @module scripts/commands/setup/phases/workspace
 *
 * @remarks
 * The four workspace phases validate the repository identity and toolchain prerequisites, validate
 * the root npm tree, restore the `.github/scripts` npm tree, and generate the checkout artifacts.
 * Each reads files through `ReadOnlyFiles`, runs commands through `Process` with the setup command
 * defaults, submits every mutation through the consent-gated `SetupActions`, and composes the
 * generation command as a silent nested {@link runGenerate} run — never a spawned sibling script.
 */

import {resolve} from "node:path";

import {Clock, Effect, type Terminal} from "effect";

import {loadRepositoryRequirements, parseVersion, satisfiesMinimum, type MinimumVersion} from "../../../common/requirements.ts";
import {getExpectedTaxonomyArtifactPaths} from "../../../common/taxonomy-artifacts.ts";
import type {NpmTreeFacts} from "../../../inspection/packages.ts";
import {Environment} from "../../../platform/Environment.ts";
import {ReadOnlyFiles} from "../../../platform/Files.ts";
import type {ProcessRequest} from "../../../platform/Process.ts";
import type {GenerateRequirements} from "../../generate/env.ts";
import {runGenerate, silently, type GenerateInput, type GenerateResult} from "../../generate/index.ts";
import {SetupActionFailed} from "../errors.ts";
import {commandFailureEvidence, phaseResult, runPhaseCommand, submitSetupAction, type PhaseCommandOutcome} from "../phase-support.ts";
import type {SetupContext, SetupPhaseDefinition, SetupPhaseResult, SetupRequirements} from "../types.ts";

const REPOSITORY_PACKAGE_NAME = "@arolariu/monorepo";
/** Exact contributor remediation for a missing, unavailable, invalid, or broken root npm tree. */
const ROOT_NPM_CI_GUIDANCE = "Run `npm ci` in the repository root, then rerun setup.";
/** Bounded timeout for the long-running lockfile restoration this module owns. */
const NPM_RESTORE_TIMEOUT_MS = 1_200_000;
const NPM_RESTORE_COMMAND: ProcessRequest = {
  command: "npm",
  args: ["ci", "--prefer-offline", "--no-audit", "--no-fund"],
};
const NX_PROJECTS_COMMAND: ProcessRequest = {
  command: "npx",
  args: ["--no-install", "nx", "show", "projects", "--json"],
};

/** The generation program the generators phase composes. */
export type WorkspaceGenerateProgram = (
  input: Readonly<GenerateInput>,
) => Effect.Effect<GenerateResult, Terminal.QuitError, GenerateRequirements>;

/** Dependencies of {@link createWorkspaceSetupPhases}. */
export interface WorkspaceSetupDependencies {
  /** Generation program; defaults to {@link runGenerate}. */
  readonly generate?: WorkspaceGenerateProgram;
}

type UnknownRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizedVersion(version: MinimumVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function validRequirement(version: MinimumVersion): boolean {
  return [version.major, version.minor, version.patch].every((part) => Number.isSafeInteger(part) && part >= 0);
}

/**
 * Reports whether a generated artifact is a regular file.
 *
 * @param path - The artifact path.
 * @returns `true` for a file, `false` when it is missing or not a file; fails with evidence on any
 * other filesystem failure.
 */
function isFile(path: string): Effect.Effect<boolean, string, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const files = yield* ReadOnlyFiles;
    return yield* files.stat(path).pipe(
      Effect.map((info) => info.type === "File"),
      Effect.catchIf(
        (error) => error.reason._tag === "NotFound",
        () => Effect.succeed(false),
      ),
      Effect.mapError((error) => `Unable to inspect generated artifact '${path}': ${error.message}`),
    );
  });
}

type RepositoryIdentityReadResult =
  {readonly status: "missing"} | {readonly status: "valid"; readonly name: string} | {readonly status: "invalid"; readonly error: string};

function readRepositoryIdentity(packageJsonPath: string): Effect.Effect<RepositoryIdentityReadResult, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const files = yield* ReadOnlyFiles;
    const read = yield* Effect.result(files.readFileString(packageJsonPath));
    if (read._tag === "Failure") {
      if (read.failure.reason._tag === "NotFound") {
        return {status: "missing"} as const;
      }
      return {
        status: "invalid",
        error: `Unable to read repository identity '${packageJsonPath}': ${read.failure.message}`,
      } as const;
    }

    try {
      const parsed: unknown = JSON.parse(read.success);
      if (!isRecord(parsed) || typeof parsed["name"] !== "string") {
        return {
          status: "invalid",
          error: `Repository identity '${packageJsonPath}' must be a JSON object with a string name.`,
        } as const;
      }
      return {status: "valid", name: parsed["name"]} as const;
    } catch (error: unknown) {
      return {
        status: "invalid",
        error: `Unable to parse repository identity '${packageJsonPath}': ${errorMessage(error)}`,
      } as const;
    }
  });
}

function hasValidGitVersionOutput(value: string): boolean {
  return /^git version (?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?=$|[.\s+-])/u.test(value.trim());
}

function inspectRuntimeVersion(
  name: "Node.js" | "npm",
  outcome: Readonly<PhaseCommandOutcome>,
  minimum: MinimumVersion,
): Readonly<{
  version: MinimumVersion | null;
  evidence: readonly string[];
  nextActions: readonly string[];
}> {
  const parsed = parseVersion(outcome.stdout);
  if (outcome.kind !== "succeeded" || parsed === null) {
    return {
      version: null,
      evidence: [
        `${name} version probe failed.`,
        ...commandFailureEvidence(outcome),
        ...(outcome.kind === "succeeded" && parsed === null
          ? [`${name} returned an unsupported version value '${outcome.stdout.trim()}'.`]
          : []),
      ],
      nextActions: [`Install a supported ${name} version manually, then rerun setup.`],
    };
  }
  if (!satisfiesMinimum(parsed, minimum)) {
    return {
      version: parsed,
      evidence: [`${name} ${normalizedVersion(parsed)} does not satisfy >=${normalizedVersion(minimum)}.`],
      nextActions: [`Install a supported ${name} version manually, then rerun setup.`],
    };
  }
  return {
    version: parsed,
    evidence: [`${name} ${outcome.stdout.trim()} satisfies >=${normalizedVersion(minimum)}.`],
    nextActions: [],
  };
}

const runPrerequisites = Effect.fn("setup.workspace.prerequisites")(function* (
  context: SetupContext,
): Effect.fn.Return<SetupPhaseResult, never, SetupRequirements> {
  const startedAt = yield* Clock.currentTimeMillis;
  const id = "workspace.prerequisites";
  const repositoryIdentity = yield* readRepositoryIdentity(context.paths.packageJson);

  if (repositoryIdentity.status === "missing") {
    return yield* phaseResult(startedAt, {
      id,
      status: "failed",
      summary: "The canonical repository path does not identify the arolariu.ro monorepository.",
      evidence: [`Repository identity file '${context.paths.packageJson}' does not exist.`],
      nextActions: ["Run setup from a checkout of the arolariu.ro monorepository."],
    });
  }
  if (repositoryIdentity.status === "invalid") {
    return yield* phaseResult(startedAt, {
      id,
      status: "failed",
      summary: "The canonical repository identity could not be validated.",
      evidence: [repositoryIdentity.error],
      nextActions: ["Correct the repository identity file or its filesystem access, then rerun setup."],
    });
  }
  if (repositoryIdentity.name !== REPOSITORY_PACKAGE_NAME) {
    return yield* phaseResult(startedAt, {
      id,
      status: "failed",
      summary: "The canonical repository path does not identify the arolariu.ro monorepository.",
      evidence: [`Expected ${context.paths.packageJson} to declare package '${REPOSITORY_PACKAGE_NAME}'.`],
      nextActions: ["Run setup from a checkout of the arolariu.ro monorepository."],
    });
  }

  const liveRequirements = yield* loadRepositoryRequirements(context.paths);
  if (liveRequirements.status === "invalid") {
    return yield* phaseResult(startedAt, {
      id,
      status: "failed",
      summary: "Manifest-derived repository requirements are invalid or contradictory.",
      evidence: liveRequirements.errors,
      nextActions: ["Correct the repository requirement sources before rerunning setup."],
    });
  }

  const runtimeRequirements = [
    context.requirements.node,
    context.requirements.npm,
    context.requirements.dotnet,
    context.requirements.python,
  ];
  if (!runtimeRequirements.every(validRequirement)) {
    return yield* phaseResult(startedAt, {
      id,
      status: "failed",
      summary: "Manifest-derived repository requirements are invalid or contradictory.",
      evidence: ["At least one normalized runtime requirement is not a non-negative semantic version."],
      nextActions: ["Correct the repository requirement sources before rerunning setup."],
    });
  }

  const environment = yield* Environment;
  const probes: readonly ProcessRequest[] = [
    {command: "git", args: ["--version"]},
    {command: "node", args: ["--version"]},
    {command: "npm", args: ["--version"]},
    // The running binary is asked for its own version through the same process capability every
    // other probe uses, so this phase never reads an ambient `process.version`.
    {command: environment.executablePath, args: ["--version"]},
  ];
  const [gitResult, nodeResult, npmResult, runningNodeResult] = yield* Effect.all(
    probes.map((probe) => runPhaseCommand(context, probe, {cwd: context.paths.root})),
    {concurrency: "unbounded"},
  );

  if (gitResult === undefined || nodeResult === undefined || npmResult === undefined || runningNodeResult === undefined) {
    return yield* phaseResult(startedAt, {
      id,
      status: "failed",
      summary: "Workspace prerequisites are not satisfied.",
      evidence: ["The workspace prerequisite probes did not all produce an outcome."],
      nextActions: ["Rerun setup; if the failure persists, inspect the reported prerequisite probes."],
    });
  }

  const evidence: string[] = [];
  const nextActions: string[] = [];
  const gitVersion = hasValidGitVersionOutput(gitResult.stdout);
  if (gitResult.kind !== "succeeded" || !gitVersion) {
    evidence.push(
      "Git version probe failed.",
      ...commandFailureEvidence(gitResult),
      ...(gitResult.kind === "succeeded" && !gitVersion ? [`Git returned malformed output '${gitResult.stdout.trim()}'.`] : []),
    );
    nextActions.push("Install Git manually and ensure it is available on PATH, then rerun setup.");
  } else {
    evidence.push(gitResult.stdout.trim());
  }

  const nodeInspection = inspectRuntimeVersion("Node.js", nodeResult, context.requirements.node);
  evidence.push(...nodeInspection.evidence);
  nextActions.push(...nodeInspection.nextActions);

  const npmInspection = inspectRuntimeVersion("npm", npmResult, context.requirements.npm);
  evidence.push(...npmInspection.evidence);
  nextActions.push(...npmInspection.nextActions);

  const runningNodeVersion = runningNodeResult.kind === "succeeded" ? parseVersion(runningNodeResult.stdout) : null;
  if (
    nodeInspection.version !== null
    && (runningNodeVersion === null || normalizedVersion(nodeInspection.version) !== normalizedVersion(runningNodeVersion))
  ) {
    const reported = runningNodeVersion === null ? "no usable version" : normalizedVersion(runningNodeVersion);
    evidence.push(
      `node --version reported ${normalizedVersion(nodeInspection.version)}, but the running Node.js runtime `
        + `'${environment.executablePath}' reported ${reported}.`,
    );
    nextActions.push("Run setup with the same supported Node.js executable resolved by the node command.");
  }

  if (nextActions.length > 0) {
    return yield* phaseResult(startedAt, {
      id,
      status: "failed",
      summary: "Workspace prerequisites are not satisfied.",
      evidence,
      nextActions,
    });
  }

  return yield* phaseResult(startedAt, {
    id,
    status: "succeeded",
    summary: "Repository identity, Git, Node.js, and npm prerequisites are valid.",
    evidence,
    nextActions: [],
  });
});

/**
 * Converts bounded npm dependency-problem facts into concise, safe setup evidence.
 *
 * @param facts - Session-inspected npm tree facts for one lock domain.
 * @returns At least one non-empty evidence line; never raw npm stdout/stderr.
 */
function npmProblemEvidence(facts: Readonly<NpmTreeFacts>): readonly string[] {
  const details = facts.problems.map((problem) => problem.detail);
  return details.length > 0 ? details : ["npm dependency inspection reported a failure without additional detail."];
}

/**
 * Validates the root workspace npm tree from the shared inspection session.
 *
 * @remarks
 * This phase is validation-only: contributors are expected to have already run `npm install` or
 * `npm ci` before setup. It consumes `"npm.root"` exactly once, registers no setup action, and
 * never executes `npm ci` itself.
 */
const runRootDependencies = Effect.fn("setup.workspace.root-dependencies")(function* (
  context: SetupContext,
): Effect.fn.Return<SetupPhaseResult, never, SetupRequirements> {
  const startedAt = yield* Clock.currentTimeMillis;
  const id = "workspace.root-dependencies";
  const outcome = yield* context.inspection.inspect("npm.root");

  if (outcome.kind === "unavailable") {
    return yield* phaseResult(startedAt, {
      id,
      status: "failed",
      summary: "Root workspace dependencies could not be validated.",
      evidence: [outcome.reason],
      nextActions: [ROOT_NPM_CI_GUIDANCE],
    });
  }
  if (outcome.kind === "invalid") {
    return yield* phaseResult(startedAt, {
      id,
      status: "failed",
      summary: "Root workspace dependency inspection produced invalid data.",
      evidence: [...outcome.issues],
      nextActions: [ROOT_NPM_CI_GUIDANCE],
    });
  }
  if (!outcome.value.valid) {
    return yield* phaseResult(startedAt, {
      id,
      status: "failed",
      summary: "Root workspace dependencies are missing or broken.",
      evidence: npmProblemEvidence(outcome.value),
      nextActions: [ROOT_NPM_CI_GUIDANCE],
    });
  }

  return yield* phaseResult(startedAt, {
    id,
    status: "succeeded",
    summary: "Root workspace dependencies are valid.",
    evidence: [`npm reported ${outcome.value.packageCount} installed package(s) with no dependency problems.`],
    nextActions: [],
  });
});

/**
 * Restores the `.github/scripts` npm tree with the exact `npm ci` restoration command, then
 * verifies the result through the shared inspection session.
 *
 * @remarks
 * Unlike the root workspace, `.github/scripts` remains setup-owned: this phase always plans or
 * executes the exact restoration command, regardless of the tree's current state. After an
 * executed action it invalidates only `"npm.github-scripts"`, re-inspects it, and fails if the
 * refreshed facts are unavailable, invalid, or report a broken tree. An interruption while the
 * restoration runs propagates.
 */
const runGithubScriptsDependencies = Effect.fn("setup.workspace.github-scripts-dependencies")(function* (
  context: SetupContext,
): Effect.fn.Return<SetupPhaseResult, never, SetupRequirements> {
  const startedAt = yield* Clock.currentTimeMillis;
  const id = "workspace.github-scripts-dependencies";
  const actionId = `${id}.npm-ci`;

  const submitted = yield* submitSetupAction({
    id: actionId,
    scope: "repository",
    summary: "Restore .github scripts dependencies from the lockfile.",
    execute: Effect.gen(function* () {
      const restoreOutcome = yield* runPhaseCommand(context, NPM_RESTORE_COMMAND, {
        cwd: context.paths.githubScriptsRoot,
        output: "tee",
        timeoutMs: NPM_RESTORE_TIMEOUT_MS,
      });
      if (restoreOutcome.kind !== "succeeded") {
        return yield* new SetupActionFailed({
          actionId,
          message: [`npm ci failed in ${context.paths.githubScriptsRoot}.`, ...commandFailureEvidence(restoreOutcome)].join("\n"),
        });
      }
    }),
  });

  if (submitted.kind === "failed") {
    return yield* phaseResult(startedAt, {
      id,
      status: "failed",
      summary: ".github scripts dependency setup failed.",
      evidence: [submitted.message],
      nextActions: ["Resolve the reported .github scripts dependency error, then rerun setup."],
    });
  }
  if (submitted.kind === "planned") {
    return yield* phaseResult(startedAt, {
      id,
      status: "skipped",
      summary: ".github scripts dependency restoration is planned by dry-run.",
      evidence: [`Planned action: ${actionId}`],
      nextActions: [],
    });
  }
  if (submitted.kind === "declined") {
    return yield* phaseResult(startedAt, {
      id,
      status: "failed",
      summary: ".github scripts dependency restoration was declined.",
      evidence: [`Declined action: ${actionId}`],
      nextActions: ["Allow the repository-scoped dependency restoration action, then rerun setup."],
    });
  }

  yield* context.inspection.invalidate("npm.github-scripts");
  const outcome = yield* context.inspection.inspect("npm.github-scripts");

  if (outcome.kind === "unavailable") {
    return yield* phaseResult(startedAt, {
      id,
      status: "failed",
      summary: ".github scripts dependencies could not be verified after npm ci.",
      evidence: [`Executed action: ${actionId}`, outcome.reason],
      nextActions: ["Inspect the .github/scripts npm tree and rerun setup after correcting the reported problems."],
    });
  }
  if (outcome.kind === "invalid") {
    return yield* phaseResult(startedAt, {
      id,
      status: "failed",
      summary: ".github scripts dependencies could not be verified after npm ci.",
      evidence: [`Executed action: ${actionId}`, ...outcome.issues],
      nextActions: ["Inspect the .github/scripts npm tree and rerun setup after correcting the reported problems."],
    });
  }
  if (!outcome.value.valid) {
    return yield* phaseResult(startedAt, {
      id,
      status: "failed",
      summary: ".github scripts dependencies remain invalid after npm ci.",
      evidence: [`Executed action: ${actionId}`, ...npmProblemEvidence(outcome.value)],
      nextActions: ["Inspect the .github/scripts npm tree and rerun setup after correcting the reported problems."],
    });
  }

  return yield* phaseResult(startedAt, {
    id,
    status: "succeeded",
    summary: ".github scripts dependencies were restored and verified.",
    evidence: [
      `Executed action: ${actionId}`,
      `npm reported ${outcome.value.packageCount} installed package(s) with no dependency problems.`,
    ],
    nextActions: [],
  });
});

function parseNxProjects(outcome: Readonly<PhaseCommandOutcome>): readonly string[] | null {
  if (outcome.kind !== "succeeded" || outcome.stdout.trim() === "") {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(outcome.stdout);
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every((project) => typeof project === "string" && project.trim() !== "")) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Describes a generation run that a generator stopped, using its typed result instead of a
 * generic sentence.
 *
 * @remarks
 * The nested generation runs silently, so it renders nothing itself. Without the typed detail
 * below, setup would hide which generator stopped the run. Only the closed {@link GenerateResult}
 * generator names are reported, so no unbounded or unsafe child output can reach setup evidence.
 * The exit code is the one the generation command reports for a stopped run.
 *
 * @param generation - The stopped generation result.
 * @returns Evidence naming the failing generator and its bounded selection context.
 */
function describeStoppedGeneration(generation: Readonly<GenerateResult>): string {
  const {failed, completed, selected} = generation;
  return [
    "Repository artifact generation reported exit code 1.",
    failed === undefined ? "The generation command named no failing generator." : `The '${failed}' generator stopped the generation run.`,
    `Completed generators: ${completed.length === 0 ? "none" : completed.join(", ")}.`,
    `Selected generators: ${selected.join(", ")}.`,
  ].join("\n");
}

/**
 * Runs the composed generation silently and classifies its outcome for the generators action.
 *
 * @remarks
 * A run a generator stopped (`failed`) and a defect of the generation run (the legacy failed
 * nested execution) fail the action with evidence; a terminal quit interrupts setup, like a quit
 * at a setup prompt; an interruption propagates.
 *
 * @param generate - The generation program.
 * @param input - The generation selection.
 * @param actionId - The submitting action.
 * @returns The generation effect.
 */
function generateCheckoutArtifacts(
  generate: WorkspaceGenerateProgram,
  input: Readonly<GenerateInput>,
  actionId: string,
): Effect.Effect<void, SetupActionFailed, SetupRequirements> {
  return silently(generate(input)).pipe(
    Effect.catch(() => Effect.interrupt),
    Effect.catchDefect((defect) =>
      Effect.fail(new SetupActionFailed({actionId, message: ["Repository artifact generation failed.", errorMessage(defect)].join("\n")})),
    ),
    Effect.flatMap((generation) =>
      generation.failed === undefined
        ? Effect.void
        : Effect.fail(new SetupActionFailed({actionId, message: describeStoppedGeneration(generation)})),
    ),
  );
}

/**
 * Builds the generators phase: validates Nx workspace metadata, generates every required checkout
 * artifact through one silent nested generation run, and asserts the generated postconditions.
 *
 * @param generate - The generation program.
 * @returns The phase body.
 */
function makeRunGenerators(
  generate: WorkspaceGenerateProgram,
): (context: SetupContext) => Effect.Effect<SetupPhaseResult, never, SetupRequirements> {
  return Effect.fn("setup.workspace.generators")(function* (
    context: SetupContext,
  ): Effect.fn.Return<SetupPhaseResult, never, SetupRequirements> {
    const startedAt = yield* Clock.currentTimeMillis;
    const id = "workspace.generators";
    const generatorActionId = "workspace.generators.generate";
    let projectCount: number | undefined;

    const submitted = yield* submitSetupAction({
      id: generatorActionId,
      scope: "repository",
      summary: "Generate taxonomy, GraphQL, and internationalization checkout artifacts.",
      execute: Effect.gen(function* () {
        const nxOutcome = yield* runPhaseCommand(context, NX_PROJECTS_COMMAND, {cwd: context.paths.root});
        const projects = parseNxProjects(nxOutcome);
        if (projects === null) {
          return yield* new SetupActionFailed({
            actionId: generatorActionId,
            message: [
              "Nx project metadata is unavailable or malformed.",
              ...commandFailureEvidence(nxOutcome),
              ...(nxOutcome.stdout.trim() === "" ? ["Nx returned no project JSON."] : [`Nx output: ${nxOutcome.stdout.trim()}`]),
            ].join("\n"),
          });
        }
        projectCount = projects.length;

        // Exactly the pre-migration `generate /a /g /i` selection: environment generation is
        // deliberately excluded because it performs network, prompt, and local file mutations
        // setup never requested.
        yield* generateCheckoutArtifacts(
          generate,
          {verbose: context.options.verbose, env: false, i18n: true, gql: true, artifacts: true},
          generatorActionId,
        );
      }),
    });

    if (submitted.kind === "failed") {
      return yield* phaseResult(startedAt, {
        id,
        status: "failed",
        summary: "Repository artifact generation failed.",
        evidence: [submitted.message],
        nextActions: ["Correct the generator failure, then rerun setup."],
      });
    }
    if (submitted.kind === "planned") {
      return yield* phaseResult(startedAt, {
        id,
        status: "skipped",
        summary: "Repository artifact generation is planned by dry-run.",
        evidence: [`Planned action: ${generatorActionId}`],
        nextActions: [],
      });
    }
    if (submitted.kind === "declined") {
      return yield* phaseResult(startedAt, {
        id,
        status: "failed",
        summary: "Repository artifact generation was declined.",
        evidence: [`Declined action: ${generatorActionId}`],
        nextActions: ["Allow the repository-scoped generator action, then rerun setup."],
      });
    }

    if (projectCount === undefined) {
      return yield* phaseResult(startedAt, {
        id,
        status: "failed",
        summary: "Repository artifact generation completed without validated Nx metadata.",
        evidence: [`Executed action '${generatorActionId}' did not report validated Nx projects.`],
        nextActions: ["Restore the root dependency tree and correct the Nx workspace metadata before rerunning setup."],
      });
    }

    const expectedArtifacts = [
      ...getExpectedTaxonomyArtifactPaths(context.paths.root),
      resolve(context.paths.root, "scripts", "__generated__", "gql", "README.placeholder.txt"),
    ];
    const artifactChecks = yield* Effect.result(
      Effect.forEach(expectedArtifacts, (path) => Effect.map(isFile(path), (exists) => ({path, exists})), {concurrency: "unbounded"}),
    );
    if (artifactChecks._tag === "Failure") {
      return yield* phaseResult(startedAt, {
        id,
        status: "failed",
        summary: "Repository generator postconditions could not be inspected.",
        evidence: [artifactChecks.failure],
        nextActions: ["Correct filesystem access to the generated artifacts, then rerun setup."],
      });
    }
    const missingArtifacts = artifactChecks.success.filter(({exists}) => !exists).map(({path}) => path);
    if (missingArtifacts.length > 0) {
      return yield* phaseResult(startedAt, {
        id,
        status: "failed",
        summary: "Repository generators completed without every required checkout artifact.",
        evidence: missingArtifacts.map((path) => `Missing generated artifact: ${path}`),
        nextActions: ["Inspect the repository generators; do not replace the missing postcondition with a build or type-check."],
      });
    }

    return yield* phaseResult(startedAt, {
      id,
      status: "succeeded",
      summary: "Nx metadata and required generated checkout artifacts are valid.",
      evidence: [
        `Nx reported ${projectCount} project(s).`,
        `Executed action: ${generatorActionId}`,
        `Verified ${expectedArtifacts.length} generated artifact(s).`,
      ],
      nextActions: [],
    });
  });
}

/**
 * Builds the required workspace setup phases and their dependency graph.
 *
 * @param dependencies - Optional generation program; defaults to {@link runGenerate}.
 * @returns The four workspace phases, in execution order.
 */
export function createWorkspaceSetupPhases(dependencies: WorkspaceSetupDependencies = {}): readonly SetupPhaseDefinition[] {
  const generate = dependencies.generate ?? runGenerate;
  return [
    {
      id: "workspace.prerequisites",
      title: "Validate workspace prerequisites",
      required: true,
      dependsOn: [],
      run: runPrerequisites,
    },
    {
      id: "workspace.root-dependencies",
      title: "Validate root workspace dependencies",
      required: true,
      dependsOn: ["workspace.prerequisites"],
      run: runRootDependencies,
    },
    {
      id: "workspace.github-scripts-dependencies",
      title: "Restore GitHub scripts dependencies",
      required: true,
      dependsOn: ["workspace.prerequisites"],
      run: runGithubScriptsDependencies,
    },
    {
      id: "workspace.generators",
      title: "Generate checkout artifacts",
      required: true,
      dependsOn: ["workspace.root-dependencies"],
      run: makeRunGenerators(generate),
    },
  ];
}

/** Required workspace setup phases and their dependency graph. */
export const workspaceSetupPhases: readonly SetupPhaseDefinition[] = createWorkspaceSetupPhases();
