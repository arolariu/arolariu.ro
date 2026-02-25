---
description: "CSS custom properties (--primary, --background) switch values at runtime for dark/light mode; SCSS maps ($spacing, $breakpoints) are resolved at compile time and produce static CSS"
type: pattern
source: "docs/rfc/1008-scss-system-architecture.md"
status: current
created: 2026-02-25
---

# CSS custom properties handle runtime theming while SCSS variables handle compile-time tokens

The SCSS system uses a dual-layer variable strategy that separates runtime-switchable values from compile-time constants. CSS custom properties like `--primary`, `--background`, `--border`, and `--ring` are defined in `:root` and overridden in `.dark`, enabling instant theme switching without page reload. SCSS variables like `$spacing`, `$breakpoints`, `$z-index`, and `$border-radius` are static maps resolved at compile time by Dart Sass, producing hardcoded values in the output CSS.

SCSS helper functions bridge the two layers. `color('primary')` returns `hsl(var(--primary))`, wrapping the CSS custom property in an HSL function call. `color-alpha('primary', 0.5)` returns `hsl(var(--primary) / 0.5)` for transparency. These functions produce CSS that references runtime variables, not static values, so the compiled output remains theme-aware. Meanwhile, `space(4)` returns the static value `1rem` -- spacing does not change between themes.

This separation means that color-related values can be theme-switched at runtime through CSS class toggling (`.dark` class on the root element), while layout tokens like spacing, breakpoints, and z-index are baked into the stylesheet at build time. The gradient theme system adds another runtime layer through `--gradient-from`, `--gradient-via`, and `--gradient-to` variables set by a React context provider.

---

Related Insights:
- [[base-styles-import-required-once-at-app-entry-point]] -- foundation: the CSS custom properties that SCSS color functions reference are loaded via the base styles import
- [[scss-helper-functions-with-error-messages-enforce-valid-token-access]] -- extends: the color() and space() functions that bridge both variable layers

Domains:
- [[frontend-patterns]]
