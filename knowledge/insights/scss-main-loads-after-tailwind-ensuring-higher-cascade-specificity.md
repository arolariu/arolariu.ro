---
description: "globals.scss imports main.scss after Tailwind's base/components/utilities layers, so SCSS rules win specificity conflicts when both systems target the same element during migration"
type: constraint
source: "docs/rfc/1008-scss-system-architecture.md"
status: current
created: 2026-02-25
---

# SCSS main loads after Tailwind ensuring higher cascade specificity

The CSS loading order in `app/globals.scss` places SCSS system imports after Tailwind's layers, giving SCSS rules higher cascade specificity when both systems apply to the same element. This ordering is critical during the migration period when pages mix Tailwind utility classes from the component library with SCSS Module classes on page-level containers. If SCSS loaded first, Tailwind utilities could inadvertently override carefully structured SCSS rules.

The chain is: `layout.tsx` imports `globals.scss`, which first loads Tailwind's base, components, and utilities layers, then loads `src/styles/main.scss` which pulls in the 7-1 pattern partials. Within main.scss, the import order also matters: abstracts first (no CSS output), then base resets, themes, animations, components, and utilities last. This double-layered ordering ensures that the most specific SCSS utilities have the highest cascade priority.

In practice, specificity conflicts are rare because SCSS Modules and Tailwind operate on different elements. Library components like `<Button>` and `<Card>` carry Tailwind classes, while page containers use SCSS Module classes. But the ordering guarantee prevents surprises when a page does need to override a library component's visual appearance via a wrapping SCSS class.

---

Related Insights:
- [[component-library-retains-tailwind-while-site-pages-migrate-to-scss-modules]] -- foundation: the dual-system coexistence this ordering enables
- [[seven-one-pattern-organizes-scss-into-abstracts-base-themes-animations-components-utilities]] -- extends: the import order within main.scss follows the 7-1 cascade intent
- [[base-styles-import-required-once-at-app-entry-point]] -- context: globals.scss is the single entry point where both systems converge

Domains:
- [[frontend-patterns]]
