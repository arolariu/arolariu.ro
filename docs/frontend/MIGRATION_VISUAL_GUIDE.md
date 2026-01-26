# TailwindCSS to SCSS Migration - Visual Guide

**Quick Reference:** Architecture diagrams, file structure, and migration workflows

---

## 📐 Current vs. Target Architecture

### Current State (TailwindCSS)

```
┌─────────────────────────────────────────────────────────────┐
│                     CURRENT ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Component Files (.tsx)                                      │
│  ├── Inline utility classes                                 │
│  │   className="flex items-center gap-2 text-sm"           │
│  │   className="bg-white dark:bg-black"                    │
│  │   className="hover:text-yellow-500"                     │
│  │                                                          │
│  └── 3,715 className declarations across 230 files          │
│                                                              │
│  ↓                                                           │
│                                                              │
│  Tailwind Config (tailwind.config.ts)                       │
│  ├── Theme extension                                        │
│  ├── Custom breakpoints                                     │
│  ├── Custom colors                                          │
│  └── Plugin configuration                                   │
│                                                              │
│  ↓                                                           │
│                                                              │
│  PostCSS Processing                                         │
│  ├── @tailwindcss/postcss                                  │
│  ├── JIT compilation                                        │
│  ├── Purging unused classes                                │
│  └── Minification (cssnano)                                │
│                                                              │
│  ↓                                                           │
│                                                              │
│  Output: 45KB CSS (gzipped)                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Target State (SCSS + CSS Modules)

```
┌─────────────────────────────────────────────────────────────┐
│                      TARGET ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Component Files (.tsx)                                      │
│  ├── Import CSS Module                                      │
│  │   import styles from './Component.module.scss'          │
│  │                                                          │
│  ├── Semantic class names                                   │
│  │   className={styles.container}                          │
│  │   className={styles.header}                             │
│  │   className={styles.button__primary}                    │
│  │                                                          │
│  └── Type-safe, autocompleted classes                       │
│                                                              │
│  ↓                                                           │
│                                                              │
│  CSS Module (.module.scss)                                  │
│  ├── @use design tokens                                     │
│  ├── @use mixins & functions                               │
│  ├── Semantic class definitions                            │
│  └── BEM-inspired structure                                │
│                                                              │
│  ↓                                                           │
│                                                              │
│  Design System (src/styles/)                               │
│  ├── tokens/ (colors, typography, spacing)                 │
│  ├── abstracts/ (variables, mixins, functions)             │
│  ├── base/ (reset, typography, forms)                      │
│  ├── layout/ (grid, flexbox, breakpoints)                  │
│  ├── components/ (global component styles)                 │
│  ├── animations/ (keyframes, transitions)                  │
│  └── themes/ (light, dark, gradients)                      │
│                                                              │
│  ↓                                                           │
│                                                              │
│  SCSS Compilation (Built into Next.js)                     │
│  ├── CSS Modules scoping                                   │
│  ├── Tree-shaking unused styles                            │
│  ├── Automatic vendor prefixing                            │
│  └── Minification (cssnano)                                │
│                                                              │
│  ↓                                                           │
│                                                              │
│  Output: ~38KB CSS (gzipped) [15% reduction]              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Directory Structure Transformation

### Before: TailwindCSS

```
sites/arolariu.ro/
├── src/
│   ├── app/
│   │   ├── globals.css              ← Tailwind directives
│   │   ├── page.tsx                 ← Inline className utilities
│   │   └── layout.tsx               ← Inline className utilities
│   │
│   ├── components/
│   │   ├── Header.tsx               ← Inline className utilities
│   │   └── Footer.tsx               ← Inline className utilities
│   │
│   └── types/
│       └── index.ts
│
├── tailwind.config.ts               ← Theme configuration
├── postcss.config.js                ← Tailwind PostCSS plugin
└── package.json                     ← Tailwind dependencies
```

### After: SCSS + CSS Modules

```
sites/arolariu.ro/
├── src/
│   ├── styles/                      ← NEW: Design system
│   │   ├── index.scss              ← Main entry point
│   │   ├── base/
│   │   │   ├── _reset.scss
│   │   │   ├── _typography.scss
│   │   │   └── _forms.scss
│   │   │
│   │   ├── abstracts/
│   │   │   ├── _variables.scss
│   │   │   ├── _functions.scss
│   │   │   └── _mixins.scss
│   │   │
│   │   ├── tokens/
│   │   │   ├── _colors.scss
│   │   │   ├── _typography.scss
│   │   │   ├── _spacing.scss
│   │   │   ├── _shadows.scss
│   │   │   ├── _borders.scss
│   │   │   └── _transitions.scss
│   │   │
│   │   ├── layout/
│   │   │   ├── _breakpoints.scss
│   │   │   ├── _grid.scss
│   │   │   ├── _flexbox.scss
│   │   │   └── _container.scss
│   │   │
│   │   ├── components/
│   │   │   ├── _buttons.scss
│   │   │   ├── _cards.scss
│   │   │   └── _forms.scss
│   │   │
│   │   ├── utilities/
│   │   │   ├── _display.scss
│   │   │   └── _text.scss
│   │   │
│   │   ├── animations/
│   │   │   ├── _keyframes.scss
│   │   │   └── _transitions.scss
│   │   │
│   │   └── themes/
│   │       ├── _light.scss
│   │       ├── _dark.scss
│   │       └── _gradients.scss
│   │
│   ├── app/
│   │   ├── globals.css              ← Imports SCSS + CSS variables
│   │   ├── page.tsx                 ← Uses CSS Modules
│   │   ├── page.module.scss         ← NEW: Page styles
│   │   ├── layout.tsx               ← Uses CSS Modules
│   │   └── layout.module.scss       ← NEW: Layout styles
│   │
│   ├── components/
│   │   ├── Header/
│   │   │   ├── Header.tsx           ← Uses CSS Modules
│   │   │   ├── Header.module.scss   ← NEW: Header styles
│   │   │   └── index.ts
│   │   │
│   │   └── Footer/
│   │       ├── Footer.tsx           ← Uses CSS Modules
│   │       ├── Footer.module.scss   ← NEW: Footer styles
│   │       └── index.ts
│   │
│   └── types/
│       └── index.ts
│
├── postcss.config.js                ← Updated (Tailwind removed)
└── package.json                     ← Tailwind deps removed, sass added
```

---

## 🔄 Migration Workflow

### Step-by-Step Process

```
┌────────────────────────────────────────────────────────────┐
│                   MIGRATION WORKFLOW                        │
└────────────────────────────────────────────────────────────┘

Step 1: Analyze Component
├─ Identify className declarations
├─ Group by pattern (layout, typography, colors, etc.)
└─ Determine complexity tier

↓

Step 2: Create CSS Module
├─ Create ComponentName.module.scss
├─ Import design tokens: @use '@/styles/tokens/colors' as c;
├─ Import mixins: @use '@/styles/abstracts/mixins' as m;
└─ Import breakpoints: @use '@/styles/layout/breakpoints' as bp;

↓

Step 3: Map Utility Classes
├─ Tailwind: "flex items-center gap-2"
│  → SCSS: display: flex; align-items: center; gap: $spacing-2;
│
├─ Tailwind: "text-sm font-medium"
│  → SCSS: font-size: $font-size-sm; font-weight: $font-weight-medium;
│
└─ Tailwind: "bg-white dark:bg-black"
   → SCSS: background-color: var(--color-background);

↓

Step 4: Structure with BEM
├─ .component { /* Block */ }
├─ .component__element { /* Element */ }
└─ .component__element--modifier { /* Modifier */ }

↓

Step 5: Update TSX Component
├─ Add import: import styles from './Component.module.scss';
├─ Replace className strings with styles.className
└─ Ensure type safety and autocomplete

↓

Step 6: Test & Validate
├─ Visual regression (Playwright screenshots)
├─ Responsive design (multiple breakpoints)
├─ Dark mode verification
├─ Accessibility audit (axe-core)
└─ Performance check (Lighthouse)

↓

Step 7: Commit & Move Next
└─ Mark component as migrated in checklist
```

---

## 📊 Component Example: Before & After

### Header Component Transformation

#### Before (TailwindCSS)

```tsx
// components/Header.tsx
<header className="print:hidden">
  <nav className="navbar 2xsm:fixed 2xsm:top-0 2xsm:z-50 
                   bg-white text-black 
                   lg:relative lg:z-auto 
                   dark:bg-black dark:text-white">
    <div className="navbar-start flex flex-row flex-nowrap">
      <Link 
        href="/" 
        className="ml-2 flex items-center font-medium 
                   hover:text-yellow-300"
      >
        <Image 
          src={logo}
          className="2xsm:hidden rounded-full 
                     ring-2 ring-indigo-500 lg:block"
          width={40}
          height={40}
        />
        <span className="ml-3 text-xl">arolariu.ro</span>
      </Link>
    </div>
  </nav>
</header>
```

**Problems:**
- Long className strings reduce readability
- 15+ utility classes in single element
- Hard to maintain and modify
- No component boundary clarity

#### After (SCSS + CSS Modules)

```tsx
// components/Header/Header.tsx
import styles from './Header.module.scss';

<header className={styles.header}>
  <nav className={styles.nav}>
    <div className={styles.navStart}>
      <Link href="/" className={styles.logo}>
        <Image 
          src={logo}
          className={styles.logoImage}
          width={40}
          height={40}
        />
        <span className={styles.logoText}>arolariu.ro</span>
      </Link>
    </div>
  </nav>
</header>
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
  box-shadow: 0 0 0 2px c.$color-primary-500;
  
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

**Benefits:**
- Semantic class names
- Clear component structure
- Easy to maintain and modify
- Design system integration
- Type-safe (CSS Modules)
- Autocomplete support

---

## 🎨 Design Token System Visualization

```
┌─────────────────────────────────────────────────────────────┐
│              DESIGN TOKEN SYSTEM HIERARCHY                   │
└─────────────────────────────────────────────────────────────┘

tokens/_colors.scss
├─ Primary Palette (Blue)
│  ├─ 50  ███ hsl(221, 83%, 95%)  Lightest
│  ├─ 100 ███ hsl(221, 83%, 90%)
│  ├─ 200 ███ hsl(221, 83%, 80%)
│  ├─ 300 ███ hsl(221, 83%, 70%)
│  ├─ 400 ███ hsl(221, 83%, 60%)
│  ├─ 500 ███ hsl(221, 83%, 53%)  Base
│  ├─ 600 ███ hsl(221, 83%, 45%)
│  ├─ 700 ███ hsl(221, 83%, 35%)
│  ├─ 800 ███ hsl(221, 83%, 25%)
│  └─ 900 ███ hsl(221, 83%, 15%)  Darkest
│
├─ Semantic Colors
│  ├─ background
│  ├─ foreground
│  ├─ primary
│  ├─ secondary
│  ├─ muted
│  ├─ accent
│  └─ border
│
└─ State Colors
   ├─ success  (Green)
   ├─ warning  (Yellow)
   ├─ error    (Red)
   └─ info     (Blue)

tokens/_typography.scss
├─ Font Families
│  ├─ base (System fonts)
│  ├─ dyslexic (OpenDyslexic)
│  └─ mono (Fira Code)
│
├─ Type Scale (Major Third: 1.250)
│  ├─ xs    0.75rem   (12px)
│  ├─ sm    0.875rem  (14px)
│  ├─ base  1rem      (16px) ← Root
│  ├─ lg    1.125rem  (18px)
│  ├─ xl    1.25rem   (20px)
│  ├─ 2xl   1.5rem    (24px)
│  ├─ 3xl   1.875rem  (30px)
│  ├─ 4xl   2.25rem   (36px)
│  └─ 5xl   3rem      (48px)
│
└─ Font Weights
   ├─ normal    400
   ├─ medium    500
   ├─ semibold  600
   └─ bold      700

tokens/_spacing.scss
├─ 8-Point Grid System
│  ├─ 0   0
│  ├─ 1   0.25rem  (4px)
│  ├─ 2   0.5rem   (8px)   ← Base unit
│  ├─ 3   0.75rem  (12px)
│  ├─ 4   1rem     (16px)
│  ├─ 6   1.5rem   (24px)
│  ├─ 8   2rem     (32px)
│  ├─ 12  3rem     (48px)
│  ├─ 16  4rem     (64px)
│  └─ ... up to 96 (384px)
│
└─ Container Padding (Responsive)
   ├─ Mobile:  16px
   ├─ Tablet:  24px
   └─ Desktop: 32px

layout/_breakpoints.scss
├─ Mobile First Approach
│  ├─ 2xsm  320px   Extra small mobile
│  ├─ xsm   480px   Small mobile
│  ├─ sm    640px   Tablet portrait
│  ├─ md    768px   Tablet landscape
│  ├─ lg    1024px  Laptop
│  ├─ xl    1280px  Desktop
│  ├─ 2xl   1440px  Large desktop
│  └─ 3xl   1976px  Ultra-wide
│
└─ Media Query Mixins
   ├─ @include media-sm-up { }
   ├─ @include media-md-up { }
   ├─ @include media-lg-up { }
   └─ @include media-between($min, $max) { }
```

---

## 📈 Effort Distribution

```
┌─────────────────────────────────────────────────────────────┐
│              EFFORT DISTRIBUTION (157 hours)                 │
└─────────────────────────────────────────────────────────────┘

Phase 1: Foundation (14h) ████████░░░░░░░░░░░░░░░░░░░░░░░ 9%
├─ SCSS setup                      2h
├─ Design tokens                   4h
├─ Mixins & functions              3h
├─ Base styles                     3h
└─ Build config                    2h

Phase 2: Core Components (48h) ████████████████████████████░ 31%
├─ Header                         12h
├─ Footer                         14h
├─ Button (library)                8h
├─ Card (library)                  6h
└─ Navigation                      8h

Phase 3: Domain Pages (50h) ████████████████████████████████ 32%
├─ Invoice view                   20h
├─ Invoice list                   12h
├─ Upload scans                   10h
└─ My Profile                      8h

Phase 4: Remaining (45h) ████████████████████████████░░░░░░ 29%
├─ Dialogs                        12h
├─ Tables                          8h
├─ Forms                          10h
└─ Misc components                15h

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 157 hours
Timeline: 2 weeks (2 devs) or 4 weeks (1 dev)
```

---

## 🎯 Success Metrics Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│                    PERFORMANCE TARGETS                       │
└─────────────────────────────────────────────────────────────┘

CSS Bundle Size
Current:  45KB ████████████████████████████████████████████░
Target:   38KB ████████████████████████████████████░░░░░░░░░ ↓15%

First Contentful Paint
Current:  1.2s ████████████████████████████████████████████░
Target:   1.1s ████████████████████████████████████░░░░░░░░░ ↑8%

Time to Interactive
Current:  2.8s ████████████████████████████████████████████░
Target:   2.5s ████████████████████████████████████░░░░░░░░░ ↑11%

Cumulative Layout Shift
Current:  0.05 ████████████████████████████████████████████░
Target:   0.03 ████████████████████████░░░░░░░░░░░░░░░░░░░░ ↑40%

Build Time
Current:  45s  ████████████████████████████████████████████░
Target:   ≤50s ████████████████████████████████████████████░ ±11%
```

---

## 🚀 Rollout Timeline

```
┌─────────────────────────────────────────────────────────────┐
│                   5-WEEK ROLLOUT PLAN                        │
└─────────────────────────────────────────────────────────────┘

Week 1: Implementation (Foundation + Core)
│ ███████████████████████████████ 100% Internal Testing
│ Feature Flag: NEXT_PUBLIC_USE_SCSS=false
│ Environment: Staging only
└─ Deliverable: Core components migrated

Week 2: Implementation (Domains + Remaining)
│ ███████████████████████████████ 100% Internal Testing
│ Feature Flag: NEXT_PUBLIC_USE_SCSS=false
│ Environment: Staging only
└─ Deliverable: All components migrated

Week 3: Canary Rollout
│ ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 10% Production Traffic
│ Feature Flag: Enabled for 10% of users
│ Monitor: Performance, errors, user feedback
└─ Decision: Continue or rollback

Week 4: Staged Rollout
│ ███████████████░░░░░░░░░░░░░░░░ 50% Production Traffic
│ Feature Flag: Enabled for 50% of users
│ Monitor: A/B test results, metrics
└─ Decision: Proceed to full rollout

Week 5: Full Rollout
│ ███████████████████████████████ 100% Production Traffic
│ Feature Flag: Enabled for all users
│ Monitor: Final metrics collection
└─ Success: Migration complete!

Week 6+: Cleanup
│ Remove Tailwind dependencies
│ Delete legacy code
│ Update documentation
└─ 🎉 Celebrate!
```

---

## 📋 Quick Reference: Common Patterns

### Layout

| Tailwind | SCSS |
|----------|------|
| `flex items-center gap-2` | `@include m.flex-center; gap: s.$spacing-2;` |
| `grid grid-cols-2 gap-4` | `display: grid; grid-template-columns: repeat(2, 1fr); gap: s.$spacing-4;` |
| `space-y-4` | `> * + * { margin-top: s.$spacing-4; }` |

### Typography

| Tailwind | SCSS |
|----------|------|
| `text-sm font-medium` | `font-size: t.$font-size-sm; font-weight: t.$font-weight-medium;` |
| `text-2xl font-bold` | `font-size: t.$font-size-2xl; font-weight: t.$font-weight-bold;` |
| `text-muted-foreground` | `color: var(--color-muted-foreground);` |

### Colors & Themes

| Tailwind | SCSS |
|----------|------|
| `bg-white dark:bg-black` | `background-color: var(--color-background);` |
| `text-primary` | `color: var(--color-primary);` |
| `border-border` | `border-color: var(--color-border);` |

### Responsive

| Tailwind | SCSS |
|----------|------|
| `hidden sm:block` | `display: none; @include bp.media-sm-up { display: block; }` |
| `md:grid-cols-2` | `@include bp.media-md-up { grid-template-columns: repeat(2, 1fr); }` |
| `lg:px-8` | `@include bp.media-lg-up { padding-left: s.$spacing-8; padding-right: s.$spacing-8; }` |

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-26  
**Status:** Reference Guide Complete
