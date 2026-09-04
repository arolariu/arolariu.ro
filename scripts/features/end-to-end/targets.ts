/**
 * @fileoverview The `test:e2e` target vocabulary: every accepted target, the runnable execution
 * order the `all` alias expands to, each runnable target's collection directory and auth policy,
 * and the single validation point both the parser and a programmatic `invoke()` pass through.
 * @module scripts/features/end-to-end/targets */

import {CommandInputError} from "../../core/command/command-execution.ts";

/** Every target the `test:e2e` command accepts, including the `all` alias. */
export type EndToEndTarget = "all" | "backend" | "frontend" | "cv";

/** One target Newman actually runs a collection against. */
export type RunnableEndToEndTarget = Exclude<EndToEndTarget, "all">;

/** Where one runnable target's Postman assets live and how it treats a present or absent token. */
export interface EndToEndTargetConfiguration {
  /** Whether the target requires, accepts, or ignores `E2E_TEST_AUTH_TOKEN`. */
  readonly authPolicy: "required" | "optional" | "ignored";
  /** Repository-relative directory holding the target's collection and environment files. */
  readonly directory: string;
}

/** Preserved target execution order for the `all` alias. */
export const endToEndExecutionOrder: readonly RunnableEndToEndTarget[] = ["frontend", "backend", "cv"];

/** Per-target collection directory and auth policy. */
export const endToEndTargetConfigurations: Readonly<Record<RunnableEndToEndTarget, EndToEndTargetConfiguration>> = {
  backend: {authPolicy: "required", directory: "sites/api.arolariu.ro"},
  cv: {authPolicy: "ignored", directory: "sites/cv.arolariu.ro"},
  frontend: {authPolicy: "optional", directory: "sites/arolariu.ro"},
};

/** Validates a target value from Commander parsing or from a programmatic `invoke()` call, so both
 * entry points share one source of truth and one unchanged diagnostic.
 * @throws {CommandInputError} When `target` is not `all`, `backend`, `frontend`, or `cv`. */
export function requireValidEndToEndTarget(target: string): EndToEndTarget {
  if (target === "all" || target === "backend" || target === "frontend" || target === "cv") {
    return target;
  }

  throw new CommandInputError(`Invalid target "${target}". Valid targets: all, backend, frontend, cv.`);
}

/** Expands one validated target into a fresh runnable-target list, in execution order. */
export function expandEndToEndTargets(target: EndToEndTarget): readonly RunnableEndToEndTarget[] {
  return target === "all" ? [...endToEndExecutionOrder] : [target];
}
