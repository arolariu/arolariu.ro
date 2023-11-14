/**
 * @format
 * @type {import("prettier").Options}
 */

module.exports = {
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
