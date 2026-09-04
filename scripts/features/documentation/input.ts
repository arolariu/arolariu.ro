/**
 * @fileoverview Typed input of the `docs-assemble` command and its decoder. The command takes no
 * option and no positional argument — assembly is derived entirely from the repository layout — so
 * its input is an empty record rather than `void`, keeping the command, workflow, and programmatic
 * `invoke()` generics uniform with every other feature.
 * @module scripts/features/documentation/input
 */

/** Typed input of one documentation assembly invocation: the command accepts no argument. */
export type DocumentationAssemblyInput = Record<never, never>;

/**
 * Decodes one parsed invocation into the feature's typed input.
 *
 * @returns The empty documentation assembly input.
 */
export function decodeDocumentationAssemblyInput(): DocumentationAssemblyInput {
  return {};
}
