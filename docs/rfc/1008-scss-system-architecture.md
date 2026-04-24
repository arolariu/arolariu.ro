# RFC 1008: SCSS System Architecture

- **Status**: Implemented
- **Date**: 2026-02-08 (updated from 2026-02-05)
- **Authors**: Alexandru-Razvan Olariu
- **Related Components**: `sites/arolariu.ro/src/styles/`, SCSS Modules across `src/app/`

---

## Abstract

This RFC documents the SCSS Module system architecture for the arolariu.ro frontend. Built on the 7-1 pattern with CSS Modules for scoping, the system provides a scalable, maintainable approach to styling React components. The architecture enables gradual migration from Tailwind CSS while maintaining design consistency through shared variables, mixins, and functions.

Key features:
- **7-1 Pattern Architecture**: Organized SCSS partials for variables, mixins, base styles, themes, animations, and components
- **CSS Modules**: Scoped styles preventing class name collisions
- **Design Token Integration**: SCSS functions that reference CSS variables for theming
- **Mobile-First Responsive**: Comprehensive mixin library for responsive design
- **Tailwind Alignment**: Spacing scale and breakpoints match Tailwind for seamless migration
- **SassDoc Documentation**: All public APIs documented with `///` annotations (`@group`, `@param`, `@return`, `@example`)
- **Feature Flags**: Configurable system via `_config.scss` (fluid type, logical properties, container queries, etc.)

---

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

---

## 2. Technical Design

### 2.1 Architecture Overview (7-1 Pattern)

```text
sites/arolariu.ro/src/styles/
├── abstracts/                    # No CSS output - configuration only
│   ├── _index.scss              # Barrel export (@forward)
│   ├── _config.scss             # Feature flags, namespace prefix, defaults
│   ├── _variables.scss          # Spacing, breakpoints, z-index, radius, shadows, motion
│   ├── _colors.scss             # CSS variable references, color functions
│   ├── _typography.scss         # Font families, sizes, weights, line-heights
│   ├── _mixins.scss             # Responsive, flexbox, grid, effects, decorative
│   └── _functions.scss          # Unit converters, map utilities, string helpers
├── base/                         # Reset and element defaults
│   ├── _index.scss
│   ├── _reset.scss
│   └── _elements.scss
├── themes/                       # Theme documentation and presets
│   ├── _index.scss
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

// 6. Utilities - Utility classes
@use 'utilities';
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

1. `app/globals.scss` is imported in `layout.tsx`
2. `app/globals.scss` loads `src/styles/main.scss`
3. CSS Modules compiled with unique class names
4. Dart Sass used for SCSS compilation
5. CSS variables from `styles/base/_globals.scss` are available at runtime

---

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

---

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

// Reduced motion (accessibility)
// Usage: @include reduced-motion { animation: none; }
@mixin reduced-motion {
  @media (prefers-reduced-motion: reduce) {
    @content;
  }
}
```

### 4.6 Decorative Element Mixins

```scss
// Animated orb/blob background element
// Usage: @include orb(10rem, 48px, hsl(var(--primary) / 0.2))
@mixin orb($size: 10rem, $blur: 48px, $color: hsl(var(--primary) / 0.2)) {
  position: absolute;
  width: $size;
  height: $size;
  border-radius: 9999px;
  background-color: $color;
  filter: blur($blur);
  pointer-events: none;
}

// Image drop shadow (for illustrations/photos)
// Usage: @include image-drop-shadow
@mixin image-drop-shadow {
  filter: drop-shadow(0 10px 8px rgba(0, 0, 0, 0.04))
          drop-shadow(0 4px 3px rgba(0, 0, 0, 0.1));
}
```

### 4.7 Mixin Usage Examples

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

---

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

---

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

---

## 7. Theming Patterns

### 7.1 CSS Variables Architecture

Theme values are defined by the SCSS system (`app/globals.scss` + `styles/base/_globals.scss`) using CSS custom properties:

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

---

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

Use the `@include orb()` mixin for decorative blur orbs:

```scss
// Using the orb mixin (PREFERRED)
.orbPrimary {
  @include orb(10rem, 48px, hsl(var(--primary) / 0.2));
  top: -5rem;
  left: -5rem;
}

.orbSecondary {
  @include orb(8rem, 48px, rgb(168, 85, 247, 0.2));  // purple-500/20
  bottom: -5rem;
  right: -5rem;
}

// Manual implementation (if custom positioning needed)
.orbCustom {
  position: absolute;
  width: 10rem;
  height: 10rem;
  border-radius: 9999px;
  background-color: hsl(var(--primary) / 0.2);
  filter: blur(48px);
  pointer-events: none;
  // Position with top/left/right/bottom
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

### 8.7 Image and Illustration Styling

```scss
// Use the image-drop-shadow mixin for illustrations
.illustration {
  width: 100%;
  height: 100%;
  object-fit: contain;
  @include image-drop-shadow;
}

// Marketing card with illustration
.marketingImage {
  margin-left: auto;
  margin-right: auto;
  width: 12rem;
  height: 12rem;
  object-fit: contain;
  @include image-drop-shadow;

  @include respond-to('sm') {
    width: 14rem;
    height: 14rem;
  }
}
```

### 8.8 Accessibility Patterns

```scss
// Reduced motion support
.animatedElement {
  @include transition(transform);
  animation: pulse 2s infinite;

  @include reduced-motion {
    animation: none;
    transition: none;
  }
}

// Keyboard focus styles
.interactiveElement {
  @include focus-ring;
}
```

---

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

---

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
- Full SCSS power (variables, mixins, functions, nesting)
- Automatic scoping via CSS Modules
- No runtime overhead (compile-time only)
- Next.js native support
- Coexists with Tailwind during migration
- Familiar CSS syntax
- Type-safe class access with bracket notation

**Trade-offs:**
- Build-time compilation required
- Two styling systems during migration period
- Relative import paths for abstracts
- No TypeScript autocomplete for class names (minor)

### 10.3 Why 7-1 Pattern?

**Advantages:**
- Industry-standard organization
- Clear separation of concerns
- Scalable for large projects
- Easy to locate and modify styles
- Promotes DRY code with shared abstracts

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

---

## 11. File Locations

### 11.1 Core SCSS Infrastructure

| File | Purpose |
|------|---------|
| `src/styles/main.scss` | 7-1 pattern entry point |
| `src/styles/abstracts/_index.scss` | Barrel export for abstracts |
| `src/styles/abstracts/_config.scss` | Feature flags, namespace prefix, defaults |
| `src/styles/abstracts/_variables.scss` | Spacing, breakpoints, z-index, radius, shadows, motion |
| `src/styles/abstracts/_colors.scss` | CSS variable helpers, static/interactive colors |
| `src/styles/abstracts/_typography.scss` | Font families, sizes, weights, heights, spacing |
| `src/styles/abstracts/_mixins.scss` | 30+ mixins (responsive, layout, visual, a11y, decorative) |
| `src/styles/abstracts/_functions.scss` | Unit conversion, map/list/string utilities |
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
- [CLAUDE.md](https://github.com/arolariu/arolariu.ro/blob/main/CLAUDE.md) - Project development guide

---

## 12. Documentation Standards

### 12.1 SassDoc Annotations

All public SCSS APIs (variables, functions, mixins) are documented using [SassDoc](http://sassdoc.com/) triple-slash (`///`) comment syntax. This enables automated documentation generation and IDE support.

**Required annotations for functions:**
```scss
/// Get a spacing value by its scale key.
/// @param {Number} $key - Scale key (e.g. 4, 8, 12)
/// @return {Length} The rem-based spacing value
/// @throws Unknown spacing key: #{$key}
/// @group tokens-spacing
/// @example scss
///   padding: space(4);     // → 1rem
@function space($key) { ... }
```

**Required annotations for mixins:**
```scss
/// Mobile-first responsive breakpoint mixin.
/// @param {String} $breakpoint - Breakpoint name (e.g. 'sm', 'md', 'lg')
/// @content Styles to apply at and above this breakpoint
/// @throws Unknown breakpoint: #{$breakpoint}
/// @group mixins-responsive
/// @example scss
///   .sidebar {
///     @include respond-to('lg') { display: block; }
///   }
@mixin respond-to($breakpoint) { ... }
```

**Required annotations for variables/maps:**
```scss
/// Spacing scale map — matches Tailwind usage patterns.
/// @type Map
/// @group tokens-spacing
/// @prop {Length} 0 [0] - No spacing
/// @prop {Length} 4 [1rem] - 16px (base)
$spacing: ( ... );
```

### 12.2 SassDoc Groups

| Group | File | Description |
|-------|------|-------------|
| `config` | `_config.scss` | Feature flags and global settings |
| `tokens` | `_variables.scss` | File-level overview |
| `tokens-spacing` | `_variables.scss` | Spacing scale tokens |
| `tokens-breakpoints` | `_variables.scss` | Responsive breakpoints |
| `tokens-z-index` | `_variables.scss` | Z-index layering system |
| `tokens-radius` | `_variables.scss` | Border radius tokens |
| `tokens-shadows` | `_variables.scss` | Shadow elevation tokens |
| `tokens-motion` | `_variables.scss` | Duration and easing tokens |
| `tokens-colors` | `_colors.scss` | Color system (CSS var refs + static) |
| `tokens-typography` | `_typography.scss` | Font sizes, weights, heights, spacing |
| `functions` | `_functions.scss` | Unit conversion and utility functions |
| `mixins-responsive` | `_mixins.scss` | Breakpoint media query mixins |
| `mixins-layout` | `_mixins.scss` | Flex, grid, container mixins |
| `mixins-visual` | `_mixins.scss` | Shadow, transition, gradient mixins |
| `mixins-utility` | `_mixins.scss` | Truncate, dark mode, content-visibility |
| `mixins-a11y` | `_mixins.scss` | Visually-hidden, focus-ring, reduced-motion |
| `mixins-decorative` | `_mixins.scss` | Orb, accent-bar, icon-color variants |

### 12.3 Shadow Elevation Guide

The shadow system uses a 6-level elevation scale inspired by Material Design 3:

| Level | Elevation | Use Case | Example Component |
|-------|-----------|----------|-------------------|
| `none` | 0dp | Flat elements, no depth | Inline text, flat buttons |
| `sm` | 1dp | Subtle resting depth | Cards at rest, input fields |
| `md` | 3dp | Standard raised surface | Raised cards, dropdowns |
| `lg` | 6dp | Elevated interactive state | Hovered cards, popovers |
| `xl` | 12dp | High-emphasis surface | Modals, dialogs |
| `2xl` | 24dp | Maximum emphasis | Full-screen overlays |

**Usage pattern:**
```scss
// At rest: use 'sm' or 'md'
.card { @include shadow('sm'); }

// On hover: elevate to 'lg' or 'xl'
.card:hover { @include shadow('lg'); }

// Modal/dialog: use 'xl'
.modal { @include shadow('xl'); }
```

Dark mode shadows use stronger opacity (0.3-0.6 vs 0.05-0.25) for visibility against dark backgrounds. The `shadow()` mixin handles this automatically.

---

## 13. Configuration System

### 13.1 Feature Flags (`_config.scss`)

The design system supports compile-time feature flags:

| Flag | Default | Purpose |
|------|---------|---------|
| `$enable-fluid-type` | `true` | Enable `clamp()`-based fluid typography |
| `$enable-logical-properties` | `true` | Enable `margin-inline` / `padding-block` |
| `$enable-container-queries` | `true` | Enable CSS container queries |
| `$enable-reduced-motion` | `true` | Enable `prefers-reduced-motion` wrappers |
| `$enable-high-contrast` | `true` | Enable high-contrast mode adjustments |
| `$enable-print-styles` | `true` | Enable print stylesheet generation |
| `$enable-css-layers` | `true` | Enable CSS `@layer` for cascade control |

### 13.2 Overriding Defaults

Consumer modules can override configuration:
```scss
@use 'abstracts' with ($enable-fluid-type: false, $css-prefix: 'custom');
```
