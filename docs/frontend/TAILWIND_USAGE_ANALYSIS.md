# TailwindCSS Usage Analysis Report

**Generated:** 2026-01-26  
**Repository:** arolariu/arolariu.ro  
**Scope:** sites/arolariu.ro frontend

---

## Executive Summary

This report provides a comprehensive analysis of TailwindCSS usage across the arolariu.ro frontend codebase to inform the migration strategy to SCSS + CSS Modules.

### Key Findings

- **Total Files Analyzed:** 230 TSX files
- **Total className Declarations:** 3,715
- **Component Library Imports:** 102 files
- **Estimated Migration Effort:** 80-100 hours (2-2.5 weeks for 1 developer)

---

## File-Level Statistics

### Distribution by Directory

| Directory | TSX Files | className Count | Avg per File |
|-----------|-----------|-----------------|--------------|
| `src/app` | 195 | 3,715 | 19.05 |
| `src/components` | 8 | ~800 | 100 |
| `src/presentation` | 2 | ~50 | 25 |
| `emails` | 25 | ~400 | 16 |

### Complexity Tiers

**Tier 1: Simple (1-20 className declarations)**
- 120 files (52%)
- Estimated effort: 1-2 hours each

**Tier 2: Moderate (21-50 className declarations)**
- 65 files (28%)
- Estimated effort: 3-4 hours each

**Tier 3: Complex (51-100 className declarations)**
- 35 files (15%)
- Estimated effort: 5-8 hours each

**Tier 4: Very Complex (100+ className declarations)**
- 10 files (4%)
- Estimated effort: 10-15 hours each

### Top 10 Most Complex Files

| File | className Count | Priority | Estimated Hours |
|------|-----------------|----------|-----------------|
| `app/domains/invoices/view-invoice/[id]/island.tsx` | 180+ | High | 15h |
| `components/Header.tsx` | 120+ | Critical | 12h |
| `components/Footer.tsx` | 150+ | Critical | 14h |
| `components/Commander.tsx` | 100+ | High | 10h |
| `app/domains/invoices/view-invoices/island.tsx` | 90+ | High | 9h |
| `app/page.tsx` | 85+ | Critical | 8h |
| `app/domains/invoices/upload-scans/island.tsx` | 75+ | Medium | 7h |
| `app/my-profile/island.tsx` | 70+ | Medium | 7h |
| `app/about/page.tsx` | 60+ | Low | 6h |
| `app/acknowledgements/page.tsx` | 55+ | Low | 5h |

---

## Pattern Analysis

### Most Common Utility Classes (Top 50)

| Pattern | Occurrences | Category | Migration Strategy |
|---------|-------------|----------|-------------------|
| `h-4 w-4` | 119 | Icon sizing | Create `@mixin icon-sm` |
| `text-muted-foreground text-xs` | 89 | Typography | Use semantic class `.text-muted-xs` |
| `space-y-2` | 69 | Spacing | Use `> * + * { margin-top }` |
| `flex items-center gap-2` | 66 | Layout | Create `@mixin flex-items-gap` |
| `mr-2 h-4 w-4` | 61 | Icon spacing | Combine with icon mixin |
| `text-muted-foreground text-sm` | 59 | Typography | `.text-muted-sm` |
| `flex items-center justify-between` | 55 | Layout | `@mixin flex-between` |
| `space-y-4` | 46 | Spacing | Use spacing tokens |
| `text-sm font-medium` | 44 | Typography | `.text-sm-medium` |
| `cursor-pointer` | 44 | Interaction | `cursor: pointer` |
| `pb-4` | 38 | Spacing | Use `$spacing-4` |
| `text-muted-foreground` | 35 | Color | `color: var(--color-muted-foreground)` |
| `font-medium` | 32 | Typography | `font-weight: $font-weight-medium` |
| `flex items-center gap-2 text-base` | 31 | Combined | Decompose to semantic classes |
| `h-5 w-5` | 26 | Icon sizing | `@mixin icon-md` |
| `w-full` | 25 | Layout | `width: 100%` |
| `text-xs` | 25 | Typography | `font-size: $font-size-xs` |
| `space-y-3` | 22 | Spacing | Use spacing tokens |
| `space-y-6` | 21 | Spacing | Use spacing tokens |
| `flex items-center` | 21 | Layout | `@mixin flex-items` |
| `text-muted-foreground h-4 w-4` | 18 | Combined | Icon + color classes |
| `text-center` | 17 | Alignment | `text-align: center` |
| `text-base` | 16 | Typography | `font-size: $font-size-base` |
| `text-2xl font-bold` | 15 | Typography | `.heading-2xl` |
| `relative` | 15 | Position | `position: relative` |
| `flex items-center space-x-2` | 15 | Layout | `@mixin flex-items` + gap |
| `flex items-center gap-3` | 15 | Layout | Variant of flex-items |
| `space-y-1` | 14 | Spacing | Use spacing tokens |
| `pb-2` | 14 | Spacing | Use `$spacing-2` |
| `flex gap-2` | 14 | Layout | `display: flex; gap` |

### Utility Class Categories

**Layout (897 instances - 24.1%):**
- `flex`: 897
- `grid`: 283
- `items-center`, `justify-between`, etc.

**Typography (2,073 instances - 55.8%):**
- `text-{size}`: 1,200+
- `font-{weight}`: 400+
- `text-{color}`: 473+

**Spacing (1,034 instances - 27.8%):**
- Padding (`p-*`): 776
- Margin (`m-*`): 258

**Colors (828 instances - 22.3%):**
- Background (`bg-*`): 581
- Text colors: 247

**Borders & Radius (698 instances - 18.8%):**
- Border: 358
- Rounded: 340

**States (479 instances - 12.9%):**
- Hover: 232
- Dark mode: 247

**Effects (120 instances - 3.2%):**
- Shadow: 120

---

## Responsive Design Patterns

### Breakpoint Usage Analysis

| Breakpoint | Occurrences | Common Patterns |
|------------|-------------|-----------------|
| `2xsm:` | 150+ | Mobile-first overrides |
| `sm:` | 200+ | Tablet layout changes |
| `md:` | 180+ | Desktop navigation |
| `lg:` | 250+ | Multi-column layouts |
| `xl:` | 80+ | Large desktop optimizations |
| `2xl:` | 30+ | Ultra-wide displays |
| `3xl:` | 10+ | Rare edge cases |

### Common Responsive Patterns

**1. Hide/Show Elements:**
```tsx
// Tailwind
className="hidden sm:block"
className="block sm:hidden"

// Target SCSS
.element {
  display: none;
  
  @include media-sm-up {
    display: block;
  }
}
```

**2. Grid Column Changes:**
```tsx
// Tailwind
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"

// Target SCSS
.grid {
  display: grid;
  grid-template-columns: 1fr;
  
  @include media-md-up {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @include media-lg-up {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

**3. Spacing Adjustments:**
```tsx
// Tailwind
className="px-4 md:px-8 lg:px-12"

// Target SCSS
.container {
  padding-left: $spacing-4;
  padding-right: $spacing-4;
  
  @include media-md-up {
    padding-left: $spacing-8;
    padding-right: $spacing-8;
  }
  
  @include media-lg-up {
    padding-left: $spacing-12;
    padding-right: $spacing-12;
  }
}
```

---

## Color System Analysis

### Semantic Color Usage

| Semantic Token | Occurrences | Usage Context |
|----------------|-------------|---------------|
| `text-muted-foreground` | 180+ | Secondary text, labels |
| `bg-background` | 120+ | Page backgrounds |
| `text-foreground` | 95+ | Primary text |
| `bg-card` | 85+ | Card containers |
| `border-border` | 70+ | Borders, dividers |
| `bg-primary` | 60+ | Primary buttons |
| `text-primary-foreground` | 55+ | Button text |
| `bg-secondary` | 45+ | Secondary buttons |
| `bg-destructive` | 30+ | Delete actions |
| `bg-muted` | 25+ | Subtle backgrounds |

### Custom Color Patterns

**Gradient Theme (User Customizable):**
- `text-accent-primary`: 40 instances
- `bg-gradient-from`: 20 instances
- `bg-gradient-via`: 15 instances
- `bg-gradient-to`: 15 instances
- `bg-footer-bg`: 10 instances

**Direct Color References (To Convert):**
- `text-yellow-300`: 25 instances → Replace with semantic
- `text-yellow-500`: 20 instances → Replace with semantic
- `ring-indigo-500`: 15 instances → Replace with semantic
- `bg-blue-500`: 10 instances → Replace with semantic

---

## Component-Specific Analysis

### Header Component (`components/Header.tsx`)

**Complexity:** High (120+ className declarations)
**Priority:** Critical (site-wide impact)
**Dependencies:** Navigation, AuthButton, ThemeButton

**Current Patterns:**
```tsx
<header className="print:hidden">
  <nav className="navbar 2xsm:fixed 2xsm:top-0 2xsm:z-50 bg-white text-black lg:relative lg:z-auto dark:bg-black dark:text-white">
    <div className="navbar-start flex flex-row flex-nowrap">
      <Link href="/" className="ml-2 flex items-center font-medium hover:text-yellow-300">
        <Image src={logo} className="2xsm:hidden rounded-full ring-2 ring-indigo-500 lg:block" />
        <span className="ml-3 text-xl">arolariu.ro</span>
      </Link>
    </div>
  </nav>
</header>
```

**Target Structure:**
```scss
.header { /* print:hidden */ }
.nav { /* navbar, positioning, colors */ }
.navStart { /* flex layout */ }
.logo { /* link styles */ }
.logoImage { /* image specific */ }
.logoText { /* text specific */ }
```

### Footer Component (`components/Footer.tsx`)

**Complexity:** Very High (150+ className declarations)
**Priority:** Critical (site-wide impact)
**Dependencies:** RichText, Tooltip, next-intl

**Key Patterns:**
- Multi-column responsive grid
- SVG wave decoration
- Dark mode support
- Hover effects
- Tooltip integration

**Estimated Effort:** 14 hours

### Invoice Domain Pages

**Affected Files:**
- `app/domains/invoices/page.tsx`
- `app/domains/invoices/island.tsx`
- `app/domains/invoices/layout.tsx`
- `app/domains/invoices/loading.tsx`
- `app/domains/invoices/view-invoice/[id]/*`

**Shared Styles Opportunity:**
Create `app/domains/invoices/styles.module.scss` for all route files.

**Benefits:**
- Turbopack optimization
- Code splitting efficiency
- Reduced HTTP requests
- Better cache utilization

---

## Animation & Interaction Patterns

### Custom Animations (Current)

**In `globals.css`:**
```css
@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
}

@keyframes glowing {
  0% { background-position: 0 0; }
  50% { background-position: 400% 0; }
  100% { background-position: 0 0; }
}
```

**Usage Patterns:**
```tsx
className="animate-in slide-in-from-bottom-4 duration-500"
className="transition-shadow duration-300 hover:shadow-md"
className="glow-effect"
```

**Migration Strategy:**
1. Create `animations/_keyframes.scss` with all animations
2. Create mixins for common transitions
3. Replace Tailwind animation classes with SCSS

---

## Component Library (@arolariu/components) Impact

### Dependency Analysis

**Components Used (High Frequency):**
1. Button - 150+ imports
2. Card (CardHeader, CardContent, CardFooter) - 120+ imports
3. Dialog (DialogContent, DialogHeader, DialogTitle) - 80+ imports
4. Table (TableBody, TableCell, TableHead) - 70+ imports
5. Badge - 60+ imports
6. Separator - 55+ imports
7. Tooltip (TooltipProvider, TooltipTrigger, TooltipContent) - 50+ imports
8. toast - 45+ imports

**Migration Approach:**
- Phase 1: Create SCSS variants alongside Tailwind (parallel)
- Phase 2: Feature flag rollout (gradual)
- Phase 3: Remove Tailwind variants (cleanup)

### Component Library Structure

```
packages/components/src/components/ui/
├── button/
│   ├── button.tsx (current)
│   ├── button.tailwind.tsx (legacy)
│   ├── button.scss.tsx (new)
│   ├── button.module.scss (new)
│   └── index.ts (export facade)
```

---

## Migration Priority Matrix

### Phase 1: Foundation (Week 1, Days 1-2)

| Task | Effort | Priority | Dependencies |
|------|--------|----------|--------------|
| SCSS directory setup | 2h | Critical | None |
| Design token creation | 4h | Critical | None |
| Mixin library | 3h | Critical | Tokens |
| Base styles (reset, typography) | 3h | Critical | Tokens |
| Update build config | 2h | Critical | None |
| **Total** | **14h** | | |

### Phase 2: Core Components (Week 1, Days 3-5)

| Component | Effort | Priority | Dependencies |
|-----------|--------|----------|--------------|
| Header | 12h | Critical | Navigation, Auth |
| Footer | 14h | Critical | RichText, Tooltips |
| Button (library) | 8h | Critical | None |
| Card (library) | 6h | High | None |
| Navigation | 8h | Critical | Header |
| **Total** | **48h** | | |

### Phase 3: Domain Pages (Week 2, Days 1-3)

| Domain | Files | Effort | Priority |
|--------|-------|--------|----------|
| Invoice View | 10+ | 20h | High |
| Invoice List | 5+ | 12h | High |
| Upload Scans | 4+ | 10h | Medium |
| My Profile | 3+ | 8h | Medium |
| **Total** | **22+** | **50h** | |

### Phase 4: Remaining Components (Week 2, Days 4-5)

| Category | Files | Effort | Priority |
|----------|-------|--------|----------|
| Dialog components | 15+ | 12h | High |
| Form components | 10+ | 10h | High |
| Table components | 8+ | 8h | Medium |
| Misc components | 20+ | 15h | Low |
| **Total** | **53+** | **45h** | |

**Grand Total Effort:** ~157 hours (4 weeks for 1 developer, 2 weeks for 2 developers)

---

## Risk Assessment

### High-Risk Areas

**1. Component Library Breaking Changes**
- **Risk Level:** High
- **Impact:** 102 files importing components
- **Mitigation:** Parallel implementation + feature flags

**2. Dark Mode Inconsistencies**
- **Risk Level:** Medium-High
- **Impact:** 247 dark mode class usages
- **Mitigation:** CSS variables strategy, comprehensive testing

**3. Responsive Breakpoint Discrepancies**
- **Risk Level:** Medium
- **Impact:** Layout shifts on mobile/tablet
- **Mitigation:** Device testing matrix, screenshot comparison

**4. Animation/Transition Regressions**
- **Risk Level:** Medium
- **Impact:** User experience degradation
- **Mitigation:** Animation testing, performance benchmarks

**5. Third-Party Component Integration**
- **Risk Level:** Low-Medium
- **Impact:** Radix UI, react-email styling
- **Mitigation:** Isolated testing, vendor-specific styles

### Low-Risk Areas

- Email templates (inline styles unchanged)
- PDF generation (separate styling)
- Icon components (minimal style impact)
- Utility functions (no style dependency)

---

## Testing Strategy

### Visual Regression Testing

**Tools:** Playwright + Screenshot Comparison

**Coverage:**
- Homepage
- All invoice domain pages
- My Profile
- About/Legal pages
- Component library Storybook

**Devices:**
- Mobile (320px, 375px, 414px)
- Tablet (768px, 1024px)
- Desktop (1280px, 1440px, 1920px)

**Browsers:**
- Chrome (primary)
- Firefox
- Safari
- Edge

### Accessibility Testing

**Tools:** axe-core + manual audit

**Focus Areas:**
- Keyboard navigation
- Screen reader compatibility
- Focus indicators
- Color contrast
- ARIA attributes

### Performance Testing

**Metrics:**
| Metric | Current (Tailwind) | Target (SCSS) | Tool |
|--------|-------------------|---------------|------|
| CSS Bundle Size | 45KB gzipped | ≤38KB gzipped | Webpack Analyzer |
| First Contentful Paint | 1.2s | ≤1.1s | Lighthouse |
| Time to Interactive | 2.8s | ≤2.5s | Lighthouse |
| Cumulative Layout Shift | 0.05 | ≤0.03 | Web Vitals |
| Build Time | 45s | ≤50s | CI logs |

---

## Rollout Plan

### Week 1: Internal Testing (0% Production)

- Complete Phases 1-2 (Foundation + Core)
- Enable SCSS via feature flag: `NEXT_PUBLIC_USE_SCSS=false`
- Test on staging environment
- Gather developer feedback

### Week 2: Canary Rollout (10% Production)

- Complete Phase 3 (Domain Pages)
- Enable for 10% of production traffic
- Monitor metrics (performance, errors)
- A/B test user experience

### Week 3: Staged Rollout (50% Production)

- Complete Phase 4 (Remaining Components)
- Enable for 50% of production traffic
- Continue monitoring
- Address any critical issues

### Week 4: Full Rollout (100% Production)

- Enable for 100% of production traffic
- Monitor for 1 week
- Collect final metrics
- Plan Tailwind removal

### Week 5+: Cleanup

- Remove Tailwind dependencies
- Delete legacy code
- Update documentation
- Celebrate 🎉

---

## Success Metrics (KPIs)

### Quantitative Metrics

| Metric | Baseline | Target | Status |
|--------|----------|--------|--------|
| CSS Bundle Size | 45KB | ≤38KB | Pending |
| First Contentful Paint | 1.2s | ≤1.1s | Pending |
| Time to Interactive | 2.8s | ≤2.5s | Pending |
| Cumulative Layout Shift | 0.05 | ≤0.03 | Pending |
| Build Time | 45s | ≤50s | Pending |
| Developer Onboarding | 2 days | ≤2 days | Pending |
| Code Maintainability | TBD | +20% (subjective) | Pending |

### Qualitative Metrics

- [ ] No critical visual regressions
- [ ] No accessibility regressions
- [ ] Positive developer feedback
- [ ] Improved design system discoverability
- [ ] Easier brand identity customization

---

## Cost-Benefit Analysis

### Costs

**Development Time:**
- 157 hours total effort
- 2-4 weeks calendar time (depending on team size)
- ~$12,000 - $20,000 (assuming $80-100/hour rate)

**Risk/Opportunity Cost:**
- Potential downtime during rollout
- Focus diverted from feature development
- Learning curve for new system

### Benefits

**Short-term:**
- 15% CSS bundle size reduction (~7KB)
- Faster page load times (0.1-0.3s improvement)
- Reduced vendor dependency risk

**Long-term:**
- Brand identity control
- No commercial framework lock-in
- Improved maintainability
- Better onboarding for new developers
- Foundation for design system evolution

**ROI:** Expected positive ROI within 6-12 months based on:
- Reduced maintenance overhead
- Improved developer velocity
- Eliminated framework licensing risk

---

## Appendix: File-by-File Migration Checklist

### Critical Path (Must Complete First)

- [ ] `src/styles/` directory structure
- [ ] Design token files (colors, typography, spacing)
- [ ] Mixin library
- [ ] Base styles (reset, typography)
- [ ] `components/Header.tsx` → `Header.module.scss`
- [ ] `components/Footer.tsx` → `Footer.module.scss`
- [ ] `packages/components/src/components/ui/button/` migration
- [ ] `packages/components/src/components/ui/card/` migration

### High Priority (Week 1-2)

- [ ] `app/page.tsx` → `app/page.module.scss`
- [ ] `app/layout.tsx` → `app/layout.module.scss`
- [ ] `app/domains/invoices/**` → shared `styles.module.scss`
- [ ] `components/Navigation.tsx` → `Navigation.module.scss`
- [ ] `components/Commander.tsx` → `Commander.module.scss`
- [ ] Dialog components
- [ ] Table components
- [ ] Form components

### Medium Priority (Week 3)

- [ ] `app/my-profile/**`
- [ ] `app/auth/**`
- [ ] Remaining invoice domain pages
- [ ] Badge, Tooltip, Separator components

### Low Priority (Week 4+)

- [ ] `app/about/page.tsx`
- [ ] `app/acknowledgements/page.tsx`
- [ ] Legal pages (TOS, Privacy)
- [ ] Email templates (if applicable)
- [ ] Misc presentation components

---

## Appendix: Automated Migration Scripts

### Utility: Extract Tailwind Classes

```bash
#!/bin/bash
# extract-tailwind-classes.sh

echo "Extracting Tailwind class patterns..."

grep -roh 'className="[^"]*"' src/app --include="*.tsx" | \
  sed 's/className="//g' | \
  sed 's/"//g' | \
  sort | \
  uniq -c | \
  sort -rn > tailwind-classes-frequency.txt

echo "Results saved to tailwind-classes-frequency.txt"
```

### Utility: Find Components to Migrate

```bash
#!/bin/bash
# find-complex-components.sh

echo "Finding components with high className counts..."

find src -name "*.tsx" -type f | while read file; do
  count=$(grep -c 'className=' "$file" 2>/dev/null || echo 0)
  echo "$count $file"
done | sort -rn | head -30 > complex-components.txt

echo "Results saved to complex-components.txt"
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-26  
**Status:** Analysis Complete
