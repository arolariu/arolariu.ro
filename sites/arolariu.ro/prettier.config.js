/**
 * @type {import("prettier").Options}
 * @format
 */

module.exports = {
	arrowParens: "always",
	insertPragma: true,
	printWidth: 100,
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
