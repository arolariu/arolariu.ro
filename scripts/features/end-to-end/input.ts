/**
 * @fileoverview Typed input of the `test:e2e` command and its Commander decoder. Commander rejects
 * a missing `<target>` before this decoder runs, so it only validates the parsed value; the
 * workflow re-validates, because a programmatic `invoke()` never runs `decode()`.
 * @module scripts/features/end-to-end/input */

import type {Command} from "commander";

import {requireValidEndToEndTarget, type EndToEndTarget} from "./targets.ts";

/** Typed input accepted by the end-to-end command. */
export interface EndToEndInput {
  /** Selected target: one runnable target, or `all` to run every target in execution order. */
  readonly target: EndToEndTarget;
}

/** Converts one parsed invocation into the feature's typed input.
 * @throws {CommandInputError} When the parsed positional is not a valid target. */
export function decodeEndToEndInput(program: Command): EndToEndInput {
  const [rawTarget] = program.args as [string | undefined];
  return {target: requireValidEndToEndTarget(rawTarget ?? "")};
}
