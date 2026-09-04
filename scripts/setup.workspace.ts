/**
 * @fileoverview Dependency-free workspace bootstrap phases for repository setup.
 * @module scripts.setup.workspace
 *
 * @remarks
 * Every phase in this module reads its capabilities from the invocation-scoped
 * {@link SetupPhaseRuntime}: the filesystem, the phase-scoped process runner, the clock, the task
 * scheduler, the environment snapshot, and the typed nested generation invocation. No phase here
 * touches an ambient Node global, spawns a sibling script, or measures time itself.
 */

import {resolve} from "node:path";

import type {CommandExecution} from "./core/command/command-execution.ts";
import {loadRepositoryRequirements, parseVersion, satisfiesMinimum, type MinimumVersion} from "./common/requirements.ts";
import type {ProcessExecutionRequest} from "./core/process/process-execution-request.ts";
import type {ProcessExecutionResult, SucceededProcessExecutionResult} from "./core/process/process-execution-result.ts";
import {CommandCancellation, type FileSystem} from "./common/runtime.ts";
import {getExpectedTaxonomyArtifactPaths} from "./common/taxonomy-artifacts.ts";
import type {GenerateResult} from "./generate.ts";
import type {NpmTreeFacts} from "./inspection/packages.ts";
import {
  requireSetupPhaseRuntime,
  type SetupContext,
  type SetupPhaseDefinition,
  type SetupPhaseResult,
  type SetupPhaseRuntime,
} from "./setup.types.ts";

const REPOSITORY_PACKAGE_NAME = "@arolariu/monorepo";
/** Exact contributor remediation for a missing, unavailable, invalid, or broken root npm tree. */
const ROOT_NPM_CI_GUIDANCE = "Run `npm ci` in the repository root, then rerun setup.";
/** Bounded timeout for the long-running lockfile restoration this module owns. */
const NPM_RESTORE_TIMEOUT_MS = 1_200_000;
const NPM_RESTORE_COMMAND: ProcessExecutionRequest = {
  command: "npm",
  args: ["ci", "--prefer-offline", "--no-audit", "--no-fund"],
};
const NX_PROJECTS_COMMAND: ProcessExecutionRequest = {
  command: "npx",
  args: ["--no-install", "nx", "show", "projects", "--json"],
};

type UnknownRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

function isInterruption(error: unknown): boolean {
  return error instanceof CommandCancellation || (error instanceof Error && error.name === "AbortError");
}

function isSuccessfulOutcome(outcome: Readonly<ProcessExecutionResult>): outcome is SucceededProcessExecutionResult {
  return outcome.kind === "succeeded";
}

/**
 * Renders one failed process outcome as concise, secret-free setup evidence.
 *
 * @param outcome - Completed process outcome.
 * @returns Evidence lines naming the transport failure and any captured output.
 */
function commandFailureEvidence(outcome: Readonly<ProcessExecutionResult>): readonly string[] {
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

function result(runtime: SetupPhaseRuntime, startedAt: number, input: Omit<SetupPhaseResult, "durationMs">): SetupPhaseResult {
  return {
    ...input,
    durationMs: Math.max(0, runtime.clock.monotonicNow() - startedAt),
  };
}

function normalizedVersion(version: MinimumVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function validRequirement(version: MinimumVersion): boolean {
  return [version.major, version.minor, version.patch].every((part) => Number.isSafeInteger(part) && part >= 0);
}

async function isFile(path: string, files: FileSystem): Promise<boolean> {
  try {
    return (await files.inspect(path)).kind === "file";
  } catch (error: unknown) {
    throw new Error(`Unable to inspect generated artifact '${path}': ${errorMessage(error)}`);
  }
}

type RepositoryIdentityReadResult =
  {readonly status: "missing"} | {readonly status: "valid"; readonly name: string} | {readonly status: "invalid"; readonly error: string};

async function readRepositoryIdentity(packageJsonPath: string, files: FileSystem): Promise<RepositoryIdentityReadResult> {
  let contents: string;
  try {
    contents = await files.readText(packageJsonPath);
  } catch (error: unknown) {
    if (hasErrorCode(error, "ENOENT")) {
      return {status: "missing"};
    }
    return {
      status: "invalid",
      error: `Unable to read repository identity '${packageJsonPath}': ${errorMessage(error)}`,
    };
  }

  try {
    const parsed: unknown = JSON.parse(contents);
    if (!isRecord(parsed) || typeof parsed["name"] !== "string") {
      return {
        status: "invalid",
        error: `Repository identity '${packageJsonPath}' must be a JSON object with a string name.`,
      };
    }
    return {status: "valid", name: parsed["name"]};
  } catch (error: unknown) {
    return {
      status: "invalid",
      error: `Unable to parse repository identity '${packageJsonPath}': ${errorMessage(error)}`,
    };
  }
}

function hasValidGitVersionOutput(value: string): boolean {
  return /^git version (?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?=$|[.\s+-])/u.test(value.trim());
}

function inspectRuntimeVersion(
  name: "Node.js" | "npm",
  outcome: Readonly<ProcessExecutionResult>,
  minimum: MinimumVersion,
): Readonly<{
  version: MinimumVersion | null;
  evidence: readonly string[];
  nextActions: readonly string[];
}> {
  const parsed = parseVersion(outcome.stdout);
  if (!isSuccessfulOutcome(outcome) || parsed === null) {
    return {
      version: null,
      evidence: [
        `${name} version probe failed.`,
        ...commandFailureEvidence(outcome),
        ...(isSuccessfulOutcome(outcome) && parsed === null
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

async function runPrerequisites(context: SetupContext): Promise<SetupPhaseResult> {
  const runtime = requireSetupPhaseRuntime(context);
  const startedAt = runtime.clock.monotonicNow();
  const id = "workspace.prerequisites";
  const repositoryIdentity = await readRepositoryIdentity(context.paths.packageJson, runtime.files);

  if (repositoryIdentity.status === "missing") {
    return result(runtime, startedAt, {
      id,
      status: "failed",
      summary: "The canonical repository path does not identify the arolariu.ro monorepository.",
      evidence: [`Repository identity file '${context.paths.packageJson}' does not exist.`],
      nextActions: ["Run setup from a checkout of the arolariu.ro monorepository."],
    });
  }
  if (repositoryIdentity.status === "invalid") {
    return result(runtime, startedAt, {
      id,
      status: "failed",
      summary: "The canonical repository identity could not be validated.",
      evidence: [repositoryIdentity.error],
      nextActions: ["Correct the repository identity file or its filesystem access, then rerun setup."],
    });
  }
  if (repositoryIdentity.name !== REPOSITORY_PACKAGE_NAME) {
    return result(runtime, startedAt, {
      id,
      status: "failed",
      summary: "The canonical repository path does not identify the arolariu.ro monorepository.",
      evidence: [`Expected ${context.paths.packageJson} to declare package '${REPOSITORY_PACKAGE_NAME}'.`],
      nextActions: ["Run setup from a checkout of the arolariu.ro monorepository."],
    });
  }

  const liveRequirements = await loadRepositoryRequirements(context.paths, {files: runtime.files, tasks: runtime.tasks});
  if (liveRequirements.status === "invalid") {
    return result(runtime, startedAt, {
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
    return result(runtime, startedAt, {
      id,
      status: "failed",
      summary: "Manifest-derived repository requirements are invalid or contradictory.",
      evidence: ["At least one normalized runtime requirement is not a non-negative semantic version."],
      nextActions: ["Correct the repository requirement sources before rerunning setup."],
    });
  }

  const probes: readonly ProcessExecutionRequest[] = [
    {command: "git", args: ["--version"]},
    {command: "node", args: ["--version"]},
    {command: "npm", args: ["--version"]},
    // The running binary is asked for its own version through the same runtime capability every
    // other probe uses, so this phase never reads an ambient `process.version`.
    {command: runtime.environment.executablePath, args: ["--version"]},
  ];
  const [gitResult, nodeResult, npmResult, runningNodeResult] = await runtime.tasks.parallel(
    probes.map((probe) => () => runtime.runner.run(probe, {cwd: context.paths.root})),
  );

  if (gitResult === undefined || nodeResult === undefined || npmResult === undefined || runningNodeResult === undefined) {
    return result(runtime, startedAt, {
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
  if (!isSuccessfulOutcome(gitResult) || !gitVersion) {
    evidence.push(
      "Git version probe failed.",
      ...commandFailureEvidence(gitResult),
      ...(isSuccessfulOutcome(gitResult) && !gitVersion ? [`Git returned malformed output '${gitResult.stdout.trim()}'.`] : []),
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

  const runningNodeVersion = isSuccessfulOutcome(runningNodeResult) ? parseVersion(runningNodeResult.stdout) : null;
  if (
    nodeInspection.version !== null
    && (runningNodeVersion === null || normalizedVersion(nodeInspection.version) !== normalizedVersion(runningNodeVersion))
  ) {
    const reported = runningNodeVersion === null ? "no usable version" : normalizedVersion(runningNodeVersion);
    evidence.push(
      `node --version reported ${normalizedVersion(nodeInspection.version)}, but the running Node.js runtime `
        + `'${runtime.environment.executablePath}' reported ${reported}.`,
    );
    nextActions.push("Run setup with the same supported Node.js executable resolved by the node command.");
  }

  if (nextActions.length > 0) {
    return result(runtime, startedAt, {
      id,
      status: "failed",
      summary: "Workspace prerequisites are not satisfied.",
      evidence,
      nextActions,
    });
  }

  return result(runtime, startedAt, {
    id,
    status: "succeeded",
    summary: "Repository identity, Git, Node.js, and npm prerequisites are valid.",
    evidence,
    nextActions: [],
  });
}

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
 *
 * @param context - Shared setup dependencies, including the repository inspection session.
 * @returns The completed phase result.
 */
async function runRootDependencies(context: SetupContext): Promise<SetupPhaseResult> {
  const runtime = requireSetupPhaseRuntime(context);
  const startedAt = runtime.clock.monotonicNow();
  const id = "workspace.root-dependencies";
  const outcome = await context.inspection.inspect("npm.root");

  if (outcome.kind === "unavailable") {
    return result(runtime, startedAt, {
      id,
      status: "failed",
      summary: "Root workspace dependencies could not be validated.",
      evidence: [outcome.reason],
      nextActions: [ROOT_NPM_CI_GUIDANCE],
    });
  }
  if (outcome.kind === "invalid") {
    return result(runtime, startedAt, {
      id,
      status: "failed",
      summary: "Root workspace dependency inspection produced invalid data.",
      evidence: [...outcome.issues],
      nextActions: [ROOT_NPM_CI_GUIDANCE],
    });
  }
  if (!outcome.value.valid) {
    return result(runtime, startedAt, {
      id,
      status: "failed",
      summary: "Root workspace dependencies are missing or broken.",
      evidence: npmProblemEvidence(outcome.value),
      nextActions: [ROOT_NPM_CI_GUIDANCE],
    });
  }

  return result(runtime, startedAt, {
    id,
    status: "succeeded",
    summary: "Root workspace dependencies are valid.",
    evidence: [`npm reported ${outcome.value.packageCount} installed package(s) with no dependency problems.`],
    nextActions: [],
  });
}

/**
 * Restores the `.github/scripts` npm tree with the exact `npm ci` restoration command, then
 * verifies the result through the shared inspection session.
 *
 * @remarks
 * Unlike the root workspace, `.github/scripts` remains setup-owned: this phase always plans or
 * executes the exact restoration command, regardless of the tree's current state. After an
 * executed action it invalidates only `"npm.github-scripts"`, re-inspects it, and fails if the
 * refreshed facts are unavailable, invalid, or report a broken tree.
 *
 * @param context - Shared setup dependencies, including the repository inspection session.
 * @returns The completed phase result.
 * @throws When the invocation was interrupted while the restoration ran.
 */
async function runGithubScriptsDependencies(context: SetupContext): Promise<SetupPhaseResult> {
  const runtime = requireSetupPhaseRuntime(context);
  const startedAt = runtime.clock.monotonicNow();
  const id = "workspace.github-scripts-dependencies";
  const actionId = `${id}.npm-ci`;

  try {
    const disposition = await context.actions.run({
      id: actionId,
      scope: "repository",
      summary: "Restore .github scripts dependencies from the lockfile.",
      execute: async () => {
        const restoreOutcome = await runtime.runner.run(NPM_RESTORE_COMMAND, {
          cwd: context.paths.githubScriptsRoot,
          output: "tee",
          timeoutMs: NPM_RESTORE_TIMEOUT_MS,
        });
        if (!isSuccessfulOutcome(restoreOutcome)) {
          throw new Error(
            [`npm ci failed in ${context.paths.githubScriptsRoot}.`, ...commandFailureEvidence(restoreOutcome)].join("\n"),
          );
        }
      },
    });

    if (disposition === "planned") {
      return result(runtime, startedAt, {
        id,
        status: "skipped",
        summary: ".github scripts dependency restoration is planned by dry-run.",
        evidence: [`Planned action: ${actionId}`],
        nextActions: [],
      });
    }
    if (disposition === "declined") {
      return result(runtime, startedAt, {
        id,
        status: "failed",
        summary: ".github scripts dependency restoration was declined.",
        evidence: [`Declined action: ${actionId}`],
        nextActions: ["Allow the repository-scoped dependency restoration action, then rerun setup."],
      });
    }

    context.inspection.invalidate("npm.github-scripts");
    const outcome = await context.inspection.inspect("npm.github-scripts");

    if (outcome.kind === "unavailable") {
      return result(runtime, startedAt, {
        id,
        status: "failed",
        summary: ".github scripts dependencies could not be verified after npm ci.",
        evidence: [`Executed action: ${actionId}`, outcome.reason],
        nextActions: ["Inspect the .github/scripts npm tree and rerun setup after correcting the reported problems."],
      });
    }
    if (outcome.kind === "invalid") {
      return result(runtime, startedAt, {
        id,
        status: "failed",
        summary: ".github scripts dependencies could not be verified after npm ci.",
        evidence: [`Executed action: ${actionId}`, ...outcome.issues],
        nextActions: ["Inspect the .github/scripts npm tree and rerun setup after correcting the reported problems."],
      });
    }
    if (!outcome.value.valid) {
      return result(runtime, startedAt, {
        id,
        status: "failed",
        summary: ".github scripts dependencies remain invalid after npm ci.",
        evidence: [`Executed action: ${actionId}`, ...npmProblemEvidence(outcome.value)],
        nextActions: ["Inspect the .github/scripts npm tree and rerun setup after correcting the reported problems."],
      });
    }

    return result(runtime, startedAt, {
      id,
      status: "succeeded",
      summary: ".github scripts dependencies were restored and verified.",
      evidence: [
        `Executed action: ${actionId}`,
        `npm reported ${outcome.value.packageCount} installed package(s) with no dependency problems.`,
      ],
      nextActions: [],
    });
  } catch (error: unknown) {
    if (isInterruption(error)) {
      throw error;
    }
    return result(runtime, startedAt, {
      id,
      status: "failed",
      summary: ".github scripts dependency setup failed.",
      evidence: [errorMessage(error)],
      nextActions: ["Resolve the reported .github scripts dependency error, then rerun setup."],
    });
  }
}

function parseNxProjects(outcome: Readonly<ProcessExecutionResult>): readonly string[] | null {
  if (!isSuccessfulOutcome(outcome) || outcome.stdout.trim() === "") {
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
 * Converts one cancelled nested generation back into the typed cancellation the setup lifecycle
 * maps to the caller's `130`/`143` exit contract.
 *
 * @param execution - Cancelled child execution.
 * @returns The cancellation to rethrow.
 */
function toCancellation(execution: Extract<CommandExecution<GenerateResult>, {status: "cancelled"}>): CommandCancellation {
  const {cause} = execution.failure;
  return cause instanceof CommandCancellation ? cause : new CommandCancellation(execution.failure.message, execution.exitCode);
}

/**
 * Describes a completed generation that ended with a nonzero exit code, using the child's typed
 * result instead of a generic sentence.
 *
 * @remarks
 * The nested generation runs with silent presentation, so it renders nothing itself. Without the
 * typed detail below, setup would hide which generator stopped the run. Only the closed
 * {@link GenerateResult} generator names are reported, so no unbounded or unsafe child output can
 * reach setup evidence.
 *
 * @param execution - The completed nested generation execution.
 * @returns Evidence naming the failing generator and its bounded selection context.
 */
function describeStoppedGeneration(execution: Extract<CommandExecution<GenerateResult>, {status: "completed"}>): string {
  const {failed, completed, selected} = execution.value;
  return [
    `Repository artifact generation reported exit code ${execution.exitCode}.`,
    failed === undefined
      ? "The generation command named no failing generator."
      : `The '${failed}' generator stopped the generation run.`,
    `Completed generators: ${completed.length === 0 ? "none" : completed.join(", ")}.`,
    `Selected generators: ${selected.join(", ")}.`,
  ].join("\n");
}

/**
 * Validates Nx workspace metadata, generates every required checkout artifact through one typed
 * nested generation invocation, and asserts the generated postconditions.
 *
 * @param context - Shared setup dependencies.
 * @returns The completed phase result.
 * @throws {CommandCancellation} When the nested generation invocation was cancelled.
 */
async function runGenerators(context: SetupContext): Promise<SetupPhaseResult> {
  const runtime = requireSetupPhaseRuntime(context);
  const startedAt = runtime.clock.monotonicNow();
  const id = "workspace.generators";
  const generatorActionId = "workspace.generators.generate";
  let projectCount: number | undefined;
  try {
    const disposition = await context.actions.run({
      id: generatorActionId,
      scope: "repository",
      summary: "Generate taxonomy, GraphQL, and internationalization checkout artifacts.",
      execute: async () => {
        const nxOutcome = await runtime.runner.run(NX_PROJECTS_COMMAND, {cwd: context.paths.root});
        const projects = parseNxProjects(nxOutcome);
        if (projects === null) {
          throw new Error(
            [
              "Nx project metadata is unavailable or malformed.",
              ...commandFailureEvidence(nxOutcome),
              ...(nxOutcome.stdout.trim() === "" ? ["Nx returned no project JSON."] : [`Nx output: ${nxOutcome.stdout.trim()}`]),
            ].join("\n"),
          );
        }
        projectCount = projects.length;

        // Exactly the pre-migration `generate /a /g /i` selection: environment generation is
        // deliberately excluded because it performs network, prompt, and local file mutations
        // setup never requested.
        const generation = await runtime.invokeGenerate({
          verbose: context.options.verbose,
          env: false,
          i18n: true,
          gql: true,
          artifacts: true,
        });

        if (generation.status === "cancelled") {
          throw toCancellation(generation);
        }
        if (generation.status === "failed") {
          throw new Error(
            ["Repository artifact generation failed.", generation.failure.message, ...generation.failure.evidence].join("\n"),
          );
        }
        if (generation.status !== "completed") {
          throw new Error(`Repository artifact generation ended with status '${generation.status}' instead of a completed run.`);
        }
        if (generation.exitCode !== 0) {
          throw new Error(describeStoppedGeneration(generation));
        }
      },
    });

    if (disposition === "planned") {
      return result(runtime, startedAt, {
        id,
        status: "skipped",
        summary: "Repository artifact generation is planned by dry-run.",
        evidence: [`Planned action: ${generatorActionId}`],
        nextActions: [],
      });
    }
    if (disposition === "declined") {
      return result(runtime, startedAt, {
        id,
        status: "failed",
        summary: "Repository artifact generation was declined.",
        evidence: [`Declined action: ${generatorActionId}`],
        nextActions: ["Allow the repository-scoped generator action, then rerun setup."],
      });
    }
  } catch (error: unknown) {
    if (isInterruption(error)) {
      throw error;
    }
    return result(runtime, startedAt, {
      id,
      status: "failed",
      summary: "Repository artifact generation failed.",
      evidence: [errorMessage(error)],
      nextActions: ["Correct the generator failure, then rerun setup."],
    });
  }

  if (projectCount === undefined) {
    return result(runtime, startedAt, {
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
  let artifactChecks: readonly Readonly<{path: string; exists: boolean}>[];
  try {
    artifactChecks = await runtime.tasks.parallel(
      expectedArtifacts.map((path) => async () => ({path, exists: await isFile(path, runtime.files)})),
    );
  } catch (error: unknown) {
    if (isInterruption(error)) {
      throw error;
    }
    return result(runtime, startedAt, {
      id,
      status: "failed",
      summary: "Repository generator postconditions could not be inspected.",
      evidence: [errorMessage(error)],
      nextActions: ["Correct filesystem access to the generated artifacts, then rerun setup."],
    });
  }
  const missingArtifacts = artifactChecks.filter(({exists}) => !exists).map(({path}) => path);
  if (missingArtifacts.length > 0) {
    return result(runtime, startedAt, {
      id,
      status: "failed",
      summary: "Repository generators completed without every required checkout artifact.",
      evidence: missingArtifacts.map((path) => `Missing generated artifact: ${path}`),
      nextActions: ["Inspect the repository generators; do not replace the missing postcondition with a build or type-check."],
    });
  }

  return result(runtime, startedAt, {
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
}

/** Required workspace setup phases and their dependency graph. */
export const workspaceSetupPhases: readonly SetupPhaseDefinition[] = [
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
    run: runGenerators,
  },
];
