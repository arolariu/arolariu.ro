# SCSS Design System Hardening Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Elevate the existing SCSS design system to world-class engineering standards, inspired by Bootstrap, Carbon (IBM), Material Design 3, SLDS (Salesforce), ITCSS, and GitHub Primer.

**Architecture:** Build on the existing 7-1 pattern + CSS Modules + CSS Custom Properties foundation. Add cascade layers, fluid typography, logical properties, motion tokens, a configuration module, systematic linting, and accessibility-first media queries. Eliminate all remaining hardcoded values and complete the invoices domain migration.

**Tech Stack:** Dart Sass (modern module system), CSS @layer, CSS clamp(), CSS logical properties, stylelint, Next.js 16 built-in Sass support.

**Supersedes:** `2026-02-06-scss-complete-migration.md` and `scss-refactor-and-theme-unification.md` (both now deleted from working tree — their completed phases are preserved in git history).

---

## Current State Summary

### What's Already Done (From Previous Plans)
- 7-1 SCSS directory structure with @use/@forward (no @import)
- ~73+ CSS Module files across the app
- Design token functions: `space()`, `z()`, `radius()`, `color()`, `color-alpha()`, `font-size()`, `font-weight()`
- Rich mixin library: responsive, flex, grid, visual effects, decorative elements
- Theme presets compiled into CSS via SCSS maps (zero runtime JS for named presets)
- GradientThemeContext eliminated; useThemePreset simplified
- next-themes enhanced with `disableTransitionOnChange`, namespaced `storageKey`
- Utilities layer populated: colors, display, sizing, effects, layout
- BEM for global components, camelCase for CSS Modules — documented in `main.scss`

### What's Missing (Gap Analysis vs. World-Class Systems)

| # | Gap | Inspired By | Severity |
|---|-----|-------------|----------|
| 1 | No CSS `@layer` for cascade control | ITCSS, Carbon | High |
| 2 | No fluid typography (`clamp()`-based) | Modern CSS, Open Props | High |
| 3 | No logical properties for i18n/RTL | SLDS, Material Design | Medium |
| 4 | No container query mixins | Modern CSS | Medium |
| 5 | ~40+ hardcoded hex colors in component/navigation SCSS | Carbon, Material Design | High |
| 6 | No stylelint configuration | Bootstrap, Carbon, Primer | High |
| 7 | Shadow values inline in mixin, not tokenized | Material Design 3 | Medium |
| 8 | No motion/animation tokens (duration, easing) | Material Design 3 | Medium |
| 9 | No SCSS configuration module (`_config.scss`) | Carbon | Low |
| 10 | No high-contrast / forced-colors support | WCAG, Primer | Medium |
| 11 | No print stylesheet layer | ITCSS | Low |
| 12 | Unused utility classes generating bundle bloat | Bootstrap (PurgeCSS) | Medium |
| 13 | Invoices domain still on Tailwind (103 TSX files) | — | High |
| 14 | No CSS custom property fallback pattern | Carbon, SLDS | Low |
| 15 | Navigation component has ~20 hardcoded color values | — | High |

---

## Phase 1: Foundation Tokens Enhancement

**Goal:** Promote shadow, motion, and elevation values from inline definitions to first-class design tokens. Add a configuration module inspired by Carbon.

### Task 1.1: Create Configuration Module

**Files:**
- Create: `sites/arolariu.ro/src/styles/abstracts/_config.scss`
- Modify: `sites/arolariu.ro/src/styles/abstracts/_index.scss`

**Step 1: Create the configuration module**

```scss
// ===========================================
// SCSS DESIGN SYSTEM CONFIGURATION
// ===========================================
// Central configuration for the design system.
// Inspired by Carbon's @use config with ($prefix: 'cds') pattern.
//
// This module is @used first by all other abstracts files.
// Consumer modules can override defaults:
//   @use 'abstracts' with ($enable-fluid-type: false);
//
// DEPENDENCIES: None (leaf module)
// ===========================================

// Feature flags
$enable-fluid-type: true !default;
$enable-logical-properties: true !default;
$enable-container-queries: true !default;
$enable-reduced-motion: true !default;
$enable-high-contrast: true !default;
$enable-print-styles: true !default;
$enable-css-layers: true !default;

// Namespace prefix for CSS custom properties
// All generated CSS variables will use this prefix: --aro-{token}
$css-prefix: 'aro' !default;

// Base font size for rem calculations (browser default)
$base-font-size: 16px !default;

// Default transition configuration
$default-duration: 150ms !default;
$default-easing: cubic-bezier(0.4, 0, 0.2, 1) !default;
```

**Step 2: Update abstracts/_index.scss to forward config first**

Add at the top of `_index.scss`:
```scss
@forward 'config';
```

**Step 3: Verify build**

Run: `cd sites/arolariu.ro && npx next build`
Expected: Build succeeds — config module loaded by all consumers

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_config.scss sites/arolariu.ro/src/styles/abstracts/_index.scss
git commit -m "feat(scss): add configuration module inspired by Carbon design system"
```

---

### Task 1.2: Tokenize Shadow Values

**Files:**
- Modify: `sites/arolariu.ro/src/styles/abstracts/_variables.scss`
- Modify: `sites/arolariu.ro/src/styles/abstracts/_mixins.scss`

**Step 1: Move shadow map from mixin to variables**

Add to `_variables.scss` after the border-radius section:

```scss
// ===========================================
// ELEVATION / SHADOW SCALE
// Inspired by Material Design 3 elevation tokens
// ===========================================
$shadows: (
  'none': none,
  'sm': 0 1px 2px 0 rgb(0 0 0 / 0.05),
  'md': (0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)),
  'lg': (0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)),
  'xl': (0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)),
  '2xl': 0 25px 50px -12px rgb(0 0 0 / 0.25),
) !default;

@function shadow($level) {
  @if map.has-key($shadows, $level) {
    @return map.get($shadows, $level);
  }
  @error "Unknown shadow level: #{$level}. Available: #{map.keys($shadows)}";
}
```

**Step 2: Update mixin to use the new function**

Replace the `shadow` mixin in `_mixins.scss`:

```scss
@mixin shadow($level: 'md') {
  box-shadow: shadow($level);
}
```

**Step 3: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_variables.scss sites/arolariu.ro/src/styles/abstracts/_mixins.scss
git commit -m "refactor(scss): tokenize shadow values into design token map"
```

---

### Task 1.3: Add Motion Tokens

**Files:**
- Modify: `sites/arolariu.ro/src/styles/abstracts/_variables.scss`
- Modify: `sites/arolariu.ro/src/styles/abstracts/_mixins.scss`

**Step 1: Add motion token maps to `_variables.scss`**

```scss
// ===========================================
// MOTION TOKENS
// Inspired by Material Design 3 motion system
// ===========================================
$durations: (
  'instant': 0ms,
  'fast': 100ms,
  'normal': 150ms,
  'moderate': 250ms,
  'slow': 350ms,
  'slower': 500ms,
  'slowest': 700ms,
) !default;

@function duration($key) {
  @if map.has-key($durations, $key) {
    @return map.get($durations, $key);
  }
  @error "Unknown duration: #{$key}. Available: #{map.keys($durations)}";
}

$easings: (
  'linear': linear,
  'ease': cubic-bezier(0.4, 0, 0.2, 1),        // standard
  'ease-in': cubic-bezier(0.4, 0, 1, 1),        // decelerate
  'ease-out': cubic-bezier(0, 0, 0.2, 1),       // accelerate
  'ease-in-out': cubic-bezier(0.4, 0, 0.2, 1),  // standard
  'spring': cubic-bezier(0.34, 1.56, 0.64, 1),  // bounce-like
) !default;

@function easing($key) {
  @if map.has-key($easings, $key) {
    @return map.get($easings, $key);
  }
  @error "Unknown easing: #{$key}. Available: #{map.keys($easings)}";
}
```

**Step 2: Update transition mixin to use tokens**

Replace in `_mixins.scss`:

```scss
@mixin transition($properties: all, $dur: 'normal', $timing: 'ease') {
  transition-property: $properties;
  transition-duration: duration($dur);
  transition-timing-function: easing($timing);
}
```

**Step 3: Update all existing `@include transition(...)` calls across codebase**

Search for `@include transition(` in all .scss files. Current calls use raw values like `150ms` and `cubic-bezier(...)`. Update them to use the new token API:

- `@include transition(color)` → `@include transition(color)` (already correct — uses defaults)
- `@include transition(border-color, box-shadow, background-color)` → `@include transition(border-color box-shadow background-color)` (Note: transition-property accepts space-separated or comma-separated)

**Important:** Since the mixin signature changes from `($properties, $duration, $timing)` to `($properties, $dur, $timing)`, verify that NO call site passes positional duration/timing arguments with raw values. If any do, update them to use token names.

**Step 4: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 5: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/
git commit -m "feat(scss): add motion tokens (duration, easing) inspired by Material Design 3"
```

---

## Phase 2: Modern CSS Integration

**Goal:** Add CSS @layer cascade control, fluid typography, logical properties, and container query mixins.

### Task 2.1: Add CSS @layer Cascade Control

**Files:**
- Modify: `sites/arolariu.ro/src/styles/main.scss`

**Step 1: Wrap existing @use directives with @layer**

```scss
// ===========================================
// CSS CASCADE LAYERS
// ===========================================
// Explicit layer ordering ensures predictable specificity:
//   base < themes < animations < components < utilities
// Module files (.module.scss) are NOT in any layer, giving
// them highest priority (standard CSS Modules behavior).
//
// Inspired by ITCSS inverted triangle + CSS @layer spec.
// ===========================================
@layer base, themes, animations, components, utilities;

// 1. ABSTRACTS (No CSS output — not layered)
@use 'abstracts' as *;

// 2. BASE
@layer base {
  @use 'base';
}

// 3. THEMES
@layer themes {
  @use 'themes';
}

// 4. ANIMATIONS
@layer animations {
  @use 'animations';
}

// 5. UTILITIES
@layer utilities {
  @use 'utilities';
}

// 6. COMPONENTS
@layer components {
  @use 'components';
}
```

**Step 2: Test that @layer + @use works with Dart Sass / Next.js**

Run: `cd sites/arolariu.ro && npx next build`

**Important:** If `@layer` + `@use` causes Sass compilation issues (Sass processes @layer but @use must be at top-level), use this alternative approach:

```scss
@use 'abstracts' as *;
@use 'base';
@use 'themes';
@use 'animations';
@use 'utilities';
@use 'components';
```

And instead wrap the OUTPUT inside each partition's `_index.scss`:
```scss
// In base/_index.scss:
@layer base {
  @forward 'reset';
  @forward 'elements';
}
```

**Step 3: Verify visual rendering in browser**

Run: `npm run dev:website`
Check: All pages render correctly. Utilities override component defaults. Module styles override everything.

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/styles/
git commit -m "feat(scss): add CSS @layer cascade control inspired by ITCSS"
```

---

### Task 2.2: Add Fluid Typography Mixin

**Files:**
- Modify: `sites/arolariu.ro/src/styles/abstracts/_mixins.scss`

**Step 1: Add the fluid-type mixin**

```scss
// ===========================================
// FLUID TYPOGRAPHY
// ===========================================
// Uses CSS clamp() for smooth font-size scaling between
// viewport breakpoints. Eliminates jagged breakpoint jumps.
//
// Inspired by Utopia (utopia.fyi) and modern CSS best practices.
//
// @param {String} $min-size - Minimum font-size token key (e.g., 'sm')
// @param {String} $max-size - Maximum font-size token key (e.g., '2xl')
// @param {Value} $min-vw [320px] - Viewport where min-size applies
// @param {Value} $max-vw [1280px] - Viewport where max-size applies
//
// @example
//   h1 { @include fluid-type('2xl', '5xl'); }
//   p { @include fluid-type('sm', 'lg'); }
@mixin fluid-type($min-size, $max-size, $min-vw: 320px, $max-vw: 1280px) {
  $min-fs: font-size($min-size);
  $max-fs: font-size($max-size);

  font-size: clamp(#{$min-fs}, #{$min-fs} + (#{strip-unit($max-fs)} - #{strip-unit($min-fs)}) * ((100vw - #{$min-vw}) / (#{strip-unit($max-vw)} - #{strip-unit($min-vw)})), #{$max-fs});
}
```

**Step 2: Add strip-unit helper to _functions.scss**

```scss
// Strip unit from a value (e.g., 1.5rem → 1.5)
@function strip-unit($value) {
  @return math.div($value, ($value * 0 + 1));
}
```

Add `@use 'sass:math';` at the top of `_functions.scss` if not already present.

**Step 3: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/
git commit -m "feat(scss): add fluid typography mixin using CSS clamp()"
```

---

### Task 2.3: Add Logical Properties Mixin

**Files:**
- Modify: `sites/arolariu.ro/src/styles/abstracts/_mixins.scss`

**Step 1: Add logical property helpers**

```scss
// ===========================================
// LOGICAL PROPERTIES
// ===========================================
// Helpers for writing-direction-aware CSS.
// Supports RTL layouts for internationalization.
//
// Inspired by SLDS and Material Design's RTL support.
//
// @example
//   .card { @include padding-inline(space(4)); }
//   .text { @include margin-block(space(2), space(4)); }
@mixin padding-inline($start, $end: $start) {
  padding-inline-start: $start;
  padding-inline-end: $end;
}

@mixin padding-block($start, $end: $start) {
  padding-block-start: $start;
  padding-block-end: $end;
}

@mixin margin-inline($start, $end: $start) {
  margin-inline-start: $start;
  margin-inline-end: $end;
}

@mixin margin-block($start, $end: $start) {
  margin-block-start: $start;
  margin-block-end: $end;
}

// Shorthand for inline centering (replaces margin-left/right: auto)
@mixin margin-inline-auto {
  margin-inline: auto;
}
```

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_mixins.scss
git commit -m "feat(scss): add logical property mixins for i18n/RTL support"
```

---

### Task 2.4: Add Container Query Mixin

**Files:**
- Modify: `sites/arolariu.ro/src/styles/abstracts/_mixins.scss`

**Step 1: Add container query mixins**

```scss
// ===========================================
// CONTAINER QUERIES
// ===========================================
// Modern responsive design based on container size
// rather than viewport size. Ideal for reusable components.
//
// @example
//   .wrapper { @include container('card'); }
//   .content { @include container-query('card', 400px) { grid-template-columns: 1fr 1fr; } }
@mixin container($name: null) {
  container-type: inline-size;
  @if $name {
    container-name: #{$name};
  }
}

@mixin container-query($name, $min-width) {
  @container #{$name} (min-width: #{$min-width}) {
    @content;
  }
}

@mixin container-query-unnamed($min-width) {
  @container (min-width: #{$min-width}) {
    @content;
  }
}
```

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_mixins.scss
git commit -m "feat(scss): add container query mixins for component-level responsive design"
```

---

## Phase 3: Accessibility & Media Query Layers

**Goal:** Add high-contrast mode support, forced-colors, and a print stylesheet layer.

### Task 3.1: Add Accessibility Media Query Mixins

**Files:**
- Modify: `sites/arolariu.ro/src/styles/abstracts/_mixins.scss`

**Step 1: Add accessibility mixins after reduced-motion**

```scss
// ===========================================
// ACCESSIBILITY MEDIA QUERIES
// ===========================================

// High contrast mode (Windows High Contrast, forced-colors)
// Usage: @include high-contrast { border: 2px solid ButtonText; }
@mixin high-contrast {
  @media (forced-colors: active) {
    @content;
  }
}

// Prefers contrast (user wants more contrast)
// Usage: @include prefers-more-contrast { border-width: 2px; }
@mixin prefers-more-contrast {
  @media (prefers-contrast: more) {
    @content;
  }
}

// Prefers reduced transparency
@mixin reduced-transparency {
  @media (prefers-reduced-transparency: reduce) {
    @content;
  }
}

// Color scheme preference (light/dark at OS level)
@mixin prefers-dark {
  @media (prefers-color-scheme: dark) {
    @content;
  }
}

@mixin prefers-light {
  @media (prefers-color-scheme: light) {
    @content;
  }
}
```

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_mixins.scss
git commit -m "feat(scss): add accessibility media query mixins (forced-colors, prefers-contrast)"
```

---

### Task 3.2: Add Print Stylesheet

**Files:**
- Create: `sites/arolariu.ro/src/styles/base/_print.scss`
- Modify: `sites/arolariu.ro/src/styles/base/_index.scss`

**Step 1: Create print stylesheet**

```scss
// ===========================================
// PRINT STYLES
// ===========================================
// Optimizations for printed output.
// Applied via @media print to avoid affecting screen rendering.
// ===========================================

@media print {
  // Remove decorative elements
  .no-print,
  [data-no-print],
  nav,
  footer,
  aside {
    display: none !important;
  }

  // Reset backgrounds for ink saving
  body {
    background: white !important;
    color: black !important;
  }

  // Show URLs after links
  a[href]::after {
    content: ' (' attr(href) ')';
    font-size: 0.8em;
    color: #666;
  }

  // Avoid page breaks inside cards/sections
  .card,
  article,
  section {
    break-inside: avoid;
  }

  // Ensure text is readable
  * {
    color: black !important;
    text-shadow: none !important;
    box-shadow: none !important;
  }

  // Reset fixed/sticky positioning
  [style*="position: fixed"],
  [style*="position: sticky"] {
    position: static !important;
  }
}
```

**Step 2: Forward from base/_index.scss**

Add:
```scss
@forward 'print';
```

**Step 3: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/styles/base/
git commit -m "feat(scss): add print stylesheet for optimized printed output"
```

---

### Task 3.3: Add Forced-Colors Support to Global Components

**Files:**
- Modify: `sites/arolariu.ro/src/styles/components/_buttons.scss`
- Modify: `sites/arolariu.ro/src/styles/components/_cards.scss`

**Step 1: Add forced-colors fallbacks to buttons**

At the end of `_buttons.scss`, add:

```scss
// High contrast mode support
@include high-contrast {
  .btn {
    border: 2px solid ButtonText;

    &--primary {
      background-color: Highlight;
      color: HighlightText;
      border-color: Highlight;
    }

    &:focus-visible {
      outline: 3px solid Highlight;
      outline-offset: 2px;
    }
  }
}
```

**Step 2: Add forced-colors fallbacks to cards**

At the end of `_cards.scss`, add:

```scss
@include high-contrast {
  .card {
    border: 2px solid ButtonText;

    &--interactive:hover {
      border-color: Highlight;
    }

    &--featured::before {
      display: none;
    }
  }
}
```

**Step 3: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/styles/components/
git commit -m "feat(scss): add forced-colors (high contrast) support to buttons and cards"
```

---

## Phase 4: Eliminate Hardcoded Colors

**Goal:** Replace all remaining hardcoded hex/rgb values in SCSS files with design token references or documented exceptions.

### Task 4.1: Create Semantic Color Aliases for Navigation

**Files:**
- Modify: `sites/arolariu.ro/src/styles/abstracts/_colors.scss`

**Step 1: Extend the static-colors map for common decorative colors**

Add after `$static-colors`:

```scss
// ===========================================
// INTERACTIVE STATE COLORS
// ===========================================
// Colors used for hover, focus, and active states
// that need to remain constant across themes.
// These are semantic aliases for common Tailwind color values
// found in navigation, badges, and status indicators.
$interactive-colors: (
  'hover-primary': #4f46e5,    // indigo-600 — link hover
  'hover-bg-light': #f3f4f6,  // gray-100 — hover background (light)
  'hover-bg-subtle': #f9fafb, // gray-50 — subtle hover background
  'text-strong': #111827,     // gray-900 — strong text
  'text-medium': #374151,     // gray-700 — medium text
  'text-subtle': #6b7280,     // gray-500 — subtle text
  'surface-light': white,     // light mode surfaces
  'surface-dark': #1f2937,    // gray-800 — dark mode surfaces
  'border-subtle': #f3f4f6,   // gray-100 — subtle borders
  'backdrop': rgba(0, 0, 0, 0.4), // modal backdrop
) !default;

@function interactive-color($name) {
  @if map.has-key($interactive-colors, $name) {
    @return map.get($interactive-colors, $name);
  }
  @error "Unknown interactive color: #{$name}. Available: #{map.keys($interactive-colors)}";
}
```

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_colors.scss
git commit -m "feat(scss): add interactive color tokens for navigation and UI states"
```

---

### Task 4.2: Refactor Navigation Component Colors

**Files:**
- Modify: `sites/arolariu.ro/src/styles/components/_navigation.scss`

**Step 1: Replace all hardcoded hex values**

Replace every hardcoded color with the new token:

| Find | Replace |
|------|---------|
| `#4f46e5` | `interactive-color('hover-primary')` |
| `#f3f4f6` | `interactive-color('hover-bg-light')` |
| `#f9fafb` | `interactive-color('hover-bg-subtle')` |
| `#111827` | `interactive-color('text-strong')` |
| `#374151` | `interactive-color('text-medium')` |
| `#6b7280` | `interactive-color('text-subtle')` |
| `white` (in bg contexts) | `interactive-color('surface-light')` |
| `black` (in text contexts) | `interactive-color('text-strong')` |
| `rgba(0, 0, 0, 0.4)` | `interactive-color('backdrop')` |

Also add dark mode overrides for navigation:

```scss
@include dark {
  .desktop-nav__dropdown {
    background-color: color('card');
    border: 1px solid color('border');
  }

  .desktop-nav__child-title {
    color: color('foreground');
  }

  .desktop-nav__child-link {
    color: color('muted-foreground');

    &:hover {
      background-color: color-alpha('accent', 0.1);
    }
  }

  .mobile-nav__panel {
    background-color: color('card');
  }

  .mobile-nav__title,
  .mobile-nav__close {
    color: color('foreground');
  }

  .mobile-nav__list > li {
    border-color: color('border');
  }

  .mobile-nav__item-link {
    color: color('foreground');
  }

  .mobile-nav__expand-btn {
    color: color('muted-foreground');
  }

  .mobile-nav__children {
    background-color: color-alpha('muted', 0.5);
  }

  .mobile-nav__child {
    color: color('foreground');
  }

  .mobile-nav__grandchild-link {
    color: color('muted-foreground');
  }
}
```

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Visually verify navigation in light AND dark mode**

Run: `npm run dev:website`

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/styles/components/_navigation.scss
git commit -m "refactor(scss): replace 20 hardcoded colors in navigation with design tokens"
```

---

### Task 4.3: Audit and Fix All Remaining Hardcoded Colors in Module Files

**Files:**
- All `*.module.scss` files with hardcoded hex/rgb values

**Step 1: Run the audit**

Search for hardcoded color patterns in all .scss files:
```bash
grep -rn "#[0-9a-fA-F]\{3,8\}" sites/arolariu.ro/src/ --include="*.scss" | grep -v "node_modules" | grep -v "abstracts" | grep -v "_variables"
```

Also search for:
```bash
grep -rn "rgb(" sites/arolariu.ro/src/ --include="*.scss" | grep -v "abstracts" | grep -v "0 0 0"
```

**Step 2: For each file with hardcoded values, categorize:**

- **Theme-responsive colors** (text, background, border) → Replace with `color()` or `color-alpha()`
- **Decorative static colors** (orb colors, gradient stops, specific brand accents) → Replace with `$icon-colors` map, `interactive-color()`, or document as intentional exceptions
- **Icon colors** → Should use `$icon-colors` map or `@include icon-color-variants`
- **Status colors** (success green, error red, warning amber) → Create a `$status-colors` map if not already in the color system

**Step 3: Fix files in batches by route**

Process in this order (smallest to largest):
1. Root-level modules (`loading.module.scss`, `global-error.module.scss`, etc.)
2. Home page modules (`_components/Hero.module.scss`, etc.)
3. About section modules
4. Auth modules
5. My-profile modules
6. Privacy-and-terms modules

For each batch:
- Replace hardcoded values
- Verify build
- Commit

**Step 4: Document intentional exceptions**

Some colors MUST remain hardcoded (e.g., specific brand orb colors for decorative elements, icon variant colors). Add a comment above each:

```scss
// Decorative: intentionally hardcoded (not theme-responsive)
background-color: rgba(59, 130, 246, 0.15);
```

**Step 5: Commit final audit results**

```bash
git commit -m "refactor(scss): eliminate hardcoded colors from all module files, document exceptions"
```

---

## Phase 5: Stylelint Configuration

**Goal:** Add automated SCSS quality enforcement inspired by Bootstrap, Carbon, and Primer's lint configurations.

### Task 5.1: Install and Configure Stylelint

**Files:**
- Modify: `sites/arolariu.ro/package.json`
- Create: `sites/arolariu.ro/.stylelintrc.json`

**Step 1: Install dependencies**

```bash
cd sites/arolariu.ro && npm install -D stylelint stylelint-config-standard-scss stylelint-order
```

**Step 2: Create .stylelintrc.json**

```json
{
  "extends": ["stylelint-config-standard-scss"],
  "plugins": ["stylelint-order"],
  "rules": {
    "scss/at-use-no-unnamespaced": null,
    "scss/dollar-variable-pattern": "^[a-z][a-z0-9-]*$",
    "scss/percent-placeholder-pattern": "^[a-z][a-z0-9-]*$",
    "scss/at-mixin-pattern": "^[a-z][a-z0-9-]*$",
    "scss/at-function-pattern": "^[a-z][a-z0-9-]*$",
    "selector-class-pattern": null,
    "color-no-hex": null,
    "color-named": "never",
    "declaration-no-important": true,
    "max-nesting-depth": [4, {
      "ignoreAtRules": ["media", "include", "each", "if", "else", "layer", "container"],
      "ignore": ["pseudo-classes"]
    }],
    "selector-max-id": 0,
    "selector-max-compound-selectors": 4,
    "no-descending-specificity": null,
    "order/properties-alphabetical-order": null,
    "order/properties-order": [
      "content",
      "display",
      "flex",
      "flex-direction",
      "flex-wrap",
      "align-items",
      "justify-content",
      "gap",
      "grid",
      "grid-template-columns",
      "grid-template-rows",
      "position",
      "inset",
      "top",
      "right",
      "bottom",
      "left",
      "z-index",
      "width",
      "min-width",
      "max-width",
      "height",
      "min-height",
      "max-height",
      "margin",
      "padding",
      "overflow",
      "border",
      "border-radius",
      "background",
      "color",
      "font",
      "font-size",
      "font-weight",
      "line-height",
      "letter-spacing",
      "text-align",
      "text-decoration",
      "opacity",
      "visibility",
      "transform",
      "transition",
      "animation"
    ]
  },
  "ignoreFiles": [
    "node_modules/**",
    ".next/**",
    "src/app/globals.scss"
  ]
}
```

**Step 3: Add lint script to package.json**

Add to `scripts`:
```json
"lint:scss": "stylelint 'src/**/*.scss' --fix"
```

**Step 4: Run initial lint to see current violations**

```bash
cd sites/arolariu.ro && npx stylelint "src/**/*.scss" --formatter compact 2>&1 | head -50
```

Document the count. Do NOT auto-fix on first run.

**Step 5: Commit**

```bash
git add sites/arolariu.ro/.stylelintrc.json sites/arolariu.ro/package.json
git commit -m "feat(scss): add stylelint configuration inspired by Bootstrap and Carbon"
```

---

### Task 5.2: Fix Stylelint Violations

**Files:**
- All `*.scss` files with violations

**Step 1: Run auto-fix for safe rules**

```bash
cd sites/arolariu.ro && npx stylelint "src/**/*.scss" --fix
```

**Step 2: Manually review and fix remaining violations**

Focus on:
- Nesting depth violations → flatten nested selectors
- Important declarations → remove or convert to higher-specificity selector
- Named colors → convert to HSL or token reference

**Step 3: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 4: Commit**

```bash
git add -A sites/arolariu.ro/src/
git commit -m "fix(scss): resolve stylelint violations across all SCSS files"
```

---

## Phase 6: Utility Layer Optimization

**Goal:** Reduce CSS bundle size by removing unused utility classes and adding dead-code analysis.

### Task 6.1: Audit Utility Usage

**Files:**
- None (audit only)

**Step 1: Check which utility classes are actually used**

For each utility file (_spacing.scss, _layout.scss, _display.scss, _colors.scss, _sizing.scss, _effects.scss), search the codebase for actual usage:

```bash
# Check if any .tsx file or .scss file references these utility classes
grep -rn "composes:.*from global" sites/arolariu.ro/src/ --include="*.scss"
grep -rn "className=.*['\"]flex['\"]" sites/arolariu.ro/src/ --include="*.tsx"
```

**Step 2: Document which utilities are used and which are dead code**

Create a usage report.

**Step 3: Commit audit findings as a TODO comment in main.scss**

---

### Task 6.2: Remove Unused Utility Classes

**Files:**
- Modify: `sites/arolariu.ro/src/styles/utilities/_spacing.scss`
- Modify: `sites/arolariu.ro/src/styles/utilities/_layout.scss`
- Modify: `sites/arolariu.ro/src/styles/utilities/_sizing.scss`

**Step 1: Based on the audit, remove utility classes that are never referenced**

If the entire utilities layer has zero consumers (everything uses SCSS modules), consider:
- Keeping only semantically meaningful utilities: `.sr-only`, `.gradient-text`, `.gradient-bg`, print utilities
- Removing generated spacing/layout/sizing utilities entirely
- Adding a comment explaining the decision

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Check CSS bundle size before/after**

```bash
dir sites\arolariu.ro\.next\static\css\
```

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/styles/utilities/
git commit -m "perf(scss): remove unused utility classes, reduce CSS bundle size"
```

---

## Phase 7: Invoices Domain Migration

**Goal:** Migrate the invoices domain (103 TSX files) from Tailwind to SCSS modules — the final and largest migration effort.

### Task 7.1: Create Invoice Domain SCSS Shared Abstracts

**Files:**
- Create: `sites/arolariu.ro/src/app/domains/invoices/_styles/_invoice-shared.scss`

**Step 1: Create domain-specific shared styles**

```scss
// ===========================================
// INVOICE DOMAIN — Shared Styles
// ===========================================
@use '../../../../styles/abstracts' as *;

$invoice-status-colors: (
  'pending': #f59e0b,
  'processing': #3b82f6,
  'completed': #22c55e,
  'failed': #ef4444,
  'cancelled': #6b7280,
) !default;

@mixin status-badge($status) {
  @if map-has-key($invoice-status-colors, $status) {
    $color: map-get($invoice-status-colors, $status);
    color: $color;
    background-color: rgba($color, 0.1);
    border: 1px solid rgba($color, 0.2);
    border-radius: radius('full');
    padding: space(0.5) space(2);
    font-size: font-size('xs');
    font-weight: font-weight('medium');
  }
}

@mixin invoice-card {
  background-color: color('card');
  border: 1px solid color('border');
  border-radius: radius('xl');
  @include card-hover;
  overflow: hidden;
}

@mixin invoice-input {
  padding: space(2) space(3);
  border: 1px solid color('input');
  border-radius: radius('md');
  background: color('background');
  font-size: font-size('sm');
  @include transition(border-color box-shadow);

  &:focus {
    border-color: color('ring');
    box-shadow: 0 0 0 2px color-alpha('ring', 0.2);
    outline: none;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

@mixin invoice-table {
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: space(3) space(4);
    text-align: left;
    border-bottom: 1px solid color('border');
  }

  th {
    font-weight: font-weight('medium');
    font-size: font-size('sm');
    color: color('muted-foreground');
    background-color: color('muted');
  }

  td {
    font-size: font-size('sm');
  }

  tr {
    @include transition(background-color);

    &:hover {
      background-color: color-alpha('muted', 0.5);
    }
  }
}
```

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/app/domains/invoices/_styles/
git commit -m "feat(scss): create invoice domain shared SCSS abstracts"
```

---

### Task 7.2: Migrate Upload-Scans Route

**Files:**
- Create SCSS modules for each component in `src/app/domains/invoices/upload-scans/`
- Modify TSX files to use CSS modules

**Strategy for each TSX file:**
1. Read the file, extract all Tailwind className strings
2. Create a corresponding `.module.scss` file
3. Convert Tailwind utilities to SCSS using design tokens
4. Replace className strings with `styles["className"]` references
5. Keep @arolariu/components className props unchanged

**Step 1: Migrate each component**
**Step 2: Verify build**
**Step 3: Visual verification**
**Step 4: Commit**

```bash
git commit -m "refactor(scss): migrate upload-scans route from Tailwind to SCSS modules"
```

---

### Task 7.3: Migrate View-Scans Route

Same process as Task 7.2 for `src/app/domains/invoices/view-scans/`.

```bash
git commit -m "refactor(scss): migrate view-scans route from Tailwind to SCSS modules"
```

---

### Task 7.4: Migrate View-Invoices Route

Same process for `src/app/domains/invoices/view-invoices/`.

```bash
git commit -m "refactor(scss): migrate view-invoices route from Tailwind to SCSS modules"
```

---

### Task 7.5: Migrate View-Invoice Detail Route

Same process for `src/app/domains/invoices/view-invoice/[id]/`.

```bash
git commit -m "refactor(scss): migrate view-invoice detail route from Tailwind to SCSS modules"
```

---

### Task 7.6: Migrate Edit-Invoice Route (Most Complex)

Same process for `src/app/domains/invoices/edit-invoice/[id]/`.

This is the most complex route with form controls, calculations, item lists, and dynamic states.

```bash
git commit -m "refactor(scss): migrate edit-invoice route from Tailwind to SCSS modules"
```

---

### Task 7.7: Migrate Shared Invoice Components

Same process for `src/app/domains/invoices/_components/`.

```bash
git commit -m "refactor(scss): migrate shared invoice components from Tailwind to SCSS modules"
```

---

### Task 7.8: Final Invoice Domain Verification

**Step 1: Search for remaining Tailwind patterns**

```bash
grep -rn "className=" sites/arolariu.ro/src/app/domains/invoices/ --include="*.tsx" | grep -E "\b(flex|grid|p-[0-9]|m-[0-9]|text-[a-z]|bg-[a-z]|w-[0-9]|rounded|shadow)\b"
```

Expected: Only matches in @arolariu/components usage

**Step 2: Full build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Commit**

```bash
git commit --allow-empty -m "chore: invoices domain migration to SCSS complete"
```

---

## Phase 8: Final Cleanup & Tailwind Removal

**Goal:** Remove TailwindCSS from the main site once all routes are migrated.

### Task 8.1: Full Audit for Remaining Tailwind

**Step 1: Comprehensive search**

```bash
grep -rn "className=" sites/arolariu.ro/src/app/ --include="*.tsx" | grep -v "styles\[" | grep -v "node_modules" | head -100
```

Any className that doesn't reference `styles[...]` is a potential Tailwind usage.

**Step 2: Fix any remaining instances**

---

### Task 8.2: Remove Tailwind from PostCSS

**Files:**
- Modify: `sites/arolariu.ro/postcss.config.js`

Remove `@tailwindcss/postcss` plugin. Keep `cssnano`.

---

### Task 8.3: Remove Tailwind Dependencies

**Files:**
- Modify: `sites/arolariu.ro/package.json`

Remove: `@tailwindcss/postcss`, `@tailwindcss/typography`, `tailwindcss`, `tailwindcss-animate`, `daisyui`

Keep: `sass`, `cssnano`, `postcss`

Delete: `sites/arolariu.ro/tailwind.config.ts`

Run: `npm install`

---

### Task 8.4: Convert globals.css to globals.scss

If `globals.css` still exists and references Tailwind:
- Rename to `globals.scss`
- Remove `@import 'tailwindcss'` and `@config` directives
- Replace `@apply` rules with plain CSS
- Update `layout.tsx` import

---

### Task 8.5: Final Verification

**Step 1: Full build**: `cd sites/arolariu.ro && npx next build`
**Step 2: Lint**: `npm run lint`
**Step 3: Stylelint**: `npx stylelint "src/**/*.scss"`
**Step 4: Tests**: `npm run test:website`
**Step 5: Visual verification in browser — all pages, light/dark, all presets, responsive**

```bash
git commit --allow-empty -m "chore: TailwindCSS removal complete — SCSS-only styling for main site"
```

---

## Phase 9: Performance Audit & Bundle Analysis

**Goal:** Final optimization pass. Measure, optimize, document.

### Task 9.1: CSS Bundle Size Analysis

**Step 1: Measure total CSS output**

```bash
cd sites/arolariu.ro && npx next build
dir .next\static\css\
```

Document total CSS size.

**Step 2: Check for duplicate rules**

Look at compiled CSS for repeated patterns.

**Step 3: If bundle is larger than expected, identify optimization targets**

- Reduce utility class generation
- Remove unused component styles
- Consider critical CSS extraction for above-the-fold

---

### Task 9.2: Runtime Performance Check

**Step 1: Audit `will-change` usage**

Search for `will-change` — ensure it's only on animated elements.

**Step 2: Verify GPU-accelerated animations**

Ensure all animations use `transform` and `opacity` (not `width`, `height`, `top`, `left`).

**Step 3: Verify reduced-motion is respected everywhere**

**Step 4: Commit any fixes**

---

## Success Criteria

- [ ] CSS `@layer` cascade ordering implemented
- [ ] Fluid typography mixin available and documented
- [ ] Logical property mixins for RTL/i18n support
- [ ] Container query mixins for component-level responsive design
- [ ] Motion tokens (duration, easing) replace all hardcoded transition values
- [ ] Shadow values tokenized in design token map
- [ ] Configuration module with feature flags
- [ ] Zero hardcoded hex colors in navigation component
- [ ] <10 documented intentional hardcoded color exceptions across all modules
- [ ] Stylelint configured and all violations resolved
- [ ] Forced-colors (high contrast) support on buttons and cards
- [ ] Print stylesheet layer implemented
- [ ] Invoice domain (103 files) migrated to SCSS modules
- [ ] TailwindCSS removed from main site dependencies
- [ ] All module files use design token functions consistently
- [ ] CSS bundle size documented and optimized
- [ ] Build succeeds without warnings
- [ ] All tests pass
- [ ] Visual parity across all pages, themes, and viewports

---

## Execution Order & Dependencies

```
Phase 1 (Foundation Tokens) ──→ no dependencies
Phase 2 (Modern CSS)        ──→ depends on Phase 1 (motion tokens)
Phase 3 (Accessibility)     ──→ no dependencies, can parallel Phase 1-2
Phase 4 (Hardcoded Colors)  ──→ depends on Phase 1 (interactive-color tokens)
Phase 5 (Stylelint)         ──→ after Phase 4 (so lint catches remaining issues)
Phase 6 (Utility Optimize)  ──→ after Phase 5 (lint-clean first)
Phase 7 (Invoices Migration)──→ after Phase 1-4 (tokens ready for new modules)
Phase 8 (Tailwind Removal)  ──→ after Phase 7 (all routes migrated)
Phase 9 (Performance)       ──→ after all other phases
```

**Parallelizable:** Phases 1 + 3 can run simultaneously. Phase 5 can overlap with Phase 7 start.
