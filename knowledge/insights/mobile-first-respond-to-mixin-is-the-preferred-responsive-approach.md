---
description: "Base styles target mobile, then @include respond-to('md') adds tablet rules, respond-to('lg') adds desktop; respond-below exists but is reserved for mobile-only exceptions"
type: convention
source: "docs/rfc/1008-scss-system-architecture.md"
status: current
created: 2026-02-25
---

# Mobile-first respond-to mixin is the preferred responsive approach

All responsive styles in the SCSS system follow mobile-first methodology using the `respond-to()` mixin, which emits `min-width` media queries. Base styles (no mixin wrapper) apply to the smallest screens, then progressive `respond-to('sm')`, `respond-to('md')`, `respond-to('lg')`, and `respond-to('xl')` blocks layer on enhancements for larger viewports. This matches Tailwind's responsive model where unprefixed classes are mobile defaults and `md:`, `lg:` prefixes add breakpoint overrides.

Three responsive mixins exist but serve distinct purposes. `respond-to($breakpoint)` is the default for additive responsive enhancement. `respond-below($breakpoint)` uses `max-width` and is reserved for mobile-only styles that should disappear at larger sizes -- for example, a mobile navigation drawer visible only below `lg`. `respond-between($min, $max)` targets a specific range and is the least common, used only when styles should apply exclusively to tablets or a narrow viewport band.

The convention for ordering responsive blocks within a selector is ascending: base styles first, then `sm`, `md`, `lg`, `xl`. This mirrors the cascade intent where larger breakpoints override smaller ones. Common patterns include responsive typography (font sizes scaling up through breakpoints), responsive grids (columns increasing from 1 to 2 to 3), and responsive spacing (padding growing from `space(4)` to `space(8)` to `space(12)`).

---

Related Insights:
- [[scss-spacing-and-breakpoints-mirror-tailwind-for-incremental-migration]] -- enables: breakpoint values match Tailwind so responsive behavior is consistent during migration
- [[scss-helper-functions-with-error-messages-enforce-valid-token-access]] -- extends: breakpoint() function validates the key passed to respond-to at compile time

Domains:
- [[frontend-patterns]]
