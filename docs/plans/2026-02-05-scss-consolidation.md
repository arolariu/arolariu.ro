# SCSS System Consolidation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate the SCSS system to achieve consistency, remove dead code, add missing utilities, and establish patterns that make the system robust, extendable, and performant.

**Architecture:** Clean up unused code, standardize hardcoded values to use SCSS functions, add missing utility mixins, and ensure all module files follow RFC 1008 patterns.

**Tech Stack:** SCSS (Dart Sass), CSS Modules, CSS Variables, 7-1 Pattern

---

## Analysis Summary

Based on thorough codebase analysis, the following issues were identified:

### Current State
- **39 SCSS module files** across the app
- **34 files fully compliant** (87%)
- **5 files with issues** (Hero, Features, Technologies, Auth, EnhancedLegalArticles)

### Issues Found
1. **6 unused functions** in `_functions.scss` (dead code)
2. **7 unused mixins** in `_mixins.scss` (dead code)
3. **40+ hardcoded hex/rgb colors** that should use CSS variables
4. **15+ hardcoded pixel values** that should use `space()` function
5. **6 hardcoded font sizes** that should use `font-size()` function
6. **Empty utilities folder** (placeholder files with no content)
7. **Missing utility mixins** for common patterns (orbs, icon sizes, drop shadows)

---

## Phase 1: Remove Dead Code

### Task 1: Remove Unused Functions from _functions.scss

**Files:**
- Modify: `sites/arolariu.ro/src/styles/abstracts/_functions.scss`

**Step 1: Read current file**

Verify the unused functions: `rem()`, `em()`, `strip-unit()`, `map-deep-get()`, `list-contains()`, `str-replace()`

**Step 2: Remove unused functions**

Keep only the file header and any actually used functions. The file should become minimal or empty (forwarding only).

**Step 3: Verify file compiles**

Run: `cd sites/arolariu.ro && npm run build`
Expected: Build succeeds without SCSS errors

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_functions.scss
git commit -m "refactor(scss): remove unused functions from abstracts

- Remove rem(), em(), strip-unit() - not used in codebase
- Remove map-deep-get(), list-contains(), str-replace() - dead code
- Keeps file structure for future additions

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Remove Unused Mixins from _mixins.scss

**Files:**
- Modify: `sites/arolariu.ro/src/styles/abstracts/_mixins.scss`

**Step 1: Identify unused mixins**

Unused mixins to remove:
- `flex()` - generic version (keep shortcuts: `flex-center`, `flex-between`, `flex-column`, `flex-column-center`)
- `grid()` - not used
- `grid-auto-fit()` - not used
- `grid-auto-fill()` - not used
- `hover-lift()` - not used
- `line-clamp()` - not used
- `visually-hidden()` - not used

**Step 2: Remove the unused mixins**

Keep all actively used mixins:
- `respond-to()`, `respond-below()`, `respond-between()` - responsive
- `flex-center`, `flex-between`, `flex-column`, `flex-column-center` - flexbox shortcuts
- `shadow()` - shadows
- `transition()` - transitions
- `gradient-text`, `gradient-bg` - gradients
- `truncate` - text truncation
- `container()` - container
- `focus-ring` - accessibility
- `dark` - dark mode

**Step 3: Verify build**

Run: `cd sites/arolariu.ro && npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_mixins.scss
git commit -m "refactor(scss): remove unused mixins from abstracts

- Remove flex() generic mixin (keep flex-center, flex-between, flex-column)
- Remove grid(), grid-auto-fit(), grid-auto-fill() - not used
- Remove hover-lift(), line-clamp(), visually-hidden() - not used
- Reduces bundle size and improves maintainability

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Remove Empty Utilities Folder

**Files:**
- Delete or simplify: `sites/arolariu.ro/src/styles/utilities/`

**Step 1: Verify utilities are empty**

Check that `_spacing.scss`, `_layout.scss`, `_display.scss`, `_colors.scss`, `_sizing.scss` are empty placeholders.

**Step 2: Remove empty files but keep _index.scss**

Keep the folder structure for future use but remove empty files, or comment out the imports in `_index.scss`.

**Step 3: Update main.scss if needed**

Ensure `@use 'utilities';` is commented out (it already should be).

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/styles/utilities/
git commit -m "refactor(scss): clean up empty utility placeholders

- Remove empty placeholder content from utilities folder
- Keep folder structure for future utility additions
- Clarifies that utilities are optional during Tailwind migration

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: Add Missing Utility Mixins

### Task 4: Add Orb/Blob Background Mixin

**Files:**
- Modify: `sites/arolariu.ro/src/styles/abstracts/_mixins.scss`

**Step 1: Add the orb mixin**

Add after the visual effects section:

```scss
// ===========================================
// DECORATIVE ELEMENTS
// ===========================================

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
```

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npm run build`

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_mixins.scss
git commit -m "feat(scss): add orb/blob decorative mixin

- New @mixin orb() for animated background orbs
- Supports customizable size, blur, and color
- Reduces repetition in Hero, Auth, Timeline components

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Add Image Drop Shadow Mixin

**Files:**
- Modify: `sites/arolariu.ro/src/styles/abstracts/_mixins.scss`

**Step 1: Add the drop shadow mixin**

Add to visual effects section:

```scss
// Image drop shadow (for illustrations/photos)
// Usage: @include image-drop-shadow
@mixin image-drop-shadow {
  filter: drop-shadow(0 10px 8px rgba(0, 0, 0, 0.04)) drop-shadow(0 4px 3px rgba(0, 0, 0, 0.1));
}
```

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npm run build`

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_mixins.scss
git commit -m "feat(scss): add image-drop-shadow mixin

- New @mixin image-drop-shadow for consistent image shadows
- Matches design system shadow pattern
- Used in Auth and similar illustration components

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Add Reduced Motion Mixin

**Files:**
- Modify: `sites/arolariu.ro/src/styles/abstracts/_mixins.scss`

**Step 1: Add accessibility mixin**

Add to utility mixins section:

```scss
// Reduced motion media query wrapper (accessibility)
// Usage: @include reduced-motion { animation: none; }
@mixin reduced-motion {
  @media (prefers-reduced-motion: reduce) {
    @content;
  }
}
```

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npm run build`

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_mixins.scss
git commit -m "feat(scss): add reduced-motion accessibility mixin

- New @mixin reduced-motion for prefers-reduced-motion support
- Improves accessibility for users with motion sensitivity
- Follows WCAG 2.1 guidelines

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 3: Standardize Hardcoded Values in Module Files

### Task 7: Fix Hero.module.scss Hardcoded Values

**Files:**
- Modify: `sites/arolariu.ro/src/app/_components/Hero.module.scss`

**Step 1: Replace hardcoded font-size**

Find line with `6rem` and replace with appropriate value or keep if intentional for design.

**Step 2: Replace hardcoded rgb colors with CSS variables**

- `rgb(107, 114, 128)` → `hsl(var(--muted-foreground))`
- `rgb(31, 41, 55)` → `hsl(var(--border))`
- `color: white` → `color: hsl(var(--foreground))` or keep for gradient overlay

**Step 3: Verify styles still work**

Run dev server and visually verify Hero component.

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/app/_components/Hero.module.scss
git commit -m "refactor(scss): standardize Hero component values

- Replace hardcoded rgb() colors with CSS variables
- Improves theme consistency and maintainability
- Follows RFC 1008 color guidelines

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 8: Fix Features.module.scss Hardcoded Values

**Files:**
- Modify: `sites/arolariu.ro/src/app/_components/Features.module.scss`

**Step 1: Replace hardcoded colors**

- `rgb(107, 114, 128)` → `hsl(var(--muted-foreground))`
- `rgb(31, 41, 55)` → `hsl(var(--border))`
- Hardcoded shadows → use `@include shadow()` mixin

**Step 2: Replace hardcoded font-size**

- `1rem` → `font-size('base')`

**Step 3: Verify build and visual appearance**

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/app/_components/Features.module.scss
git commit -m "refactor(scss): standardize Features component values

- Replace hardcoded colors with CSS variables
- Replace hardcoded font-size with font-size() function
- Use shadow() mixin for box-shadow values

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 9: Fix Technologies.module.scss Hardcoded Values

**Files:**
- Modify: `sites/arolariu.ro/src/app/_components/Technologies.module.scss`

**Step 1: Replace hardcoded colors**

Note: The gradient colors for light/dark mode may need to stay as-is if they're intentional design choices that don't map to CSS variables.

- Replace `1rem` → `font-size('base')`
- Consider if gradient colors can use existing variables

**Step 2: Verify build**

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/app/_components/Technologies.module.scss
git commit -m "refactor(scss): standardize Technologies component values

- Replace hardcoded font-size with font-size() function
- Document intentional gradient color choices
- Maintains theme-aware background gradients

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 10: Fix Auth.module.scss Hardcoded Values

**Files:**
- Modify: `sites/arolariu.ro/src/app/auth/Auth.module.scss`

**Step 1: Replace hardcoded shadows**

- Replace inline `0 25px 50px -12px rgba(0, 0, 0, 0.25)` with `@include shadow('2xl')`
- Replace drop-shadow filters with `@include image-drop-shadow`

**Step 2: Replace hardcoded font-sizes**

- Multiple `1rem` → `font-size('base')`

**Step 3: Replace hardcoded spacing**

- `0.375rem` → `space(1.5)` or closest match

**Step 4: Verify build and visual appearance**

**Step 5: Commit**

```bash
git add sites/arolariu.ro/src/app/auth/Auth.module.scss
git commit -m "refactor(scss): standardize Auth component values

- Replace hardcoded shadows with shadow() mixin
- Replace hardcoded font-sizes with font-size() function
- Replace hardcoded spacing with space() function
- Use image-drop-shadow mixin for illustrations

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 4: Final Validation

### Task 11: Run Full Build Verification

**Step 1: Run build**

Run: `cd sites/arolariu.ro && npm run build`
Expected: Build completes without SCSS errors

**Step 2: Check for SCSS warnings**

Run: `npm run build 2>&1 | grep -i "scss\|sass\|deprecat"`
Expected: No SCSS-related warnings or errors

**Step 3: Run lint**

Run: `cd sites/arolariu.ro && npm run lint`
Expected: No new lint errors

---

### Task 12: Update RFC 1008 with New Mixins

**Files:**
- Modify: `docs/rfc/1008-scss-system-architecture.md`

**Step 1: Add new mixins to Section 4 (Mixins API)**

Add documentation for:
- `@mixin orb($size, $blur, $color)`
- `@mixin image-drop-shadow`
- `@mixin reduced-motion`

**Step 2: Update Section 4.5 to reflect removed mixins**

Note which mixins were removed as unused.

**Step 3: Commit**

```bash
git add docs/rfc/1008-scss-system-architecture.md
git commit -m "docs: update RFC 1008 with new mixins and cleanup

- Document new orb(), image-drop-shadow, reduced-motion mixins
- Note removed unused mixins (grid, hover-lift, etc.)
- Reflects current state of SCSS infrastructure

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 13: Final Commit Summary

**Step 1: Verify all commits**

Run: `git log --oneline -10`
Expected: Shows all consolidation commits

**Step 2: Summary of changes**

The SCSS system is now:
- ✅ Free of dead code (unused functions/mixins removed)
- ✅ Consistent with CSS variables for colors
- ✅ Using SCSS functions for spacing, typography, shadows
- ✅ Documented with new utility mixins
- ✅ Build-verified working

---

## Summary

**Removed:**
- 6 unused functions from `_functions.scss`
- 7 unused mixins from `_mixins.scss`
- Empty placeholder files from utilities folder

**Added:**
- `@mixin orb()` for decorative background elements
- `@mixin image-drop-shadow` for illustration shadows
- `@mixin reduced-motion` for accessibility

**Standardized:**
- Hero.module.scss - CSS variables, font-size functions
- Features.module.scss - CSS variables, shadow mixin
- Technologies.module.scss - font-size functions
- Auth.module.scss - shadows, spacing, typography functions

**Updated:**
- RFC 1008 with new mixins and removed items

**Out of Scope (Future Work):**
- Migration of `/domains` route (78 components)
- Migration of `/my-profile` route (11 components)
- Creating color token system for gradient colors
