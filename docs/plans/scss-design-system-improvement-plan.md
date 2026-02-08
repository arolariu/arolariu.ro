# SCSS Design System Improvement Plan

**Project:** arolariu.ro
**Branch:** `user/aolariu/migration-to-scss`
**Date:** 2026-02-08
**Status:** Draft - Pending Approval

---

## Executive Summary

This plan analyzes the current SCSS design system in `sites/arolariu.ro`, cross-references it against enterprise-grade SCSS design systems (Carbon, Material, Primer, SLDS, Polaris, Spectrum), and maps findings into prioritized, actionable improvements. The current system is **well-organized and mature** with a solid 7-1 pattern, 50+ design tokens, 40+ mixins, and comprehensive dark mode support. The improvements focus on modernizing the architecture with CSS Layers, fluid typography, OKLCH color spaces, Stylelint enforcement, and eliminating remaining inconsistencies.

---

## Current State Assessment

### What We Have (195 SCSS files total)

| Category | Count | Quality |
|----------|-------|---------|
| Core style files (`src/styles/`) | 30 | Excellent |
| CSS Module files (`.module.scss`) | 162 | Good |
| Domain-specific shared styles | 3 | Good |
| Architecture (7-1 pattern) | Adapted | Excellent |
| Design tokens with accessor functions | 50+ | Excellent |
| Reusable mixins | 40+ | Excellent |
| Keyframe animations | 13 | Good |
| Utility classes | 54+ | Good |
| Theme presets (light/dark variants) | 6 | Good |

### Strengths (Keep These)

1. **7-1 pattern with @use/@forward** - Modern module system, zero @import usage
2. **Token-first approach** - All spacing via `space()`, colors via `color()`, shadows via `shadow()`
3. **Compile-time validation** - Accessor functions throw errors for unknown token keys
4. **Feature flags** - `$enable-fluid-type`, `$enable-css-layers`, etc. in `_config.scss`
5. **Comprehensive mixins** - `respond-to()`, `flex-center`, `card-hover`, `gradient-bg`, etc.
6. **Dark mode** - CSS variables + `.dark` class + theme presets via `[data-theme-preset]`
7. **Accessibility** - WCAG contrast ratios, `focus-ring`, `reduced-motion`, `visually-hidden`
8. **Naming conventions** - Clear separation (kebab-case globals, camelCase modules, BEM components)
9. **CSS Modules + global styles coexistence** - Component scoping + shared design system

### Gaps Identified (Address These)

| Gap | Severity | Enterprise Benchmark |
|-----|----------|---------------------|
| No CSS `@layer` declarations | High | Carbon, Primer, Spectrum all use layers |
| No Stylelint config | High | All enterprise systems enforce lint rules |
| Hardcoded hex colors in domain styles | Medium | Zero hardcoded values in Carbon/Primer |
| No fluid typography (clamp-based) | Medium | Standard in Spectrum, Material, Utopia |
| HSL color space (not OKLCH) | Medium | Spectrum moving to OKLCH, Primer supports it |
| No design token pipeline (JSON→SCSS) | Medium | Carbon, Primer, SLDS all use Style Dictionary |
| Missing filter/blur token map | Medium | All systems tokenize visual effects |
| Inconsistent hover color approach | Medium | Should be standardized |
| No PurgeCSS for unused CSS removal | Low | Primer uses it, 70-90% size reduction |
| No logical properties for RTL | Low | Carbon, SLDS support RTL natively |
| No SassDoc documentation | Low | Carbon, Spectrum have full SassDoc |
| No `additionalData` in Next.js config | Low | Eliminates repetitive `@use` imports |

---

## Research Findings: Enterprise SCSS Design Systems

### Architecture Comparison

| Feature | Carbon (IBM) | Primer (GitHub) | Spectrum (Adobe) | SLDS (Salesforce) | **arolariu.ro** |
|---------|-------------|-----------------|------------------|--------------------|-----------------|
| Module system | @use/@forward | @use/@forward | @use/@forward | CSS custom props | @use/@forward |
| Token tiers | 3-tier (primitive→semantic→component) | 3-tier with overrides | 3-tier with themes | Hooks-based | 1-tier (flat maps) |
| Token pipeline | Style Dictionary | Style Dictionary | Style Dictionary | Custom | None (manual) |
| CSS Layers | Yes | Yes | Yes | N/A | No (flag exists) |
| Color space | HSL → OKLCH migration | HSL + P3 | OKLCH | HSL | HSL |
| Fluid typography | Yes (clamp) | Yes | Yes | No | No (flag exists) |
| Config pattern | `@use config with (...)` | Token JSON | Component-level vars | Styling hooks | `$var !default` |
| Prefix namespace | `cds-` | `primer-` | `spectrum-` | `slds-` | `aro-` (defined, unused) |
| RTL support | Logical properties | Logical properties | Logical properties | LTR only | Physical properties |
| Linting | Stylelint | Stylelint | Stylelint | Custom | None |

### Key Takeaways from Enterprise Systems

1. **Three-tier token architecture is the standard** - Primitives → Semantics → Components
2. **CSS Layers solve the Next.js CSS ordering bug** - Production builds reorder stylesheets; layers make order irrelevant
3. **@import is deprecated** - Dart Sass 1.80.0 deprecated it; removal in Sass 3.0.0 (Oct 2026+)
4. **OKLCH is the recommended color space** - Perceptually uniform, wide-gamut, 92%+ browser support
5. **Fluid typography eliminates breakpoint-based type** - clamp() provides continuous scaling
6. **DTCG token standard reached v1.0** (Oct 2025) - Vendor-neutral format for cross-tool interop
7. **PurgeCSS reduces CSS 70-90%** - Critical for performance with utility classes
8. **Stylelint is non-negotiable** - Every enterprise system enforces nesting depth, naming, no `!important`

---

## Implementation Plan

### Phase 1: Foundation Hardening (Quick Wins)

**Estimated scope: 8-12 files changed**

#### 1.1 Add Stylelint Configuration

Create `sites/arolariu.ro/.stylelintrc.json` with SCSS-specific rules:
- Max nesting depth: 3
- No `!important`
- Enforce kebab-case for selectors in global styles
- Enforce camelCase for CSS Module selectors
- No duplicate `$variables`
- No redundant nesting selectors
- Property order enforcement

**Files to create:**
- `sites/arolariu.ro/.stylelintrc.json`

**Files to modify:**
- `sites/arolariu.ro/package.json` (add `stylelint`, `stylelint-config-standard-scss` deps + `lint:scss` script)

#### 1.2 Enable CSS Layers

The `$enable-css-layers` flag already exists in `_config.scss`. Activate it by wrapping each section of `main.scss` in `@layer` declarations.

**Layer order:** `reset, tokens, base, themes, animations, components, utilities`

This solves the known Next.js production CSS ordering bug where styles load in different order than development.

**Files to modify:**
- `sites/arolariu.ro/src/styles/main.scss` - Add `@layer` declarations
- Verify no specificity regressions after enabling

#### 1.3 Eliminate Hardcoded Colors

Replace all hardcoded hex/rgba values in SCSS files with design token functions.

**Known locations:**
- `src/app/domains/invoices/_styles/_invoice-shared.scss` - 5 hardcoded hex status colors → Move to CSS variables
- Various `.module.scss` files using `rgba(59, 130, 246, 0.2)` → `color-alpha('primary', 0.2)`
- `_buttons.scss` using `hsl(var(--foreground))` → `color('foreground')`

**Files to modify:**
- `src/app/domains/invoices/_styles/_invoice-shared.scss`
- Any `.module.scss` files with hardcoded `rgba()` values (audit via grep)
- `src/styles/components/_buttons.scss` - Standardize on `color()` helper

#### 1.4 Standardize Hover Color Approach

Currently three approaches coexist:
- `interactive-color('hover-accent')` (design system way)
- Raw `#4f46e5` (hardcoded)
- `hsl(var(--primary) / 0.8)` (inline)

Standardize on `interactive-color()` or `color-alpha()` everywhere.

**Files to modify:**
- Audit all hover/focus patterns across `.module.scss` files
- Update inconsistent files to use the token approach

---

### Phase 2: Token System Evolution

**Estimated scope: 6-10 files changed**

#### 2.1 Add Missing Token Maps

Create token maps for values currently hardcoded as magic numbers:

**Filter/Blur tokens** (used in decorative orbs, hero sections):
```scss
$filters: (
  'none': blur(0),
  'sm': blur(4px),
  'md': blur(12px),
  'lg': blur(24px),
  'xl': blur(40px),
  '2xl': blur(64px),
);
```

**Transform tokens** (used in hover-lift, animations):
```scss
$transforms: (
  'lift-sm': translateY(-2px),
  'lift-md': translateY(-4px),
  'lift-lg': translateY(-8px),
  'scale-press': scale(0.98),
  'scale-grow': scale(1.02),
);
```

**Files to modify:**
- `src/styles/abstracts/_variables.scss` - Add new token maps + accessor functions
- Update consuming `.module.scss` files to use new tokens

#### 2.2 Add Convenience Mixins

Extract repeated patterns that appear 20+ times across CSS Modules:

**Padding pairs** (50+ occurrences):
```scss
@mixin px($key) {
  padding-inline: space($key);
}
@mixin py($key) {
  padding-block: space($key);
}
```

**Border shorthand** (30+ occurrences):
```scss
@mixin base-border($radius: 'md') {
  border: 1px solid color('border');
  border-radius: radius($radius);
}
```

**Files to modify:**
- `src/styles/abstracts/_mixins.scss` - Add new convenience mixins
- Optionally refactor `.module.scss` files to use them (can be gradual)

#### 2.3 Evolve to Three-Tier Token Architecture

Restructure tokens from flat maps to the industry-standard three tiers:

**Tier 1 - Primitives** (raw values):
```scss
$color-blue-500: oklch(0.55 0.20 250);
$space-4: 1rem;
```

**Tier 2 - Semantics** (intent-based):
```scss
$color-action-primary: $color-blue-500;
$space-component-padding: $space-4;
```

**Tier 3 - Components** (element-specific):
```scss
$button-background: $color-action-primary;
$card-padding: $space-component-padding;
```

This is a larger refactor that should be done incrementally. Start by documenting the mapping, then migrate one category at a time.

**Files to create:**
- `src/styles/abstracts/_primitives.scss` (new file for raw values)

**Files to modify:**
- `src/styles/abstracts/_variables.scss` - Restructure to reference primitives
- `src/styles/abstracts/_colors.scss` - Add semantic layer
- `src/styles/abstracts/_index.scss` - Forward new module

---

### Phase 3: Modern CSS Features

**Estimated scope: 8-15 files changed**

#### 3.1 Implement Fluid Typography

Replace the fixed `$font-sizes` map with `clamp()`-based fluid values. The `$enable-fluid-type` flag already exists.

```scss
$font-sizes-fluid: (
  'sm': clamp(0.8rem, 0.17vw + 0.76rem, 0.9rem),
  'base': clamp(1rem, 0.22vw + 0.94rem, 1.125rem),
  'lg': clamp(1.125rem, 0.33vw + 1.04rem, 1.35rem),
  'xl': clamp(1.25rem, 0.56vw + 1.11rem, 1.6rem),
  '2xl': clamp(1.5rem, 0.89vw + 1.28rem, 2.1rem),
  '3xl': clamp(1.875rem, 1.33vw + 1.54rem, 2.8rem),
  '4xl': clamp(2.25rem, 2vw + 1.75rem, 3.6rem),
  '5xl': clamp(3rem, 3vw + 2.25rem, 5rem),
);
```

Use Utopia.fyi to generate the exact clamp values for min-viewport (320px) to max-viewport (1440px).

**Files to modify:**
- `src/styles/abstracts/_typography.scss` - Add fluid scale alongside fixed scale
- `src/styles/base/_elements.scss` - Update heading defaults to use fluid scale

#### 3.2 Implement Fluid Spacing

Similarly, add fluid spacing tokens for section-level spacing:

```scss
$space-fluid: (
  'section-sm': clamp(space(8), 3vw, space(12)),
  'section-md': clamp(space(12), 5vw, space(20)),
  'section-lg': clamp(space(16), 8vw, space(32)),
);
```

**Files to modify:**
- `src/styles/abstracts/_variables.scss` - Add fluid spacing tokens
- Update page sections to use fluid spacing

#### 3.3 Add Container Query Mixins

The `$enable-container-queries` flag exists. Add mixins for component-level responsiveness:

```scss
@mixin container($name) {
  container-type: inline-size;
  container-name: $name;
}

@mixin container-query($name, $min-width) {
  @container #{$name} (min-width: #{$min-width}) {
    @content;
  }
}
```

**Files to modify:**
- `src/styles/abstracts/_mixins.scss` - Add container query mixins
- Demonstrate usage in a card or grid component

#### 3.4 Adopt CSS Logical Properties

Replace physical directional properties with logical equivalents for RTL readiness:

- `padding-left/right` → `padding-inline-start/end` or `padding-inline`
- `margin-left/right` → `margin-inline-start/end` or `margin-inline`
- `text-align: left` → `text-align: start`
- `border-left` → `border-inline-start`

This can be done gradually via Stylelint rules that flag physical properties.

**Files to modify:**
- Add Stylelint rule for logical properties preference
- Migrate `src/styles/` global files first, then `.module.scss` files gradually

---

### Phase 4: Performance Optimization

**Estimated scope: 3-5 files changed**

#### 4.1 Add PurgeCSS to PostCSS Pipeline

The current `postcss.config.js` only has `cssnano`. Add PurgeCSS to remove unused utility classes:

```javascript
module.exports = {
  plugins: {
    '@fullhuman/postcss-purgecss': {
      content: ['./src/**/*.{ts,tsx}'],
      defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
      safelist: {
        standard: [/^animate-/, /^dark/, /^data-/],
      },
    },
    cssnano: {},
  },
};
```

**Files to modify:**
- `sites/arolariu.ro/postcss.config.js`
- `sites/arolariu.ro/package.json` (add `@fullhuman/postcss-purgecss`)

#### 4.2 Add `additionalData` to Next.js Sass Config

Eliminate the repetitive `@use '../../styles/abstracts' as *;` at the top of every CSS Module:

```typescript
// next.config.ts
const nextConfig = {
  sassOptions: {
    additionalData: `@use '@/styles/abstracts' as *;`,
  },
};
```

This automatically prepends the import to every `.scss` file, saving ~162 import lines across the codebase.

**Files to modify:**
- `sites/arolariu.ro/next.config.ts` - Add `sassOptions.additionalData`
- Remove manual `@use` imports from all `.module.scss` files (162 files, automated via find-replace)

#### 4.3 Expand `content-visibility` Usage

The `content-visibility` mixin exists but could be used more widely for long pages:

```scss
// Apply to off-screen sections in long pages
.feed-item, .invoice-row, .comment-card {
  @include content-visibility(200px);
}
```

**Files to modify:**
- Add `content-visibility: auto` to repeated list items in invoice tables, comment sections, etc.

---

### Phase 5: Color System Modernization

**Estimated scope: 5-8 files changed**

#### 5.1 Migrate to OKLCH Color Space

OKLCH provides perceptually uniform color manipulation. Currently, all colors use HSL format in `globals.scss`.

**Migration strategy** (incremental):
1. Add OKLCH equivalents alongside existing HSL values
2. Use `@supports (color: oklch(0 0 0))` for progressive enhancement
3. Eventually remove HSL fallbacks when browser support reaches 95%+

```scss
// globals.scss - add OKLCH alongside HSL
:root {
  --primary: 221.2 83.2% 53.3%; // HSL (current)
  --primary-oklch: 0.55 0.20 250; // OKLCH (new)
}
```

**Files to modify:**
- `src/app/globals.scss` - Add OKLCH color values
- `src/styles/abstracts/_colors.scss` - Add OKLCH accessor function
- Update theme presets accordingly

#### 5.2 Add Semantic Status Colors as CSS Variables

The invoice domain has hardcoded status colors. Promote them to the global color system:

```scss
// globals.scss
:root {
  --status-pending: 38 92% 50%;
  --status-processing: 217 91% 60%;
  --status-completed: 142 71% 45%;
  --status-failed: 0 84% 60%;
  --status-cancelled: 220 9% 46%;
}
```

**Files to modify:**
- `src/app/globals.scss` - Add status color variables
- `src/styles/abstracts/_colors.scss` - Add `status-color()` function
- `src/app/domains/invoices/_styles/_invoice-shared.scss` - Use new tokens

---

### Phase 6: Documentation & Governance

**Estimated scope: 3-5 files created**

#### 6.1 Add SassDoc Comments

Add SassDoc annotations to all public functions, mixins, and variables:

```scss
/// Get a spacing value from the design token map.
/// @param {String | Number} $key - The spacing key (e.g., 4, 8, 12)
/// @return {Length} The rem-based spacing value
/// @example scss
///   padding: space(4); // → 1rem
/// @group tokens
@function space($key) { ... }
```

**Files to modify:**
- `src/styles/abstracts/_variables.scss`
- `src/styles/abstracts/_colors.scss`
- `src/styles/abstracts/_mixins.scss`
- `src/styles/abstracts/_functions.scss`
- `src/styles/abstracts/_typography.scss`

#### 6.2 Document Shadow Elevation Guide

Currently no documentation on which shadow level to use where. Create a clear guide:

| Elevation | Token | Use Case |
|-----------|-------|----------|
| Ground | `shadow('sm')` | Subtle depth (badges, tags) |
| Raised | `shadow('md')` | Cards, panels |
| Floating | `shadow('lg')` | Dropdowns, tooltips |
| Modal | `shadow('xl')` | Modals, dialogs |
| Toast | `shadow('2xl')` | Notifications, toasts |

**Files to modify:**
- Add as comments in `src/styles/abstracts/_variables.scss` (shadows section)

#### 6.3 Create SCSS Architecture Decision Record

Document the design system architecture in an RFC:

**File to create:**
- `docs/rfc/RFC-1008-scss-design-system-architecture.md`

---

### Phase 7: Future Considerations (Not Immediate)

These items are for awareness and future planning, not immediate implementation:

1. **Design Token Pipeline (Style Dictionary)** - When the design system grows to multiple consumers, set up JSON → SCSS automated generation
2. **CSS `light-dark()` Function** - When browser support reaches 95%+, simplify theming
3. **CSS Native Nesting** - When Dart Sass adds interop support, reduce mixin complexity
4. **Web Components** - Shopify deprecated Polaris tokens in favor of Web Components (industry trend to watch)
5. **Prefix namespace activation** - The `$css-prefix: 'aro'` exists but isn't used yet; consider activating for all CSS custom properties

---

## Implementation Priority Matrix

| Phase | Priority | Effort | Impact | Dependencies |
|-------|----------|--------|--------|-------------|
| 1.1 Stylelint | P0 - Critical | Low (1 file) | High - Prevents regressions | None |
| 1.2 CSS Layers | P0 - Critical | Low (1 file) | High - Fixes Next.js ordering | None |
| 1.3 Eliminate hardcoded colors | P1 - High | Medium (10+ files) | Medium - Consistency | None |
| 1.4 Standardize hover colors | P1 - High | Medium (audit needed) | Medium - Consistency | 1.3 |
| 2.1 Missing token maps | P1 - High | Low (1-2 files) | Medium - DX improvement | None |
| 2.2 Convenience mixins | P2 - Medium | Low (1 file) | Medium - DX improvement | None |
| 2.3 Three-tier tokens | P2 - Medium | High (restructure) | High - Scalability | 2.1 |
| 3.1 Fluid typography | P2 - Medium | Medium (2-3 files) | High - Modern UX | None |
| 3.2 Fluid spacing | P2 - Medium | Low (1-2 files) | Medium - Modern UX | 3.1 |
| 3.3 Container queries | P3 - Low | Low (1 file) | Low - Future-proofing | None |
| 3.4 Logical properties | P3 - Low | High (gradual) | Medium - RTL readiness | 1.1 (Stylelint) |
| 4.1 PurgeCSS | P1 - High | Low (2 files) | High - Performance | None |
| 4.2 additionalData | P1 - High | Low (1 file + bulk edit) | High - DX improvement | None |
| 4.3 content-visibility | P3 - Low | Low (targeted) | Medium - Performance | None |
| 5.1 OKLCH colors | P3 - Low | Medium (3+ files) | Medium - Future-proofing | None |
| 5.2 Status color vars | P1 - High | Low (3 files) | Medium - Consistency | 1.3 |
| 6.1 SassDoc | P2 - Medium | Medium (5 files) | Medium - Maintainability | None |
| 6.2 Shadow guide | P2 - Medium | Low (1 file) | Low - Documentation | None |
| 6.3 Architecture RFC | P3 - Low | Medium (1 file) | Low - Documentation | All |

---

## Recommended Execution Order

**Sprint 1 (Foundation):** 1.1, 1.2, 4.2, 4.1
**Sprint 2 (Tokens):** 1.3, 1.4, 2.1, 5.2
**Sprint 3 (Modern CSS):** 3.1, 3.2, 2.2, 6.2
**Sprint 4 (Evolution):** 2.3, 6.1, 3.3, 3.4
**Backlog:** 4.3, 5.1, 6.3

---

## Verification Strategy

After each phase:

1. **Build test**: `npm run build:website` must succeed
2. **Visual regression**: Compare dev and production CSS ordering
3. **Lint check**: `npx stylelint "src/**/*.scss"` must pass
4. **Performance audit**: Lighthouse CSS metrics should not regress
5. **Dark mode test**: All theme presets render correctly
6. **Accessibility**: Focus rings, contrast ratios, reduced-motion all intact

---

## Sources & References

### Enterprise Design Systems
- [IBM Carbon Design System](https://github.com/carbon-design-system/carbon)
- [GitHub Primer CSS](https://github.com/primer/css)
- [Adobe Spectrum CSS](https://github.com/adobe/spectrum-css)
- [Salesforce SLDS 2](https://www.salesforce.com/blog/what-is-slds-2/)
- [Shopify Polaris Tokens](https://github.com/Shopify/polaris-tokens)
- [Google Material Design 3](https://m3.material.io/)

### Standards & Tools
- [DTCG Design Tokens Specification v1.0](https://www.w3.org/community/design-tokens/)
- [Style Dictionary 4](https://styledictionary.com/)
- [Sass @use/@forward Documentation](https://sass-lang.com/documentation/at-rules/use/)
- [Sass @import Deprecation](https://sass-lang.com/documentation/breaking-changes/import/)

### Modern CSS Practices
- [CSS Cascade Layers Guide](https://css-tricks.com/css-cascade-layers/)
- [Fixing Next.js CSS Order with Layers](https://www.trysmudford.com/blog/next-js-css-order/)
- [OKLCH Color Space Guide](https://oklch.org/posts/ultimate-oklch-guide)
- [Fluid Typography with clamp()](https://www.smashingmagazine.com/2022/10/fluid-typography-clamp-sass-functions/)
- [Utopia Fluid Type Scale Calculator](https://utopia.fyi)
- [CSS Logical Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values)
- [PurgeCSS Next.js Guide](https://purgecss.com/guides/next)
- [Stylelint SCSS Config](https://github.com/stylelint-scss/stylelint-scss)
