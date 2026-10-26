/**
 * @fileoverview Native artifact clients, metadata, integrity, and error types.
 * @module github/scripts/helpers/sdk/artifact
 *
 * @remarks
 * Preserves named exports and the original default client, including cross-run
 * lookup, compression/archive options, digests, and optional response fields.
 * SDK errors keep their identity. Required-evidence validation is a decorator
 * concern; this surface never substitutes a fabricated artifact ID.
 *
 * @example
 * ```typescript
 * import artifacts from "./artifact.ts";
 * const {artifact} = await artifacts.getArtifact("hygiene-report");
 * const downloaded = await artifacts.downloadArtifact(artifact.id);
 * ```
 *
 * @see https://github.com/actions/toolkit/blob/main/packages/artifact/README.md
 */
export * from "@actions/artifact";
export {default} from "@actions/artifact";
