/**
 * @fileoverview The concrete lazy command every migrated script builds and exports, plus the two
 * declarative entry points that construct one.
 * @module scripts/core/command/lazy-monorepo-command
 *
 * @remarks
 * `defineLazyCommand` builds a composed command directly from a {@link CommandSpecification}.
 * `defineCommand` adapts a simpler, eager {@link DirectCommandSpecification} — a command with no
 * separate feature workflow or reporter module — onto the same lazy contract, so every migrated
 * entrypoint exports the same `LazyMonorepoCommand` type regardless of definition style.
 */

import type {CommandRuntime} from "../../common/runtime.ts";
import {runtimeCapabilityNames} from "../runtime/runtime-capability.ts";
import {defineWorkflowModule} from "../workflow/workflow-composition.ts";
import {succeededWorkflowExecution} from "../workflow/workflow-execution-result.ts";
import {AbstractMonorepoCommand} from "./abstract-monorepo-command.ts";
import type {CommandExecutionContext} from "./command-execution.ts";
import type {CommandConstructionOptions, CommandSpecification, DirectCommandSpecification} from "./command-specification.ts";

/** The concrete command object every migrated script exports. */
export class LazyMonorepoCommand<TInput, TOutput, TFailure> extends AbstractMonorepoCommand<TInput, TOutput, TFailure> {}

/**
 * Builds a composed command directly from its specification.
 *
 * @param options - The injected `host` or a literal `loadHost` loader this command owns.
 * Required: core has no default host and never imports one.
 */
export function defineLazyCommand<TInput, TOutput, TFailure>(
  specification: CommandSpecification<TInput, TOutput, TFailure>,
  options: Readonly<CommandConstructionOptions>,
): LazyMonorepoCommand<TInput, TOutput, TFailure> {
  return new LazyMonorepoCommand<TInput, TOutput, TFailure>(specification, options);
}

/**
 * Adapts an eager, direct specification onto the lazy contract: it wraps `execute` in a generated
 * workflow module and `complete` in an in-memory presentation module resolved by an
 * already-fulfilled promise. The extra runtime-context generic is absorbed by the generated
 * workflow, so the returned command keeps exactly three generics.
 *
 * @remarks
 * The generated workflow declares the **complete** core capability set because a direct command
 * has not yet narrowed its context. That complete set is explicit, tracked technical debt owned by
 * each family's removal cohort, not a policy exception.
 *
 * The per-invocation feature context and its typed input never leave this closure: each derived
 * context is keyed by the exact base {@link CommandExecutionContext} the lifecycle created for
 * that invocation, so two concurrent invocations never observe each other's state.
 *
 * @returns The composed lazy command; its workflow never produces a failed decision, so its
 * failure generic is `never`.
 */
export function defineCommand<TInput, TOutput, TRuntime extends CommandRuntime = CommandRuntime>(
  specification: DirectCommandSpecification<TInput, TOutput, TRuntime>,
  options: Readonly<CommandConstructionOptions>,
): LazyMonorepoCommand<TInput, TOutput, never> {
  const featureContextByBaseContext = new WeakMap<CommandExecutionContext, CommandExecutionContext<TRuntime>>();

  const composedSpecification: CommandSpecification<TInput, TOutput, never> = {
    name: specification.name,
    description: specification.description,
    ...(specification.usage === undefined ? {} : {usage: specification.usage}),
    ...(specification.examples === undefined ? {} : {examples: specification.examples}),
    ...(specification.slashAliases === undefined ? {} : {slashAliases: specification.slashAliases}),
    configure: specification.configure,
    decode: specification.decode,
    ...(specification.presentation === undefined ? {} : {presentation: specification.presentation}),
    loadWorkflow: async () =>
      defineWorkflowModule<TInput, TOutput, never, Readonly<{feature: CommandExecutionContext<TRuntime>; input: TInput}>>({
        specification: {
          name: specification.name,
          execute: async ({feature, input}) => succeededWorkflowExecution(await specification.execute(feature, input)),
        },
        runtimeCapabilities: runtimeCapabilityNames,
        createContext: (input, context, parent) => {
          const narrowedRuntime = specification.createRuntimeContext?.(context.runtime, parent) ?? context.runtime;
          const feature = {...context, runtime: narrowedRuntime} as CommandExecutionContext<TRuntime>;
          featureContextByBaseContext.set(context, feature);
          return {feature, input};
        },
      }),
    loadPresentation: async () => ({
      present: async (result, context) => {
        if (result.kind === "failed") {
          throw new Error("Unreachable: a direct command's generated workflow never produces a failed decision.");
        }

        const feature = featureContextByBaseContext.get(context) ?? (context as CommandExecutionContext<TRuntime>);
        return {kind: "complete", completion: await specification.complete(result.output, feature)} as const;
      },
    }),
  };

  return defineLazyCommand(composedSpecification, options);
}
