# Complete SCSS Migration & Design System Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fully migrate sites/arolariu.ro away from TailwindCSS to a robust, extensible, heavily-documented SCSS design system with end-user theme customization support.

**Architecture:** SCSS Modules (7-1 pattern) + CSS Custom Properties + Runtime Theme Engine. Component library (@arolariu/components) remains on Tailwind. The SCSS system provides: shared design tokens via abstracts, scoped component styles via CSS Modules, global component styles via BEM, runtime theming via CSS variables set by React contexts, and end-user customization via preset themes and custom color pickers.

**Tech Stack:** SCSS (Dart Sass), CSS Modules, CSS Custom Properties, next-themes, GradientThemeContext (extended), Zustand + IndexedDB persistence, Next.js 16 built-in Sass support.

**Supersedes:** This plan consolidates and supersedes:
- `2026-02-05-scss-infrastructure.md` (Phase 0-5: DONE)
- `2026-02-05-scss-migration-strategy.md` (Phases A-C: partially done; D-H: NOT done)
- `2026-02-05-scss-consolidation.md` (Phases 1-2: partially done; Phase 3: NOT done)
- `2026-02-05-scss-system-rfc.md` (RFC 1008: DONE)

---

## Current State Analysis

### What's Already Done
- 7-1 SCSS directory structure created and working
- 73 SCSS module files across the app
- Abstracts: variables, colors, typography, mixins, functions — all populated
- Base: reset, elements — implemented
- Themes: variables (docs), presets (5 gradient presets) — implemented
- Animations: keyframes (12), transitions — implemented
- Components: header, navigation, footer, buttons, cards — implemented
- RFC 1008 documentation — created
- Static pages, about section, auth, privacy-and-terms, my-profile — all migrated to SCSS modules

### What's NOT Done
| Area | Status | Scope |
|------|--------|-------|
| Utilities folder | Empty placeholder files | 5 files need content |
| Domains/invoices route | Pure Tailwind (103 TSX files) | Largest migration effort |
| Module file refactoring | 40+ hardcoded colors, 7 duplicate patterns | 73 files need audit |
| End-user theming | Only gradient presets exist | Full theme system needed |
| Tailwind removal | globals.css still imports Tailwind | Final cleanup |
| Styles/ extensibility docs | Minimal inline comments | Comprehensive docs needed |

### Duplicate Patterns Found in Module Files
1. **Gradient text** — `background: linear-gradient(...); background-clip: text; color: transparent` (3+ files)
2. **Orb/blob decorations** — absolute positioned blurred circles (5+ files)
3. **Card hover elevation** — `transition + &:hover { border-color + shadow }` (10+ files)
4. **Accent top bar** — `position: absolute; top: 0; height: 4px; gradient` (3+ files)
5. **Icon color variants** — `.iconBlue { color: #3b82f6 }` repeated per file (4+ files)
6. **Responsive grid 1→2→3** — same grid pattern repeated (8+ files)
7. **Container with responsive padding** — `@include container(Xrem)` (many files)

---

## Phase 1: Styles/ Folder Overhaul

**Goal:** Transform the styles/ folder into a world-class, heavily-documented, extensible SCSS design system.

### Task 1.1: Add Shared Mixin for Gradient Text Effect

**Files:**
- Modify: `sites/arolariu.ro/src/styles/abstracts/_mixins.scss`

**Step 1: Add the mixin after the existing `gradient-bg` mixin**

```scss
// ===========================================
// GRADIENT TEXT WITH CUSTOM COLORS
// ===========================================
// Gradient text using specific hex colors (not CSS variable gradients).
// For CSS-variable-based gradient text, use @include gradient-text instead.
//
// @param {Color} $from [#3b82f6] - Start color (default: blue-500)
// @param {Color} $via [#a855f7] - Middle color (default: purple-500)
// @param {Color} $to [#ec4899] - End color (default: pink-500)
// @param {String} $direction [to right] - Gradient direction
//
// @example
//   .title { @include gradient-text-custom(#3b82f6, #a855f7, #ec4899); }
@mixin gradient-text-custom($from: #3b82f6, $via: #a855f7, $to: #ec4899, $direction: to right) {
  background: linear-gradient($direction, $from, $via, $to);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

**Step 2: Run build to verify**

Run: `cd sites/arolariu.ro && npx next build`
Expected: Build succeeds without SCSS errors

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_mixins.scss
git commit -m "feat(scss): add gradient-text-custom mixin for static gradient text"
```

---

### Task 1.2: Add Shared Mixin for Card Hover Effect

**Files:**
- Modify: `sites/arolariu.ro/src/styles/abstracts/_mixins.scss`

**Step 1: Add the mixin to the visual effects section**

```scss
// ===========================================
// CARD HOVER ELEVATION
// ===========================================
// Standard hover effect for interactive cards: highlights border
// and elevates shadow on hover. Includes transition setup.
//
// @param {String} $shadow-level ['lg'] - Shadow level on hover
// @param {Number} $border-alpha [0.3] - Border opacity on hover (0-1)
// @param {String} $border-color ['primary'] - CSS variable name for border
//
// @example
//   .card { @include card-hover; }
//   .card { @include card-hover('xl', 0.5); }
@mixin card-hover($shadow-level: 'lg', $border-alpha: 0.3, $border-color: 'primary') {
  @include transition(border-color, box-shadow, background-color);

  &:hover {
    border-color: hsl(var(--#{$border-color}) / #{$border-alpha});
    @include shadow($shadow-level);
  }
}
```

**Step 2: Run build to verify**

Run: `cd sites/arolariu.ro && npx next build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_mixins.scss
git commit -m "feat(scss): add card-hover mixin for standard card elevation"
```

---

### Task 1.3: Add Shared Mixin for Accent Top Bar

**Files:**
- Modify: `sites/arolariu.ro/src/styles/abstracts/_mixins.scss`

**Step 1: Add the mixin**

```scss
// ===========================================
// ACCENT TOP BAR
// ===========================================
// Gradient decorative bar at the top of a card or section.
// The parent element MUST have position: relative.
//
// @param {Number} $height [4px] - Bar height
// @param {Color} $from [#3b82f6] - Start color
// @param {Color} $via [#a855f7] - Middle color
// @param {Color} $to [#ec4899] - End color
//
// @example
//   .accentBar { @include accent-top-bar; }
@mixin accent-top-bar($height: 4px, $from: #3b82f6, $via: #a855f7, $to: #ec4899) {
  position: absolute;
  top: 0;
  left: 0;
  height: $height;
  width: 100%;
  background: linear-gradient(to right, $from, $via, $to);
  border-radius: radius('xl') radius('xl') 0 0;
}
```

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_mixins.scss
git commit -m "feat(scss): add accent-top-bar mixin for card decorations"
```

---

### Task 1.4: Add Shared Mixin for Icon Color Variants

**Files:**
- Modify: `sites/arolariu.ro/src/styles/abstracts/_mixins.scss`

**Step 1: Add the mixin and color map**

```scss
// ===========================================
// ICON COLOR VARIANTS
// ===========================================
// Generates color variant classes for icons used in timelines,
// competencies, and similar components.
//
// @param {String} $prefix ['icon'] - Class name prefix
//
// @example SCSS:
//   @include icon-color-variants;
//   // Generates: .iconBlue, .iconGreen, .iconPurple, etc.
//
// @example TSX (CSS Module):
//   <div className={styles[`icon${color}`]} />

$icon-colors: (
  'Blue': #3b82f6,
  'Green': #22c55e,
  'Purple': #a855f7,
  'Amber': #f59e0b,
  'Pink': #ec4899,
  'Red': #ef4444,
  'Teal': #14b8a6,
  'Orange': #f97316,
  'Indigo': #6366f1,
  'Cyan': #06b6d4,
) !default;

@mixin icon-color-variants($prefix: 'icon') {
  @each $name, $color in $icon-colors {
    &#{$name} {
      color: $color;
    }
  }
}
```

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_mixins.scss
git commit -m "feat(scss): add icon-color-variants mixin with 10 color presets"
```

---

### Task 1.5: Add Shared Mixin for Responsive Grid Pattern

**Files:**
- Modify: `sites/arolariu.ro/src/styles/abstracts/_mixins.scss`

**Step 1: Add the mixin**

```scss
// ===========================================
// RESPONSIVE GRID
// ===========================================
// Common pattern: 1 column on mobile, 2 on tablet, 3 on desktop.
// Wraps the repeated @include grid + @include respond-to pattern.
//
// @param {Number} $mobile [1] - Columns on mobile
// @param {Number} $tablet [2] - Columns at 'md' breakpoint
// @param {Number} $desktop [3] - Columns at 'lg' breakpoint
// @param {Value} $gap [space(6)] - Grid gap
// @param {Value} $desktop-gap [null] - Optional larger gap on desktop
//
// @example
//   .grid { @include responsive-grid; }                    // 1→2→3
//   .grid { @include responsive-grid(1, 2, 4, space(4)); } // 1→2→4
@mixin responsive-grid($mobile: 1, $tablet: 2, $desktop: 3, $gap: space(6), $desktop-gap: null) {
  display: grid;
  grid-template-columns: repeat($mobile, minmax(0, 1fr));
  gap: $gap;

  @include respond-to('md') {
    grid-template-columns: repeat($tablet, minmax(0, 1fr));
  }

  @include respond-to('lg') {
    grid-template-columns: repeat($desktop, minmax(0, 1fr));
    @if $desktop-gap {
      gap: $desktop-gap;
    }
  }
}
```

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_mixins.scss
git commit -m "feat(scss): add responsive-grid mixin for common column layouts"
```

---

### Task 1.6: Add Shared Mixin for Section Layout

**Files:**
- Modify: `sites/arolariu.ro/src/styles/abstracts/_mixins.scss`

**Step 1: Add the mixin**

```scss
// ===========================================
// SECTION LAYOUT
// ===========================================
// Standard page section with responsive vertical padding
// and optional background color.
//
// @param {Value} $py-mobile [space(12)] - Vertical padding on mobile
// @param {Value} $py-desktop [space(20)] - Vertical padding on desktop
//
// @example
//   .section { @include section-layout; }
@mixin section-layout($py-mobile: space(12), $py-desktop: space(20)) {
  position: relative;
  padding-top: $py-mobile;
  padding-bottom: $py-mobile;
  overflow: hidden;

  @include respond-to('lg') {
    padding-top: $py-desktop;
    padding-bottom: $py-desktop;
  }
}
```

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_mixins.scss
git commit -m "feat(scss): add section-layout mixin for page sections"
```

---

### Task 1.7: Populate Utilities — _spacing.scss

**Files:**
- Modify: `sites/arolariu.ro/src/styles/utilities/_spacing.scss`

**Step 1: Add spacing utility classes**

```scss
// ===========================================
// SPACING UTILITIES
// ===========================================
// Global utility classes for margin and padding.
// Use in CSS Module files via `composes: mt-4 from global;`
// or in JSX via className directly (since these are global).
//
// Naming convention matches Tailwind for familiarity:
//   .m-{size}  .p-{size}  .mx-auto  .gap-{size}
//
// Only generates utilities for the most common spacing values
// to keep bundle size small. For other values, use space() in
// your .module.scss file directly.
// ===========================================
@use '../abstracts' as *;

// Common spacing values to generate utilities for
$utility-spacings: (0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24);

// Margin utilities
@each $key in $utility-spacings {
  .m-#{$key} { margin: space($key); }
  .mt-#{$key} { margin-top: space($key); }
  .mr-#{$key} { margin-right: space($key); }
  .mb-#{$key} { margin-bottom: space($key); }
  .ml-#{$key} { margin-left: space($key); }
  .mx-#{$key} { margin-left: space($key); margin-right: space($key); }
  .my-#{$key} { margin-top: space($key); margin-bottom: space($key); }
}

.mx-auto { margin-left: auto; margin-right: auto; }

// Padding utilities
@each $key in $utility-spacings {
  .p-#{$key} { padding: space($key); }
  .pt-#{$key} { padding-top: space($key); }
  .pr-#{$key} { padding-right: space($key); }
  .pb-#{$key} { padding-bottom: space($key); }
  .pl-#{$key} { padding-left: space($key); }
  .px-#{$key} { padding-left: space($key); padding-right: space($key); }
  .py-#{$key} { padding-top: space($key); padding-bottom: space($key); }
}

// Gap utilities
@each $key in $utility-spacings {
  .gap-#{$key} { gap: space($key); }
  .gap-x-#{$key} { column-gap: space($key); }
  .gap-y-#{$key} { row-gap: space($key); }
}

// Negative margin (for overlap patterns)
@each $key in $utility-spacings {
  @if $key > 0 {
    .-mt-#{$key} { margin-top: calc(-1 * #{space($key)}); }
    .-mb-#{$key} { margin-bottom: calc(-1 * #{space($key)}); }
    .-ml-#{$key} { margin-left: calc(-1 * #{space($key)}); }
    .-mr-#{$key} { margin-right: calc(-1 * #{space($key)}); }
  }
}
```

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/styles/utilities/_spacing.scss
git commit -m "feat(scss): populate spacing utilities with margin, padding, gap classes"
```

---

### Task 1.8: Populate Utilities — _layout.scss

**Files:**
- Modify: `sites/arolariu.ro/src/styles/utilities/_layout.scss`

**Step 1: Add layout utility classes**

```scss
// ===========================================
// LAYOUT UTILITIES
// ===========================================
// Global utility classes for flexbox, grid, and positioning.
//
// For complex responsive layouts, prefer using mixins
// in your .module.scss file (e.g., @include responsive-grid).
// These utilities are for simple, common patterns only.
// ===========================================
@use '../abstracts' as *;

// Flexbox
.flex { display: flex; }
.flex-row { flex-direction: row; }
.flex-col { flex-direction: column; }
.flex-wrap { flex-wrap: wrap; }
.flex-nowrap { flex-wrap: nowrap; }
.flex-1 { flex: 1 1 0%; }
.flex-auto { flex: 1 1 auto; }
.flex-initial { flex: 0 1 auto; }
.flex-none { flex: none; }
.flex-grow { flex-grow: 1; }
.flex-shrink-0 { flex-shrink: 0; }

// Alignment
.items-start { align-items: flex-start; }
.items-center { align-items: center; }
.items-end { align-items: flex-end; }
.items-stretch { align-items: stretch; }
.items-baseline { align-items: baseline; }

.justify-start { justify-content: flex-start; }
.justify-center { justify-content: center; }
.justify-end { justify-content: flex-end; }
.justify-between { justify-content: space-between; }
.justify-around { justify-content: space-around; }
.justify-evenly { justify-content: space-evenly; }

.self-start { align-self: flex-start; }
.self-center { align-self: center; }
.self-end { align-self: flex-end; }
.self-stretch { align-self: stretch; }

// Grid
.grid { display: grid; }
.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }
.col-span-full { grid-column: 1 / -1; }

// Positioning
.relative { position: relative; }
.absolute { position: absolute; }
.fixed { position: fixed; }
.sticky { position: sticky; }
.static { position: static; }
.inset-0 { inset: 0; }
.top-0 { top: 0; }
.right-0 { right: 0; }
.bottom-0 { bottom: 0; }
.left-0 { left: 0; }

// Z-Index
.z-0 { z-index: z('base'); }
.z-10 { z-index: 10; }
.z-20 { z-index: 20; }
.z-30 { z-index: 30; }
.z-40 { z-index: 40; }
.z-50 { z-index: 50; }
```

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/styles/utilities/_layout.scss
git commit -m "feat(scss): populate layout utilities with flex, grid, position classes"
```

---

### Task 1.9: Populate Utilities — _display.scss

**Files:**
- Modify: `sites/arolariu.ro/src/styles/utilities/_display.scss`

**Step 1: Add display and visibility utilities**

```scss
// ===========================================
// DISPLAY & VISIBILITY UTILITIES
// ===========================================
@use '../abstracts' as *;

// Display
.block { display: block; }
.inline-block { display: inline-block; }
.inline { display: inline; }
.inline-flex { display: inline-flex; }
.inline-grid { display: inline-grid; }
.hidden { display: none; }
.contents { display: contents; }

// Visibility
.visible { visibility: visible; }
.invisible { visibility: hidden; }
.collapse { visibility: collapse; }

// Overflow
.overflow-auto { overflow: auto; }
.overflow-hidden { overflow: hidden; }
.overflow-visible { overflow: visible; }
.overflow-scroll { overflow: scroll; }
.overflow-x-auto { overflow-x: auto; }
.overflow-x-hidden { overflow-x: hidden; }
.overflow-y-auto { overflow-y: auto; }
.overflow-y-hidden { overflow-y: hidden; }

// Object Fit (for images/media)
.object-cover { object-fit: cover; }
.object-contain { object-fit: contain; }
.object-fill { object-fit: fill; }
.object-center { object-position: center; }

// Pointer Events
.pointer-events-none { pointer-events: none; }
.pointer-events-auto { pointer-events: auto; }

// Cursor
.cursor-pointer { cursor: pointer; }
.cursor-default { cursor: default; }
.cursor-not-allowed { cursor: not-allowed; }

// Select
.select-none { user-select: none; }
.select-text { user-select: text; }
.select-all { user-select: all; }

// Screen Reader Only (Accessible Hidden)
.sr-only {
  @include visually-hidden;
}

// Print utilities
@media print {
  .print-hidden { display: none !important; }
  .print-only { display: block; }
}

.print-only {
  display: none;
}
```

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/styles/utilities/_display.scss
git commit -m "feat(scss): populate display utilities with visibility, overflow, cursor classes"
```

---

### Task 1.10: Populate Utilities — _colors.scss

**Files:**
- Modify: `sites/arolariu.ro/src/styles/utilities/_colors.scss`

**Step 1: Add color utility classes using CSS variables**

```scss
// ===========================================
// COLOR UTILITIES
// ===========================================
// Utility classes for text color, background color, and border color.
// All colors reference CSS custom properties for automatic
// light/dark mode support.
//
// For hardcoded/static colors, use the $icon-colors map or
// define colors directly in your .module.scss file.
// ===========================================
@use '../abstracts' as *;

// Semantic text colors
.text-foreground { color: hsl(var(--foreground)); }
.text-primary { color: hsl(var(--primary)); }
.text-primary-foreground { color: hsl(var(--primary-foreground)); }
.text-secondary-foreground { color: hsl(var(--secondary-foreground)); }
.text-muted { color: hsl(var(--muted-foreground)); }
.text-accent { color: hsl(var(--accent-foreground)); }
.text-destructive { color: hsl(var(--destructive)); }
.text-card-foreground { color: hsl(var(--card-foreground)); }

// Semantic background colors
.bg-background { background-color: hsl(var(--background)); }
.bg-card { background-color: hsl(var(--card)); }
.bg-primary { background-color: hsl(var(--primary)); }
.bg-secondary { background-color: hsl(var(--secondary)); }
.bg-muted { background-color: hsl(var(--muted)); }
.bg-accent { background-color: hsl(var(--accent)); }
.bg-destructive { background-color: hsl(var(--destructive)); }
.bg-popover { background-color: hsl(var(--popover)); }
.bg-transparent { background-color: transparent; }

// Semantic border colors
.border-border { border-color: hsl(var(--border)); }
.border-input { border-color: hsl(var(--input)); }
.border-primary { border-color: hsl(var(--primary)); }
.border-destructive { border-color: hsl(var(--destructive)); }
.border-transparent { border-color: transparent; }

// Gradient utilities
.gradient-text {
  @include gradient-text;
}

.gradient-bg {
  @include gradient-bg;
}

// Opacity modifiers
.opacity-0 { opacity: 0; }
.opacity-5 { opacity: 0.05; }
.opacity-10 { opacity: 0.1; }
.opacity-20 { opacity: 0.2; }
.opacity-25 { opacity: 0.25; }
.opacity-30 { opacity: 0.3; }
.opacity-40 { opacity: 0.4; }
.opacity-50 { opacity: 0.5; }
.opacity-60 { opacity: 0.6; }
.opacity-70 { opacity: 0.7; }
.opacity-75 { opacity: 0.75; }
.opacity-80 { opacity: 0.8; }
.opacity-90 { opacity: 0.9; }
.opacity-100 { opacity: 1; }
```

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/styles/utilities/_colors.scss
git commit -m "feat(scss): populate color utilities with semantic CSS variable classes"
```

---

### Task 1.11: Populate Utilities — _sizing.scss

**Files:**
- Modify: `sites/arolariu.ro/src/styles/utilities/_sizing.scss`

**Step 1: Add sizing utility classes**

```scss
// ===========================================
// SIZING UTILITIES
// ===========================================
// Width, height, min/max dimension utilities.
// ===========================================
@use '../abstracts' as *;

// Width
.w-full { width: 100%; }
.w-screen { width: 100vw; }
.w-auto { width: auto; }
.w-fit { width: fit-content; }
.w-min { width: min-content; }
.w-max { width: max-content; }

// Fractional widths
.w-1\/2 { width: 50%; }
.w-1\/3 { width: 33.333%; }
.w-2\/3 { width: 66.667%; }
.w-1\/4 { width: 25%; }
.w-3\/4 { width: 75%; }
.w-1\/5 { width: 20%; }
.w-2\/5 { width: 40%; }
.w-3\/5 { width: 60%; }
.w-4\/5 { width: 80%; }

// Height
.h-full { height: 100%; }
.h-screen { height: 100vh; }
.h-dvh { height: 100dvh; }
.h-auto { height: auto; }
.h-fit { height: fit-content; }
.h-min { height: min-content; }

// Min/Max
.min-h-0 { min-height: 0; }
.min-h-full { min-height: 100%; }
.min-h-screen { min-height: 100vh; }
.min-h-dvh { min-height: 100dvh; }
.min-w-0 { min-width: 0; }
.min-w-full { min-width: 100%; }
.max-w-none { max-width: none; }
.max-w-full { max-width: 100%; }
.max-w-screen { max-width: 100vw; }

// Common max-width values
.max-w-xs { max-width: 20rem; }    // 320px
.max-w-sm { max-width: 24rem; }    // 384px
.max-w-md { max-width: 28rem; }    // 448px
.max-w-lg { max-width: 32rem; }    // 512px
.max-w-xl { max-width: 36rem; }    // 576px
.max-w-2xl { max-width: 42rem; }   // 672px
.max-w-3xl { max-width: 48rem; }   // 768px
.max-w-4xl { max-width: 56rem; }   // 896px
.max-w-5xl { max-width: 64rem; }   // 1024px
.max-w-6xl { max-width: 72rem; }   // 1152px
.max-w-7xl { max-width: 80rem; }   // 1280px

// Aspect Ratios
.aspect-auto { aspect-ratio: auto; }
.aspect-square { aspect-ratio: 1 / 1; }
.aspect-video { aspect-ratio: 16 / 9; }
.aspect-photo { aspect-ratio: 4 / 3; }

// Typography utilities
.text-left { text-align: left; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.text-justify { text-align: justify; }
.truncate { @include truncate; }
.whitespace-nowrap { white-space: nowrap; }
.whitespace-pre-wrap { white-space: pre-wrap; }
.break-words { overflow-wrap: break-word; }
.break-all { word-break: break-all; }

// Border radius
.rounded-none { border-radius: radius('none'); }
.rounded-sm { border-radius: radius('sm'); }
.rounded-md { border-radius: radius('md'); }
.rounded-lg { border-radius: radius('lg'); }
.rounded-xl { border-radius: radius('xl'); }
.rounded-2xl { border-radius: radius('2xl'); }
.rounded-3xl { border-radius: radius('3xl'); }
.rounded-full { border-radius: radius('full'); }

// Border width
.border { border-width: 1px; border-style: solid; }
.border-0 { border-width: 0; }
.border-2 { border-width: 2px; border-style: solid; }
.border-t { border-top-width: 1px; border-top-style: solid; }
.border-b { border-bottom-width: 1px; border-bottom-style: solid; }
.border-l { border-left-width: 1px; border-left-style: solid; }
.border-r { border-right-width: 1px; border-right-style: solid; }
```

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/styles/utilities/_sizing.scss
git commit -m "feat(scss): populate sizing utilities with width, height, border, text classes"
```

---

### Task 1.12: Enable Utilities in main.scss

**Files:**
- Modify: `sites/arolariu.ro/src/styles/main.scss`

**Step 1: Uncomment the utilities import**

Find:
```scss
// @use 'utilities';
```

Replace with:
```scss
@use 'utilities';
```

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`
Expected: Build succeeds — utilities compile without errors

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/styles/main.scss
git commit -m "feat(scss): enable utilities layer in main.scss entry point"
```

---

### Task 1.13: Add Comprehensive Documentation to Abstracts Files

**Files:**
- Modify: `sites/arolariu.ro/src/styles/abstracts/_variables.scss`
- Modify: `sites/arolariu.ro/src/styles/abstracts/_colors.scss`
- Modify: `sites/arolariu.ro/src/styles/abstracts/_typography.scss`
- Modify: `sites/arolariu.ro/src/styles/abstracts/_functions.scss`

**Step 1: Add a documentation block to the top of each file**

Add to `_variables.scss` at the very top:
```scss
// ===========================================
// DESIGN TOKENS — Variables
// ===========================================
// This file defines all design tokens as SCSS maps with helper functions.
// Each token set has a corresponding function for type-safe access
// with compile-time error messages for invalid keys.
//
// USAGE:
//   padding: space(4);           // → 1rem (16px)
//   z-index: z('modal');         // → 1050
//   border-radius: radius('xl'); // → 0.75rem (12px)
//
// EXTENDING:
//   To add a new spacing value, add a key-value pair to $spacing.
//   To add a new breakpoint, add to $breakpoints AND update
//   tailwind.config.ts if Tailwind is still in use.
//
// DEPENDENCIES: None (this is a leaf file)
// IMPORTED BY: _mixins.scss, _index.scss (forwarded to all consumers)
// ===========================================
```

Add similar blocks to `_colors.scss`, `_typography.scss`, `_functions.scss`.

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/
git commit -m "docs(scss): add comprehensive documentation headers to all abstracts files"
```

---

## Phase 2: End-User Theming System

**Goal:** Enable end-users to choose preset themes or define custom colors that persist across sessions.

### Task 2.1: Design Theme Preset Data Structure

**Files:**
- Create: `sites/arolariu.ro/src/styles/themes/_user-themes.scss`

**Step 1: Create the preset documentation and SCSS overrides file**

```scss
// ===========================================
// USER THEME PRESETS
// ===========================================
// This file documents and implements the full theme preset system.
// Each preset defines a complete set of CSS custom properties
// that override the defaults from globals.css.
//
// ARCHITECTURE:
//   1. Presets are defined in TypeScript (src/contexts/ThemePresetsContext.tsx)
//   2. The React context applies CSS variables to :root at runtime
//   3. This SCSS file provides preset-specific style overrides
//      using data-theme-preset="name" selectors
//   4. User preferences are persisted in Zustand store → IndexedDB
//
// AVAILABLE PRESETS:
//   - default: Cyan→Purple→Pink gradient, blue primary
//   - midnight: Deep blue/indigo, dark-first design
//   - ocean: Sky/cyan/teal palette, cool tones
//   - sunset: Orange/red/pink, warm tones
//   - forest: Green/emerald/teal, nature tones
//   - rose: Rose/pink/fuchsia, romantic tones
//   - monochrome: Grayscale, minimal design
//   - custom: User-defined colors
//
// HOW TO ADD A NEW PRESET:
//   1. Add preset object to THEME_PRESETS in ThemePresetsContext.tsx
//   2. Add data-attribute selector below (if SCSS overrides needed)
//   3. Update SettingsAppearance.module.scss with preview colors
//   4. Document in this file
// ===========================================

// Preset-specific SCSS overrides
// These selectors target the data-theme-preset attribute set by the React context

[data-theme-preset="midnight"] {
  // Midnight uses darker card backgrounds for more contrast
  // Overrides handled purely via CSS variables at runtime
}

[data-theme-preset="ocean"] {
  // Ocean-specific overrides if needed
}

[data-theme-preset="sunset"] {
  // Sunset-specific overrides if needed
}

[data-theme-preset="forest"] {
  // Forest-specific overrides if needed
}

[data-theme-preset="rose"] {
  // Rose-specific overrides if needed
}

[data-theme-preset="monochrome"] {
  // Monochrome removes all color, uses grayscale only
}
```

**Step 2: Update themes/_index.scss to include the new file**

Find in `sites/arolariu.ro/src/styles/themes/_index.scss`:
```scss
@forward 'presets';
```

Add after it:
```scss
@forward 'user-themes';
```

**Step 3: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/styles/themes/
git commit -m "feat(scss): add user theme preset SCSS infrastructure"
```

---

### Task 2.2: Create Theme Presets TypeScript Definition

**Files:**
- Create: `sites/arolariu.ro/src/lib/theme-presets.ts`

**Step 1: Create the presets data file**

```typescript
/**
 * @fileoverview Theme preset definitions for end-user customization.
 *
 * Each preset defines a complete set of CSS custom properties that
 * override the defaults from globals.css. Presets affect:
 * - Semantic colors (background, foreground, primary, etc.)
 * - Gradient colors (from, via, to)
 * - Accent and footer colors
 *
 * ARCHITECTURE:
 * - Presets are applied by setting CSS variables on :root at runtime
 * - The ThemePresetsContext reads the active preset from preferencesStore
 * - Light mode values are defined directly, dark mode in the .dark override
 * - User custom colors are stored separately in preferencesStore
 */

export interface ThemePreset {
  /** Display name for the UI */
  readonly name: string;
  /** Short description */
  readonly description: string;
  /** Preview colors for the settings UI (3 gradient stops) */
  readonly preview: readonly [string, string, string];
  /** CSS variable overrides for :root (light mode) */
  readonly light: Readonly<Record<string, string>>;
  /** CSS variable overrides for .dark (dark mode) */
  readonly dark: Readonly<Record<string, string>>;
}

export const THEME_PRESETS = {
  default: {
    name: "Default",
    description: "Cyan, purple, and pink — the signature look",
    preview: ["#06b6d4", "#8b5cf6", "#ec4899"],
    light: {
      "--primary": "221.2 83.2% 53.3%",
      "--primary-foreground": "210 40% 98%",
      "--gradient-from": "187 94% 43%",
      "--gradient-via": "262 83% 58%",
      "--gradient-to": "330 81% 60%",
      "--accent-primary": "187 94% 43%",
      "--footer-bg": "262 83% 35%",
    },
    dark: {
      "--primary": "214 100% 50%",
      "--primary-foreground": "0 0% 100%",
      "--gradient-from": "187 94% 43%",
      "--gradient-via": "262 83% 58%",
      "--gradient-to": "330 81% 60%",
      "--accent-primary": "187 94% 43%",
      "--footer-bg": "262 83% 35%",
    },
  },
  midnight: {
    name: "Midnight",
    description: "Deep indigo and blue — elegant and dark",
    preview: ["#3730a3", "#6366f1", "#818cf8"],
    light: {
      "--primary": "243 75% 59%",
      "--primary-foreground": "0 0% 100%",
      "--gradient-from": "245 58% 51%",
      "--gradient-via": "243 75% 59%",
      "--gradient-to": "241 77% 74%",
      "--accent-primary": "243 75% 59%",
      "--footer-bg": "245 58% 30%",
    },
    dark: {
      "--primary": "241 77% 74%",
      "--primary-foreground": "0 0% 100%",
      "--gradient-from": "245 58% 51%",
      "--gradient-via": "243 75% 59%",
      "--gradient-to": "241 77% 74%",
      "--accent-primary": "241 77% 74%",
      "--footer-bg": "245 58% 25%",
    },
  },
  ocean: {
    name: "Ocean",
    description: "Sky, cyan, and teal — cool and refreshing",
    preview: ["#0ea5e9", "#06b6d4", "#14b8a6"],
    light: {
      "--primary": "199 89% 48%",
      "--primary-foreground": "0 0% 100%",
      "--gradient-from": "199 89% 48%",
      "--gradient-via": "187 94% 43%",
      "--gradient-to": "173 80% 40%",
      "--accent-primary": "199 89% 48%",
      "--footer-bg": "187 94% 28%",
    },
    dark: {
      "--primary": "187 94% 43%",
      "--primary-foreground": "0 0% 100%",
      "--gradient-from": "199 89% 48%",
      "--gradient-via": "187 94% 43%",
      "--gradient-to": "173 80% 40%",
      "--accent-primary": "187 94% 43%",
      "--footer-bg": "187 94% 25%",
    },
  },
  sunset: {
    name: "Sunset",
    description: "Orange, red, and pink — warm and vibrant",
    preview: ["#f97316", "#ef4444", "#ec4899"],
    light: {
      "--primary": "24 95% 53%",
      "--primary-foreground": "0 0% 100%",
      "--gradient-from": "24 95% 53%",
      "--gradient-via": "0 84% 60%",
      "--gradient-to": "330 81% 60%",
      "--accent-primary": "24 95% 53%",
      "--footer-bg": "0 84% 35%",
    },
    dark: {
      "--primary": "0 84% 60%",
      "--primary-foreground": "0 0% 100%",
      "--gradient-from": "24 95% 53%",
      "--gradient-via": "0 84% 60%",
      "--gradient-to": "330 81% 60%",
      "--accent-primary": "24 95% 53%",
      "--footer-bg": "0 84% 30%",
    },
  },
  forest: {
    name: "Forest",
    description: "Green, emerald, and teal — natural and calm",
    preview: ["#22c55e", "#10b981", "#14b8a6"],
    light: {
      "--primary": "142 71% 45%",
      "--primary-foreground": "0 0% 100%",
      "--gradient-from": "142 71% 45%",
      "--gradient-via": "160 84% 39%",
      "--gradient-to": "173 80% 40%",
      "--accent-primary": "142 71% 45%",
      "--footer-bg": "160 84% 25%",
    },
    dark: {
      "--primary": "160 84% 39%",
      "--primary-foreground": "0 0% 100%",
      "--gradient-from": "142 71% 45%",
      "--gradient-via": "160 84% 39%",
      "--gradient-to": "173 80% 40%",
      "--accent-primary": "160 84% 39%",
      "--footer-bg": "160 84% 22%",
    },
  },
  rose: {
    name: "Rose",
    description: "Rose, pink, and fuchsia — soft and romantic",
    preview: ["#f43f5e", "#ec4899", "#d946ef"],
    light: {
      "--primary": "350 89% 60%",
      "--primary-foreground": "0 0% 100%",
      "--gradient-from": "350 89% 60%",
      "--gradient-via": "330 81% 60%",
      "--gradient-to": "292 91% 73%",
      "--accent-primary": "350 89% 60%",
      "--footer-bg": "330 81% 35%",
    },
    dark: {
      "--primary": "330 81% 60%",
      "--primary-foreground": "0 0% 100%",
      "--gradient-from": "350 89% 60%",
      "--gradient-via": "330 81% 60%",
      "--gradient-to": "292 91% 73%",
      "--accent-primary": "330 81% 60%",
      "--footer-bg": "330 81% 30%",
    },
  },
  monochrome: {
    name: "Monochrome",
    description: "Grayscale — clean and minimal",
    preview: ["#525252", "#737373", "#a3a3a3"],
    light: {
      "--primary": "0 0% 32%",
      "--primary-foreground": "0 0% 100%",
      "--gradient-from": "0 0% 32%",
      "--gradient-via": "0 0% 45%",
      "--gradient-to": "0 0% 64%",
      "--accent-primary": "0 0% 32%",
      "--footer-bg": "0 0% 20%",
    },
    dark: {
      "--primary": "0 0% 64%",
      "--primary-foreground": "0 0% 0%",
      "--gradient-from": "0 0% 32%",
      "--gradient-via": "0 0% 45%",
      "--gradient-to": "0 0% 64%",
      "--accent-primary": "0 0% 64%",
      "--footer-bg": "0 0% 15%",
    },
  },
} as const satisfies Record<string, ThemePreset>;

export type ThemePresetName = keyof typeof THEME_PRESETS;

/**
 * Custom user theme colors.
 * Users can define their own gradient colors and primary color.
 */
export interface CustomThemeColors {
  readonly gradientFrom: string; // HSL values e.g. "187 94% 43%"
  readonly gradientVia: string;
  readonly gradientTo: string;
  readonly primary: string;
  readonly primaryForeground: string;
  readonly footerBg: string;
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd sites/arolariu.ro && npx tsc --noEmit --pretty`
Expected: No type errors related to the new file

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/lib/theme-presets.ts
git commit -m "feat(theme): add comprehensive theme preset definitions with 7 presets"
```

---

### Task 2.3: Extend Preferences Store with Theme Preset Support

**Files:**
- Modify: `sites/arolariu.ro/src/stores/preferencesStore.ts`

**Step 1: Read the current store file to understand its structure**

Read: `sites/arolariu.ro/src/stores/preferencesStore.ts`

**Step 2: Add theme preset fields to the store**

Add to the store's state interface:
```typescript
import type {ThemePresetName, CustomThemeColors} from "@/lib/theme-presets";

// Add to the state interface:
themePreset: ThemePresetName | "custom";
customThemeColors: CustomThemeColors | null;

// Add actions:
setThemePreset: (preset: ThemePresetName | "custom") => void;
setCustomThemeColors: (colors: CustomThemeColors) => void;
```

Add the default values:
```typescript
themePreset: "default",
customThemeColors: null,
```

Add the actions:
```typescript
setThemePreset: (preset) => set({themePreset: preset}),
setCustomThemeColors: (colors) => set({customThemeColors: colors}),
```

**Step 3: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/stores/preferencesStore.ts
git commit -m "feat(store): add theme preset and custom colors to preferences store"
```

---

### Task 2.4: Create Theme Application Hook

**Files:**
- Create: `sites/arolariu.ro/src/hooks/useThemePreset.ts`

**Step 1: Create the hook**

```typescript
"use client";

import {useEffect} from "react";
import {useTheme} from "next-themes";
import {THEME_PRESETS} from "@/lib/theme-presets";
import type {ThemePresetName, CustomThemeColors} from "@/lib/theme-presets";
import {usePreferencesStore} from "@/stores/preferencesStore";

/**
 * Hook that applies theme preset CSS variables to the document root.
 * Reads the active preset from preferencesStore and applies the
 * corresponding CSS variable overrides.
 *
 * Should be used once in a top-level client component (e.g., providers.tsx).
 */
export function useThemePreset(): void {
  const {resolvedTheme} = useTheme();
  const themePreset = usePreferencesStore((s) => s.themePreset);
  const customThemeColors = usePreferencesStore((s) => s.customThemeColors);

  useEffect(() => {
    const root = document.documentElement;

    // Set data attribute for SCSS selectors
    root.setAttribute("data-theme-preset", themePreset);

    if (themePreset === "custom" && customThemeColors) {
      // Apply custom user colors
      root.style.setProperty("--gradient-from", customThemeColors.gradientFrom);
      root.style.setProperty("--gradient-via", customThemeColors.gradientVia);
      root.style.setProperty("--gradient-to", customThemeColors.gradientTo);
      root.style.setProperty("--primary", customThemeColors.primary);
      root.style.setProperty("--primary-foreground", customThemeColors.primaryForeground);
      root.style.setProperty("--accent-primary", customThemeColors.gradientFrom);
      root.style.setProperty("--footer-bg", customThemeColors.footerBg);
    } else if (themePreset !== "custom") {
      // Apply preset colors based on current light/dark mode
      const preset = THEME_PRESETS[themePreset as ThemePresetName];
      const colors = resolvedTheme === "dark" ? preset.dark : preset.light;

      for (const [property, value] of Object.entries(colors)) {
        root.style.setProperty(property, value);
      }
    }

    return () => {
      // Cleanup: remove inline styles on unmount
      root.removeAttribute("data-theme-preset");
    };
  }, [themePreset, customThemeColors, resolvedTheme]);
}
```

**Step 2: Verify TypeScript**

Run: `cd sites/arolariu.ro && npx tsc --noEmit --pretty`

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/hooks/useThemePreset.ts
git commit -m "feat(theme): add useThemePreset hook for runtime CSS variable application"
```

---

### Task 2.5: Wire Theme Preset Hook into Providers

**Files:**
- Modify: `sites/arolariu.ro/src/app/providers.tsx` (or wherever providers are composed)

**Step 1: Read the providers file**

Read: `sites/arolariu.ro/src/app/providers.tsx`

**Step 2: Add the hook call**

Import and call `useThemePreset()` inside the client provider component.

**Step 3: Verify dev server works**

Run: `npm run dev:website`
Expected: Site loads, default theme applied

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/app/providers.tsx
git commit -m "feat(theme): wire useThemePreset into application providers"
```

---

## Phase 3: Module SCSS Refactoring

**Goal:** Refactor all 73 existing SCSS module files to maximize usage of shared abstracts (reduce hardcoded values and duplicate patterns).

### Task 3.1: Create Hardcoded Value Mapping Reference

**Files:**
- Create: `sites/arolariu.ro/src/styles/_MIGRATION-REFERENCE.md` (temporary reference file)

**Step 1: Document the mapping for developers**

Create a reference of all hardcoded values and their SCSS replacements:

```markdown
# SCSS Migration Quick Reference (Delete After Migration)

## Hardcoded Colors → CSS Variables
| Hardcoded | Replacement |
|-----------|-------------|
| `#3b82f6` (blue-500) | `hsl(var(--primary))` or keep for icon variants |
| `#a855f7` (purple-500) | `hsl(var(--gradient-via))` |
| `#ec4899` (pink-500) | `hsl(var(--gradient-to))` |
| `#22c55e` (green-500) | Use `$icon-colors` map or keep |
| `#f59e0b` (amber-500) | Use `$icon-colors` map or keep |
| `#ef4444` (red-500) | `hsl(var(--destructive))` |
| `#f97316` (orange-500) | Use `$icon-colors` map or keep |
| `#6366f1` (indigo-500) | Use `$icon-colors` map |
| `#14b8a6` (teal-500) | Use `$icon-colors` map |
| `#06b6d4` (cyan-500) | `hsl(var(--gradient-from))` |
| `rgb(107, 114, 128)` (gray-500) | `hsl(var(--muted-foreground))` |
| `rgb(31, 41, 55)` (gray-800) | `hsl(var(--foreground))` |
| `rgb(229, 231, 235)` (gray-200) | `hsl(var(--border))` |
| `rgb(55, 65, 81)` (gray-700) | Use `@include dark` block |
| `color: white` | `color: hsl(var(--foreground))` or `static-color('white')` |
| `background: white` | `background: hsl(var(--background))` |

## Duplicate Patterns → Shared Mixins
| Pattern | Replacement |
|---------|-------------|
| Gradient text (3 colors) | `@include gradient-text` or `@include gradient-text-custom(...)` |
| Card hover with shadow | `@include card-hover` |
| Accent top bar | `@include accent-top-bar` |
| Icon color variants | `@include icon-color-variants` |
| Responsive 1→2→3 grid | `@include responsive-grid` |
| Section with padding | `@include section-layout` |
| Orb/blob background | `@include orb($size, $blur, $color)` |

## Hardcoded Spacing → space() Function
| Hardcoded | Replacement |
|-----------|-------------|
| `0.375rem` | `space(1.5)` |
| `0.5rem` | `space(2)` |
| `0.75rem` | `space(3)` |
| `1rem` | `space(4)` |
| `1.5rem` | `space(6)` |
| `2rem` | `space(8)` |
| `3rem` | `space(12)` |
| `4rem` | `space(16)` |

## Hardcoded Font Sizes → font-size() Function
| Hardcoded | Replacement |
|-----------|-------------|
| `0.75rem` | `font-size('xs')` |
| `0.875rem` | `font-size('sm')` |
| `1rem` | `font-size('base')` |
| `1.125rem` | `font-size('lg')` |
| `1.25rem` | `font-size('xl')` |
| `1.5rem` | `font-size('2xl')` |
```

**Step 2: Commit**

```bash
git add sites/arolariu.ro/src/styles/_MIGRATION-REFERENCE.md
git commit -m "docs(scss): add migration quick reference for hardcoded value replacements"
```

---

### Task 3.2: Refactor Home Page Modules

**Files:**
- Modify: `sites/arolariu.ro/src/app/_components/Hero.module.scss`
- Modify: `sites/arolariu.ro/src/app/_components/Features.module.scss`
- Modify: `sites/arolariu.ro/src/app/_components/Technologies.module.scss`
- Modify: `sites/arolariu.ro/src/app/_effects/TechSphere.module.scss`

**Step 1: For each file, apply the migration reference**

For each module file:
1. Replace hardcoded hex colors with CSS variable references where semantically appropriate
2. Replace duplicate gradient-text pattern with `@include gradient-text` or `@include gradient-text-custom`
3. Replace duplicate orb pattern with `@include orb()`
4. Replace hardcoded spacing with `space()` calls
5. Replace hardcoded font sizes with `font-size()` calls
6. Replace `:global(.dark) &` with `@include dark` where present

**Important:** Do NOT replace decorative colors that are intentionally different from theme colors (e.g., specific gradient stops for visual design). Only replace colors that should respond to theme changes.

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Verify visually**

Run: `npm run dev:website`
Check homepage Hero, Features, Technologies sections in both light and dark mode.

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/app/_components/ sites/arolariu.ro/src/app/_effects/
git commit -m "refactor(scss): standardize home page modules to use shared abstracts"
```

---

### Task 3.3–3.9: Refactor Remaining Module Files

Apply the same refactoring pattern from Task 3.2 to each group:

**Task 3.3:** About section — `sites/arolariu.ro/src/app/about/_components/*.module.scss` + `page.module.scss` + `loading.module.scss`

**Task 3.4:** About/the-author — `sites/arolariu.ro/src/app/about/the-author/_components/*.module.scss` + `page.module.scss` + `loading.module.scss`

**Task 3.5:** About/the-platform — `sites/arolariu.ro/src/app/about/the-platform/_components/*.module.scss` + `page.module.scss` + `loading.module.scss`

**Task 3.6:** Auth — `sites/arolariu.ro/src/app/auth/_components/*.module.scss` + `page.module.scss` + `island.module.scss` + `loading.module.scss` + sign-in/sign-up modules

**Task 3.7:** Privacy-and-terms — `sites/arolariu.ro/src/app/(privacy-and-terms)/**/*.module.scss`

**Task 3.8:** My-profile — `sites/arolariu.ro/src/app/my-profile/_components/*.module.scss` + `island.module.scss` + `loading.module.scss`

**Task 3.9:** Root-level — `sites/arolariu.ro/src/app/loading.module.scss`, `global-error.module.scss`, `global-not-found.module.scss`, `EULA.module.scss`, `domains/island.module.scss`, `domains/loading.module.scss`

For each task:
1. Read every .module.scss file in the group
2. Replace hardcoded values per the migration reference
3. Use shared mixins to eliminate duplicate patterns
4. Verify build compiles
5. Visual spot-check in browser
6. Commit with descriptive message

---

## Phase 4: Tailwind Migration — domains/invoices

**Goal:** Convert the 103 TSX files in domains/invoices from Tailwind utility classes to SCSS modules.

**Strategy:** Create domain-specific shared SCSS first, then migrate route-by-route from simplest to most complex.

### Task 4.1: Create Invoice Domain Shared SCSS

**Files:**
- Create: `sites/arolariu.ro/src/app/domains/invoices/_styles/_invoice-shared.scss`

**Step 1: Create shared mixins for invoice-specific patterns**

```scss
// ===========================================
// INVOICE DOMAIN — Shared Styles
// ===========================================
// Mixins and variables specific to the invoice management domain.
// Imported by invoice component .module.scss files.
// ===========================================
@use '../../../../styles/abstracts' as *;

// ===========================================
// STATUS COLORS
// ===========================================
// Invoice and scan status badges
$invoice-status-colors: (
  'pending': #f59e0b,      // amber-500
  'processing': #3b82f6,   // blue-500
  'completed': #22c55e,    // green-500
  'failed': #ef4444,       // red-500
  'cancelled': #6b7280,    // gray-500
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

// ===========================================
// TREND INDICATORS
// ===========================================
@mixin trend-color($value) {
  @if $value > 0 {
    color: #f59e0b; // amber — increase
  } @else if $value < 0 {
    color: #22c55e; // green — decrease (good for expenses)
  } @else {
    color: hsl(var(--muted-foreground)); // neutral
  }
}

// ===========================================
// INVOICE CARD LAYOUT
// ===========================================
@mixin invoice-card {
  background-color: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: radius('xl');
  @include card-hover;
  overflow: hidden;
}

// ===========================================
// FORM CONTROLS (for invoice editing)
// ===========================================
@mixin invoice-input {
  padding: space(2) space(3);
  border: 1px solid hsl(var(--input));
  border-radius: radius('md');
  background: hsl(var(--background));
  font-size: font-size('sm');
  @include transition(border-color, box-shadow);

  &:focus {
    border-color: hsl(var(--ring));
    box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
    outline: none;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// ===========================================
// RESPONSIVE TABLE
// ===========================================
@mixin invoice-table {
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: space(3) space(4);
    text-align: left;
    border-bottom: 1px solid hsl(var(--border));
  }

  th {
    font-weight: font-weight('medium');
    font-size: font-size('sm');
    color: hsl(var(--muted-foreground));
    background-color: hsl(var(--muted));
  }

  td {
    font-size: font-size('sm');
  }

  tr {
    @include transition(background-color);

    &:hover {
      background-color: hsl(var(--muted) / 0.5);
    }
  }
}
```

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/app/domains/invoices/_styles/
git commit -m "feat(scss): create invoice domain shared styles with status badges and form controls"
```

---

### Task 4.2: Migrate Upload Scans Route

**Files:**
- Create: SCSS modules for each component in `src/app/domains/invoices/upload-scans/`
- Modify: TSX files to use SCSS modules instead of Tailwind classes

**For each TSX file in the route:**
1. Read the file, extract all className strings
2. Create a `.module.scss` file alongside it
3. Convert Tailwind utilities to SCSS using the migration reference
4. Replace className strings with `styles["className"]` references
5. Keep @arolariu/components className props unchanged (they use Tailwind internally)

**Important patterns for this route:**
- Drag-and-drop zone with state-based styling → use CSS module classes with conditional logic
- Dynamic classes via template literals → convert to `styles["base"] + (condition ? styles["active"] : "")`
- Gradient backgrounds → use `@include gradient-bg` or explicit gradients in SCSS

**Step: Verify build and visual check**

**Step: Commit**

```bash
git commit -m "refactor(scss): migrate upload-scans route from Tailwind to SCSS modules"
```

---

### Task 4.3–4.8: Migrate Remaining Invoice Sub-Routes

Apply the same migration pattern for each sub-route:

**Task 4.3:** `view-scans/` — Scan cards, grid views, selection states
**Task 4.4:** `view-invoices/` — Invoice list, filters, search
**Task 4.5:** `view-invoice/[id]/` — Invoice detail, analytics cards, insights
**Task 4.6:** `edit-invoice/[id]/` — Form editing, item list, calculations (MOST COMPLEX)
**Task 4.7:** Shared components in `_components/` — LoadingInvoices, common dialogs
**Task 4.8:** Shared contexts and utilities — Ensure no Tailwind references remain

For each task:
1. Create `.module.scss` files for each component
2. Import shared invoice styles: `@use '../_styles/invoice-shared' as invoice;`
3. Convert all Tailwind classes to SCSS
4. Handle dynamic/conditional classes with template literals + CSS module classes
5. Build verify
6. Commit

---

### Task 4.9: Migrate Domains Hub Page

**Files:**
- Modify: `sites/arolariu.ro/src/app/domains/island.tsx`
- Modify: `sites/arolariu.ro/src/app/domains/loading.tsx`
- Already have: `island.module.scss`, `loading.module.scss`

**Step 1: Verify these files are fully migrated (no remaining Tailwind classes)**

Search for any remaining Tailwind utility classes in the TSX files.

**Step 2: If any remain, convert them**

**Step 3: Commit if changes made**

---

## Phase 5: Tailwind Removal

**Goal:** Remove TailwindCSS from the main site while keeping it for @arolariu/components.

**Prerequisites:** ALL TSX files in sites/arolariu.ro/src/ must be free of Tailwind utility classes (except those passed to @arolariu/components).

### Task 5.1: Audit for Remaining Tailwind Classes

**Files:**
- None (audit only)

**Step 1: Search for Tailwind patterns**

Run a comprehensive search for common Tailwind patterns in TSX files:
```bash
cd sites/arolariu.ro
grep -r "className=" src/app/ --include="*.tsx" | grep -E "\b(flex|grid|p-[0-9]|m-[0-9]|text-[a-z]|bg-[a-z]|w-[0-9]|h-[0-9]|rounded|shadow|border-[a-z]|gap-|space-[xy]|items-|justify-|font-[a-z])\b" | grep -v "node_modules" | grep -v ".module.scss"
```

Expected: Only matches in @arolariu/components usage or false positives

**Step 2: Fix any remaining Tailwind usage found**

**Step 3: Commit if changes made**

---

### Task 5.2: Convert globals.css to globals.scss

**Files:**
- Rename: `sites/arolariu.ro/src/app/globals.css` → `sites/arolariu.ro/src/app/globals.scss`
- Modify: `sites/arolariu.ro/src/app/layout.tsx`

**Step 1: Create globals.scss without Tailwind directives**

Remove:
```css
@import 'tailwindcss';
@config '../../tailwind.config.ts';
@plugin "daisyui";
```

Remove:
```css
@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground; }
}
```

Replace the `@apply` rules with plain CSS:
```scss
* {
  border-color: hsl(var(--border));
}
body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}
```

Keep ALL CSS variable definitions (`:root` and `.dark` blocks).
Keep ALL custom utility classes (`.bg-grid-pattern`, `.text-glow`, `.blue-underline`, etc.).
Keep the `@keyframes` definitions and `@media (prefers-reduced-motion)`.

**Step 2: Update layout.tsx import**

Change:
```typescript
import "./globals.css";
```
To:
```typescript
import "./globals.scss";
```

**Step 3: Verify build**

Run: `cd sites/arolariu.ro && npx next build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/app/globals.scss sites/arolariu.ro/src/app/layout.tsx
git rm sites/arolariu.ro/src/app/globals.css
git commit -m "refactor(scss): convert globals.css to globals.scss, remove Tailwind directives"
```

---

### Task 5.3: Update PostCSS Configuration

**Files:**
- Modify: `sites/arolariu.ro/postcss.config.js`

**Step 1: Remove Tailwind PostCSS plugin**

Change from:
```javascript
const postcssConfig = {
  plugins: {
    "@tailwindcss/postcss": {},
    cssnano: {},
  },
};
```

To:
```javascript
const postcssConfig = {
  plugins: {
    cssnano: {},
  },
};
```

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Commit**

```bash
git add sites/arolariu.ro/postcss.config.js
git commit -m "chore: remove Tailwind PostCSS plugin"
```

---

### Task 5.4: Remove Tailwind Dependencies from Main Site

**Files:**
- Modify: `sites/arolariu.ro/package.json`

**Step 1: Remove Tailwind-specific devDependencies**

Remove from devDependencies:
- `@tailwindcss/postcss`
- `@tailwindcss/typography`
- `tailwindcss`
- `tailwindcss-animate`
- `daisyui`

Keep:
- `sass` (still needed)
- `cssnano` (still needed)
- `postcss` (still needed)

**Step 2: Remove tailwind.config.ts**

```bash
git rm sites/arolariu.ro/tailwind.config.ts
```

**Step 3: Run npm install to update lock file**

Run: `cd sites/arolariu.ro && npm install`

**Step 4: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 5: Commit**

```bash
git add sites/arolariu.ro/package.json package-lock.json
git commit -m "chore: remove TailwindCSS dependencies from main site

The component library (@arolariu/components) retains its own
Tailwind dependency. The main site now uses SCSS exclusively."
```

---

### Task 5.5: Update layout.tsx Body Class

**Files:**
- Modify: `sites/arolariu.ro/src/app/layout.tsx`

**Step 1: Replace Tailwind body classes**

Find:
```tsx
<body className='bg-white text-black dark:bg-black dark:text-white'>
```

Replace with (since globals.scss now handles body styling):
```tsx
<body>
```

Or if you need class-based styling for the body:
```tsx
<body className='app-body'>
```

And add to globals.scss:
```scss
.app-body {
  min-height: 100dvh;
}
```

**Step 2: Verify**

Run: `npm run dev:website`
Check light mode and dark mode both work correctly.

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/app/layout.tsx
git commit -m "refactor: remove Tailwind utility classes from body element"
```

---

### Task 5.6: Remove cn() Utility Dependency Check

**Files:**
- Audit: `sites/arolariu.ro/src/` for `cn(` usage

**Step 1: Search for cn() usage**

Check if any site code (not component library) still uses `cn()` from @arolariu/components:

```bash
grep -r "cn(" sites/arolariu.ro/src/app/ --include="*.tsx" --include="*.ts"
```

**Step 2: If found, replace with template literals or CSS module class composition**

```typescript
// Before:
className={cn(styles["card"], isActive && styles["active"])}

// After:
className={`${styles["card"]} ${isActive ? styles["active"] : ""}`}
```

**Step 3: Commit if changes made**

---

### Task 5.7: Final Verification

**Files:**
- None (verification only)

**Step 1: Full build**

Run: `cd sites/arolariu.ro && npx next build`
Expected: Build succeeds without any Tailwind-related warnings

**Step 2: Run linting**

Run: `cd sites/arolariu.ro && npm run lint`
Expected: No new errors

**Step 3: Run tests**

Run: `npm run test:website`
Expected: All tests pass

**Step 4: Visual verification checklist**

Run: `npm run dev:website`

- [ ] Homepage: Hero, Features, Technologies render correctly
- [ ] Homepage: Dark mode toggle works
- [ ] Homepage: Gradient theme is applied
- [ ] About pages: All sections render correctly
- [ ] Auth pages: Sign-in, Sign-up forms work
- [ ] Invoice pages: All views render correctly
- [ ] My Profile: Settings work
- [ ] Responsive: Check 320px, 768px, 1024px, 1440px viewports
- [ ] @arolariu/components: Buttons, Cards, Inputs still styled correctly

**Step 5: Commit**

```bash
git commit --allow-empty -m "chore: TailwindCSS removal complete — SCSS-only styling for main site"
```

---

## Phase 6: Performance & Polish

**Goal:** Optimize CSS output, verify performance, and ensure production readiness.

### Task 6.1: CSS Bundle Size Analysis

**Step 1: Build and check bundle**

Run: `cd sites/arolariu.ro && npx next build`

Check the .next/static/css/ directory for total CSS size:
```bash
ls -la sites/arolariu.ro/.next/static/css/
```

Document the total CSS bundle size. Compare with previous Tailwind build if available.

**Step 2: Check for duplicate rules**

Look for patterns in the built CSS that suggest duplication:
- Same property/value pairs appearing multiple times
- Large generated utility classes that aren't used

**Step 3: Remove any unused utility classes**

If the utilities/ files generate classes that are never referenced, consider:
- Reducing the `$utility-spacings` list
- Removing unused utility categories entirely

---

### Task 6.2: Performance Optimizations

**Step 1: Audit will-change usage**

Search for `will-change` in SCSS files. Ensure it's only used on elements that actually animate:
```bash
grep -r "will-change" sites/arolariu.ro/src/styles/ sites/arolariu.ro/src/app/ --include="*.scss"
```

**Step 2: Verify GPU-accelerated animations**

Ensure animations use `transform` and `opacity` (GPU-accelerated) rather than layout-triggering properties like `width`, `height`, `top`, `left`.

**Step 3: Verify reduced-motion support**

Ensure `@media (prefers-reduced-motion: reduce)` is applied globally (it's in _transitions.scss already) and that component animations respect it.

---

### Task 6.3: Clean Up Temporary Files

**Step 1: Remove migration reference**

```bash
git rm sites/arolariu.ro/src/styles/_MIGRATION-REFERENCE.md
git commit -m "chore: remove temporary migration reference file"
```

---

## Success Criteria

- [ ] **Zero Tailwind classes** in sites/arolariu.ro/src/app/ TSX files (except @arolariu/components props)
- [ ] **Tailwind removed** from devDependencies (main site only)
- [ ] **All 73+ module files** use shared abstracts for spacing, typography, shadows, colors
- [ ] **No duplicate patterns** — gradient-text, card-hover, orbs, grids all use shared mixins
- [ ] **Utilities populated** — spacing, layout, display, colors, sizing all have utility classes
- [ ] **7 theme presets** available for end-user selection
- [ ] **Custom theme colors** supported with persistence
- [ ] **Every abstracts file** has comprehensive documentation headers
- [ ] **Build succeeds** without warnings
- [ ] **All tests pass**
- [ ] **Visual parity** — no regressions from Tailwind era
- [ ] **Dark mode works** on every page
- [ ] **Responsive design preserved** across all 8 breakpoints

---

## Estimated Scope

| Phase | Tasks | Estimated Effort |
|-------|-------|-----------------|
| Phase 1: Styles/ Overhaul | 13 tasks | Medium (1-2 days) |
| Phase 2: End-User Theming | 5 tasks | Medium (1 day) |
| Phase 3: Module Refactoring | 9 tasks | Medium-High (2-3 days) |
| Phase 4: Invoice Migration | 9 tasks | Very High (3-5 days) |
| Phase 5: Tailwind Removal | 7 tasks | Medium (1 day) |
| Phase 6: Performance & Polish | 3 tasks | Low (half day) |
| **Total** | **46 tasks** | **8-12 days** |
