// @ts-check

import eslint from "@eslint/js";
import eslintPluginJsDoc from "eslint-plugin-jsdoc";
import eslintPluginReact from "eslint-plugin-react";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
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
      unicorn: eslintPluginUnicorn,
      react: eslintPluginReact,
      jsdoc: eslintPluginJsDoc,
    },
    rules: {
      ...eslintPluginReact.configs.all.rules,
      ...eslintPluginUnicorn.configs.all.rules,
      ...eslintPluginJsDoc.configs["recommended-typescript"].rules,
      "jsdoc/require-param": "off",
      "jsdoc/require-returns": "off",
      "jsdoc/check-param-names": "off",
      "unicorn/filename-case": "off",
      "unicorn/no-keyword-prefix": "off",
      "unicorn/switch-case-braces": "off",
      "unicorn/prevent-abbreviations": "off",
      "unicorn/no-abusive-eslint-disable": "off",
      "unicorn/consistent-function-scoping": "off",
      "react/prop-types": "off",
      "react/jsx-indent": "off",
      "react/jsx-newline": "off",
      "react/jsx-no-bind": "off",
      "react/jsx-max-depth": "off",
      "react/no-multi-comp": "off",
      "react/jsx-sort-props": "off",
      "react/jsx-no-literals": "off", // this is a good rule for I18N.
      "react/jsx-tag-spacing": "off",
      "react/jsx-indent-props": "off",
      "react/jsx-curly-newline": "off",
      "react/react-in-jsx-scope": "off",
      "react/require-default-props": "off",
      "react/jsx-props-no-spreading": "off",
      "react/jsx-max-props-per-line": "off",
      "react/jsx-filename-extension": "off",
      "react/forbid-component-props": "off",
      "react/jsx-closing-tag-location": "off",
      "react/jsx-child-element-spacing": "off",
      "react/no-adjacent-inline-elements": "off",
      "react/jsx-one-expression-per-line": "off",
      "react/jsx-closing-bracket-location": "off",
      "react/function-component-definition": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/no-confusing-void-expression": "off",
    },
    ignores: ["*.config.js", "*.config.ts", "package.json", "node_modules/**"],
    settings: {
      react: {
        version: "18.2.0",
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  },
);
