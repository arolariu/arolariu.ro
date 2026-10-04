/**
 * @fileoverview Independent isolated Python interpreter and virtual-environment setup phase.
 * @module scripts/commands/setup/phases/python
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
 * `"python"` in a finalizer around the child command so a failed or interrupted attempt can never
 * leave the shared session cache stale, and then re-inspects `"python"` immediately after an
 * `"executed"` disposition, before any later action can execute or be declined. Planned and
 * declined actions never invalidate anything. A successful mutation command or an `"executed"`
 * disposition alone is never treated as proof of readiness: each mutation asserts its own
 * action-specific postcondition against the refreshed facts. A compatible canonical virtual
 * environment is never recreated, but pip is always upgraded and `requirements-dev.txt` is always
 * (re)installed, each verified from refreshed facts.
 *
 * The phase runs its commands through `Process` with the setup command defaults, removes an
 * incompatible virtual environment through `FileSystem`, and reads the host platform from
 * `Environment`. It owns no ambient Node state and no test-only constructor dependency.
 */

import {Clock, Effect, FileSystem} from "effect";

import type {MinimumVersion} from "../../../common/requirements.ts";
import type {PythonFacts} from "../../../inspection/python.ts";
import type {InspectionOutcome} from "../../../inspection/types.ts";
import {Environment} from "../../../platform/Environment.ts";
import {formatProcessRequest, type ProcessError, type ProcessRequest} from "../../../platform/Process.ts";
import {SetupActionFailed} from "../errors.ts";
import {phaseResult, processFailureOutput, runPhaseCommand, submitSetupAction, type PhaseCommandOutcome} from "../phase-support.ts";
import type {
  InstallationProposal,
  SetupActionScope,
  SetupContext,
  SetupPhaseDefinition,
  SetupPhaseResult,
  SetupRequirements,
} from "../types.ts";

/**
 * Bounded ceiling for every long-running Python interpreter installation and pip mutation.
 *
 * @remarks
 * Setup commands default to a probe-sized timeout, which is correct for a `--version` probe but
 * would truncate an interpreter install or a full requirements install. Each such mutation
 * therefore requests this ceiling explicitly. Capture-only virtual-environment creation keeps the
 * bounded default instead.
 */
const LONG_RUNNING_MUTATION_TIMEOUT_MS = 1_200_000;

/** One completed setup step: either a terminal phase result, or refreshed `python` facts to continue with. */
type PythonStepOutcome = Readonly<{result: SetupPhaseResult}> | Readonly<{facts: PythonFacts}>;

/** Result of evaluating one policy-controlled `python` mutation and its immediate cache refresh. */
type PythonMutationOutcome =
  | Readonly<{disposition: "planned"}>
  | Readonly<{disposition: "declined"}>
  | Readonly<{disposition: "executed"; outcome: InspectionOutcome<PythonFacts>}>;

/** A step of the phase: fails with {@link SetupActionFailed} for a failed required mutation. */
type PythonStep<A> = Effect.Effect<A, SetupActionFailed, SetupRequirements>;

const PYTHON_INSTALL_ACTION = "python.install-interpreter";
const VENV_CREATE_ACTION = "python.venv.create";
const PIP_UPGRADE_ACTION = "python.pip.upgrade";
const DEPENDENCIES_INSTALL_ACTION = "python.dependencies.install";
const PYTHON_MANUAL_INSTALL = "Install a compatible Python interpreter from https://www.python.org/downloads/, then rerun setup.";

function normalizedVersion(version: MinimumVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

/**
 * Converts one failed process into bounded, non-secret evidence.
 *
 * @param error - The process failure.
 * @returns Bounded evidence lines describing the failure.
 */
function commandFailureEvidence(error: ProcessError): readonly string[] {
  const evidence = processFailureOutput(error);
  return [
    ...(error._tag === "ProcessExited" ? [`Command exited with code ${String(error.exitCode)}.`] : []),
    ...(error._tag === "ProcessTimedOut" ? ["Command timed out."] : []),
    ...(error._tag === "ProcessSignalled" ? [`Command stopped with signal ${error.signal}.`] : []),
    ...(error._tag === "ProcessSpawnFailed" ? [`Unable to start command: ${error.message}`] : []),
    ...(evidence === "" ? [] : [evidence]),
  ];
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
  options: Parameters<typeof runPhaseCommand>[2],
): PythonStep<void> {
  return Effect.flatMap(runPhaseCommand(context, request, options), (outcome: PhaseCommandOutcome) =>
    outcome.kind === "succeeded"
      ? Effect.void
      : Effect.fail(new SetupActionFailed({actionId, message: [summary, ...commandFailureEvidence(outcome.error)].join("\n")})),
  );
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
  const formatted = formatProcessRequest({command: facts.selected.command, args: facts.selected.prefixArgs});
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
 * The shared `"python"` fact is invalidated exactly once in a finalizer whenever the child
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
function runPythonMutation(
  context: SetupContext,
  action: Readonly<{id: string; scope: SetupActionScope; summary: string; mutate: PythonStep<void>}>,
): PythonStep<PythonMutationOutcome> {
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
    }).pipe(Effect.ensuring(Effect.suspend(() => (attempted ? context.inspection.invalidate("python") : Effect.void))));

    if (submitted.kind === "failed") {
      return yield* new SetupActionFailed({actionId: action.id, message: submitted.message});
    }
    if (submitted.kind === "planned" || submitted.kind === "declined") {
      return {disposition: submitted.kind};
    }
    return {disposition: "executed", outcome: yield* context.inspection.inspect("python")};
  });
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
export function pythonInVirtualEnvironment(expRoot: string, platform: NodeJS.Platform): ProcessRequest {
  const venvDirectory = virtualEnvironmentDirectory(expRoot, platform);
  return platform === "win32"
    ? {command: `${venvDirectory}\\Scripts\\python.exe`, args: []}
    : {command: `${venvDirectory}/bin/python`, args: []};
}

function hasAptCandidate(result: Readonly<PhaseCommandOutcome>): boolean {
  return result.kind === "succeeded" && /^\s*Candidate:\s*(?!\(none\)\s*$)\S+/imu.test(result.stdout);
}

/**
 * Discovers the qualified package managers of the host platform with read-only probes.
 *
 * @param context - The setup context.
 * @param platform - The host platform.
 * @returns The qualified package-manager markers.
 */
function discoverPythonPackageManagers(context: SetupContext, platform: NodeJS.Platform): PythonStep<ReadonlySet<string>> {
  return Effect.gen(function* () {
    const managers = new Set<string>();
    const probe = (request: ProcessRequest): Effect.Effect<PhaseCommandOutcome, never, SetupRequirements> =>
      runPhaseCommand(context, request, {cwd: context.paths.root});

    if (platform === "win32") {
      const winget = yield* probe({command: "winget", args: ["--version"]});
      if (winget.kind === "succeeded") {
        managers.add("winget");
      }
      return managers;
    }

    if (platform === "darwin") {
      const brew = yield* probe({command: "brew", args: ["--version"]});
      if (brew.kind === "succeeded") {
        managers.add("brew");
      }
      return managers;
    }

    if (platform !== "linux") {
      return managers;
    }

    const [apt, dnf] = yield* Effect.all([probe({command: "apt-get", args: ["--version"]}), probe({command: "dnf", args: ["--version"]})], {
      concurrency: "unbounded",
    });
    if (apt.kind === "succeeded") {
      const [pythonPolicy, venvPolicy] = yield* Effect.all(
        [probe({command: "apt-cache", args: ["policy", "python3.12"]}), probe({command: "apt-cache", args: ["policy", "python3.12-venv"]})],
        {concurrency: "unbounded"},
      );
      if (hasAptCandidate(pythonPolicy) && hasAptCandidate(venvPolicy)) {
        managers.add("apt-get");
      }
    }
    if (dnf.kind === "succeeded") {
      const info = yield* probe({command: "dnf", args: ["info", "python3.12"]});
      if (info.kind === "succeeded") {
        managers.add("dnf");
      }
    }
    return managers;
  });
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
 * @param context - The setup context, including the repository inspection session.
 * @param facts - The `python` facts observed before this step.
 * @param evidence - Mutable accumulator of human-readable phase evidence.
 * @returns Either a terminal phase result, or the facts to continue with.
 */
function ensureInterpreter(context: SetupContext, facts: Readonly<PythonFacts>, evidence: string[]): PythonStep<PythonStepOutcome> {
  return Effect.gen(function* () {
    if (facts.selected !== undefined) {
      return {facts};
    }

    const {platform} = yield* Environment;
    const packageManagers = yield* discoverPythonPackageManagers(context, platform);
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

    const mutation = yield* runPythonMutation(context, {
      id: PYTHON_INSTALL_ACTION,
      scope: "system",
      summary: proposal.explanation,
      mutate: runMutationCommand(
        context,
        PYTHON_INSTALL_ACTION,
        "The supported Python interpreter installation command failed.",
        proposal.command,
        {
          cwd: context.paths.root,
          output: "inherit",
          timeoutMs: LONG_RUNNING_MUTATION_TIMEOUT_MS,
        },
      ),
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
  });
}

/**
 * Ensures the canonical `sites/exp.arolariu.ro/.venv` is compatible, deriving readiness from
 * `PythonFacts.virtualEnvironment` and recreating it only inside the consented
 * `python.venv.create` action when it exists but is incompatible.
 *
 * @param context - The setup context, including the repository inspection session.
 * @param facts - The `python` facts observed before this step (a selected interpreter is required).
 * @param evidence - Mutable accumulator of human-readable phase evidence.
 * @param plannedActions - Mutable accumulator of dry-run-planned action identifiers.
 * @returns Either a terminal phase result, or the facts to continue with.
 */
function ensureVirtualEnvironment(
  context: SetupContext,
  facts: Readonly<PythonFacts>,
  evidence: string[],
  plannedActions: string[],
): PythonStep<PythonStepOutcome> {
  return Effect.gen(function* () {
    const required = context.requirements.python;
    evidence.push(...venvReadinessEvidence(facts.virtualEnvironment, required));
    if (facts.virtualEnvironment.compatible) {
      return {facts};
    }

    const interpreter = facts.selected;
    if (interpreter === undefined) {
      return yield* new SetupActionFailed({
        actionId: VENV_CREATE_ACTION,
        message: "A selected Python interpreter is required before the virtual environment can be created.",
      });
    }

    const {platform} = yield* Environment;
    const venvDirectory = virtualEnvironmentDirectory(context.paths.expRoot, platform);
    const existedBeforeCreation = facts.virtualEnvironment.exists;

    const mutation = yield* runPythonMutation(context, {
      id: VENV_CREATE_ACTION,
      scope: "repository",
      summary: "Create the isolated exp.arolariu.ro Python virtual environment.",
      mutate: Effect.gen(function* () {
        if (existedBeforeCreation) {
          const files = yield* FileSystem.FileSystem;
          yield* files
            .remove(venvDirectory, {recursive: true, force: true})
            .pipe(
              Effect.mapError(
                (error) =>
                  new SetupActionFailed({actionId: VENV_CREATE_ACTION, message: `Failed to remove '${venvDirectory}': ${error.message}`}),
              ),
            );
        }
        yield* runMutationCommand(
          context,
          VENV_CREATE_ACTION,
          "Python virtual environment creation failed.",
          {command: interpreter.command, args: [...interpreter.prefixArgs, "-m", "venv", venvDirectory]},
          {cwd: context.paths.root},
        );
      }),
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
  });
}

interface PipStepDefinition {
  readonly id: string;
  readonly summary: string;
  readonly failureSummary: string;
  readonly command: ProcessRequest;
  /** Bounded, non-secret reasons the refreshed facts do not satisfy this step's postcondition. */
  readonly verify: (facts: Readonly<PythonFacts>) => readonly string[];
}

function pipStepDefinitions(context: SetupContext, venvSpec: Readonly<ProcessRequest>): readonly PipStepDefinition[] {
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
 * @param context - The setup context, including the repository inspection session.
 * @param venvSpec - The venv-owned Python interpreter process request.
 * @param initialFacts - The `python` facts observed before this step.
 * @param evidence - Mutable accumulator of human-readable phase evidence.
 * @param plannedActions - Mutable accumulator of dry-run-planned action identifiers.
 * @returns Either a terminal phase result, or the facts to continue with.
 */
function ensurePipDependencies(
  context: SetupContext,
  venvSpec: Readonly<ProcessRequest>,
  initialFacts: PythonFacts,
  evidence: string[],
  plannedActions: string[],
): PythonStep<PythonStepOutcome> {
  return Effect.gen(function* () {
    let facts = initialFacts;
    for (const step of pipStepDefinitions(context, venvSpec)) {
      const mutation = yield* runPythonMutation(context, {
        id: step.id,
        scope: "repository",
        summary: step.summary,
        mutate: runMutationCommand(context, step.id, step.failureSummary, step.command, {
          cwd: context.paths.expRoot,
          output: "tee",
          timeoutMs: LONG_RUNNING_MUTATION_TIMEOUT_MS,
        }),
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
  });
}

/**
 * Prepares the Python toolchain up to its result, without its duration.
 *
 * @param context - The setup context.
 * @param evidence - Mutable accumulator of human-readable phase evidence.
 * @returns The phase result (its duration is replaced); fails when a required mutation failed.
 */
function preparePython(context: SetupContext, evidence: string[]): PythonStep<Omit<SetupPhaseResult, "durationMs">> {
  return Effect.gen(function* () {
    const plannedActions: string[] = [];
    const initialOutcome = yield* context.inspection.inspect("python");
    if (initialOutcome.kind !== "available") {
      return {
        id: "python",
        status: "failed",
        summary: "The Python environment could not be inspected.",
        evidence: [...evidence, ...unavailableOrInvalidEvidence(initialOutcome)],
        nextActions: [PYTHON_MANUAL_INSTALL],
      };
    }

    let facts = initialOutcome.value;
    evidence.push(...selectedInterpreterEvidence(facts, context.requirements.python));

    const interpreterOutcome = yield* ensureInterpreter(context, facts, evidence);
    if ("result" in interpreterOutcome) {
      return interpreterOutcome.result;
    }
    facts = interpreterOutcome.facts;

    const venvOutcome = yield* ensureVirtualEnvironment(context, facts, evidence, plannedActions);
    if ("result" in venvOutcome) {
      return venvOutcome.result;
    }
    facts = venvOutcome.facts;

    const {platform} = yield* Environment;
    const venvSpec = pythonInVirtualEnvironment(context.paths.expRoot, platform);
    const pipOutcome = yield* ensurePipDependencies(context, venvSpec, facts, evidence, plannedActions);
    if ("result" in pipOutcome) {
      return pipOutcome.result;
    }

    if (plannedActions.length > 0) {
      return {
        id: "python",
        status: "skipped",
        summary: "Required Python preparation actions are planned by dry-run.",
        evidence,
        nextActions: [],
      };
    }

    return {
      id: "python",
      status: "succeeded",
      summary: "The Python interpreter, isolated virtual environment, and pinned requirements are ready.",
      evidence,
      nextActions: [],
    };
  });
}

/**
 * Runs the Python phase: a failed required mutation becomes one failed result naming the reported
 * failure; an interruption propagates.
 *
 * @param context - The setup context.
 * @returns The phase result.
 */
function runPythonSetup(context: SetupContext): Effect.Effect<SetupPhaseResult, never, SetupRequirements> {
  return Effect.gen(function* () {
    const startedAt = yield* Clock.currentTimeMillis;
    const evidence: string[] = [];
    const outcome = yield* Effect.result(preparePython(context, evidence));
    if (outcome._tag === "Success") {
      const {durationMs: _durationMs, ...result} = outcome.success as SetupPhaseResult;
      return yield* phaseResult(startedAt, result);
    }
    return yield* phaseResult(startedAt, {
      id: "python",
      status: "failed",
      summary: "The required Python preparation phase failed.",
      evidence: [...evidence, outcome.failure.message],
      nextActions: ["Resolve the reported Python preparation failure, then rerun setup."],
    });
  }).pipe(Effect.withSpan("setup.python"));
}

/**
 * Creates the Python setup phase.
 *
 * @remarks
 * The phase accepts no host or filesystem boundary: the platform, processes, the recursive-removal
 * filesystem, and the clock all come from the invocation services, so a test replaces them through
 * its layer rather than on this factory.
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
