/**
 * @fileoverview Native tool download, extraction, cache, manifest, and version APIs.
 * @module github/scripts/helpers/sdk/tool-cache
 *
 * @remarks
 * Exposes the complete upstream surface without inventing an installer policy.
 * Download/extraction/cache mutations require explicit invocation. Callers own
 * version selection, verification, credentials, and installation approval.
 *
 * @example
 * ```typescript
 * import {getInput} from "./core.ts";
 * import {find} from "./tool-cache.ts";
 * const installed = find("example-tool", getInput("tool-version", {required: true}));
 * ```
 *
 * @see https://github.com/actions/toolkit/blob/main/packages/tool-cache/README.md
 */
export * from "@actions/tool-cache";
