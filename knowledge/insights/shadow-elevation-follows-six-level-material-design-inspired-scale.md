---
description: "Six shadow levels (none/sm/md/lg/xl/2xl) accessed via @include shadow() mixin, with automatic dark mode opacity adjustment for visibility against dark backgrounds"
type: convention
source: "docs/rfc/1008-scss-system-architecture.md"
status: current
created: 2026-02-25
---

# Shadow elevation follows six-level Material Design inspired scale

The SCSS shadow system provides a six-level elevation scale -- `none`, `sm`, `md`, `lg`, `xl`, and `2xl` -- accessed through the `@include shadow($level)` mixin. The levels map to increasing visual depth: `sm` for subtle resting states on cards and inputs, `md` for standard raised surfaces and dropdowns, `lg` for hovered cards and popovers, `xl` for modals and dialogs, and `2xl` for maximum-emphasis overlays. This mirrors Material Design 3's elevation model translated into a CSS-only implementation.

The convention for interactive elements is to elevate on hover: a card at rest uses `@include shadow('sm')` and shifts to `@include shadow('lg')` on hover, creating visual feedback through depth change rather than color shift. The mixin handles dark mode automatically -- dark backgrounds use stronger shadow opacity (0.3-0.6 vs 0.05-0.25 in light mode) to maintain visible depth perception against darker surfaces.

Constraining shadows to six named levels prevents the proliferation of arbitrary `box-shadow` values that create visual inconsistency across a large component surface. Like the spacing scale and z-index layers, the shadow system trades design flexibility for system-wide consistency, ensuring that elevation communicates hierarchy predictably across every page.

---

Related Insights:
- [[scss-helper-functions-with-error-messages-enforce-valid-token-access]] -- analogous: same compile-time validation pattern, applied to shadow levels instead of spacing/breakpoints
- [[dark-mode-styling-prefers-include-dark-mixin-over-global-selector]] -- extends: the shadow mixin handles dark mode internally, so consumers do not need separate @include dark blocks for shadows

Domains:
- [[frontend-patterns]]
