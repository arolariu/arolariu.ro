# SCSS Migration Strategy Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Systematically migrate sites/arolariu.ro from TailwindCSS utility classes to the SCSS infrastructure, maintaining full functionality throughout the transition.

**Prerequisites:** Complete the SCSS Infrastructure Plan (`2026-02-05-scss-infrastructure.md`) first.

**Architecture:** Parallel adoption - both Tailwind and SCSS coexist during migration. BEM methodology for component classes. CSS Modules for page-specific scoped styles.

**Scope:** Main site only. Component library (@arolariu/components) continues using Tailwind.

---

## Critical Information

### What We're Migrating FROM

Current Tailwind usage patterns (from analysis):
- **174 files** with className attributes
- **3,864 className occurrences**
- **8 custom breakpoints**: 2xsm, xsm, sm, md, lg, xl, 2xl, 3xl
- **Dark mode**: `.dark` class on `<html>` element
- **Dynamic classes**: `cn()` utility for conditional classes
- **Responsive patterns**: `md:grid-cols-2 lg:grid-cols-3`
- **State variants**: `hover:`, `focus:`, `active:`, `disabled:`
- **Group variants**: `group`, `group-hover:`

### What We're Migrating TO

- **BEM component classes**: `.card`, `.card__title`, `.card--highlighted`
- **CSS Modules**: `page.module.scss` for page-specific scoped styles
- **SCSS mixins**: `@include respond-to('md')` instead of `md:` prefix
- **CSS variables**: `color: hsl(var(--primary))` instead of `text-primary`
- **Semantic class names**: Descriptive names over utility composition

### What MUST Continue Working

1. **Component library**: @arolariu/components uses Tailwind - must coexist
2. **Dark mode**: `.dark` class toggle via next-themes
3. **Gradient theming**: CSS variables from GradientThemeContext
4. **Font switching**: Caudex ↔ Atkinson Hyperlegible via FontContext
5. **Responsive design**: All 8 breakpoints must work identically
6. **Animations**: Framer Motion integration unaffected

---

## Migration Principles

### 1. One Component/Page at a Time

Never migrate multiple pages simultaneously. Each migration:
1. Analyze current Tailwind classes
2. Create SCSS equivalent
3. Replace className
4. Test all viewports
5. Test light/dark modes
6. Commit

### 2. BEM Naming Convention

```scss
// Block
.card { }

// Element (part of block)
.card__header { }
.card__title { }
.card__content { }
.card__footer { }

// Modifier (variation of block/element)
.card--highlighted { }
.card--compact { }
.card__title--large { }
```

### 3. CSS Module Naming for Pages

For page-specific styles, use CSS Modules:
```tsx
// page.module.scss
.hero { }
.heroTitle { }  // camelCase for CSS Module classes
.heroSubtitle { }

// island.tsx
import styles from './page.module.scss';
<section className={styles.hero}>
  <h1 className={styles.heroTitle}>...</h1>
</section>
```

### 4. Handling Dynamic Classes

**Before (Tailwind + cn):**
```tsx
className={cn(
  "text-red-500 hover:text-red-700",
  isActive && "font-bold"
)}
```

**After (SCSS + cn):**
```tsx
className={cn(
  styles.status,
  isActive && styles.statusActive
)}
```

```scss
// page.module.scss
.status {
  color: hsl(var(--destructive));
  @include transition(color);

  &:hover {
    color: hsl(var(--destructive) / 0.8);
  }
}

.statusActive {
  font-weight: font-weight('bold');
}
```

### 5. Responsive Migration Pattern

**Before (Tailwind):**
```tsx
className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
```

**After (SCSS):**
```tsx
className={styles.grid}
```

```scss
.grid {
  @include grid(1, space(6));

  @include respond-to('md') {
    @include grid(2, space(6));
  }

  @include respond-to('lg') {
    @include grid(3, space(6));
  }
}
```

### 6. Dark Mode Migration Pattern

**Before (Tailwind):**
```tsx
className="bg-white text-black dark:bg-black dark:text-white"
```

**After (SCSS):**
```tsx
className={styles.container}
```

```scss
.container {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  // CSS variables automatically switch in dark mode!
}

// OR for non-variable properties:
.specialElement {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);

  @include dark {
    box-shadow: 0 2px 4px rgba(0,0,0,0.4);
  }
}
```

---

## Migration Order

### Rationale

Migrate in order of increasing complexity:
1. **Static pages** - Few interactions, good for learning
2. **Layout components** - Used everywhere, high impact
3. **Simple components** - Build BEM patterns
4. **Complex pages** - Apply learned patterns
5. **Most complex** - Invoice editor, auth flows

### Phase Order

| Phase | Target | Complexity | Files |
|-------|--------|------------|-------|
| A | Static pages | Low | ~5 pages |
| B | Layout components | Medium | Header, Footer, Navigation |
| C | Shared components | Medium | Buttons, Cards, Forms |
| D | About section | Medium | ~7 sub-pages |
| E | Home page | Medium-High | Hero, Features, Technologies |
| F | Auth pages | Medium | Sign-in, Sign-up |
| G | Domains pages | High | Invoice listing |
| H | Invoice editor | Very High | Form-heavy, complex state |

---

## Phase A: Static Pages

### Task A.1: Migrate Privacy Policy Page

**Files:**
- Create: `src/app/privacy-policy/page.module.scss`
- Modify: `src/app/privacy-policy/island.tsx`

**Step 1: Analyze current Tailwind classes**

Run analysis on `island.tsx`:
```bash
# Extract all className values
grep -o 'className="[^"]*"' src/app/privacy-policy/island.tsx
```

Document all classes found (example):
```
container mx-auto max-w-4xl px-4 py-16
text-4xl font-bold mb-8
text-lg text-gray-600 dark:text-gray-300 mb-12
space-y-8
text-2xl font-semibold mb-4
text-gray-700 dark:text-gray-200
```

**Step 2: Create SCSS module**

Create `src/app/privacy-policy/page.module.scss`:
```scss
@use '../../styles/abstracts' as *;

.page {
  @include container(64rem); // max-w-4xl = 56rem, adding padding
  padding-top: space(16);
  padding-bottom: space(16);
}

.title {
  font-size: font-size('4xl');
  font-weight: font-weight('bold');
  margin-bottom: space(8);
}

.subtitle {
  font-size: font-size('lg');
  color: hsl(var(--muted-foreground));
  margin-bottom: space(12);
}

.content {
  display: flex;
  flex-direction: column;
  gap: space(8);
}

.sectionTitle {
  font-size: font-size('2xl');
  font-weight: font-weight('semibold');
  margin-bottom: space(4);
}

.sectionText {
  color: hsl(var(--foreground));
  line-height: line-height('relaxed');
}
```

**Step 3: Update island.tsx**

```tsx
import styles from './page.module.scss';

export default function PrivacyPolicyIsland() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Privacy Policy</h1>
      <p className={styles.subtitle}>Last updated: ...</p>
      <div className={styles.content}>
        <section>
          <h2 className={styles.sectionTitle}>Section Title</h2>
          <p className={styles.sectionText}>Content...</p>
        </section>
      </div>
    </div>
  );
}
```

**Step 4: Test**

- [ ] Desktop layout correct
- [ ] Mobile layout correct (check all 8 breakpoints)
- [ ] Light mode appearance correct
- [ ] Dark mode appearance correct
- [ ] Text readable in both modes
- [ ] Spacing matches original

**Step 5: Commit**

```bash
git add src/app/privacy-policy/
git commit -m "refactor: migrate privacy-policy page to SCSS modules"
```

---

### Task A.2: Migrate Terms of Service Page

**Files:**
- Create: `src/app/terms-of-service/page.module.scss`
- Modify: `src/app/terms-of-service/island.tsx`

Follow same pattern as Task A.1.

---

### Task A.3: Migrate Acknowledgements Page

**Files:**
- Create: `src/app/acknowledgements/page.module.scss`
- Modify: `src/app/acknowledgements/island.tsx`

Follow same pattern as Task A.1.

---

## Phase B: Layout Components

### Task B.1: Migrate Header Component

**Files:**
- Create: `src/styles/components/_header.scss`
- Modify: `src/components/Header.tsx`

**Step 1: Analyze Header.tsx classes**

Current patterns likely include:
```
navbar (DaisyUI)
navbar-start, navbar-center, navbar-end (DaisyUI)
flex items-center gap-4
hidden lg:flex
2xsm:fixed 2xsm:top-0 2xsm:z-50
bg-background border-b border-border
```

**Step 2: Create component SCSS**

```scss
// src/styles/components/_header.scss
@use '../abstracts' as *;

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: space(3) space(4);
  background-color: hsl(var(--background));
  border-bottom: 1px solid hsl(var(--border));

  // Mobile: fixed positioning
  @include respond-below('lg') {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: z('fixed');
  }

  @include respond-to('lg') {
    position: relative;
    padding: space(4) space(8);
  }

  &__start {
    display: flex;
    align-items: center;
    gap: space(4);
  }

  &__center {
    display: none;

    @include respond-to('lg') {
      display: flex;
      align-items: center;
      gap: space(6);
    }
  }

  &__end {
    display: flex;
    align-items: center;
    gap: space(2);
  }

  &__brand {
    display: flex;
    align-items: center;
    gap: space(2);
    font-weight: font-weight('semibold');
    font-size: font-size('lg');
  }

  &__menu-toggle {
    display: flex;
    padding: space(2);

    @include respond-to('lg') {
      display: none;
    }
  }
}
```

**Step 3: Update components/_index.scss**

```scss
@forward 'header';
```

**Step 4: Update Header.tsx**

Replace Tailwind classes with BEM classes:
```tsx
<header className="header">
  <div className="header__start">
    <Link className="header__brand" href="/">
      arolariu.ro
    </Link>
  </div>
  <nav className="header__center">
    {/* Navigation links */}
  </nav>
  <div className="header__end">
    {/* Theme toggle, user menu */}
  </div>
</header>
```

**Step 5: Test**

- [ ] Logo displays correctly
- [ ] Navigation links visible on desktop
- [ ] Navigation hidden on mobile
- [ ] Mobile menu toggle visible on mobile
- [ ] Fixed positioning on mobile works
- [ ] Dark mode styling correct
- [ ] All interactive elements clickable

**Step 6: Commit**

```bash
git add src/styles/components/_header.scss src/components/Header.tsx
git commit -m "refactor: migrate Header component to SCSS (BEM)"
```

---

### Task B.2: Migrate Footer Component

**Files:**
- Create: `src/styles/components/_footer.scss`
- Modify: `src/components/Footer.tsx`

**Step 1: Create component SCSS**

```scss
// src/styles/components/_footer.scss
@use '../abstracts' as *;

.footer {
  background-color: hsl(var(--footer-bg));
  color: static-color('white');
  padding: space(12) space(4);

  @include respond-to('lg') {
    padding: space(16) space(8);
  }

  &__container {
    @include container;
  }

  &__grid {
    @include grid(1, space(8));

    @include respond-to('md') {
      @include grid(2, space(8));
    }

    @include respond-to('lg') {
      @include grid(4, space(8));
    }
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: space(4);
  }

  &__title {
    font-size: font-size('lg');
    font-weight: font-weight('semibold');
  }

  &__links {
    display: flex;
    flex-direction: column;
    gap: space(2);
  }

  &__link {
    color: rgba(255, 255, 255, 0.8);
    font-size: font-size('sm');
    @include transition(color);

    &:hover {
      color: static-color('white');
    }
  }

  &__bottom {
    margin-top: space(12);
    padding-top: space(8);
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    text-align: center;
    font-size: font-size('sm');
  }
}
```

**Step 2: Update Footer.tsx and commit**

Follow same testing pattern as Header.

---

### Task B.3: Migrate Navigation Component

**Files:**
- Create: `src/styles/components/_navigation.scss`
- Modify: `src/components/Navigation.tsx`

Focus on:
- Nav link styles
- Dropdown menus
- Active state indicators
- Mobile menu slide-in

---

## Phase C: Shared Components

### Task C.1: Create Button Component Styles

**Files:**
- Create: `src/styles/components/_buttons.scss`

**Note:** Most buttons come from @arolariu/components (Tailwind). Only create SCSS for custom buttons not in the component library.

```scss
// src/styles/components/_buttons.scss
@use '../abstracts' as *;

// Custom button styles (NOT for @arolariu/components buttons)
.btn-gradient {
  @include gradient-bg;
  color: static-color('white');
  padding: space(2) space(4);
  border-radius: radius('md');
  font-weight: font-weight('medium');
  @include transition(opacity, transform);
  @include focus-ring;

  &:hover {
    opacity: 0.9;
  }

  &:active {
    transform: scale(0.98);
  }
}

.btn-outline-gradient {
  position: relative;
  background: transparent;
  color: hsl(var(--foreground));
  padding: space(2) space(4);
  border-radius: radius('md');
  font-weight: font-weight('medium');
  @include focus-ring;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: radius('md');
    padding: 2px;
    @include gradient-bg;
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
  }
}
```

---

### Task C.2: Create Card Component Styles

**Files:**
- Create: `src/styles/components/_cards.scss`

```scss
// src/styles/components/_cards.scss
@use '../abstracts' as *;

.card {
  border-radius: radius('xl');
  border: 1px solid hsl(var(--border));
  background-color: hsl(var(--card));
  color: hsl(var(--card-foreground));
  @include shadow('md');
  overflow: hidden;

  &__header {
    display: flex;
    flex-direction: column;
    gap: space(1.5);
    padding: space(6);
  }

  &__title {
    font-size: font-size('2xl');
    font-weight: font-weight('semibold');
    line-height: 1;
    letter-spacing: letter-spacing('tight');
  }

  &__description {
    font-size: font-size('sm');
    color: hsl(var(--muted-foreground));
  }

  &__content {
    padding: space(6);
    padding-top: 0;
  }

  &__footer {
    display: flex;
    align-items: center;
    padding: space(6);
    padding-top: 0;
  }

  // Modifiers
  &--interactive {
    @include transition(border-color, box-shadow, transform);
    cursor: pointer;

    &:hover {
      border-color: hsl(var(--primary) / 0.3);
      @include shadow('xl');
    }
  }

  &--elevated {
    @include shadow('lg');
    border: none;

    &:hover {
      @include shadow('xl');
      transform: translateY(-2px);
    }
  }

  &--gradient-overlay {
    position: relative;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      @include gradient-bg(to bottom right);
      opacity: 0;
      @include transition(opacity);
      pointer-events: none;
    }

    &:hover::before {
      opacity: 0.1;
    }
  }
}
```

---

## Phase D-H: Remaining Pages

### Task D.1 - D.7: About Section Pages

Migrate each sub-page:
- About main page
- The Author
- Mission & Values
- Technologies used
- etc.

### Task E.1 - E.3: Home Page

Migrate:
- Hero section
- Features section
- Technologies section

### Task F.1 - F.2: Auth Pages

Migrate:
- Sign-in island
- Sign-up island

### Task G.1 - G.3: Domains Pages

Migrate:
- Domains listing
- Invoice listing
- Invoice detail view

### Task H.1 - H.5: Invoice Editor

Most complex - migrate last:
- Form layout
- Input styling
- Item list
- Summary calculations
- Action buttons

---

## Post-Migration Cleanup

### Task Z.1: Remove Tailwind from Main Site

**Prerequisites:** ALL pages migrated and tested

**Files:**
- Modify: `sites/arolariu.ro/package.json`
- Modify: `sites/arolariu.ro/tailwind.config.ts`
- Modify: `sites/arolariu.ro/postcss.config.js`
- Modify: `sites/arolariu.ro/src/app/globals.css`

**Step 1: Verify no Tailwind classes remain in src/**

Run:
```bash
# Search for any remaining Tailwind patterns
grep -r "className=" sites/arolariu.ro/src --include="*.tsx" | grep -E "(flex|grid|p-|m-|text-|bg-|w-|h-)" | head -50
```

Expected: Only classes from @arolariu/components or SCSS class names

**Step 2: Keep Tailwind for @arolariu/components compatibility**

The component library still uses Tailwind. We have options:
1. **Keep Tailwind minimal** - Only what components need
2. **Remove completely** - Rely on component library's bundled CSS

Recommended: Option 1 - Keep Tailwind config but remove unused plugins

**Step 3: Clean up globals.css**

Keep:
- CSS variable definitions (needed by both SCSS and components)
- Dark mode variable overrides
- Any custom @layer rules

Remove:
- @tailwind directives (if removing Tailwind completely)
- Unused utility classes

**Step 4: Update package.json**

If removing Tailwind completely:
```bash
npm uninstall tailwindcss @tailwindcss/typography tailwindcss-animate
```

If keeping minimal:
```bash
# Keep these for component library compatibility
# tailwindcss, @tailwindcss/postcss
```

**Step 5: Final verification**

Run:
```bash
npm run build:website
npm run test:website
npm run dev:website
```

Test:
- [ ] All pages render correctly
- [ ] Dark mode works
- [ ] Gradient theming works
- [ ] Font switching works
- [ ] All responsive breakpoints work
- [ ] @arolariu/components still work

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: clean up Tailwind configuration post-migration"
```

---

## Tailwind → SCSS Mapping Reference

### Spacing

| Tailwind | SCSS |
|----------|------|
| `p-4` | `padding: space(4)` |
| `px-4` | `padding-left: space(4); padding-right: space(4)` |
| `py-4` | `padding-top: space(4); padding-bottom: space(4)` |
| `m-4` | `margin: space(4)` |
| `mx-auto` | `margin-left: auto; margin-right: auto` |
| `gap-4` | `gap: space(4)` |

### Layout

| Tailwind | SCSS |
|----------|------|
| `flex` | `display: flex` or `@include flex` |
| `flex-col` | `@include flex-column` |
| `items-center` | `align-items: center` |
| `justify-between` | `justify-content: space-between` |
| `grid grid-cols-3` | `@include grid(3)` |

### Responsive

| Tailwind | SCSS |
|----------|------|
| `md:flex` | `@include respond-to('md') { display: flex; }` |
| `lg:grid-cols-3` | `@include respond-to('lg') { @include grid(3); }` |
| `2xsm:hidden` | `@include respond-to('2xsm') { display: none; }` |

### Colors

| Tailwind | SCSS |
|----------|------|
| `text-primary` | `color: hsl(var(--primary))` |
| `bg-background` | `background-color: hsl(var(--background))` |
| `border-border` | `border-color: hsl(var(--border))` |
| `text-muted-foreground` | `color: hsl(var(--muted-foreground))` |

### Dark Mode

| Tailwind | SCSS |
|----------|------|
| `dark:bg-black` | Use CSS variables (auto-switch) or `@include dark { }` |
| `dark:text-white` | `color: hsl(var(--foreground))` (auto-switches) |

### Typography

| Tailwind | SCSS |
|----------|------|
| `text-sm` | `font-size: font-size('sm')` |
| `text-2xl` | `font-size: font-size('2xl')` |
| `font-semibold` | `font-weight: font-weight('semibold')` |
| `leading-relaxed` | `line-height: line-height('relaxed')` |

### Effects

| Tailwind | SCSS |
|----------|------|
| `shadow-md` | `@include shadow('md')` |
| `rounded-lg` | `border-radius: radius('lg')` |
| `transition-colors` | `@include transition(color, background-color)` |

---

## Gotchas & Common Mistakes

### 1. Forgetting Dark Mode

**Wrong:**
```scss
.element {
  background: white;
  color: black;
}
```

**Correct:**
```scss
.element {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}
```

### 2. Hardcoding Breakpoints

**Wrong:**
```scss
@media (min-width: 768px) { }
```

**Correct:**
```scss
@include respond-to('md') { }
```

### 3. Missing Hover/Focus States

**Wrong:**
```scss
.link {
  color: hsl(var(--primary));
}
```

**Correct:**
```scss
.link {
  color: hsl(var(--primary));
  @include transition(color, opacity);
  @include focus-ring;

  &:hover {
    opacity: 0.8;
  }
}
```

### 4. Not Using CSS Variables for Theme Colors

**Wrong:**
```scss
.card {
  background: #ffffff;
}
```

**Correct:**
```scss
.card {
  background: hsl(var(--card));
}
```

### 5. Breaking @arolariu/components

The component library uses Tailwind. If you override its styles, use high specificity:

**Wrong:**
```scss
.button {
  // This might conflict with component library
}
```

**Correct:**
```scss
.custom-button {
  // Unique class name, won't conflict
}

// Or use specificity
.my-page .button {
  // Scoped override
}
```

### 6. Forgetting Mobile-First

**Wrong:**
```scss
.grid {
  @include grid(3);

  @include respond-below('md') {
    @include grid(1);
  }
}
```

**Correct (mobile-first):**
```scss
.grid {
  @include grid(1); // Mobile default

  @include respond-to('md') {
    @include grid(2);
  }

  @include respond-to('lg') {
    @include grid(3);
  }
}
```

---

## Testing Checklist (Per Component)

For each migrated component, verify:

### Visual
- [ ] Matches original appearance pixel-perfect
- [ ] Correct at all breakpoints (2xsm, xsm, sm, md, lg, xl, 2xl, 3xl)
- [ ] Light mode correct
- [ ] Dark mode correct
- [ ] Gradient theme applied correctly

### Interactive
- [ ] Hover states work
- [ ] Focus states work (keyboard navigation)
- [ ] Active/pressed states work
- [ ] Disabled states work (if applicable)
- [ ] Animations smooth

### Accessibility
- [ ] Focus visible ring present
- [ ] Color contrast sufficient
- [ ] Screen reader friendly

### Integration
- [ ] No console errors
- [ ] No hydration mismatches
- [ ] Works with @arolariu/components
- [ ] No CSS specificity conflicts

---

## Summary

### Migration Phases

1. **Phase A**: Static pages (Privacy, Terms, Acknowledgements)
2. **Phase B**: Layout components (Header, Footer, Navigation)
3. **Phase C**: Shared components (Buttons, Cards)
4. **Phase D**: About section
5. **Phase E**: Home page
6. **Phase F**: Auth pages
7. **Phase G**: Domains pages
8. **Phase H**: Invoice editor
9. **Phase Z**: Cleanup

### Estimated Migration Scope

| Category | Files | Effort |
|----------|-------|--------|
| Static pages | ~5 | Low |
| Layout components | ~3 | Medium |
| Shared components | ~5 | Medium |
| About section | ~7 | Medium |
| Home page | ~3 | Medium-High |
| Auth pages | ~2 | Medium |
| Domains pages | ~5 | High |
| Invoice editor | ~10 | Very High |
| **Total** | **~40** | **Significant** |

### Success Criteria

- [ ] All pages migrated to SCSS
- [ ] No visual regressions
- [ ] Dark mode works everywhere
- [ ] Responsive design preserved
- [ ] @arolariu/components still functional
- [ ] Build size not significantly increased
- [ ] No runtime errors
