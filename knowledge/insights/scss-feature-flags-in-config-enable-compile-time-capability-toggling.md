---
description: "Seven boolean flags in _config.scss control fluid type, logical properties, container queries, reduced motion, high contrast, print styles, and CSS layers; consumers override via @use with()"
type: pattern
source: "docs/rfc/1008-scss-system-architecture.md"
status: current
created: 2026-02-25
---

# SCSS feature flags in config enable compile-time capability toggling

The SCSS system includes a configuration layer at `_config.scss` that exposes seven boolean feature flags controlling which CSS capabilities the compiled output includes. Flags like `$enable-fluid-type`, `$enable-logical-properties`, `$enable-container-queries`, `$enable-reduced-motion`, `$enable-high-contrast`, `$enable-print-styles`, and `$enable-css-layers` default to `true` but can be overridden by any consuming module using Sass's `@use with()` syntax: `@use 'abstracts' with ($enable-fluid-type: false)`.

This is a compile-time feature flag system, not a runtime toggle. When a flag is disabled, Dart Sass simply omits the corresponding CSS blocks from the output, reducing bundle size. This differs from CSS custom properties which can be changed at runtime -- feature flags control whether entire categories of CSS rules exist in the stylesheet at all.

The pattern is particularly useful for progressive enhancement. A project can disable container queries or CSS layers for browsers that do not support them, then re-enable the flags as browser support improves. The `$css-prefix` configuration variable also lives in `_config.scss`, enabling namespace customization for generated CSS custom property names if the system is ever consumed by a different project.

---

Related Insights:
- [[seven-one-pattern-organizes-scss-into-abstracts-base-themes-animations-components-utilities]] -- foundation: _config.scss is part of the abstracts folder in the 7-1 pattern
- [[scss-modules-chosen-over-css-in-js-for-zero-runtime-scoped-styling]] -- enables: compile-time flags leverage the fact that SCSS is processed at build time, not runtime

Domains:
- [[frontend-patterns]]
