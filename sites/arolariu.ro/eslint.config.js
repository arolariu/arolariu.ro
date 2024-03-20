// @ts-nocheck

import eslint from "@eslint/js";
import eslintPluginJsDoc from "eslint-plugin-jsdoc";
import eslintPluginReact from "eslint-plugin-react";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";

export default tseslint.config(eslint.configs.recommended, ...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked, {
	files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
  languageOptions: {
    ecmaVersion: "latest",
		parserOptions: {
			ecmaFeatures: {
        jsx: true,
			},
			ecmaVersion: "latest",
      errorOnTypeScriptSyntacticAndSemanticIssues: true,
      warnOnUnsupportedTypeScriptVersion: true,
      errorOnUnknownASTType: true,
      comment: true,
			project: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
	plugins: {
		eslint: eslint,
		unicorn: eslintPluginUnicorn,
		react: eslintPluginReact,
		jsdoc: eslintPluginJsDoc,
	},
	rules: {
		...eslint.configs.all.rules,
		...eslintPluginReact.configs.all.rules,
		...eslintPluginUnicorn.configs.all.rules,
		...eslintPluginJsDoc.configs["recommended-typescript"].rules,
		"unicorn/filename-case": "off",
	},
  ignores: ["*.config.js", "package.json", "node_modules/**"],
  settings: {
    react: {
      version: "18.2.0",
    },
  },
  linterOptions: {
    reportUnusedDisableDirectives: true,
  }
});

