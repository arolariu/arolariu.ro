/**
 * @fileoverview Public platform-aware IO utilities and native file primitives.
 * @module github/scripts/helpers/sdk/io-util
 *
 * @remarks
 * Preserves the explicitly exported utilities entrypoint, including executable
 * checks, rooted-path handling, and Windows junction readlink compatibility.
 * Callers receive upstream sentinel values and platform behavior unchanged.
 *
 * @example
 * ```typescript
 * import {isDirectory} from "./io-util.ts";
 * const present = await isDirectory("artifacts");
 * ```
 *
 * @see https://github.com/actions/toolkit/blob/main/packages/io/src/io-util.ts
 */
export * from "@actions/io/lib/io-util";
