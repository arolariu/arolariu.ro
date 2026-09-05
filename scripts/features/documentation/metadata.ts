/**
 * @fileoverview Identity, help text, and parser configuration of the `docs-assemble` command, kept
 * beside the entrypoint and free of every business import so a `--help` invocation resolves nothing
 * heavier than this module and `scripts/features/documentation/input.ts`.
 * @module scripts/features/documentation/metadata
 */

import type {Command} from "commander";

import type {CommandIdentityDefinition} from "../../core/command/command-specification.ts";

/** Identity and parser configuration the entrypoint spreads into its command specification. */
export const documentationCommandMetadata = {
  name: "docs-assemble",
  description:
    "Runs TypeDoc, pydoc-markdown, and DefaultDocumentation in parallel, normalizes frontmatter, writes landing pages, and mirrors prose into the Docusaurus source tree.",
  examples: ["npm run docs:assemble", "node --experimental-strip-types scripts/features/documentation/command.ts"],
  configure: (program: Command): void => {
    program.allowExcessArguments(false);
  },
} as const satisfies CommandIdentityDefinition & {readonly configure: (program: Command) => void};
