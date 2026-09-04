/**
 * @fileoverview End-to-end orchestration: the feature runtime context, its typed failure union,
 * and the workflow module `test:e2e` loads lazily. It expands `all` into the preserved execution
 * order and runs each target strictly one at a time, so a failure never starts an unreached target.
 * Per target it resolves the collection and environment paths, enforces the auth policy, registers
 * the token for redaction before any command is constructed, registers report cleanup immediately
 * before the Newman invocation, and runs Newman. Because cleanup is registered before the launch it
 * always runs during this invocation's drain, so a Newman failure keeps its own process error as
 * the primary outcome while a later sanitization failure is appended as cleanup evidence, and a
 * successful run with a failing report step still fails the command.
 * @module scripts/features/end-to-end/workflow */

import {resolve} from "node:path";

import type {TerminalPresenter} from "../../core/presentation/terminal-presenter.ts";
import {CommandCancellation, commandCancellationFromSignal} from "../../core/runtime/cancellation.ts";
import type {
  BaseWorkflowRuntimeExecutionContext,
  EnvironmentRuntimeCapability,
  FilesystemRuntimeCapability,
  ProcessRuntimeCapability,
} from "../../core/runtime/runtime-capability.ts";
import {defineWorkflowModule, type CommandWorkflowModuleDefinition} from "../../core/workflow/workflow-composition.ts";
import {failedWorkflowExecution, succeededWorkflowExecution} from "../../core/workflow/workflow-execution-result.ts";
import type {WorkflowSpecification} from "../../core/workflow/workflow-specification.ts";
import type {EndToEndInput} from "./input.ts";
import {planNewmanInvocation, resolveEndToEndEnvironmentProfile, runNewmanInvocation} from "./newman-invocation.ts";
import {performEndToEndReportCleanup} from "./report-cleanup.ts";
import {
  endToEndTargetConfigurations,
  expandEndToEndTargets,
  requireValidEndToEndTarget,
  type EndToEndTarget,
  type RunnableEndToEndTarget,
} from "./targets.ts";

/** The exact capability subset one end-to-end invocation observes: the base workflow scope plus a
 * filesystem, a process runner, and the environment snapshot every path and option derives from. */
export type EndToEndRuntimeExecutionContext = Readonly<
  BaseWorkflowRuntimeExecutionContext & FilesystemRuntimeCapability & ProcessRuntimeCapability & EnvironmentRuntimeCapability
>;

/** Every typed way one end-to-end invocation can fail outright. */
export type EndToEndFailure =
  | {readonly kind: "collection-missing"; readonly target: RunnableEndToEndTarget; readonly path: string}
  | {readonly kind: "environment-missing"; readonly target: RunnableEndToEndTarget; readonly path: string}
  | {readonly kind: "auth-token-missing"; readonly target: RunnableEndToEndTarget}
  | {readonly kind: "newman-failed"; readonly target: RunnableEndToEndTarget; readonly cause: unknown};

/** Typed business result produced by one end-to-end invocation. */
export interface EndToEndResult {
  /** Every target this invocation ran, in the exact order they were attempted. */
  readonly targets: readonly RunnableEndToEndTarget[];
  /** Targets whose Newman run completed before invocation cleanup, in completion order. */
  readonly completed: readonly RunnableEndToEndTarget[];
}

/** Carries one typed failure out of the target loop without losing its attribution. */
class EndToEndTargetFault extends Error {
  /** The typed failure this fault classifies into. */
  public readonly failure: EndToEndFailure;

  public constructor(failure: EndToEndFailure, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : {cause});
    this.name = "EndToEndTargetFault";
    this.failure = failure;
  }
}

/** Validated target for one in-flight invocation, keyed by the exact feature context
 * `createContext` built for it. Keeping it out of the context keeps the published feature context
 * exactly the declared capability set, and keying it by identity keeps two concurrent invocations
 * from ever observing each other's target. */
const targetByFeatureContext = new WeakMap<EndToEndRuntimeExecutionContext, EndToEndTarget>();

/** Resolves the auth token for one target, enforcing that target's policy and registering any
 * present token for redaction before a command can be constructed from it.
 * @returns The token to transport, or `undefined` when none is transported.
 * @throws {EndToEndTargetFault} When a required token is absent.
 */ function resolveTargetAuthToken(target: RunnableEndToEndTarget, rawToken: string, presenter: TerminalPresenter): string | undefined {
  const {authPolicy} = endToEndTargetConfigurations[target];
  if (authPolicy === "required" && rawToken.length === 0) {
    throw new EndToEndTargetFault(
      {kind: "auth-token-missing", target},
      `E2E_TEST_AUTH_TOKEN environment variable is required for ${target}.`,
    );
  }
  if (authPolicy === "optional" && rawToken.length === 0) {
    presenter.warn(`E2E_TEST_AUTH_TOKEN is not set. Continuing ${target} run without auth token injection.`);
  }
  if (authPolicy === "ignored" && rawToken.length > 0) {
    presenter.info(`${target} does not require auth token; skipping auth injection.`);
  }
  if (rawToken.length > 0) {
    presenter.redact(rawToken);
  }

  return authPolicy !== "ignored" && rawToken.length > 0 ? rawToken : undefined;
}

/** Runs the Newman testing flow for a single target: resolves paths, validates the auth-token
 * policy, registers report cleanup, and runs Newman.
 * @throws {EndToEndTargetFault} When a fixture is missing, a required token is absent, or Newman
 * did not succeed. */
async function runEndToEndTarget(context: EndToEndRuntimeExecutionContext, target: RunnableEndToEndTarget): Promise<void> {
  const {files, runner, signal, cleanup, environment} = context;
  const {variables: env, cwd} = environment;
  const presenter = context.presenter.child(target);
  const {directory} = endToEndTargetConfigurations[target];

  const collectionPath = resolve(cwd, directory, "postman-collection.json");
  const profile = resolveEndToEndEnvironmentProfile(env);
  const environmentPath = resolve(cwd, directory, `postman-environment.${profile}.json`);
  if (!(await files.exists(collectionPath))) {
    throw new EndToEndTargetFault(
      {kind: "collection-missing", target, path: collectionPath},
      `Collection file not found: ${collectionPath}`,
    );
  }
  if (!(await files.exists(environmentPath))) {
    throw new EndToEndTargetFault(
      {kind: "environment-missing", target, path: environmentPath},
      `Environment file not found: ${environmentPath}`,
    );
  }

  const authToken = resolveTargetAuthToken(target, (env["E2E_TEST_AUTH_TOKEN"] ?? "").trim(), presenter);
  presenter.section(`E2E Testing: ${target}`, "🧪");
  presenter.line(`Collection: ${collectionPath}`);
  presenter.line(`Environment: ${environmentPath} (${profile})`);

  const plan = await planNewmanInvocation({files, presenter, env, cwd, target, collectionPath, environmentPath, authToken});

  // Registered before the Newman launch so cleanup always runs the report work for this target,
  // regardless of how the Newman invocation below concludes.
  cleanup.register(`e2e report cleanup (${target})`, () =>
    performEndToEndReportCleanup(files, target, plan.reportDirectory, presenter, authToken),
  );

  try {
    await runNewmanInvocation({runner, presenter, signal, cwd, args: plan.args});
  } catch (error: unknown) {
    if (error instanceof CommandCancellation) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new EndToEndTargetFault({kind: "newman-failed", target, cause: error}, message, error);
  }

  presenter.success(`Completed Newman tests for: ${target}`);
}

/** Runs every selected target strictly one at a time.
 * @returns The expanded target list and every target that completed before this invocation ended. */
async function executeEndToEnd(context: EndToEndRuntimeExecutionContext): Promise<EndToEndResult> {
  const {signal, presenter} = context;
  const validatedTarget = targetByFeatureContext.get(context);
  if (validatedTarget === undefined) {
    throw new Error("The end-to-end workflow ran without a validated target.");
  }

  const targets = expandEndToEndTargets(validatedTarget);
  const completed: RunnableEndToEndTarget[] = [];
  presenter.section("arolariu.ro E2E Test Runner", "🎯");

  for (const target of targets) {
    if (signal.aborted) throw commandCancellationFromSignal(signal);
    // Intentionally sequential: an earlier target's report cleanup must be registered, and a
    // failure must never start a target that has not been reached yet.
    // eslint-disable-next-line no-await-in-loop
    await runEndToEndTarget(context, target);
    completed.push(target);
  }

  return {targets, completed};
}

const endToEndSpecification: WorkflowSpecification<EndToEndRuntimeExecutionContext, EndToEndResult, EndToEndFailure> = {
  name: "test:e2e",
  execute: async (context) => succeededWorkflowExecution(await executeEndToEnd(context)),
  classifyUnexpectedFault: (error) => (error instanceof EndToEndTargetFault ? failedWorkflowExecution(error.failure) : undefined),
};

/** The lazily loaded workflow module `scripts/features/end-to-end/command.ts` runs. */
export const endToEndWorkflowModule: CommandWorkflowModuleDefinition<
  EndToEndInput,
  EndToEndResult,
  EndToEndFailure,
  EndToEndRuntimeExecutionContext
> = defineWorkflowModule<EndToEndInput, EndToEndResult, EndToEndFailure, EndToEndRuntimeExecutionContext>({
  specification: endToEndSpecification,
  runtimeCapabilities: ["presenter", "signal", "cleanup", "files", "runner", "environment"],
  createContext: (input, context) => {
    const {presenter, signal, cleanup, files, runner, environment} = context.runtime;
    const featureContext: EndToEndRuntimeExecutionContext = {presenter, signal, cleanup, files, runner, environment};
    // `invoke()` never runs through `decode()`, so this is the validation point that guards it.
    targetByFeatureContext.set(featureContext, requireValidEndToEndTarget(input.target));
    return featureContext;
  },
});
