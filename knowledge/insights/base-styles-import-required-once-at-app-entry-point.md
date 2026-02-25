---
description: "import '@arolariu/components/styles' must appear in the app root; without it, CSS custom properties and base resets are missing and components render unstyled"
type: constraint
source: "docs/rfc/1006-component-library-architecture.md"
status: current
created: 2026-02-25
---

# Base styles import required once at app entry point

Consuming applications must include `import "@arolariu/components/styles"` exactly once at their entry point (e.g., the root layout in Next.js). This import loads `dist/index.css`, which contains CSS custom properties for the design token system (color primitives like `--primary`, `--background`, `--destructive`), base resets, and any global styles that components depend on.

Without this import, components render with broken styling because their Tailwind classes reference CSS custom properties that are not defined. This is a common gotcha when integrating the library into a new project or when restructuring the app's entry point -- the components themselves do not import their own CSS, following the convention that CSS is a side effect managed at the application level.

The styles export is explicitly declared in the package.json `exports` field as `"./styles": "./dist/index.css"`, making it a first-class export path alongside component modules. This separation ensures that component JavaScript remains side-effect-free (`sideEffects: false` in package.json) while the CSS load is explicit and intentional.

---

Related Insights:
- [[sideeffects-false-enables-aggressive-tree-shaking-across-70-plus-components]] -- extends: styles separated so JS stays side-effect-free
- [[direct-component-imports-preferred-over-barrel-imports-for-bundle-size]] -- extends: styles have their own export path in the same system

Domains:
- [[component-library]]
