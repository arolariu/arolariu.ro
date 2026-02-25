---
description: "Package exports map routes @arolariu/components/button to individual ESM files; barrel import from root path pulls the full catalogue and should be used sparingly"
type: convention
source: "docs/rfc/1006-component-library-architecture.md"
status: current
created: 2026-02-25
---

# Direct component imports preferred over barrel imports for bundle size

The package.json `exports` field defines two import patterns: direct paths like `@arolariu/components/button` that resolve to individual component files (`dist/components/ui/button.js`), and the barrel path `@arolariu/components` that resolves to the full index barrel (`dist/index.js`). The direct import pattern is the recommended approach because it produces the smallest possible bundle -- each import path maps to exactly one component module.

The barrel import exists for convenience in prototyping or when importing many components from a single statement, but it carries a cost: even with tree-shaking, some bundlers may struggle to fully eliminate unused exports from a barrel that re-exports 70+ modules. The `sideEffects: false` declaration mitigates this, but the safest path to minimal bundles is direct imports.

Compound components (like Card's sub-parts: CardHeader, CardTitle, CardContent, CardFooter) are all exported from the same direct path (`@arolariu/components/card`), so a single import statement can destructure all needed pieces. A separate `./styles` export path handles the base CSS import. This three-tier export structure (direct components, barrel, styles) gives consumers full control over what enters their bundle.

---

Related Insights:
- [[rslib-bundles-components-as-unbundled-esm-for-per-file-tree-shaking]] -- foundation: unbundled ESM output is what makes direct imports work
- [[compound-component-pattern-composes-complex-ui-from-named-sub-parts]] -- example: Card sub-parts all come from one direct import path
- [[base-styles-import-required-once-at-app-entry-point]] -- extends: styles have their own dedicated export path

Domains:
- [[component-library]]
