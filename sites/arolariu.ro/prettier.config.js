/**
 * @format
 * @type {import("prettier").Options}
 */
const prettierConfig = {
	arrowParens: "always",
	insertPragma: false,
	printWidth: 150,
	useTabs: true,
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
	tailwindConfig: "tailwind.config.js",
};

module.exports = prettierConfig;
