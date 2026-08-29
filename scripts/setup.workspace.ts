/**
 * @fileoverview Dependency-free workspace bootstrap phases for repository setup.
 * @module scripts.setup.workspace
 */

import {readFile, stat} from "node:fs/promises";
import {resolve} from "node:path";

import type {CommandResult, CommandSpec} from "./common/process.ts";
import {loadRepositoryRequirements, parseVersion, satisfiesMinimum, type MinimumVersion} from "./common/requirements.ts";
import {
  mergeToolingConfig,
  readToolingConfig,
  sha256File,
  writeToolingConfig,
  type SetupFingerprints,
  type ToolingConfigV1,
} from "./common/tooling-config.ts";
import {getExpectedTaxonomyArtifactPaths} from "./generate.artifacts.ts";
import type {SetupActionDisposition, SetupContext, SetupPhaseDefinition, SetupPhaseResult} from "./setup.types.ts";

const REPOSITORY_PACKAGE_NAME = "@arolariu/monorepo";
const NPM_INSPECTION_COMMAND: CommandSpec = {
  command: "npm",
  args: ["ls", "--all", "--json"],
};
const NPM_RESTORE_COMMAND: CommandSpec = {
  command: "npm",
  args: ["ci", "--prefer-offline", "--no-audit", "--no-fund"],
};
const NX_PROJECTS_COMMAND: CommandSpec = {
  command: "npx",
  args: ["--no-install", "nx", "show", "projects", "--json"],
};

type UnknownRecord = Readonly<Record<string, unknown>>;

interface NpmTreeDefinition {
  readonly phaseId: "workspace.root-dependencies" | "workspace.github-scripts-dependencies";
  readonly title: string;
  readonly root: string;
  readonly lockfile: string;
  readonly lockFingerprint: "rootPackageLockSha256" | "githubScriptsPackageLockSha256";
}

/** Validated interpretation of untrusted `npm ls --all --json` output. */
export interface NpmTreeInspection {
  readonly valid: boolean;
  readonly problems: readonly string[];
  readonly stdout: string;
  readonly stderr: string;
}

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

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch (error: unknown) {
    if (hasErrorCode(error, "ENOENT")) {
      return false;
    }
    throw new Error(`Unable to inspect dependency directory '${path}': ${errorMessage(error)}`);
  }
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

  const liveRequirements = await loadRepositoryRequirements(context.paths);
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
 * Validates untrusted npm tree output without discarding useful failed-command output.
 *
 * @param commandResult - Complete `npm ls --all --json` command result.
 * @returns A safe integrity inspection retaining stdout and stderr.
 */
export function inspectNpmTreeResult(commandResult: Readonly<CommandResult>): NpmTreeInspection {
  const problems: string[] = [];
  const stdout = commandResult.stdout;
  const stderr = commandResult.stderr;
  let validDocument = false;

  if (stdout.trim() === "") {
    problems.push("npm ls produced empty JSON output.");
  } else {
    try {
      const parsed: unknown = JSON.parse(stdout);
      if (!isRecord(parsed)) {
        problems.push("npm ls JSON output must be an object.");
      } else {
        const untrustedProblems = parsed["problems"];
        if (untrustedProblems === undefined) {
          validDocument = true;
        } else if (
          Array.isArray(untrustedProblems)
          && untrustedProblems.every((problem) => typeof problem === "string" && problem.trim() !== "")
        ) {
          problems.push(...untrustedProblems);
          validDocument = true;
        } else {
          problems.push("npm ls JSON property 'problems' must be an array of non-empty strings.");
        }
      }
    } catch (error: unknown) {
      problems.push(`Unable to parse npm ls JSON output: ${errorMessage(error)}`);
    }
  }

  if (validDocument && problems.length === 0 && !isSuccessfulCommand(commandResult)) {
    if (commandResult.spawnError !== undefined) {
      problems.push(`npm ls could not start: ${commandResult.spawnError}`);
    } else if (commandResult.timedOut) {
      problems.push("npm ls timed out.");
    } else if (commandResult.signal !== undefined) {
      problems.push(`npm ls stopped with signal ${commandResult.signal}.`);
    } else {
      problems.push(`npm ls exited with code ${commandResult.code}.`);
    }
  }

  return {
    valid: validDocument && problems.length === 0 && isSuccessfulCommand(commandResult),
    problems,
    stdout,
    stderr,
  };
}

/**
 * Determines whether an npm tree must be restored from its lockfile.
 *
 * @param input - Live integrity state and the last successful setup fingerprint.
 * @returns `true` when the tree is missing, invalid, or stale.
 */
export function shouldRestoreNpmTree(
  input: Readonly<{
    directoryExists: boolean;
    inspection: NpmTreeInspection;
    currentNodeVersion: string;
    currentLockHash: string;
    storedNodeVersion?: string;
    storedLockHash?: string;
  }>,
): boolean {
  return (
    !input.directoryExists
    || !input.inspection.valid
    || input.currentNodeVersion !== input.storedNodeVersion
    || input.currentLockHash !== input.storedLockHash
  );
}

function selectedConfig(readResult: Awaited<ReturnType<typeof readToolingConfig>>): ToolingConfigV1 | undefined {
  return readResult.status === "valid" ? readResult.config : undefined;
}

function otherLockFingerprint(lockFingerprint: NpmTreeDefinition["lockFingerprint"]): NpmTreeDefinition["lockFingerprint"] {
  return lockFingerprint === "rootPackageLockSha256" ? "githubScriptsPackageLockSha256" : "rootPackageLockSha256";
}

function withoutLockFingerprint(
  config: ToolingConfigV1 | undefined,
  lockFingerprint: NpmTreeDefinition["lockFingerprint"],
): ToolingConfigV1 | undefined {
  if (config?.fingerprints === undefined) {
    return config;
  }

  const fingerprints = config.fingerprints;
  const preservedFingerprints: SetupFingerprints =
    lockFingerprint === "rootPackageLockSha256"
      ? {
          ...(fingerprints.nodeVersion === undefined ? {} : {nodeVersion: fingerprints.nodeVersion}),
          ...(fingerprints.githubScriptsPackageLockSha256 === undefined
            ? {}
            : {githubScriptsPackageLockSha256: fingerprints.githubScriptsPackageLockSha256}),
          ...(fingerprints.pythonRequirementsSha256 === undefined ? {} : {pythonRequirementsSha256: fingerprints.pythonRequirementsSha256}),
        }
      : {
          ...(fingerprints.nodeVersion === undefined ? {} : {nodeVersion: fingerprints.nodeVersion}),
          ...(fingerprints.rootPackageLockSha256 === undefined ? {} : {rootPackageLockSha256: fingerprints.rootPackageLockSha256}),
          ...(fingerprints.pythonRequirementsSha256 === undefined ? {} : {pythonRequirementsSha256: fingerprints.pythonRequirementsSha256}),
        };

  return {
    ...config,
    fingerprints: preservedFingerprints,
  };
}

async function writeSuccessfulFingerprint(
  context: SetupContext,
  tree: NpmTreeDefinition,
  currentNodeVersion: string,
  currentLockHash: string,
  nodeVersionChanged: boolean,
): Promise<SetupActionDisposition> {
  const actionId = `${tree.phaseId}.write-fingerprint`;
  return context.actions.run({
    id: actionId,
    scope: "repository",
    summary: `Record the successful ${tree.title} dependency fingerprint.`,
    execute: async () => {
      const latest = await readToolingConfig(context.paths.toolingConfig);
      if (latest.status === "invalid") {
        throw new Error(latest.error);
      }
      const currentConfig = selectedConfig(latest);
      const mergeBase = nodeVersionChanged
        ? withoutLockFingerprint(currentConfig, otherLockFingerprint(tree.lockFingerprint))
        : currentConfig;
      const fingerprints: Partial<SetupFingerprints> = {
        nodeVersion: currentNodeVersion,
        [tree.lockFingerprint]: currentLockHash,
      };
      await writeToolingConfig(
        context.paths.toolingConfig,
        mergeToolingConfig(mergeBase, {
          fingerprints,
        }),
      );
    },
  });
}

async function runNpmTreePhase(context: SetupContext, tree: NpmTreeDefinition): Promise<SetupPhaseResult> {
  const startedAt = context.now();
  const nodeModules = resolve(tree.root, "node_modules");

  try {
    const [directoryExists, inspectionResult, currentLockHash, configResult] = await Promise.all([
      isDirectory(nodeModules),
      context.runner.run(NPM_INSPECTION_COMMAND, {cwd: tree.root}),
      sha256File(tree.lockfile),
      readToolingConfig(context.paths.toolingConfig),
    ]);

    if (configResult.status === "invalid") {
      return result(context, startedAt, {
        id: tree.phaseId,
        status: "failed",
        summary: `The local tooling configuration is invalid; ${tree.title} dependencies were not changed.`,
        evidence: [configResult.error],
        nextActions: ["Correct or remove the invalid non-secret local tooling configuration, then rerun setup."],
      });
    }

    const inspection = inspectNpmTreeResult(inspectionResult);
    const runningNodeVersion = parseVersion(process.version);
    if (runningNodeVersion === null) {
      return result(context, startedAt, {
        id: tree.phaseId,
        status: "failed",
        summary: `The running Node.js version cannot be fingerprinted for ${tree.title} dependencies.`,
        evidence: [`Unsupported process.version value '${process.version}'.`],
        nextActions: ["Run setup with a supported Node.js executable."],
      });
    }
    const currentNodeVersion = normalizedVersion(runningNodeVersion);
    const fingerprints = selectedConfig(configResult)?.fingerprints;
    const nodeVersionChanged = fingerprints?.nodeVersion !== currentNodeVersion;
    const restoreRequired = shouldRestoreNpmTree({
      directoryExists,
      inspection,
      currentNodeVersion,
      currentLockHash,
      ...(fingerprints?.nodeVersion === undefined ? {} : {storedNodeVersion: fingerprints.nodeVersion}),
      ...(fingerprints?.[tree.lockFingerprint] === undefined ? {} : {storedLockHash: fingerprints[tree.lockFingerprint]}),
    });

    if (!restoreRequired) {
      return result(context, startedAt, {
        id: tree.phaseId,
        status: "succeeded",
        summary: `${tree.title} dependencies are valid and current.`,
        evidence: [`npm ls passed in ${tree.root}.`, `Lockfile fingerprint ${currentLockHash} matches the last successful setup.`],
        nextActions: [],
      });
    }

    const restoreActionId = `${tree.phaseId}.npm-ci`;
    const restoreDisposition = await context.actions.run({
      id: restoreActionId,
      scope: "repository",
      summary: `Restore ${tree.title} dependencies from the lockfile.`,
      execute: async () => {
        const restoreResult = await context.runner.run(NPM_RESTORE_COMMAND, {
          cwd: tree.root,
          output: "tee",
          logger: context.logger,
        });
        if (!isSuccessfulCommand(restoreResult)) {
          throw new Error([`npm ci failed in ${tree.root}.`, ...commandFailureEvidence(restoreResult)].join("\n"));
        }
      },
    });

    if (restoreDisposition === "planned") {
      return result(context, startedAt, {
        id: tree.phaseId,
        status: "skipped",
        summary: `${tree.title} dependency restoration is planned by dry-run.`,
        evidence: [`Planned action: ${restoreActionId}`],
        nextActions: [],
      });
    }
    if (restoreDisposition === "declined") {
      return result(context, startedAt, {
        id: tree.phaseId,
        status: "failed",
        summary: `${tree.title} dependency restoration was declined.`,
        evidence: [`Declined action: ${restoreActionId}`],
        nextActions: ["Allow the repository-scoped dependency restoration action, then rerun setup."],
      });
    }

    const restoredInspectionResult = await context.runner.run(NPM_INSPECTION_COMMAND, {
      cwd: tree.root,
    });
    const restoredInspection = inspectNpmTreeResult(restoredInspectionResult);
    if (!restoredInspection.valid) {
      return result(context, startedAt, {
        id: tree.phaseId,
        status: "failed",
        summary: `${tree.title} dependencies remain invalid after npm ci.`,
        evidence: [
          ...restoredInspection.problems,
          ...(restoredInspection.stdout.trim() === "" ? [] : [`stdout: ${restoredInspection.stdout.trim()}`]),
          ...(restoredInspection.stderr.trim() === "" ? [] : [`stderr: ${restoredInspection.stderr.trim()}`]),
        ],
        nextActions: [`Inspect the npm tree in ${tree.root} and rerun setup after correcting the reported problems.`],
      });
    }

    const fingerprintActionId = `${tree.phaseId}.write-fingerprint`;
    const fingerprintDisposition = await writeSuccessfulFingerprint(context, tree, currentNodeVersion, currentLockHash, nodeVersionChanged);
    if (fingerprintDisposition === "planned") {
      return result(context, startedAt, {
        id: tree.phaseId,
        status: "skipped",
        summary: `${tree.title} dependencies are valid; fingerprint persistence is planned by dry-run.`,
        evidence: [`Planned action: ${fingerprintActionId}`],
        nextActions: [],
      });
    }
    if (fingerprintDisposition === "declined") {
      return result(context, startedAt, {
        id: tree.phaseId,
        status: "failed",
        summary: `${tree.title} dependencies are valid, but their fingerprint was not persisted.`,
        evidence: [`Declined action: ${fingerprintActionId}`],
        nextActions: ["Allow the repository-scoped fingerprint action, then rerun setup."],
      });
    }

    return result(context, startedAt, {
      id: tree.phaseId,
      status: "succeeded",
      summary: `${tree.title} dependencies were restored and verified.`,
      evidence: [`Executed action: ${restoreActionId}`, `Executed action: ${fingerprintActionId}`, `Verified npm tree in ${tree.root}.`],
      nextActions: [],
    });
  } catch (error: unknown) {
    return result(context, startedAt, {
      id: tree.phaseId,
      status: "failed",
      summary: `${tree.title} dependency setup failed.`,
      evidence: [errorMessage(error)],
      nextActions: [`Resolve the reported ${tree.title} dependency error, then rerun setup.`],
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

const rootDependencies = (context: SetupContext): Promise<SetupPhaseResult> =>
  runNpmTreePhase(context, {
    phaseId: "workspace.root-dependencies",
    title: "root workspace",
    root: context.paths.root,
    lockfile: context.paths.packageLock,
    lockFingerprint: "rootPackageLockSha256",
  });

const githubScriptsDependencies = (context: SetupContext): Promise<SetupPhaseResult> =>
  runNpmTreePhase(context, {
    phaseId: "workspace.github-scripts-dependencies",
    title: ".github scripts",
    root: context.paths.githubScriptsRoot,
    lockfile: context.paths.githubScriptsPackageLock,
    lockFingerprint: "githubScriptsPackageLockSha256",
  });

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
    title: "Restore root workspace dependencies",
    required: true,
    dependsOn: ["workspace.prerequisites"],
    run: rootDependencies,
  },
  {
    id: "workspace.github-scripts-dependencies",
    title: "Restore GitHub scripts dependencies",
    required: true,
    dependsOn: ["workspace.prerequisites"],
    run: githubScriptsDependencies,
  },
  {
    id: "workspace.generators",
    title: "Generate checkout artifacts",
    required: true,
    dependsOn: ["workspace.root-dependencies"],
    run: runGenerators,
  },
];
