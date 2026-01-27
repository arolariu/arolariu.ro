# TailwindCSS to SCSS Migration - Detailed Implementation Guide

**Document Type:** Low-Level Technical Implementation Guide  
**Created:** 2026-01-26  
**Status:** Implementation Ready  
**Companion to:** RFC 3001

---

## Table of Contents

1. [Pre-Migration Setup](#pre-migration-setup)
2. [Component-by-Component Migration Guide](#component-by-component-migration-guide)
3. [Common Pattern Translations](#common-pattern-translations)
4. [Testing Procedures](#testing-procedures)
5. [Troubleshooting Guide](#troubleshooting-guide)
6. [Performance Optimization](#performance-optimization)

---

## Pre-Migration Setup

### Step 1: Install SCSS Support

```bash
cd /home/runner/work/arolariu.ro/arolariu.ro/sites/arolariu.ro

# SCSS is built into Next.js, no additional package needed
# But verify sass is available
npm install -D sass@^1.87.0
```

### Step 2: Create SCSS Directory Structure

```bash
# Create main styles directory
mkdir -p src/styles/{base,abstracts,tokens,layout,components,utilities,animations,themes}

# Create subdirectories
mkdir -p src/styles/tokens
mkdir -p src/styles/abstracts
```

### Step 3: Initialize Core SCSS Files

#### `src/styles/index.scss`

```scss
/**
 * Main SCSS Entry Point
 * 
 * Import order matters:
 * 1. Abstracts (variables, functions, mixins) - no CSS output
 * 2. Tokens (design system) - CSS custom properties
 * 3. Base (reset, typography) - element defaults
 * 4. Layout (grid, container) - structural utilities
 * 5. Components (reusable components) - component styles
 * 6. Themes (light, dark) - theme overrides
 * 7. Utilities (helpers) - utility classes
 * 8. Animations (keyframes) - animation definitions
 */

// 1. Abstracts (no output)
@use 'abstracts/variables';
@use 'abstracts/functions';
@use 'abstracts/mixins';

// 2. Design Tokens (CSS custom properties)
@use 'tokens/colors';
@use 'tokens/typography';
@use 'tokens/spacing';
@use 'tokens/shadows';
@use 'tokens/borders';
@use 'tokens/transitions';
@use 'tokens/z-index';

// 3. Base Styles
@use 'base/reset';
@use 'base/typography';
@use 'base/forms';
@use 'base/accessibility';

// 4. Layout
@use 'layout/breakpoints';
@use 'layout/grid';
@use 'layout/flexbox';
@use 'layout/container';

// 5. Components (global)
@use 'components/buttons';
@use 'components/cards';
@use 'components/forms';
@use 'components/tables';
@use 'components/navigation';

// 6. Themes
@use 'themes/light';
@use 'themes/dark';
@use 'themes/gradients';

// 7. Utilities (sparingly)
@use 'utilities/display';
@use 'utilities/spacing';
@use 'utilities/text';
@use 'utilities/visibility';

// 8. Animations
@use 'animations/keyframes';
@use 'animations/transitions';
```

#### `src/styles/tokens/_colors.scss`

```scss
/**
 * Color Design Tokens
 * 
 * Naming convention: $color-{semantic-name}-{shade}
 * All colors are HSL-based for easy manipulation
 */

// ============================================================================
// PRIMARY PALETTE
// ============================================================================

// Primary (Blue) - Main brand color
$color-primary-50: hsl(221, 83%, 95%);
$color-primary-100: hsl(221, 83%, 90%);
$color-primary-200: hsl(221, 83%, 80%);
$color-primary-300: hsl(221, 83%, 70%);
$color-primary-400: hsl(221, 83%, 60%);
$color-primary-500: hsl(221, 83%, 53%);  // Base
$color-primary-600: hsl(221, 83%, 45%);
$color-primary-700: hsl(221, 83%, 35%);
$color-primary-800: hsl(221, 83%, 25%);
$color-primary-900: hsl(221, 83%, 15%);

// Secondary (Gray) - Supporting color
$color-secondary-50: hsl(210, 40%, 98%);
$color-secondary-100: hsl(210, 40%, 96%);
$color-secondary-200: hsl(210, 40%, 90%);
$color-secondary-300: hsl(210, 40%, 80%);
$color-secondary-400: hsl(210, 40%, 70%);
$color-secondary-500: hsl(210, 40%, 60%);
$color-secondary-600: hsl(210, 40%, 50%);
$color-secondary-700: hsl(210, 40%, 40%);
$color-secondary-800: hsl(210, 40%, 30%);
$color-secondary-900: hsl(210, 40%, 20%);

// ============================================================================
// SEMANTIC COLORS (Light Mode Defaults)
// ============================================================================

$color-background: hsl(0, 0%, 100%);
$color-foreground: hsl(222, 84%, 5%);
$color-card: hsl(0, 0%, 100%);
$color-card-foreground: hsl(222, 84%, 5%);
$color-popover: hsl(0, 0%, 100%);
$color-popover-foreground: hsl(222, 84%, 5%);
$color-muted: hsl(210, 40%, 96%);
$color-muted-foreground: hsl(215, 16%, 47%);
$color-accent: hsl(210, 40%, 96%);
$color-accent-foreground: hsl(222, 47%, 11%);
$color-border: hsl(214, 32%, 91%);
$color-input: hsl(214, 32%, 91%);
$color-ring: $color-primary-500;

// ============================================================================
// STATE COLORS
// ============================================================================

// Success (Green)
$color-success: hsl(142, 71%, 45%);
$color-success-foreground: hsl(0, 0%, 100%);

// Warning (Yellow)
$color-warning: hsl(45, 93%, 47%);
$color-warning-foreground: hsl(0, 0%, 0%);

// Error/Destructive (Red)
$color-error: hsl(0, 84%, 60%);
$color-error-foreground: hsl(210, 40%, 98%);

// Info (Blue)
$color-info: hsl(199, 89%, 48%);
$color-info-foreground: hsl(0, 0%, 100%);

// ============================================================================
// GRADIENT THEME (User Customizable)
// ============================================================================

$color-gradient-from: hsl(187, 94%, 43%);  // Cyan-500
$color-gradient-via: hsl(262, 83%, 58%);   // Purple-500
$color-gradient-to: hsl(330, 81%, 60%);    // Pink-500

// Derived gradient colors
$color-accent-primary: $color-gradient-from;
$color-footer-bg: hsl(262, 83%, 35%);      // Darker purple

// ============================================================================
// DARK MODE OVERRIDES
// ============================================================================

$color-background-dark: hsl(0, 0%, 0%);
$color-foreground-dark: hsl(0, 0%, 100%);
$color-card-dark: hsl(0, 0%, 5%);
$color-card-foreground-dark: hsl(0, 0%, 100%);
$color-popover-dark: hsl(0, 0%, 5%);
$color-popover-foreground-dark: hsl(0, 0%, 100%);
$color-muted-dark: hsl(0, 0%, 15%);
$color-muted-foreground-dark: hsl(0, 0%, 70%);
$color-accent-dark: $color-primary-600;
$color-accent-foreground-dark: hsl(0, 0%, 100%);
$color-border-dark: hsl(0, 0%, 20%);
$color-input-dark: hsl(0, 0%, 20%);
$color-ring-dark: $color-primary-600;

// ============================================================================
// UTILITY: Color Functions
// ============================================================================

@function lighten-color($color, $amount) {
  @return hsl(
    hue($color),
    saturation($color),
    lightness($color) + $amount
  );
}

@function darken-color($color, $amount) {
  @return hsl(
    hue($color),
    saturation($color),
    lightness($color) - $amount
  );
}

@function alpha-color($color, $alpha) {
  @return hsla(
    hue($color),
    saturation($color),
    lightness($color),
    $alpha
  );
}
```

#### `src/styles/tokens/_typography.scss`

```scss
/**
 * Typography Design Tokens
 */

// ============================================================================
// FONT FAMILIES
// ============================================================================

$font-family-base: var(--font-default), -apple-system, BlinkMacSystemFont,
  'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
$font-family-dyslexic: var(--font-dyslexic), 'OpenDyslexic', $font-family-base;
$font-family-mono: 'Fira Code', 'SF Mono', Monaco, 'Cascadia Code',
  'Roboto Mono', 'Courier New', monospace;

// ============================================================================
// FONT SIZES (Type Scale: Major Third - 1.250 ratio)
// ============================================================================

$font-size-xs: 0.75rem;      // 12px
$font-size-sm: 0.875rem;     // 14px
$font-size-base: 1rem;       // 16px (root)
$font-size-lg: 1.125rem;     // 18px
$font-size-xl: 1.25rem;      // 20px
$font-size-2xl: 1.5rem;      // 24px
$font-size-3xl: 1.875rem;    // 30px
$font-size-4xl: 2.25rem;     // 36px
$font-size-5xl: 3rem;        // 48px
$font-size-6xl: 3.75rem;     // 60px
$font-size-7xl: 4.5rem;      // 72px

// ============================================================================
// FONT WEIGHTS
// ============================================================================

$font-weight-normal: 400;
$font-weight-medium: 500;
$font-weight-semibold: 600;
$font-weight-bold: 700;
$font-weight-extrabold: 800;

// ============================================================================
// LINE HEIGHTS
// ============================================================================

$line-height-none: 1;
$line-height-tight: 1.25;
$line-height-snug: 1.375;
$line-height-normal: 1.5;
$line-height-relaxed: 1.625;
$line-height-loose: 2;

// ============================================================================
// LETTER SPACING
// ============================================================================

$letter-spacing-tighter: -0.05em;
$letter-spacing-tight: -0.025em;
$letter-spacing-normal: 0;
$letter-spacing-wide: 0.025em;
$letter-spacing-wider: 0.05em;
$letter-spacing-widest: 0.1em;

// ============================================================================
// TEXT TRANSFORMS (Utility)
// ============================================================================

@mixin text-uppercase {
  text-transform: uppercase;
  letter-spacing: $letter-spacing-wide;
}

@mixin text-capitalize {
  text-transform: capitalize;
}

@mixin text-lowercase {
  text-transform: lowercase;
}
```

#### `src/styles/tokens/_spacing.scss`

```scss
/**
 * Spacing Design Tokens
 * Base unit: 4px (0.25rem)
 */

// ============================================================================
// SPACING SCALE (8-point grid system)
// ============================================================================

$spacing-0: 0;
$spacing-px: 1px;
$spacing-0_5: 0.125rem;  // 2px
$spacing-1: 0.25rem;     // 4px
$spacing-1_5: 0.375rem;  // 6px
$spacing-2: 0.5rem;      // 8px
$spacing-2_5: 0.625rem;  // 10px
$spacing-3: 0.75rem;     // 12px
$spacing-3_5: 0.875rem;  // 14px
$spacing-4: 1rem;        // 16px
$spacing-5: 1.25rem;     // 20px
$spacing-6: 1.5rem;      // 24px
$spacing-7: 1.75rem;     // 28px
$spacing-8: 2rem;        // 32px
$spacing-9: 2.25rem;     // 36px
$spacing-10: 2.5rem;     // 40px
$spacing-11: 2.75rem;    // 44px
$spacing-12: 3rem;       // 48px
$spacing-14: 3.5rem;     // 56px
$spacing-16: 4rem;       // 64px
$spacing-20: 5rem;       // 80px
$spacing-24: 6rem;       // 96px
$spacing-28: 7rem;       // 112px
$spacing-32: 8rem;       // 128px
$spacing-36: 9rem;       // 144px
$spacing-40: 10rem;      // 160px
$spacing-44: 11rem;      // 176px
$spacing-48: 12rem;      // 192px
$spacing-52: 13rem;      // 208px
$spacing-56: 14rem;      // 224px
$spacing-60: 15rem;      // 240px
$spacing-64: 16rem;      // 256px
$spacing-72: 18rem;      // 288px
$spacing-80: 20rem;      // 320px
$spacing-96: 24rem;      // 384px

// ============================================================================
// CONTAINER PADDING (Responsive)
// ============================================================================

$container-padding-2xsm: $spacing-4;   // 16px
$container-padding-sm: $spacing-4;     // 16px
$container-padding-md: $spacing-6;     // 24px
$container-padding-lg: $spacing-8;     // 32px
$container-padding-xl: $spacing-8;     // 32px
$container-padding-2xl: $spacing-8;    // 32px
```

#### `src/styles/layout/_breakpoints.scss`

```scss
/**
 * Responsive Breakpoints & Media Query Mixins
 */

// ============================================================================
// BREAKPOINT TOKENS
// ============================================================================

$breakpoint-2xsm: 320px;   // Extra small mobile
$breakpoint-xsm: 480px;    // Small mobile
$breakpoint-sm: 640px;     // Tablet portrait
$breakpoint-md: 768px;     // Tablet landscape
$breakpoint-lg: 1024px;    // Laptop
$breakpoint-xl: 1280px;    // Desktop
$breakpoint-2xl: 1440px;   // Large desktop
$breakpoint-3xl: 1976px;   // Ultra-wide

// ============================================================================
// MEDIA QUERY MIXINS (Min-Width - Mobile First)
// ============================================================================

@mixin media-2xsm-up {
  @media (min-width: $breakpoint-2xsm) {
    @content;
  }
}

@mixin media-xsm-up {
  @media (min-width: $breakpoint-xsm) {
    @content;
  }
}

@mixin media-sm-up {
  @media (min-width: $breakpoint-sm) {
    @content;
  }
}

@mixin media-md-up {
  @media (min-width: $breakpoint-md) {
    @content;
  }
}

@mixin media-lg-up {
  @media (min-width: $breakpoint-lg) {
    @content;
  }
}

@mixin media-xl-up {
  @media (min-width: $breakpoint-xl) {
    @content;
  }
}

@mixin media-2xl-up {
  @media (min-width: $breakpoint-2xl) {
    @content;
  }
}

@mixin media-3xl-up {
  @media (min-width: $breakpoint-3xl) {
    @content;
  }
}

// ============================================================================
// MAX-WIDTH MIXINS (Desktop First - Use Sparingly)
// ============================================================================

@mixin media-max($breakpoint) {
  @media (max-width: ($breakpoint - 1px)) {
    @content;
  }
}

@mixin media-2xsm-down {
  @include media-max($breakpoint-xsm) {
    @content;
  }
}

@mixin media-xsm-down {
  @include media-max($breakpoint-sm) {
    @content;
  }
}

@mixin media-sm-down {
  @include media-max($breakpoint-md) {
    @content;
  }
}

@mixin media-md-down {
  @include media-max($breakpoint-lg) {
    @content;
  }
}

@mixin media-lg-down {
  @include media-max($breakpoint-xl) {
    @content;
  }
}

// ============================================================================
// RANGE MIXINS (Between Breakpoints)
// ============================================================================

@mixin media-between($min, $max) {
  @media (min-width: $min) and (max-width: ($max - 1px)) {
    @content;
  }
}

@mixin media-sm-to-md {
  @include media-between($breakpoint-sm, $breakpoint-lg) {
    @content;
  }
}

@mixin media-md-to-lg {
  @include media-between($breakpoint-md, $breakpoint-xl) {
    @content;
  }
}

// ============================================================================
// ORIENTATION MIXINS
// ============================================================================

@mixin media-landscape {
  @media (orientation: landscape) {
    @content;
  }
}

@mixin media-portrait {
  @media (orientation: portrait) {
    @content;
  }
}

// ============================================================================
// MOTION PREFERENCE
// ============================================================================

@mixin media-reduce-motion {
  @media (prefers-reduced-motion: reduce) {
    @content;
  }
}

@mixin media-allow-motion {
  @media (prefers-reduced-motion: no-preference) {
    @content;
  }
}

// ============================================================================
// HOVER CAPABILITY
// ============================================================================

@mixin media-hover {
  @media (hover: hover) and (pointer: fine) {
    @content;
  }
}

@mixin media-no-hover {
  @media (hover: none) and (pointer: coarse) {
    @content;
  }
}
```

#### `src/styles/abstracts/_mixins.scss`

```scss
/**
 * SCSS Mixins - Reusable Style Patterns
 */

@use '../tokens/spacing' as s;
@use '../tokens/typography' as t;
@use '../tokens/shadows' as sh;

// ============================================================================
// LAYOUT MIXINS
// ============================================================================

@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

@mixin flex-start {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

@mixin flex-end {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

@mixin flex-column {
  display: flex;
  flex-direction: column;
}

@mixin grid-auto-fit($min-width: 250px, $gap: s.$spacing-4) {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax($min-width, 1fr));
  gap: $gap;
}

@mixin grid-auto-fill($min-width: 250px, $gap: s.$spacing-4) {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax($min-width, 1fr));
  gap: $gap;
}

// ============================================================================
// TEXT MIXINS
// ============================================================================

@mixin text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@mixin text-truncate-lines($lines: 2) {
  display: -webkit-box;
  -webkit-line-clamp: $lines;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

@mixin text-balance {
  text-wrap: balance;
}

@mixin text-pretty {
  text-wrap: pretty;
}

// ============================================================================
// ACCESSIBILITY MIXINS
// ============================================================================

@mixin visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

@mixin focus-visible {
  &:focus-visible {
    outline: 2px solid var(--color-ring);
    outline-offset: 2px;
  }
}

@mixin focus-ring {
  outline: 2px solid var(--color-ring);
  outline-offset: 2px;
}

// ============================================================================
// INTERACTION MIXINS
// ============================================================================

@mixin hover-scale($scale: 1.05) {
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale($scale);
  }
}

@mixin hover-lift($offset: -2px) {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: translateY($offset);
    box-shadow: sh.$shadow-md;
  }
}

// ============================================================================
// CARD MIXINS
// ============================================================================

@mixin card {
  background-color: var(--color-card);
  color: var(--color-card-foreground);
  border-radius: var(--radius);
  box-shadow: sh.$shadow-sm;
  padding: s.$spacing-6;
}

@mixin card-hover {
  @include card;
  transition: box-shadow 0.3s ease, transform 0.3s ease;
  
  &:hover {
    box-shadow: sh.$shadow-md;
    transform: translateY(-2px);
  }
}

// ============================================================================
// BUTTON MIXINS
// ============================================================================

@mixin button-base {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: s.$spacing-2;
  border-radius: var(--radius);
  font-weight: t.$font-weight-medium;
  font-size: t.$font-size-sm;
  line-height: t.$line-height-normal;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
  
  @include focus-visible;
}

@mixin button-size-sm {
  height: 36px;
  padding: 0 s.$spacing-3;
  font-size: t.$font-size-xs;
}

@mixin button-size-md {
  height: 40px;
  padding: 0 s.$spacing-4;
  font-size: t.$font-size-sm;
}

@mixin button-size-lg {
  height: 44px;
  padding: 0 s.$spacing-6;
  font-size: t.$font-size-base;
}

// ============================================================================
// ANIMATION MIXINS
// ============================================================================

@mixin transition-base($properties...) {
  $transition-list: ();
  
  @each $property in $properties {
    $transition-list: append($transition-list, #{$property} 0.2s ease, comma);
  }
  
  transition: $transition-list;
}

@mixin animate-fade-in($duration: 0.3s) {
  animation: fade-in $duration ease;
}

@mixin animate-slide-up($duration: 0.3s) {
  animation: slide-up $duration ease;
}

@mixin animate-slide-down($duration: 0.3s) {
  animation: slide-down $duration ease;
}

// ============================================================================
// CONTAINER MIXINS
// ============================================================================

@mixin container {
  width: 100%;
  max-width: 1440px; // 2xl breakpoint
  margin-left: auto;
  margin-right: auto;
  padding-left: s.$spacing-4;
  padding-right: s.$spacing-4;
  
  @media (min-width: 640px) {
    padding-left: s.$spacing-6;
    padding-right: s.$spacing-6;
  }
  
  @media (min-width: 1024px) {
    padding-left: s.$spacing-8;
    padding-right: s.$spacing-8;
  }
}

// ============================================================================
// ASPECT RATIO MIXIN
// ============================================================================

@mixin aspect-ratio($width, $height) {
  aspect-ratio: #{$width} / #{$height};
}

// ============================================================================
// BACKDROP BLUR
// ============================================================================

@mixin backdrop-blur($amount: 10px) {
  backdrop-filter: blur($amount);
  -webkit-backdrop-filter: blur($amount);
}
```

### Step 4: Update Next.js Configuration

#### Modify `src/app/globals.css`

```css
/**
 * Global Styles Entry Point
 * 
 * This file is imported in layout.tsx and provides:
 * 1. SCSS design system import
 * 2. CSS custom properties (theme variables)
 * 3. Global element resets
 */

/* Import SCSS Design System */
@import '../styles/index.scss';

/* CSS Custom Properties for Dynamic Theming */
@layer base {
  :root {
    /* Semantic colors */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
    
    /* Gradient theme (user customizable) */
    --gradient-from: 187 94% 43%;
    --gradient-via: 262 83% 58%;
    --gradient-to: 330 81% 60%;
    --accent-primary: var(--gradient-from);
    --footer-bg: 262 83% 35%;
  }
  
  .dark {
    --background: 0 0% 0%;
    --foreground: 0 0% 100%;
    --card: 0 0% 5%;
    --card-foreground: 0 0% 100%;
    --popover: 0 0% 5%;
    --popover-foreground: 0 0% 100%;
    --primary: 214 100% 50%;
    --primary-foreground: 0 0% 100%;
    --secondary: 0 0% 10%;
    --secondary-foreground: 0 0% 100%;
    --muted: 0 0% 15%;
    --muted-foreground: 0 0% 70%;
    --accent: 214 100% 50%;
    --accent-foreground: 0 0% 100%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 100%;
    --border: 0 0% 20%;
    --input: 0 0% 20%;
    --ring: 214 100% 50%;
    
    /* Same gradient theme in dark mode */
    --gradient-from: 187 94% 43%;
    --gradient-via: 262 83% 58%;
    --gradient-to: 330 81% 60%;
    --accent-primary: var(--gradient-from);
    --footer-bg: 262 83% 35%;
  }
}

/* Reduced Motion Preferences */
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

/* Print Styles */
@media print {
  .print\\:hidden {
    display: none !important;
  }
}
```

#### Update `postcss.config.js`

```javascript
/**
 * PostCSS Configuration
 * 
 * Why we still need PostCSS:
 * - autoprefixer: Adds vendor prefixes automatically
 * - cssnano: CSS minification and optimization
 * 
 * Next.js expects PostCSS for its CSS processing pipeline
 */

const postcssConfig = {
  plugins: {
    // Add vendor prefixes (e.g., -webkit-, -moz-)
    autoprefixer: {},
    
    // Minify CSS in production builds
    cssnano: process.env.NODE_ENV === 'production' ? {
      preset: ['default', {
        discardComments: {
          removeAll: true,
        },
        normalizeWhitespace: true,
        colormin: true,
        minifyFontValues: true,
        minifyGradients: true,
      }],
    } : false,
  },
};

export default postcssConfig;
```

**Install Required Packages:**
```bash
npm install -D autoprefixer cssnano
```

---

## Component-by-Component Migration Guide

### Migration Template

For each component, follow this pattern:

1. **Create SCSS Module**
2. **Map Tailwind Classes to SCSS**
3. **Import and Apply Styles**
4. **Test Responsiveness**
5. **Verify Dark Mode**
6. **Check Accessibility**

### Example: Header Component Migration

#### Before (Tailwind)

```tsx
// components/Header.tsx
"use client";

import logo from "@/app/logo.svg";
import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <header className="print:hidden">
      <nav className="navbar 2xsm:fixed 2xsm:top-0 2xsm:z-50 bg-white text-black lg:relative lg:z-auto dark:bg-black dark:text-white">
        <div className="navbar-start flex flex-row flex-nowrap">
          <Link
            href="/"
            className="ml-2 flex items-center font-medium hover:text-yellow-300"
          >
            <Image
              src={logo}
              alt="arolariu.ro logo"
              className="2xsm:hidden rounded-full ring-2 ring-indigo-500 lg:block"
              width={40}
              height={40}
            />
            <span className="ml-3 text-xl">arolariu.ro</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
```

#### After (SCSS Modules)

```tsx
// components/Header/Header.tsx
"use client";

import styles from './Header.module.scss';
import logo from "@/app/logo.svg";
import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <div className={styles.navStart}>
          <Link href="/" className={styles.logo}>
            <Image
              src={logo}
              alt="arolariu.ro logo"
              className={styles.logoImage}
              width={40}
              height={40}
            />
            <span className={styles.logoText}>arolariu.ro</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
```

```scss
// components/Header/Header.module.scss
@use '@/styles/tokens/colors' as c;
@use '@/styles/tokens/spacing' as s;
@use '@/styles/tokens/typography' as t;
@use '@/styles/layout/breakpoints' as bp;

.header {
  @media print {
    display: none;
  }
}

.nav {
  background-color: var(--color-background);
  color: var(--color-foreground);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  
  @include bp.media-lg-up {
    position: relative;
    z-index: auto;
  }
}

.navStart {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
}

.logo {
  margin-left: s.$spacing-2;
  display: flex;
  align-items: center;
  font-weight: t.$font-weight-medium;
  transition: color 0.2s ease;
  
  &:hover {
    color: hsl(45, 93%, 47%); // Yellow-300
  }
}

.logoImage {
  border-radius: 50%;
  box-shadow: 0 0 0 2px hsl(221, 83%, 53%); // Indigo-500
  
  @include bp.media-max(bp.$breakpoint-lg) {
    display: none;
  }
  
  @include bp.media-lg-up {
    display: block;
  }
}

.logoText {
  margin-left: s.$spacing-3;
  font-size: t.$font-size-xl;
}
```

---

## Common Pattern Translations

### Tailwind to SCSS Cheat Sheet

| Tailwind Class | SCSS Equivalent |
|----------------|-----------------|
| `flex items-center gap-2` | `display: flex; align-items: center; gap: $spacing-2;` |
| `space-y-4` | `> * + * { margin-top: $spacing-4; }` |
| `text-sm font-medium` | `font-size: $font-size-sm; font-weight: $font-weight-medium;` |
| `bg-white dark:bg-black` | `background-color: var(--color-background);` |
| `hover:text-yellow-500` | `&:hover { color: hsl(45, 93%, 47%); }` |
| `rounded-md` | `border-radius: calc(var(--radius) - 2px);` |
| `shadow-md` | `box-shadow: $shadow-md;` |
| `transition duration-300` | `transition: all 0.3s ease;` |
| `grid grid-cols-2 gap-4` | `display: grid; grid-template-columns: repeat(2, 1fr); gap: $spacing-4;` |
| `hidden sm:block` | `display: none; @include media-sm-up { display: block; }` |

### Complex Pattern Migrations

#### Responsive Grid

**Tailwind:**
```tsx
<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
  <div className="lg:col-span-3">Sidebar</div>
  <div className="lg:col-span-6">Main</div>
  <div className="lg:col-span-3">Aside</div>
</div>
```

**SCSS:**
```scss
// styles.module.scss
.grid {
  display: grid;
  gap: s.$spacing-6;
  grid-template-columns: 1fr;
  
  @include bp.media-lg-up {
    grid-template-columns: repeat(12, 1fr);
  }
}

.sidebar {
  @include bp.media-lg-up {
    grid-column: span 3;
  }
}

.main {
  @include bp.media-lg-up {
    grid-column: span 6;
  }
}

.aside {
  @include bp.media-lg-up {
    grid-column: span 3;
  }
}
```

```tsx
// Component
<div className={styles.grid}>
  <div className={styles.sidebar}>Sidebar</div>
  <div className={styles.main}>Main</div>
  <div className={styles.aside}>Aside</div>
</div>
```

#### Animated Components

**Tailwind:**
```tsx
<div className="animate-in slide-in-from-bottom-4 duration-500">
  Content
</div>
```

**SCSS:**
```scss
// animations/_keyframes.scss
@keyframes slideInFromBottom {
  from {
    transform: translateY(1rem);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

// Component module
.animatedCard {
  animation: slideInFromBottom 0.5s ease;
}
```

#### Dark Mode Styles

**Tailwind:**
```tsx
<div className="bg-white text-black dark:bg-black dark:text-white">
  Content
</div>
```

**SCSS:**
```scss
.container {
  background-color: var(--color-background);
  color: var(--color-foreground);
  
  // CSS variables automatically switch with .dark class
  // No explicit dark mode selector needed
}
```

---

## Testing Procedures

### Visual Regression Testing

```bash
# Install Playwright (already installed)
# Take baseline screenshots before migration
npm run test:e2e -- --update-snapshots

# After each component migration
npm run test:e2e

# Compare screenshots manually
```

### Accessibility Testing

```typescript
// tests/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('Header should be accessible', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('header')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```

### Performance Testing

```bash
# Bundle analysis
npm run analyze

# Compare before/after bundle sizes
```

---

## Troubleshooting Guide

### Common Issues

#### Issue 1: CSS Module Classes Not Applied

**Problem:** Styles defined in `.module.scss` not showing in browser.

**Solution:**
1. Check import path: `@use '@/styles/...'` (with `@/` alias)
2. Verify `tsconfig.json` has path alias configured
3. Restart Next.js dev server
4. Clear `.next` cache: `rm -rf .next`

#### Issue 2: Dark Mode Not Working

**Problem:** Dark mode styles not applying when `.dark` class added.

**Solution:**
1. Ensure CSS variables are defined in `globals.css`
2. Use `var(--color-background)` instead of SCSS variables
3. Check `next-themes` provider is wrapping app
4. Verify `.dark` class is added to `<html>` element

#### Issue 3: Breakpoint Mixins Not Working

**Problem:** Responsive styles not applying at correct breakpoints.

**Solution:**
1. Use `@include bp.media-lg-up` with `bp` namespace
2. Verify `@use '@/styles/layout/breakpoints' as bp;`
3. Check order: mobile styles first, then `@include` for larger screens

---

## Performance Optimization

### Critical CSS Extraction

```typescript
// next.config.ts
experimental: {
  optimizeCss: true, // Enable built-in CSS optimization
}
```

### CSS Module Tree-Shaking

CSS Modules automatically tree-shake unused styles. To verify:

```bash
npm run build

# Inspect .next/static/css/*.css
# Only used classes should be present
```

### Bundle Size Monitoring

```bash
# Before migration
npm run analyze

# Record CSS bundle size
# Target: Reduce by 15% (45KB → 38KB gzipped)

# After migration
npm run analyze

# Compare results
```

---

## Next Steps

1. **Complete Phase 1** (Foundation Setup)
   - Set up SCSS directory structure
   - Create all token files
   - Establish build pipeline

2. **Begin Phase 2** (Core Components)
   - Start with Header
   - Then Footer
   - Then Button primitives

3. **Document Progress**
   - Update RFC 3001 with learnings
   - Record migration metrics
   - Create component migration log

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-26  
**Status:** Implementation Ready
