---
description: "@include dark { ... } wraps :global(.dark) & selector for consistency and readability; both methods work but the mixin is the preferred convention for new code"
type: convention
source: "docs/rfc/1008-scss-system-architecture.md"
status: current
created: 2026-02-25
---

# Dark mode styling prefers include dark mixin over global selector

Dark mode overrides in SCSS Modules use the `@include dark { ... }` mixin rather than writing `:global(.dark) & { ... }` directly. Both produce identical CSS output -- the mixin simply wraps the `:global(.dark) &` selector -- but the mixin is preferred for consistency and readability across the codebase. The `:global()` escape is a CSS Modules mechanism that references an unscoped class, and hiding it inside a named mixin makes the intent clearer: "these styles apply in dark mode."

Most colors do not need explicit dark mode overrides because the CSS custom property system handles theme switching automatically. Variables like `--background`, `--foreground`, `--primary`, and `--border` are redefined under the `.dark` class in `globals.scss`, so any SCSS rule using `hsl(var(--background))` or `color('primary')` already adapts to dark mode. The `@include dark` mixin is needed only when a component requires hardcoded color values that differ between themes -- for example, decorative gradients that use specific RGB values for light and dark backgrounds, or border colors that reference specific gray shades rather than the `--border` variable.

The system also provides `@include reduced-motion { ... }` for `prefers-reduced-motion` and a `@include focus-ring` mixin for keyboard focus styles, following the same pattern of wrapping accessibility media queries in named mixins for consistency.

---

Related Insights:
- [[css-custom-properties-handle-runtime-theming-while-scss-variables-handle-compile-time-tokens]] -- foundation: the dual-layer variable system that makes most explicit dark overrides unnecessary
- [[mobile-first-respond-to-mixin-is-the-preferred-responsive-approach]] -- analogous: same mixin-wrapping-media-query pattern applied to breakpoints

Domains:
- [[frontend-patterns]]
