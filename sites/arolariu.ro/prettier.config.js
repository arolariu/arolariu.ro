/**
 * @type {import("prettier").Config}
 */
const prettierConfig = {
  arrowParens: "always",
  insertPragma: false,
  printWidth: 120,
  useTabs: false,
  tabWidth: 2,
  semi: true,
  htmlWhitespaceSensitivity: "strict",
  trailingComma: "all",
  singleQuote: false,
  bracketSameLine: true,
  bracketSpacing: false,
  plugins: ["prettier-plugin-organize-imports", "prettier-plugin-tailwindcss"],
  endOfLine: "crlf",
  proseWrap: "always",
  parser: "typescript",
  jsxSingleQuote: true,
  singleAttributePerLine: true,
  tailwindConfig: "tailwind.config.ts",
  experimentalTernaries: false,
};

export default prettierConfig;
