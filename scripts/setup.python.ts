/**
 * @fileoverview Independent isolated Python interpreter and virtual-environment setup phase.
 * @module scripts.setup.python
 */

import {rm, stat} from "node:fs/promises";

import type {CommandResult, CommandSpec} from "./common/process.ts";
import {formatCommand} from "./common/process.ts";
import {satisfiesMinimum, type MinimumVersion} from "./common/requirements.ts";
import {mergeToolingConfig, readToolingConfig, sha256File, writeToolingConfig} from "./common/tooling-config.ts";
import type {InstallationProposal, SetupContext, SetupPhaseDefinition, SetupPhaseResult} from "./setup.types.ts";

/** Selected Python interpreter satisfying the manifest-derived minimum version. */
export interface PythonInterpreter {
  /** Interpreter executable or launcher command. */
  readonly command: string;
  /** Arguments inserted before every invocation, such as a `py` launcher selector. */
  readonly prefixArgs: readonly string[];
  /** Parsed interpreter version. */
  readonly version: MinimumVersion;
}

interface PythonSetupDependencies {
  readonly platform: NodeJS.Platform;
  readonly virtualEnvironmentExists: (path: string) => Promise<boolean>;
  readonly removeDirectory: (path: string) => Promise<void>;
}

interface InterpreterProbe {
  readonly command: string;
  readonly prefixArgs: readonly string[];
}

type ExistingVirtualEnvironmentProbe =
  | Readonly<{status: "compatible"; version: MinimumVersion}>
  | Readonly<{status: "incompatible"; version: MinimumVersion}>
  | Readonly<{status: "inconclusive"; evidence: readonly string[]}>;

type VirtualEnvironmentProbe = Readonly<{status: "absent"}> | ExistingVirtualEnvironmentProbe;

const PYTHON_INSTALL_ACTION = "python.install-interpreter";
const VENV_CREATE_ACTION = "python.venv.create";
const PIP_UPGRADE_ACTION = "python.pip.upgrade";
const DEPENDENCIES_INSTALL_ACTION = "python.dependencies.install";
const FINGERPRINT_WRITE_ACTION = "python.fingerprint.write";
const PYTHON_MANUAL_INSTALL = "Install a compatible Python interpreter from https://www.python.org/downloads/, then rerun setup.";

const PYTHON_VERSION_PATTERN = /^Python\s+(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:[a-zA-Z][0-9A-Za-z.]*)?\s*$/u;

function isSuccessfulCommand(result: Readonly<CommandResult>): boolean {
  return result.code === 0 && !result.timedOut && result.signal === undefined && result.spawnError === undefined;
}

function isInterrupted(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
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

function declinedResult(actionId: string, evidence: readonly string[]): SetupPhaseResult {
  return {
    id: "python",
    status: "failed",
    summary: "A required Python preparation action was declined.",
    evidence: [...evidence, `Declined action: ${actionId}`],
    nextActions: [`Allow required action '${actionId}', then rerun setup.`],
    durationMs: 0,
  };
}

/**
 * Parses the standard `Python major.minor.patch` text reported on stdout or stderr.
 *
 * @param output - Untrusted probe output.
 * @returns A parsed version, or `null` for unrecognized or non-leading text.
 */
function parsePythonVersion(output: string): MinimumVersion | null {
  const match = PYTHON_VERSION_PATTERN.exec(output.trim());
  if (match === null) {
    return null;
  }
  return {major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3])};
}

/**
 * Selects a reviewed, compatible interpreter from already-executed version probes.
 *
 * @param probes - Candidate commands and their executed `--version` results, in platform-preferred order.
 * @param required - Manifest-derived minimum Python version.
 * @returns The first compatible interpreter in probe order, or `null`.
 */
export function selectPythonInterpreter(
  probes: readonly Readonly<{command: string; prefixArgs: readonly string[]; result: CommandResult}>[],
  required: MinimumVersion,
): PythonInterpreter | null {
  for (const probe of probes) {
    if (!isSuccessfulCommand(probe.result)) {
      continue;
    }
    const version = parsePythonVersion(probe.result.stdout) ?? parsePythonVersion(probe.result.stderr);
    if (version === null || !satisfiesMinimum(version, required)) {
      continue;
    }
    return {command: probe.command, prefixArgs: probe.prefixArgs, version};
  }
  return null;
}

function virtualEnvironmentDirectory(expRoot: string, platform: NodeJS.Platform): string {
  return platform === "win32" ? `${expRoot}\\.venv` : `${expRoot}/.venv`;
}

/**
 * Resolves the isolated `exp.arolariu.ro` virtual-environment interpreter path.
 *
 * @param expRoot - Absolute path to the experimental service root.
 * @param platform - Target process platform.
 * @returns A command spec whose executable is the venv-owned Python interpreter.
 */
export function pythonInVirtualEnvironment(expRoot: string, platform: NodeJS.Platform): CommandSpec {
  const venvDirectory = virtualEnvironmentDirectory(expRoot, platform);
  return platform === "win32"
    ? {command: `${venvDirectory}\\Scripts\\python.exe`, args: []}
    : {command: `${venvDirectory}/bin/python`, args: []};
}

function pythonInterpreterCandidates(platform: NodeJS.Platform): readonly InterpreterProbe[] {
  if (platform === "win32") {
    return [
      {command: "py", prefixArgs: ["-3.12"]},
      {command: "python3.12", prefixArgs: []},
      {command: "python", prefixArgs: []},
    ];
  }
  return [
    {command: "python3.12", prefixArgs: []},
    {command: "python3", prefixArgs: []},
    {command: "python", prefixArgs: []},
  ];
}

async function probeInterpreters(
  context: SetupContext,
  platform: NodeJS.Platform,
): Promise<Readonly<{interpreter: PythonInterpreter | null; evidence: readonly string[]}>> {
  const candidates = pythonInterpreterCandidates(platform);
  const probes = await Promise.all(
    candidates.map(async (candidate) => ({
      command: candidate.command,
      prefixArgs: candidate.prefixArgs,
      result: await context.runner.run(
        {command: candidate.command, args: [...candidate.prefixArgs, "--version"]},
        {cwd: context.paths.root},
      ),
    })),
  );
  const interpreter = selectPythonInterpreter(probes, context.requirements.python);
  const probedCommands = candidates.map((candidate) => formatCommand({command: candidate.command, args: candidate.prefixArgs})).join(", ");
  return {
    interpreter,
    evidence:
      interpreter === null
        ? [`No probed interpreter (${probedCommands}) satisfies >=${normalizedVersion(context.requirements.python)}.`]
        : [
            `Selected interpreter '${formatCommand({command: interpreter.command, args: interpreter.prefixArgs})}' satisfies >=${normalizedVersion(context.requirements.python)}.`,
          ],
  };
}

function hasAptCandidate(result: Readonly<CommandResult>): boolean {
  return isSuccessfulCommand(result) && /^\s*Candidate:\s*(?!\(none\)\s*$)\S+/imu.test(result.stdout);
}

async function discoverPythonPackageManagers(context: SetupContext, platform: NodeJS.Platform): Promise<ReadonlySet<string>> {
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
    const [pythonPolicy, venvPolicy] = await Promise.all([
      context.runner.run({command: "apt-cache", args: ["policy", "python3.12"]}, {cwd: context.paths.root}),
      context.runner.run({command: "apt-cache", args: ["policy", "python3.12-venv"]}, {cwd: context.paths.root}),
    ]);
    if (hasAptCandidate(pythonPolicy) && hasAptCandidate(venvPolicy)) {
      managers.add("apt-get");
    }
  }
  if (isSuccessfulCommand(dnf)) {
    const info = await context.runner.run({command: "dnf", args: ["info", "python3.12"]}, {cwd: context.paths.root});
    if (isSuccessfulCommand(info)) {
      managers.add("dnf");
    }
  }
  return managers;
}

/**
 * Selects a reviewed package-manager proposal without inspecting the host.
 *
 * @param input - Platform, qualified manager markers, and interpreter requirement.
 * @returns A supported installation proposal, or `null`.
 */
export function selectPythonInstallationProposal(
  input: Readonly<{
    platform: NodeJS.Platform;
    availablePackageManagers: ReadonlySet<string>;
    required: MinimumVersion;
  }>,
): InstallationProposal | null {
  if (input.required.major !== 3 || input.required.minor !== 12) {
    return null;
  }

  if (input.platform === "win32" && input.availablePackageManagers.has("winget")) {
    return {
      command: {
        command: "winget",
        args: ["install", "--id", "Python.Python.3.12", "--exact", "--accept-package-agreements", "--accept-source-agreements"],
      },
      explanation: "Install the required Python 3.12 interpreter with Windows Package Manager.",
    };
  }

  if (input.platform === "darwin" && input.availablePackageManagers.has("brew")) {
    return {
      command: {command: "brew", args: ["install", "python@3.12"]},
      explanation: "Install the required Python 3.12 interpreter with Homebrew.",
    };
  }

  if (input.platform === "linux" && input.availablePackageManagers.has("apt-get")) {
    return {
      command: {command: "sudo", args: ["apt-get", "install", "-y", "python3.12", "python3.12-venv"]},
      explanation: "Install the available Python 3.12 interpreter and venv module with apt.",
    };
  }

  if (input.platform === "linux" && input.availablePackageManagers.has("dnf")) {
    return {
      command: {command: "sudo", args: ["dnf", "install", "-y", "python3.12"]},
      explanation: "Install the Python 3.12 interpreter package with dnf.",
    };
  }

  return null;
}

async function probeExistingVenvVersion(
  context: SetupContext,
  venvSpec: Readonly<CommandSpec>,
  requiredPython: MinimumVersion,
): Promise<ExistingVirtualEnvironmentProbe> {
  const result = await context.runner.run({command: venvSpec.command, args: [...venvSpec.args, "--version"]}, {cwd: context.paths.expRoot});
  if (!isSuccessfulCommand(result)) {
    return {status: "inconclusive", evidence: commandFailureEvidence(result)};
  }
  const version = parsePythonVersion(result.stdout) ?? parsePythonVersion(result.stderr);
  if (version === null) {
    return {
      status: "inconclusive",
      evidence: ["The virtual environment returned an unrecognized Python version.", ...commandFailureEvidence(result)],
    };
  }
  return satisfiesMinimum(version, requiredPython)
    ? {status: "compatible", version}
    : {status: "incompatible", version};
}

async function ensureVirtualEnvironment(
  context: SetupContext,
  dependencies: PythonSetupDependencies,
  interpreter: PythonInterpreter,
  venvSpec: Readonly<CommandSpec>,
  plannedActions: string[],
  evidence: string[],
): Promise<SetupPhaseResult | null> {
  const requiredPython = context.requirements.python;
  const venvDirectory = virtualEnvironmentDirectory(context.paths.expRoot, dependencies.platform);
  const initialProbe: VirtualEnvironmentProbe = await dependencies.virtualEnvironmentExists(venvDirectory)
    ? await probeExistingVenvVersion(context, venvSpec, requiredPython)
    : {status: "absent"};

  if (initialProbe.status === "inconclusive") {
    return {
      id: "python",
      status: "failed",
      summary: "The existing Python virtual environment could not be inspected safely.",
      evidence: [
        ...evidence,
        "The virtual environment version probe was inconclusive; the existing environment was not changed.",
        ...initialProbe.evidence,
      ],
      nextActions: ["Resolve the virtual environment version probe failure, then rerun setup."],
      durationMs: 0,
    };
  }

  const venvCompatible = initialProbe.status === "compatible";
  const venvNeedsCreation = initialProbe.status === "absent" || initialProbe.status === "incompatible";
  if (initialProbe.status === "absent") {
    evidence.push("The isolated virtual environment does not exist.");
  } else if (initialProbe.status === "incompatible") {
    evidence.push(
      `The isolated virtual environment uses Python ${normalizedVersion(initialProbe.version)}, below the required >=${normalizedVersion(requiredPython)}.`,
    );
  } else {
    evidence.push(`The isolated virtual environment satisfies >=${normalizedVersion(requiredPython)}.`);
  }

  const requirementsHash = await sha256File(context.paths.pythonRequirements);
  const configRead = await readToolingConfig(context.paths.toolingConfig);
  if (configRead.status === "invalid") {
    return {
      id: "python",
      status: "failed",
      summary: "The local tooling configuration is invalid; Python dependencies were not changed.",
      evidence: [...evidence, configRead.error],
      nextActions: ["Correct or remove the invalid non-secret local tooling configuration, then rerun setup."],
      durationMs: 0,
    };
  }
  const storedHash = configRead.status === "valid" ? configRead.config.fingerprints?.pythonRequirementsSha256 : undefined;
  const fingerprintMatches = storedHash === requirementsHash;

  let mutationNeeded = venvNeedsCreation || !fingerprintMatches;
  if (!mutationNeeded) {
    const checkProbe = await context.runner.run(
      {command: venvSpec.command, args: [...venvSpec.args, "-m", "pip", "check"]},
      {cwd: context.paths.expRoot},
    );
    if (isSuccessfulCommand(checkProbe)) {
      evidence.push("Installed Python dependencies match the tracked requirements fingerprint and satisfy pip check.");
      return null;
    }
    evidence.push("The installed Python dependencies failed pip check.", ...commandFailureEvidence(checkProbe));
    mutationNeeded = true;
  } else {
    evidence.push(
      venvCompatible ? "The tracked Python requirements fingerprint is stale or missing." : "The virtual environment must be (re)created.",
    );
  }

  let anyPlanned = false;

  if (venvNeedsCreation) {
    const disposition = await context.actions.run({
      id: VENV_CREATE_ACTION,
      scope: "repository",
      summary: "Create the isolated exp.arolariu.ro Python virtual environment.",
      execute: async () => {
        if (initialProbe.status === "incompatible") {
          await dependencies.removeDirectory(venvDirectory);
        }
        const createResult = await context.runner.run(
          {command: interpreter.command, args: [...interpreter.prefixArgs, "-m", "venv", venvDirectory]},
          {cwd: context.paths.root},
        );
        if (!isSuccessfulCommand(createResult)) {
          throw new Error(["Python virtual environment creation failed.", ...commandFailureEvidence(createResult)].join("\n"));
        }
      },
    });

    if (disposition === "declined") {
      return declinedResult(VENV_CREATE_ACTION, evidence);
    }
    if (disposition === "planned") {
      plannedActions.push(VENV_CREATE_ACTION);
      evidence.push(`Planned action: ${VENV_CREATE_ACTION}`);
      anyPlanned = true;
    } else {
      const reprobe = await probeExistingVenvVersion(context, venvSpec, requiredPython);
      if (reprobe.status === "inconclusive") {
        throw new Error(["The Python virtual environment could not be verified after creation.", ...reprobe.evidence].join("\n"));
      }
      if (reprobe.status === "incompatible") {
        throw new Error("The Python virtual environment remains incompatible after creation.");
      }
      evidence.push(`Executed and verified action: ${VENV_CREATE_ACTION}`);
    }
  }

  const pipSteps: readonly Readonly<{id: string; summary: string; execute: () => Promise<void>}>[] = [
    {
      id: PIP_UPGRADE_ACTION,
      summary: "Upgrade pip inside the isolated virtual environment.",
      execute: async () => {
        const upgradeResult = await context.runner.run(
          {command: venvSpec.command, args: [...venvSpec.args, "-m", "pip", "install", "--upgrade", "pip"]},
          {cwd: context.paths.expRoot, output: "tee", logger: context.logger},
        );
        if (!isSuccessfulCommand(upgradeResult)) {
          throw new Error(
            ["Upgrading pip inside the isolated virtual environment failed.", ...commandFailureEvidence(upgradeResult)].join("\n"),
          );
        }
      },
    },
    {
      id: DEPENDENCIES_INSTALL_ACTION,
      summary: "Install pinned development requirements inside the isolated virtual environment.",
      execute: async () => {
        const installResult = await context.runner.run(
          {command: venvSpec.command, args: [...venvSpec.args, "-m", "pip", "install", "-r", context.paths.pythonRequirements]},
          {cwd: context.paths.expRoot, output: "tee", logger: context.logger},
        );
        if (!isSuccessfulCommand(installResult)) {
          throw new Error(
            [
              "Installing Python requirements inside the isolated virtual environment failed.",
              ...commandFailureEvidence(installResult),
            ].join("\n"),
          );
        }
      },
    },
  ];

  for (const step of pipSteps) {
    const disposition = await context.actions.run({id: step.id, scope: "repository", summary: step.summary, execute: step.execute});
    if (disposition === "declined") {
      return declinedResult(step.id, evidence);
    }
    if (disposition === "planned") {
      plannedActions.push(step.id);
      evidence.push(`Planned action: ${step.id}`);
      anyPlanned = true;
    } else {
      evidence.push(`Executed action: ${step.id}`);
    }
  }

  if (anyPlanned) {
    return null;
  }

  const finalCheck = await context.runner.run(
    {command: venvSpec.command, args: [...venvSpec.args, "-m", "pip", "check"]},
    {cwd: context.paths.expRoot},
  );
  if (!isSuccessfulCommand(finalCheck)) {
    return {
      id: "python",
      status: "failed",
      summary: "Python dependencies were installed, but pip check failed inside the isolated virtual environment.",
      evidence: [...evidence, ...commandFailureEvidence(finalCheck)],
      nextActions: ["Resolve the reported pip check failure inside the isolated virtual environment, then rerun setup."],
      durationMs: 0,
    };
  }
  evidence.push("Installed Python dependencies satisfy pip check.");

  const fingerprintDisposition = await context.actions.run({
    id: FINGERPRINT_WRITE_ACTION,
    scope: "repository",
    summary: "Record the successful Python requirements fingerprint.",
    execute: async () => {
      const latest = await readToolingConfig(context.paths.toolingConfig);
      if (latest.status === "invalid") {
        throw new Error(latest.error);
      }
      const currentConfig = latest.status === "valid" ? latest.config : undefined;
      await writeToolingConfig(
        context.paths.toolingConfig,
        mergeToolingConfig(currentConfig, {fingerprints: {pythonRequirementsSha256: requirementsHash}}),
      );
    },
  });
  if (fingerprintDisposition === "declined") {
    return declinedResult(FINGERPRINT_WRITE_ACTION, evidence);
  }
  if (fingerprintDisposition === "planned") {
    plannedActions.push(FINGERPRINT_WRITE_ACTION);
    evidence.push(`Planned action: ${FINGERPRINT_WRITE_ACTION}`);
    return null;
  }
  evidence.push(`Executed action: ${FINGERPRINT_WRITE_ACTION}`);
  return null;
}

async function runPythonSetup(context: SetupContext, dependencies: PythonSetupDependencies): Promise<SetupPhaseResult> {
  const startedAt = context.now();
  const evidence: string[] = [];
  const plannedActions: string[] = [];

  try {
    const initialProbe = await probeInterpreters(context, dependencies.platform);
    evidence.push(...initialProbe.evidence);
    let interpreter = initialProbe.interpreter;

    if (interpreter === null) {
      const packageManagers = await discoverPythonPackageManagers(context, dependencies.platform);
      const proposal = selectPythonInstallationProposal({
        platform: dependencies.platform,
        availablePackageManagers: packageManagers,
        required: context.requirements.python,
      });
      if (proposal === null) {
        return phaseResult(context, startedAt, {
          id: "python",
          status: "failed",
          summary: "A compatible Python interpreter is unavailable and no supported installer was discovered.",
          evidence,
          nextActions: [PYTHON_MANUAL_INSTALL],
        });
      }

      const installDisposition = await context.actions.run({
        id: PYTHON_INSTALL_ACTION,
        scope: "system",
        summary: proposal.explanation,
        execute: async () => {
          const installResult = await context.runner.run(proposal.command, {cwd: context.paths.root, output: "inherit"});
          if (!isSuccessfulCommand(installResult)) {
            throw new Error(
              ["The supported Python interpreter installation command failed.", ...commandFailureEvidence(installResult)].join("\n"),
            );
          }
        },
      });

      if (installDisposition === "declined") {
        return phaseResult(context, startedAt, {
          id: "python",
          status: "failed",
          summary: "Required Python interpreter installation was declined.",
          evidence: [...evidence, `Declined action: ${PYTHON_INSTALL_ACTION}`],
          nextActions: [PYTHON_MANUAL_INSTALL],
        });
      }
      if (installDisposition === "planned") {
        return phaseResult(context, startedAt, {
          id: "python",
          status: "skipped",
          summary: "Required Python interpreter installation and dependent virtual-environment preparation are planned by dry-run.",
          evidence: [...evidence, `Planned action: ${PYTHON_INSTALL_ACTION}`],
          nextActions: [],
        });
      }

      const reprobe = await probeInterpreters(context, dependencies.platform);
      evidence.push(...reprobe.evidence);
      if (reprobe.interpreter === null) {
        return phaseResult(context, startedAt, {
          id: "python",
          status: "failed",
          summary: "A compatible Python interpreter remains unavailable after installation.",
          evidence,
          nextActions: [PYTHON_MANUAL_INSTALL],
        });
      }
      evidence.push(`Executed and verified action: ${PYTHON_INSTALL_ACTION}`);
      interpreter = reprobe.interpreter;
    }

    const venvSpec = pythonInVirtualEnvironment(context.paths.expRoot, dependencies.platform);
    const venvOutcome = await ensureVirtualEnvironment(context, dependencies, interpreter, venvSpec, plannedActions, evidence);
    if (venvOutcome !== null) {
      return phaseResult(context, startedAt, {
        id: venvOutcome.id,
        status: venvOutcome.status,
        summary: venvOutcome.summary,
        evidence: venvOutcome.evidence,
        nextActions: venvOutcome.nextActions,
      });
    }

    if (plannedActions.length > 0) {
      return phaseResult(context, startedAt, {
        id: "python",
        status: "skipped",
        summary: "Required Python virtual-environment preparation actions are planned by dry-run.",
        evidence,
        nextActions: [],
      });
    }

    return phaseResult(context, startedAt, {
      id: "python",
      status: "succeeded",
      summary: "The Python interpreter, isolated virtual environment, and pinned requirements are ready.",
      evidence,
      nextActions: [],
    });
  } catch (error: unknown) {
    if (isInterrupted(error)) {
      throw error;
    }
    return phaseResult(context, startedAt, {
      id: "python",
      status: "failed",
      summary: "The required Python preparation phase failed.",
      evidence: [...evidence, errorMessage(error)],
      nextActions: ["Resolve the reported Python preparation failure, then rerun setup."],
    });
  }
}

/**
 * Creates the Python setup phase with explicit platform and filesystem boundaries.
 *
 * @param dependencies - Optional production-boundary replacements for tests.
 * @returns The independent Python setup phase definition.
 */
export function createPythonSetupPhase(dependencies: Partial<PythonSetupDependencies> = {}): SetupPhaseDefinition {
  const resolvedDependencies: PythonSetupDependencies = {
    platform: dependencies.platform ?? process.platform,
    virtualEnvironmentExists:
      dependencies.virtualEnvironmentExists
      ?? (async (path) => {
        try {
          await stat(path);
          return true;
        } catch (error: unknown) {
          if (hasErrorCode(error, "ENOENT")) {
            return false;
          }
          throw error;
        }
      }),
    removeDirectory:
      dependencies.removeDirectory
      ?? (async (path) => {
        await rm(path, {recursive: true, force: true});
      }),
  };
  return {
    id: "python",
    title: "Python toolchain",
    required: true,
    dependsOn: [],
    run: (context) => runPythonSetup(context, resolvedDependencies),
  };
}

/** Independent required phase that prepares the isolated exp.arolariu.ro Python toolchain. */
export const pythonSetupPhase: SetupPhaseDefinition = createPythonSetupPhase();
