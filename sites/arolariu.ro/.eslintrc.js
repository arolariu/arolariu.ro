// @ts-check

/*
 * @type {import('eslint').Linter.Config}
 */
const eslintConfig = {
	extends: ["eslint:recommended", "next/core-web-vitals", "next", "prettier"],
	plugins: ["unicorn"],
	settings: {
		next: {
			rootDir: "./src/",
		},
	},
	rules: {
		"no-unused-vars": [
			"error",
			{
				args: "after-used",
				caughtErrors: "none",
				ignoreRestSiblings: true,
				vars: "all",
			},
		],
		"prefer-const": "error",
		"react-hooks/exhaustive-deps": "error",
	},
};

module.exports = eslintConfig;
