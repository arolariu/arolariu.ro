/**
 * @fileoverview Native Actions context and configurable Octokit construction.
 * @module github/scripts/helpers/sdk/github
 *
 * @remarks
 * Retains the original context singleton and getOctokit options/plugins.
 * The resulting client exposes REST, GraphQL, pagination, and request APIs;
 * it is not replaced by a reduced endpoint interface. Native proxy and GitHub
 * Enterprise configuration remain owned by the upstream factory.
 *
 * @example
 * ```typescript
 * import {getInput} from "./core.ts";
 * import {context, getOctokit} from "./github.ts";
 * const client = getOctokit(getInput("github-token", {required: true}));
 * const repository = await client.rest.repos.get(context.repo);
 * ```
 *
 * @see https://github.com/actions/toolkit/blob/main/packages/github/README.md
 */
export * from "@actions/github";
