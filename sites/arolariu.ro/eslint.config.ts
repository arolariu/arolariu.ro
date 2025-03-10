/** @format */

import eslintPluginNext from "@next/eslint-plugin-next";
import typescriptParser from "@typescript-eslint/parser";
import eslintPluginFunctional from "eslint-plugin-functional";
import eslintPluginJest from "eslint-plugin-jest";
import eslintPluginJsDoc from "eslint-plugin-jsdoc";
import eslintPluginJsxA11y from "eslint-plugin-jsx-a11y";
import eslintPluginNode from "eslint-plugin-n";
import eslintPluginPerfectionist from "eslint-plugin-perfectionist";
import eslintPluginPromise from "eslint-plugin-promise";
import eslintPluginReact from "eslint-plugin-react";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import eslintPluginSecurity from "eslint-plugin-security";
import eslintPluginSonarJs from "eslint-plugin-sonarjs";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import globals from "globals";
import tseslint from "typescript-eslint";

const eslintConfig = tseslint.config(
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
        ecmaFeatures: {
          jsx: true,
        },
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: "latest",
        errorOnTypeScriptSyntacticAndSemanticIssues: true,
        warnOnUnsupportedTypeScriptVersion: true,
        errorOnUnknownASTType: true,
        comment: true,
      },
      globals: {...globals.browser, ...globals.node},
    },
    plugins: {
      react: eslintPluginReact,
      // @ts-ignore - the plugin is not typed correctly.
      "react-hooks": eslintPluginReactHooks,
      perfectionist: eslintPluginPerfectionist,
      functional: eslintPluginFunctional,
      jest: eslintPluginJest,
      jsdoc: eslintPluginJsDoc,
      "jsx-a11y": eslintPluginJsxA11y,
      // @ts-ignore - the plugin is not typed correctly.
      promise: eslintPluginPromise,
      sonarjs: eslintPluginSonarJs,
      security: eslintPluginSecurity,
      unicorn: eslintPluginUnicorn,
      "@typescript-eslint": tseslint.plugin,
      n: eslintPluginNode,
      "@next/next": eslintPluginNext,
    },
    rules: {
      ...eslintPluginFunctional.configs.recommended.rules,
      ...eslintPluginFunctional.configs.stylistic.rules,
      ...eslintPluginFunctional.configs["all"].rules,
      ...eslintPluginReact.configs.all.rules,
      ...eslintPluginReactHooks.configs.recommended.rules,
      ...eslintPluginUnicorn.configs.all.rules,
      ...eslintPluginPerfectionist.configs["recommended-alphabetical"].rules,
      ...eslintPluginPerfectionist.configs["recommended-natural"].rules,
      ...eslintPluginPerfectionist.configs["recommended-line-length"].rules,
      ...eslintPluginSecurity.configs.recommended.rules,
      ...eslintPluginSonarJs.configs.recommended.rules,
      ...eslintPluginSonarJs.configs["recommended-legacy"].rules,
      ...eslintPluginJsDoc.configs["flat/recommended-typescript-error"].rules,
      ...eslintPluginJsDoc.configs["flat/stylistic-typescript-error"].rules,
      ...eslintPluginJsDoc.configs["flat/contents-typescript-error"].rules,
      ...eslintPluginJsDoc.configs["flat/logical-typescript-error"].rules,
      ...eslintPluginJsxA11y.configs.recommended.rules,
      ...eslintPluginJsxA11y.configs.strict.rules,
      ...eslintPluginJest.configs["flat/style"].rules,
      ...eslintPluginJest.configs["flat/recommended"].rules,
      ...eslintPluginJest.configs["flat/all"].rules,
      ...eslintPluginNode.configs["flat/recommended"].rules,
      ...eslintPluginNext.configs.recommended.rules,
      ...eslintPluginPromise.configs["flat/recommended"].rules,

      "functional/no-return-void": "off", // this rule is too strict; some functions return void.
      "functional/no-mixed-types": "off", // this rule is too strict; mixed types are allowed.
      "functional/no-try-statements": "off", // this rule is too strict.
      "functional/no-throw-statements": "off", // this rule is too strict; useContext needs to throw.
      "functional/functional-parameters": "off", // this rule is too strict.
      "functional/prefer-immutable-types": "off", // this rule is too strict.
      "functional/no-expression-statements": "off", // this rule contradicts React's `use` hook.
      "functional/no-conditional-statements": "off", // this rule is too strict.
      "functional/type-declaration-immutability": "off", // we enforce readonly types, not immutability.

      "react/jsx-indent": "off", // this rule is not needed, we use Prettier for formatting.
      "react/jsx-no-bind": "warn", // warn on performance issues but allow them.
      "react/jsx-newline": "off", // this rule is not needed, we use Prettier for formatting.
      "react/no-multi-comp": "off", // this rule is too strict; there are files where siblings are defined.
      "react/jsx-sort-props": "off", // this rule is not needed, we use Prettier for formatting.
      "react/jsx-no-literals": "off", // this rule is too strict; literals like emojis are allowed.
      "react/jsx-indent-props": "off", // this rule is not needed, we use Prettier for formatting.
      "react/react-in-jsx-scope": "off", // Next.js automatically injects React into the scope.
      "react/forbid-component-props": "off", // this rule is too strict; we use custom components.
      "react/jsx-props-no-spreading": "off", // prop spreading is allowed.
      "react/jsx-one-expression-per-line": "off", // this rule is not needed, we use Prettier for formatting.
      "react/jsx-closing-bracket-location": "off", // this rule is not needed, we use Prettier for formatting.
      "react/function-component-definition": "off", // this rule is too strict; we use custom components.
      "react/jsx-max-depth": ["error", {max: 12}], // enforce a maximum depth of 12 components.
      "react/no-unstable-nested-components": "off", // this rule is too strict; we use custom components.
      "react/jsx-filename-extension": ["error", {extensions: [".tsx"]}], // enforce .tsx extension for JSX files.

      "unicorn/no-null": "off", // this rule is too strict; null is allowed.
      "unicorn/filename-case": "off", // we use custom filename casing.
      "unicorn/no-keyword-prefix": "off", // this rule is too strict.
      "unicorn/switch-case-braces": "off", // this rule is too strict; some case statements just return.
      "unicorn/prevent-abbreviations": "off", // this rule is too strict.
      "unicorn/no-array-callback-reference": "off", // this rule is too strict.

      "n/no-missing-import": "off", // default imports seem to not be supported.
      "n/no-unsupported-features/node-builtins": "off", // this rule is too strict; we make sure we have latest Node.js version.

      "perfectionist/sort-objects": "off", // this rule is biased; we use Prettier for sorting.
      "perfectionist/sort-modules": "off", // this rule is biased; we use Prettier for sorting.
      "perfectionist/sort-imports": "off", // this rule is biased; we use Prettier for sorting.
      "perfectionist/sort-jsx-props": "off", // this rule is biased; we use Prettier for sorting.
      "perfectionist/sort-interfaces": "off", // this rule is biased; we use Prettier for sorting.
      "perfectionist/sort-union-types": "off", // this rule is biased; we use Prettier for sorting.
      "perfectionist/sort-object-types": "off", // this rule is biased; we use Prettier for sorting.
      "perfectionist/sort-named-imports": "off", // this rule is biased; we use Prettier for sorting.
      "perfectionist/sort-intersection-types": "off", // this rule is biased; we use Prettier for sorting.

      "jsdoc/require-param": "off", // JSDocs are not required for every function.
      "jsdoc/text-escaping": "off", // JSDocs are not required for every function.
      "jsdoc/check-tag-names": "off", // JSDocs are not required for every function.
      "jsdoc/require-returns": "off", // JSDocs are not required for every function.
      "jsdoc/check-param-names": "off", // JSDocs are not required for every function.
    },
    settings: {
      react: {
        version: "19.0.0",
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
  const ignoreList = ["*.config.{js,ts}", "**/node_modules/**", "**/*.test.{ts,tsx}", "**/*.ts"];
  config.ignores = config.ignores ? [...config.ignores, ...ignoreList] : [...ignoreList];
});

export default eslintConfig;
