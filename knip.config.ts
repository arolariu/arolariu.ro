/**
 * @fileoverview Typed Knip configuration scoping the unused-code analysis to `scripts/**`.
 * @module knip.config
 *
 * @remarks
 * Knip evaluates the whole npm workspace by default, but this repository only wants it to analyze
 * `scripts/**`: every child `packages/*`/`sites/*` workspace package already owns its own dependency
 * graph and lint/test tooling. The root workspace entry list is derived from the same authoritative
 * inventories `scripts/testing/architecture/script-entrypoint-definitions.ts` and
 * `scripts/testing/architecture/workspace-dependency-ownership.ts` expose to their own architecture
 * tests, so this configuration can never drift from the entrypoint or dependency-ownership facts
 * those modules already enforce.
 */

import {defineConfig} from "knip/config";

import {
  additionalScriptSourceRootPaths,
  scriptEntrypointDefinitions,
} from "./scripts/testing/architecture/script-entrypoint-definitions.ts";
import {collectKnipIgnoredDependencyNames} from "./scripts/testing/architecture/workspace-dependency-ownership.ts";

export default defineConfig({
  workspaces: {
    ".": {
      entry: [
        ...scriptEntrypointDefinitions.map(({sourcePath}) => sourcePath),
        ...additionalScriptSourceRootPaths,
        "scripts/**/*.test.{ts,tsx,js,mjs,cjs}",
        "scripts/vitest.config.ts",
        "scripts/testing/architecture/report-*.ts",
      ],
      project: ["scripts/**/*.{ts,tsx,js,mjs,cjs}"],
      ignore: [".github/scripts/**"],
      includeEntryExports: false,
      ignoreDependencies: [...collectKnipIgnoredDependencyNames(import.meta.dirname)],
    },
  },
  treatConfigHintsAsErrors: true,
  treatTagHintsAsErrors: true,
  rules: {
    files: "error",
    dependencies: "error",
    devDependencies: "error",
    optionalPeerDependencies: "error",
    unlisted: "error",
    binaries: "error",
    unresolved: "error",
    exports: "error",
    types: "error",
    enumMembers: "error",
    namespaceMembers: "error",
    duplicates: "warn",
  },
});
