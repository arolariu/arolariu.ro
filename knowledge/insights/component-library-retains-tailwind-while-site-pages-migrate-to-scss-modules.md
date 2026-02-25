---
description: "@arolariu/components stays on Tailwind CSS permanently; only site-level pages and layouts in sites/arolariu.ro/ migrate to SCSS Modules, with main.scss loaded after Tailwind for higher specificity"
type: decision
source: "docs/rfc/1008-scss-system-architecture.md"
status: current
created: 2026-02-25
---

# Component library retains Tailwind while site pages migrate to SCSS Modules

The styling migration draws a clear boundary: the `@arolariu/components` package keeps Tailwind CSS as its styling system permanently, while route-level pages and layouts in `sites/arolariu.ro/` progressively migrate to SCSS Modules. This means a typical page imports both systems -- shared library components like `<Button>` and `<Card>` carry Tailwind classes, while the page layout and custom sections use SCSS Module classes.

The coexistence works because `main.scss` is imported after Tailwind in the CSS cascade, giving SCSS rules higher specificity when both systems target the same element. Within a component, the two systems stay cleanly separated: library components accept Tailwind `className` overrides via `cn()`, while page-level containers use `styles["section"]` bracket notation. They never conflict because they operate on different elements.

The migration priority is route-by-route: Home, Auth, About, and legal pages are already converted, while `/domains/invoices` (78 components, high priority) and `/my-profile` (11 components, medium priority) remain on Tailwind. This incremental approach avoids a risky big-bang rewrite while allowing each migrated route to benefit from SCSS's mixin library and structured token access.

---

Related Insights:
- [[scss-spacing-and-breakpoints-mirror-tailwind-for-incremental-migration]] -- enables: matching token values make mixed pages visually consistent
- [[class-variance-authority-defines-component-variants-as-typed-tailwind-configurations]] -- context: the component library's Tailwind variant system remains untouched by the SCSS migration
- [[base-styles-import-required-once-at-app-entry-point]] -- foundation: CSS custom properties from the component library are shared with SCSS

Domains:
- [[frontend-patterns]]
- [[component-library]]
