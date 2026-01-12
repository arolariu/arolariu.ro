/**
 * @fileoverview Prettier configuration for the arolariu.ro monorepo.
 * @module config/prettier
 *
 * @remarks
 * This module exports the repository-wide Prettier configuration used by the
 * `npm run format` script and editor integrations.
 *
 * The exported configuration is intentionally opinionated to ensure consistent
 * formatting across multiple runtimes and frameworks (TypeScript/React, Svelte,
 * and plain markup).
 *
 * @example
 * ```bash
 * npm run format
 * ```
 *
 * @see {@link https://prettier.io/docs/en/configuration.html} Prettier configuration
 */
import type {Config} from "prettier";

/**
 * Prettier configuration for the arolariu.ro monorepo.
 *
 * @remarks
 * **Purpose**: Enforces consistent code formatting across all projects in the monorepo,
 * including TypeScript, React, Svelte, and HTML files.
 *
 * **Key Design Decisions**:
 * - Uses CRLF line endings for Windows compatibility
 * - Enforces double quotes for strings (single quotes in JSX)
 * - 140-character print width for modern wide displays
 * - Trailing commas everywhere for cleaner git diffs
 * - No bracket spacing for compact object literals
 *
 * **Plugins**:
 * - `@prettier/plugin-oxc`: Faster parsing via Oxc
 * - `@prettier/plugin-hermes`: Hermes AST support
 * - `prettier-plugin-organize-imports`: Auto-sorts imports
 * - `prettier-plugin-tailwindcss`: Sorts Tailwind CSS classes
 * - `prettier-plugin-svelte`: Svelte file formatting
 *
 * **Usage**: Run via `npm run format` or integrated with editor save-on-format.
 *
 * @example
 * ```bash
 * # Format all files
 * npm run format
 *
 * # Check formatting without writing
 * npx prettier --check .
 * ```
 *
 * @see {@link https://prettier.io/docs/en/configuration.html} Prettier Configuration Docs
 */
const prettierConfig: Config = {
  arrowParens: "always",
  bracketSameLine: true,
  bracketSpacing: false,
  endOfLine: "crlf",
  experimentalTernaries: false,
  experimentalOperatorPosition: "start",
  htmlWhitespaceSensitivity: "strict",
  checkIgnorePragma: true,
  insertPragma: false,
  jsxSingleQuote: true,
  parser: "typescript",
  plugins: [
    "@prettier/plugin-oxc",
    "@prettier/plugin-hermes",
    "prettier-plugin-organize-imports",
    "prettier-plugin-tailwindcss",
    "prettier-plugin-svelte",
  ],
  printWidth: 140,
  proseWrap: "always",
  semi: true,
  singleAttributePerLine: true,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "all",
  useTabs: false,
  overrides: [
    {
      files: "*.svelte",
      options: {
        parser: "svelte",
      },
    },
    {
      files: "*.html",
      options: {
        parser: "html",
      },
    },
  ],
};

export default prettierConfig;
