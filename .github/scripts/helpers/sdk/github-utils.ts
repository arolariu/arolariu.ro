/**
 * @fileoverview Public Octokit constructor, defaults, and configuration helpers.
 * @module github/scripts/helpers/sdk/github-utils
 *
 * @remarks
 * This is the SDK's supported utilities entrypoint, not a private-file import.
 * Preserves constructor identity so plugin/default customization and native
 * instance types remain available through the repository broker boundary.
 * Credentials are supplied by the caller and must not be logged.
 *
 * @example
 * ```typescript
 * import {getInput} from "./core.ts";
 * import {GitHub, getOctokitOptions} from "./github-utils.ts";
 * const client = new GitHub(getOctokitOptions(getInput("github-token")));
 * ```
 *
 * @see https://github.com/actions/toolkit/blob/main/packages/github/README.md
 */
export * from "@actions/github/lib/utils";
