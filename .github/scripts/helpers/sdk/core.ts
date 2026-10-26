/**
 * @fileoverview Native runner commands, inputs, outputs, summaries, and identity.
 * @module github/scripts/helpers/sdk/core
 *
 * @remarks
 * Keeps the SDK's original bindings, types, defaults, and error behavior.
 * Commands can change runner files, environment, masking, state, or exit status;
 * importing this boundary does not issue those commands. Saved state requires
 * an action post lifecycle, and OIDC requests require the runner's permission.
 * Workflow policy belongs to lib, not this native surface.
 *
 * @example
 * ```typescript
 * import {getInput, setOutput} from "./core.ts";
 * const scope = getInput("scope", {required: true});
 * setOutput("scope", scope);
 * ```
 *
 * @see https://github.com/actions/toolkit/blob/main/packages/core/README.md
 */
export * from "@actions/core";
