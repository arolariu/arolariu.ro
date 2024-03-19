// @ts-check

/**
 * @format
 * @type {import("prettier").Options}
 */
const prettierConfig = {
	arrowParens: "always",
	insertPragma: false,
	printWidth: 120,
	useTabs: true,
	tabWidth: 2,
	semi: true,
	htmlWhitespaceSensitivity: "strict",
	trailingComma: "all",
	singleQuote: false,
	bracketSameLine: true,
	bracketSpacing: false,
	plugins: ["prettier-plugin-organize-imports", "prettier-plugin-tailwindcss"],
};

module.exports = prettierConfig;
