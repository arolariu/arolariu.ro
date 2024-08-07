/** @format */

import {fixupConfigRules, fixupPluginRules} from "@eslint/compat";
import eslint from "@eslint/js";
import typescriptParser from "@typescript-eslint/parser";
import eslintPluginFunctional from "eslint-plugin-functional";
import eslintPluginJsDoc from "eslint-plugin-jsdoc";
import eslintPluginPerfectionist from "eslint-plugin-perfectionist";
import eslintPluginReact from "eslint-plugin-react";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import eslintPluginReactRules from "eslint-plugin-react/configs/recommended.js";
import eslintPluginSecurity from "eslint-plugin-security";
import eslintPluginSonarJs from "eslint-plugin-sonarjs";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import globals from "globals";
import tseslint from "typescript-eslint";

const eslintConfig = tseslint.config(
  {
    name: "[arolariu.ro::MAIN] global main linter configuration",
    languageOptions: {globals: {...globals.browser, ...globals.node}},
  },
  eslint.configs.recommended,
  eslint.configs.all,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  ...fixupConfigRules(eslintPluginReactRules),
  {
    name: "[arolariu.ro::TSX] main linter configuration",
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      ecmaVersion: "latest",
      parser: typescriptParser,
      parserOptions: {
        projectService: {
          defaultProject: "./tsconfig.json",
        },
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: "latest",
        errorOnTypeScriptSyntacticAndSemanticIssues: true,
        warnOnUnsupportedTypeScriptVersion: true,
        errorOnUnknownASTType: true,
        comment: true,
      },
    },
    plugins: {
      perfectionist: fixupPluginRules(eslintPluginPerfectionist),
      "react-hooks": fixupPluginRules(eslintPluginReactHooks),
      functional: fixupPluginRules(eslintPluginFunctional),
      security: fixupPluginRules(eslintPluginSecurity),
      unicorn: fixupPluginRules(eslintPluginUnicorn),
      jsdoc: fixupPluginRules(eslintPluginJsDoc),
      sonarjs: fixupPluginRules(eslintPluginSonarJs),
    },
    rules: {
      ...eslintPluginFunctional.configs.recommended.rules,
      ...eslintPluginFunctional.configs.stylistic.rules,
      ...eslintPluginReact.configs.all.rules,
      ...eslintPluginUnicorn.configs.all.rules,
      ...eslintPluginReactHooks.configs.recommended.rules,
      ...eslintPluginSecurity.configs.recommended.rules,
      ...eslintPluginSonarJs.configs.recommended.rules,
      ...eslintPluginJsDoc.configs["recommended-typescript"].rules,
      ...eslintPluginPerfectionist.configs["recommended-alphabetical"].rules,
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/no-non-null-assertion": "off", // this rule is not needed when working with TSX.
      "@typescript-eslint/no-unsafe-assignment": "off", // unsafe assignment is useful for type casting.
      "@typescript-eslint/non-nullable-type-assertion-style": "off",
      "@typescript-eslint/require-await": "off",
      "arrow-body-style": "off", // arrow body style is not needed; we use both arrow and function expressions.
      "capitalized-comments": "off", // capitalized comments are not needed; we have comments in lowercase.
      "consistent-return": "off", // TSX components do not always have a return statement.
      "func-style": "off", // function style is not needed; we use both arrow and function expressions.
      "functional/functional-parameters": "off", // Not applicable to TSX functions.
      "functional/no-conditional-statements": "off", // conditional statements are used for conditional rendering.
      "functional/no-expression-statements": "off", // side-effects are needed by 3rd party libraries.
      "functional/no-let": "off", // let is useful for iterators and ahead-of-time computing.
      "functional/no-mixed-types": "off", // TSX components have mixed types used for props.
      "functional/no-return-void": "off", // TSX components do not always have a return statement.
      "functional/prefer-immutable-types": "off", // typescript v5 does not offer a deep readonly type; TBD.
      "id-length": "off", // mayfly variables like iterators tend to have 'i' or 'j' as iterator names.
      "jsdoc/check-param-names": "off",
      "jsdoc/check-tag-names": "off", // prettier's @format tag is not recognized.
      "jsdoc/require-returns": "off",
      "jsdoc/require-param": "off",
      "jsdoc/tag-lines": "off", // prettier automatically adds a newline after block description; this rule is not needed.
      "max-lines": "off",
      "max-lines-per-function": "off", // TSX components are not always small.
      "new-cap": "off",
      "no-console": "off", // console logs are stripped out in production.
      "no-inline-comments": "off", // inline comments are useful, sometimes.
      "no-magic-numbers": "off", // this rule is not needed; we have magic numbers regarding request status in our code.
      "no-plusplus": "off", // plusplus is useful for iterators.
      "no-shadow": "off", // this rule seems to not behave well with TSX.
      "no-ternary": "off",
      "no-void": "off",
      "no-warning-comments": "warn",
      "one-var": "off", // this rule is not needed; we have more than one variable per exported file.
      "perfectionist/sort-imports": "off", // prettier sorts imports automatically.
      "perfectionist/sort-interfaces": "off", // prettier sorts interfaces automatically.
      "perfectionist/sort-intersection-types": "off", // prettier sorts intersection types automatically.
      "perfectionist/sort-jsx-props": "off", // prettier sorts JSX props automatically.
      "perfectionist/sort-named-imports": "off", // prettier sorts named imports automatically.
      "perfectionist/sort-object-types": "off", // prettier sorts object types automatically.
      "perfectionist/sort-objects": "off", // prettier sorts objects automatically.
      "perfectionist/sort-union-types": "off", // prettier sorts union types automatically.
      "prefer-named-capture-group": "off",
      "react-hooks/exhaustive-deps": "off", // sometimes useEffect hooks depend on a prop that is not in the dependency array.
      "react/forbid-component-props": "off",
      "react/function-component-definition": "off",
      "react/jsx-child-element-spacing": "off",
      "react/jsx-closing-bracket-location": "off",
      "react/jsx-closing-tag-location": "off",
      "react/jsx-curly-newline": "off",
      "react/jsx-filename-extension": "off",
      "react/jsx-indent": "off",
      "react/jsx-indent-props": "off",
      "react/jsx-max-depth": "off",
      "react/jsx-max-props-per-line": "off",
      "react/jsx-newline": "off",
      "react/jsx-no-bind": "off",
      "react/jsx-no-literals": "off", // this is a good rule for I18N.
      "react/jsx-one-expression-per-line": "off",
      "react/jsx-pascal-case": "off",
      "react/jsx-props-no-spreading": "off",
      "react/jsx-sort-props": "off",
      "react/jsx-tag-spacing": "off",
      "react/no-adjacent-inline-elements": "off",
      "react/no-array-index-key": "off", // this is a good rule that we violate for some components.
      "react/no-multi-comp": "off",
      "react/no-unstable-nested-components": "off", // next-intl (i18n) uses nested components for structured messages.
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/require-default-props": "off",
      "sort-imports": "off", // prettier sorts imports automatically.
      "sort-keys": "off", // prettier sorts keys automatically.
      "unicorn/consistent-function-scoping": "off",
      "unicorn/filename-case": "off",
      "unicorn/no-abusive-eslint-disable": "off",
      "unicorn/no-array-reduce": "off", // array reduce is useful for reducing arrays and in FP.
      "unicorn/no-keyword-prefix": "off",
      "unicorn/no-null": "off",
      "unicorn/prevent-abbreviations": "off",
      "unicorn/switch-case-braces": "off",
      camelcase: "off",
      curly: "off", // curly braces are not needed for single-line blocks.
      radix: "off",
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
    name: "[arolariu.ro::JSX] main linter configuration",
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
eslintConfig.forEach((config) => {
  const ignoreList = ["*.config.{js,ts}", "**/node_modules/**", "**/ui/**", "**/*.ts"];
  config.ignores = config.ignores ? [...config.ignores, ...ignoreList] : [...ignoreList];
});

export default eslintConfig;
