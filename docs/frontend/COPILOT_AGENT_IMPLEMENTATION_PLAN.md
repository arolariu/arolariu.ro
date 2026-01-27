# TailwindCSS to SCSS Migration - Copilot Agent Implementation Plan

**Document Type:** Ultra Low-Level Implementation Plan for AI Agents  
**Created:** 2026-01-27  
**Target Audience:** GitHub Copilot Agents, Claude, GPT-4  
**Status:** Implementation Ready

---

## Overview

This document provides an **ultra-detailed, step-by-step implementation plan** for AI agents (Copilot, Claude, etc.) to execute the TailwindCSS to SCSS migration. Each task includes specific file paths, exact code to add/modify, validation steps, and success criteria.

---

## Prerequisites

### Required Reading
Agents **MUST** read these documents before starting:
1. `/home/runner/work/arolariu.ro/arolariu.ro/docs/rfc/3001-tailwindcss-to-scss-migration.md`
2. `/home/runner/work/arolariu.ro/arolariu.ro/docs/frontend/SCSS_ARCHITECTURE_DETAILED_SPEC.md`
3. `/home/runner/work/arolariu.ro/arolariu.ro/docs/frontend/TAILWIND_TO_SCSS_IMPLEMENTATION_GUIDE.md`

### Key Principles
- **Git History = Rollback**: No feature flags, commit frequently
- **Gradual Rollout**: Migrate component by component
- **Shared Styles**: One `styles.module.scss` per route (not per file)
- **Full Import Names**: Use `as colors`, NOT `as c`
- **No Barrel Exports**: Never create `index.ts` for TSX components
- **User-Customizable Colors**: Support via CSS custom properties

---

## Phase 1: Foundation Setup

### Task 1.1: Install Dependencies

**File:** `/home/runner/work/arolariu.ro/arolariu.ro/sites/arolariu.ro/package.json`

**Action:** Add SCSS dependencies, remove Tailwind

```bash
cd /home/runner/work/arolariu.ro/arolariu.ro/sites/arolariu.ro

# Install SCSS and PostCSS plugins
npm install -D sass@^1.87.0 autoprefixer@^10.4.20 cssnano@^7.0.6

# Remove Tailwind dependencies
npm uninstall tailwindcss @tailwindcss/postcss @tailwindcss/typography tailwindcss-animate daisyui
```

**Validation:**
```bash
# Check package.json shows correct deps
npm list sass
npm list tailwindcss  # Should show error (not found)
```

**Success Criteria:**
- `sass` version `^1.87.0` in `devDependencies`
- `autoprefixer` and `cssnano` installed
- All Tailwind packages removed

**Commit Message:**
```
chore: install SCSS dependencies and remove Tailwind packages

- Add sass@^1.87.0 for SCSS compilation
- Add autoprefixer and cssnano for PostCSS
- Remove tailwindcss and all plugins
- Part of Phase 1: Foundation Setup
```

---

### Task 1.2: Create SCSS Directory Structure

**Location:** `/home/runner/work/arolariu.ro/arolariu.ro/sites/arolariu.ro/src/styles/`

**Action:** Create all folders and empty placeholder files

```bash
cd /home/runner/work/arolariu.ro/arolariu.ro/sites/arolariu.ro/src

# Create directory structure
mkdir -p styles/{base,abstracts,tokens,layout,components,utilities,animations,themes}

# Create placeholder files (will populate in subsequent tasks)
touch styles/index.scss

# Base folder
touch styles/base/{_reset.scss,_typography.scss,_forms.scss,_accessibility.scss}

# Abstracts folder
touch styles/abstracts/{_variables.scss,_functions.scss,_mixins.scss}

# Tokens folder
touch styles/tokens/{_colors.scss,_typography.scss,_spacing.scss,_shadows.scss,_borders.scss,_transitions.scss,_z-index.scss}

# Layout folder
touch styles/layout/{_breakpoints.scss,_grid.scss,_flexbox.scss,_container.scss}

# Components folder (global styles)
touch styles/components/{_buttons.scss,_cards.scss,_forms.scss,_tables.scss,_navigation.scss}

# Utilities folder (minimal)
touch styles/utilities/{_display.scss,_spacing.scss,_text.scss,_visibility.scss}

# Animations folder
touch styles/animations/{_keyframes.scss,_transitions.scss}

# Themes folder
touch styles/themes/{_light.scss,_dark.scss,_gradients.scss}
```

**Validation:**
```bash
# Check directory structure created
tree src/styles
```

**Success Criteria:**
- 8 folders created under `src/styles/`
- 38 SCSS files created (empty placeholders)
- `index.scss` exists at root of `styles/`

**Commit Message:**
```
feat: create SCSS directory structure

- Create 8-folder hierarchy (base, abstracts, tokens, etc.)
- Add 38 placeholder SCSS files
- Prepare infrastructure for design system migration
- Part of Phase 1: Foundation Setup
```

---

### Task 1.3: Populate Design Tokens

**Priority Order:**
1. Colors (most critical)
2. Typography
3. Spacing
4. Breakpoints
5. Shadows, Borders, Transitions

#### Task 1.3.1: Create Color Tokens

**File:** `/home/runner/work/arolariu.ro/arolariu.ro/sites/arolariu.ro/src/styles/tokens/_colors.scss`

**Source:** Extract from `tailwind.config.ts` (lines 35-77)

**Implementation:**
```scss
/**
 * Color Design Tokens
 * 
 * Naming convention: $color-{semantic-name}-{shade}
 * All colors are HSL-based for easy manipulation
 * 
 * Source: Migrated from tailwind.config.ts
 */

// ============================================================================
// PRIMARY PALETTE (Blue)
// ============================================================================

$color-primary-50: hsl(221, 83%, 95%);
$color-primary-100: hsl(221, 83%, 90%);
$color-primary-200: hsl(221, 83%, 80%);
$color-primary-300: hsl(221, 83%, 70%);
$color-primary-400: hsl(221, 83%, 60%);
$color-primary-500: hsl(221, 83%, 53%);  // Base - from Tailwind config
$color-primary-600: hsl(221, 83%, 45%);
$color-primary-700: hsl(221, 83%, 35%);
$color-primary-800: hsl(221, 83%, 25%);
$color-primary-900: hsl(221, 83%, 15%);

// ============================================================================
// SECONDARY PALETTE (Gray)
// ============================================================================

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
// SEMANTIC COLORS (Light Mode Defaults - from globals.css)
// ============================================================================

// From globals.css :root block
$color-background: hsl(0, 0%, 100%);
$color-foreground: hsl(222, 84%, 5%);
$color-card: hsl(0, 0%, 100%);
$color-card-foreground: hsl(222, 84%, 5%);
$color-popover: hsl(0, 0%, 100%);
$color-popover-foreground: hsl(222, 84%, 5%);
$color-primary-foreground: hsl(210, 40%, 98%);
$color-secondary-foreground: hsl(222, 47%, 11%);
$color-muted: hsl(210, 40%, 96%);
$color-muted-foreground: hsl(215, 16%, 47%);
$color-accent: hsl(210, 40%, 96%);
$color-accent-foreground: hsl(222, 47%, 11%);
$color-border: hsl(214, 32%, 91%);
$color-input: hsl(214, 32%, 91%);
$color-ring: hsl(221, 83%, 53%);

// ============================================================================
// DESTRUCTIVE (Error/Delete)
// ============================================================================

$color-destructive: hsl(0, 84%, 60%);
$color-destructive-foreground: hsl(210, 40%, 98%);

// ============================================================================
// STATE COLORS
// ============================================================================

$color-success: hsl(142, 71%, 45%);
$color-success-foreground: hsl(0, 0%, 100%);
$color-warning: hsl(45, 93%, 47%);
$color-warning-foreground: hsl(0, 0%, 0%);
$color-error: $color-destructive;
$color-error-foreground: $color-destructive-foreground;
$color-info: hsl(199, 89%, 48%);
$color-info-foreground: hsl(0, 0%, 100%);

// ============================================================================
// GRADIENT THEME (User Customizable - from globals.css)
// ============================================================================

$color-gradient-from: hsl(187, 94%, 43%);  // Cyan-500
$color-gradient-via: hsl(262, 83%, 58%);   // Purple-500
$color-gradient-to: hsl(330, 81%, 60%);    // Pink-500

// Derived gradient colors
$color-accent-primary: $color-gradient-from;
$color-footer-bg: hsl(262, 83%, 35%);      // Darker purple

// ============================================================================
// DARK MODE OVERRIDES (from globals.css .dark block)
// ============================================================================

$color-background-dark: hsl(0, 0%, 0%);
$color-foreground-dark: hsl(0, 0%, 100%);
$color-card-dark: hsl(0, 0%, 5%);
$color-card-foreground-dark: hsl(0, 0%, 100%);
$color-popover-dark: hsl(0, 0%, 5%);
$color-popover-foreground-dark: hsl(0, 0%, 100%);
$color-primary-foreground-dark: hsl(0, 0%, 100%);
$color-secondary-foreground-dark: hsl(0, 0%, 100%);
$color-muted-dark: hsl(0, 0%, 15%);
$color-muted-foreground-dark: hsl(0, 0%, 70%);
$color-accent-dark: hsl(214, 100%, 50%);
$color-accent-foreground-dark: hsl(0, 0%, 100%);
$color-border-dark: hsl(0, 0%, 20%);
$color-input-dark: hsl(0, 0%, 20%);
$color-ring-dark: hsl(214, 100%, 50%);

// ============================================================================
// UTILITY FUNCTIONS
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

**Validation:**
```bash
# Check file compiles
npx sass src/styles/tokens/_colors.scss --no-source-map --stop-on-error
```

**Success Criteria:**
- File compiles without errors
- All colors from `tailwind.config.ts` and `globals.css` are represented
- HSL format used consistently
- Utility functions defined

**Commit Message:**
```
feat: add color design tokens

- Port all colors from tailwind.config.ts and globals.css
- Use HSL format for easy manipulation
- Add primary, secondary, semantic, and gradient color palettes
- Include dark mode color overrides
- Add color utility functions (lighten, darken, alpha)
- Part of Phase 1: Foundation Setup (Task 1.3.1)
```

#### Task 1.3.2: Create Typography Tokens

**File:** `/home/runner/work/arolariu.ro/arolariu.ro/sites/arolariu.ro/src/styles/tokens/_typography.scss`

**Source:** Extract font families from current implementation + define Major Third type scale

**Implementation:**
```scss
/**
 * Typography Design Tokens
 * 
 * Font families, sizes, weights, line heights, letter spacing
 * Type scale based on Major Third (1.250 ratio)
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
// FONT SIZES (Major Third Scale - 1.250 ratio)
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
// TEXT TRANSFORM MIXINS
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

**Validation:**
```bash
npx sass src/styles/tokens/_typography.scss --no-source-map --stop-on-error
```

**Success Criteria:**
- File compiles without errors
- 11 font sizes defined (Major Third scale)
- 5 font weights defined
- 3 font families defined
- Line heights and letter spacing complete

**Commit Message:**
```
feat: add typography design tokens

- Define font families (base, dyslexic, mono)
- Create Major Third type scale (11 sizes from xs to 7xl)
- Add font weights (400-800)
- Define line heights and letter spacing
- Add text transform mixins
- Part of Phase 1: Foundation Setup (Task 1.3.2)
```

#### Task 1.3.3-1.3.7: Create Remaining Tokens

Continue pattern for:
- `_spacing.scss` (8-point grid system)
- `_shadows.scss` (7-level shadow scale)
- `_borders.scss` (border radius tokens)
- `_transitions.scss` (duration and easing tokens)
- `_z-index.scss` (z-index layers)

**Reference:** See `TAILWIND_TO_SCSS_IMPLEMENTATION_GUIDE.md` for complete token definitions

**Commit each separately with descriptive messages**

---

### Task 1.4: Create Breakpoints System

**File:** `/home/runner/work/arolariu.ro/arolariu.ro/sites/arolariu.ro/src/styles/layout/_breakpoints.scss`

**Source:** From `tailwind.config.ts` screens object (lines 24-32)

**Implementation:**
```scss
/**
 * Responsive Breakpoints & Media Query Mixins
 * Source: Migrated from tailwind.config.ts screens
 */

// ============================================================================
// BREAKPOINT TOKENS (from Tailwind config)
// ============================================================================

$breakpoint-2xsm: 320px;   // Custom extra small
$breakpoint-xsm: 480px;    // Custom small
$breakpoint-sm: 640px;     // Tailwind default
$breakpoint-md: 768px;     // Tailwind default
$breakpoint-lg: 1024px;    // Tailwind default
$breakpoint-xl: 1280px;    // Tailwind default
$breakpoint-2xl: 1440px;   // Custom
$breakpoint-3xl: 1976px;   // Custom ultra-wide

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

// ============================================================================
// RANGE MIXINS (Between Breakpoints)
// ============================================================================

@mixin media-between($min, $max) {
  @media (min-width: $min) and (max-width: ($max - 1px)) {
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
```

**Validation:**
```bash
# Compile and check for errors
npx sass src/styles/layout/_breakpoints.scss --no-source-map --stop-on-error

# Test mixin usage
cat << 'EOF' > /tmp/test-breakpoints.scss
@use 'src/styles/layout/breakpoints' as breakpoints;

.test {
  display: none;
  
  @include breakpoints.media-lg-up {
    display: block;
  }
}
EOF

npx sass /tmp/test-breakpoints.scss --no-source-map --stop-on-error
```

**Success Criteria:**
- 8 breakpoints defined
- Min-width mixins for all breakpoints
- Helper mixins (max, between, reduce-motion, hover) defined
- Test compilation succeeds

**Commit Message:**
```
feat: add responsive breakpoints and media query mixins

- Port all breakpoints from tailwind.config.ts (320px-1976px)
- Create mobile-first media query mixins (8 breakpoints)
- Add helper mixins (max-width, between, motion, hover)
- Part of Phase 1: Foundation Setup (Task 1.4)
```

---

### Task 1.5: Create Base Styles

**Files:** All files in `src/styles/base/`

**Reference:** See `SCSS_ARCHITECTURE_DETAILED_SPEC.md` for complete implementations

**Priority:**
1. `_reset.scss` - Modern CSS reset
2. `_typography.scss` - Base element typography
3. `_forms.scss` - Form element defaults
4. `_accessibility.scss` - A11y utilities

**Implementation Steps:**
1. Copy code from `SCSS_ARCHITECTURE_DETAILED_SPEC.md` for each file
2. Ensure imports use full names (`as colors`, not `as c`)
3. Compile each file individually for validation
4. Commit each file separately

**Validation (per file):**
```bash
npx sass src/styles/base/_reset.scss --no-source-map --stop-on-error
npx sass src/styles/base/_typography.scss --no-source-map --stop-on-error
npx sass src/styles/base/_forms.scss --no-source-map --stop-on-error
npx sass src/styles/base/_accessibility.scss --no-source-map --stop-on-error
```

**Commit Messages:**
```
feat: add modern CSS reset
feat: add base typography styles
feat: add form element defaults
feat: add accessibility utilities
```

---

### Task 1.6: Create Main Entry Point

**File:** `/home/runner/work/arolariu.ro/arolariu.ro/sites/arolariu.ro/src/styles/index.scss`

**Implementation:**
```scss
/**
 * Main SCSS Entry Point
 * 
 * Import order matters:
 * 1. Abstracts (no CSS output)
 * 2. Tokens (CSS custom properties)
 * 3. Base (element defaults)
 * 4. Layout (structural utilities)
 * 5. Components (global)
 * 6. Themes (light/dark/gradients)
 * 7. Utilities (helpers)
 * 8. Animations (keyframes)
 */

// 1. Abstracts (no CSS output)
@use 'abstracts/variables';
@use 'abstracts/functions';
@use 'abstracts/mixins';

// 2. Design Tokens
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

// 5. Components (global - populate in Phase 2)
// @use 'components/buttons';
// @use 'components/cards';
// @use 'components/forms';
// @use 'components/tables';
// @use 'components/navigation';

// 6. Themes
@use 'themes/light';
@use 'themes/dark';
@use 'themes/gradients';

// 7. Utilities (minimal)
@use 'utilities/display';
@use 'utilities/spacing';
@use 'utilities/text';
@use 'utilities/visibility';

// 8. Animations
@use 'animations/keyframes';
@use 'animations/transitions';
```

**Validation:**
```bash
# Compile main entry point (will fail if any imports are broken)
npx sass src/styles/index.scss --no-source-map --stop-on-error
```

**Success Criteria:**
- File compiles without errors
- All @use statements resolve
- Import order correct

**Commit Message:**
```
feat: add main SCSS entry point

- Create index.scss with all module imports
- Define correct import order (abstracts → tokens → base → etc.)
- Ready for integration into globals.css
- Part of Phase 1: Foundation Setup (Task 1.6)
```

---

### Task 1.7: Update globals.css

**File:** `/home/runner/work/arolariu.ro/arolariu.ro/sites/arolariu.ro/src/app/globals.css`

**Action:** Replace Tailwind directives with SCSS import

**Before:**
```css
@import 'tailwindcss';
@config '../../tailwind.config.ts';
@plugin "daisyui";

/* ... rest of file ... */
```

**After:**
```css
/**
 * Global Styles Entry Point
 * 
 * This file imports the SCSS design system and defines CSS custom properties
 */

/* Import SCSS Design System */
@import '../styles/index.scss';

/* CSS Custom Properties remain unchanged */
@layer base {
  :root {
    /* ... keep existing CSS variables ... */
  }
  
  .dark {
    /* ... keep existing dark mode variables ... */
  }
}

/* ... keep all other existing styles (utilities, custom animations, etc.) ... */
```

**Validation:**
```bash
# Check for syntax errors
npm run dev:website

# Verify in browser at http://localhost:3000
# Check console for CSS errors
```

**Success Criteria:**
- Dev server starts without errors
- No CSS compilation errors in console
- Page renders (even if unstyled - expected at this stage)

**Commit Message:**
```
feat: integrate SCSS design system into globals.css

- Replace Tailwind directives with SCSS import
- Keep existing CSS custom properties
- Keep custom animations and utilities
- Part of Phase 1: Foundation Setup (Task 1.7)
```

---

### Task 1.8: Update PostCSS Configuration

**File:** `/home/runner/work/arolariu.ro/arolariu.ro/sites/arolariu.ro/postcss.config.js`

**Before:**
```javascript
const postcssConfig = {
  plugins: {
    "@tailwindcss/postcss": {},
    cssnano: {},
  },
};

export default postcssConfig;
```

**After:**
```javascript
/**
 * PostCSS Configuration
 * 
 * Plugins:
 * - autoprefixer: Add vendor prefixes
 * - cssnano: Minification (production only)
 */

const postcssConfig = {
  plugins: {
    // Add vendor prefixes automatically
    autoprefixer: {},
    
    // Minify CSS in production
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

**Validation:**
```bash
# Build for production
npm run build:website

# Check output CSS is minified
ls -lh .next/static/css/*.css
```

**Success Criteria:**
- Build succeeds
- CSS files are minified in production
- Vendor prefixes added where needed

**Commit Message:**
```
chore: update PostCSS config for SCSS pipeline

- Remove Tailwind PostCSS plugin
- Add autoprefixer for vendor prefixes
- Configure cssnano for production minification
- Part of Phase 1: Foundation Setup (Task 1.8)
```

---

### Task 1.9: Delete Tailwind Configuration

**Files to Delete:**
- `/home/runner/work/arolariu.ro/arolariu.ro/sites/arolariu.ro/tailwind.config.ts`

**Action:**
```bash
cd /home/runner/work/arolariu.ro/arolariu.ro/sites/arolariu.ro
git rm tailwind.config.ts
```

**Validation:**
```bash
# Ensure file deleted
ls tailwind.config.ts  # Should show "No such file"

# Build still works
npm run build:website
```

**Success Criteria:**
- File deleted
- Build succeeds without looking for tailwind.config.ts

**Commit Message:**
```
chore: remove Tailwind configuration file

- Delete tailwind.config.ts (no longer needed)
- All Tailwind configuration migrated to SCSS tokens
- Part of Phase 1: Foundation Setup (Task 1.9)
```

---

## Phase 1 Complete - Validation

**Run comprehensive validation:**

```bash
cd /home/runner/work/arolariu.ro/arolariu.ro/sites/arolariu.ro

# 1. Check all SCSS files compile
npm run build:website

# 2. Start dev server
npm run dev:website

# 3. Visit http://localhost:3000
# Expected: Page loads, but uses default browser styles (Tailwind classes not working - expected)

# 4. Check for errors in console
# Expected: No CSS compilation errors, may see visual issues (expected at this stage)
```

**Success Criteria for Phase 1:**
- ✅ All SCSS files created (38 files)
- ✅ Design tokens populated (colors, typography, spacing, etc.)
- ✅ Base styles implemented
- ✅ Main SCSS entry point compiles
- ✅ globals.css imports SCSS
- ✅ PostCSS configured
- ✅ Tailwind removed
- ✅ Build succeeds
- ✅ Dev server starts

**Expected State:**
- SCSS infrastructure complete
- Design system foundations in place
- Website visually broken (Tailwind classes no longer work)
- Ready to begin component migration in Phase 2

---

## Phase 2: Component Migration

### Component Migration Template

For each component, follow this pattern:

**Example: Header Component**

#### Step 2.1: Create SCSS Module

**File:** `/home/runner/work/arolariu.ro/arolariu.ro/sites/arolariu.ro/src/components/Header/Header.module.scss`

**Process:**
1. Read existing `/home/runner/work/arolariu.ro/arolariu.ro/sites/arolariu.ro/src/components/Header.tsx`
2. Extract all className declarations
3. Map Tailwind utilities to SCSS properties (use cheat sheet)
4. Create semantic class names using BEM pattern
5. Use full import names (`as colors`, NOT `as c`)

**Implementation:**
```scss
/**
 * Header Component Styles
 */

@use '@/styles/tokens/colors' as colors;
@use '@/styles/tokens/spacing' as spacing;
@use '@/styles/tokens/typography' as typography;
@use '@/styles/layout/breakpoints' as breakpoints;

.header {
  // print:hidden
  @media print {
    display: none;
  }
}

.nav {
  // navbar 2xsm:fixed 2xsm:top-0 2xsm:z-50 bg-white text-black lg:relative lg:z-auto dark:bg-black dark:text-white
  background-color: var(--color-background);
  color: var(--color-foreground);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  
  @include breakpoints.media-lg-up {
    position: relative;
    z-index: auto;
  }
}

.navStart {
  // navbar-start flex flex-row flex-nowrap
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
}

.logo {
  // ml-2 flex items-center font-medium hover:text-yellow-300
  margin-left: spacing.$spacing-2;
  display: flex;
  align-items: center;
  font-weight: typography.$font-weight-medium;
  transition: color 0.2s ease;
  
  &:hover {
    color: hsl(45, 93%, 47%); // Yellow-300 from Tailwind
  }
}

.logoImage {
  // 2xsm:hidden rounded-full ring-2 ring-indigo-500 lg:block
  border-radius: 50%;
  box-shadow: 0 0 0 2px colors.$color-primary-500; // ring-2 ring-indigo-500
  
  @include breakpoints.media-max(breakpoints.$breakpoint-lg) {
    display: none; // 2xsm:hidden (hidden until lg)
  }
  
  @include breakpoints.media-lg-up {
    display: block; // lg:block
  }
}

.logoText {
  // ml-3 text-xl
  margin-left: spacing.$spacing-3;
  font-size: typography.$font-size-xl;
}

// Continue for remaining elements (navCenter, navEnd, etc.)
```

#### Step 2.2: Update TSX Component

**File:** `/home/runner/work/arolariu.ro/arolariu.ro/sites/arolariu.ro/src/components/Header.tsx`

**Changes:**
1. Add SCSS module import at top
2. Replace className strings with styles.className
3. Remove any `cn()` utility usage (not needed with SCSS Modules)

**Before:**
```tsx
export function Header() {
  return (
    <header className="print:hidden">
      <nav className="navbar 2xsm:fixed 2xsm:top-0 ...">
```

**After:**
```tsx
import styles from './Header/Header.module.scss';

export function Header() {
  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
```

#### Step 2.3: Validate Component

```bash
# 1. Check SCSS compiles
npx sass src/components/Header/Header.module.scss --no-source-map --stop-on-error

# 2. Build project
npm run build:website

# 3. Visual test
npm run dev:website
# Navigate to http://localhost:3000
# Verify Header looks correct

# 4. Responsive test
# Resize browser window through breakpoints
# Verify mobile/tablet/desktop layouts work

# 5. Dark mode test
# Toggle dark mode
# Verify colors switch correctly
```

#### Step 2.4: Commit

**Success Criteria:**
- Header renders correctly
- Responsive behavior maintained
- Dark mode works
- No visual regressions

**Commit Message:**
```
feat: migrate Header component to SCSS

- Create Header.module.scss with BEM-style classes
- Map all Tailwind utilities to semantic SCSS
- Update Header.tsx to use CSS Modules
- Test: responsive, dark mode, print styles
- Part of Phase 2: Component Migration
```

---

### Component Migration Order

**Week 1, Days 3-5:**
1. Header (12h) - Critical path
2. Footer (14h) - Critical path
3. Button component library (8h)
4. Card component library (6h)
5. Navigation (8h)

**Total: 48 hours**

---

### Page Migration Pattern (Shared Styles)

**Example: Invoice Domain**

#### File Structure

```
app/domains/invoices/
├── page.tsx
├── island.tsx
├── layout.tsx
├── loading.tsx
└── styles.module.scss  # ONE shared file for ALL 4 above
```

#### SCSS Module Organization

```scss
// app/domains/invoices/styles.module.scss

@use '@/styles/tokens/colors' as colors;
@use '@/styles/tokens/spacing' as spacing;
@use '@/styles/layout/breakpoints' as breakpoints;

// ============================================================================
// SHARED STYLES (used by multiple files)
// ============================================================================

.pageContainer {
  // Used by both page.tsx and island.tsx
  min-height: 100vh;
  padding: spacing.$spacing-8 spacing.$spacing-4;
  
  @include breakpoints.media-md-up {
    padding: spacing.$spacing-12 spacing.$spacing-8;
  }
}

// ============================================================================
// ISLAND.TSX SPECIFIC (Client Component)
// ============================================================================

.interactiveGrid {
  display: grid;
  gap: spacing.$spacing-6;
  grid-template-columns: 1fr;
  
  @include breakpoints.media-lg-up {
    grid-template-columns: repeat(12, 1fr);
  }
}

// ============================================================================
// LAYOUT.TSX SPECIFIC
// ============================================================================

.layoutWrapper {
  max-width: 1440px;
  margin: 0 auto;
}

// ============================================================================
// LOADING.TSX SPECIFIC
// ============================================================================

.shimmerContainer {
  display: flex;
  flex-direction: column;
  gap: spacing.$spacing-4;
}

.shimmerCard {
  animation: shimmer 1.5s infinite;
  height: 200px;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

// ============================================================================
// PAGE.TSX SPECIFIC
// ============================================================================

.serverContent {
  // Styles for server-rendered content
}
```

#### Usage in Components

```tsx
// All 4 files import the SAME styles.module.scss

// page.tsx
import styles from './styles.module.scss';
<div className={styles.pageContainer}>

// island.tsx
import styles from './styles.module.scss';
<div className={styles.interactiveGrid}>

// layout.tsx
import styles from './styles.module.scss';
<div className={styles.layoutWrapper}>

// loading.tsx
import styles from './styles.module.scss';
<div className={styles.shimmerContainer}>
```

---

## Testing Strategy

### Per-Component Testing

After migrating each component:

**1. Visual Regression**
```bash
# Take screenshot
npm run test:e2e -- --update-snapshots

# Compare with baseline
npm run test:e2e
```

**2. Responsive Testing**
- Test all breakpoints: 320px, 768px, 1024px, 1440px
- Check mobile/tablet/desktop layouts
- Verify no horizontal scroll

**3. Dark Mode Testing**
- Toggle dark mode
- Verify all colors switch correctly
- Check contrast ratios

**4. Accessibility Testing**
```bash
# Run axe-core checks
npm run test:a11y
```

---

## Git Workflow

### Commit Frequency
- Commit after EACH task completion
- Commit after EACH component migration
- Use descriptive commit messages

### Commit Message Template
```
<type>: <brief description>

- Detail 1
- Detail 2
- Test: <validation performed>
- Part of Phase X: <phase name>
```

Types: `feat`, `chore`, `fix`, `refactor`, `docs`

### Git History as Rollback

If something breaks:
```bash
# Find last working commit
git log --oneline

# Reset to that commit
git reset --hard <commit-sha>

# Restore specific file
git checkout <commit-sha> -- path/to/file
```

---

## Progress Tracking

### Phase 1 Checklist
- [ ] Task 1.1: Install dependencies
- [ ] Task 1.2: Create SCSS structure
- [ ] Task 1.3: Populate design tokens
- [ ] Task 1.4: Create breakpoints
- [ ] Task 1.5: Create base styles
- [ ] Task 1.6: Create main entry point
- [ ] Task 1.7: Update globals.css
- [ ] Task 1.8: Update PostCSS config
- [ ] Task 1.9: Delete Tailwind config

### Phase 2 Checklist
- [ ] Header component
- [ ] Footer component
- [ ] Button component library
- [ ] Card component library
- [ ] Navigation component
- [ ] Invoice domain pages
- [ ] Upload domain pages
- [ ] My Profile pages
- [ ] Remaining components

---

## Success Criteria

### Phase 1 Complete
- All SCSS infrastructure in place
- Design system foundations ready
- Build pipeline configured
- Tailwind completely removed

### Phase 2 Complete
- All components migrated
- No Tailwind className strings remain
- All styles use CSS Modules
- Visual parity with Tailwind version

### Migration Complete
- 0 Tailwind dependencies
- 100% CSS Modules adoption
- User-customizable color system works
- Dark mode functions correctly
- Performance targets met

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-27  
**Status:** Ready for Agent Execution
