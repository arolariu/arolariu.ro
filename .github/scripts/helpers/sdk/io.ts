/**
 * @fileoverview Native copy, move, removal, directory, and executable lookup APIs.
 * @module github/scripts/helpers/sdk/io
 *
 * @remarks
 * Keeps the SDK's own defaults and complete option types, including
 * copySourceDirectory. These are not the filesystem decorator's convenience
 * defaults. Mutations, especially recursive removal, occur only when invoked
 * and require the caller to choose an explicitly scoped target.
 *
 * @example
 * ```typescript
 * import {mkdirP, which} from "./io.ts";
 * await mkdirP("artifacts");
 * const executable = await which("node", true);
 * ```
 *
 * @see https://github.com/actions/toolkit/blob/main/packages/io/README.md
 */
export * from "@actions/io";
