/**
 * @fileoverview Native cache service operations, options, and error classes.
 * @module github/scripts/helpers/sdk/cache
 *
 * @remarks
 * Native restoration supports prefix matching and cross-OS archives.
 * lookupOnly probes without downloading. Best-effort SDK handling can return
 * undefined for restoration or -1 for saving; neither proves a successful
 * persistence operation or a precise failure cause. These values and all SDK
 * error identities are preserved rather than translated into repository policy.
 *
 * @example
 * ```typescript
 * import {restoreCache} from "./cache.ts";
 * const matchedKey = await restoreCache(["node_modules"], "dependencies-key", [], {lookupOnly: true});
 * ```
 *
 * @see https://github.com/actions/toolkit/blob/main/packages/cache/README.md
 */
export * from "@actions/cache";
