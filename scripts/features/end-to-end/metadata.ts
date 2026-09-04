/**
 * @fileoverview Identity, help text, and parser configuration of the `test:e2e` command, kept
 * beside the entrypoint and free of every business import so a `--help` invocation resolves
 * nothing heavier than this module and `scripts/features/end-to-end/input.ts`.
 * @module scripts/features/end-to-end/metadata
 */

import type {Command} from "commander";

import type {CommandIdentityDefinition} from "../../core/command/command-specification.ts";

/** Identity and parser configuration the entrypoint spreads into its command specification. */
export const endToEndCommandMetadata = {
  name: "test:e2e",
  description: "Runs Postman/Newman E2E tests for arolariu.ro targets.",
  usage: "<target>",
  examples: ["npm run test:e2e -- backend", "npm run test:e2e -- frontend", "npm run test:e2e -- cv", "npm run test:e2e -- all"],
  configure: (program: Command): void => {
    program.argument("<target>", "Target to test: all, backend, frontend, or cv.").allowExcessArguments(false);
  },
} as const satisfies CommandIdentityDefinition & {readonly configure: (program: Command) => void};
