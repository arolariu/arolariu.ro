/**
 * @fileoverview Native file discovery, async glob iteration, and file hashing.
 * @module github/scripts/helpers/sdk/glob
 *
 * @remarks
 * Exposes create/hashFiles and the complete returned Globber contract.
 * Native matching, symbolic-link, hidden-file, and workspace options are not
 * narrowed. Match ordering is not guaranteed; callers sort when order matters.
 *
 * @example
 * ```typescript
 * import {create} from "./glob.ts";
 * const globber = await create("artifacts/*.json", {followSymbolicLinks: false});
 * const files = await globber.glob();
 * ```
 *
 * @see https://github.com/actions/toolkit/blob/main/packages/glob/README.md
 */
export * from "@actions/glob";
