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
  ignores: [
    "sites/arolariu.ro/messages/*.d.json.ts", // Generated i18n type declarations
  ],
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
    ...eslintPluginReactNamingConvention.configs.recommended.rules,
    ...eslintPluginReactWebAPI.configs.recommended.rules,
    ...eslintPluginReactX.configs["recommended-type-checked"].rules,
    ...eslintPluginReact.configs.all.rules,
    // @ts-ignore - the plugin is not typed correctly.
    ...eslintPluginReactHooks.configs.recommended.rules,
    ...eslintPluginReactHooks.configs["recommended-latest"].rules,
    ...eslintPluginUnicorn.configs.all.rules,
    // Opinionated rules newly enabled by unicorn 64 -> 73 via `configs.all` (nine majors of additions)
    // that this codebase deliberately never adopted. Each is style/preference, a too-new runtime API, or a
    // false positive in our context (SSR, module-level caches, safe constant replacements).
    "unicorn/no-asterisk-prefix-in-documentation-comments": "off", // We use standard JSDoc `*`-prefixed comment blocks.
    "unicorn/single-line-block-comment-style": "off", // We allow single-line block comments.
    "unicorn/name-replacements": "off", // Biased; conflicts with React terms (props, ref) and our domain naming.
    "unicorn/consistent-arrow-return-style": "off", // Arrow body style is our choice; Prettier owns formatting.
    "unicorn/try-complexity": "off", // We don't impose a try-block complexity limit.
    "unicorn/prefer-temporal": "off", // The Temporal API is not yet available in our Node/browser runtime targets.
    "unicorn/no-top-level-assignment-in-function": "off", // We use module-level caches/singletons (lazy init, circuit breakers, request dedup).
    "unicorn/no-unreadable-new-expression": "off", // Biased readability rule.
    "unicorn/prefer-error-is-error": "off", // Error.isError is too new for our runtime targets; we use instanceof.
    "unicorn/comment-content": "off", // We don't enforce specific wording inside comments.
    "unicorn/consistent-boolean-name": "off", // Biased boolean-naming rule.
    "unicorn/no-barrel-files": "off", // We deliberately use barrel/index files.
    "unicorn/prefer-global-number-constants": "off", // We allow explicit Number.* constants.
    "unicorn/no-unreadable-for-of-expression": "off", // Biased readability rule.
    "unicorn/consistent-conditional-object-spread": "off", // We allow both conditional object-spread styles.
    "unicorn/prefer-early-return": "off", // We allow nested conditionals where clearer.
    "unicorn/prefer-hoisting-branch-code": "off", // Biased; we keep code local to its branch.
    "unicorn/no-useless-else": "off", // We allow else after return for clarity (matches no-else-return: off).
    "unicorn/prefer-await": "off", // We allow promise chains where appropriate.
    "unicorn/no-unnecessary-global-this": "off", // globalThis.<x> is SSR-safe access to browser-only globals.
    "unicorn/prefer-minimal-ternary": "off", // Biased ternary rule.
    "unicorn/no-useless-coercion": "off", // We allow explicit coercions for clarity/robustness.
    "unicorn/no-unsafe-string-replacement": "off", // Our replacement values are safe constant literal origins.
    "unicorn/no-top-level-side-effects": "off", // Some modules intentionally run initialization side effects.
    "unicorn/prefer-continue": "off", // We allow both `continue` and negated-if loop bodies.
    "unicorn/no-declarations-before-early-exit": "off", // We allow declarations before guard returns.
    "unicorn/prefer-uint8array-base64": "off", // Uint8Array base64 methods are too new for our runtime targets.
    "unicorn/prefer-set-methods": "off", // We allow Set filtering via has(); Set.prototype.difference is newish.

    // Tail of the unicorn 64 -> 73 wave that only fired in files outside the initial local sample (caught by CI).
    // Same rationale as above: each is style/preference, a v73 rename of a rule we already disable, a too-new
    // runtime API, or a false positive in our object-method/SSR/derived-value patterns.
    "unicorn/no-this-outside-of-class": "off", // We use `this` in object-literal methods / factory objects; flags valid non-class method patterns.
    "unicorn/prefer-array-from-map": "off", // Style; we use spread+map / Array#map freely.
    "unicorn/no-for-each": "off", // v73 rename of no-array-for-each (already disabled); no forEach preference.
    "unicorn/prefer-direct-iteration": "off", // Style; we iterate via indices/entries where clearer.
    "unicorn/prefer-simple-condition-first": "off", // Biased condition-ordering rule.
    "unicorn/prefer-number-coercion": "off", // We allow explicit Number()/unary-plus coercions (matches no-useless-coercion off).
    "unicorn/no-useless-template-literals": "off", // Style; owned by Prettier/preference.
    "unicorn/prefer-split-limit": "off", // Style; String#split without a limit is acceptable.
    "unicorn/no-computed-property-existence-check": "off", // We intentionally use computed `obj[key]` existence checks.
    "unicorn/prefer-unicode-code-point-escapes": "off", // Style; we allow \uXXXX escapes.
    "unicorn/prefer-type-literal-last": "off", // Biased type-member ordering; Prettier/preference owns ordering.
    "unicorn/custom-error-definition": "off", // Biased; we define custom error classes our own way.
    "unicorn/prefer-iterator-to-array": "off", // Style; we use spread / Array.from on iterables freely.
    "unicorn/prefer-observer-apis": "off", // Biased; we choose event listeners vs observers per case.
    "unicorn/no-break-in-nested-loop": "off", // We allow `break` in nested loops for clarity.
    "unicorn/prefer-includes-over-repeated-comparisons": "off", // Style/preference.
    "unicorn/dom-node-dataset": "off", // Style; we allow get/setAttribute over dataset.
    "unicorn/no-unreadable-object-destructuring": "off", // Biased readability rule (matches other no-unreadable-* off).
    "unicorn/no-unnecessary-boolean-comparison": "off", // We allow explicit boolean comparisons for clarity.
    "unicorn/no-non-function-verb-prefix": "off", // Biased naming rule (matches prevent-abbreviations/name-replacements off).
    "unicorn/prefer-ternary": "off", // We allow if/else over ternary (matches prefer-minimal-ternary off).
    "unicorn/no-negated-array-predicate": "off", // Style/preference.
    "unicorn/consistent-class-member-order": "off", // Biased ordering; Prettier/preference owns ordering.
    "unicorn/no-unused-properties": "off", // Unreliable dead-code detection; false positives on typed shapes.
    "unicorn/max-nested-calls": "off", // We don't impose a nested-call limit.
    "unicorn/prefer-then-catch": "off", // Style; we allow .then/.catch chains (matches prefer-await off).
    "unicorn/no-invalid-file-input-accept": "off", // Our `accept` value is derived from a shared extension list; rule can't statically resolve computed expressions (false positive).
    "unicorn/prefer-else-if": "off", // We allow nested else blocks (matches no-useless-else/prefer-early-return off).
    "unicorn/no-array-front-mutation": "off", // We intentionally use Array#shift() for bounded FIFO/trail buffers.
    "unicorn/no-negated-condition": "off", // We allow negated conditions for guard-style checks.
    "unicorn/explicit-length-check": "off", // .size can return a non-number; matches the package-block disable.
    "unicorn/no-useless-undefined": "off", // We allow explicit undefined (matches no-undefined off).
    "unicorn/prefer-logical-operator-over-ternary": "off", // Style; we allow ternaries.
    "unicorn/no-manually-wrapped-comments": "off", // Style; we allow manually wrapped comment lines.
    "unicorn/prefer-promise-with-resolvers": "off", // Promise.withResolvers is too new for our runtime targets (matches prefer-error-is-error/prefer-uint8array-base64 policy).
    "unicorn/prefer-object-iterable-methods": "off", // Object.* iterable helpers are newish; too new / style.
    "unicorn/prefer-boolean-return": "off", // Biased; we allow explicit conditional returns.
    ...eslintPluginSecurity.configs.recommended.rules,
    ...eslintPluginSonarJs.configs.recommended.rules,
    ...eslintPluginJsxA11y.configs.recommended.rules,
    ...eslintPluginJsxA11y.configs.strict.rules,
    ...eslintPluginNode.configs["flat/recommended"].rules,
    ...eslintPluginNext.configs.recommended.rules,
    ...eslintPluginPromise.configs["flat/recommended"].rules,

    curly: "off", // we allow no curly braces for 1 instruction lines.
    eqeqeq: "off", // we allow == and != operators
    "one-var": "off", // we allow multiple variable declarations.
    camelcase: "off", // we allow camelCase for variable names.
    "new-cap": "off", // we allow new capitalization
    "no-void": "off", // we allow void expressions
    "no-undef": "off", // Next.JS automatically injects React into the namespace.
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
    "no-else-return": "off", // we allow else return statements for clarity.
    " no-undef-init": "off", // we allow initializing variables to undefined.
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
    "arrow-body-style": "off", // we allow both expression and block bodies for arrow functions.

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

    // eslint-plugin-react@7.37.5 rules that call ESLint APIs removed in ESLint 10 and crash at runtime; no newer plugin release exists. The spacing rules are owned by Prettier regardless.
    "react/forward-ref-uses-ref": "off", // Calls removed context.getSourceCode().
    "react/jsx-curly-spacing": "off", // Calls removed sourceCode.isSpaceBetweenTokens(); Prettier owns spacing.
    "react/jsx-equals-spacing": "off", // Calls removed sourceCode.isSpaceBetweenTokens(); Prettier owns spacing.
    "react/jsx-tag-spacing": "off", // Calls removed sourceCode.isSpaceBetweenTokens(); Prettier owns spacing.
    "react/jsx-one-expression-per-line": "off", // We use Prettier for formatting.
    "react/jsx-closing-bracket-location": "off", // We use Prettier for formatting.
    "react/function-component-definition": "off", // Sometimes we use arrow syntax.
    "react/jsx-filename-extension": "off", // Rule calls context.getFilename(), removed in ESLint 10; crashes at runtime (not covered by eslint-plugin-react compat shim).

    // eslint-plugin-react-x@5 (upgraded alongside ESLint 10) enables rules that either duplicate the
    // React-team-maintained eslint-plugin-react-hooks or restate repo-wide React decisions already accepted
    // in individual blocks.
    // Duplicates of eslint-plugin-react-hooks (React-team-maintained); defer to that single source per concern.
    "react-x/rules-of-hooks": "off",
    "react-x/exhaustive-deps": "off",
    "react-x/purity": "off", // Duplicate of react-hooks/purity (e.g. new Date()/structuredClone during render).
    "react-x/error-boundaries": "off", // Duplicate of react-hooks/error-boundaries.
    // Repo-wide React decisions already accepted elsewhere (React 18 Context API, ShadCN index keys).
    "react-x/no-use-context": "off",
    "react-x/no-context-provider": "off",
    "react-x/no-array-index-key": "off",
    // New in react-x@5: false-positive on memoized component-reference selection (e.g. dynamic icon via useMemo).
    "react-x/static-components": "off",
    "react-x/set-state-in-effect": "off", // We allow direct setState calls in useEffect (react-hooks-extra rule absorbed into react-x@5).

    "n/no-missing-import": "off", // Barrel and index files are blindly caught by this rule.
    "n/no-unsupported-features/node-builtins": "off", // We use Node.js v24+ built-ins.

    "sonarjs/todo-tag": "off", // We allow todos tags.

    "security/detect-object-injection": "off", // We trust our data sources.

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

    // Function declarations are hoisted in JavaScript, so referring to a function before its
    // lexical position is safe at runtime. Keep the rule strict for variables/classes/let.
    "no-use-before-define": ["error", {functions: false, classes: true, variables: true}],

    // The base no-redeclare rule doesn't understand TypeScript value/type namespace separation,
    // so it false-positives on the standard const-as-enum pattern:
    //   export const X = { ... } as const;
    //   export type X = (typeof X)[keyof typeof X];
    // Disable the base rule and let the typescript-eslint variant (which is namespace-aware) handle it.
    "no-redeclare": "off",
    "@typescript-eslint/no-redeclare": "error",
  },
  settings: {
    react: {
      version: "19.2.0",
    },
    node: {
      version: "24",
    },
    next: {
      rootDir: "sites/arolariu.ro",
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
    // Opinionated rules newly enabled by unicorn 64 -> 73 via `configs.all` (nine majors of additions)
    // that this codebase deliberately never adopted. Each is style/preference, a too-new runtime API, or a
    // false positive in our context (SSR, module-level caches, safe constant replacements).
    "unicorn/no-asterisk-prefix-in-documentation-comments": "off", // We use standard JSDoc `*`-prefixed comment blocks.
    "unicorn/single-line-block-comment-style": "off", // We allow single-line block comments.
    "unicorn/name-replacements": "off", // Biased; conflicts with React terms (props, ref) and our domain naming.
    "unicorn/consistent-arrow-return-style": "off", // Arrow body style is our choice; Prettier owns formatting.
    "unicorn/try-complexity": "off", // We don't impose a try-block complexity limit.
    "unicorn/prefer-temporal": "off", // The Temporal API is not yet available in our Node/browser runtime targets.
    "unicorn/no-top-level-assignment-in-function": "off", // We use module-level caches/singletons (lazy init, circuit breakers, request dedup).
    "unicorn/no-unreadable-new-expression": "off", // Biased readability rule.
    "unicorn/prefer-error-is-error": "off", // Error.isError is too new for our runtime targets; we use instanceof.
    "unicorn/comment-content": "off", // We don't enforce specific wording inside comments.
    "unicorn/consistent-boolean-name": "off", // Biased boolean-naming rule.
    "unicorn/no-barrel-files": "off", // We deliberately use barrel/index files.
    "unicorn/prefer-global-number-constants": "off", // We allow explicit Number.* constants.
    "unicorn/no-unreadable-for-of-expression": "off", // Biased readability rule.
    "unicorn/consistent-conditional-object-spread": "off", // We allow both conditional object-spread styles.
    "unicorn/prefer-early-return": "off", // We allow nested conditionals where clearer.
    "unicorn/prefer-hoisting-branch-code": "off", // Biased; we keep code local to its branch.
    "unicorn/no-useless-else": "off", // We allow else after return for clarity (matches no-else-return: off).
    "unicorn/prefer-await": "off", // We allow promise chains where appropriate.
    "unicorn/no-unnecessary-global-this": "off", // globalThis.<x> is SSR-safe access to browser-only globals.
    "unicorn/prefer-minimal-ternary": "off", // Biased ternary rule.
    "unicorn/no-useless-coercion": "off", // We allow explicit coercions for clarity/robustness.
    "unicorn/no-unsafe-string-replacement": "off", // Our replacement values are safe constant literal origins.
    "unicorn/no-top-level-side-effects": "off", // Some modules intentionally run initialization side effects.
    "unicorn/prefer-continue": "off", // We allow both `continue` and negated-if loop bodies.
    "unicorn/no-declarations-before-early-exit": "off", // We allow declarations before guard returns.
    "unicorn/prefer-uint8array-base64": "off", // Uint8Array base64 methods are too new for our runtime targets.
    "unicorn/prefer-set-methods": "off", // We allow Set filtering via has(); Set.prototype.difference is newish.

    // Tail of the unicorn 64 -> 73 wave that only fired in files outside the initial local sample (caught by CI).
    // Same rationale as above: each is style/preference, a v73 rename of a rule we already disable, a too-new
    // runtime API, or a false positive in our object-method/SSR/derived-value patterns.
    "unicorn/no-this-outside-of-class": "off", // We use `this` in object-literal methods / factory objects; flags valid non-class method patterns.
    "unicorn/prefer-array-from-map": "off", // Style; we use spread+map / Array#map freely.
    "unicorn/no-for-each": "off", // v73 rename of no-array-for-each (already disabled); no forEach preference.
    "unicorn/prefer-direct-iteration": "off", // Style; we iterate via indices/entries where clearer.
    "unicorn/prefer-simple-condition-first": "off", // Biased condition-ordering rule.
    "unicorn/prefer-number-coercion": "off", // We allow explicit Number()/unary-plus coercions (matches no-useless-coercion off).
    "unicorn/no-useless-template-literals": "off", // Style; owned by Prettier/preference.
    "unicorn/prefer-split-limit": "off", // Style; String#split without a limit is acceptable.
    "unicorn/no-computed-property-existence-check": "off", // We intentionally use computed `obj[key]` existence checks.
    "unicorn/prefer-unicode-code-point-escapes": "off", // Style; we allow \uXXXX escapes.
    "unicorn/prefer-type-literal-last": "off", // Biased type-member ordering; Prettier/preference owns ordering.
    "unicorn/custom-error-definition": "off", // Biased; we define custom error classes our own way.
    "unicorn/prefer-iterator-to-array": "off", // Style; we use spread / Array.from on iterables freely.
    "unicorn/prefer-observer-apis": "off", // Biased; we choose event listeners vs observers per case.
    "unicorn/no-break-in-nested-loop": "off", // We allow `break` in nested loops for clarity.
    "unicorn/prefer-includes-over-repeated-comparisons": "off", // Style/preference.
    "unicorn/dom-node-dataset": "off", // Style; we allow get/setAttribute over dataset.
    "unicorn/no-unreadable-object-destructuring": "off", // Biased readability rule (matches other no-unreadable-* off).
    "unicorn/no-unnecessary-boolean-comparison": "off", // We allow explicit boolean comparisons for clarity.
    "unicorn/no-non-function-verb-prefix": "off", // Biased naming rule (matches prevent-abbreviations/name-replacements off).
    "unicorn/prefer-ternary": "off", // We allow if/else over ternary (matches prefer-minimal-ternary off).
    "unicorn/no-negated-array-predicate": "off", // Style/preference.
    "unicorn/consistent-class-member-order": "off", // Biased ordering; Prettier/preference owns ordering.
    "unicorn/no-unused-properties": "off", // Unreliable dead-code detection; false positives on typed shapes.
    "unicorn/max-nested-calls": "off", // We don't impose a nested-call limit.
    "unicorn/prefer-then-catch": "off", // Style; we allow .then/.catch chains (matches prefer-await off).
    "unicorn/no-invalid-file-input-accept": "off", // Our `accept` value is derived from a shared extension list; rule can't statically resolve computed expressions (false positive).
    "unicorn/prefer-else-if": "off", // We allow nested else blocks (matches no-useless-else/prefer-early-return off).
    "unicorn/no-array-front-mutation": "off", // We intentionally use Array#shift() for bounded FIFO/trail buffers.
    "unicorn/no-negated-condition": "off", // We allow negated conditions for guard-style checks.
    "unicorn/explicit-length-check": "off", // .size can return a non-number; matches the package-block disable.
    "unicorn/no-useless-undefined": "off", // We allow explicit undefined (matches no-undefined off).
    "unicorn/prefer-logical-operator-over-ternary": "off", // Style; we allow ternaries.
    "unicorn/no-manually-wrapped-comments": "off", // Style; we allow manually wrapped comment lines.
    "unicorn/prefer-promise-with-resolvers": "off", // Promise.withResolvers is too new for our runtime targets (matches prefer-error-is-error/prefer-uint8array-base64 policy).
    "unicorn/prefer-object-iterable-methods": "off", // Object.* iterable helpers are newish; too new / style.
    "unicorn/prefer-boolean-return": "off", // Biased; we allow explicit conditional returns.
    ...eslintPluginSecurity.configs.recommended.rules,
    ...eslintPluginSonarJs.configs.recommended.rules,
    ...eslintPluginSonarJs.configs["recommended-legacy"].rules,
    ...eslintPluginNode.configs["flat/recommended"].rules,
    ...eslintPluginPromise.configs["flat/recommended"].rules,

    curly: "off", // we allow single line if statements without braces.
    "one-var": "off", // we allow multiple variable declarations per file.
    "no-undef": "off", // svelte + eslint can't accurately detect undefined variables.
    "sort-keys": "off", // this rule is biased; we use Prettier for sorting.
    "no-bitwise": "off", // we allow bitwise operators.
    "no-console": "off", // Console statements are stripped in prod builds.
    "no-ternary": "off", // we use ternary operators for conditional expressions.
    "func-style": "off", // we allow both function declarations and expressions.
    "no-plusplus": "off", // We allow the use of the ++ and -- operators.
    "no-continue": "off", // we allow continue statements in loops.
    "sort-imports": "off", // this rule is biased; we use Prettier for sorting.
    "no-undefined": "off", // we allow undefined values for context init code.
    "max-statements": "off", // we don't impose a max statements limit on functions.
    "no-magic-numbers": "off", // Magic numbers are used for prioritization of enums and fields.
    "no-inline-comments": "off", // we use inline comments to mark things.
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
    ...eslintPluginReactNamingConvention.configs.recommended.rules,
    ...eslintPluginReactWebAPI.configs.recommended.rules,
    ...eslintPluginReactX.configs["recommended-type-checked"].rules,
    ...eslintPluginReact.configs.all.rules,
    // @ts-ignore - the plugin is not typed correctly.
    ...eslintPluginReactHooks.configs.recommended.rules,
    ...eslintPluginUnicorn.configs.all.rules,
    // Opinionated rules newly enabled by unicorn 64 -> 73 via `configs.all` (nine majors of additions)
    // that this codebase deliberately never adopted. Each is style/preference, a too-new runtime API, or a
    // false positive in our context (SSR, module-level caches, safe constant replacements).
    "unicorn/no-asterisk-prefix-in-documentation-comments": "off", // We use standard JSDoc `*`-prefixed comment blocks.
    "unicorn/single-line-block-comment-style": "off", // We allow single-line block comments.
    "unicorn/name-replacements": "off", // Biased; conflicts with React terms (props, ref) and our domain naming.
    "unicorn/consistent-arrow-return-style": "off", // Arrow body style is our choice; Prettier owns formatting.
    "unicorn/try-complexity": "off", // We don't impose a try-block complexity limit.
    "unicorn/prefer-temporal": "off", // The Temporal API is not yet available in our Node/browser runtime targets.
    "unicorn/no-top-level-assignment-in-function": "off", // We use module-level caches/singletons (lazy init, circuit breakers, request dedup).
    "unicorn/no-unreadable-new-expression": "off", // Biased readability rule.
    "unicorn/prefer-error-is-error": "off", // Error.isError is too new for our runtime targets; we use instanceof.
    "unicorn/comment-content": "off", // We don't enforce specific wording inside comments.
    "unicorn/consistent-boolean-name": "off", // Biased boolean-naming rule.
    "unicorn/no-barrel-files": "off", // We deliberately use barrel/index files.
    "unicorn/prefer-global-number-constants": "off", // We allow explicit Number.* constants.
    "unicorn/no-unreadable-for-of-expression": "off", // Biased readability rule.
    "unicorn/consistent-conditional-object-spread": "off", // We allow both conditional object-spread styles.
    "unicorn/prefer-early-return": "off", // We allow nested conditionals where clearer.
    "unicorn/prefer-hoisting-branch-code": "off", // Biased; we keep code local to its branch.
    "unicorn/no-useless-else": "off", // We allow else after return for clarity (matches no-else-return: off).
    "unicorn/prefer-await": "off", // We allow promise chains where appropriate.
    "unicorn/no-unnecessary-global-this": "off", // globalThis.<x> is SSR-safe access to browser-only globals.
    "unicorn/prefer-minimal-ternary": "off", // Biased ternary rule.
    "unicorn/no-useless-coercion": "off", // We allow explicit coercions for clarity/robustness.
    "unicorn/no-unsafe-string-replacement": "off", // Our replacement values are safe constant literal origins.
    "unicorn/no-top-level-side-effects": "off", // Some modules intentionally run initialization side effects.
    "unicorn/prefer-continue": "off", // We allow both `continue` and negated-if loop bodies.
    "unicorn/no-declarations-before-early-exit": "off", // We allow declarations before guard returns.
    "unicorn/prefer-uint8array-base64": "off", // Uint8Array base64 methods are too new for our runtime targets.
    "unicorn/prefer-set-methods": "off", // We allow Set filtering via has(); Set.prototype.difference is newish.

    // Tail of the unicorn 64 -> 73 wave that only fired in files outside the initial local sample (caught by CI).
    // Same rationale as above: each is style/preference, a v73 rename of a rule we already disable, a too-new
    // runtime API, or a false positive in our object-method/SSR/derived-value patterns.
    "unicorn/no-this-outside-of-class": "off", // We use `this` in object-literal methods / factory objects; flags valid non-class method patterns.
    "unicorn/prefer-array-from-map": "off", // Style; we use spread+map / Array#map freely.
    "unicorn/no-for-each": "off", // v73 rename of no-array-for-each (already disabled); no forEach preference.
    "unicorn/prefer-direct-iteration": "off", // Style; we iterate via indices/entries where clearer.
    "unicorn/prefer-simple-condition-first": "off", // Biased condition-ordering rule.
    "unicorn/prefer-number-coercion": "off", // We allow explicit Number()/unary-plus coercions (matches no-useless-coercion off).
    "unicorn/no-useless-template-literals": "off", // Style; owned by Prettier/preference.
    "unicorn/prefer-split-limit": "off", // Style; String#split without a limit is acceptable.
    "unicorn/no-computed-property-existence-check": "off", // We intentionally use computed `obj[key]` existence checks.
    "unicorn/prefer-unicode-code-point-escapes": "off", // Style; we allow \uXXXX escapes.
    "unicorn/prefer-type-literal-last": "off", // Biased type-member ordering; Prettier/preference owns ordering.
    "unicorn/custom-error-definition": "off", // Biased; we define custom error classes our own way.
    "unicorn/prefer-iterator-to-array": "off", // Style; we use spread / Array.from on iterables freely.
    "unicorn/prefer-observer-apis": "off", // Biased; we choose event listeners vs observers per case.
    "unicorn/no-break-in-nested-loop": "off", // We allow `break` in nested loops for clarity.
    "unicorn/prefer-includes-over-repeated-comparisons": "off", // Style/preference.
    "unicorn/dom-node-dataset": "off", // Style; we allow get/setAttribute over dataset.
    "unicorn/no-unreadable-object-destructuring": "off", // Biased readability rule (matches other no-unreadable-* off).
    "unicorn/no-unnecessary-boolean-comparison": "off", // We allow explicit boolean comparisons for clarity.
    "unicorn/no-non-function-verb-prefix": "off", // Biased naming rule (matches prevent-abbreviations/name-replacements off).
    "unicorn/prefer-ternary": "off", // We allow if/else over ternary (matches prefer-minimal-ternary off).
    "unicorn/no-negated-array-predicate": "off", // Style/preference.
    "unicorn/consistent-class-member-order": "off", // Biased ordering; Prettier/preference owns ordering.
    "unicorn/no-unused-properties": "off", // Unreliable dead-code detection; false positives on typed shapes.
    "unicorn/max-nested-calls": "off", // We don't impose a nested-call limit.
    "unicorn/prefer-then-catch": "off", // Style; we allow .then/.catch chains (matches prefer-await off).
    "unicorn/no-invalid-file-input-accept": "off", // Our `accept` value is derived from a shared extension list; rule can't statically resolve computed expressions (false positive).
    "unicorn/prefer-else-if": "off", // We allow nested else blocks (matches no-useless-else/prefer-early-return off).
    "unicorn/no-array-front-mutation": "off", // We intentionally use Array#shift() for bounded FIFO/trail buffers.
    "unicorn/no-negated-condition": "off", // We allow negated conditions for guard-style checks.
    "unicorn/explicit-length-check": "off", // .size can return a non-number; matches the package-block disable.
    "unicorn/no-useless-undefined": "off", // We allow explicit undefined (matches no-undefined off).
    "unicorn/prefer-logical-operator-over-ternary": "off", // Style; we allow ternaries.
    "unicorn/no-manually-wrapped-comments": "off", // Style; we allow manually wrapped comment lines.
    "unicorn/prefer-promise-with-resolvers": "off", // Promise.withResolvers is too new for our runtime targets (matches prefer-error-is-error/prefer-uint8array-base64 policy).
    "unicorn/prefer-object-iterable-methods": "off", // Object.* iterable helpers are newish; too new / style.
    "unicorn/prefer-boolean-return": "off", // Biased; we allow explicit conditional returns.
    ...eslintPluginSecurity.configs.recommended.rules,
    ...eslintPluginSonarJs.configs.recommended.rules,
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

    // eslint-plugin-react@7.37.5 rules that call ESLint APIs removed in ESLint 10 and crash at runtime; no newer plugin release exists. The spacing rules are owned by Prettier regardless.
    "react/forward-ref-uses-ref": "off", // Calls removed context.getSourceCode().
    "react/jsx-curly-spacing": "off", // Calls removed sourceCode.isSpaceBetweenTokens(); Prettier owns spacing.
    "react/jsx-equals-spacing": "off", // Calls removed sourceCode.isSpaceBetweenTokens(); Prettier owns spacing.
    "react/jsx-tag-spacing": "off", // Calls removed sourceCode.isSpaceBetweenTokens(); Prettier owns spacing.
    "react/jsx-filename-extension": "off", // Rule calls context.getFilename(), removed in ESLint 10; crashes at runtime (not covered by eslint-plugin-react compat shim).

    "react-hooks/refs": "off", // Another ShadCN limitation...
    "react-hooks/purity": "off", // Some hooks are not pure due to randomness (e.g. confetti).
    "react-hooks/immutability": "off", // Another ShadCN limitation...
    "react-hooks/preserve-manual-memoization": "off", // Another ShadCN limitation...

    // eslint-plugin-react-x@5 (upgraded alongside ESLint 10) enables rules that either duplicate the
    // React-team-maintained eslint-plugin-react-hooks or restate repo-wide React decisions already accepted
    // in individual blocks.
    // Duplicates of eslint-plugin-react-hooks (React-team-maintained); defer to that single source per concern.
    "react-x/rules-of-hooks": "off",
    "react-x/exhaustive-deps": "off",
    "react-x/purity": "off", // Duplicate of react-hooks/purity (e.g. new Date()/structuredClone during render).
    "react-x/error-boundaries": "off", // Duplicate of react-hooks/error-boundaries.
    // Repo-wide React decisions already accepted elsewhere (React 18 Context API, ShadCN index keys).
    "react-x/no-use-context": "off",
    "react-x/no-context-provider": "off",
    "react-x/no-array-index-key": "off",
    // New in react-x@5: false-positive on memoized component-reference selection (e.g. dynamic icon via useMemo).
    "react-x/static-components": "off",
    "react-x/no-forward-ref": "off", // We use forwardRef where needed, from React 18.
    "react-x/no-unstable-context-value": "off", // Another ShadCN limitation...

    "n/no-unpublished-import": "off", // Packages are published; false positive.
    "n/no-missing-import": "off", // Barrel and index files are blindly caught by this rule.
    "n/no-unsupported-features/node-builtins": "off", // Package targets browsers via RSLib bundle; the rule's Node-version-compat checks aren't applicable here and produce false positives.

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
    "unicorn/prefer-export-from": "off", // RSLib bundler requires import-then-export pattern for some external types (see CHANGELOG 2.0.0).
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

const statusEslintConfig: Config = defineConfig({
  name: "[@arolariu/status]",
  files: ["sites/status.arolariu.ro/**/*.ts"],
  languageOptions: {
    ecmaVersion: "latest",
    parser: tseslint.parser,
    parserOptions: {
      extraFileExtensions: [".svelte"],
      projectService: {
        defaultProject: "./sites/status.arolariu.ro/tsconfig.json",
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
    // Opinionated rules newly enabled by unicorn 64 -> 73 via `configs.all` (nine majors of additions)
    // that this codebase deliberately never adopted. Each is style/preference, a too-new runtime API, or a
    // false positive in our context (SSR, module-level caches, safe constant replacements).
    "unicorn/no-asterisk-prefix-in-documentation-comments": "off", // We use standard JSDoc `*`-prefixed comment blocks.
    "unicorn/single-line-block-comment-style": "off", // We allow single-line block comments.
    "unicorn/name-replacements": "off", // Biased; conflicts with React terms (props, ref) and our domain naming.
    "unicorn/consistent-arrow-return-style": "off", // Arrow body style is our choice; Prettier owns formatting.
    "unicorn/try-complexity": "off", // We don't impose a try-block complexity limit.
    "unicorn/prefer-temporal": "off", // The Temporal API is not yet available in our Node/browser runtime targets.
    "unicorn/no-top-level-assignment-in-function": "off", // We use module-level caches/singletons (lazy init, circuit breakers, request dedup).
    "unicorn/no-unreadable-new-expression": "off", // Biased readability rule.
    "unicorn/prefer-error-is-error": "off", // Error.isError is too new for our runtime targets; we use instanceof.
    "unicorn/comment-content": "off", // We don't enforce specific wording inside comments.
    "unicorn/consistent-boolean-name": "off", // Biased boolean-naming rule.
    "unicorn/no-barrel-files": "off", // We deliberately use barrel/index files.
    "unicorn/prefer-global-number-constants": "off", // We allow explicit Number.* constants.
    "unicorn/no-unreadable-for-of-expression": "off", // Biased readability rule.
    "unicorn/consistent-conditional-object-spread": "off", // We allow both conditional object-spread styles.
    "unicorn/prefer-early-return": "off", // We allow nested conditionals where clearer.
    "unicorn/prefer-hoisting-branch-code": "off", // Biased; we keep code local to its branch.
    "unicorn/no-useless-else": "off", // We allow else after return for clarity (matches no-else-return: off).
    "unicorn/prefer-await": "off", // We allow promise chains where appropriate.
    "unicorn/no-unnecessary-global-this": "off", // globalThis.<x> is SSR-safe access to browser-only globals.
    "unicorn/prefer-minimal-ternary": "off", // Biased ternary rule.
    "unicorn/no-useless-coercion": "off", // We allow explicit coercions for clarity/robustness.
    "unicorn/no-unsafe-string-replacement": "off", // Our replacement values are safe constant literal origins.
    "unicorn/no-top-level-side-effects": "off", // Some modules intentionally run initialization side effects.
    "unicorn/prefer-continue": "off", // We allow both `continue` and negated-if loop bodies.
    "unicorn/no-declarations-before-early-exit": "off", // We allow declarations before guard returns.
    "unicorn/prefer-uint8array-base64": "off", // Uint8Array base64 methods are too new for our runtime targets.
    "unicorn/prefer-set-methods": "off", // We allow Set filtering via has(); Set.prototype.difference is newish.

    // Tail of the unicorn 64 -> 73 wave that only fired in files outside the initial local sample (caught by CI).
    // Same rationale as above: each is style/preference, a v73 rename of a rule we already disable, a too-new
    // runtime API, or a false positive in our object-method/SSR/derived-value patterns.
    "unicorn/no-this-outside-of-class": "off", // We use `this` in object-literal methods / factory objects; flags valid non-class method patterns.
    "unicorn/prefer-array-from-map": "off", // Style; we use spread+map / Array#map freely.
    "unicorn/no-for-each": "off", // v73 rename of no-array-for-each (already disabled); no forEach preference.
    "unicorn/prefer-direct-iteration": "off", // Style; we iterate via indices/entries where clearer.
    "unicorn/prefer-simple-condition-first": "off", // Biased condition-ordering rule.
    "unicorn/prefer-number-coercion": "off", // We allow explicit Number()/unary-plus coercions (matches no-useless-coercion off).
    "unicorn/no-useless-template-literals": "off", // Style; owned by Prettier/preference.
    "unicorn/prefer-split-limit": "off", // Style; String#split without a limit is acceptable.
    "unicorn/no-computed-property-existence-check": "off", // We intentionally use computed `obj[key]` existence checks.
    "unicorn/prefer-unicode-code-point-escapes": "off", // Style; we allow \uXXXX escapes.
    "unicorn/prefer-type-literal-last": "off", // Biased type-member ordering; Prettier/preference owns ordering.
    "unicorn/custom-error-definition": "off", // Biased; we define custom error classes our own way.
    "unicorn/prefer-iterator-to-array": "off", // Style; we use spread / Array.from on iterables freely.
    "unicorn/prefer-observer-apis": "off", // Biased; we choose event listeners vs observers per case.
    "unicorn/no-break-in-nested-loop": "off", // We allow `break` in nested loops for clarity.
    "unicorn/prefer-includes-over-repeated-comparisons": "off", // Style/preference.
    "unicorn/dom-node-dataset": "off", // Style; we allow get/setAttribute over dataset.
    "unicorn/no-unreadable-object-destructuring": "off", // Biased readability rule (matches other no-unreadable-* off).
    "unicorn/no-unnecessary-boolean-comparison": "off", // We allow explicit boolean comparisons for clarity.
    "unicorn/no-non-function-verb-prefix": "off", // Biased naming rule (matches prevent-abbreviations/name-replacements off).
    "unicorn/prefer-ternary": "off", // We allow if/else over ternary (matches prefer-minimal-ternary off).
    "unicorn/no-negated-array-predicate": "off", // Style/preference.
    "unicorn/consistent-class-member-order": "off", // Biased ordering; Prettier/preference owns ordering.
    "unicorn/no-unused-properties": "off", // Unreliable dead-code detection; false positives on typed shapes.
    "unicorn/max-nested-calls": "off", // We don't impose a nested-call limit.
    "unicorn/prefer-then-catch": "off", // Style; we allow .then/.catch chains (matches prefer-await off).
    "unicorn/no-invalid-file-input-accept": "off", // Our `accept` value is derived from a shared extension list; rule can't statically resolve computed expressions (false positive).
    "unicorn/prefer-else-if": "off", // We allow nested else blocks (matches no-useless-else/prefer-early-return off).
    "unicorn/no-array-front-mutation": "off", // We intentionally use Array#shift() for bounded FIFO/trail buffers.
    "unicorn/no-negated-condition": "off", // We allow negated conditions for guard-style checks.
    "unicorn/explicit-length-check": "off", // .size can return a non-number; matches the package-block disable.
    "unicorn/no-useless-undefined": "off", // We allow explicit undefined (matches no-undefined off).
    "unicorn/prefer-logical-operator-over-ternary": "off", // Style; we allow ternaries.
    "unicorn/no-manually-wrapped-comments": "off", // Style; we allow manually wrapped comment lines.
    "unicorn/prefer-promise-with-resolvers": "off", // Promise.withResolvers is too new for our runtime targets (matches prefer-error-is-error/prefer-uint8array-base64 policy).
    "unicorn/prefer-object-iterable-methods": "off", // Object.* iterable helpers are newish; too new / style.
    "unicorn/prefer-boolean-return": "off", // Biased; we allow explicit conditional returns.
    ...eslintPluginSecurity.configs.recommended.rules,
    ...eslintPluginSonarJs.configs.recommended.rules,
    ...eslintPluginSonarJs.configs["recommended-legacy"].rules,
    ...eslintPluginNode.configs["flat/recommended"].rules,
    ...eslintPluginPromise.configs["flat/recommended"].rules,

    curly: "off", // we allow single line if statements without braces.
    "one-var": "off", // we allow multiple variable declarations per file.
    "no-undef": "off", // svelte + eslint can't accurately detect undefined variables.
    "sort-keys": "off", // this rule is biased; we use Prettier for sorting.
    "no-bitwise": "off", // we allow bitwise operators.
    "no-console": "off", // Console statements are stripped in prod builds.
    "no-ternary": "off", // we use ternary operators for conditional expressions.
    "func-style": "off", // we allow both function declarations and expressions.
    "no-plusplus": "off", // We allow the use of the ++ and -- operators.
    "no-continue": "off", // we allow continue statements in loops.
    "sort-imports": "off", // this rule is biased; we use Prettier for sorting.
    "no-undefined": "off", // we allow undefined values for context init code.
    "max-statements": "off", // we don't impose a max statements limit on functions.
    "no-magic-numbers": "off", // Magic numbers are used for prioritization of enums and fields.
    "no-inline-comments": "off", // we use inline comments to mark things.
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

const toolingOutputConfig: Config = defineConfig({
  name: "[@arolariu/tooling-output]",
  files: ["scripts/**/*.{ts,js,mjs,cjs}"],
  ignores: ["scripts/**/*.test.ts", "scripts/common/logger.ts", "scripts/setup.ts", "scripts/doctor.ts", "scripts/status.ts"],
  languageOptions: {
    parser: tseslint.parser,
    ecmaVersion: "latest",
    sourceType: "module",
    globals: globals.node,
  },
  rules: {
    "no-console": "error",
    "no-restricted-syntax": [
      "error",
      {
        selector:
          "CallExpression[callee.type='MemberExpression'][callee.property.name='write'][callee.object.type='MemberExpression'][callee.object.object.name='process'][callee.object.property.name=/^(stdout|stderr)$/]",
        message: "Route script-authored process stream output through MonorepositoryConsoleLogger.",
      },
    ],
  },
})[0] as Config;

const projectEslintConfig = defineConfig(websiteEslintConfig, cvEslintConfig, packagesEslintConfig, statusEslintConfig);

// Add the global ignores to the default config.
for (const individualEslintConfig of projectEslintConfig) {
  const eslintPathsIgnoreList = [
    "**/{node_modules,.storybook,.svelte-kit,.next,out,bin,build,dist,scripts,tests}/**", // dirs
    "**/*.{test,config,spec,setup,stories,d}.{js,jsx,ts,tsx}", // files
  ];

  individualEslintConfig.ignores = individualEslintConfig.ignores
    ? [...individualEslintConfig.ignores, ...eslintPathsIgnoreList]
    : [...eslintPathsIgnoreList];
}

const eslintConfig = defineConfig(projectEslintConfig, toolingOutputConfig);

export default eslintConfig;
