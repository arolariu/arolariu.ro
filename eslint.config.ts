import eslintPlugin from "@eslint/js";
import eslintPluginNext from "@next/eslint-plugin-next";
import eslintPluginJsxA11y from "eslint-plugin-jsx-a11y";
import eslintPluginNode from "eslint-plugin-n";
import {type Config, defineConfig} from "eslint/config";
// @ts-ignore -- no types for this.
import eslintPluginPromise from "eslint-plugin-promise";
import eslintPluginReact from "eslint-plugin-react";
import eslintPluginReactDOM from "eslint-plugin-react-dom";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import eslintPluginReactHooksExtra from "eslint-plugin-react-hooks-extra";
import eslintPluginReactNamingConvention from "eslint-plugin-react-naming-convention";
import eslintPluginReactWebAPI from "eslint-plugin-react-web-api";
import eslintPluginReactX from "eslint-plugin-react-x";
// @ts-ignore -- no types for this.
import eslintPluginSecurity from "eslint-plugin-security";
import eslintPluginSonarJs from "eslint-plugin-sonarjs";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import globals from "globals";
import tseslint from "typescript-eslint";

const websiteEslintConfig: Config = defineConfig({
  name: "[@arolariu/website]",
  files: ["sites/arolariu.ro/**/*.{ts,tsx}"],
  languageOptions: {
    ecmaVersion: "latest",
    parser: tseslint.parser,
    parserOptions: {
      projectService: {
        defaultProject: "./sites/arolariu.ro/tsconfig.json",
      },
      ecmaFeatures: {
        jsx: true,
        impliedStrict: true,
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
    "@eslint/js": eslintPlugin,
    react: eslintPluginReact,
    "react-dom": eslintPluginReactDOM,
    "react-x": eslintPluginReactX,
    // @ts-ignore - the plugin is not typed correctly.
    "react-hooks": eslintPluginReactHooks,
    "react-hooks-extra": eslintPluginReactHooksExtra,
    "react-web-api": eslintPluginReactWebAPI,
    "react-naming-convention": eslintPluginReactNamingConvention,
    "jsx-a11y": eslintPluginJsxA11y,
    promise: eslintPluginPromise,
    sonarjs: eslintPluginSonarJs,
    security: eslintPluginSecurity,
    unicorn: eslintPluginUnicorn,
    "@typescript-eslint": tseslint.plugin,
    n: eslintPluginNode,
    // @ts-ignore - the plugin is not typed correctly.
    "@next/next": eslintPluginNext,
  },
  rules: {
    ...eslintPlugin.configs.recommended.rules,
    ...eslintPlugin.configs.all.rules,
    ...eslintPluginReactDOM.configs.recommended.rules,
    ...eslintPluginReactHooksExtra.configs.recommended.rules,
    ...eslintPluginReactNamingConvention.configs.recommended.rules,
    ...eslintPluginReactWebAPI.configs.recommended.rules,
    ...eslintPluginReactX.configs["recommended-type-checked"].rules,
    ...eslintPluginReact.configs.all.rules,
    // @ts-ignore - the plugin is not typed correctly.
    ...eslintPluginReactHooks.configs.recommended.rules,
    ...eslintPluginReactHooks.configs["recommended-latest"].rules,
    ...eslintPluginUnicorn.configs.all.rules,
    ...eslintPluginSecurity.configs.recommended.rules,
    ...eslintPluginSonarJs.configs.recommended.rules,
    ...eslintPluginSonarJs.configs["recommended-legacy"].rules,
    ...eslintPluginJsxA11y.configs.recommended.rules,
    ...eslintPluginJsxA11y.configs.strict.rules,
    ...eslintPluginNode.configs["flat/recommended"].rules,
    ...eslintPluginNext.configs.recommended.rules,
    ...eslintPluginPromise.configs["flat/recommended"].rules,

    curly: "off", // we allow no curly braces for 1 instruction lines.
    "one-var": "off", // we allow multiple variable declarations.
    "no-undef": "off", // Next.JS automatically injects React into the namespace.
    camelcase: "off", // we allow camelCase for variable names.
    "new-cap": "off", // we allow new capitalization
    "no-void": "off", // we allow void expressions
    "no-alert": "off", // Sometimes we raise alears in RCCs for clients.
    "id-length": "off", // we allow short variable names.
    "no-shadow": "off", // We never use var to have hoisting issues.
    "sort-keys": "off", // this rule is biased; we use Prettier for sorting.
    "func-style": "off", // we allow both function declarations and expressions.
    "no-console": "off", // Console statements are stripped in prod builds.
    "no-bitwise": "off", // we allow bitwise operators
    "no-ternary": "off", // we use ternary operators for conditional rendering.
    "no-plusplus": "off", // We allow the use of the ++ and -- operators.
    "no-undefined": "off", // we allow undefined values for context init code.
    "dot-notation": "off", // we allow dot notation for property access.
    "sort-imports": "off", // this rule is biased; we use Prettier for sorting.
    "require-await": "off", // RSCs need to be async and sometimes don't have awaits.
    "no-else-return": "off", // we allow else return
    "no-unused-vars": "off", // eslint can't accurately detect unused variables.
    "no-await-in-loop": "off", // we allow await in loops
    "no-magic-numbers": "off", // Magic numbers are used for prioritization of enums and fields.
    "consistent-return": "off", // useEffect hook's cleanup doesn't need to always return.
    "no-inline-comments": "off", // we use inline comments to mark things.
    "no-warning-comments": "off", // We allow todos and warnings.
    "capitalized-comments": "off", // Sometimes comments are multi-line.
    "no-underscore-dangle": "off", // we use dunder naming for private access modifier mark.
    "prefer-arrow-callback": "off", // we allow regular functions definitions too.
    "no-unused-expressions": "off", // Sometimes we use unused expressions for side effects.
    "max-lines-per-function": "off", // we don't impose a max lines limit on functions.
    "max-params": ["error", {max: 5}], // we allow a maximum of 5 parameters per function.
    "max-lines": ["error", {max: 1000}], // we allow a maximum of 1000 lines per file.
    "max-statements": "off", // we don't impose a max statements limit on functions.
    "prefer-destructuring": "off", // Destructuring is a style preference, not always better.
    "arrow-body-style": "off", // We allow both styles for arrow functions.
    "prefer-template": "off", // String concatenation is acceptable.
    "no-continue": "off", // Continue statements are acceptable in loops.
    "no-undef-init": "off", // Explicit undefined initialization is acceptable for clarity.
    "no-use-before-define": "off", // Function hoisting allows usage before definition.
    "complexity": ["warn", {max: 25}], // Warn at 25 complexity, was 20.
    "no-unmodified-loop-condition": "warn", // Warn about unmodified loop conditions.
    "radix": "warn", // Warn about missing radix in parseInt.
    "no-duplicate-imports": "warn", // Warn about duplicate imports.

    "react/jsx-indent": "off", // We format via Prettier.
    "react/jsx-newline": "off", // We use Prettier for formatting.
    "react/jsx-max-depth": "off", // Sometimes we have deeply nested components.
    "react/no-multi-comp": "off", // Dialog Container impl. requries all dialogs colocated.
    "react/jsx-sort-props": "off", // We sort via Prettier.
    "react/jsx-no-literals": "off", // We allow literal strings in JSX.
    "react/jsx-indent-props": "off", // We format via Prettier.
    "react/jsx-curly-newline": "off", // We format via Prettier.
    "react/react-in-jsx-scope": "off", // Next.JS injects React in namespace.
    "react/forbid-component-props": "off", // We allow component props.
    "react/destructuring-assignment": "off", // Layout, RSC, RCC props are marked as props.
    "react/jsx-one-expression-per-line": "off", // We use Prettier for formatting.
    "react/jsx-closing-bracket-location": "off", // We use Prettier for formatting.
    "react/function-component-definition": "off", // Sometimes we use arrow syntax.
    "react/jsx-filename-extension": [2, {extensions: [".tsx", ".ts"]}],
    "react/jsx-props-no-spreading": "off", // We allow props spreading for composition patterns.
    "react/jsx-no-bind": "off", // Event handlers are stable references in modern React.
    "react/no-array-index-key": "off", // Used intentionally in stable lists.
    "react/prefer-read-only-props": "off", // TypeScript Readonly<Props> is sufficient.
    "react/require-default-props": "off", // TypeScript optional props handle defaults.
    "react/no-unescaped-entities": "off", // Apostrophes and quotes are fine in JSX text content.
    "react/no-unstable-nested-components": "warn", // Warn about nested component definitions.
    "react/button-has-type": "warn", // Warn about missing button type.
    "react/jsx-no-leaked-render": "warn", // Warn about potential leaked renders, but don't block.

    "react-hooks-extra/no-direct-set-state-in-use-effect": "off", // We allow direct setState calls in useEffect.

    "n/no-missing-import": "off", // Barrel and index files are blindly caught by this rule.
    "n/no-unsupported-features/node-builtins": "off", // We use Node.js v24+ built-ins.

    "sonarjs/todo-tag": "off", // We allow todos tags.
    "sonarjs/prefer-read-only-props": "off", // TypeScript Readonly<Props> is sufficient.
    "sonarjs/no-nested-template-literals": "off", // Template literals improve readability over concatenation.
    "sonarjs/no-nested-conditional": "off", // Nested ternaries are acceptable when properly formatted.
    "sonarjs/cognitive-complexity": "off", // Complexity metrics are guidelines, not hard rules.
    "sonarjs/no-unused-vars": "off", // TypeScript handles unused variables.
    "sonarjs/different-types-comparison": "warn", // Warn but don't block on type mismatches.
    "sonarjs/pseudo-random": "warn", // Math.random is acceptable for non-cryptographic use.
    "sonarjs/no-redundant-assignments": "warn", // Warn about redundant assignments.

    "unicorn/no-null": "off", // We allow null values.
    "unicorn/prefer-spread": "off", // We have no preference.
    "unicorn/filename-case": "off", // this rule is biased.
    "unicorn/no-array-for-each": "off", // We have no preference.
    "unicorn/no-keyword-prefix": "off", // Biased rule.
    "unicorn/number-literal-case": "off", // We allow any casing for number literals.
    "unicorn/switch-case-braces": "off", // Single statement switch cases can be unbraced.
    "unicorn/no-typeof-undefined": "off", // We allow typeof undefined comparison checks.
    "unicorn/prevent-abbreviations": "off", // this rule is biased.
    "unicorn/no-abusive-eslint-disable": "warn", // Warn about abusive eslint-disable usage.
    "unicorn/no-array-reduce": "off", // Array.reduce is idiomatic JavaScript.
    "unicorn/no-array-sort": "off", // Array.sort is widely used and understood.
    "unicorn/explicit-length-check": "off", // Implicit boolean coercion is idiomatic.
    "unicorn/numeric-separators-style": "off", // Numeric separators are a style preference.
    "unicorn/no-nested-ternary": "off", // Nested ternaries are acceptable when formatted.
    "unicorn/prefer-string-slice": "off", // Both substring and slice are acceptable.
    "unicorn/no-negated-condition": "off", // Negated conditions can be clearer in some contexts.
    "unicorn/consistent-function-scoping": "off", // Inner functions can improve readability.
    "unicorn/consistent-destructuring": "off", // Destructuring is a style preference.
    "unicorn/no-useless-switch-case": "off", // Explicit cases improve clarity.
    "unicorn/prefer-add-event-listener": "warn", // Warn about inline event handlers.
    "unicorn/no-zero-fractions": "warn", // Warn about zero fractions in numbers.
  },
  settings: {
    react: {
      version: "19.2.0",
    },
    node: {
      version: "24",
    },
  },
  linterOptions: {
    reportUnusedDisableDirectives: false,
  },
})[0] as Config;

const cvEslintConfig: Config = defineConfig({
  name: "[@arolariu/cv]",
  files: ["sites/cv.arolariu.ro/**/*.ts"],
  languageOptions: {
    ecmaVersion: "latest",
    parser: tseslint.parser,
    parserOptions: {
      extraFileExtensions: [".svelte"],
      projectService: {
        defaultProject: "./sites/cv.arolariu.ro/tsconfig.json",
      },
      ecmaFeatures: {
        impliedStrict: true,
        jsx: false,
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
    "@eslint/js": eslintPlugin,
    promise: eslintPluginPromise,
    sonarjs: eslintPluginSonarJs,
    security: eslintPluginSecurity,
    unicorn: eslintPluginUnicorn,
    "@typescript-eslint": tseslint.plugin,
    n: eslintPluginNode,
  },
  rules: {
    ...eslintPlugin.configs.recommended.rules,
    ...eslintPlugin.configs.all.rules,
    ...eslintPluginUnicorn.configs.all.rules,
    ...eslintPluginSecurity.configs.recommended.rules,
    ...eslintPluginSonarJs.configs.recommended.rules,
    ...eslintPluginSonarJs.configs["recommended-legacy"].rules,
    ...eslintPluginNode.configs["flat/recommended"].rules,
    ...eslintPluginPromise.configs["flat/recommended"].rules,

    curly: "off", // we allow single line if statements without braces.
    "one-var": "off", // we allow multiple variable declarations per file.
    "no-undef": "off", // svelte + eslint can't accurately detect undefined variables.
    "sort-keys": "off", // this rule is biased; we use Prettier for sorting.
    "no-continue": "off", // we allow continue statements in loops.
    "no-console": "off", // Console statements are stripped in prod builds.
    "no-ternary": "off", // we use ternary operators for conditional expressions.
    "func-style": "off", // we allow both function declarations and expressions.
    "sort-imports": "off", // this rule is biased; we use Prettier for sorting.
    "max-statements": "off", // we don't impose a max statements limit on functions.
    "no-underscore-dangle": "off", // we use dunder naming for private access modifier mark.
    "max-lines-per-function": "off", // we don't impose a max lines limit on functions.
    "max-lines": ["error", {max: 600}], // we allow a maximum of 600 lines per file.

    "react/jsx-indent": "off", // We format via Prettier.
    "react/jsx-newline": "off", // We use Prettier for formatting.
    "react/jsx-max-depth": "off", // Sometimes we have deeply nested components.
    "react/no-multi-comp": "off", // Dialog Container impl. requries all dialogs colocated.
    "react/jsx-sort-props": "off", // We sort via Prettier.
    "react/jsx-no-literals": "off", // We allow literal strings in JSX.
    "react/jsx-indent-props": "off", // We format via Prettier.
    "react/jsx-curly-newline": "off", // We format via Prettier.

    "unicorn/no-null": "off", // We allow null values.
    "unicorn/filename-case": "off", // this rule is biased.
    "unicorn/prefer-dom-node-append": "off", // We support older browsers.
    "unicorn/prefer-dom-node-remove": "off", // We support older browsers.

    "n/no-missing-import": "off", // Barrel and index files are blindly caught by this rule.
    "n/no-unsupported-features/node-builtins": "off", // We use Node.js v24+ built-ins.
  },
  settings: {
    node: {
      version: "24",
    },
  },
  linterOptions: {
    reportUnusedDisableDirectives: false,
  },
})[0] as Config;

const packagesEslintConfig: Config = defineConfig({
  name: "[@arolariu/packages]",
  files: ["packages/**/*.{ts,tsx}"],
  languageOptions: {
    ecmaVersion: "latest",
    parser: tseslint.parser,
    parserOptions: {
      projectService: {
        defaultProject: "./packages/components/tsconfig.json",
      },
      ecmaFeatures: {
        jsx: true,
        impliedStrict: true,
      },
      tsconfigRootDir: import.meta.dirname,
      ecmaVersion: "latest",
      errorOnTypeScriptSyntacticAndSemanticIssues: true,
      warnOnUnsupportedTypeScriptVersion: true,
      errorOnUnknownASTType: true,
      comment: true,
    },
    globals: {...globals.browser},
  },
  plugins: {
    "@eslint/js": eslintPlugin,
    react: eslintPluginReact,
    "react-dom": eslintPluginReactDOM,
    "react-x": eslintPluginReactX,
    // @ts-ignore - the plugin is not typed correctly.
    "react-hooks": eslintPluginReactHooks,
    "react-hooks-extra": eslintPluginReactHooksExtra,
    "react-web-api": eslintPluginReactWebAPI,
    "react-naming-convention": eslintPluginReactNamingConvention,
    "jsx-a11y": eslintPluginJsxA11y,
    promise: eslintPluginPromise,
    sonarjs: eslintPluginSonarJs,
    security: eslintPluginSecurity,
    unicorn: eslintPluginUnicorn,
    "@typescript-eslint": tseslint.plugin,
    n: eslintPluginNode,
  },
  rules: {
    ...eslintPlugin.configs.recommended.rules,
    ...eslintPlugin.configs.all.rules,
    ...eslintPluginReactDOM.configs.recommended.rules,
    ...eslintPluginReactHooksExtra.configs.recommended.rules,
    ...eslintPluginReactNamingConvention.configs.recommended.rules,
    ...eslintPluginReactWebAPI.configs.recommended.rules,
    ...eslintPluginReactX.configs["recommended-type-checked"].rules,
    ...eslintPluginReact.configs.all.rules,
    // @ts-ignore - the plugin is not typed correctly.
    ...eslintPluginReactHooks.configs.recommended.rules,
    ...eslintPluginUnicorn.configs.all.rules,
    ...eslintPluginSecurity.configs.recommended.rules,
    ...eslintPluginSonarJs.configs.recommended.rules,
    ...eslintPluginSonarJs.configs["recommended-legacy"].rules,
    ...eslintPluginJsxA11y.configs.recommended.rules,
    ...eslintPluginJsxA11y.configs.strict.rules,
    ...eslintPluginNode.configs["flat/recommended"].rules,
    ...eslintPluginPromise.configs["flat/recommended"].rules,

    curly: "off", // we allow single line if statements without braces.
    camelcase: "off", // we allow camelCase for variable names.
    "one-var": "off", // we allow multiple variable declarations per file.
    "id-length": "off", // we allow short variable names.
    "sort-keys": "off", // this rule is biased; we use Prettier for sorting.
    "no-plusplus": "off", // We allow the use of the ++ and -- operators.
    "no-ternary": "off", // we use ternary operators for conditional rendering.
    "no-shadow": "off", // We never use var to have hoisting issues.
    "func-style": "off", // we allow both function declarations and expressions.
    "dot-notation": "off", // we allow dot notation for property access.
    "sort-imports": "off", // this rule is biased; we use Prettier for sorting.
    "no-undefined": "off", // we allow undefined values for context init code.
    "no-unused-vars": "off", // eslint can't accurately detect unused hoisted variables from fns.
    "max-statements": "off", // we don't impose a max statements limit on functions.
    "arrow-body-style": "off", // we allow both expression and block bodies for arrow functions.
    "consistent-return": "off", // useEffect cleanup fns are not 100% needed.
    "no-magic-numbers": "off", // Magic numbers are used for prioritization of enums and fields.
    "no-inline-comments": "off", // we use inline comments to mark things.
    "capitalized-comments": "off", // Sometimes comments are multi-line.
    "no-underscore-dangle": "off", // we use dunder naming for private access modifier mark.
    "no-use-before-define": "off", // we define functions after their usage, this is a library.
    "max-lines-per-function": "off", // we don't impose a max lines limit on functions.
    "max-params": ["error", {max: 10}], // we allow a maximum of 10 parameters per function.
    "max-lines": ["error", {max: 1000}], // we allow a maximum of 1000 lines per file.

    "react/jsx-indent": "off", // We format via Prettier.
    "react/jsx-newline": "off", // We use Prettier for formatting.
    "react/jsx-no-bind": "off", // Performance hit from using ShadCN - jsx bind is alive.
    "react/no-multi-comp": "off", // Colocate components in same main file.
    "react/jsx-max-depth": "off", // Sometimes we have deeply nested components.
    "react/jsx-sort-props": "off", // We sort via Prettier.
    "react/jsx-no-literals": "off", // We allow literal strings in JSX -- another ShadCN limitation.
    "react/self-closing-comp": "off", // Another limitation pulled from ShadCN library.
    "react/jsx-indent-props": "off", // We format via Prettier.
    "react/jsx-curly-newline": "off", // We format via Prettier.
    "react/no-array-index-key": "off", // another ShadCN limitation.
    "react/require-default-props": "off", // We use TypeScript's optional props.
    "react/prefer-read-only-props": "off", // We don't enforce read-only props.
    "react/jsx-props-no-spreading": "off", // We allow props spreading.
    "react/forbid-component-props": "off", // We allow component props.
    "react/jsx-closing-tag-location": "off", // We use Prettier for formatting.
    "react/jsx-one-expression-per-line": "off", // We use Prettier for formatting.
    "react/jsx-closing-bracket-location": "off", // We use Prettier for formatting.
    "react/function-component-definition": "off", // Sometimes we use arrow syntax.
    "react/jsx-no-constructed-context-values": "off", // Another ShadCN limitation...
    "react/jsx-filename-extension": [2, {extensions: [".tsx", ".ts"]}],

    "react-hooks/refs": "off", // Another ShadCN limitation...
    "react-hooks/purity": "off", // Some hooks are not pure due to randomness (e.g. confetti).
    "react-hooks/immutability": "off", // Another ShadCN limitation...
    "react-hooks/preserve-manual-memoization": "off", // Another ShadCN limitation...

    "react-x/no-use-context": "off", // We use React Context API from React 18.
    "react-x/no-forward-ref": "off", // We use forwardRef where needed, from React 18.
    "react-x/no-array-index-key": "off", // Another ShadCN limitation...
    "react-x/no-unstable-context": "off", // Another ShadCN limitation...
    "react-x/no-context-provider": "off", // We use React Context API from React 18.
    "react-x/no-unstable-context-value": "off", // Another ShadCN limitation...

    "n/no-unpublished-import": "off", // Packages are published; false positive.
    "n/no-missing-import": "off", // Barrel and index files are blindly caught by this rule.

    "sonarjs/pseudo-random": "off", // We allow Math.random for non-crypto use cases.
    "sonarjs/prefer-read-only-props": "off", // We don't enforce read-only props.
    "sonarjs/no-nested-functions": "off", // Sometimes fns are nested for closure reasons.
    "sonarjs/no-nested-conditional": "off", // Another ShadCN limitation...

    "security/detect-object-injection": "off", // We don't do object injection; it's controlled keys.

    "unicorn/no-null": "off", // We allow null values.
    "unicorn/filename-case": "off", // this rule is biased.
    "unicorn/no-array-for-each": "off", // We have no preference.
    "unicorn/no-keyword-prefix": "off", // Biased rule.
    "unicorn/no-nested-ternary": "off", // We allow nested ternary operators.
    "unicorn/prevent-abbreviations": "off", // this rule is biased.
    "unicorn/explicit-length-check": "off", // .size sometimes returns a string, not a number.
    "unicorn/no-abusive-eslint-disable": "warn", // We warn about eslint-disable comments.
  },
  settings: {
    react: {
      version: "19.2.0",
    },
    node: {
      version: "24",
    },
  },
  linterOptions: {
    reportUnusedDisableDirectives: false,
  },
})[0] as Config;

const eslintConfig = defineConfig(websiteEslintConfig, cvEslintConfig, packagesEslintConfig);

// Add the global ignores to the default config.
for (const individualEslintConfig of eslintConfig) {
  const eslintPathsIgnoreList = [
    "**/{node_modules,.storybook,.svelte-kit,.next,out,bin,build,dist,scripts}/**", // dirs
    "**/*.{test,config,spec,setup,stories,d}.{js,jsx,ts,tsx}", // files
  ];

  individualEslintConfig.ignores = individualEslintConfig.ignores
    ? [...individualEslintConfig.ignores, ...eslintPathsIgnoreList]
    : [...eslintPathsIgnoreList];
}

export default eslintConfig;
