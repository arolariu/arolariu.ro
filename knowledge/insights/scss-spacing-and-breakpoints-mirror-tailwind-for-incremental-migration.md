---
description: "SCSS $spacing map and $breakpoints map use identical values to Tailwind's default config, so migrating a component from Tailwind utilities to SCSS produces visually identical output"
type: pattern
source: "docs/rfc/1008-scss-system-architecture.md"
status: current
created: 2026-02-25
---

# SCSS spacing and breakpoints mirror Tailwind for incremental migration

The SCSS design token system deliberately replicates Tailwind's spacing scale and breakpoint values. `space(4)` returns `1rem` (16px), matching Tailwind's `p-4`. Breakpoints like `sm` (640px), `md` (768px), `lg` (1024px), and `xl` (1280px) are identical to Tailwind's defaults. This alignment is the key enabler for the gradual migration strategy: converting a component from Tailwind utility classes to SCSS produces pixel-identical output because the underlying token values are the same.

The migration is route-by-route, not all-at-once. A page can mix Tailwind utilities (from the component library or not-yet-migrated elements) with SCSS Module classes, and the visual output remains consistent because `space(4)` and Tailwind's `p-4` resolve to the same `1rem`. The RFC provides a comprehensive conversion table mapping Tailwind classes to SCSS equivalents: `flex items-center justify-between` becomes `@include flex-between`, `text-xl font-bold` becomes `font-size: font-size('xl'); font-weight: font-weight('bold')`, and so on.

The SCSS system also extends beyond Tailwind's default breakpoints with custom additions: `2xsm` (320px), `xsm` (480px), `2xl` (1440px), and `3xl` (1976px) for small phones and ultra-wide displays.

---

Related Insights:
- [[component-library-retains-tailwind-while-site-pages-migrate-to-scss-modules]] -- enables: token alignment makes the boundary between Tailwind and SCSS invisible to users
- [[cn-utility-merges-tailwind-classes-with-conflict-resolution]] -- coexists: Tailwind's cn() and SCSS's space() can both appear in the same page during migration

Domains:
- [[frontend-patterns]]
