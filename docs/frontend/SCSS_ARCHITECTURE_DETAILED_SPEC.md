# SCSS Architecture Detailed Specification

**Document Type:** Detailed Technical Specification  
**Created:** 2026-01-27  
**Purpose:** Address clarifications and provide ultra-detailed specifications for SCSS implementation  
**Companion to:** RFC 3001, Implementation Guide, Migration Visual Guide

---

## Table of Contents

1. [SCSS Folder Structure - Detailed Contents](#scss-folder-structure---detailed-contents)
2. [User-Customizable Color System](#user-customizable-color-system)
3. [Import Naming Conventions](#import-naming-conventions)
4. [Page-Level Shared Styles Pattern](#page-level-shared-styles-pattern)
5. [PostCSS Configuration](#postcss-configuration)
6. [Build Pipeline Integration](#build-pipeline-integration)
7. [Component File Structure](#component-file-structure)
8. [TSX Import Patterns](#tsx-import-patterns)

---

## SCSS Folder Structure - Detailed Contents

### `/base` Folder

**Purpose:** Foundation styles that apply to base HTML elements without classes

**Files:**

#### `_reset.scss`
```scss
/**
 * Modern CSS Reset
 * Based on Josh Comeau's CSS Reset with customizations
 */

// Use border-box sizing for all elements
*,
*::before,
*::after {
  box-sizing: border-box;
}

// Remove default margins
* {
  margin: 0;
}

// Set core body defaults
body {
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

// Improve media defaults
img,
picture,
video,
canvas,
svg {
  display: block;
  max-width: 100%;
}

// Remove built-in form typography styles
input,
button,
textarea,
select {
  font: inherit;
}

// Avoid text overflows
p,
h1,
h2,
h3,
h4,
h5,
h6 {
  overflow-wrap: break-word;
}

// Remove list styles on ul, ol elements with class
ul[class],
ol[class] {
  list-style: none;
  padding: 0;
}

// Remove default button styles
button {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
}

// Create a root stacking context
#root,
#__next {
  isolation: isolate;
}
```

#### `_typography.scss`
```scss
/**
 * Base Typography Styles
 * Applied to HTML elements directly
 */

@use '../tokens/typography' as typography;
@use '../tokens/colors' as colors;

// Root font size (16px base)
html {
  font-size: 16px;
  text-rendering: optimizeLegibility;
}

// Body text defaults
body {
  font-family: typography.$font-family-base;
  font-size: typography.$font-size-base;
  font-weight: typography.$font-weight-normal;
  line-height: typography.$line-height-normal;
  color: var(--color-foreground);
}

// Headings
h1,
h2,
h3,
h4,
h5,
h6 {
  font-weight: typography.$font-weight-bold;
  line-height: typography.$line-height-tight;
  margin-bottom: 0.5em;
}

h1 {
  font-size: typography.$font-size-5xl;
}

h2 {
  font-size: typography.$font-size-4xl;
}

h3 {
  font-size: typography.$font-size-3xl;
}

h4 {
  font-size: typography.$font-size-2xl;
}

h5 {
  font-size: typography.$font-size-xl;
}

h6 {
  font-size: typography.$font-size-lg;
}

// Paragraphs
p {
  margin-bottom: 1em;
}

// Links
a {
  color: var(--color-primary);
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover {
    color: var(--color-primary-hover);
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--color-ring);
    outline-offset: 2px;
  }
}

// Code
code,
pre {
  font-family: typography.$font-family-mono;
  font-size: typography.$font-size-sm;
}

code {
  padding: 0.125em 0.25em;
  background-color: var(--color-muted);
  border-radius: 0.25em;
}

pre {
  padding: 1em;
  overflow-x: auto;
  background-color: var(--color-muted);
  border-radius: 0.5em;

  code {
    padding: 0;
    background-color: transparent;
  }
}

// Strong and emphasis
strong,
b {
  font-weight: typography.$font-weight-bold;
}

em,
i {
  font-style: italic;
}

// Small text
small {
  font-size: typography.$font-size-sm;
}
```

#### `_forms.scss`
```scss
/**
 * Form Element Base Styles
 */

@use '../tokens/spacing' as spacing;
@use '../tokens/typography' as typography;
@use '../tokens/borders' as borders;

// Input, textarea, select defaults
input,
textarea,
select {
  width: 100%;
  padding: spacing.$spacing-2 spacing.$spacing-3;
  font-size: typography.$font-size-base;
  line-height: typography.$line-height-normal;
  color: var(--color-foreground);
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: borders.$border-radius-md;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--color-ring);
    box-shadow: 0 0 0 3px var(--color-ring-offset);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &::placeholder {
    color: var(--color-muted-foreground);
  }
}

// Textarea specific
textarea {
  min-height: 100px;
  resize: vertical;
}

// Label defaults
label {
  display: block;
  margin-bottom: spacing.$spacing-2;
  font-size: typography.$font-size-sm;
  font-weight: typography.$font-weight-medium;
  color: var(--color-foreground);
}

// Fieldset defaults
fieldset {
  border: 1px solid var(--color-border);
  border-radius: borders.$border-radius-md;
  padding: spacing.$spacing-4;
  margin-bottom: spacing.$spacing-4;
}

legend {
  font-weight: typography.$font-weight-semibold;
  padding: 0 spacing.$spacing-2;
}

// Checkbox and radio
input[type='checkbox'],
input[type='radio'] {
  width: auto;
  margin-right: spacing.$spacing-2;
}
```

#### `_accessibility.scss`
```scss
/**
 * Accessibility Utilities
 * Screen reader only, focus styles, skip links
 */

// Screen reader only (visually hidden but accessible)
.sr-only {
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

// Show on focus (useful for skip links)
.sr-only-focusable:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}

// Focus visible styles (for keyboard navigation)
:focus-visible {
  outline: 2px solid var(--color-ring);
  outline-offset: 2px;
}

// Remove focus outline for mouse users
:focus:not(:focus-visible) {
  outline: none;
}

// Skip to main content link
.skip-to-main {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px;
  background-color: var(--color-background);
  color: var(--color-foreground);
  text-decoration: none;
  z-index: 100;

  &:focus {
    top: 0;
  }
}

// High contrast mode support
@media (prefers-contrast: high) {
  * {
    border-color: currentColor;
  }
}

// Reduced motion support
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

---

### `/abstracts` Folder

**Purpose:** SCSS helpers that don't output CSS - variables, functions, mixins

**Files:**

#### `_variables.scss`
```scss
/**
 * Global SCSS Variables
 * These are SCSS variables for build-time use, NOT CSS custom properties
 */

// Container max widths
$container-max-width-sm: 640px;
$container-max-width-md: 768px;
$container-max-width-lg: 1024px;
$container-max-width-xl: 1280px;
$container-max-width-2xl: 1440px;

// Z-index layers
$z-index-dropdown: 1000;
$z-index-sticky: 1020;
$z-index-fixed: 1030;
$z-index-modal-backdrop: 1040;
$z-index-modal: 1050;
$z-index-popover: 1060;
$z-index-tooltip: 1070;

// Transition durations
$transition-fast: 150ms;
$transition-base: 200ms;
$transition-slow: 300ms;
$transition-slower: 500ms;

// Transition easing functions
$ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
$ease-out: cubic-bezier(0, 0, 0.2, 1);
$ease-in: cubic-bezier(0.4, 0, 1, 1);
```

#### `_functions.scss`
```scss
/**
 * SCSS Utility Functions
 */

// Convert px to rem
@function px-to-rem($px) {
  @return calc($px / 16) * 1rem;
}

// Calculate fluid typography
@function fluid-size($min-size, $max-size, $min-viewport: 320px, $max-viewport: 1440px) {
  $slope: calc(($max-size - $min-size) / ($max-viewport - $min-viewport));
  $intercept: $min-size - ($slope * $min-viewport);
  @return clamp(#{$min-size}, #{$intercept} + #{$slope * 100vw}, #{$max-size});
}

// Strip unit from value
@function strip-unit($number) {
  @if type-of($number) == 'number' and not unitless($number) {
    @return calc($number / ($number * 0 + 1));
  }
  @return $number;
}

// Color manipulation (lighten/darken)
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

#### `_mixins.scss`
```scss
/**
 * Reusable SCSS Mixins
 * Detailed in implementation guide, includes:
 * - Layout mixins (flex-center, grid-auto-fit, etc.)
 * - Text mixins (truncate, truncate-lines, etc.)
 * - Accessibility mixins (visually-hidden, focus-visible)
 * - Interaction mixins (hover-scale, hover-lift)
 * - Card mixins
 * - Button mixins
 * - Animation mixins
 * - Container mixins
 * - Aspect ratio mixins
 * - Backdrop blur
 */

// See TAILWIND_TO_SCSS_IMPLEMENTATION_GUIDE.md for complete mixin library
```

---

### `/layout` Folder

**Purpose:** Structural layout systems - grid, flexbox, containers, breakpoints

**Files:**

#### `_breakpoints.scss`
```scss
/**
 * Responsive Breakpoints and Media Query Mixins
 * Detailed in implementation guide
 */

// Breakpoint tokens and all media query mixins
// See TAILWIND_TO_SCSS_IMPLEMENTATION_GUIDE.md for complete implementation
```

#### `_grid.scss`
```scss
/**
 * CSS Grid System Utilities
 */

@use '../tokens/spacing' as spacing;
@use '../abstracts/variables' as variables;
@use './breakpoints' as breakpoints;

// Grid container
.grid {
  display: grid;
  gap: spacing.$spacing-4;
}

// Grid columns
.grid-cols-1 {
  grid-template-columns: repeat(1, 1fr);
}

.grid-cols-2 {
  grid-template-columns: repeat(2, 1fr);
}

.grid-cols-3 {
  grid-template-columns: repeat(3, 1fr);
}

.grid-cols-4 {
  grid-template-columns: repeat(4, 1fr);
}

.grid-cols-6 {
  grid-template-columns: repeat(6, 1fr);
}

.grid-cols-12 {
  grid-template-columns: repeat(12, 1fr);
}

// Auto-fit grid (responsive without media queries)
@mixin grid-auto-fit($min-width: 250px, $gap: spacing.$spacing-4) {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax($min-width, 1fr));
  gap: $gap;
}

// Auto-fill grid
@mixin grid-auto-fill($min-width: 250px, $gap: spacing.$spacing-4) {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax($min-width, 1fr));
  gap: $gap;
}
```

#### `_flexbox.scss`
```scss
/**
 * Flexbox Utilities
 */

@use '../tokens/spacing' as spacing;

// Flex container
.flex {
  display: flex;
}

.inline-flex {
  display: inline-flex;
}

// Flex direction
.flex-row {
  flex-direction: row;
}

.flex-col {
  flex-direction: column;
}

// Flex wrap
.flex-wrap {
  flex-wrap: wrap;
}

.flex-nowrap {
  flex-wrap: nowrap;
}

// Align items
.items-start {
  align-items: flex-start;
}

.items-center {
  align-items: center;
}

.items-end {
  align-items: flex-end;
}

.items-stretch {
  align-items: stretch;
}

// Justify content
.justify-start {
  justify-content: flex-start;
}

.justify-center {
  justify-content: center;
}

.justify-end {
  justify-content: flex-end;
}

.justify-between {
  justify-content: space-between;
}

.justify-around {
  justify-content: space-around;
}

// Gap utilities
.gap-2 {
  gap: spacing.$spacing-2;
}

.gap-4 {
  gap: spacing.$spacing-4;
}

.gap-6 {
  gap: spacing.$spacing-6;
}

.gap-8 {
  gap: spacing.$spacing-8;
}
```

#### `_container.scss`
```scss
/**
 * Container System
 */

@use '../tokens/spacing' as spacing;
@use '../abstracts/variables' as variables;
@use './breakpoints' as breakpoints;

// Container mixin (preferred for component use)
@mixin container {
  width: 100%;
  max-width: variables.$container-max-width-2xl;
  margin-left: auto;
  margin-right: auto;
  padding-left: spacing.$spacing-4;
  padding-right: spacing.$spacing-4;

  @include breakpoints.media-sm-up {
    padding-left: spacing.$spacing-6;
    padding-right: spacing.$spacing-6;
  }

  @include breakpoints.media-lg-up {
    padding-left: spacing.$spacing-8;
    padding-right: spacing.$spacing-8;
  }
}

// Container utility class (if needed globally)
.container {
  @include container;
}

// Container variants
.container-sm {
  @include container;
  max-width: variables.$container-max-width-sm;
}

.container-md {
  @include container;
  max-width: variables.$container-max-width-md;
}

.container-lg {
  @include container;
  max-width: variables.$container-max-width-lg;
}

.container-xl {
  @include container;
  max-width: variables.$container-max-width-xl;
}
```

---

### `/utilities` Folder

**Purpose:** Minimal utility classes for rare cases where inline styles would be verbose

**Files:**

#### `_display.scss`
```scss
/**
 * Display Utilities (Use sparingly)
 */

.block {
  display: block;
}

.inline-block {
  display: inline-block;
}

.inline {
  display: inline;
}

.hidden {
  display: none;
}

.visible {
  visibility: visible;
}

.invisible {
  visibility: hidden;
}
```

#### `_spacing.scss`
```scss
/**
 * Spacing Utilities (Use sparingly - prefer component styles)
 */

@use '../tokens/spacing' as spacing;

// Margin utilities (only common cases)
.m-0 {
  margin: 0;
}

.mt-auto {
  margin-top: auto;
}

.mb-auto {
  margin-bottom: auto;
}

.mx-auto {
  margin-left: auto;
  margin-right: auto;
}

// Padding utilities (only common cases)
.p-0 {
  padding: 0;
}
```

#### `_text.scss`
```scss
/**
 * Text Utilities
 */

// Alignment
.text-left {
  text-align: left;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

// Transform
.uppercase {
  text-transform: uppercase;
}

.lowercase {
  text-transform: lowercase;
}

.capitalize {
  text-transform: capitalize;
}

// Decoration
.underline {
  text-decoration: underline;
}

.no-underline {
  text-decoration: none;
}

// Whitespace
.whitespace-nowrap {
  white-space: nowrap;
}

.whitespace-pre {
  white-space: pre;
}

.whitespace-pre-wrap {
  white-space: pre-wrap;
}
```

#### `_visibility.scss`
```scss
/**
 * Responsive Visibility Utilities
 */

@use './breakpoints' as breakpoints;

// Show/hide at specific breakpoints
.sm-only {
  @include breakpoints.media-sm-down {
    display: block;
  }

  @include breakpoints.media-md-up {
    display: none;
  }
}

.md-only {
  @include breakpoints.media-sm-down {
    display: none;
  }

  @include breakpoints.media-md-up {
    display: block;
  }

  @include breakpoints.media-lg-up {
    display: none;
  }
}

// Print utilities
@media print {
  .print-hidden {
    display: none !important;
  }

  .print-only {
    display: block !important;
  }
}
```

---

### `/themes` Folder

**Purpose:** Theme definitions for light mode, dark mode, and user-customizable gradients

**Files:**

#### `_light.scss`
```scss
/**
 * Light Mode Theme
 * Defines CSS custom properties for light mode
 */

@use '../tokens/colors' as colors;

:root {
  // Base colors
  --color-background: #{colors.$color-background};
  --color-foreground: #{colors.$color-foreground};
  --color-card: #{colors.$color-card};
  --color-card-foreground: #{colors.$color-card-foreground};
  --color-popover: #{colors.$color-popover};
  --color-popover-foreground: #{colors.$color-popover-foreground};
  --color-muted: #{colors.$color-muted};
  --color-muted-foreground: #{colors.$color-muted-foreground};
  --color-accent: #{colors.$color-accent};
  --color-accent-foreground: #{colors.$color-accent-foreground};
  --color-border: #{colors.$color-border};
  --color-input: #{colors.$color-input};
  --color-ring: #{colors.$color-ring};
  --color-ring-offset: rgba(255, 255, 255, 0.1);

  // User-customizable colors (see User-Customizable Color System section)
  --user-primary: #{colors.$color-primary-500};
  --user-secondary: #{colors.$color-secondary-500};
  --user-accent: #{colors.$color-accent-primary};
  
  // Gradient theme (user-customizable)
  --user-gradient-from: #{colors.$color-gradient-from};
  --user-gradient-via: #{colors.$color-gradient-via};
  --user-gradient-to: #{colors.$color-gradient-to};

  // Mapped theme colors (reference user-customizable vars)
  --color-primary: var(--user-primary);
  --color-primary-foreground: #{colors.$color-primary-foreground};
  --color-secondary: var(--user-secondary);
  --color-secondary-foreground: #{colors.$color-secondary-foreground};
  
  // Gradient mappings
  --gradient-from: var(--user-gradient-from);
  --gradient-via: var(--user-gradient-via);
  --gradient-to: var(--user-gradient-to);
  --accent-primary: var(--user-accent);
  --footer-bg: #{colors.$color-footer-bg};

  // State colors
  --color-success: #{colors.$color-success};
  --color-success-foreground: #{colors.$color-success-foreground};
  --color-warning: #{colors.$color-warning};
  --color-warning-foreground: #{colors.$color-warning-foreground};
  --color-error: #{colors.$color-error};
  --color-error-foreground: #{colors.$color-error-foreground};
  --color-info: #{colors.$color-info};
  --color-info-foreground: #{colors.$color-info-foreground};

  // Border radius
  --radius: 0.5rem;
}
```

#### `_dark.scss`
```scss
/**
 * Dark Mode Theme
 * Overrides for .dark class
 */

@use '../tokens/colors' as colors;

.dark {
  --color-background: #{colors.$color-background-dark};
  --color-foreground: #{colors.$color-foreground-dark};
  --color-card: #{colors.$color-card-dark};
  --color-card-foreground: #{colors.$color-card-foreground-dark};
  --color-popover: #{colors.$color-popover-dark};
  --color-popover-foreground: #{colors.$color-popover-foreground-dark};
  --color-muted: #{colors.$color-muted-dark};
  --color-muted-foreground: #{colors.$color-muted-foreground-dark};
  --color-accent: #{colors.$color-accent-dark};
  --color-accent-foreground: #{colors.$color-accent-foreground-dark};
  --color-border: #{colors.$color-border-dark};
  --color-input: #{colors.$color-input-dark};
  --color-ring: #{colors.$color-ring-dark};
  --color-ring-offset: rgba(0, 0, 0, 0.1);

  // User-customizable colors remain the same
  // User can customize these in their profile, and they work in both themes

  --color-primary-foreground: #{colors.$color-primary-foreground-dark};
  --color-secondary-foreground: #{colors.$color-secondary-foreground-dark};
}
```

#### `_gradients.scss`
```scss
/**
 * Gradient Utilities
 * User-customizable gradients using CSS custom properties
 */

// Gradient background utility
.gradient-bg {
  background: linear-gradient(
    135deg,
    hsl(var(--gradient-from)),
    hsl(var(--gradient-via)),
    hsl(var(--gradient-to))
  );
}

// Gradient text utility
.gradient-text {
  background: linear-gradient(
    135deg,
    hsl(var(--gradient-from)),
    hsl(var(--gradient-via)),
    hsl(var(--gradient-to))
  );
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

// Gradient border utility
.gradient-border {
  position: relative;
  border: 2px solid transparent;
  background-clip: padding-box;

  &::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(
      135deg,
      hsl(var(--gradient-from)),
      hsl(var(--gradient-via)),
      hsl(var(--gradient-to))
    );
    border-radius: inherit;
    z-index: -1;
  }
}
```

---

## User-Customizable Color System

### Architecture Overview

The color system supports **user customization** through a two-tier approach:

1. **Design Tokens** (SCSS variables) - Static color palettes defined in `tokens/_colors.scss`
2. **Theme Variables** (CSS custom properties) - Dynamic colors that users can customize

### Implementation Strategy

#### Tier 1: Design Tokens (Static SCSS Variables)

```scss
// tokens/_colors.scss
// These are the base palettes - NOT customizable by users
$color-primary-500: hsl(221, 83%, 53%);
$color-secondary-500: hsl(210, 40%, 60%);
$color-gradient-from: hsl(187, 94%, 43%);
$color-gradient-via: hsl(262, 83%, 58%);
$color-gradient-to: hsl(330, 81%, 60%);
```

#### Tier 2: User-Customizable CSS Variables

```scss
// themes/_light.scss (and _dark.scss)
:root {
  // User-customizable color slots
  --user-primary: #{colors.$color-primary-500};      // Default value
  --user-secondary: #{colors.$color-secondary-500};  // Default value
  --user-accent: #{colors.$color-accent-primary};    // Default value
  --user-gradient-from: #{colors.$color-gradient-from};  // Default value
  --user-gradient-via: #{colors.$color-gradient-via};    // Default value
  --user-gradient-to: #{colors.$color-gradient-to};      // Default value

  // Application references use the user-customizable vars
  --color-primary: var(--user-primary);
  --color-secondary: var(--user-secondary);
  --gradient-from: var(--user-gradient-from);
  --gradient-via: var(--user-gradient-via);
  --gradient-to: var(--user-gradient-to);
}
```

#### Tier 3: Component Usage

```scss
// components/Header/Header.module.scss
@use '@/styles/tokens/spacing' as spacing;

.header {
  // Use the theme variable, which references the user-customizable variable
  background-color: var(--color-background);
  border-bottom: 1px solid var(--color-border);
}

.logo {
  // Use user-customizable primary color
  color: var(--color-primary);

  &:hover {
    // Can still use design tokens for derived colors
    color: var(--color-primary);
    opacity: 0.8;
  }
}

.gradientButton {
  background: linear-gradient(
    135deg,
    hsl(var(--gradient-from)),
    hsl(var(--gradient-via)),
    hsl(var(--gradient-to))
  );
}
```

### User Customization Flow

**Step 1: User selects colors in Profile Settings**

```tsx
// app/my-profile/island.tsx (Client Component)
"use client";

import { useState } from 'react';

export function ColorCustomizer() {
  const [primaryColor, setPrimaryColor] = useState('221, 83%, 53%');
  const [gradientFrom, setGradientFrom] = useState('187, 94%, 43%');
  
  const applyColors = () => {
    // Update CSS custom properties on the root element
    document.documentElement.style.setProperty('--user-primary', primaryColor);
    document.documentElement.style.setProperty('--user-gradient-from', gradientFrom);
    
    // Save to localStorage for persistence
    localStorage.setItem('theme-primary', primaryColor);
    localStorage.setItem('theme-gradient-from', gradientFrom);
    
    // Optionally: sync to backend for cross-device persistence
    saveUserPreferences({
      primary: primaryColor,
      gradientFrom: gradientFrom,
    });
  };

  return (
    <div>
      <ColorPicker
        label="Primary Color"
        value={primaryColor}
        onChange={setPrimaryColor}
      />
      <ColorPicker
        label="Gradient Start"
        value={gradientFrom}
        onChange={setGradientFrom}
      />
      <button onClick={applyColors}>Apply Colors</button>
    </div>
  );
}
```

**Step 2: Load user preferences on app initialization**

```tsx
// app/providers.tsx
"use client";

import { useEffect } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Load user color preferences from localStorage
    const savedPrimary = localStorage.getItem('theme-primary');
    const savedGradientFrom = localStorage.getItem('theme-gradient-from');
    const savedGradientVia = localStorage.getItem('theme-gradient-via');
    const savedGradientTo = localStorage.getItem('theme-gradient-to');
    const savedSecondary = localStorage.getItem('theme-secondary');
    const savedAccent = localStorage.getItem('theme-accent');

    // Apply saved colors if they exist
    if (savedPrimary) {
      document.documentElement.style.setProperty('--user-primary', savedPrimary);
    }
    if (savedGradientFrom) {
      document.documentElement.style.setProperty('--user-gradient-from', savedGradientFrom);
    }
    if (savedGradientVia) {
      document.documentElement.style.setProperty('--user-gradient-via', savedGradientVia);
    }
    if (savedGradientTo) {
      document.documentElement.style.setProperty('--user-gradient-to', savedGradientTo);
    }
    if (savedSecondary) {
      document.documentElement.style.setProperty('--user-secondary', savedSecondary);
    }
    if (savedAccent) {
      document.documentElement.style.setProperty('--user-accent', savedAccent);
    }
  }, []);

  return <>{children}</>;
}
```

**Step 3: Server-side rendering support**

```tsx
// app/layout.tsx (Server Component)
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Optionally: Fetch user preferences from database for SSR
  const userPreferences = await fetchUserThemePreferences();

  return (
    <html lang="en" style={{
      '--user-primary': userPreferences?.primary || '221, 83%, 53%',
      '--user-gradient-from': userPreferences?.gradientFrom || '187, 94%, 43%',
      // ... other custom colors
    }}>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Color Picker Component

```tsx
// components/ColorPicker/ColorPicker.tsx
"use client";

import styles from './ColorPicker.module.scss';

interface ColorPickerProps {
  label: string;
  value: string; // HSL format: "221, 83%, 53%"
  onChange: (value: string) => void;
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const [h, s, l] = value.split(',').map(v => parseInt(v.trim()));

  const handleHueChange = (hue: number) => {
    onChange(`${hue}, ${s}%, ${l}%`);
  };

  const handleSaturationChange = (saturation: number) => {
    onChange(`${h}, ${saturation}%, ${l}%`);
  };

  const handleLightnessChange = (lightness: number) => {
    onChange(`${h}, ${s}%, ${lightness}%`);
  };

  return (
    <div className={styles.colorPicker}>
      <label className={styles.label}>{label}</label>
      <div className={styles.preview} style={{ backgroundColor: `hsl(${value})` }} />
      
      <div className={styles.sliders}>
        <div className={styles.slider}>
          <label>Hue</label>
          <input
            type="range"
            min="0"
            max="360"
            value={h}
            onChange={(e) => handleHueChange(parseInt(e.target.value))}
          />
        </div>
        <div className={styles.slider}>
          <label>Saturation</label>
          <input
            type="range"
            min="0"
            max="100"
            value={s}
            onChange={(e) => handleSaturationChange(parseInt(e.target.value))}
          />
        </div>
        <div className={styles.slider}>
          <label>Lightness</label>
          <input
            type="range"
            min="0"
            max="100"
            value={l}
            onChange={(e) => handleLightnessChange(parseInt(e.target.value))}
          />
        </div>
      </div>

      <div className={styles.value}>
        <code>hsl({value})</code>
      </div>
    </div>
  );
}
```

### Database Schema for User Preferences

```typescript
// types/user-preferences.ts
export interface UserThemePreferences {
  userId: string;
  primary: string;        // HSL format: "221, 83%, 53%"
  secondary: string;
  accent: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Import Naming Conventions

### Current Issue
Short aliases like `as c`, `as m`, `as bp` reduce readability.

### New Standard
Use full, descriptive names for better code clarity:

```scss
// ❌ BAD: Short, cryptic aliases
@use '@/styles/tokens/colors' as c;
@use '@/styles/abstracts/mixins' as m;
@use '@/styles/layout/breakpoints' as bp;
@use '@/styles/tokens/spacing' as s;
@use '@/styles/tokens/typography' as t;

.header {
  background-color: c.$color-background;
  padding: s.$spacing-4;
  
  @include bp.media-lg-up {
    padding: s.$spacing-8;
  }
}

// ✅ GOOD: Full, descriptive names
@use '@/styles/tokens/colors' as colors;
@use '@/styles/abstracts/mixins' as mixins;
@use '@/styles/layout/breakpoints' as breakpoints;
@use '@/styles/tokens/spacing' as spacing;
@use '@/styles/tokens/typography' as typography;

.header {
  background-color: colors.$color-background;
  padding: spacing.$spacing-4;
  
  @include breakpoints.media-lg-up {
    padding: spacing.$spacing-8;
  }
}
```

### Rationale
1. **Improved Readability**: `breakpoints.media-lg-up` is immediately clear, `bp.media-lg-up` requires memorization
2. **Better IDE Support**: Full names provide better autocomplete
3. **Reduced Cognitive Load**: No need to remember abbreviations
4. **Consistency**: Matches TypeScript/JavaScript import conventions

---

## Page-Level Shared Styles Pattern

### The Problem
For a single route like `/domains/invoices`, we have multiple files:
- `page.tsx` (RSC - data fetching)
- `island.tsx` (RCC - interactive UI)
- `layout.tsx` (RSC - shell structure)
- `loading.tsx` (RSC - loading states)

### The Solution: Single Shared `styles.module.scss`

#### Correct File Structure

```
app/domains/invoices/
├── page.tsx              # RSC - Server component
├── island.tsx            # RCC - Client component  
├── layout.tsx            # RSC - Layout shell
├── loading.tsx           # RSC - Loading state
└── styles.module.scss    # SHARED styles for ALL 4 files above
```

**NOT 4 separate SCSS files per file!**

#### Why This Approach?

**Turbopack Optimization Benefits:**
1. Single stylesheet per route reduces HTTP requests
2. Shared styles are loaded once, cached efficiently
3. Better code splitting at route boundaries
4. Reduced duplication across page components

#### Example Implementation

```scss
// app/domains/invoices/styles.module.scss
@use '@/styles/tokens/colors' as colors;
@use '@/styles/tokens/spacing' as spacing;
@use '@/styles/layout/breakpoints' as breakpoints;

// ============================================================================
// SHARED ACROSS ALL PAGE FILES
// ============================================================================

// Used by page.tsx AND island.tsx
.pageContainer {
  min-height: 100vh;
  padding: spacing.$spacing-8 spacing.$spacing-4;
  
  @include breakpoints.media-md-up {
    padding: spacing.$spacing-12 spacing.$spacing-8;
  }
}

// ============================================================================
// ISLAND.TSX SPECIFIC (Client Component Styles)
// ============================================================================

.interactiveGrid {
  display: grid;
  gap: spacing.$spacing-6;
  grid-template-columns: 1fr;
  
  @include breakpoints.media-lg-up {
    grid-template-columns: repeat(12, 1fr);
  }
}

.sidebar {
  grid-column: span 3;
  
  @include breakpoints.media-max(breakpoints.$breakpoint-lg) {
    display: none;
  }
}

.mainContent {
  grid-column: span 6;
  
  @include breakpoints.media-max(breakpoints.$breakpoint-lg) {
    grid-column: span 12;
  }
}

// ============================================================================
// LAYOUT.TSX SPECIFIC (Layout Shell Styles)
// ============================================================================

.layoutWrapper {
  max-width: 1440px;
  margin: 0 auto;
  padding: spacing.$spacing-4;
}

.layoutHeader {
  margin-bottom: spacing.$spacing-8;
}

// ============================================================================
// LOADING.TSX SPECIFIC (Loading/Shimmer Styles)
// ============================================================================

.shimmerContainer {
  display: flex;
  flex-direction: column;
  gap: spacing.$spacing-4;
}

.shimmerCard {
  background: linear-gradient(
    90deg,
    colors.$color-muted 0%,
    lighten(colors.$color-muted, 5%) 50%,
    colors.$color-muted 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: spacing.$spacing-2;
  height: 200px;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

// ============================================================================
// PAGE.TSX SPECIFIC (Server Component Styles)
// ============================================================================

.serverContent {
  // Styles specific to page.tsx server-rendered content
}
```

#### Usage in Components

```tsx
// app/domains/invoices/page.tsx (RSC)
import styles from './styles.module.scss';

export default async function InvoicesPage() {
  const data = await fetchInvoices();
  
  return (
    <div className={styles.pageContainer}>
      <div className={styles.serverContent}>
        {/* Server-rendered content */}
      </div>
    </div>
  );
}
```

```tsx
// app/domains/invoices/island.tsx (RCC)
"use client";

import styles from './styles.module.scss';

export default function InvoicesIsland() {
  return (
    <div className={styles.interactiveGrid}>
      <aside className={styles.sidebar}>...</aside>
      <main className={styles.mainContent}>...</main>
    </div>
  );
}
```

```tsx
// app/domains/invoices/layout.tsx (RSC)
import styles from './styles.module.scss';

export default function InvoicesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layoutWrapper}>
      <div className={styles.layoutHeader}>
        {/* Header content */}
      </div>
      {children}
    </div>
  );
}
```

```tsx
// app/domains/invoices/loading.tsx (RSC)
import styles from './styles.module.scss';

export default function InvoicesLoading() {
  return (
    <div className={styles.shimmerContainer}>
      <div className={styles.shimmerCard} />
      <div className={styles.shimmerCard} />
      <div className={styles.shimmerCard} />
    </div>
  );
}
```

---

## PostCSS Configuration

### Do We Need PostCSS?

**Short Answer:** Yes, but minimal configuration.

**Why?**
1. **CSS Minification**: PostCSS with cssnano handles production minification
2. **Autoprefixer**: Adds vendor prefixes automatically (optional, but recommended)
3. **Next.js Integration**: Next.js expects PostCSS for CSS processing pipeline

### Minimal PostCSS Config

```javascript
// postcss.config.js
const postcssConfig = {
  plugins: {
    // Autoprefixer for vendor prefixes (optional but recommended)
    autoprefixer: {},
    
    // cssnano for production minification
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

### What Was Removed?

```javascript
// ❌ REMOVED: Tailwind PostCSS plugin
// '@tailwindcss/postcss': {},
```

### Install Required Packages

```bash
npm install -D autoprefixer cssnano
```

### Why Keep cssnano?

- Reduces CSS bundle size by 20-30%
- Removes comments, whitespace
- Optimizes colors, gradients, font values
- Only runs in production builds

---

## Build Pipeline Integration

### Next.js Built-in SCSS Support

**Key Point:** Next.js has native SCSS support - NO additional configuration needed!

### What Changes?

#### Before (TailwindCSS)
```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Tailwind handled via PostCSS plugin
  // No specific config needed here
};

export default nextConfig;
```

#### After (SCSS + CSS Modules)
```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // No SCSS-specific config needed!
  // Next.js automatically handles:
  // - .scss and .sass files
  // - CSS Modules (*.module.scss)
  // - SCSS compilation via built-in compiler
  
  // Only specify if you need custom SCSS options
  sassOptions: {
    // Optional: Add includePaths if needed
    // includePaths: [path.join(__dirname, 'src/styles')],
    
    // Optional: Prefer 'compressed' for production (default: 'expanded')
    // outputStyle: 'compressed',
  },
};

export default nextConfig;
```

### What Next.js Handles Automatically

1. **SCSS Compilation**: Built-in Sass compiler
2. **CSS Modules**: Scoping and name mangling
3. **Code Splitting**: Automatic per-route CSS bundles
4. **Optimization**: Tree-shaking unused styles
5. **Development**: Hot module replacement for SCSS
6. **Production**: Minification and optimization

### Required Dependencies

```bash
# Only need to install sass
npm install -D sass@^1.87.0

# PostCSS plugins (optional but recommended)
npm install -D autoprefixer cssnano
```

### Turbopack Integration

Turbopack (Next.js 13+ bundler) automatically:
- Compiles SCSS files
- Handles CSS Modules
- Optimizes CSS delivery
- Manages shared styles per route

**No additional configuration required!**

---

## Component File Structure

### NO Barrel Exports for TSX Components

**Important:** We do NOT use `index.ts` for component exports.

#### ❌ WRONG: Barrel Exports

```
components/Header/
├── Header.tsx
├── Header.module.scss
├── Header.test.tsx
└── index.ts              # ❌ DO NOT CREATE THIS
```

```typescript
// ❌ DO NOT DO THIS
// components/Header/index.ts
export { Header } from './Header';
```

#### ✅ CORRECT: Direct Imports

```
components/Header/
├── Header.tsx
├── Header.module.scss
└── Header.test.tsx
```

```tsx
// ✅ CORRECT: Import directly from component file
import { Header } from '@/components/Header/Header';

// OR using default export
import Header from '@/components/Header/Header';
```

### Why No Barrel Exports?

1. **Performance**: Barrel exports can prevent tree-shaking
2. **Build Speed**: Faster module resolution
3. **Debugging**: Clearer import paths in stack traces
4. **Simplicity**: One less file to maintain

---

## TSX Import Patterns

### Component with CSS Modules

```tsx
// components/Header/Header.tsx
import styles from './Header.module.scss';
import logo from '@/app/logo.svg';
import Image from 'next/image';
import Link from 'next/link';

export function Header(): React.JSX.Element {
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

export default Header;
```

### Combining Multiple Class Names

```tsx
// Using template literals
<div className={`${styles.card} ${styles.cardHover}`}>

// Using array join
<div className={[styles.card, styles.cardHover].join(' ')}>

// Using clsx/classnames library (if installed)
import clsx from 'clsx';
<div className={clsx(styles.card, styles.cardHover, {
  [styles.cardActive]: isActive,
})}>
```

### Conditional Class Names

```tsx
// Ternary operator
<div className={isActive ? styles.cardActive : styles.card}>

// Template literals with conditions
<div className={`${styles.card} ${isActive ? styles.cardActive : ''}`}>

// Using clsx
<div className={clsx(styles.card, {
  [styles.cardActive]: isActive,
  [styles.cardDisabled]: isDisabled,
})}>
```

### TypeScript Type Safety

CSS Modules are automatically typed by Next.js:

```tsx
import styles from './Component.module.scss';

// TypeScript knows all available class names
styles.header     // ✅ Valid
styles.nav        // ✅ Valid
styles.invalidKey // ❌ TypeScript error!
```

---

## Summary Checklist

### Folder Contents Clarified
- [x] `/base` - Reset, typography, forms, accessibility
- [x] `/abstracts` - Variables, functions, mixins (no CSS output)
- [x] `/layout` - Grid, flexbox, container, breakpoints
- [x] `/utilities` - Minimal utility classes (display, spacing, text, visibility)
- [x] `/themes` - Light, dark, gradients (CSS custom properties)

### Key Decisions
- [x] User-customizable colors via CSS custom properties
- [x] Full import names (`as colors`, not `as c`)
- [x] Shared `styles.module.scss` per route (not per file)
- [x] PostCSS with autoprefixer + cssnano
- [x] Next.js built-in SCSS support (no config needed)
- [x] NO barrel exports for TSX components
- [x] Git history as rollback mechanism (no feature flags)

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-27  
**Status:** Clarification Complete
