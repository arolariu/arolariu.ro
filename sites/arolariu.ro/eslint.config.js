/** @format */

import {fixupConfigRules} from "@eslint/compat";
import eslint from "@eslint/js";
import typescriptParser from "@typescript-eslint/parser";
import eslintPluginJsDoc from "eslint-plugin-jsdoc";
import eslintPluginReact from "eslint-plugin-react";
import eslintPluginReactRules from "eslint-plugin-react/configs/recommended.js";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import globals from "globals";
import tseslint from "typescript-eslint";

const defaultConfig = tseslint.config(
  {languageOptions: {globals: {...globals.browser, ...globals.node}}},
  eslint.configs.recommended,
  eslint.configs.all,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  ...fixupConfigRules(eslintPluginReactRules),
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      ecmaVersion: "latest",
      parser: typescriptParser,
      parserOptions: {
        EXPERIMENTAL_useProjectService: {
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 1000,
        },
        project: "tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: "latest",
        errorOnTypeScriptSyntacticAndSemanticIssues: true,
        warnOnUnsupportedTypeScriptVersion: true,
        errorOnUnknownASTType: true,
        comment: true,
      },
    },
    plugins: {
      unicorn: eslintPluginUnicorn,
      jsdoc: eslintPluginJsDoc,
    },
    rules: {
      ...eslintPluginReact.configs.all.rules,
      ...eslintPluginUnicorn.configs.all.rules,
      ...eslintPluginJsDoc.configs["recommended-typescript"].rules,
      "jsdoc/require-param": "off",
      "jsdoc/require-returns": "off",
      "jsdoc/check-tag-names": "off", // prettier's @format tag is not recognized.
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
      "react/no-array-index-key": "off", // this is a good rule that we violate for some components.
      "react/jsx-sort-props": "off",
      "react/jsx-no-literals": "off", // this is a good rule for I18N.
      "react/jsx-tag-spacing": "off",
      "react/jsx-indent-props": "off",
      "react/jsx-curly-newline": "off",
      "react/react-in-jsx-scope": "off",
      "id-length": "off", // mayfly variables like iterators tend to have 'i' or 'j' as iterator names.
      "@typescript-eslint/no-non-null-assertion": "off", // this rule is not needed when working with TSX.
      "react/require-default-props": "off",
      "new-cap": "off",
      radix: "off",
      camelcase: "off",
      "unicorn/no-null": "off",
      "arrow-body-style": "off", // arrow body style is not needed; we use both arrow and function expressions.
      "no-shadow": "off", // this rule seems to not behave well with TSX.
      "consistent-return": "off", // TSX components do not always have a return statement.
      "max-lines-per-function": "off", // TSX components are not always small.
      "react/jsx-props-no-spreading": "off",
      "react/jsx-max-props-per-line": "off",
      "react/jsx-filename-extension": "off",
      "sort-keys": "off", // prettier sorts keys automatically.
      curly: "off", // curly braces are not needed for single-line blocks.
      "@typescript-eslint/ban-types": "warn", // substitute for `Don't use `{}` as a type. `{}` actually means "any non-nullish value".`
      "react/forbid-component-props": "off",
      "react/jsx-closing-tag-location": "off",
      "react/jsx-child-element-spacing": "off",
      "react/no-adjacent-inline-elements": "off",
      "react/jsx-one-expression-per-line": "off",
      "react/jsx-closing-bracket-location": "off",
      "max-lines": "off",
      "jsdoc/tag-lines": "off", // prettier automatically adds a newline after block description; this rule is not needed.
      "no-shadow": "off",
      "one-var": "off", // this rule is not needed; we have more than one variable per exported file.
      "no-magic-numbers": "off", // this rule is not needed; we have magic numbers regarding request status in our code.
      "sort-imports": "off", // prettier sorts imports automatically.
      "no-inline-comments": "off", // inline comments are useful, sometimes.
      "func-style": "off", // function style is not needed; we use both arrow and function expressions.
      "capitalized-comments": "off", // capitalized comments are not needed; we have comments in lowercase.
      "react/function-component-definition": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/non-nullable-type-assertion-style": "off",
      "no-console": "off", // console logs are stripped out in production.
      "@typescript-eslint/no-misused-promises": "off",
      "no-plusplus": "off", // plusplus is useful for iterators.
      "prefer-named-capture-group": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "no-ternary": "off",
      "@typescript-eslint/no-confusing-void-expression": "off",
      "no-warning-comments": "warn",
    },
    settings: {
      react: {
        version: "18.3.0",
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  },
  {
    files: ["**/*.js", "**/*.jsx"],
    extends: [tseslint.configs.disableTypeChecked],
    rules: {
      // these rules are turned off mainly because
      // of the i18n JS files that are compile-time generated
      // and thus, cannot be altered or modified.
      "capitalized-comments": "off",
      camelcase: "off",
      "max-lines": "off",
      "arrow-body-style": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "one-var": "off",
    },
  },
);

// Add the global ignores to the default config.
defaultConfig.forEach((config) => {
  const ignoreList = ["*.config.{js,ts}", "**/node_modules/**", "**/ui/**", "**/i18n/**"];
  if (config.ignores === undefined) {
    config.ignores = [...ignoreList];
  } else {
    config.ignores = [...config.ignores, ...ignoreList];
  }
});

export default defaultConfig;
