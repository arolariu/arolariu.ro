/**
 * @format
 * @type {import("prettier").Config}
 */
const prettierConfig = {
  arrowParens: "always",
  bracketSameLine: true,
  bracketSpacing: false,
  endOfLine: "crlf",
  experimentalTernaries: false,
  htmlWhitespaceSensitivity: "strict",
  insertPragma: true,
  jsxSingleQuote: true,
  parser: "typescript",
  plugins: ["prettier-plugin-organize-imports", "prettier-plugin-tailwindcss"],
  printWidth: 120,
  proseWrap: "always",
  semi: true,
  singleAttributePerLine: true,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "all",
  useTabs: false,
  tailwindConfig: "tailwind.config.ts",
};

export default prettierConfig;
