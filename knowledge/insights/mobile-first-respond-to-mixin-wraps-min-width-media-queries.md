---
description: "respond-to('md') emits @media (min-width: 768px); respond-below() for max-width; respond-between() for ranges -- all referencing the shared $breakpoints map"
type: pattern
source: "docs/rfc/1008-scss-system-architecture.md"
status: current
created: 2026-02-25
---

# Mobile-first respond-to mixin wraps min-width media queries

All responsive styling in SCSS Modules follows a mobile-first methodology through three breakpoint mixins. `@include respond-to('md')` emits a `min-width` media query, meaning the base styles (written outside any mixin) target mobile screens, and progressive enhancements layer on at larger breakpoints. This is the preferred and most common pattern -- a typical component defines mobile defaults, then adds `respond-to('sm')`, `respond-to('md')`, and `respond-to('lg')` blocks that progressively adjust typography, spacing, and layout.

The `respond-below()` mixin handles the inverse case (max-width queries) for styles that should only appear on small screens, using `calc(breakpoint - 1px)` to avoid overlap. `respond-between()` targets a specific range. Both are less common because mobile-first design naturally reduces the need for max-width constraints.

The mixins reference the shared `$breakpoints` map, which includes both standard Tailwind breakpoints (`sm` at 640px through `xl` at 1280px) and custom additions for edge cases (`2xsm` at 320px for small phones, `3xl` at 1976px for ultra-wide displays). Using the mixin instead of raw media queries ensures consistent breakpoint values across the entire codebase and produces clear errors if an invalid breakpoint name is used.

---

Related Insights:
- [[scss-spacing-and-breakpoints-mirror-tailwind-for-incremental-migration]] -- foundation: the breakpoint values used by respond-to() match Tailwind's for migration consistency
- [[every-css-module-file-starts-with-use-abstracts-as-star-import]] -- enables: respond-to() is available because every module imports abstracts

Domains:
- [[frontend-patterns]]
