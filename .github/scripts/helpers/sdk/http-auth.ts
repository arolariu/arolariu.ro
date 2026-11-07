/**
 * @fileoverview Native HTTP credential-handler constructors.
 * @module github/scripts/helpers/sdk/http-auth
 *
 * @remarks
 * Retains Basic, Bearer, and personal-access-token handlers and their native
 * request preparation behavior. No handler is installed automatically and no
 * credential or permission policy is selected by this module.
 *
 * @example
 * ```typescript
 * import {getInput} from "./core.ts";
 * import {BearerCredentialHandler} from "./http-auth.ts";
 * const handler = new BearerCredentialHandler(getInput("api-token", {required: true}));
 * ```
 *
 * @see https://github.com/actions/toolkit/blob/main/packages/http-client/README.md
 */
export * from "@actions/http-client/lib/auth";
