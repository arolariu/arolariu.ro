# SCSS System Architecture RFC Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Document the SCSS system architecture in RFC 1008 and consolidate existing implementations for consistency.

**Architecture:** Create comprehensive RFC documentation following existing project RFC format (see RFC 1006 as template). The RFC will cover the 7-1 pattern architecture, naming conventions, API reference for mixins/functions, theming patterns, and migration guidelines.

**Tech Stack:** SCSS (Dart Sass), CSS Modules, Next.js, CSS Variables, 7-1 Pattern Architecture

---

## Current State Analysis

Based on thorough codebase exploration, the SCSS system has:

### Migrated Routes (43 SCSS Module Files)
- Home page: Hero, Features, Technologies
- Auth pages: Auth.module.scss (comprehensive)
- About section: 17 components across main/the-author/the-platform
- Privacy & Terms: 7 components
- Acknowledgements: 6 components

### Not Yet Migrated
- `/domains/invoices` - 78 components (Tailwind only) - **OUT OF SCOPE FOR THIS PLAN**
- `/my-profile` - 11 components (Tailwind only) - **OUT OF SCOPE FOR THIS PLAN**

### Global SCSS Infrastructure
```
src/styles/
├── abstracts/           # Variables, mixins, functions
├── base/               # Reset, element defaults
├── themes/             # Theme variable documentation
├── animations/         # Keyframes, transitions
├── components/         # Shared component styles (header, nav, footer)
├── utilities/          # Optional utility classes
├── pages/              # Page-specific globals
└── main.scss           # 7-1 entry point
```

### Identified Patterns
1. **Naming**: camelCase semantic (not BEM)
2. **Imports**: `@use '../../styles/abstracts' as *;`
3. **Responsive**: Mobile-first with `@include respond-to('breakpoint')`
4. **Theming**: CSS variables + `:global(.dark) &` pattern
5. **Spacing**: `space(4)`, `space(8)` using Tailwind-aligned scale

### Inconsistencies Found
1. Dark mode handled two ways: `:global(.dark) &` and `@include dark`
2. Some hardcoded RGB colors instead of CSS variables
3. No standardized file header comments
4. No RFC documentation for the system

---

## Phase 1: RFC 1008 Creation

### Task 1: Create RFC 1008 Skeleton File

**Files:**
- Create: `docs/rfc/1008-scss-system-architecture.md`

**Step 1: Create the RFC file with header**

```markdown
# RFC 1008: SCSS System Architecture

- **Status**: Implemented
- **Date**: 2026-02-05
- **Authors**: Alexandru-Razvan Olariu
- **Related Components**: `sites/arolariu.ro/src/styles/`, SCSS Modules across `src/app/`

---

## Abstract

[To be filled in Task 2]

---

## 1. Motivation

[To be filled in Task 2]

---

## 2. Technical Design

[To be filled in Task 3]

---

## 3. Variables API

[To be filled in Task 4]

---

## 4. Mixins API

[To be filled in Task 5]

---

## 5. Naming Conventions

[To be filled in Task 6]

---

## 6. Responsive Design

[To be filled in Task 7]

---

## 7. Theming Patterns

[To be filled in Task 8]

---

## 8. Component Styling Patterns

[To be filled in Task 9]

---

## 9. Migration Guidelines

[To be filled in Task 10]

---

## 10. Trade-offs and Alternatives

[To be filled in Task 11]

---

## 11. File Locations

[To be filled in Task 11]
```

**Step 2: Verify file created**

Run: `ls -la docs/rfc/1008-scss-system-architecture.md`
Expected: File exists with correct permissions

---

### Task 2: Write Abstract and Motivation Sections

**Files:**
- Modify: `docs/rfc/1008-scss-system-architecture.md`

**Step 1: Replace Abstract section**

```markdown
## Abstract

This RFC documents the SCSS Module system architecture for the arolariu.ro frontend. Built on the 7-1 pattern with CSS Modules for scoping, the system provides a scalable, maintainable approach to styling React components. The architecture enables gradual migration from Tailwind CSS while maintaining design consistency through shared variables, mixins, and functions.

Key features:
- **7-1 Pattern Architecture**: Organized SCSS partials for variables, mixins, base styles, themes, animations, and components
- **CSS Modules**: Scoped styles preventing class name collisions
- **Design Token Integration**: SCSS functions that reference CSS variables for theming
- **Mobile-First Responsive**: Comprehensive mixin library for responsive design
- **Tailwind Alignment**: Spacing scale and breakpoints match Tailwind for seamless migration
```

**Step 2: Replace Motivation section**

```markdown
## 1. Motivation

### 1.1 Problem Statement

The arolariu.ro frontend requires a styling solution that:

1. **Scalable Organization**: Clear file structure for growing codebase
2. **Scope Isolation**: Prevent class name collisions without runtime overhead
3. **Design Consistency**: Shared design tokens across all components
4. **Gradual Migration**: Coexist with existing Tailwind CSS
5. **Full CSS Power**: Variables, mixins, nesting, functions
6. **Theme Support**: Light/dark mode with runtime switching
7. **Type Safety**: Predictable class name access in TypeScript

### 1.2 Design Goals

- **SCSS Modules**: Combine SCSS power with automatic scoping
- **7-1 Pattern**: Industry-standard file organization
- **Tailwind Alignment**: Match existing spacing/breakpoint scales
- **CSS Variable Integration**: Runtime theming via CSS custom properties
- **Mobile-First**: Consistent responsive design approach
- **DRY Code**: Comprehensive mixin/function library
- **Documentation**: Self-documenting with error messages
```

**Step 3: Save and verify**

Run: `head -80 docs/rfc/1008-scss-system-architecture.md`
Expected: Shows header, abstract, and motivation sections

---

### Task 3: Write Architecture Overview Section

**Files:**
- Modify: `docs/rfc/1008-scss-system-architecture.md`

**Step 1: Replace Technical Design section**

```markdown
## 2. Technical Design

### 2.1 Architecture Overview (7-1 Pattern)

```text
sites/arolariu.ro/src/styles/
├── abstracts/                    # No CSS output - configuration only
│   ├── _index.scss              # Barrel export (@forward)
│   ├── _variables.scss          # Spacing, breakpoints, z-index, radius
│   ├── _colors.scss             # CSS variable references, color functions
│   ├── _typography.scss         # Font families, sizes, weights, line-heights
│   ├── _mixins.scss             # Responsive, flexbox, grid, effects
│   └── _functions.scss          # Unit converters, map utilities
├── base/                         # Reset and element defaults
│   ├── _index.scss
│   ├── _reset.scss
│   └── _elements.scss
├── themes/                       # Theme documentation and presets
│   ├── _index.scss
│   ├── _variables.scss          # CSS variable documentation
│   └── _presets.scss            # Preset-specific overrides
├── animations/                   # Keyframes and transitions
│   ├── _index.scss
│   ├── _keyframes.scss          # All @keyframes definitions
│   └── _transitions.scss        # Transition utilities
├── components/                   # Shared global component styles
│   ├── _index.scss
│   ├── _header.scss
│   ├── _navigation.scss
│   ├── _footer.scss
│   ├── _buttons.scss
│   └── _cards.scss
├── utilities/                    # Optional utility classes
│   ├── _index.scss
│   └── ...
├── pages/                        # Page-specific globals (if needed)
│   └── _index.scss
└── main.scss                     # Entry point - imports all partials
```

### 2.2 Import Order (main.scss)

```scss
// 1. Abstracts - Variables, mixins, functions (no CSS output)
@use 'abstracts' as *;

// 2. Base - Reset, element defaults
@use 'base';

// 3. Themes - Theme variable documentation
@use 'themes';

// 4. Animations - Keyframes, transitions
@use 'animations';

// 5. Components - Shared component styles
@use 'components';

// 6. Utilities (optional) - Utility classes for migration
// @use 'utilities';

// 7. Pages (optional) - Page-specific globals
// @use 'pages';
```

### 2.3 CSS Module Files

Component-scoped styles live alongside their React components:

```text
src/app/
├── _components/
│   ├── Hero.tsx
│   └── Hero.module.scss         # Scoped to Hero component
├── auth/
│   ├── island.tsx
│   └── Auth.module.scss         # Shared across auth pages
└── about/
    ├── page.module.scss         # Page-level styles
    └── _components/
        ├── Hero.tsx
        └── Hero.module.scss     # Component-scoped styles
```

### 2.4 Build Integration

SCSS is processed automatically by Next.js:

1. `main.scss` imported in `layout.tsx` AFTER globals.css
2. CSS Modules compiled with unique class names
3. Dart Sass used for SCSS compilation
4. CSS variables from globals.css available at runtime
```

**Step 2: Save and verify**

Run: `grep -A 5 "## 2. Technical Design" docs/rfc/1008-scss-system-architecture.md`
Expected: Shows the section header and beginning of content

---

### Task 4: Write Variables API Section

**Files:**
- Modify: `docs/rfc/1008-scss-system-architecture.md`

**Step 1: Replace Variables API section**

```markdown
## 3. Variables API

All variables are defined in `src/styles/abstracts/_variables.scss` with helper functions for type-safe access.

### 3.1 Spacing Scale

Matches Tailwind's spacing scale for seamless migration:

```scss
// Usage: space(4) returns 1rem (16px)
$spacing: (
  0: 0,
  0.5: 0.125rem,   // 2px
  1: 0.25rem,      // 4px
  2: 0.5rem,       // 8px
  3: 0.75rem,      // 12px
  4: 1rem,         // 16px (base)
  5: 1.25rem,      // 20px
  6: 1.5rem,       // 24px
  8: 2rem,         // 32px
  10: 2.5rem,      // 40px
  12: 3rem,        // 48px
  16: 4rem,        // 64px
  20: 5rem,        // 80px
  24: 6rem,        // 96px
  // ... up to 96
);

// Helper function with error handling
@function space($key) {
  @if map.has-key($spacing, $key) {
    @return map.get($spacing, $key);
  }
  @error "Unknown spacing key: #{$key}. Available: #{map.keys($spacing)}";
}
```

### 3.2 Breakpoints

Custom breakpoints matching Tailwind config:

```scss
// Usage: breakpoint('md') returns 768px
$breakpoints: (
  '2xsm': 320px,   // Mobile-first (custom)
  'xsm': 480px,    // Small phones (custom)
  'sm': 640px,     // Standard mobile
  'md': 768px,     // Tablets
  'lg': 1024px,    // Small desktop
  'xl': 1280px,    // Desktop
  '2xl': 1440px,   // Large desktop (custom)
  '3xl': 1976px,   // Ultra-wide (custom)
);

@function breakpoint($key) {
  @if map.has-key($breakpoints, $key) {
    @return map.get($breakpoints, $key);
  }
  @error "Unknown breakpoint: #{$key}. Available: #{map.keys($breakpoints)}";
}
```

### 3.3 Z-Index Layers

Organized layering system:

```scss
// Usage: z('modal') returns 1050
$z-index: (
  'base': 0,
  'dropdown': 1000,
  'sticky': 1020,
  'fixed': 1030,
  'modal-backdrop': 1040,
  'modal': 1050,
  'popover': 1060,
  'tooltip': 1070,
  'toast': 1080,
);

@function z($key) {
  @if map.has-key($z-index, $key) {
    @return map.get($z-index, $key);
  }
  @error "Unknown z-index key: #{$key}. Available: #{map.keys($z-index)}";
}
```

### 3.4 Border Radius

```scss
// Usage: radius('xl') returns 0.75rem
$border-radius: (
  'none': 0,
  'sm': 0.125rem,     // 2px
  'md': 0.375rem,     // 6px
  'lg': 0.5rem,       // 8px
  'xl': 0.75rem,      // 12px
  '2xl': 1rem,        // 16px
  '3xl': 1.5rem,      // 24px
  'full': 9999px,
);
```

### 3.5 Typography (from _typography.scss)

```scss
// Font sizes - Usage: font-size('xl') returns 1.25rem
@function font-size($key)

// Font weights - Usage: font-weight('bold') returns 700
@function font-weight($key)

// Line heights - Usage: line-height('relaxed') returns 1.625
@function line-height($key)

// Letter spacing - Usage: letter-spacing('tight') returns -0.025em
@function letter-spacing($key)
```

### 3.6 Colors (from _colors.scss)

```scss
// CSS variable reference - Usage: color('primary')
@function color($name) {
  @return hsl(var(--#{$name}));
}

// With alpha - Usage: color-alpha('primary', 0.5)
@function color-alpha($name, $alpha) {
  @return hsl(var(--#{$name}) / #{$alpha});
}
```
```

**Step 2: Save and verify**

Run: `grep -c "space\|breakpoint\|z-index\|radius" docs/rfc/1008-scss-system-architecture.md`
Expected: Multiple matches showing variables documented

---

### Task 5: Write Mixins API Section

**Files:**
- Modify: `docs/rfc/1008-scss-system-architecture.md`

**Step 1: Replace Mixins API section**

```markdown
## 4. Mixins API

All mixins are defined in `src/styles/abstracts/_mixins.scss`.

### 4.1 Responsive Mixins

```scss
// Mobile-first (min-width) - PREFERRED
// Usage: @include respond-to('md') { ... }
@mixin respond-to($breakpoint) {
  @media (min-width: map.get($breakpoints, $breakpoint)) {
    @content;
  }
}

// Max-width (for mobile-only styles)
// Usage: @include respond-below('md') { ... }
@mixin respond-below($breakpoint) {
  @media (max-width: calc(map.get($breakpoints, $breakpoint) - 1px)) {
    @content;
  }
}

// Between breakpoints
// Usage: @include respond-between('sm', 'lg') { ... }
@mixin respond-between($min, $max) {
  @media (min-width: map.get($breakpoints, $min)) and (max-width: calc(map.get($breakpoints, $max) - 1px)) {
    @content;
  }
}
```

### 4.2 Flexbox Mixins

```scss
// Full flexbox control
// Usage: @include flex(row, center, center, wrap)
@mixin flex($direction: row, $justify: flex-start, $align: stretch, $wrap: nowrap)

// Common shortcuts
@mixin flex-center      // justify-content: center; align-items: center
@mixin flex-between     // justify-content: space-between; align-items: center
@mixin flex-column      // flex-direction: column
@mixin flex-column-center  // column + align-items: center
```

### 4.3 Grid Mixins

```scss
// Fixed columns grid
// Usage: @include grid(3, space(4))
@mixin grid($columns: 1, $gap: space(4))

// Auto-fit responsive grid
// Usage: @include grid-auto-fit(250px, space(4))
@mixin grid-auto-fit($min-width: 250px, $gap: space(4))

// Auto-fill responsive grid
// Usage: @include grid-auto-fill(250px, space(4))
@mixin grid-auto-fill($min-width: 250px, $gap: space(4))
```

### 4.4 Visual Effects

```scss
// Box shadows
// Usage: @include shadow('lg')
// Levels: 'sm', 'md', 'lg', 'xl', '2xl', 'none'
@mixin shadow($level: 'md')

// Transitions
// Usage: @include transition(transform, box-shadow)
@mixin transition($properties: all, $duration: 150ms, $timing: cubic-bezier(0.4, 0, 0.2, 1))

// Hover lift effect (translateY + shadow)
// Usage: @include hover-lift(-2px)
@mixin hover-lift($distance: -2px)

// Gradient text
// Usage: @include gradient-text
@mixin gradient-text {
  background: linear-gradient(
    to right,
    hsl(var(--gradient-from)),
    hsl(var(--gradient-via)),
    hsl(var(--gradient-to))
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

// Gradient background
// Usage: @include gradient-bg(to bottom)
@mixin gradient-bg($direction: to right)
```

### 4.5 Utility Mixins

```scss
// Visually hidden (accessible)
// Usage: @include visually-hidden
@mixin visually-hidden

// Text truncation with ellipsis
// Usage: @include truncate
@mixin truncate

// Multi-line truncation
// Usage: @include line-clamp(3)
@mixin line-clamp($lines: 2)

// Centered container
// Usage: @include container(80rem)
@mixin container($max-width: 80rem)

// Focus ring (accessibility)
// Usage: @include focus-ring
@mixin focus-ring {
  &:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }
}

// Dark mode helper
// Usage: @include dark { background: black; }
@mixin dark {
  .dark & {
    @content;
  }
}
```

### 4.6 Mixin Usage Examples

```scss
// Real example from Hero.module.scss
.title {
  font-size: font-size('4xl');
  font-weight: font-weight('normal');
  text-align: center;

  @include respond-to('sm') {
    font-size: font-size('5xl');
  }

  @include respond-to('md') {
    text-align: left;
  }

  @include respond-to('lg') {
    font-size: font-size('6xl');
  }
}

// Card with hover effect
.card {
  @include transition(border-color, box-shadow);

  &:hover {
    border-color: hsl(var(--primary) / 0.4);
    @include shadow('xl');
  }
}
```
```

**Step 2: Save and verify**

Run: `grep -c "mixin\|@include" docs/rfc/1008-scss-system-architecture.md`
Expected: Multiple matches showing mixins documented

---

### Task 6: Write Naming Conventions Section

**Files:**
- Modify: `docs/rfc/1008-scss-system-architecture.md`

**Step 1: Replace Naming Conventions section**

```markdown
## 5. Naming Conventions

### 5.1 Class Naming: Semantic camelCase

CSS Module classes use **semantic camelCase** naming (NOT BEM):

```scss
// CORRECT - Semantic camelCase
.section { }
.heroSection { }
.cardTitle { }
.cardDescription { }
.ctaButton { }
.ctaButtonIcon { }

// INCORRECT - BEM naming
.card__title { }        // No double underscores
.card--primary { }      // No double dashes
.hero-section { }       // No kebab-case
```

**Rationale:**
1. CSS Modules provide automatic scoping (BEM namespacing unnecessary)
2. Matches JavaScript object property access pattern
3. Cleaner JSX: `styles["cardTitle"]` vs `styles["card__title"]`
4. React/Next.js community convention

### 5.2 Naming Hierarchy

Use common prefixes to group related elements:

```scss
// Hero component example
.section { }           // Container
.article { }           // Content wrapper
.content { }           // Main content area
.title { }             // Primary heading
.titleGradient { }     // Title variant/modifier
.subtitle { }          // Secondary text
.ctaWrapper { }        // CTA container
.ctaGlow { }           // CTA decoration
.ctaButton { }         // CTA interactive element

// Card component example
.card { }              // Card container
.cardHeader { }        // Card header area
.cardHeaderTop { }     // Header top section
.cardIcon { }          // Icon in card
.cardIconWrapper { }   // Icon container
.cardTitle { }         // Card title
.cardDescription { }   // Card description
.cardContent { }       // Card body
.cardFooter { }        // Card footer
```

### 5.3 File Naming

| Type | Convention | Example |
|------|------------|---------|
| CSS Module | `ComponentName.module.scss` | `Hero.module.scss` |
| Shared Styles | `feature.module.scss` | `Auth.module.scss` |
| Page Styles | `page.module.scss` | `page.module.scss` |
| SCSS Partial | `_partialname.scss` | `_variables.scss` |
| SCSS Index | `_index.scss` | `_index.scss` |

### 5.4 Component Import Pattern

```typescript
// In React component
import styles from "./Hero.module.scss";

export function Hero() {
  return (
    <section className={styles["section"]}>
      <h1 className={styles["title"]}>
        <span className={styles["titleGradient"]}>Hello</span>
      </h1>
    </section>
  );
}
```

**Important:** Use bracket notation `styles["className"]` for TypeScript safety, not dot notation `styles.className`.

### 5.5 SCSS Module Import Pattern

Every CSS Module file MUST start with:

```scss
// ===========================================
// COMPONENT NAME - Brief Description
// ===========================================
@use '../../styles/abstracts' as *;

// ... component styles
```

The relative path to abstracts varies by file location:
- `src/app/_components/` → `../../styles/abstracts`
- `src/app/auth/` → `../../styles/abstracts`
- `src/app/about/_components/` → `../../../../styles/abstracts`
```

**Step 2: Save and verify**

Run: `grep -A 3 "## 5. Naming" docs/rfc/1008-scss-system-architecture.md`
Expected: Shows naming conventions section header

---

### Task 7: Write Responsive Design Patterns Section

**Files:**
- Modify: `docs/rfc/1008-scss-system-architecture.md`

**Step 1: Replace Responsive Design section**

```markdown
## 6. Responsive Design

### 6.1 Mobile-First Approach

All responsive styles use **mobile-first** methodology:

```scss
// Base styles apply to mobile (< 640px)
.title {
  font-size: font-size('2xl');    // Mobile default
  text-align: center;

  @include respond-to('sm') {     // >= 640px
    font-size: font-size('3xl');
  }

  @include respond-to('md') {     // >= 768px
    text-align: left;
  }

  @include respond-to('lg') {     // >= 1024px
    font-size: font-size('4xl');
  }

  @include respond-to('xl') {     // >= 1280px
    font-size: font-size('5xl');
  }
}
```

### 6.2 Breakpoint Reference

| Breakpoint | Min Width | Common Use Case |
|------------|-----------|-----------------|
| `2xsm` | 320px | Small phones |
| `xsm` | 480px | Large phones |
| `sm` | 640px | Standard mobile |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small desktop |
| `xl` | 1280px | Desktop |
| `2xl` | 1440px | Large desktop |
| `3xl` | 1976px | Ultra-wide |

### 6.3 Common Responsive Patterns

**Responsive Grid:**
```scss
.grid {
  display: grid;
  grid-template-columns: 1fr;           // Mobile: single column
  gap: space(4);

  @include respond-to('md') {
    grid-template-columns: repeat(2, 1fr);  // Tablet: 2 columns
  }

  @include respond-to('lg') {
    grid-template-columns: repeat(3, 1fr);  // Desktop: 3 columns
    gap: space(8);
  }
}
```

**Responsive Spacing:**
```scss
.section {
  padding: space(8) space(4);           // Mobile padding

  @include respond-to('md') {
    padding: space(16) space(8);        // Tablet padding
  }

  @include respond-to('lg') {
    padding: space(20) space(12);       // Desktop padding
  }
}
```

**Show/Hide by Breakpoint:**
```scss
// Mobile-only element
.mobileNav {
  display: block;

  @include respond-to('lg') {
    display: none;
  }
}

// Desktop-only element
.desktopNav {
  display: none;

  @include respond-to('lg') {
    display: flex;
  }
}
```

**Responsive Typography:**
```scss
.heading {
  font-size: font-size('3xl');          // Mobile: 1.875rem

  @include respond-to('sm') {
    font-size: font-size('4xl');        // Small: 2.25rem
  }

  @include respond-to('lg') {
    font-size: font-size('5xl');        // Large: 3rem
  }

  @include respond-to('xl') {
    font-size: font-size('6xl');        // XL: 3.75rem
  }
}
```

### 6.4 Using respond-below (Mobile-Only)

For styles that should ONLY apply on mobile:

```scss
.mobileWarning {
  @include respond-below('md') {
    display: block;
    background: hsl(var(--destructive));
    padding: space(4);
  }
}
```
```

**Step 2: Save and verify**

Run: `grep -c "respond-to\|breakpoint" docs/rfc/1008-scss-system-architecture.md`
Expected: Multiple matches showing responsive design documented

---

### Task 8: Write Theming Patterns Section

**Files:**
- Modify: `docs/rfc/1008-scss-system-architecture.md`

**Step 1: Replace Theming Patterns section**

```markdown
## 7. Theming Patterns

### 7.1 CSS Variables Architecture

Theme values are defined in `globals.css` using CSS custom properties:

```css
/* Light mode (default) */
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --border: 240 5.9% 90%;
  --ring: 240 5.9% 10%;
  /* ... */
}

/* Dark mode */
.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 240 5.9% 10%;
  /* ... */
}
```

### 7.2 Using CSS Variables in SCSS

**Direct HSL Usage:**
```scss
.element {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border));
}
```

**With Opacity/Alpha:**
```scss
.overlay {
  background-color: hsl(var(--background) / 0.8);    // 80% opacity
  border-color: hsl(var(--primary) / 0.4);           // 40% opacity
}
```

**Using Helper Functions:**
```scss
.element {
  color: color('primary');                           // hsl(var(--primary))
  background: color-alpha('background', 0.5);        // hsl(var(--background) / 0.5)
}
```

### 7.3 Dark Mode Styling

**Method 1: `:global(.dark) &` selector (CURRENT)**
```scss
.card {
  background: hsl(var(--card));
  border-color: rgb(229, 231, 235);      // gray-200 (light mode)

  :global(.dark) & {
    border-color: rgb(55, 65, 81);       // gray-700 (dark mode)
  }
}
```

**Method 2: `@include dark` mixin (PREFERRED)**
```scss
.card {
  background: hsl(var(--card));
  border-color: rgb(229, 231, 235);

  @include dark {
    border-color: rgb(55, 65, 81);
  }
}
```

**Note:** Both methods are valid. The `@include dark` mixin is preferred for consistency and readability.

### 7.4 Gradient Theme Variables

Dynamic gradients are set by `GradientThemeContext`:

```scss
// Gradient CSS variables (runtime-set)
var(--gradient-from)     // Starting color
var(--gradient-via)      // Middle color
var(--gradient-to)       // Ending color
var(--accent-primary)    // Primary accent

// Usage
.badge {
  background: linear-gradient(
    to right,
    var(--gradient-from),
    var(--gradient-via),
    var(--gradient-to)
  );
}
```

### 7.5 Theme-Aware Backgrounds

For backgrounds that differ significantly between themes:

```scss
.heroBackground {
  background: linear-gradient(
    to bottom,
    hsl(var(--background)),
    rgb(233, 213, 255),              // purple-200 (light)
    hsl(var(--background))
  );

  :global(.dark) & {
    background: linear-gradient(
      to bottom,
      hsl(var(--background)),
      rgb(23, 37, 84),               // blue-950 (dark)
      hsl(var(--background))
    );
  }
}
```

### 7.6 Available CSS Variables

| Variable | Purpose |
|----------|---------|
| `--background` | Page background |
| `--foreground` | Default text color |
| `--card` | Card backgrounds |
| `--card-foreground` | Card text |
| `--primary` | Primary brand color |
| `--primary-foreground` | Text on primary |
| `--secondary` | Secondary color |
| `--muted` | Muted backgrounds |
| `--muted-foreground` | Muted text |
| `--accent` | Accent highlights |
| `--border` | Border color |
| `--ring` | Focus ring color |
| `--destructive` | Error/danger color |
```

**Step 2: Save and verify**

Run: `grep -c "dark\|theme\|variable" docs/rfc/1008-scss-system-architecture.md`
Expected: Multiple matches showing theming documented

---

### Task 9: Write Component Styling Patterns Section

**Files:**
- Modify: `docs/rfc/1008-scss-system-architecture.md`

**Step 1: Replace Component Styling Patterns section**

```markdown
## 8. Component Styling Patterns

### 8.1 Standard Component Structure

```scss
// ===========================================
// COMPONENT NAME - Brief Description
// ===========================================
@use '../../styles/abstracts' as *;

// Container/Section
.section {
  position: relative;
  // Container styles
}

// Layout wrapper
.article {
  @include container;
  // Layout styles
}

// Content areas
.content {
  // Content styles
}

// Typography
.title {
  font-size: font-size('3xl');
  font-weight: font-weight('bold');

  @include respond-to('lg') {
    font-size: font-size('4xl');
  }
}

.subtitle {
  color: hsl(var(--muted-foreground));
  font-size: font-size('lg');
}

// Interactive elements
.button {
  @include transition(background-color, box-shadow);

  &:hover {
    // Hover styles
  }

  &:focus-visible {
    @include focus-ring;
  }
}
```

### 8.2 Card Pattern

```scss
.card {
  position: relative;
  overflow: hidden;
  background-color: hsl(var(--card) / 0.5);
  border: 1px solid hsl(var(--border) / 0.5);
  border-radius: radius('xl');
  backdrop-filter: blur(4px);
  @include transition(border-color, box-shadow);

  &:hover {
    border-color: hsl(var(--primary) / 0.4);
    @include shadow('xl');
  }
}

.cardHeader {
  padding: space(6);
  display: flex;
  flex-direction: column;
  gap: space(4);
}

.cardContent {
  padding: 0 space(6) space(6);
}

.cardFooter {
  padding: space(4) space(6);
  border-top: 1px solid hsl(var(--border));
}
```

### 8.3 Interactive Hover Effects

```scss
// Subtle lift on hover
.cardWrapper {
  @include transition(transform);

  &:hover {
    transform: translateY(-0.25rem);
  }
}

// Gradient reveal on hover
.cardGradient {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  @include transition(opacity);

  .card:hover & {
    opacity: 1;
  }
}

// Glow effect on hover
.cardGlow {
  position: absolute;
  width: 8rem;
  height: 8rem;
  border-radius: 9999px;
  background-color: hsl(var(--primary) / 0.3);
  filter: blur(48px);
  opacity: 0;
  @include transition(opacity);

  .card:hover & {
    opacity: 1;
  }
}
```

### 8.4 Grid Layouts

```scss
// Responsive feature grid
.featuresGrid {
  display: grid;
  grid-template-columns: 1fr;
  gap: space(6);

  @include respond-to('md') {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @include respond-to('lg') {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: space(8);
  }
}

// Auto-fit grid
.cardsGrid {
  @include grid-auto-fit(280px, space(6));
}
```

### 8.5 Animated Background Orbs

```scss
.orbPrimary {
  position: absolute;
  width: 10rem;
  height: 10rem;
  border-radius: 9999px;
  background-color: hsl(var(--primary) / 0.2);
  filter: blur(48px);
  // Position with top/left/right/bottom
}

.orbSecondary {
  position: absolute;
  width: 8rem;
  height: 8rem;
  border-radius: 9999px;
  background-color: rgb(168, 85, 247, 0.2);  // purple-500/20
  filter: blur(48px);
}
```

### 8.6 Form Styling

```scss
.formGroup {
  display: flex;
  flex-direction: column;
  gap: space(2);
}

.label {
  font-size: font-size('sm');
  font-weight: font-weight('medium');
  color: hsl(var(--foreground));
}

.input {
  padding: space(2) space(3);
  border: 1px solid hsl(var(--border));
  border-radius: radius('md');
  background: hsl(var(--background));
  @include transition(border-color, box-shadow);

  &:focus {
    border-color: hsl(var(--ring));
    box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
  }
}
```
```

**Step 2: Save and verify**

Run: `grep -A 3 "## 8. Component" docs/rfc/1008-scss-system-architecture.md`
Expected: Shows component styling section

---

### Task 10: Write Migration Guidelines Section

**Files:**
- Modify: `docs/rfc/1008-scss-system-architecture.md`

**Step 1: Replace Migration Guidelines section**

```markdown
## 9. Migration Guidelines

### 9.1 Tailwind to SCSS Migration Process

**Step 1: Create SCSS Module File**
```bash
# For component in src/app/domain/_components/MyComponent.tsx
touch src/app/domain/_components/MyComponent.module.scss
```

**Step 2: Add Standard Header and Import**
```scss
// ===========================================
// MY COMPONENT - Brief Description
// ===========================================
@use '../../../../styles/abstracts' as *;
```

**Step 3: Convert Tailwind Classes**

| Tailwind | SCSS Equivalent |
|----------|-----------------|
| `flex items-center justify-between` | `@include flex-between` |
| `grid grid-cols-3 gap-4` | `@include grid(3, space(4))` |
| `p-4` | `padding: space(4)` |
| `mt-8 mb-4` | `margin-top: space(8); margin-bottom: space(4)` |
| `text-xl font-bold` | `font-size: font-size('xl'); font-weight: font-weight('bold')` |
| `text-gray-500` | `color: hsl(var(--muted-foreground))` |
| `bg-card` | `background-color: hsl(var(--card))` |
| `rounded-xl` | `border-radius: radius('xl')` |
| `shadow-lg` | `@include shadow('lg')` |
| `hover:scale-105` | `&:hover { transform: scale(1.05); }` |
| `transition-all` | `@include transition(all)` |
| `md:flex-row` | `@include respond-to('md') { flex-direction: row; }` |
| `dark:bg-gray-900` | `:global(.dark) & { background: ... }` or `@include dark { ... }` |

**Step 4: Update React Component**
```typescript
// Before
export function MyComponent() {
  return (
    <div className="flex items-center justify-between p-4 bg-card rounded-xl">
      <h2 className="text-xl font-bold">Title</h2>
    </div>
  );
}

// After
import styles from "./MyComponent.module.scss";

export function MyComponent() {
  return (
    <div className={styles["container"]}>
      <h2 className={styles["title"]}>Title</h2>
    </div>
  );
}
```

### 9.2 Common Conversion Patterns

**Responsive Classes:**
```scss
// Tailwind: className="flex flex-col md:flex-row lg:gap-8"
// SCSS:
.container {
  display: flex;
  flex-direction: column;

  @include respond-to('md') {
    flex-direction: row;
  }

  @include respond-to('lg') {
    gap: space(8);
  }
}
```

**Conditional Classes:**
```typescript
// Tailwind: className={cn("base", isActive && "active")}
// SCSS:
const containerClass = `${styles["container"]} ${isActive ? styles["active"] : ""}`;
// or
<div className={`${styles["container"]} ${styles[isActive ? "active" : ""]}`}>
```

**Dynamic Variant Classes:**
```typescript
// Map variant to class name
const variantMap = {
  primary: "variantPrimary",
  secondary: "variantSecondary",
} as const;

<div className={`${styles["button"]} ${styles[variantMap[variant]]}`}>
```

### 9.3 Keeping Tailwind for Component Library

The `@arolariu/components` library uses Tailwind CSS. When using these components alongside SCSS modules:

```typescript
import {Button, Card} from "@arolariu/components";
import styles from "./MyPage.module.scss";

export function MyPage() {
  return (
    <section className={styles["section"]}>
      {/* Component library components keep Tailwind */}
      <Card className="custom-tailwind-override">
        <h2 className={styles["title"]}>Title</h2>
        <Button variant="primary">Click</Button>
      </Card>
    </section>
  );
}
```

### 9.4 Migration Checklist

- [ ] Create `.module.scss` file with standard header
- [ ] Import abstracts with correct relative path
- [ ] Convert all Tailwind utility classes to SCSS
- [ ] Use semantic camelCase class names
- [ ] Implement mobile-first responsive styles
- [ ] Add dark mode support where needed
- [ ] Update React component imports
- [ ] Use bracket notation for class access
- [ ] Test on all breakpoints
- [ ] Test dark/light mode toggle
- [ ] Remove unused Tailwind classes from component
```

**Step 2: Save and verify**

Run: `grep -c "Tailwind\|migration\|convert" docs/rfc/1008-scss-system-architecture.md`
Expected: Multiple matches showing migration guidelines

---

### Task 11: Write Trade-offs and File Locations Sections

**Files:**
- Modify: `docs/rfc/1008-scss-system-architecture.md`

**Step 1: Replace Trade-offs section**

```markdown
## 10. Trade-offs and Alternatives

### 10.1 Considered Alternatives

| Alternative | Reason for Rejection |
|-------------|---------------------|
| **Tailwind Only** | Limited CSS power, no variables/mixins, harder to maintain complex styles |
| **CSS-in-JS (Emotion/Styled)** | Runtime overhead, RSC compatibility issues, larger bundle |
| **vanilla-extract** | Build complexity, learning curve, less ecosystem support |
| **CSS Modules (plain CSS)** | No SCSS features (mixins, nesting, functions) |
| **SCSS without Modules** | No automatic scoping, class name collisions |
| **BEM Naming** | Unnecessary with CSS Modules scoping, verbose syntax |

### 10.2 Why SCSS Modules?

**Advantages:**
- ✅ Full SCSS power (variables, mixins, functions, nesting)
- ✅ Automatic scoping via CSS Modules
- ✅ No runtime overhead (compile-time only)
- ✅ Next.js native support
- ✅ Coexists with Tailwind during migration
- ✅ Familiar CSS syntax
- ✅ Type-safe class access with bracket notation

**Trade-offs:**
- ❌ Build-time compilation required
- ❌ Two styling systems during migration period
- ❌ Relative import paths for abstracts
- ❌ No TypeScript autocomplete for class names (minor)

### 10.3 Why 7-1 Pattern?

**Advantages:**
- ✅ Industry-standard organization
- ✅ Clear separation of concerns
- ✅ Scalable for large projects
- ✅ Easy to locate and modify styles
- ✅ Promotes DRY code with shared abstracts

**Adaptations:**
- Utilities folder optional (Tailwind fills this role)
- Pages folder optional (CSS Modules are page-scoped)
- No separate vendors folder (npm dependencies)

### 10.4 Tailwind Coexistence Strategy

The SCSS system is designed for gradual migration:

1. **main.scss imported AFTER Tailwind** - SCSS has higher specificity
2. **Shared design tokens** - Spacing/breakpoints match Tailwind scale
3. **Component library stays Tailwind** - No migration needed
4. **Route-by-route migration** - Convert pages incrementally
5. **Mixed usage allowed** - Tailwind utilities + SCSS modules
```

**Step 2: Add File Locations section**

```markdown
## 11. File Locations

### 11.1 Core SCSS Infrastructure

| File | Purpose |
|------|---------|
| `src/styles/main.scss` | 7-1 pattern entry point |
| `src/styles/abstracts/_index.scss` | Barrel export for abstracts |
| `src/styles/abstracts/_variables.scss` | Spacing, breakpoints, z-index, radius |
| `src/styles/abstracts/_colors.scss` | CSS variable helpers |
| `src/styles/abstracts/_typography.scss` | Font scale functions |
| `src/styles/abstracts/_mixins.scss` | All mixins |
| `src/styles/abstracts/_functions.scss` | Utility functions |
| `src/styles/base/_reset.scss` | CSS reset |
| `src/styles/animations/_keyframes.scss` | Animation definitions |
| `src/styles/components/_header.scss` | Header styles |
| `src/styles/components/_navigation.scss` | Navigation styles |

### 11.2 Migrated CSS Modules

| Route | Files |
|-------|-------|
| Home | `src/app/_components/{Hero,Features,Technologies}.module.scss` |
| Auth | `src/app/auth/Auth.module.scss` |
| About | `src/app/about/page.module.scss`, `_components/*.module.scss` |
| About/Author | `src/app/about/the-author/page.module.scss`, `_components/*.module.scss` |
| About/Platform | `src/app/about/the-platform/page.module.scss`, `_components/*.module.scss` |
| Privacy | `src/app/(privacy-and-terms)/privacy-policy/page.module.scss` |
| Terms | `src/app/(privacy-and-terms)/terms-of-service/page.module.scss` |
| Acknowledgements | `src/app/(privacy-and-terms)/acknowledgements/*.module.scss` |

### 11.3 Routes Pending Migration

| Route | Component Count | Priority |
|-------|----------------|----------|
| `/domains/invoices` | 78 components | High |
| `/my-profile` | 11 components | Medium |

### 11.4 Related Documentation

- [RFC 1006: Component Library Architecture](./1006-component-library-architecture.md)
- [RFC 1007: Advanced Frontend Patterns](./1007-advanced-frontend-patterns.md)
- [CLAUDE.md](../../CLAUDE.md) - Project development guide
```

**Step 3: Save and verify**

Run: `tail -50 docs/rfc/1008-scss-system-architecture.md`
Expected: Shows trade-offs and file locations sections

---

### Task 12: Commit RFC Document

**Files:**
- Commit: `docs/rfc/1008-scss-system-architecture.md`

**Step 1: Verify RFC content**

Run: `wc -l docs/rfc/1008-scss-system-architecture.md`
Expected: 500+ lines (comprehensive documentation)

**Step 2: Stage and commit**

```bash
git add docs/rfc/1008-scss-system-architecture.md
git commit -m "$(cat <<'EOF'
docs: add RFC 1008 - SCSS System Architecture

Comprehensive documentation of the SCSS module system:
- 7-1 pattern architecture overview
- Variables API (spacing, breakpoints, z-index, typography)
- Mixins API (responsive, flexbox, grid, effects)
- Naming conventions (semantic camelCase)
- Responsive design patterns (mobile-first)
- Theming patterns (CSS variables, dark mode)
- Component styling patterns
- Tailwind to SCSS migration guidelines
- Trade-offs and alternatives analysis

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

**Step 3: Verify commit**

Run: `git log -1 --oneline`
Expected: Shows commit with RFC message

---

## Phase 2: SCSS Consolidation

### Task 13: Update Dark Mode Pattern in Hero.module.scss

**Files:**
- Modify: `sites/arolariu.ro/src/app/_components/Hero.module.scss`

**Step 1: Find current dark mode usage**

Run: `grep -n ":global(.dark)" sites/arolariu.ro/src/app/_components/Hero.module.scss`
Expected: Shows line with `:global(.dark) &` pattern

**Step 2: Replace with @include dark mixin**

Find:
```scss
  :global(.dark) & {
    border-color: rgb(209, 213, 219); // gray-300
  }
```

Replace with:
```scss
  @include dark {
    border-color: rgb(209, 213, 219); // gray-300
  }
```

**Step 3: Verify change**

Run: `grep -A 2 "@include dark" sites/arolariu.ro/src/app/_components/Hero.module.scss`
Expected: Shows updated dark mode pattern

---

### Task 14: Update Dark Mode Pattern in Technologies.module.scss

**Files:**
- Modify: `sites/arolariu.ro/src/app/_components/Technologies.module.scss`

**Step 1: Find current dark mode usage**

Run: `grep -n ":global(.dark)" sites/arolariu.ro/src/app/_components/Technologies.module.scss`
Expected: Shows lines with `:global(.dark) &` pattern

**Step 2: Replace all instances with @include dark mixin**

Find each `:global(.dark) & {` and replace with `@include dark {`

**Step 3: Verify changes**

Run: `grep -c "@include dark" sites/arolariu.ro/src/app/_components/Technologies.module.scss`
Expected: Shows count of updated patterns

---

### Task 15: Add Standardized File Headers

This task adds consistent header comments to SCSS modules that don't have them.

**Files to check:**
- All `.module.scss` files in `src/app/`

**Step 1: List files needing headers**

Run: `find sites/arolariu.ro/src/app -name "*.module.scss" -exec grep -L "^// ==" {} \;`
Expected: List of files without standard headers

**Step 2: Add headers to each file**

Each file should start with:
```scss
// ===========================================
// COMPONENT NAME - Brief Description
// ===========================================
@use 'path/to/styles/abstracts' as *;
```

**Note:** Most files already have headers. Only update those missing them.

---

### Task 16: Commit Consolidation Changes

**Files:**
- Commit: All modified `.module.scss` files

**Step 1: Check git status**

Run: `git status --short sites/arolariu.ro/src/app/`
Expected: Shows modified SCSS files

**Step 2: Stage and commit**

```bash
git add sites/arolariu.ro/src/app/
git commit -m "$(cat <<'EOF'
refactor(scss): standardize dark mode pattern across modules

- Replace :global(.dark) & with @include dark mixin
- Consistent pattern for dark mode styling
- Follows RFC 1008 theming guidelines

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3: Validation

### Task 17: Run Build to Verify SCSS Compilation

**Step 1: Run website build**

Run: `cd sites/arolariu.ro && npm run build`
Expected: Build completes without SCSS compilation errors

**Step 2: Check for SCSS warnings**

Run: `npm run build 2>&1 | grep -i "scss\|sass"`
Expected: No errors or warnings related to SCSS

---

### Task 18: Verify Dev Server Works

**Step 1: Start dev server**

Run: `cd sites/arolariu.ro && npm run dev`
Expected: Dev server starts successfully

**Step 2: Manually verify**

- Open https://localhost:3000
- Check homepage Hero, Features, Technologies render correctly
- Toggle dark mode and verify styles change
- Navigate to /about and verify styling
- Navigate to /auth and verify styling

**Step 3: Stop dev server**

Press Ctrl+C to stop

---

### Task 19: Final Verification and Summary

**Step 1: Verify all commits**

Run: `git log --oneline -5`
Expected: Shows RFC commit and consolidation commit

**Step 2: Review RFC file**

Run: `head -100 docs/rfc/1008-scss-system-architecture.md`
Expected: Shows comprehensive RFC documentation

**Step 3: Summary**

The SCSS system is now:
- ✅ Fully documented in RFC 1008
- ✅ Using consistent dark mode patterns
- ✅ Ready for future /domains migration
- ✅ Build-verified working

---

## Summary

**Created:**
- `docs/rfc/1008-scss-system-architecture.md` - Comprehensive RFC documentation

**Modified:**
- `src/app/_components/Hero.module.scss` - Dark mode pattern standardization
- `src/app/_components/Technologies.module.scss` - Dark mode pattern standardization

**Key Outcomes:**
1. RFC 1008 documents the complete SCSS architecture
2. All patterns are now consistent across migrated components
3. Clear migration guidelines for future /domains work
4. Trade-offs and alternatives are documented

**Next Steps (Out of Scope):**
- Migrate `/domains/invoices` route (78 components)
- Migrate `/my-profile` route (11 components)
