/**
 * @fileoverview Dependency-free workspace bootstrap phases for repository setup.
 * @module scripts.setup.workspace
 */

import {readFile, stat} from "node:fs/promises";
import {resolve} from "node:path";

import type {CommandResult, CommandSpec} from "./common/process.ts";
import {loadRepositoryRequirements, parseVersion, satisfiesMinimum, type MinimumVersion} from "./common/requirements.ts";
import {nodeFileSystem, nodeTaskScheduler} from "./common/runtime.node.ts";
import {getExpectedTaxonomyArtifactPaths} from "./common/taxonomy-artifacts.ts";
import type {NpmTreeFacts} from "./inspection/packages.ts";
import type {SetupContext, SetupPhaseDefinition, SetupPhaseResult} from "./setup.types.ts";

const REPOSITORY_PACKAGE_NAME = "@arolariu/monorepo";
/** Exact contributor remediation for a missing, unavailable, invalid, or broken root npm tree. */
const ROOT_NPM_CI_GUIDANCE = "Run `npm ci` in the repository root, then rerun setup.";
const NPM_RESTORE_COMMAND: CommandSpec = {
  command: "npm",
  args: ["ci", "--prefer-offline", "--no-audit", "--no-fund"],
};
const NX_PROJECTS_COMMAND: CommandSpec = {
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

function isSuccessfulCommand(result: Readonly<CommandResult>): boolean {
  return result.code === 0 && !result.timedOut && result.signal === undefined && result.spawnError === undefined;
}

function commandFailureEvidence(result: Readonly<CommandResult>): readonly string[] {
  return [
    ...(result.spawnError === undefined ? [] : [`Unable to start command: ${result.spawnError}`]),
    ...(result.timedOut ? ["Command timed out."] : []),
    ...(result.signal === undefined ? [] : [`Command stopped with signal ${result.signal}.`]),
    ...(result.code === 0 ? [] : [`Command exited with code ${result.code}.`]),
    ...(result.stdout.trim() === "" ? [] : [`stdout: ${result.stdout.trim()}`]),
    ...(result.stderr.trim() === "" ? [] : [`stderr: ${result.stderr.trim()}`]),
  ];
}

function duration(startedAt: number, context: SetupContext): number {
  return Math.max(0, context.now() - startedAt);
}

function result(context: SetupContext, startedAt: number, input: Omit<SetupPhaseResult, "durationMs">): SetupPhaseResult {
  return {
    ...input,
    durationMs: duration(startedAt, context),
  };
}

function normalizedVersion(version: MinimumVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function validRequirement(version: MinimumVersion): boolean {
  return [version.major, version.minor, version.patch].every((part) => Number.isSafeInteger(part) && part >= 0);
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch (error: unknown) {
    if (hasErrorCode(error, "ENOENT")) {
      return false;
    }
    throw new Error(`Unable to inspect generated artifact '${path}': ${errorMessage(error)}`);
  }
}

type RepositoryIdentityReadResult =
  {readonly status: "missing"} | {readonly status: "valid"; readonly name: string} | {readonly status: "invalid"; readonly error: string};

async function readRepositoryIdentity(packageJsonPath: string): Promise<RepositoryIdentityReadResult> {
  let contents: string;
  try {
    contents = await readFile(packageJsonPath, "utf8");
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
  commandResult: Readonly<CommandResult>,
  minimum: MinimumVersion,
): Readonly<{
  version: MinimumVersion | null;
  evidence: readonly string[];
  nextActions: readonly string[];
}> {
  const parsed = parseVersion(commandResult.stdout);
  if (!isSuccessfulCommand(commandResult) || parsed === null) {
    return {
      version: null,
      evidence: [
        `${name} version probe failed.`,
        ...commandFailureEvidence(commandResult),
        ...(isSuccessfulCommand(commandResult) && parsed === null
          ? [`${name} returned an unsupported version value '${commandResult.stdout.trim()}'.`]
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
    evidence: [`${name} ${commandResult.stdout.trim()} satisfies >=${normalizedVersion(minimum)}.`],
    nextActions: [],
  };
}

async function runPrerequisites(context: SetupContext): Promise<SetupPhaseResult> {
  const startedAt = context.now();
  const id = "workspace.prerequisites";
  const repositoryIdentity = await readRepositoryIdentity(context.paths.packageJson);

  if (repositoryIdentity.status === "missing") {
    return result(context, startedAt, {
      id,
      status: "failed",
      summary: "The canonical repository path does not identify the arolariu.ro monorepository.",
      evidence: [`Repository identity file '${context.paths.packageJson}' does not exist.`],
      nextActions: ["Run setup from a checkout of the arolariu.ro monorepository."],
    });
  }
  if (repositoryIdentity.status === "invalid") {
    return result(context, startedAt, {
      id,
      status: "failed",
      summary: "The canonical repository identity could not be validated.",
      evidence: [repositoryIdentity.error],
      nextActions: ["Correct the repository identity file or its filesystem access, then rerun setup."],
    });
  }
  if (repositoryIdentity.name !== REPOSITORY_PACKAGE_NAME) {
    return result(context, startedAt, {
      id,
      status: "failed",
      summary: "The canonical repository path does not identify the arolariu.ro monorepository.",
      evidence: [`Expected ${context.paths.packageJson} to declare package '${REPOSITORY_PACKAGE_NAME}'.`],
      nextActions: ["Run setup from a checkout of the arolariu.ro monorepository."],
    });
  }

  const liveRequirements = await loadRepositoryRequirements(context.paths, {files: nodeFileSystem, tasks: nodeTaskScheduler});
  if (liveRequirements.status === "invalid") {
    return result(context, startedAt, {
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
    return result(context, startedAt, {
      id,
      status: "failed",
      summary: "Manifest-derived repository requirements are invalid or contradictory.",
      evidence: ["At least one normalized runtime requirement is not a non-negative semantic version."],
      nextActions: ["Correct the repository requirement sources before rerunning setup."],
    });
  }

  const [gitResult, nodeResult, npmResult] = await Promise.all([
    context.runner.run({command: "git", args: ["--version"]}, {cwd: context.paths.root}),
    context.runner.run({command: "node", args: ["--version"]}, {cwd: context.paths.root}),
    context.runner.run({command: "npm", args: ["--version"]}, {cwd: context.paths.root}),
  ]);

  const evidence: string[] = [];
  const nextActions: string[] = [];
  const gitVersion = hasValidGitVersionOutput(gitResult.stdout);
  if (!isSuccessfulCommand(gitResult) || !gitVersion) {
    evidence.push(
      "Git version probe failed.",
      ...commandFailureEvidence(gitResult),
      ...(isSuccessfulCommand(gitResult) && !gitVersion ? [`Git returned malformed output '${gitResult.stdout.trim()}'.`] : []),
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

  const processNodeVersion = parseVersion(process.version);
  if (
    nodeInspection.version !== null
    && (processNodeVersion === null || normalizedVersion(nodeInspection.version) !== normalizedVersion(processNodeVersion))
  ) {
    evidence.push(
      `node --version reported ${normalizedVersion(nodeInspection.version)}, but the running process.version is ${process.version}.`,
    );
    nextActions.push("Run setup with the same supported Node.js executable resolved by the node command.");
  }

  if (nextActions.length > 0) {
    return result(context, startedAt, {
      id,
      status: "failed",
      summary: "Workspace prerequisites are not satisfied.",
      evidence,
      nextActions,
    });
  }

  return result(context, startedAt, {
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
  const startedAt = context.now();
  const id = "workspace.root-dependencies";
  const outcome = await context.inspection.inspect("npm.root");

  if (outcome.kind === "unavailable") {
    return result(context, startedAt, {
      id,
      status: "failed",
      summary: "Root workspace dependencies could not be validated.",
      evidence: [outcome.reason],
      nextActions: [ROOT_NPM_CI_GUIDANCE],
    });
  }
  if (outcome.kind === "invalid") {
    return result(context, startedAt, {
      id,
      status: "failed",
      summary: "Root workspace dependency inspection produced invalid data.",
      evidence: [...outcome.issues],
      nextActions: [ROOT_NPM_CI_GUIDANCE],
    });
  }
  if (!outcome.value.valid) {
    return result(context, startedAt, {
      id,
      status: "failed",
      summary: "Root workspace dependencies are missing or broken.",
      evidence: npmProblemEvidence(outcome.value),
      nextActions: [ROOT_NPM_CI_GUIDANCE],
    });
  }

  return result(context, startedAt, {
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
 */
async function runGithubScriptsDependencies(context: SetupContext): Promise<SetupPhaseResult> {
  const startedAt = context.now();
  const id = "workspace.github-scripts-dependencies";
  const actionId = `${id}.npm-ci`;

  try {
    const disposition = await context.actions.run({
      id: actionId,
      scope: "repository",
      summary: "Restore .github scripts dependencies from the lockfile.",
      execute: async () => {
        const restoreResult = await context.runner.run(NPM_RESTORE_COMMAND, {
          cwd: context.paths.githubScriptsRoot,
          output: "tee",
          logger: context.logger,
        });
        if (!isSuccessfulCommand(restoreResult)) {
          throw new Error([`npm ci failed in ${context.paths.githubScriptsRoot}.`, ...commandFailureEvidence(restoreResult)].join("\n"));
        }
      },
    });

    if (disposition === "planned") {
      return result(context, startedAt, {
        id,
        status: "skipped",
        summary: ".github scripts dependency restoration is planned by dry-run.",
        evidence: [`Planned action: ${actionId}`],
        nextActions: [],
      });
    }
    if (disposition === "declined") {
      return result(context, startedAt, {
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
      return result(context, startedAt, {
        id,
        status: "failed",
        summary: ".github scripts dependencies could not be verified after npm ci.",
        evidence: [`Executed action: ${actionId}`, outcome.reason],
        nextActions: ["Inspect the .github/scripts npm tree and rerun setup after correcting the reported problems."],
      });
    }
    if (outcome.kind === "invalid") {
      return result(context, startedAt, {
        id,
        status: "failed",
        summary: ".github scripts dependencies could not be verified after npm ci.",
        evidence: [`Executed action: ${actionId}`, ...outcome.issues],
        nextActions: ["Inspect the .github/scripts npm tree and rerun setup after correcting the reported problems."],
      });
    }
    if (!outcome.value.valid) {
      return result(context, startedAt, {
        id,
        status: "failed",
        summary: ".github scripts dependencies remain invalid after npm ci.",
        evidence: [`Executed action: ${actionId}`, ...npmProblemEvidence(outcome.value)],
        nextActions: ["Inspect the .github/scripts npm tree and rerun setup after correcting the reported problems."],
      });
    }

    return result(context, startedAt, {
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
    return result(context, startedAt, {
      id,
      status: "failed",
      summary: ".github scripts dependency setup failed.",
      evidence: [errorMessage(error)],
      nextActions: ["Resolve the reported .github scripts dependency error, then rerun setup."],
    });
  }
}

function parseNxProjects(commandResult: Readonly<CommandResult>): readonly string[] | null {
  if (!isSuccessfulCommand(commandResult) || commandResult.stdout.trim() === "") {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(commandResult.stdout);
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every((project) => typeof project === "string" && project.trim() !== "")) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function runGenerators(context: SetupContext): Promise<SetupPhaseResult> {
  const startedAt = context.now();
  const id = "workspace.generators";
  const generatorActionId = "workspace.generators.generate";
  let projectCount: number | undefined;
  try {
    const disposition = await context.actions.run({
      id: generatorActionId,
      scope: "repository",
      summary: "Generate taxonomy, GraphQL, and internationalization checkout artifacts.",
      execute: async () => {
        const nxResult = await context.runner.run(NX_PROJECTS_COMMAND, {
          cwd: context.paths.root,
        });
        const projects = parseNxProjects(nxResult);
        if (projects === null) {
          throw new Error(
            [
              "Nx project metadata is unavailable or malformed.",
              ...commandFailureEvidence(nxResult),
              ...(nxResult.stdout.trim() === "" ? ["Nx returned no project JSON."] : [`Nx output: ${nxResult.stdout.trim()}`]),
            ].join("\n"),
          );
        }
        projectCount = projects.length;

        const generatorResult = await context.runner.run(
          {
            command: process.execPath,
            args: [resolve(context.paths.root, "scripts", "generate.ts"), "/a", "/g", "/i"],
          },
          {
            cwd: context.paths.root,
            output: "tee",
            logger: context.logger,
          },
        );
        if (!isSuccessfulCommand(generatorResult)) {
          throw new Error(["Repository generator command failed.", ...commandFailureEvidence(generatorResult)].join("\n"));
        }
      },
    });

    if (disposition === "planned") {
      return result(context, startedAt, {
        id,
        status: "skipped",
        summary: "Repository artifact generation is planned by dry-run.",
        evidence: [`Planned action: ${generatorActionId}`],
        nextActions: [],
      });
    }
    if (disposition === "declined") {
      return result(context, startedAt, {
        id,
        status: "failed",
        summary: "Repository artifact generation was declined.",
        evidence: [`Declined action: ${generatorActionId}`],
        nextActions: ["Allow the repository-scoped generator action, then rerun setup."],
      });
    }
  } catch (error: unknown) {
    return result(context, startedAt, {
      id,
      status: "failed",
      summary: "Repository artifact generation failed.",
      evidence: [errorMessage(error)],
      nextActions: ["Correct the generator failure, then rerun setup."],
    });
  }

  if (projectCount === undefined) {
    return result(context, startedAt, {
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
    artifactChecks = await Promise.all(expectedArtifacts.map(async (path) => ({path, exists: await isFile(path)})));
  } catch (error: unknown) {
    return result(context, startedAt, {
      id,
      status: "failed",
      summary: "Repository generator postconditions could not be inspected.",
      evidence: [errorMessage(error)],
      nextActions: ["Correct filesystem access to the generated artifacts, then rerun setup."],
    });
  }
  const missingArtifacts = artifactChecks.filter(({exists}) => !exists).map(({path}) => path);
  if (missingArtifacts.length > 0) {
    return result(context, startedAt, {
      id,
      status: "failed",
      summary: "Repository generators completed without every required checkout artifact.",
      evidence: missingArtifacts.map((path) => `Missing generated artifact: ${path}`),
      nextActions: ["Inspect the repository generators; do not replace the missing postcondition with a build or type-check."],
    });
  }

  return result(context, startedAt, {
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
