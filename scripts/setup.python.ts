/**
 * @fileoverview Independent isolated Python interpreter and virtual-environment setup phase.
 * @module scripts.setup.python
 *
 * @remarks
 * Every read-only Python observation (fixed-candidate interpreter availability, the selected
 * manifest-compatible interpreter, canonical `sites/exp.arolariu.ro/.venv` compatibility, pip
 * availability/conflicts, and tracked-requirement mismatches) is consumed exclusively through
 * `context.inspection.inspect("python")`. This phase never re-probes an interpreter version or the
 * virtual environment itself, never hashes `requirements-dev.txt`, and never reads or writes the
 * repository-local tooling configuration.
 *
 * Every attempted mutation runs through {@link runPythonMutation}, which invalidates exactly
 * `"python"` in a `finally` block around the child command so a failed or interrupted attempt can
 * never leave the shared session cache stale, and then re-inspects `"python"` immediately after an
 * `"executed"` disposition, before any later action can execute or be declined. Planned and
 * declined actions never invalidate anything. A successful mutation command or an `"executed"`
 * disposition alone is never treated as proof of readiness: each mutation asserts its own
 * action-specific postcondition against the refreshed facts. A compatible canonical virtual
 * environment is never recreated, but pip is always upgraded and `requirements-dev.txt` is always
 * (re)installed, each verified from refreshed facts.
 *
 * The phase reads every capability from the invocation-scoped {@link SetupPhaseRuntime}: the
 * process runner, the clock, the task scheduler, the recursive-removal filesystem, and the
 * host-platform snapshot. It owns no ambient Node state and no test-only constructor dependency.
 */

import {formatProcessExecutionRequest, type ProcessExecutionRequest} from "./core/process/process-execution-request.ts";
import {
  processExecutionFailureEvidence,
  type ProcessExecutionResult,
  type SucceededProcessExecutionResult,
} from "./core/process/process-execution-result.ts";
import {CommandCancellation} from "./common/runtime.ts";
import type {MinimumVersion} from "./common/requirements.ts";
import type {PythonFacts} from "./inspection/python.ts";
import type {InspectionOutcome} from "./inspection/types.ts";
import {
  requireSetupPhaseRuntime,
  type InstallationProposal,
  type SetupActionScope,
  type SetupContext,
  type SetupPhaseDefinition,
  type SetupPhaseResult,
  type SetupPhaseRuntime,
} from "./setup.types.ts";

/**
 * Bounded ceiling for every long-running Python interpreter installation and pip mutation.
 *
 * @remarks
 * The invocation-scoped runner defaults to a probe-sized timeout, which is correct for a
 * `--version` probe but would truncate an interpreter install or a full requirements install. Each
 * such mutation therefore requests this ceiling explicitly, preserving the pre-migration mutation
 * timeout the deprecated setup runner bridge used to supply implicitly for `tee`/`inherit` output.
 * Capture-only virtual-environment creation keeps the runner's own bounded default instead.
 */
const LONG_RUNNING_MUTATION_TIMEOUT_MS = 1_200_000;

/** One completed setup step: either a terminal phase result, or refreshed `python` facts to continue with. */
type PythonStepOutcome = Readonly<{result: SetupPhaseResult}> | Readonly<{facts: PythonFacts}>;

/** Result of evaluating one policy-controlled `python` mutation and its immediate cache refresh. */
type PythonMutationOutcome =
  | Readonly<{disposition: "planned"}>
  | Readonly<{disposition: "declined"}>
  | Readonly<{disposition: "executed"; outcome: InspectionOutcome<PythonFacts>}>;

const PYTHON_INSTALL_ACTION = "python.install-interpreter";
const VENV_CREATE_ACTION = "python.venv.create";
const PIP_UPGRADE_ACTION = "python.pip.upgrade";
const DEPENDENCIES_INSTALL_ACTION = "python.dependencies.install";
const PYTHON_MANUAL_INSTALL = "Install a compatible Python interpreter from https://www.python.org/downloads/, then rerun setup.";

function isSuccessfulOutcome(outcome: Readonly<ProcessExecutionResult>): outcome is SucceededProcessExecutionResult {
  return outcome.kind === "succeeded";
}

function isInterrupted(error: unknown): boolean {
  return error instanceof CommandCancellation || (error instanceof Error && error.name === "AbortError");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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

function normalizedVersion(version: MinimumVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

/**
 * Converts one failed/interrupted process outcome into bounded, non-secret evidence.
 *
 * @param outcome - A non-`"succeeded"` {@link ProcessExecutionResult}.
 * @param context - Shared setup dependencies, whose logger sanitizes the rendered evidence.
 * @returns Bounded, sanitized evidence lines describing the failure.
 */
function commandFailureEvidence(
  outcome: Readonly<Exclude<ProcessExecutionResult, SucceededProcessExecutionResult>>,
  context: SetupContext,
): readonly string[] {
  const evidence = processExecutionFailureEvidence(outcome, context.logger);
  return [
    ...(outcome.kind === "exited" ? [`Command exited with code ${outcome.exitCode}.`] : []),
    ...(outcome.kind === "timed-out" ? ["Command timed out."] : []),
    ...(outcome.kind === "signalled" ? [`Command stopped with signal ${outcome.signal}.`] : []),
    ...(outcome.kind === "cancelled" ? ["Command was cancelled."] : []),
    ...(outcome.kind === "spawn-failed" ? [`Unable to start command: ${outcome.message}`] : []),
    ...(evidence === "" ? [] : [evidence]),
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
 * Converts an unavailable/invalid `python` inspection outcome into bounded, non-secret evidence.
 *
 * @param outcome - A non-`"available"` {@link InspectionOutcome} for `python`.
 * @returns At least one evidence line; never raw command output.
 */
function unavailableOrInvalidEvidence(outcome: Readonly<InspectionOutcome<PythonFacts>>): readonly string[] {
  if (outcome.kind === "unavailable") {
    return [outcome.reason];
  }
  if (outcome.kind === "invalid") {
    return [...outcome.issues];
  }
  return [];
}

/**
 * Describes whether an already-observed selected interpreter satisfies the manifest requirement.
 *
 * @param facts - The newest verified `python` facts.
 * @param required - The manifest-derived minimum Python version.
 * @returns Bounded, non-secret evidence describing the selected-interpreter outcome.
 */
function selectedInterpreterEvidence(facts: Readonly<PythonFacts>, required: MinimumVersion): readonly string[] {
  if (facts.selected === undefined) {
    return [`No available interpreter satisfies >=${normalizedVersion(required)}.`];
  }
  const formatted = formatProcessExecutionRequest({command: facts.selected.command, args: facts.selected.prefixArgs});
  return [`Selected interpreter '${formatted}' (Python ${facts.selected.version}) satisfies >=${normalizedVersion(required)}.`];
}

/**
 * Describes the canonical `sites/exp.arolariu.ro/.venv` readiness observed from facts.
 *
 * @param venv - The newest verified virtual-environment facts.
 * @param required - The manifest-derived minimum Python version.
 * @returns Bounded, non-secret evidence describing the virtual-environment outcome.
 */
function venvReadinessEvidence(venv: Readonly<PythonFacts["virtualEnvironment"]>, required: MinimumVersion): readonly string[] {
  if (!venv.exists) {
    return ["The isolated virtual environment does not exist."];
  }
  if (!venv.compatible) {
    return [
      venv.version === undefined
        ? "The isolated virtual environment is not a canonical, isolated Python installation."
        : `The isolated virtual environment uses Python ${venv.version}, or is not canonical/isolated; it does not satisfy >=${normalizedVersion(required)}.`,
    ];
  }
  return [`The isolated virtual environment satisfies >=${normalizedVersion(required)}.`];
}

/**
 * Runs one policy-controlled `python` mutation with cache-freshness guarantees.
 *
 * The shared `"python"` fact is invalidated exactly once inside a `finally` block whenever the
 * child mutation was actually attempted, so a thrown, timed-out, or interrupted attempt can never
 * leave a partially mutated machine described by stale cached facts. A `"planned"` or `"declined"`
 * action never attempts the mutation and therefore never invalidates anything. After an
 * `"executed"` disposition the already-invalidated key is inspected exactly once, before any later
 * action can execute or be declined.
 *
 * @param context - Shared setup dependencies, including the repository inspection session.
 * @param action - Action identity, scope, summary, and the mutation to attempt.
 * @returns The action disposition, plus the refreshed outcome when the mutation executed.
 * @throws Whatever the mutation or the action executor throws, including `AbortError`.
 */
async function runPythonMutation(
  context: SetupContext,
  action: Readonly<{id: string; scope: SetupActionScope; summary: string; mutate: () => Promise<void>}>,
): Promise<PythonMutationOutcome> {
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
      context.inspection.invalidate("python");
    }
  }
  return {disposition: "executed", outcome: await context.inspection.inspect("python")};
}

function virtualEnvironmentDirectory(expRoot: string, platform: NodeJS.Platform): string {
  return platform === "win32" ? `${expRoot}\\.venv` : `${expRoot}/.venv`;
}

/**
 * Resolves the isolated `exp.arolariu.ro` virtual-environment interpreter path.
 *
 * @param expRoot - Absolute path to the experimental service root.
 * @param platform - Target process platform.
 * @returns A process request whose executable is the venv-owned Python interpreter.
 */
export function pythonInVirtualEnvironment(expRoot: string, platform: NodeJS.Platform): ProcessExecutionRequest {
  const venvDirectory = virtualEnvironmentDirectory(expRoot, platform);
  return platform === "win32"
    ? {command: `${venvDirectory}\\Scripts\\python.exe`, args: []}
    : {command: `${venvDirectory}/bin/python`, args: []};
}

function hasAptCandidate(result: Readonly<ProcessExecutionResult>): boolean {
  return isSuccessfulOutcome(result) && /^\s*Candidate:\s*(?!\(none\)\s*$)\S+/imu.test(result.stdout);
}

async function discoverPythonPackageManagers(
  context: SetupContext,
  runtime: SetupPhaseRuntime,
  platform: NodeJS.Platform,
): Promise<ReadonlySet<string>> {
  const managers = new Set<string>();

  if (platform === "win32") {
    const winget = await runtime.runner.run({command: "winget", args: ["--version"]}, {cwd: context.paths.root});
    if (isSuccessfulOutcome(winget)) {
      managers.add("winget");
    }
    return managers;
  }

  if (platform === "darwin") {
    const brew = await runtime.runner.run({command: "brew", args: ["--version"]}, {cwd: context.paths.root});
    if (isSuccessfulOutcome(brew)) {
      managers.add("brew");
    }
    return managers;
  }

  if (platform !== "linux") {
    return managers;
  }

  const [apt, dnf] = await runtime.tasks.parallel([
    () => runtime.runner.run({command: "apt-get", args: ["--version"]}, {cwd: context.paths.root}),
    () => runtime.runner.run({command: "dnf", args: ["--version"]}, {cwd: context.paths.root}),
  ]);
  if (apt !== undefined && isSuccessfulOutcome(apt)) {
    const [pythonPolicy, venvPolicy] = await runtime.tasks.parallel([
      () => runtime.runner.run({command: "apt-cache", args: ["policy", "python3.12"]}, {cwd: context.paths.root}),
      () => runtime.runner.run({command: "apt-cache", args: ["policy", "python3.12-venv"]}, {cwd: context.paths.root}),
    ]);
    if (pythonPolicy !== undefined && venvPolicy !== undefined && hasAptCandidate(pythonPolicy) && hasAptCandidate(venvPolicy)) {
      managers.add("apt-get");
    }
  }
  if (dnf !== undefined && isSuccessfulOutcome(dnf)) {
    const info = await runtime.runner.run({command: "dnf", args: ["info", "python3.12"]}, {cwd: context.paths.root});
    if (isSuccessfulOutcome(info)) {
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

/**
 * Ensures a compatible Python interpreter is selected, consuming shared `python` facts for every
 * readiness observation and installing only through the reviewed proposal contract.
 *
 * @param context - Shared setup dependencies, including the repository inspection session.
 * @param runtime - Invocation-scoped capabilities, including the host-platform snapshot.
 * @param facts - The `python` facts observed before this step.
 * @param evidence - Mutable accumulator of human-readable phase evidence.
 * @returns Either a terminal phase result, or the facts to continue with.
 */
async function ensureInterpreter(
  context: SetupContext,
  runtime: SetupPhaseRuntime,
  facts: Readonly<PythonFacts>,
  evidence: string[],
): Promise<PythonStepOutcome> {
  if (facts.selected !== undefined) {
    return {facts};
  }

  const {platform} = runtime.environment;
  const packageManagers = await discoverPythonPackageManagers(context, runtime, platform);
  const proposal = selectPythonInstallationProposal({
    platform,
    availablePackageManagers: packageManagers,
    required: context.requirements.python,
  });
  if (proposal === null) {
    return {
      result: {
        id: "python",
        status: "failed",
        summary: "A compatible Python interpreter is unavailable and no supported installer was discovered.",
        evidence,
        nextActions: [PYTHON_MANUAL_INSTALL],
        durationMs: 0,
      },
    };
  }

  const mutation = await runPythonMutation(context, {
    id: PYTHON_INSTALL_ACTION,
    scope: "system",
    summary: proposal.explanation,
    mutate: async () => {
      const installResult = await runtime.runner.run(proposal.command, {
        cwd: context.paths.root,
        output: "inherit",
        timeoutMs: LONG_RUNNING_MUTATION_TIMEOUT_MS,
      });
      if (!isSuccessfulOutcome(installResult)) {
        throw new Error(
          ["The supported Python interpreter installation command failed.", ...commandFailureEvidence(installResult, context)].join("\n"),
        );
      }
    },
  });

  if (mutation.disposition === "declined") {
    return {
      result: {
        id: "python",
        status: "failed",
        summary: "Required Python interpreter installation was declined.",
        evidence: [...evidence, `Declined action: ${PYTHON_INSTALL_ACTION}`],
        nextActions: [PYTHON_MANUAL_INSTALL],
        durationMs: 0,
      },
    };
  }
  if (mutation.disposition === "planned") {
    return {
      result: {
        id: "python",
        status: "skipped",
        summary: "Required Python interpreter installation and dependent virtual-environment preparation are planned by dry-run.",
        evidence: [...evidence, `Planned action: ${PYTHON_INSTALL_ACTION}`],
        nextActions: [],
        durationMs: 0,
      },
    };
  }

  // The install command exiting successfully is never sufficient proof of readiness: the
  // interpreter requirement is only satisfied once refreshed, invalidated facts select one.
  const refreshed = mutation.outcome;
  if (refreshed.kind !== "available") {
    return {
      result: {
        id: "python",
        status: "failed",
        summary: "The Python interpreter could not be verified after installation.",
        evidence: [...evidence, ...unavailableOrInvalidEvidence(refreshed)],
        nextActions: [PYTHON_MANUAL_INSTALL],
        durationMs: 0,
      },
    };
  }
  evidence.push(...selectedInterpreterEvidence(refreshed.value, context.requirements.python));
  if (refreshed.value.selected === undefined) {
    return {
      result: {
        id: "python",
        status: "failed",
        summary: "A compatible Python interpreter remains unavailable after installation.",
        evidence,
        nextActions: [PYTHON_MANUAL_INSTALL],
        durationMs: 0,
      },
    };
  }
  evidence.push(`Executed and verified action: ${PYTHON_INSTALL_ACTION}`);
  return {facts: refreshed.value};
}

/**
 * Ensures the canonical `sites/exp.arolariu.ro/.venv` is compatible, deriving readiness from
 * `PythonFacts.virtualEnvironment` and recreating it only inside the consented
 * `python.venv.create` action when it exists but is incompatible.
 *
 * @param context - Shared setup dependencies, including the repository inspection session.
 * @param runtime - Invocation-scoped capabilities, including the host platform and the recursive
 * removal filesystem.
 * @param facts - The `python` facts observed before this step (a selected interpreter is required).
 * @param evidence - Mutable accumulator of human-readable phase evidence.
 * @param plannedActions - Mutable accumulator of dry-run-planned action identifiers.
 * @returns Either a terminal phase result, or the facts to continue with.
 */
async function ensureVirtualEnvironment(
  context: SetupContext,
  runtime: SetupPhaseRuntime,
  facts: Readonly<PythonFacts>,
  evidence: string[],
  plannedActions: string[],
): Promise<PythonStepOutcome> {
  const required = context.requirements.python;
  evidence.push(...venvReadinessEvidence(facts.virtualEnvironment, required));
  if (facts.virtualEnvironment.compatible) {
    return {facts};
  }

  const interpreter = facts.selected;
  if (interpreter === undefined) {
    throw new Error("A selected Python interpreter is required before the virtual environment can be created.");
  }

  const venvDirectory = virtualEnvironmentDirectory(context.paths.expRoot, runtime.environment.platform);
  const existedBeforeCreation = facts.virtualEnvironment.exists;

  const mutation = await runPythonMutation(context, {
    id: VENV_CREATE_ACTION,
    scope: "repository",
    summary: "Create the isolated exp.arolariu.ro Python virtual environment.",
    mutate: async () => {
      if (existedBeforeCreation) {
        await runtime.files.remove(venvDirectory, {recursive: true, force: true});
      }
      const createResult = await runtime.runner.run(
        {command: interpreter.command, args: [...interpreter.prefixArgs, "-m", "venv", venvDirectory]},
        {cwd: context.paths.root},
      );
      if (!isSuccessfulOutcome(createResult)) {
        throw new Error(["Python virtual environment creation failed.", ...commandFailureEvidence(createResult, context)].join("\n"));
      }
    },
  });

  if (mutation.disposition === "declined") {
    return {result: declinedResult(VENV_CREATE_ACTION, evidence)};
  }
  if (mutation.disposition === "planned") {
    plannedActions.push(VENV_CREATE_ACTION);
    evidence.push(`Planned action: ${VENV_CREATE_ACTION}`);
    return {facts};
  }

  // A successful `venv` creation command is never sufficient proof of readiness: the environment
  // is only ready once refreshed, invalidated facts confirm a selected, compatible canonical venv.
  const refreshed = mutation.outcome;
  if (refreshed.kind !== "available" || refreshed.value.selected === undefined || !refreshed.value.virtualEnvironment.compatible) {
    return {
      result: {
        id: "python",
        status: "failed",
        summary: "The Python virtual environment remains incompatible after creation.",
        evidence: [...evidence, `Failed postcondition for action: ${VENV_CREATE_ACTION}`, ...unavailableOrInvalidEvidence(refreshed)],
        nextActions: [`Resolve and rerun required action '${VENV_CREATE_ACTION}'.`],
        durationMs: 0,
      },
    };
  }
  evidence.push(`Executed and verified action: ${VENV_CREATE_ACTION}`);
  return {facts: refreshed.value};
}

interface PipStepDefinition {
  readonly id: string;
  readonly summary: string;
  readonly failureSummary: string;
  readonly command: ProcessExecutionRequest;
  /** Bounded, non-secret reasons the refreshed facts do not satisfy this step's postcondition. */
  readonly verify: (facts: Readonly<PythonFacts>) => readonly string[];
}

function pipStepDefinitions(context: SetupContext, venvSpec: Readonly<ProcessExecutionRequest>): readonly PipStepDefinition[] {
  return [
    {
      id: PIP_UPGRADE_ACTION,
      summary: "Upgrade pip inside the isolated virtual environment.",
      failureSummary: "Upgrading pip inside the isolated virtual environment failed.",
      command: {command: venvSpec.command, args: [...venvSpec.args, "-m", "pip", "install", "--upgrade", "pip"]},
      verify: (facts) => [
        ...(facts.virtualEnvironment.compatible ? [] : ["The isolated virtual environment is not compatible after upgrading pip."]),
        ...(facts.pip.available ? [] : ["pip is not available inside the isolated virtual environment after upgrading pip."]),
      ],
    },
    {
      id: DEPENDENCIES_INSTALL_ACTION,
      summary: "Install pinned development requirements inside the isolated virtual environment.",
      failureSummary: "Installing Python requirements inside the isolated virtual environment failed.",
      command: {command: venvSpec.command, args: [...venvSpec.args, "-m", "pip", "install", "-r", context.paths.pythonRequirements]},
      verify: (facts) => [
        ...(facts.virtualEnvironment.compatible
          ? []
          : ["The isolated virtual environment is not compatible after installing requirements."]),
        ...(facts.pip.available ? [] : ["pip is not available inside the isolated virtual environment after installing requirements."]),
        ...facts.pip.conflicts,
        ...facts.requirements.mismatches,
      ],
    },
  ];
}

/**
 * Plans or executes the venv-owned pip upgrade and pinned dependency install, in order, verifying
 * every executed step against its own action-specific postcondition from immediately refreshed
 * `python` facts. Every real setup run reaches both steps, even when the canonical virtual
 * environment was already compatible: a successful command is never treated as proof of readiness.
 *
 * @param context - Shared setup dependencies, including the repository inspection session.
 * @param runtime - Invocation-scoped capabilities the pip commands run through.
 * @param venvSpec - The venv-owned Python interpreter process request.
 * @param facts - The `python` facts observed before this step.
 * @param evidence - Mutable accumulator of human-readable phase evidence.
 * @param plannedActions - Mutable accumulator of dry-run-planned action identifiers.
 * @returns Either a terminal phase result, or the facts to continue with.
 */
async function ensurePipDependencies(
  context: SetupContext,
  runtime: SetupPhaseRuntime,
  venvSpec: Readonly<ProcessExecutionRequest>,
  facts: PythonFacts,
  evidence: string[],
  plannedActions: string[],
): Promise<PythonStepOutcome> {
  for (const step of pipStepDefinitions(context, venvSpec)) {
    const mutation = await runPythonMutation(context, {
      id: step.id,
      scope: "repository",
      summary: step.summary,
      mutate: async () => {
        const result = await runtime.runner.run(step.command, {
          cwd: context.paths.expRoot,
          output: "tee",
          presenter: context.logger,
          timeoutMs: LONG_RUNNING_MUTATION_TIMEOUT_MS,
        });
        if (!isSuccessfulOutcome(result)) {
          throw new Error([step.failureSummary, ...commandFailureEvidence(result, context)].join("\n"));
        }
      },
    });

    if (mutation.disposition === "declined") {
      return {result: declinedResult(step.id, evidence)};
    }
    if (mutation.disposition === "planned") {
      plannedActions.push(step.id);
      evidence.push(`Planned action: ${step.id}`);
      continue;
    }

    const refreshed = mutation.outcome;
    if (refreshed.kind !== "available") {
      return {
        result: {
          id: "python",
          status: "failed",
          summary: `The Python setup action '${step.id}' could not be verified.`,
          evidence: [...evidence, `Failed postcondition for action: ${step.id}`, ...unavailableOrInvalidEvidence(refreshed)],
          nextActions: ["Resolve the reported Python preparation failure, then rerun setup."],
          durationMs: 0,
        },
      };
    }
    const failures = step.verify(refreshed.value);
    if (failures.length > 0) {
      return {
        result: {
          id: "python",
          status: "failed",
          summary: `The Python setup action '${step.id}' did not satisfy its postcondition.`,
          evidence: [...evidence, `Failed postcondition for action: ${step.id}`, ...failures],
          nextActions: [`Resolve and rerun required action '${step.id}'.`],
          durationMs: 0,
        },
      };
    }
    facts = refreshed.value;
    evidence.push(`Executed and verified action: ${step.id}`);
  }
  return {facts};
}

async function runPythonSetup(context: SetupContext): Promise<SetupPhaseResult> {
  const runtime = requireSetupPhaseRuntime(context);
  const startedAt = runtime.clock.monotonicNow();
  const evidence: string[] = [];
  const plannedActions: string[] = [];

  try {
    const initialOutcome = await context.inspection.inspect("python");
    if (initialOutcome.kind !== "available") {
      return phaseResult(runtime, startedAt, {
        id: "python",
        status: "failed",
        summary: "The Python environment could not be inspected.",
        evidence: [...evidence, ...unavailableOrInvalidEvidence(initialOutcome)],
        nextActions: [PYTHON_MANUAL_INSTALL],
      });
    }

    let facts = initialOutcome.value;
    evidence.push(...selectedInterpreterEvidence(facts, context.requirements.python));

    const interpreterOutcome = await ensureInterpreter(context, runtime, facts, evidence);
    if ("result" in interpreterOutcome) {
      return phaseResult(runtime, startedAt, interpreterOutcome.result);
    }
    facts = interpreterOutcome.facts;

    const venvOutcome = await ensureVirtualEnvironment(context, runtime, facts, evidence, plannedActions);
    if ("result" in venvOutcome) {
      return phaseResult(runtime, startedAt, venvOutcome.result);
    }
    facts = venvOutcome.facts;

    const venvSpec = pythonInVirtualEnvironment(context.paths.expRoot, runtime.environment.platform);
    const pipOutcome = await ensurePipDependencies(context, runtime, venvSpec, facts, evidence, plannedActions);
    if ("result" in pipOutcome) {
      return phaseResult(runtime, startedAt, pipOutcome.result);
    }

    if (plannedActions.length > 0) {
      return phaseResult(runtime, startedAt, {
        id: "python",
        status: "skipped",
        summary: "Required Python preparation actions are planned by dry-run.",
        evidence,
        nextActions: [],
      });
    }

    return phaseResult(runtime, startedAt, {
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
    return phaseResult(runtime, startedAt, {
      id: "python",
      status: "failed",
      summary: "The required Python preparation phase failed.",
      evidence: [...evidence, errorMessage(error)],
      nextActions: ["Resolve the reported Python preparation failure, then rerun setup."],
    });
  }
}

/**
 * Creates the Python setup phase over the invocation-scoped setup phase runtime.
 *
 * @remarks
 * The phase no longer accepts a host or filesystem-removal boundary: the platform, the process
 * runner, the recursive-removal filesystem, and the clock all come from {@link SetupPhaseRuntime},
 * so a test replaces capabilities on the runtime rather than on this factory.
 *
 * @returns The independent Python setup phase definition.
 */
export function createPythonSetupPhase(): SetupPhaseDefinition {
  return {
    id: "python",
    title: "Python toolchain",
    required: true,
    dependsOn: [],
    run: (context) => runPythonSetup(context),
  };
}

/** Independent required phase that prepares the isolated exp.arolariu.ro Python toolchain. */
export const pythonSetupPhase: SetupPhaseDefinition = createPythonSetupPhase();
