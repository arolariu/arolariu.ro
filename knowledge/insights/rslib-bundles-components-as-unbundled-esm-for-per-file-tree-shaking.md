---
description: "RSLib (Rsbuild-based) outputs individual ESM files with co-located .d.ts declarations, enabling bundlers to import only the specific components used"
type: decision
source: "docs/rfc/1006-component-library-architecture.md"
status: current
created: 2026-02-25
---

# RSLib bundles components as unbundled ESM for per-file tree-shaking

The component library uses RSLib (built on Rsbuild, not webpack or Vite) as its build tool, configured with `bundle: false` to produce individual ESM files that mirror the source directory structure. Each component file in `src/components/ui/` becomes a corresponding `.js` file in `dist/components/ui/` with a co-located `.d.ts` type declaration. This means a consumer importing `@arolariu/components/button` loads only the Button module and its dependencies -- not the entire 70+ component catalogue.

The `bundle: false` setting is the key architectural choice. A bundled output would concatenate all components into one or few chunks, defeating tree-shaking in downstream bundlers. The unbundled output delegates tree-shaking responsibility to the consumer's bundler (Next.js, Vite, etc.), which can perform dead-code elimination at the import boundary level.

The RSLib configuration uses a glob entry (`./src/**` excluding test files) so that new components are automatically included in builds without updating the config. The React plugin (`@rsbuild/plugin-react`) handles JSX transformation. Source maps are generated for debugging through the library into component internals.

---

Related Insights:
- [[direct-component-imports-preferred-over-barrel-imports-for-bundle-size]] -- extends: the unbundled output is what makes per-component imports possible
- [[sideeffects-false-enables-aggressive-tree-shaking-across-70-plus-components]] -- extends: sideEffects:false cooperates with unbundled ESM

Domains:
- [[component-library]]
