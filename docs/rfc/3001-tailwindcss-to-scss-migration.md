# RFC 3001: TailwindCSS to SCSS Migration

**Status:** Draft  
**Created:** 2026-01-26  
**Authors:** @copilot, @arolariu  
**Priority:** P3 - Low  
**Estimated Effort:** XL (1-2 weeks)

---

## Executive Summary

This RFC outlines the comprehensive migration strategy from TailwindCSS to SCSS with CSS Modules for the `arolariu.ro` frontend application. The migration addresses vendor lock-in concerns, brand identity management challenges, and positions the codebase for long-term maintainability independent of external commercial frameworks.

### Key Objectives

1. **Eliminate Vendor Lock-in**: Remove dependency on TailwindCSS commercial ecosystem
2. **Brand Identity Control**: Implement design system with SCSS variables and mixins
3. **Performance**: Maintain or improve bundle sizes through scoped CSS Modules
4. **Developer Experience**: Preserve or enhance development velocity
5. **Maintainability**: Create sustainable, self-documenting styles architecture

---

## Current State Analysis

### TailwindCSS Usage Landscape

**Quantitative Metrics:**
- **Total Files:** 230 TSX files across the application
- **App Directory Files:** 195 TSX files
- **className Declarations:** 3,715 instances
- **Component Library Imports:** 102 files importing from `@arolariu/components`
- **Shadcn/UI Components:** 60+ UI primitives (Button, Card, Dialog, etc.)

**Configuration Footprint:**
```typescript
// Current TailwindCSS Setup
- tailwind.config.ts (102 lines)
- globals.css (213 lines - includes Tailwind directives)
- postcss.config.js (Tailwind PostCSS integration)
- Package dependencies: 
  - @tailwindcss/postcss
  - @tailwindcss/typography
  - tailwindcss-animate
  - daisyui (plugin)
```

### Most Common TailwindCSS Patterns

Based on automated analysis of 3,715 className usages:

| Pattern | Occurrences | Category |
|---------|-------------|----------|
| `h-4 w-4` | 119 | Icon sizing |
| `text-muted-foreground text-xs` | 89 | Typography |
| `space-y-2` | 69 | Vertical spacing |
| `flex items-center gap-2` | 66 | Flexbox layout |
| `mr-2 h-4 w-4` | 61 | Icon spacing |
| `text-muted-foreground text-sm` | 59 | Typography |
| `flex items-center justify-between` | 55 | Layout |
| `space-y-4` | 46 | Vertical spacing |
| `text-sm font-medium` | 44 | Typography |
| `cursor-pointer` | 44 | Interaction |

**Utility Class Distribution:**
- Text utilities: 2,073 instances (55.8%)
- Flexbox: 897 instances (24.1%)
- Padding: 776 instances (20.9%)
- Background: 581 instances (15.6%)
- Border: 358 instances (9.6%)
- Rounded: 340 instances (9.2%)
- Grid: 283 instances (7.6%)
- Margin: 258 instances (6.9%)
- Dark mode: 247 instances (6.6%)
- Hover states: 232 instances (6.2%)
- Shadow: 120 instances (3.2%)

### Color System Architecture

**Current CSS Variables (HSL-based):**
```css
/* Light Mode */
--background: 0 0% 100%;
--foreground: 222.2 84% 4.9%;
--primary: 221.2 83.2% 53.3%;
--secondary: 210 40% 96.1%;
--muted: 210 40% 96.1%;
--accent: 210 40% 96.1%;
--destructive: 0 84.2% 60.2%;
--border: 214.3 31.8% 91.4%;
--ring: 221.2 83.2% 53.3%;

/* Gradient Theme (User Customizable) */
--gradient-from: 187 94% 43%;  /* cyan-500 */
--gradient-via: 262 83% 58%;   /* purple-500 */
--gradient-to: 330 81% 60%;    /* pink-500 */
--accent-primary: var(--gradient-from);
--footer-bg: 262 83% 35%;
```

### Responsive Breakpoints

```typescript
screens: {
  "2xsm": "320px",  // Custom extra small
  "xsm": "480px",   // Custom small
  "sm": "640px",    // Tailwind default
  "md": "768px",    // Tailwind default
  "lg": "1024px",   // Tailwind default
  "xl": "1280px",   // Tailwind default
  "2xl": "1440px",  // Custom
  "3xl": "1976px",  // Custom ultra-wide
}
```

### Component Architecture

**Directory Structure:**
```
src/
├── app/                          # Next.js App Router
│   ├── globals.css              # TailwindCSS imports + custom styles
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Homepage
│   ├── domains/                 # Feature domains
│   │   └── invoices/           # Invoice management
│   │       ├── page.tsx        # RSC entry
│   │       ├── island.tsx      # Client wrapper
│   │       ├── layout.tsx      # Domain layout
│   │       ├── loading.tsx     # Loading state
│   │       └── _components/    # Domain-specific components
│   └── _components/            # App-level shared components
├── components/                  # Reusable components with logic
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── Navigation.tsx
│   └── Commander.tsx
└── presentation/               # UI-only components (no logic)
    └── Text/
        └── RichText.tsx
```

**Page Structure Pattern (Turbopack Optimization):**
```
/domains/invoices/
├── page.tsx       # Server component - initial data fetch
├── island.tsx     # Client component - interactive UI
├── layout.tsx     # Server component - shell structure
└── loading.tsx    # Server component - loading states

// Current: Each file has inline className utilities
// Target: Shared styles.module.scss for bundling efficiency
```

### Component Library (@arolariu/components)

**Dependencies:**
- Based on shadcn/ui primitives
- 60+ UI components
- Built with Radix UI + Tailwind
- Uses `cn()` utility for className merging
- Heavy TailwindCSS integration

**Critical Components:**
```typescript
// High-frequency usage
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Table, TableBody, TableCell, TableHead, TableRow,
  Badge, Separator, Tooltip, TooltipContent, TooltipTrigger,
  toast, cn
} from "@arolariu/components";
```

### Custom Animations & Effects

```css
/* Custom Tailwind Utilities in globals.css */
.bg-grid-pattern { /* Grid background effect */ }
.text-glow { /* Text glow effect */ }
.text-glow-strong { /* Enhanced text glow */ }
.blue-underline { /* Animated underline */ }
.glow-effect { /* Hover glow animation */ }

@keyframes float { /* Floating animation */ }
@keyframes glowing { /* Glowing animation */ }
```

---

## Problem Statement

### Business Concerns

1. **Vendor Lock-in Risk**
   - TailwindCSS v4+ introduces potential commercial features
   - Dependency on third-party evolution roadmap
   - Limited control over breaking changes

2. **Brand Identity Management**
   - Difficulty maintaining consistent brand identity with utility classes
   - CSS-in-JS approach obscures design system hierarchy
   - Hard to extract and document design tokens

3. **Long-term Sustainability**
   - LLM capability reduces TailwindCSS value proposition
   - Uncertain commercial model trajectory
   - Need for framework-agnostic styling solution

### Technical Pain Points

1. **Cognitive Overhead**
   - Long className strings reduce readability
   - Example: `className='animate-in slide-in-from-bottom-4 mb-8 duration-500'`
   - Difficult to identify component boundaries

2. **Purge/Tree-shaking Complexity**
   - JIT mode compilation delays
   - Dynamic className generation challenges
   - Bundle size unpredictability

3. **Customization Friction**
   - Complex theme extension syntax
   - Plugin ecosystem dependency
   - Override hierarchy conflicts

4. **Developer Onboarding**
   - Tailwind-specific knowledge requirement
   - Utility-first mindset learning curve
   - Documentation fragmentation

---

## Proposed Solution: SCSS + CSS Modules Architecture

### Design Philosophy

**Core Principles:**
1. **Component-Scoped Styles**: CSS Modules prevent global namespace pollution
2. **Design Token System**: SCSS variables create single source of truth
3. **Semantic Class Names**: BEM-inspired naming for clarity
4. **Progressive Enhancement**: Graceful degradation patterns
5. **Performance First**: Critical CSS inlining, lazy-loading strategies

### SCSS Directory Structure

```
sites/arolariu.ro/src/styles/
├── index.scss                    # Main entry point (imports all)
│
├── base/                         # Reset, normalize, base element styles
│   ├── _reset.scss              # Modern CSS reset
│   ├── _typography.scss         # Base typography styles
│   ├── _forms.scss              # Form element defaults
│   └── _accessibility.scss      # A11y utilities (sr-only, focus-visible)
│
├── abstracts/                    # Variables, mixins, functions (no output)
│   ├── _variables.scss          # Design tokens
│   ├── _functions.scss          # SCSS utility functions
│   └── _mixins.scss             # Reusable mixins
│
├── tokens/                       # Design system tokens
│   ├── _colors.scss             # Color palette with semantic names
│   ├── _typography.scss         # Font families, sizes, line-heights
│   ├── _spacing.scss            # Spacing scale (margins, paddings)
│   ├── _shadows.scss            # Shadow tokens
│   ├── _borders.scss            # Border radius, widths
│   ├── _transitions.scss        # Animation durations, easings
│   └── _z-index.scss            # Z-index layers
│
├── layout/                       # Layout utilities
│   ├── _grid.scss               # Grid system
│   ├── _flexbox.scss            # Flexbox utilities
│   ├── _container.scss          # Container widths
│   └── _breakpoints.scss        # Media query mixins
│
├── components/                   # Global component styles
│   ├── _buttons.scss            # Button variants
│   ├── _cards.scss              # Card styles
│   ├── _forms.scss              # Form component styles
│   ├── _tables.scss             # Table styles
│   └── _navigation.scss         # Navigation patterns
│
├── utilities/                    # Utility classes (sparingly used)
│   ├── _display.scss            # Display utilities
│   ├── _spacing.scss            # Margin/padding utilities
│   ├── _text.scss               # Text utilities
│   └── _visibility.scss         # Show/hide utilities
│
├── animations/                   # Animation definitions
│   ├── _keyframes.scss          # @keyframes definitions
│   └── _transitions.scss        # Transition presets
│
└── themes/                       # Theme definitions
    ├── _light.scss              # Light mode variables
    ├── _dark.scss               # Dark mode variables
    └── _gradients.scss          # User-customizable gradients
```

### Design Token System

#### Color Tokens (`tokens/_colors.scss`)

```scss
// Primary Color Palette
$color-primary-50: hsl(221, 83%, 95%);
$color-primary-100: hsl(221, 83%, 90%);
$color-primary-200: hsl(221, 83%, 80%);
$color-primary-300: hsl(221, 83%, 70%);
$color-primary-400: hsl(221, 83%, 60%);
$color-primary-500: hsl(221, 83%, 53%);  // Base primary
$color-primary-600: hsl(221, 83%, 45%);
$color-primary-700: hsl(221, 83%, 35%);
$color-primary-800: hsl(221, 83%, 25%);
$color-primary-900: hsl(221, 83%, 15%);

// Semantic Color Mapping
$color-background: hsl(0, 0%, 100%);
$color-foreground: hsl(222, 84%, 5%);
$color-border: hsl(214, 32%, 91%);
$color-input: hsl(214, 32%, 91%);
$color-ring: $color-primary-500;

// State Colors
$color-success: hsl(142, 71%, 45%);
$color-warning: hsl(45, 93%, 47%);
$color-error: hsl(0, 84%, 60%);
$color-info: hsl(199, 89%, 48%);

// Gradient Theme (User Customizable via CSS Variables)
$color-gradient-from: hsl(187, 94%, 43%);  // cyan-500
$color-gradient-via: hsl(262, 83%, 58%);   // purple-500
$color-gradient-to: hsl(330, 81%, 60%);    // pink-500

// Dark Mode Overrides (applied via .dark class)
$color-background-dark: hsl(0, 0%, 0%);
$color-foreground-dark: hsl(0, 0%, 100%);
$color-border-dark: hsl(0, 0%, 20%);
```

#### Typography Tokens (`tokens/_typography.scss`)

```scss
// Font Families
$font-family-base: var(--font-default), -apple-system, BlinkMacSystemFont, 
                   'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
$font-family-dyslexic: var(--font-dyslexic), OpenDyslexic, $font-family-base;
$font-family-mono: 'Fira Code', 'Courier New', monospace;

// Font Sizes (Type Scale - Major Third 1.250)
$font-size-xs: 0.75rem;      // 12px
$font-size-sm: 0.875rem;     // 14px
$font-size-base: 1rem;       // 16px
$font-size-lg: 1.125rem;     // 18px
$font-size-xl: 1.25rem;      // 20px
$font-size-2xl: 1.5rem;      // 24px
$font-size-3xl: 1.875rem;    // 30px
$font-size-4xl: 2.25rem;     // 36px
$font-size-5xl: 3rem;        // 48px

// Font Weights
$font-weight-normal: 400;
$font-weight-medium: 500;
$font-weight-semibold: 600;
$font-weight-bold: 700;

// Line Heights
$line-height-tight: 1.25;
$line-height-normal: 1.5;
$line-height-relaxed: 1.75;
$line-height-loose: 2;

// Letter Spacing
$letter-spacing-tighter: -0.05em;
$letter-spacing-tight: -0.025em;
$letter-spacing-normal: 0;
$letter-spacing-wide: 0.025em;
$letter-spacing-wider: 0.05em;
$letter-spacing-widest: 0.1em;
```

#### Spacing Tokens (`tokens/_spacing.scss`)

```scss
// Spacing Scale (8px base unit)
$spacing-0: 0;
$spacing-1: 0.25rem;   // 4px
$spacing-2: 0.5rem;    // 8px
$spacing-3: 0.75rem;   // 12px
$spacing-4: 1rem;      // 16px
$spacing-5: 1.25rem;   // 20px
$spacing-6: 1.5rem;    // 24px
$spacing-8: 2rem;      // 32px
$spacing-10: 2.5rem;   // 40px
$spacing-12: 3rem;     // 48px
$spacing-16: 4rem;     // 64px
$spacing-20: 5rem;     // 80px
$spacing-24: 6rem;     // 96px
$spacing-32: 8rem;     // 128px

// Container Padding
$container-padding-mobile: $spacing-4;
$container-padding-tablet: $spacing-6;
$container-padding-desktop: $spacing-8;
```

#### Breakpoints (`layout/_breakpoints.scss`)

```scss
// Breakpoint Tokens
$breakpoint-2xsm: 320px;
$breakpoint-xsm: 480px;
$breakpoint-sm: 640px;
$breakpoint-md: 768px;
$breakpoint-lg: 1024px;
$breakpoint-xl: 1280px;
$breakpoint-2xl: 1440px;
$breakpoint-3xl: 1976px;

// Media Query Mixins
@mixin media-2xsm-up {
  @media (min-width: $breakpoint-2xsm) { @content; }
}

@mixin media-sm-up {
  @media (min-width: $breakpoint-sm) { @content; }
}

@mixin media-md-up {
  @media (min-width: $breakpoint-md) { @content; }
}

@mixin media-lg-up {
  @media (min-width: $breakpoint-lg) { @content; }
}

@mixin media-xl-up {
  @media (min-width: $breakpoint-xl) { @content; }
}

@mixin media-2xl-up {
  @media (min-width: $breakpoint-2xl) { @content; }
}

// Between breakpoints
@mixin media-between($min, $max) {
  @media (min-width: $min) and (max-width: $max - 1px) { @content; }
}

// Max-width (mobile-first exceptions)
@mixin media-max($breakpoint) {
  @media (max-width: $breakpoint - 1px) { @content; }
}
```

#### Shadow Tokens (`tokens/_shadows.scss`)

```scss
// Shadow Scale
$shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
$shadow-base: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
$shadow-md: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
$shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
$shadow-xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
$shadow-2xl: 0 35px 60px -15px rgba(0, 0, 0, 0.3);

// Dark Mode Shadows
$shadow-dark-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.5), 0 1px 2px 0 rgba(0, 0, 0, 0.3);
$shadow-dark-md: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3);
$shadow-dark-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3);
```

---

## CSS Modules Strategy

### Naming Convention (BEM-inspired)

**Format:** `Block__Element--Modifier`

```scss
// Component: InvoiceCard
.invoice-card {
  // Block styles
  
  &__header {
    // Element: header
  }
  
  &__title {
    // Element: title
    
    &--large {
      // Modifier: large variant
    }
  }
  
  &__content {
    // Element: content
  }
  
  &--featured {
    // Modifier: featured state
  }
}
```

### Component + Module Pairing Pattern

**File Structure:**
```
components/
├── Header/
│   ├── Header.tsx
│   ├── Header.module.scss
│   ├── Header.test.tsx
│   └── index.ts
│
├── Footer/
│   ├── Footer.tsx
│   ├── Footer.module.scss
│   ├── Footer.test.tsx
│   └── index.ts
```

**Example: Header Component**

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
        <div className={styles.nav__start}>
          <Link href="/" className={styles.logo}>
            <Image 
              src={logo} 
              alt="arolariu.ro logo" 
              className={styles.logo__image}
              width={40} 
              height={40} 
            />
            <span className={styles.logo__text}>arolariu.ro</span>
          </Link>
        </div>
        
        <div className={styles.nav__center}>
          {/* Navigation items */}
        </div>
        
        <div className={styles.nav__end}>
          {/* Auth buttons */}
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
@use '@/styles/layout/breakpoints' as bp;
@use '@/styles/abstracts/mixins' as m;

.header {
  background-color: c.$color-background;
  color: c.$color-foreground;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  
  @include bp.media-lg-up {
    position: relative;
  }
  
  @media print {
    display: none;
  }
}

.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: s.$spacing-4;
  
  &__start,
  &__center,
  &__end {
    display: flex;
    align-items: center;
    gap: s.$spacing-4;
  }
}

.logo {
  display: flex;
  align-items: center;
  gap: s.$spacing-3;
  font-weight: c.$font-weight-medium;
  transition: color 0.2s ease;
  
  &:hover {
    color: hsl(45, 93%, 47%); // Yellow accent
  }
  
  &__image {
    border-radius: 50%;
    box-shadow: 0 0 0 2px c.$color-primary-500;
    
    @include bp.media-max(bp.$breakpoint-lg) {
      display: none;
    }
  }
  
  &__text {
    font-size: c.$font-size-xl;
  }
}

// Dark mode support
:global(.dark) .header {
  background-color: c.$color-background-dark;
  color: c.$color-foreground-dark;
}
```

### Page-Level Shared Styles Pattern

**For Turbopack Bundling Efficiency:**

```
app/domains/invoices/
├── page.tsx              # RSC - data fetching
├── island.tsx            # RCC - interactive UI
├── layout.tsx            # RSC - shell structure
├── loading.tsx           # RSC - loading states
└── styles.module.scss    # SHARED styles for all 4 files
```

**Rationale:** 
- Turbopack optimizes single stylesheet per route segment
- Reduces HTTP requests
- Improves cache efficiency
- Enables code splitting at route level

**Example: Invoice Page Shared Styles**

```scss
// app/domains/invoices/styles.module.scss
@use '@/styles/tokens/colors' as c;
@use '@/styles/tokens/spacing' as s;
@use '@/styles/layout/breakpoints' as bp;

// Used by page.tsx (RSC)
.page-container {
  min-height: 100vh;
  padding: s.$spacing-8 s.$spacing-4;
  
  @include bp.media-md-up {
    padding: s.$spacing-12 s.$spacing-8;
  }
}

// Used by island.tsx (RCC)
.interactive-grid {
  display: grid;
  gap: s.$spacing-6;
  grid-template-columns: 1fr;
  
  @include bp.media-lg-up {
    grid-template-columns: repeat(12, 1fr);
  }
}

.sidebar {
  grid-column: span 3;
  
  @include bp.media-max(bp.$breakpoint-lg) {
    display: none;
  }
}

.main-content {
  grid-column: span 6;
  
  @include bp.media-max(bp.$breakpoint-lg) {
    grid-column: span 12;
  }
}

// Used by layout.tsx (RSC)
.layout-wrapper {
  max-width: 1440px;
  margin: 0 auto;
}

// Used by loading.tsx (RSC)
.shimmer-container {
  display: flex;
  flex-direction: column;
  gap: s.$spacing-4;
}

.shimmer-card {
  background: linear-gradient(
    90deg,
    c.$color-muted 0%,
    lighten(c.$color-muted, 5%) 50%,
    c.$color-muted 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: s.$spacing-2;
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
```

**Usage in Components:**

```tsx
// app/domains/invoices/page.tsx
import styles from './styles.module.scss';

export default async function InvoicesPage() {
  return (
    <div className={styles.pageContainer}>
      {/* Content */}
    </div>
  );
}

// app/domains/invoices/island.tsx
import styles from './styles.module.scss';

export default function InvoicesIsland() {
  return (
    <div className={styles.interactiveGrid}>
      <aside className={styles.sidebar}>...</aside>
      <main className={styles.mainContent}>...</main>
    </div>
  );
}

// app/domains/invoices/loading.tsx
import styles from './styles.module.scss';

export default function InvoicesLoading() {
  return (
    <div className={styles.shimmerContainer}>
      <div className={styles.shimmerCard} />
      <div className={styles.shimmerCard} />
    </div>
  );
}
```

---

## Component Library Migration Strategy

### @arolariu/components Package

**Current State:**
- 60+ shadcn/ui components
- Heavy TailwindCSS dependency
- `cn()` utility for className merging
- Located in `packages/components/`

**Migration Approach:**

#### Option 1: Parallel SCSS Implementation (Recommended)

**Rationale:**
- Allows gradual migration
- Maintains backward compatibility
- Reduces risk of breaking changes
- Enables A/B testing

**Implementation:**
```
packages/components/src/components/ui/
├── button/
│   ├── button.tsx              # Component logic
│   ├── button.tailwind.tsx     # Tailwind variant (legacy)
│   ├── button.scss.tsx         # SCSS variant (new)
│   ├── button.module.scss      # SCSS styles
│   └── index.ts                # Export facade
```

**Export Facade Pattern:**
```typescript
// packages/components/src/components/ui/button/index.ts
import { ButtonTailwind } from './button.tailwind';
import { ButtonScss } from './button.scss';

// Feature flag for gradual rollout
const USE_SCSS_COMPONENTS = process.env.NEXT_PUBLIC_USE_SCSS === 'true';

export const Button = USE_SCSS_COMPONENTS ? ButtonScss : ButtonTailwind;
export type { ButtonProps } from './button';
```

#### Option 2: Complete Rewrite (Aggressive)

**Rationale:**
- Clean break from Tailwind
- Simplified architecture
- Better long-term maintainability

**Risks:**
- High initial effort
- Potential breaking changes
- Extended testing period

---

## Animation & Transition Migration

### Custom Animations to SCSS

**Current (Tailwind + globals.css):**
```css
@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
}

.glow-effect::before {
  animation: glowing 1.5s linear infinite;
}
```

**Target (SCSS Module):**
```scss
// styles/animations/_keyframes.scss
@keyframes float {
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
  100% {
    transform: translateY(0);
  }
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

@keyframes glowing {
  0% {
    background-position: 0 0;
  }
  50% {
    background-position: 400% 0;
  }
  100% {
    background-position: 0 0;
  }
}

// styles/animations/_transitions.scss
@mixin transition-base {
  transition-duration: 150ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

@mixin transition-shadow {
  @include transition-base;
  transition-property: box-shadow;
}

@mixin transition-transform {
  @include transition-base;
  transition-property: transform;
}
```

---

## Dark Mode Implementation

### Current Approach (Tailwind)
```tsx
<div className="bg-white text-black dark:bg-black dark:text-white">
```

### Target Approach (SCSS + CSS Variables)

**CSS Variable Strategy:**
```scss
// styles/themes/_light.scss
:root {
  --color-background: #{c.$color-background};
  --color-foreground: #{c.$color-foreground};
  --color-primary: #{c.$color-primary-500};
  // ... all theme colors
}

// styles/themes/_dark.scss
.dark {
  --color-background: #{c.$color-background-dark};
  --color-foreground: #{c.$color-foreground-dark};
  --color-primary: #{c.$color-primary-600};
  // ... all theme colors
}
```

**Component Usage:**
```scss
// component.module.scss
.card {
  background-color: var(--color-background);
  color: var(--color-foreground);
  
  // No need for separate dark mode selector
  // CSS variables handle theme switching automatically
}
```

**JavaScript Theme Toggle (No Change):**
```typescript
// Using next-themes (already implemented)
import { useTheme } from 'next-themes';

const { theme, setTheme } = useTheme();
setTheme('dark'); // Adds .dark class to <html>
```

---

## Performance Considerations

### Bundle Size Impact

**Current TailwindCSS Bundle:**
```
Estimated Production CSS: ~45KB gzipped
- Base styles: ~3KB
- Utilities: ~35KB (purged)
- Custom components: ~7KB
```

**Target SCSS Bundle:**
```
Estimated Production CSS: ~38KB gzipped
- Base styles: ~3KB
- Component styles: ~25KB (tree-shaken via CSS Modules)
- Tokens & utilities: ~10KB
```

**Expected Savings:** ~15% reduction

### Critical CSS Strategy

**Implementation:**
```typescript
// next.config.ts - Add inline CSS extraction
experimental: {
  optimizeCss: true,
  inlineCss: {
    enabled: true,
    preloadCriticalAssets: true,
  }
}
```

### Code Splitting by Route

**Automatic with CSS Modules:**
- Next.js bundles CSS per route segment
- Unused styles tree-shaken at build time
- Lazy-loaded modules automatically defer their CSS

---

## Migration Execution Plan

### Phase 1: Foundation Setup (Week 1, Days 1-2)

**Objectives:**
- Set up SCSS infrastructure
- Create design token system
- Establish build pipeline

**Tasks:**
1. Install SCSS dependencies
   ```bash
   npm install -D sass
   ```

2. Create `/styles` directory structure
   ```bash
   mkdir -p src/styles/{base,abstracts,tokens,layout,components,utilities,animations,themes}
   ```

3. Port design tokens from `tailwind.config.ts` to SCSS variables

4. Create base SCSS files:
   - `styles/index.scss` (main entry)
   - `base/_reset.scss` (modern CSS reset)
   - `base/_typography.scss` (font stacks, base sizes)

5. Update `next.config.ts`:
   ```typescript
   // Add SCSS support (built-in to Next.js)
   // Remove Tailwind PostCSS plugin
   ```

6. Update `postcss.config.js`:
   ```javascript
   module.exports = {
     plugins: {
       'cssnano': {}, // Keep for minification
       // Remove @tailwindcss/postcss
     },
   };
   ```

### Phase 2: Core Component Migration (Week 1, Days 3-5)

**Priority Order (High-Impact Components):**

1. **Header & Footer** (Day 3)
   - Create `Header.module.scss`
   - Create `Footer.module.scss`
   - Migrate utility classes to semantic styles
   - Test responsive behavior
   - Verify dark mode

2. **Layout Primitives** (Day 4)
   - Container component
   - Grid system
   - Flexbox utilities
   - Spacing mixins

3. **Button Component** (Day 4-5)
   - Migrate `@arolariu/components` Button
   - Create `button.module.scss` with variants
   - Support size, color, state variants
   - Test accessibility (focus states)

4. **Card Component** (Day 5)
   - CardHeader, CardContent, CardFooter
   - Shadow states
   - Hover effects

### Phase 3: Domain-Specific Components (Week 2, Days 1-3)

**Invoice Domain Focus:**

1. **Invoice Cards** (Day 1)
   - InvoiceDetailsCard
   - SummaryStatsCard
   - MerchantInfoCard
   - BudgetImpactCard

2. **Tables & Lists** (Day 2)
   - Table component migration
   - Pagination controls
   - Sort indicators
   - Empty states

3. **Dialogs & Modals** (Day 3)
   - Dialog primitives
   - Form dialogs
   - Confirmation modals
   - Toast notifications

### Phase 4: Animation & Interaction (Week 2, Days 4-5)

**Tasks:**
1. Port custom animations to SCSS keyframes
2. Create transition mixins
3. Implement loading states (shimmers, spinners)
4. Test performance with DevTools
5. Optimize critical CSS

### Phase 5: Testing & Validation (Week 2, Day 5 + Buffer)

**Test Coverage:**
1. Visual regression testing (Playwright screenshots)
2. Accessibility audit (axe-core)
3. Responsive design testing (mobile, tablet, desktop)
4. Dark mode verification
5. Performance benchmarks (Lighthouse)
6. Cross-browser testing (Chrome, Firefox, Safari)

### Phase 6: Cleanup & Documentation (Buffer Time)

**Tasks:**
1. Remove Tailwind dependencies
   ```bash
   npm uninstall tailwindcss @tailwindcss/postcss @tailwindcss/typography tailwindcss-animate daisyui
   ```

2. Delete `tailwind.config.ts`
3. Update `globals.css` to import SCSS
4. Update documentation
5. Create migration guide for contributors
6. Record demo video showing before/after

---

## Risk Mitigation

### Identified Risks

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| Visual regressions | High | High | Automated screenshot comparison (Playwright) |
| Performance degradation | Medium | High | Bundle size monitoring, Lighthouse CI |
| Developer productivity loss | Medium | Medium | Comprehensive documentation, migration helpers |
| Component library breaking changes | Low | High | Parallel implementation, feature flags |
| Accessibility regressions | Medium | Critical | Automated a11y testing (axe-core) |
| Dark mode inconsistencies | High | Medium | CSS variable strategy, manual QA |
| Responsive breakage | High | High | Device testing matrix, responsive QA |

### Rollback Strategy

**Feature Flag Implementation:**
```typescript
// lib/featureFlags.ts
export const USE_SCSS_STYLES = 
  process.env.NEXT_PUBLIC_USE_SCSS === 'true' || false;

// Component wrapper
export function withStyleSystem<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function StyledComponent(props: P) {
    return USE_SCSS_STYLES ? (
      <Component {...props} />
    ) : (
      <TailwindFallback {...props} />
    );
  };
}
```

**Gradual Rollout Plan:**
1. Week 1: Internal testing (100% feature flag disabled)
2. Week 2: Canary rollout (10% of production traffic)
3. Week 3: Staged rollout (50% of production traffic)
4. Week 4: Full rollout (100% of production traffic)
5. Week 5+: Monitor metrics, remove Tailwind code

---

## Success Metrics

### Quantitative KPIs

| Metric | Baseline (Tailwind) | Target (SCSS) | Measurement Tool |
|--------|---------------------|---------------|------------------|
| **Bundle Size** | 45KB CSS (gzipped) | ≤38KB CSS | Webpack Bundle Analyzer |
| **First Contentful Paint** | 1.2s | ≤1.1s | Lighthouse CI |
| **Time to Interactive** | 2.8s | ≤2.5s | Lighthouse CI |
| **Cumulative Layout Shift** | 0.05 | ≤0.03 | Web Vitals |
| **Build Time** | 45s | ≤50s | CI/CD logs |
| **Visual Regressions** | N/A | 0 critical bugs | Playwright diffs |

### Qualitative Goals

- [ ] Developer onboarding time maintained or reduced
- [ ] Design system more discoverable and documented
- [ ] Brand identity guidelines easier to enforce
- [ ] No accessibility regressions
- [ ] Positive developer feedback on maintainability

---

## Alternative Approaches Considered

### 1. Vanilla CSS (Rejected)

**Pros:**
- Zero dependencies
- Maximum performance

**Cons:**
- No variables, mixins, or nesting
- Difficult to maintain at scale
- Poor code organization

### 2. CSS-in-JS (styled-components, emotion) (Rejected)

**Pros:**
- Component-scoped styles
- Dynamic theming

**Cons:**
- Runtime overhead
- Larger bundle sizes
- Poor SSR performance
- Vendor lock-in (different concern)

### 3. Utility-First Alternative (UnoCSS, WindiCSS) (Rejected)

**Pros:**
- Similar DX to Tailwind
- Smaller bundle sizes

**Cons:**
- Still utility-first approach (doesn't solve core problem)
- Another vendor dependency
- Smaller ecosystem

### 4. Hybrid Approach (SCSS + Limited Utilities) (Considered)

**Pros:**
- Best of both worlds
- Gradual migration path

**Cons:**
- Cognitive overhead (two systems)
- Larger bundle size
- Maintenance complexity

**Decision:** Rejected in favor of pure SCSS approach for clarity and long-term maintainability.

---

## Dependencies & Breaking Changes

### New Dependencies
```json
{
  "devDependencies": {
    "sass": "^1.87.0"
  }
}
```

### Removed Dependencies
```json
{
  "devDependencies": {
    "@tailwindcss/postcss": "REMOVED",
    "@tailwindcss/typography": "REMOVED",
    "tailwindcss-animate": "REMOVED",
    "daisyui": "REMOVED"
  }
}
```

### Breaking Changes

**For Consumers of @arolariu/components:**

1. **Import Changes:**
   ```typescript
   // Before (Tailwind)
   import { Button, cn } from '@arolariu/components';
   <Button className={cn("custom-class", props.className)} />
   
   // After (SCSS)
   import { Button } from '@arolariu/components';
   import styles from './MyComponent.module.scss';
   <Button className={styles.customButton} />
   ```

2. **Custom Styling:**
   ```tsx
   // Before: Direct className manipulation
   <Button className="text-lg bg-blue-500" />
   
   // After: CSS Module composition
   import styles from './styles.module.scss';
   <Button className={styles.largeBlueButton} />
   ```

3. **Theme Customization:**
   ```typescript
   // Before: tailwind.config.ts
   theme: {
     extend: {
       colors: {
         brand: '#1e90ff',
       }
     }
   }
   
   // After: SCSS variable override
   // styles/tokens/_colors.scss
   $color-brand: #1e90ff;
   ```

---

## Open Questions & Future Considerations

### Unresolved Questions

1. **Component Library Versioning:**
   - Major version bump for @arolariu/components?
   - Maintain parallel Tailwind version?
   - Deprecation timeline?

2. **Third-Party Components:**
   - How to handle Radix UI styling?
   - Strategy for react-email templates (still uses inline styles)?
   - PDF generation (@react-pdf/renderer) impact?

3. **Build Optimization:**
   - Enable CSS Modules tree-shaking in Next.js Turbopack?
   - Critical CSS extraction strategy?
   - Per-route CSS code splitting optimization?

### Future Enhancements

1. **Design Token Generation:**
   - Integrate with Style Dictionary
   - Generate tokens from Figma API
   - Multi-platform token export (iOS, Android)

2. **Component Documentation:**
   - Storybook with SCSS controls
   - Interactive design system docs
   - Code generation from design tokens

3. **Developer Tooling:**
   - VSCode extension for token autocomplete
   - ESLint plugin for SCSS best practices
   - Automated migration scripts for remaining Tailwind usage

---

## References

### Internal Documentation
- RFC 1002: Comprehensive JSDoc Documentation Standard
- Frontend Instructions: `.github/instructions/frontend.instructions.md`
- Component Library README: `packages/components/readme.md`

### External Resources
- [SCSS Documentation](https://sass-lang.com/documentation)
- [CSS Modules Specification](https://github.com/css-modules/css-modules)
- [Next.js CSS Modules](https://nextjs.org/docs/app/building-your-application/styling/css-modules)
- [BEM Methodology](http://getbem.com/introduction/)
- [Style Dictionary](https://amzn.github.io/style-dictionary/)

---

## Appendix A: Complete File Mapping

### High-Priority Components (Phase 2-3)

| Current File | Target SCSS Module | Complexity | Effort |
|--------------|-------------------|------------|--------|
| `components/Header.tsx` | `Header.module.scss` | Medium | 4h |
| `components/Footer.tsx` | `Footer.module.scss` | Medium | 4h |
| `components/Navigation.tsx` | `Navigation.module.scss` | High | 6h |
| `components/Commander.tsx` | `Commander.module.scss` | High | 6h |
| `app/domains/invoices/page.tsx` | `app/domains/invoices/styles.module.scss` | Medium | 5h |
| `app/domains/invoices/island.tsx` | (shared) | High | 8h |
| `app/domains/invoices/view-invoice/[id]/island.tsx` | `view-invoice/styles.module.scss` | Very High | 12h |

**Total Estimated Effort:** 45 hours (1.5 weeks for 1 developer)

---

## Appendix B: SCSS Utility Library

### Common Mixins (`abstracts/_mixins.scss`)

```scss
// Flexbox centering
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

// Truncate text with ellipsis
@mixin text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// Multi-line text truncation
@mixin text-truncate-lines($lines: 2) {
  display: -webkit-box;
  -webkit-line-clamp: $lines;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

// Visually hidden (a11y)
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

// Focus visible styles
@mixin focus-visible {
  &:focus-visible {
    outline: 2px solid var(--color-ring);
    outline-offset: 2px;
  }
}

// Card container
@mixin card {
  background-color: var(--color-card);
  color: var(--color-card-foreground);
  border-radius: var(--radius);
  box-shadow: $shadow-sm;
}

// Button base styles
@mixin button-base {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
  font-weight: $font-weight-medium;
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  @include focus-visible;
}
```

---

## Status & Next Steps

**RFC Status:** Draft - Awaiting Approval  
**Assigned To:** @copilot, @arolariu  
**Target Start Date:** TBD  
**Expected Completion:** 2 weeks from start

**Approval Checklist:**
- [ ] Technical review by frontend team
- [ ] Design system approval by UX lead
- [ ] Performance baseline established
- [ ] Risk mitigation strategies approved
- [ ] Resource allocation confirmed
- [ ] Timeline approved by product management

**Once Approved:**
1. Create detailed task breakdown in project management tool
2. Set up feature branch: `feature/scss-migration`
3. Initialize SCSS infrastructure (Phase 1)
4. Begin parallel component implementation
5. Schedule weekly sync meetings for status updates

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-26  
**Change Log:**
- 2026-01-26: Initial draft created
