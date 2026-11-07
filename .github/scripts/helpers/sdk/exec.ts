/**
 * @fileoverview Native executable invocation, streams, listeners, and output.
 * @module github/scripts/helpers/sdk/exec
 *
 * @remarks
 * Preserves both execution functions and all native option/listener types.
 * Nonzero exit handling follows ignoreReturnCode; callers that capture an exit
 * must interpret it. The native delay option waits for post-exit stream closure,
 * not a command deadline. No timeout or cancellation capability is invented here.
 *
 * @example
 * ```typescript
 * import {getExecOutput} from "./exec.ts";
 * const result = await getExecOutput("git", ["status", "--short"], {silent: true});
 * ```
 *
 * @see https://github.com/actions/toolkit/blob/main/packages/exec/README.md
 */
export * from "@actions/exec";
