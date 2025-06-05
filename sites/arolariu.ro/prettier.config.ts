/** @format */

import type {Config} from "prettier";

const prettierConfig: Config = {
  arrowParens: "always",
  bracketSameLine: true,
  bracketSpacing: false,
  endOfLine: "crlf",
  experimentalTernaries: false,
  experimentalOperatorPosition: "start",
  htmlWhitespaceSensitivity: "strict",
  insertPragma: true,
  jsxSingleQuote: true,
  parser: "typescript",
  plugins: ["prettier-plugin-organize-imports", "prettier-plugin-tailwindcss"],
  printWidth: 140,
  proseWrap: "always",
  semi: true,
  singleAttributePerLine: true,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "all",
  useTabs: false,
  tailwindConfig: "tailwind.config.ts",
} satisfies Config;

export default prettierConfig;
