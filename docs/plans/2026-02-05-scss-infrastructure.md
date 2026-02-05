# SCSS Infrastructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a comprehensive SCSS infrastructure for sites/arolariu.ro that integrates with the existing next-themes + GradientThemeContext theming system, supports Caudex and Atkinson Hyperlegible fonts, and provides a scalable foundation for migrating away from TailwindCSS.

**Architecture:** Hybrid SCSS + CSS Variables approach. SCSS provides organization, mixins, and functions. CSS variables (already in place via next-themes and GradientThemeContext) enable runtime theme switching. BEM methodology for semantic class naming. The component library (@arolariu/components) continues using Tailwind.

**Tech Stack:** SCSS/Sass (already installed), CSS Custom Properties, Next.js built-in Sass support, next-themes package (extended), existing GradientThemeContext.

**Scope:** Main site only (sites/arolariu.ro). Component library continues using Tailwind and must coexist.

---

## Important Architecture Notes

### CSS Bundle Strategy (NOT Client/Server Split)

**IMPORTANT:** CSS does NOT need to be split into "client" and "server" bundles. Here's why:

1. **CSS is always static** - Whether a React component runs on server or client, its CSS is extracted at build time and served as static files
2. **"use client" only affects JavaScript** - The directive tells Next.js where to execute JS, not CSS
3. **CSS Modules provide scoping** - Use `.module.scss` for component-scoped styles to avoid naming collisions

**Correct organization:**
```
src/styles/
├── main.scss              # Global styles (imported in layout.tsx)
├── abstracts/             # Variables, mixins, functions (no CSS output)
├── base/                  # Reset, typography (global)
├── themes/                # Theme definitions (global)
├── utilities/             # Utility classes (global)
├── components/            # Shared component styles (global)
└── animations/            # Keyframes, transitions (global)

src/app/[route]/
├── page.tsx               # Server Component (can import .module.scss)
├── island.tsx             # Client Component (can import .module.scss)
└── page.module.scss       # Page-specific scoped styles
```

### Theming Strategy: Extending Existing Infrastructure

We will **NOT** create a custom theme hook from scratch. Instead:

1. **next-themes** (already configured) - Handles dark/light mode toggle via `.dark` class
2. **GradientThemeContext** (already exists) - Handles color customization via CSS variables
3. **preferencesStore** (Zustand) - Persists theme preferences to IndexedDB

We will **extend** these systems:
- Add preset color palettes to GradientThemeContext
- Keep next-themes configuration as-is
- SCSS will consume the CSS variables these systems set

### Font System: Caudex + Atkinson Hyperlegible

The project uses two fonts managed by FontContext:
- `--font-default` → Caudex (serif, weight 700)
- `--font-dyslexic` → Atkinson Hyperlegible (sans-serif, weight 400)

SCSS typography will reference these CSS variables.

---

## Prerequisites (Already Complete)

- [x] Sass installed at monorepo root level
- [x] Sass referenced in sites/arolariu.ro/package.json
- [x] next-themes configured in providers.tsx
- [x] GradientThemeContext for color customization
- [x] FontContext for font switching
- [x] preferencesStore for persistence

---

## Phase 0: Project Setup

### Task 0.1: Verify SCSS Compilation

**Files:**
- Create: `sites/arolariu.ro/src/styles/main.scss`
- Modify: `sites/arolariu.ro/src/app/layout.tsx`

**Step 1: Create main SCSS entry file**

Create `src/styles/main.scss`:
```scss
// ===========================================
// SCSS Entry Point - arolariu.ro
// ===========================================
// Verification test - remove after confirming SCSS works

$test-color: #3490dc;

.scss-verification-test {
  color: $test-color;

  &:hover {
    color: darken($test-color, 10%);
  }
}
```

**Step 2: Import SCSS in layout**

Modify `src/app/layout.tsx` - add import after existing CSS imports:
```typescript
import "@arolariu/components/styles.css";
import "./globals.css";
import "@/styles/main.scss"; // Add this line
```

**Step 3: Verify SCSS compilation**

Run: `npm run dev:website`
Expected: Dev server starts without SCSS compilation errors

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/styles/main.scss sites/arolariu.ro/src/app/layout.tsx
git commit -m "chore: verify SCSS compilation works"
```

---

### Task 0.2: Create SCSS Directory Structure

**Files:**
- Create: Multiple directories and index files under `src/styles/`

**Step 1: Create directory structure**

Run:
```bash
cd sites/arolariu.ro/src/styles
mkdir -p abstracts base themes utilities components animations pages
```

**Step 2: Create abstract index files**

Create `abstracts/_index.scss`:
```scss
// ===========================================
// ABSTRACTS
// Variables, mixins, functions - NO CSS output
// ===========================================
@forward 'variables';
@forward 'colors';
@forward 'typography';
@forward 'mixins';
@forward 'functions';
```

Create placeholder files (we'll populate them in subsequent tasks):
- `abstracts/_variables.scss`
- `abstracts/_colors.scss`
- `abstracts/_typography.scss`
- `abstracts/_mixins.scss`
- `abstracts/_functions.scss`

**Step 3: Create base index file**

Create `base/_index.scss`:
```scss
// ===========================================
// BASE
// Reset, element defaults
// ===========================================
@forward 'reset';
@forward 'elements';
```

Create placeholder files:
- `base/_reset.scss`
- `base/_elements.scss`

**Step 4: Create themes index file**

Create `themes/_index.scss`:
```scss
// ===========================================
// THEMES
// Color scheme definitions using CSS variables
// Works WITH next-themes and GradientThemeContext
// ===========================================
@forward 'variables';
@forward 'presets';
```

Create placeholder files:
- `themes/_variables.scss`
- `themes/_presets.scss`

**Step 5: Create utilities index file**

Create `utilities/_index.scss`:
```scss
// ===========================================
// UTILITIES
// Helper classes for common patterns
// ===========================================
@forward 'spacing';
@forward 'layout';
@forward 'display';
@forward 'colors';
@forward 'sizing';
```

Create placeholder files for each.

**Step 6: Create components index file**

Create `components/_index.scss`:
```scss
// ===========================================
// COMPONENTS
// Reusable component styles (BEM)
// ===========================================
// Add @forward statements as components are created
```

**Step 7: Create animations index file**

Create `animations/_index.scss`:
```scss
// ===========================================
// ANIMATIONS
// Keyframes and transition utilities
// ===========================================
@forward 'keyframes';
@forward 'transitions';
```

Create placeholder files:
- `animations/_keyframes.scss`
- `animations/_transitions.scss`

**Step 8: Create pages index file**

Create `pages/_index.scss`:
```scss
// ===========================================
// PAGES
// Page-specific global styles
// For truly global page styles only
// Prefer page.module.scss for scoped styles
// ===========================================
```

**Step 9: Update main.scss**

```scss
// ===========================================
// SCSS Entry Point - arolariu.ro
// 7-1 Architecture Pattern (adapted)
// ===========================================

// 1. Abstracts (no CSS output - variables, mixins, functions)
@use 'abstracts' as *;

// 2. Base styles (reset, element defaults)
@use 'base';

// 3. Theme definitions (CSS variable declarations)
@use 'themes';

// 4. Utility classes
@use 'utilities';

// 5. Shared component styles
@use 'components';

// 6. Animations
@use 'animations';

// 7. Page-specific global styles
@use 'pages';
```

**Step 10: Commit**

```bash
git add sites/arolariu.ro/src/styles/
git commit -m "chore: create SCSS directory structure (7-1 pattern)"
```

---

## Phase 1: SCSS Foundation - Abstracts

### Task 1.1: Define Core Variables

**Files:**
- Modify: `src/styles/abstracts/_variables.scss`

**Step 1: Add spacing scale**

```scss
// ===========================================
// SPACING SCALE
// Matches current Tailwind usage patterns
// ===========================================
$spacing: (
  0: 0,
  0.5: 0.125rem,   // 2px
  1: 0.25rem,      // 4px
  1.5: 0.375rem,   // 6px
  2: 0.5rem,       // 8px
  2.5: 0.625rem,   // 10px
  3: 0.75rem,      // 12px
  3.5: 0.875rem,   // 14px
  4: 1rem,         // 16px
  5: 1.25rem,      // 20px
  6: 1.5rem,       // 24px
  7: 1.75rem,      // 28px
  8: 2rem,         // 32px
  9: 2.25rem,      // 36px
  10: 2.5rem,      // 40px
  11: 2.75rem,     // 44px
  12: 3rem,        // 48px
  14: 3.5rem,      // 56px
  16: 4rem,        // 64px
  20: 5rem,        // 80px
  24: 6rem,        // 96px
  28: 7rem,        // 112px
  32: 8rem,        // 128px
  36: 9rem,        // 144px
  40: 10rem,       // 160px
  44: 11rem,       // 176px
  48: 12rem,       // 192px
  52: 13rem,       // 208px
  56: 14rem,       // 224px
  60: 15rem,       // 240px
  64: 16rem,       // 256px
  72: 18rem,       // 288px
  80: 20rem,       // 320px
  96: 24rem,       // 384px
);

// Helper function to get spacing value
@function space($key) {
  @if map-has-key($spacing, $key) {
    @return map-get($spacing, $key);
  }
  @error "Unknown spacing key: #{$key}. Available: #{map-keys($spacing)}";
}
```

**Step 2: Add breakpoints (matching current Tailwind config)**

```scss
// ===========================================
// BREAKPOINTS
// Matches current custom Tailwind breakpoints exactly
// ===========================================
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

// Helper function to get breakpoint value
@function breakpoint($key) {
  @if map-has-key($breakpoints, $key) {
    @return map-get($breakpoints, $key);
  }
  @error "Unknown breakpoint: #{$key}. Available: #{map-keys($breakpoints)}";
}
```

**Step 3: Add z-index scale**

```scss
// ===========================================
// Z-INDEX SCALE
// Organized layering system
// ===========================================
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
  @if map-has-key($z-index, $key) {
    @return map-get($z-index, $key);
  }
  @error "Unknown z-index key: #{$key}. Available: #{map-keys($z-index)}";
}
```

**Step 4: Add border radius scale**

```scss
// ===========================================
// BORDER RADIUS
// Uses CSS variable for base (matches Tailwind config)
// ===========================================
$radius-base: 0.5rem; // Fallback, actual value from --radius CSS var

$border-radius: (
  'none': 0,
  'sm': 0.125rem,     // 2px
  'md': 0.375rem,     // 6px
  'lg': 0.5rem,       // 8px (default)
  'xl': 0.75rem,      // 12px
  '2xl': 1rem,        // 16px
  '3xl': 1.5rem,      // 24px
  'full': 9999px,
);

@function radius($key) {
  @if map-has-key($border-radius, $key) {
    @return map-get($border-radius, $key);
  }
  @error "Unknown radius key: #{$key}. Available: #{map-keys($border-radius)}";
}
```

**Step 5: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_variables.scss
git commit -m "feat(scss): add core variables - spacing, breakpoints, z-index, radius"
```

---

### Task 1.2: Define Typography Variables

**Files:**
- Modify: `src/styles/abstracts/_typography.scss`

**Step 1: Define font families using existing CSS variables**

```scss
// ===========================================
// TYPOGRAPHY
// Uses existing FontContext CSS variables
// ===========================================

// Font family references (set by FontContext)
// --font-default = Caudex (serif, weight 700)
// --font-dyslexic = Atkinson Hyperlegible (sans-serif, weight 400)

$font-family-default: var(--font-default), 'Caudex', Georgia, 'Times New Roman', serif;
$font-family-dyslexic: var(--font-dyslexic), 'Atkinson Hyperlegible', system-ui, sans-serif;
$font-family-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;

// Font sizes
$font-sizes: (
  'xs': 0.75rem,     // 12px
  'sm': 0.875rem,    // 14px
  'base': 1rem,      // 16px
  'lg': 1.125rem,    // 18px
  'xl': 1.25rem,     // 20px
  '2xl': 1.5rem,     // 24px
  '3xl': 1.875rem,   // 30px
  '4xl': 2.25rem,    // 36px
  '5xl': 3rem,       // 48px
  '6xl': 3.75rem,    // 60px
  '7xl': 4.5rem,     // 72px
  '8xl': 6rem,       // 96px
  '9xl': 8rem,       // 128px
);

// Font weights
$font-weights: (
  'thin': 100,
  'extralight': 200,
  'light': 300,
  'normal': 400,
  'medium': 500,
  'semibold': 600,
  'bold': 700,
  'extrabold': 800,
  'black': 900,
);

// Line heights
$line-heights: (
  'none': 1,
  'tight': 1.25,
  'snug': 1.375,
  'normal': 1.5,
  'relaxed': 1.625,
  'loose': 2,
);

// Letter spacing
$letter-spacing: (
  'tighter': -0.05em,
  'tight': -0.025em,
  'normal': 0,
  'wide': 0.025em,
  'wider': 0.05em,
  'widest': 0.1em,
);

// Helper functions
@function font-size($key) {
  @if map-has-key($font-sizes, $key) {
    @return map-get($font-sizes, $key);
  }
  @error "Unknown font-size: #{$key}";
}

@function font-weight($key) {
  @if map-has-key($font-weights, $key) {
    @return map-get($font-weights, $key);
  }
  @error "Unknown font-weight: #{$key}";
}

@function line-height($key) {
  @if map-has-key($line-heights, $key) {
    @return map-get($line-heights, $key);
  }
  @error "Unknown line-height: #{$key}";
}

@function letter-spacing($key) {
  @if map-has-key($letter-spacing, $key) {
    @return map-get($letter-spacing, $key);
  }
  @error "Unknown letter-spacing: #{$key}";
}
```

**Step 2: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_typography.scss
git commit -m "feat(scss): add typography variables with Caudex/Atkinson Hyperlegible support"
```

---

### Task 1.3: Define Color System

**Files:**
- Modify: `src/styles/abstracts/_colors.scss`

**Step 1: Document existing CSS variables (consumed, not defined)**

```scss
// ===========================================
// COLOR SYSTEM
// ===========================================
// IMPORTANT: Colors are defined as CSS variables by:
// - globals.css (base theme variables)
// - next-themes (adds .dark class for dark mode)
// - GradientThemeContext (sets gradient variables at runtime)
//
// This file provides SCSS helpers to consume those variables.
// We do NOT redefine colors here - we reference them.

// ===========================================
// CSS VARIABLE REFERENCES
// These variables are set by globals.css and modified by .dark class
// ===========================================

// Semantic color variable names (for documentation)
$color-vars: (
  // Base colors
  'background': '--background',
  'foreground': '--foreground',
  'card': '--card',
  'card-foreground': '--card-foreground',
  'popover': '--popover',
  'popover-foreground': '--popover-foreground',

  // Brand colors
  'primary': '--primary',
  'primary-foreground': '--primary-foreground',
  'secondary': '--secondary',
  'secondary-foreground': '--secondary-foreground',

  // Semantic colors
  'muted': '--muted',
  'muted-foreground': '--muted-foreground',
  'accent': '--accent',
  'accent-foreground': '--accent-foreground',
  'destructive': '--destructive',
  'destructive-foreground': '--destructive-foreground',

  // UI colors
  'border': '--border',
  'input': '--input',
  'ring': '--ring',

  // Gradient colors (set by GradientThemeContext)
  'gradient-from': '--gradient-from',
  'gradient-via': '--gradient-via',
  'gradient-to': '--gradient-to',
  'accent-primary': '--accent-primary',
  'footer-bg': '--footer-bg',
);

// ===========================================
// COLOR HELPER FUNCTION
// ===========================================

// Get color as HSL CSS variable
// Usage: color: color('primary');
@function color($name) {
  @if map-has-key($color-vars, $name) {
    $var-name: map-get($color-vars, $name);
    @return hsl(var(#{$var-name}));
  }
  @error "Unknown color: #{$name}. Available: #{map-keys($color-vars)}";
}

// Get color with alpha
// Usage: background: color-alpha('primary', 0.5);
@function color-alpha($name, $alpha) {
  @if map-has-key($color-vars, $name) {
    $var-name: map-get($color-vars, $name);
    @return hsl(var(#{$var-name}) / #{$alpha});
  }
  @error "Unknown color: #{$name}";
}

// ===========================================
// STATIC COLOR PALETTE (for non-themed elements)
// ===========================================

$static-colors: (
  'white': hsl(0, 0%, 100%),
  'black': hsl(0, 0%, 0%),
  'transparent': transparent,
  'current': currentColor,
);

@function static-color($name) {
  @if map-has-key($static-colors, $name) {
    @return map-get($static-colors, $name);
  }
  @error "Unknown static color: #{$name}";
}
```

**Step 2: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_colors.scss
git commit -m "feat(scss): add color system helpers for CSS variable consumption"
```

---

### Task 1.4: Create Core Mixins

**Files:**
- Modify: `src/styles/abstracts/_mixins.scss`

**Step 1: Add responsive mixins**

```scss
// ===========================================
// MIXINS
// ===========================================
@use 'variables' as *;

// ===========================================
// RESPONSIVE MIXINS
// ===========================================

// Mobile-first responsive mixin
// Usage: @include respond-to('md') { ... }
@mixin respond-to($breakpoint) {
  @if map-has-key($breakpoints, $breakpoint) {
    @media (min-width: map-get($breakpoints, $breakpoint)) {
      @content;
    }
  } @else {
    @error "Unknown breakpoint: #{$breakpoint}. Available: #{map-keys($breakpoints)}";
  }
}

// Max-width responsive mixin (for mobile-only styles)
// Usage: @include respond-below('md') { ... }
@mixin respond-below($breakpoint) {
  @if map-has-key($breakpoints, $breakpoint) {
    @media (max-width: calc(map-get($breakpoints, $breakpoint) - 1px)) {
      @content;
    }
  } @else {
    @error "Unknown breakpoint: #{$breakpoint}";
  }
}

// Between breakpoints
// Usage: @include respond-between('sm', 'lg') { ... }
@mixin respond-between($min, $max) {
  @media (min-width: map-get($breakpoints, $min)) and (max-width: calc(map-get($breakpoints, $max) - 1px)) {
    @content;
  }
}
```

**Step 2: Add flexbox mixins**

```scss
// ===========================================
// FLEXBOX MIXINS
// ===========================================

@mixin flex($direction: row, $justify: flex-start, $align: stretch, $wrap: nowrap) {
  display: flex;
  flex-direction: $direction;
  justify-content: $justify;
  align-items: $align;
  flex-wrap: $wrap;
}

@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

@mixin flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

@mixin flex-column {
  display: flex;
  flex-direction: column;
}

@mixin flex-column-center {
  display: flex;
  flex-direction: column;
  align-items: center;
}
```

**Step 3: Add grid mixins**

```scss
// ===========================================
// GRID MIXINS
// ===========================================

@mixin grid($columns: 1, $gap: space(4)) {
  display: grid;
  grid-template-columns: repeat($columns, minmax(0, 1fr));
  gap: $gap;
}

@mixin grid-auto-fit($min-width: 250px, $gap: space(4)) {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax($min-width, 1fr));
  gap: $gap;
}

@mixin grid-auto-fill($min-width: 250px, $gap: space(4)) {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax($min-width, 1fr));
  gap: $gap;
}
```

**Step 4: Add visual effect mixins**

```scss
// ===========================================
// VISUAL EFFECTS
// ===========================================

// Box shadow mixin
@mixin shadow($level: 'md') {
  $shadows: (
    'sm': 0 1px 2px 0 rgb(0 0 0 / 0.05),
    'md': (0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)),
    'lg': (0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)),
    'xl': (0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)),
    '2xl': 0 25px 50px -12px rgb(0 0 0 / 0.25),
    'none': none,
  );

  @if map-has-key($shadows, $level) {
    box-shadow: map-get($shadows, $level);
  } @else {
    @error "Unknown shadow level: #{$level}";
  }
}

// Transition mixin
@mixin transition($properties: all, $duration: 150ms, $timing: cubic-bezier(0.4, 0, 0.2, 1)) {
  transition-property: $properties;
  transition-duration: $duration;
  transition-timing-function: $timing;
}

// Hover lift effect
@mixin hover-lift($distance: -2px) {
  @include transition(transform, box-shadow);

  &:hover {
    transform: translateY($distance);
    @include shadow('lg');
  }
}

// Gradient text
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
@mixin gradient-bg($direction: to right) {
  background: linear-gradient(
    $direction,
    hsl(var(--gradient-from)),
    hsl(var(--gradient-via)),
    hsl(var(--gradient-to))
  );
}
```

**Step 5: Add utility mixins**

```scss
// ===========================================
// UTILITY MIXINS
// ===========================================

// Visually hidden (accessible)
@mixin visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

// Text truncation
@mixin truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// Line clamp
@mixin line-clamp($lines: 2) {
  display: -webkit-box;
  -webkit-line-clamp: $lines;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

// Container
@mixin container($max-width: 80rem) {
  width: 100%;
  max-width: $max-width;
  margin-left: auto;
  margin-right: auto;
  padding-left: space(4);
  padding-right: space(4);

  @include respond-to('lg') {
    padding-left: space(8);
    padding-right: space(8);
  }
}

// Focus ring (accessibility)
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

**Step 6: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_mixins.scss
git commit -m "feat(scss): add core mixins - responsive, flex, grid, effects, utilities"
```

---

### Task 1.5: Create SCSS Functions

**Files:**
- Modify: `src/styles/abstracts/_functions.scss`

**Step 1: Add utility functions**

```scss
// ===========================================
// SCSS FUNCTIONS
// ===========================================

// ===========================================
// UNIT FUNCTIONS
// ===========================================

// Convert pixels to rem
@function rem($pixels, $base: 16) {
  @return #{calc($pixels / $base)}rem;
}

// Convert pixels to em
@function em($pixels, $base: 16) {
  @return #{calc($pixels / $base)}em;
}

// Strip unit from value
@function strip-unit($value) {
  @return calc($value / ($value * 0 + 1));
}

// ===========================================
// MAP FUNCTIONS
// ===========================================

// Get value from nested map
@function map-deep-get($map, $keys...) {
  @each $key in $keys {
    @if type-of($map) != 'map' {
      @return null;
    }
    $map: map-get($map, $key);
  }
  @return $map;
}

// Check if value exists in list
@function list-contains($list, $value) {
  @return index($list, $value) != null;
}

// ===========================================
// STRING FUNCTIONS
// ===========================================

// Replace string
@function str-replace($string, $search, $replace: '') {
  $index: str-index($string, $search);

  @if $index {
    @return str-slice($string, 1, $index - 1) + $replace + str-replace(str-slice($string, $index + str-length($search)), $search, $replace);
  }

  @return $string;
}
```

**Step 2: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_functions.scss
git commit -m "feat(scss): add utility functions - unit conversion, maps, strings"
```

---

## Phase 2: Theme System

### Task 2.1: Define Theme CSS Variables

**Files:**
- Modify: `src/styles/themes/_variables.scss`

**Step 1: Document the existing CSS variable structure**

```scss
// ===========================================
// THEME CSS VARIABLES
// ===========================================
// NOTE: The actual CSS variables are defined in globals.css
// and modified at runtime by:
// - next-themes: Adds .dark class for dark mode
// - GradientThemeContext: Sets gradient-* variables
//
// This file provides SCSS structure for theme-aware styles.

// ===========================================
// THEME-AWARE STYLING PATTERN
// ===========================================
// When you need different styles for light/dark mode,
// use the CSS variables directly or the @include dark mixin.
//
// Example 1: Using CSS variables (preferred)
// .my-component {
//   background: hsl(var(--background));
//   color: hsl(var(--foreground));
// }
//
// Example 2: Using dark mixin for one-off overrides
// .my-component {
//   box-shadow: 0 2px 4px rgba(0,0,0,0.1);
//
//   @include dark {
//     box-shadow: 0 2px 4px rgba(0,0,0,0.5);
//   }
// }

// ===========================================
// AVAILABLE CSS VARIABLES (from globals.css)
// ===========================================
// Background/Foreground:
//   --background, --foreground
//   --card, --card-foreground
//   --popover, --popover-foreground
//
// Brand:
//   --primary, --primary-foreground
//   --secondary, --secondary-foreground
//
// Semantic:
//   --muted, --muted-foreground
//   --accent, --accent-foreground
//   --destructive, --destructive-foreground
//
// UI:
//   --border, --input, --ring
//   --radius (border radius base)
//
// Gradients (from GradientThemeContext):
//   --gradient-from, --gradient-via, --gradient-to
//   --accent-primary, --footer-bg
```

**Step 2: Commit**

```bash
git add sites/arolariu.ro/src/styles/themes/_variables.scss
git commit -m "docs(scss): document theme CSS variable system"
```

---

### Task 2.2: Create Theme Presets

**Files:**
- Modify: `src/styles/themes/_presets.scss`
- Modify: `src/contexts/GradientThemeContext.tsx`

**Step 1: Define preset color palettes (for GradientThemeContext)**

Create `themes/_presets.scss` (documentation for JavaScript presets):
```scss
// ===========================================
// THEME PRESETS
// ===========================================
// These presets are implemented in GradientThemeContext.tsx
// This file documents the available presets for reference.
//
// To add a new preset:
// 1. Add it to GRADIENT_PRESETS in GradientThemeContext.tsx
// 2. Document it here
// 3. Optionally add SCSS-specific overrides below

// ===========================================
// PRESET DEFINITIONS (Implemented in TypeScript)
// ===========================================
//
// DEFAULT:
//   from: #06b6d4 (cyan-500)
//   via: #8b5cf6 (purple-500)
//   to: #ec4899 (pink-500)
//
// OCEAN:
//   from: #0ea5e9 (sky-500)
//   via: #06b6d4 (cyan-500)
//   to: #14b8a6 (teal-500)
//
// SUNSET:
//   from: #f97316 (orange-500)
//   via: #ef4444 (red-500)
//   to: #ec4899 (pink-500)
//
// FOREST:
//   from: #22c55e (green-500)
//   via: #10b981 (emerald-500)
//   to: #14b8a6 (teal-500)
//
// PURPLE:
//   from: #8b5cf6 (violet-500)
//   via: #a855f7 (purple-500)
//   to: #d946ef (fuchsia-500)

// ===========================================
// PRESET-SPECIFIC SCSS OVERRIDES (optional)
// ===========================================
// Use data attributes set by GradientThemeContext if needed

[data-gradient-preset="ocean"] {
  // Ocean-specific overrides if needed
}

[data-gradient-preset="sunset"] {
  // Sunset-specific overrides if needed
}

[data-gradient-preset="forest"] {
  // Forest-specific overrides if needed
}

[data-gradient-preset="purple"] {
  // Purple-specific overrides if needed
}
```

**Step 2: Add presets to GradientThemeContext**

Modify `src/contexts/GradientThemeContext.tsx` - add after the existing types:

```typescript
// Add to the file after existing type definitions

export const GRADIENT_PRESETS = {
  default: {
    from: "#06b6d4", // cyan-500
    via: "#8b5cf6",  // purple-500
    to: "#ec4899",   // pink-500
  },
  ocean: {
    from: "#0ea5e9", // sky-500
    via: "#06b6d4",  // cyan-500
    to: "#14b8a6",   // teal-500
  },
  sunset: {
    from: "#f97316", // orange-500
    via: "#ef4444",  // red-500
    to: "#ec4899",   // pink-500
  },
  forest: {
    from: "#22c55e", // green-500
    via: "#10b981",  // emerald-500
    to: "#14b8a6",   // teal-500
  },
  purple: {
    from: "#8b5cf6", // violet-500
    via: "#a855f7",  // purple-500
    to: "#d946ef",   // fuchsia-500
  },
} as const;

export type GradientPreset = keyof typeof GRADIENT_PRESETS;
```

Update the context value interface:
```typescript
interface GradientThemeContextValue {
  // ... existing properties
  preset: GradientPreset | 'custom';
  setPreset: (preset: GradientPreset) => void;
  presets: typeof GRADIENT_PRESETS;
}
```

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/styles/themes/_presets.scss
git add sites/arolariu.ro/src/contexts/GradientThemeContext.tsx
git commit -m "feat(scss): add gradient theme presets system"
```

---

## Phase 3: Base Styles

### Task 3.1: Create CSS Reset

**Files:**
- Modify: `src/styles/base/_reset.scss`

**Step 1: Add modern CSS reset**

```scss
// ===========================================
// MODERN CSS RESET
// Based on Josh Comeau's CSS Reset
// ===========================================

// 1. Use border-box sizing
*,
*::before,
*::after {
  box-sizing: border-box;
}

// 2. Remove default margin
* {
  margin: 0;
}

// 3. Improve text rendering
body {
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

// 4. Improve media defaults
img,
picture,
video,
canvas,
svg {
  display: block;
  max-width: 100%;
}

// 5. Remove built-in form typography styles
input,
button,
textarea,
select {
  font: inherit;
}

// 6. Avoid text overflows
p,
h1,
h2,
h3,
h4,
h5,
h6 {
  overflow-wrap: break-word;
}

// 7. Create a root stacking context
#root,
#__next {
  isolation: isolate;
}

// 8. Remove list styles
ul,
ol {
  list-style: none;
  padding: 0;
}

// 9. Remove anchor underlines by default
a {
  text-decoration: none;
  color: inherit;
}

// 10. Button reset
button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

// 11. Table reset
table {
  border-collapse: collapse;
  border-spacing: 0;
}
```

**Step 2: Commit**

```bash
git add sites/arolariu.ro/src/styles/base/_reset.scss
git commit -m "feat(scss): add modern CSS reset"
```

---

### Task 3.2: Create Element Base Styles

**Files:**
- Modify: `src/styles/base/_elements.scss`

**Step 1: Add typography and element defaults**

```scss
// ===========================================
// BASE ELEMENT STYLES
// ===========================================
@use '../abstracts' as *;

// ===========================================
// BODY
// ===========================================
body {
  font-family: $font-family-default;
  font-size: font-size('base');
  font-weight: font-weight('normal');
  line-height: line-height('normal');
  color: hsl(var(--foreground));
  background-color: hsl(var(--background));
}

// ===========================================
// HEADINGS
// ===========================================
h1, h2, h3, h4, h5, h6 {
  font-weight: font-weight('semibold');
  line-height: line-height('tight');
  color: hsl(var(--foreground));
}

h1 {
  font-size: font-size('4xl');

  @include respond-to('md') {
    font-size: font-size('5xl');
  }
}

h2 {
  font-size: font-size('3xl');

  @include respond-to('md') {
    font-size: font-size('4xl');
  }
}

h3 {
  font-size: font-size('2xl');

  @include respond-to('md') {
    font-size: font-size('3xl');
  }
}

h4 {
  font-size: font-size('xl');

  @include respond-to('md') {
    font-size: font-size('2xl');
  }
}

h5 {
  font-size: font-size('lg');
}

h6 {
  font-size: font-size('base');
}

// ===========================================
// PARAGRAPHS
// ===========================================
p {
  margin-bottom: space(4);

  &:last-child {
    margin-bottom: 0;
  }
}

// ===========================================
// LINKS
// ===========================================
a {
  color: hsl(var(--primary));
  @include transition(color, opacity);

  &:hover {
    opacity: 0.8;
  }
}

// ===========================================
// CODE
// ===========================================
code {
  font-family: $font-family-mono;
  font-size: 0.875em;
  background-color: hsl(var(--muted));
  padding: 0.125rem 0.25rem;
  border-radius: radius('sm');
}

pre {
  font-family: $font-family-mono;
  font-size: font-size('sm');
  background-color: hsl(var(--muted));
  padding: space(4);
  border-radius: radius('lg');
  overflow-x: auto;

  code {
    background: none;
    padding: 0;
  }
}

// ===========================================
// OTHER ELEMENTS
// ===========================================
small {
  font-size: font-size('sm');
}

strong {
  font-weight: font-weight('semibold');
}

blockquote {
  border-left: 4px solid hsl(var(--border));
  padding-left: space(4);
  font-style: italic;
  color: hsl(var(--muted-foreground));
}

hr {
  border: none;
  border-top: 1px solid hsl(var(--border));
  margin: space(8) 0;
}

// ===========================================
// SELECTION
// ===========================================
::selection {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}
```

**Step 2: Commit**

```bash
git add sites/arolariu.ro/src/styles/base/_elements.scss
git commit -m "feat(scss): add base element styles"
```

---

## Phase 4: Animation System

### Task 4.1: Create Animation Keyframes

**Files:**
- Modify: `src/styles/animations/_keyframes.scss`

**Step 1: Add keyframe definitions**

```scss
// ===========================================
// ANIMATION KEYFRAMES
// ===========================================

// Accordion (for Radix UI components)
@keyframes accordion-down {
  from { height: 0; }
  to { height: var(--radix-accordion-content-height); }
}

@keyframes accordion-up {
  from { height: var(--radix-accordion-content-height); }
  to { height: 0; }
}

// Fade
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

// Slide
@keyframes slide-in-from-top {
  from { transform: translateY(-100%); }
  to { transform: translateY(0); }
}

@keyframes slide-in-from-bottom {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@keyframes slide-in-from-left {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

@keyframes slide-in-from-right {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

// Scale
@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes scale-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.95);
  }
}

// Decorative animations
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes glow {
  0%, 100% {
    box-shadow: 0 0 5px hsl(var(--gradient-from));
  }
  50% {
    box-shadow:
      0 0 20px hsl(var(--gradient-from)),
      0 0 30px hsl(var(--gradient-via));
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(-25%);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  50% {
    transform: translateY(0);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

**Step 2: Commit**

```bash
git add sites/arolariu.ro/src/styles/animations/_keyframes.scss
git commit -m "feat(scss): add animation keyframes"
```

---

### Task 4.2: Create Transition Utilities

**Files:**
- Modify: `src/styles/animations/_transitions.scss`

**Step 1: Add transition classes**

```scss
// ===========================================
// TRANSITION UTILITIES
// ===========================================

// Duration
.duration-75 { transition-duration: 75ms; }
.duration-100 { transition-duration: 100ms; }
.duration-150 { transition-duration: 150ms; }
.duration-200 { transition-duration: 200ms; }
.duration-300 { transition-duration: 300ms; }
.duration-500 { transition-duration: 500ms; }
.duration-700 { transition-duration: 700ms; }
.duration-1000 { transition-duration: 1000ms; }

// Timing function
.ease-linear { transition-timing-function: linear; }
.ease-in { transition-timing-function: cubic-bezier(0.4, 0, 1, 1); }
.ease-out { transition-timing-function: cubic-bezier(0, 0, 0.2, 1); }
.ease-in-out { transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }

// Transition property presets
.transition-none { transition-property: none; }

.transition-all {
  transition-property: all;
  transition-duration: 150ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.transition {
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
  transition-duration: 150ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.transition-colors {
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
  transition-duration: 150ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.transition-opacity {
  transition-property: opacity;
  transition-duration: 150ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.transition-shadow {
  transition-property: box-shadow;
  transition-duration: 150ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.transition-transform {
  transition-property: transform;
  transition-duration: 150ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

// Animation classes
.animate-accordion-down { animation: accordion-down 0.2s ease-out; }
.animate-accordion-up { animation: accordion-up 0.2s ease-out; }
.animate-fade-in { animation: fade-in 0.2s ease-out; }
.animate-fade-out { animation: fade-out 0.2s ease-out; }
.animate-scale-in { animation: scale-in 0.2s ease-out; }
.animate-scale-out { animation: scale-out 0.2s ease-out; }
.animate-float { animation: float 3s ease-in-out infinite; }
.animate-glow { animation: glow 2s ease-in-out infinite; }
.animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
.animate-spin { animation: spin 1s linear infinite; }
.animate-bounce { animation: bounce 1s infinite; }
.animate-shimmer { animation: shimmer 2s linear infinite; }

// Motion-safe: Respect reduced motion preference
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Step 2: Commit**

```bash
git add sites/arolariu.ro/src/styles/animations/_transitions.scss
git commit -m "feat(scss): add transition utilities with motion-safe handling"
```

---

## Phase 5: Finalization

### Task 5.1: Update main.scss Entry Point

**Files:**
- Modify: `src/styles/main.scss`

**Step 1: Finalize main.scss**

```scss
// ===========================================
// SCSS Entry Point - arolariu.ro
// ===========================================
// Architecture: 7-1 Pattern (adapted)
//
// This file is imported in layout.tsx AFTER:
// - @arolariu/components/styles.css (Tailwind-based component library)
// - globals.css (CSS variables for theming)
//
// SCSS styles should have higher specificity than Tailwind utilities
// for gradual migration purposes.

// ===========================================
// 1. ABSTRACTS (No CSS output)
// Variables, mixins, functions used by other partials
// ===========================================
@use 'abstracts' as *;

// ===========================================
// 2. BASE
// Reset, element defaults
// ===========================================
@use 'base';

// ===========================================
// 3. THEMES
// Theme variable documentation and preset-specific overrides
// (Actual CSS variables defined in globals.css)
// ===========================================
@use 'themes';

// ===========================================
// 4. ANIMATIONS
// Keyframes and transition utilities
// ===========================================
@use 'animations';

// ===========================================
// 5. UTILITIES (Optional - for gradual migration)
// Utility classes if needed during transition
// ===========================================
// @use 'utilities';

// ===========================================
// 6. COMPONENTS
// Shared component styles (BEM)
// ===========================================
// @use 'components';

// ===========================================
// 7. PAGES
// Page-specific global styles
// ===========================================
// @use 'pages';
```

**Step 2: Commit**

```bash
git add sites/arolariu.ro/src/styles/main.scss
git commit -m "chore(scss): finalize main.scss entry point"
```

---

### Task 5.2: Verify Complete Setup

**Files:**
- None (verification only)

**Step 1: Run development server**

Run: `npm run dev:website`
Expected: Server starts without SCSS errors

**Step 2: Verify CSS output**

Open browser DevTools, check that:
1. SCSS styles are being applied
2. CSS variables from globals.css still work
3. Dark mode toggle still works
4. Gradient theme context still applies colors

**Step 3: Run linting**

Run: `npm run lint`
Expected: No SCSS-related errors

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(scss): complete SCSS infrastructure setup"
```

---

## Summary

### Created Files

```
src/styles/
├── main.scss                    # Entry point
├── abstracts/
│   ├── _index.scss             # Forwards all abstracts
│   ├── _variables.scss         # Spacing, breakpoints, z-index, radius
│   ├── _typography.scss        # Font families, sizes, weights
│   ├── _colors.scss            # Color variable helpers
│   ├── _mixins.scss            # Responsive, flex, grid, effects
│   └── _functions.scss         # Utility functions
├── base/
│   ├── _index.scss             # Forwards base styles
│   ├── _reset.scss             # CSS reset
│   └── _elements.scss          # Element defaults
├── themes/
│   ├── _index.scss             # Forwards theme files
│   ├── _variables.scss         # Theme variable documentation
│   └── _presets.scss           # Gradient preset definitions
├── animations/
│   ├── _index.scss             # Forwards animations
│   ├── _keyframes.scss         # Animation definitions
│   └── _transitions.scss       # Transition utilities
├── utilities/                   # (Created but unused initially)
├── components/                  # (Created but unused initially)
└── pages/                       # (Created but unused initially)
```

### Integration Points

1. **next-themes**: Unchanged - continues to toggle `.dark` class
2. **GradientThemeContext**: Extended with presets
3. **FontContext**: Unchanged - SCSS uses `--font-default` and `--font-dyslexic`
4. **globals.css**: Unchanged - remains source of CSS variables
5. **@arolariu/components**: Unchanged - continues using Tailwind

### Next Steps

After implementing this infrastructure plan, proceed to the migration plan (`2026-02-05-scss-migration-strategy.md`) to begin converting Tailwind classes to SCSS.
