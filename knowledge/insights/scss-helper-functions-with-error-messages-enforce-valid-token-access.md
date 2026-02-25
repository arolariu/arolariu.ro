---
description: "space(), breakpoint(), z(), radius(), font-size(), font-weight() validate map keys at compile time and emit @error with available keys listed, catching typos before build completes"
type: pattern
source: "docs/rfc/1008-scss-system-architecture.md"
status: current
created: 2026-02-25
---

# SCSS helper functions with error messages enforce valid token access

Every design token map in the SCSS system is accessed through a named helper function that validates the key at compile time. `space(4)` looks up `4` in the `$spacing` map and returns `1rem`. If the key does not exist -- for example, `space(7)` where no step 7 is defined -- Dart Sass emits an `@error` that lists all available keys, halting the build. This pattern applies to `breakpoint()`, `z()`, `radius()`, `font-size()`, `font-weight()`, `line-height()`, and `letter-spacing()`.

This is a compile-time safety net that prevents magic numbers from entering the stylesheet. Instead of writing `padding: 1.75rem` (which might or might not match a design token), developers must use `padding: space(7)` and discover immediately that 7 is not a valid step. The error message includes the full list of valid keys, serving as inline documentation at the point of failure.

The helper functions also serve as the migration bridge from Tailwind. Where Tailwind enforces its scale through utility class names (`p-4` is valid, `p-7` is not), SCSS enforces the same scale through function-level validation. The enforcement mechanism differs but the constraint is equivalent: you cannot use arbitrary values that fall outside the design token system.

---

Related Insights:
- [[css-custom-properties-handle-runtime-theming-while-scss-variables-handle-compile-time-tokens]] -- extends: helper functions are the access layer for the compile-time token maps
- [[type-safe-telemetry-prevents-instrumentation-errors-at-compile-time]] -- analogous: same philosophy of catching errors at compile time, applied to CSS tokens instead of telemetry attributes

Domains:
- [[frontend-patterns]]
