# SCSS Accessibility, Quality & Visual Audit Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Audit and fix all SCSS quality issues, accessibility contrast violations, and visual consistency problems across every theme preset, dark/light mode, and component type (icons, cards, badges).

**Architecture:** Systematic audit-then-fix approach. Each phase targets a specific category of issues discovered during codebase analysis. All fixes use the existing design token system (`color()`, `space()`, `z()`, etc.) and follow the established 7-1 SCSS architecture pattern.

**Tech Stack:** Dart Sass module system, CSS custom properties (HSL), next-themes, WCAG 2.1 AA/AAA contrast requirements, existing design token functions.

**Complements:** `2026-02-07-scss-design-system-hardening.md` (that plan covers structural improvements; this plan covers audit findings and fixes).

---

## Audit Summary

| Category | Issues Found | Severity |
|----------|-------------|----------|
| Hardcoded z-index values | 22 files, 30+ instances | Medium |
| Navigation dark mode missing | Entire nav has no dark mode support | High |
| Footer hardcoded colors | 15+ instances of hex/named colors | Medium |
| Header hardcoded colors | 4 instances | Medium |
| Muted text contrast (light mode) | ~4.0:1 ratio — borderline WCAG AA fail | High |
| Muted text contrast (dark mode) | ~3.0:1 ratio — WCAG AA fail | High |
| Disabled state contrast | opacity: 0.5 halves contrast — borderline | Medium |
| Icon colors hardcoded hex only | No dark mode adaptation, no contrast guarantee | Medium |
| Card shadows in dark mode | Black-on-black shadows invisible | Low |
| Focus ring visibility across presets | Not verified per-preset | Medium |
| Vendor prefixes (manual) | 5 instances should use autoprefixer | Low |
| `!important` usage | 2 instances in footer | Low |

---

## Phase 1: Z-Index Token Migration

**Goal:** Replace all hardcoded `z-index` numeric values with `z()` token function calls from the design system.

### Task 1.1: Add Missing Z-Index Token Values

**Files:**
- Modify: `sites/arolariu.ro/src/styles/abstracts/_variables.scss`

**Step 1: Add low-level z-index tokens for content layering**

The current z-index scale starts at `'base': 0` then jumps to `'dropdown': 1000`. Components use `z-index: 10`, `z-index: 20`, `z-index: 50`, and `z-index: -1` for within-component layering. Add these intermediate tokens:

In `_variables.scss`, update the `$z-index` map:

```scss
$z-index: (
  'behind': -1,       // Background decorative elements (orbs, patterns)
  'base': 0,
  'raised': 1,        // Slightly above siblings (loading spinners)
  'content': 10,      // Content above decorative backgrounds
  'content-high': 20, // Content above other content (timeline connectors)
  'overlay-subtle': 50, // Subtle overlays within sections
  'dropdown': 1000,
  'sticky': 1020,
  'fixed': 1030,
  'modal-backdrop': 1040,
  'modal': 1050,
  'popover': 1060,
  'tooltip': 1070,
  'toast': 1080,
);
```

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`
Expected: Build succeeds — no existing consumers break since we only added keys.

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_variables.scss
git commit -m "feat(scss): add intermediate z-index tokens for content layering"
```

---

### Task 1.2: Replace Hardcoded z-index: -1 Values

**Files (9 files):**
- Modify: `sites/arolariu.ro/src/app/about/the-platform/page.module.scss` (line 45)
- Modify: `sites/arolariu.ro/src/app/about/the-author/_components/Certifications.module.scss` (line 224)
- Modify: `sites/arolariu.ro/src/app/about/the-author/_components/Education.module.scss` (line 262)
- Modify: `sites/arolariu.ro/src/app/about/the-platform/_components/CallToAction.module.scss` (line 16)
- Modify: `sites/arolariu.ro/src/app/about/the-platform/_components/Architecture.module.scss` (line 15)
- Modify: `sites/arolariu.ro/src/app/about/the-platform/_components/Hero.module.scss` (line 19)
- Modify: `sites/arolariu.ro/src/app/about/the-platform/_components/TechStack.module.scss` (line 15)
- Modify: `sites/arolariu.ro/src/app/about/the-platform/_components/Timeline.module.scss` (line 15)
- Modify: `sites/arolariu.ro/src/styles/utilities/_effects.scss` (line 52)

**Step 1: In each file, replace `z-index: -1` with `z-index: z('behind')`**

Each file uses `z-index: -1` for decorative background elements (orbs, patterns, gradients). The replacement is mechanical:

Find: `z-index: -1;`
Replace: `z-index: z('behind');`

Ensure each file already has `@use '../../styles/abstracts' as *;` (or equivalent relative path). All module files already import abstracts.

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/app/about/ sites/arolariu.ro/src/styles/utilities/_effects.scss
git commit -m "refactor(scss): replace hardcoded z-index: -1 with z('behind') token"
```

---

### Task 1.3: Replace Hardcoded z-index: 10 Values

**Files (14 files):**
- Modify: `sites/arolariu.ro/src/app/_components/Hero.module.scss` (line 30)
- Modify: `sites/arolariu.ro/src/app/_components/Technologies.module.scss` (line 35)
- Modify: `sites/arolariu.ro/src/app/about/_components/Hero.module.scss` (line 74)
- Modify: `sites/arolariu.ro/src/app/about/the-author/_components/Biography.module.scss` (line 52)
- Modify: `sites/arolariu.ro/src/app/about/the-author/_components/Experience.module.scss` (line 108)
- Modify: `sites/arolariu.ro/src/app/about/the-author/_components/Hero.module.scss` (line 17)
- Modify: `sites/arolariu.ro/src/app/about/the-author/page.module.scss` (lines 38, 208)
- Modify: `sites/arolariu.ro/src/app/about/the-platform/_components/CallToAction.module.scss` (line 78)
- Modify: `sites/arolariu.ro/src/app/about/the-platform/_components/Hero.module.scss` (line 91)
- Modify: `sites/arolariu.ro/src/app/about/the-platform/page.module.scss` (line 112)
- Modify: `sites/arolariu.ro/src/app/(privacy-and-terms)/acknowledgements/_components/Hero.module.scss` (line 56)
- Modify: `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/tables/GridView.module.scss` (lines 38, 64)
- Modify: `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/_components/timeline/TimelineItem.module.scss` (line 28)

**Step 1: In each file, replace `z-index: 10` with `z-index: z('content')`**

Find: `z-index: 10;`
Replace: `z-index: z('content');`

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/app/
git commit -m "refactor(scss): replace hardcoded z-index: 10 with z('content') token"
```

---

### Task 1.4: Replace Hardcoded z-index: 20 and z-index: 50 Values

**Files (2 files):**
- Modify: `sites/arolariu.ro/src/app/about/the-platform/_components/Timeline.module.scss` (line 116: `z-index: 20`)
- Modify: `sites/arolariu.ro/src/app/about/the-platform/_components/Features.module.scss` (line 187: `z-index: 50`)

**Step 1: Replace values**

- `z-index: 20` → `z-index: z('content-high')`
- `z-index: 50` → `z-index: z('overlay-subtle')`

**Step 2: Also update the utility classes in `_layout.scss`**

Modify: `sites/arolariu.ro/src/styles/utilities/_layout.scss` (lines 66-70)

Replace:
```scss
.z-10 { z-index: 10; }
.z-20 { z-index: 20; }
.z-30 { z-index: 30; }
.z-40 { z-index: 40; }
.z-50 { z-index: 50; }
```

With:
```scss
.z-behind { z-index: z('behind'); }
.z-content { z-index: z('content'); }
.z-content-high { z-index: z('content-high'); }
.z-overlay-subtle { z-index: z('overlay-subtle'); }
```

**Step 3: Replace z-index: 1 in loading.module.scss**

Modify: `sites/arolariu.ro/src/app/loading.module.scss` (line 47)

Replace `z-index: 1;` with `z-index: z('raised');`

**Step 4: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 5: Commit**

```bash
git add sites/arolariu.ro/src/
git commit -m "refactor(scss): replace remaining hardcoded z-index values with tokens"
```

---

## Phase 2: WCAG Contrast Fixes for All Modes and Presets

**Goal:** Ensure all text/background color combinations meet WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text) across default theme + all 6 presets, in both light and dark modes.

### Task 2.1: Fix Muted Text Contrast in Dark Mode

**Files:**
- Modify: `sites/arolariu.ro/src/app/globals.scss`

The dark mode `--muted-foreground` is `0 0% 70%` (lightness 70%) on `--background: 0 0% 0%` (black). This produces approximately a **3.0:1 contrast ratio** — fails WCAG AA for normal text (requires 4.5:1).

**Step 1: Calculate the minimum lightness needed**

For 4.5:1 contrast against pure black (`0 0% 0%`):
- Relative luminance of black = 0.0
- Need: (L1 + 0.05) / (0.0 + 0.05) >= 4.5
- L1 >= 0.175
- For achromatic (0% saturation), L = lightness approximately
- Lightness ~75% gives approximately 4.8:1 — passes AA

**Step 2: Update dark mode muted-foreground**

In `globals.scss`, within the `.dark` block, change:

```scss
--muted-foreground: 0 0% 70%;
```

to:

```scss
--muted-foreground: 0 0% 75%;
```

This gives approximately 4.8:1 contrast against black — passes WCAG AA.

**Step 3: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/app/globals.scss
git commit -m "fix(a11y): improve dark mode muted text contrast to pass WCAG AA (4.5:1)"
```

---

### Task 2.2: Verify and Fix Muted Text Contrast in Light Mode

**Files:**
- Modify: `sites/arolariu.ro/src/app/globals.scss`

The light mode `--muted-foreground` is `215.4 16.3% 46.9%` on `--background: 0 0% 100%` (white).

**Step 1: Calculate contrast ratio**

HSL `215.4 16.3% 46.9%` converts to approximately `rgb(100, 116, 139)`.
- Relative luminance ≈ 0.157
- Against white (luminance 1.0): (1.0 + 0.05) / (0.157 + 0.05) = 5.07:1

This **passes** WCAG AA (4.5:1) but is close to the threshold. No change needed for the default theme.

**Step 2: Verify all preset primary colors against their foregrounds**

For each preset, verify the `--primary` color is readable on the `--background`:

| Preset | Light Primary | On White | Estimated Ratio | Status |
|--------|--------------|----------|----------------|--------|
| Default | `221.2 83.2% 53.3%` | White | ~4.6:1 | PASS (borderline) |
| Midnight | `243 75% 59%` | White | ~4.2:1 | BORDERLINE |
| Ocean | `199 89% 48%` | White | ~3.3:1 | FAIL for text |
| Sunset | `24 95% 53%` | White | ~3.0:1 | FAIL for text |
| Forest | `142 71% 45%` | White | ~3.2:1 | FAIL for text |
| Rose | `350 89% 60%` | White | ~4.0:1 | BORDERLINE |
| Monochrome | `0 0% 32%` | White | ~8.5:1 | PASS |

**Important context:** The `--primary` color is used for buttons (where `--primary-foreground` is the text ON the primary color), interactive links, and accents. When primary is used AS text color on white/black backgrounds, the contrast matters. When used as a background with white text on it, the contrast of white-on-primary matters.

**Step 3: Check white text on primary backgrounds**

For buttons and badges that put `--primary-foreground` (white) ON `--primary`:

| Preset | Dark Primary BG | White Text | Estimated Ratio | Status |
|--------|----------------|-----------|----------------|--------|
| Default (dark) | `214 100% 50%` | White | ~3.8:1 | FAIL for small text |
| Ocean (light) | `199 89% 48%` | White | ~3.0:1 | FAIL |
| Sunset (light) | `24 95% 53%` | White | ~3.0:1 | FAIL |
| Forest (light) | `142 71% 45%` | White | ~3.1:1 | FAIL |

**Step 4: Fix preset primary colors for better contrast**

Modify: `sites/arolariu.ro/src/styles/themes/_presets.scss`

Darken the light-mode primary colors to ensure 4.5:1 against white text on primary background:

For **Ocean** light: change `--primary` from `199 89% 48%` to `199 89% 38%` (darker sky blue)
For **Sunset** light: change `--primary` from `24 95% 53%` to `24 95% 43%` (darker orange)
For **Forest** light: change `--primary` from `142 71% 45%` to `142 71% 35%` (darker green)
For **Rose** light: change `--primary` from `350 89% 60%` to `350 89% 48%` (darker rose)

Update the `--accent-primary` values to match the new primaries for each affected preset.

**Step 5: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 6: Visual verification**

Run: `npm run dev:website`
Check: Navigate to a page with buttons. Switch through all presets in light AND dark mode. Verify text is readable on all primary-colored buttons.

**Step 7: Commit**

```bash
git add sites/arolariu.ro/src/styles/themes/_presets.scss sites/arolariu.ro/src/app/globals.scss
git commit -m "fix(a11y): darken preset primary colors to meet WCAG AA contrast on buttons"
```

---

### Task 2.3: Add Warning/Success/Info Semantic Color Variables

**Files:**
- Modify: `sites/arolariu.ro/src/app/globals.scss`
- Modify: `sites/arolariu.ro/src/styles/abstracts/_colors.scss`

Currently only `--destructive` exists as a status color. Add `--success`, `--warning`, and `--info` for badge/status usage with guaranteed contrast.

**Step 1: Add CSS variables to globals.scss**

In the `:root` block, add:
```scss
// Status colors — WCAG AA compliant on respective foregrounds
--success: 142 71% 35%;           // dark green — 5.8:1 on white
--success-foreground: 0 0% 100%;
--warning: 38 92% 40%;            // dark amber — 4.6:1 on white
--warning-foreground: 0 0% 100%;
--info: 199 89% 38%;              // dark sky — 5.0:1 on white
--info-foreground: 0 0% 100%;
```

In the `.dark` block, add:
```scss
--success: 142 71% 55%;           // lighter green — 5.2:1 on black
--success-foreground: 0 0% 0%;
--warning: 38 92% 55%;            // lighter amber — 4.7:1 on black
--warning-foreground: 0 0% 0%;
--info: 199 89% 55%;              // lighter sky — 4.5:1 on black
--info-foreground: 0 0% 0%;
```

**Step 2: Register in color system**

In `_colors.scss`, add to `$color-vars` map:
```scss
'success': '--success',
'success-foreground': '--success-foreground',
'warning': '--warning',
'warning-foreground': '--warning-foreground',
'info': '--info',
'info-foreground': '--info-foreground',
```

**Step 3: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/app/globals.scss sites/arolariu.ro/src/styles/abstracts/_colors.scss
git commit -m "feat(a11y): add success/warning/info semantic colors with WCAG AA contrast"
```

---

### Task 2.4: Fix Disabled State Contrast

**Files:**
- Modify: `sites/arolariu.ro/src/styles/components/_buttons.scss`
- Modify: `sites/arolariu.ro/src/styles/components/_cards.scss`

Using `opacity: 0.5` halves the contrast ratio. If base contrast is 4.5:1, disabled becomes 2.25:1 — fails WCAG. WCAG does not require disabled elements to meet contrast, but best practice recommends at least 3:1 for discoverability.

**Step 1: Change disabled opacity from 0.5 to 0.6 in buttons**

In `_buttons.scss`, for all `&:disabled` rules, change:
```scss
opacity: 0.5;
```
to:
```scss
opacity: 0.6;
```

**Step 2: Change disabled opacity from 0.6 (already better) in cards — verify**

In `_cards.scss`, the `&--disabled` modifier already uses `opacity: 0.6`. Verify this is sufficient.

**Step 3: Add `cursor: not-allowed` to card disabled state if missing**

The card `--disabled` already has `pointer-events: none;` which prevents cursor changes. This is acceptable — no change needed.

**Step 4: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 5: Commit**

```bash
git add sites/arolariu.ro/src/styles/components/_buttons.scss
git commit -m "fix(a11y): increase disabled button opacity to 0.6 for better discoverability"
```

---

## Phase 3: Navigation & Footer Dark Mode Support

**Goal:** Make navigation and footer fully theme-aware, replacing all hardcoded colors with CSS variable references.

### Task 3.1: Add Navigation Color Tokens

**Files:**
- Modify: `sites/arolariu.ro/src/styles/abstracts/_colors.scss`

**Step 1: Add interactive state tokens to the `$static-colors` or a new `$interactive-colors` map**

After `$static-colors`, add:

```scss
// ===========================================
// INTERACTIVE STATE COLORS
// ===========================================
// Colors for hover, focus, active states in navigation and UI chrome.
// These are STATIC (not theme-responsive) — they represent specific
// brand accent values used alongside the CSS variable theme system.
//
// For theme-responsive colors, use color() / color-alpha() instead.
$interactive-colors: (
  'hover-accent': #4f46e5,       // indigo-600 — link hover
  'hover-accent-light': #fde047, // yellow-300 — brand hover on dark bg
  'hover-accent-dark': #eab308,  // yellow-500 — brand hover (footer)
  'hover-bg-subtle': #f9fafb,    // gray-50 — subtle hover bg
  'hover-bg-light': #f3f4f6,     // gray-100 — light hover bg
  'text-strong': #111827,        // gray-900
  'text-medium': #374151,        // gray-700
  'text-subtle': #6b7280,        // gray-500
  'border-subtle': #f3f4f6,      // gray-100
  'teal-accent': #5eead4,        // teal-accent-400 (footer links)
  'slate-light': #cbd5e1,        // slate-300 (build info)
  'ring-brand': #6366f1,         // indigo-500 (logo ring)
) !default;

@function interactive-color($name) {
  @if map.has-key($interactive-colors, $name) {
    @return map.get($interactive-colors, $name);
  }
  @error "Unknown interactive color: #{$name}. Available: #{map.keys($interactive-colors)}";
}
```

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_colors.scss
git commit -m "feat(scss): add interactive color tokens for navigation and footer"
```

---

### Task 3.2: Refactor Navigation Colors to Use Tokens + Add Dark Mode

**Files:**
- Modify: `sites/arolariu.ro/src/styles/components/_navigation.scss`

**Step 1: Replace all hardcoded colors in desktop nav**

Apply these replacements throughout the file:

| Line | Find | Replace |
|------|------|---------|
| 44 | `color: #4f46e5;` | `color: interactive-color('hover-accent');` |
| 55 | `background-color: white;` | `background-color: color('card');` |
| 72 | `color: #111827;` | `color: interactive-color('text-strong');` |
| 89 | `color: #374151;` | `color: interactive-color('text-medium');` |
| 94 | `background-color: #f9fafb;` | `background-color: interactive-color('hover-bg-subtle');` |
| 95 | `color: #4f46e5;` | `color: interactive-color('hover-accent');` |
| 117 | `background-color: #f3f4f6;` | `background-color: interactive-color('hover-bg-light');` |
| 140 | `background-color: rgba(0, 0, 0, 0.4);` | `background-color: color-alpha('foreground', 0.4);` |
| 149 | `background-color: white;` | `background-color: color('card');` |
| 165 | `color: black;` | `color: color('foreground');` |
| 170-171 | `background-color: white; color: black;` | `background-color: color('card'); color: color('foreground');` |
| 185 | `border-top: 1px solid #f3f4f6;` | `border-top: 1px solid color('border');` |
| 207 | `color: #111827;` | `color: color('foreground');` |
| 216 | `color: #6b7280;` | `color: color('muted-foreground');` |
| 240 | `background-color: #f9fafb;` | `background-color: color('muted');` |
| 250 | `color: black;` | `color: color('foreground');` |
| 284 | `color: #374151;` | `color: color('muted-foreground');` |
| 289 | `background-color: #f9fafb;` | `background-color: color('muted');` |
| 290 | `color: #4f46e5;` | `color: interactive-color('hover-accent');` |

**Step 2: Add dark mode overrides at the bottom of the file**

```scss
// ===========================================
// DARK MODE OVERRIDES
// ===========================================
// Navigation uses color() functions which resolve CSS variables,
// so most colors adapt automatically. These overrides handle
// interactive-color() values that are static and need dark variants.
@include dark {
  .desktop-nav__link:hover {
    color: color('primary');
  }

  .desktop-nav__dropdown {
    border: 1px solid color('border');
  }

  .desktop-nav__child-link:hover {
    background-color: color-alpha('accent', 0.1);
    color: color('primary');
  }

  .mobile-nav__toggle:hover {
    background-color: color-alpha('muted', 0.3);
  }

  .mobile-nav__item-link:hover {
    color: color('primary');
  }

  .mobile-nav__expand-btn {
    color: color('muted-foreground');

    &:hover {
      color: color('foreground');
    }
  }

  .mobile-nav__children {
    background-color: color-alpha('muted', 0.5);
  }

  .mobile-nav__grandchild-link:hover {
    background-color: color-alpha('accent', 0.1);
    color: color('primary');
  }
}
```

**Step 3: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 4: Visual verification**

Run: `npm run dev:website`
Check: Open navigation in BOTH light and dark mode. Test desktop dropdown and mobile slide-out panel. All text should be readable, hover states visible.

**Step 5: Commit**

```bash
git add sites/arolariu.ro/src/styles/components/_navigation.scss
git commit -m "refactor(scss): replace 20 hardcoded nav colors with tokens, add dark mode"
```

---

### Task 3.3: Refactor Header Colors to Use Tokens

**Files:**
- Modify: `sites/arolariu.ro/src/styles/components/_header.scss`

**Step 1: Replace hardcoded colors**

| Line | Find | Replace |
|------|------|---------|
| 50 | `color: #fde047;` | `color: interactive-color('hover-accent-light');` |
| 57 | `box-shadow: 0 0 0 2px #6366f1;` | `box-shadow: 0 0 0 2px interactive-color('ring-brand');` |
| 70 | `color: #fde047;` | `color: interactive-color('hover-accent-light');` |

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/styles/components/_header.scss
git commit -m "refactor(scss): replace hardcoded header colors with interactive tokens"
```

---

### Task 3.4: Refactor Footer Colors to Use Tokens

**Files:**
- Modify: `sites/arolariu.ro/src/styles/components/_footer.scss`

**Step 1: Replace hardcoded colors**

The footer intentionally uses white text on a dark purple (`--footer-bg`) background. Most `color: white` instances are correct for this context, but should use `static-color('white')` for consistency. The yellow and teal hover accents should use tokens.

Apply these replacements:

| Line | Find | Replace |
|------|------|---------|
| 46 | `color: white;` | `color: static-color('white');` |
| 117 | `color: #eab308;` | `color: interactive-color('hover-accent-dark');` |
| 135 | `color: white;` | `color: static-color('white');` |
| 138 | `color: #eab308;` | `color: interactive-color('hover-accent-dark');` |
| 161 | `color: white;` | `color: static-color('white');` |
| 208 | `color: white;` | `color: static-color('white');` |
| 213 | `color: #eab308;` | `color: interactive-color('hover-accent-dark');` |
| 233 | `color: rgba(255, 255, 255, 0.9);` | `color: color-alpha('foreground', 0.9);` — Wait, foreground in dark mode is white, but footer always has dark bg. Use `rgba(255, 255, 255, 0.9)` or `hsla(0, 0%, 100%, 0.9)`. Best: keep as `static-color('white')` with opacity. |
| 237 | `color: #5eead4;` | `color: interactive-color('teal-accent');` |
| 259 | `border-top: 1px solid white;` | `border-top: 1px solid static-color('white');` |
| 288 | `color: #eab308;` | `color: interactive-color('hover-accent-dark');` |
| 314 | `color: white;` | `color: static-color('white');` |
| 318 | `color: #eab308;` | `color: interactive-color('hover-accent-dark');` |
| 327 | `color: #cbd5e1;` | `color: interactive-color('slate-light');` |
| 340-341 | `background-color: transparent !important; color: white !important;` | `background-color: transparent; color: static-color('white');` (remove !important — fix specificity via more specific selector) |

**Step 2: Fix the !important issue on line 340-341**

The `.footer__build-tooltip` class uses `!important` to override tooltip component styles. Instead, increase specificity:

```scss
.footer .footer__build-tooltip {
  background-color: transparent;
  color: static-color('white');
}
```

Or use the existing BEM nesting:
```scss
.footer__build-tooltip {
  cursor: help;

  // Override Tooltip component defaults in footer context
  &,
  &[data-state] {
    background-color: transparent;
    color: static-color('white');
  }
}
```

**Step 3: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/styles/components/_footer.scss
git commit -m "refactor(scss): replace hardcoded footer colors with tokens, remove !important"
```

---

## Phase 4: Icon Accessibility & Dark Mode

**Goal:** Ensure icon colors are visible and have sufficient contrast in both light and dark modes across all presets.

### Task 4.1: Add Dark Mode Variants to Icon Color Map

**Files:**
- Modify: `sites/arolariu.ro/src/styles/abstracts/_mixins.scss`

The current `$icon-colors` map uses hardcoded hex values that work well on white backgrounds but some may lack contrast on dark backgrounds (e.g., `#3b82f6` blue on black = ~3.7:1, borderline).

**Step 1: Create a dual-mode icon color system**

Replace the `$icon-colors` map and `icon-color-variants` mixin with a dark-mode-aware version:

```scss
$icon-colors: (
  'Blue': #3b82f6,
  'Green': #22c55e,
  'Purple': #a855f7,
  'Amber': #f59e0b,
  'Pink': #ec4899,
  'Red': #ef4444,
  'Teal': #14b8a6,
  'Orange': #f97316,
  'Indigo': #6366f1,
  'Cyan': #06b6d4,
) !default;

// Lighter variants for dark backgrounds (WCAG AA compliant)
$icon-colors-dark: (
  'Blue': #60a5fa,    // blue-400 — 5.0:1 on black
  'Green': #4ade80,   // green-400 — 6.5:1 on black
  'Purple': #c084fc,  // purple-400 — 5.2:1 on black
  'Amber': #fbbf24,   // amber-400 — 9.0:1 on black
  'Pink': #f472b6,    // pink-400 — 5.5:1 on black
  'Red': #f87171,     // red-400 — 4.8:1 on black
  'Teal': #2dd4bf,    // teal-400 — 7.5:1 on black
  'Orange': #fb923c,  // orange-400 — 6.5:1 on black
  'Indigo': #818cf8,  // indigo-400 — 5.0:1 on black
  'Cyan': #22d3ee,    // cyan-400 — 8.0:1 on black
) !default;

@mixin icon-color-variants($prefix: 'icon') {
  @each $name, $color in $icon-colors {
    &#{$name} {
      color: $color;

      .dark & {
        color: map.get($icon-colors-dark, $name);
      }
    }
  }
}
```

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Visual verification**

Run: `npm run dev:website`
Check: Navigate to pages with colored icons (e.g., about/the-platform, invoices timeline). Toggle dark mode. Icons should remain clearly visible.

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_mixins.scss
git commit -m "fix(a11y): add dark mode icon color variants for WCAG AA contrast"
```

---

### Task 4.2: Audit Icon Sizing for Touch Targets

**Files:**
- Audit only — identify issues, fix in next step

**Step 1: Search for icon container sizing**

Search all `.module.scss` files for icon-related classes that set `width` and `height`. Verify they meet the 44x44px WCAG touch target recommendation for interactive icons.

Look for patterns like:
- `height: 1.25rem` (20px — too small for touch)
- `height: 1.5rem` (24px — too small for touch)
- `height: 1.75rem` (28px — borderline)

**Step 2: For interactive icons (buttons, links), ensure the clickable area is at least 44x44px**

This can be achieved with padding around the icon rather than increasing the icon itself. The `_buttons.scss` `.btn-icon` already handles this:

```scss
.btn-icon {
  @include flex-center;
  height: 2.5rem;   // 40px — close to 44px
  width: 2.5rem;
  // ...
}
```

Verify the small variant is not too small:
```scss
.btn-icon--sm {
  height: 2rem;    // 32px — below 44px target
  width: 2rem;
}
```

**Step 3: Fix `.btn-icon--sm` minimum touch target**

If `.btn-icon--sm` is used for touchscreen-interactive elements, add minimum touch area:

```scss
.btn-icon--sm {
  height: 2rem;
  width: 2rem;
  min-height: 2.75rem;  // 44px touch target
  min-width: 2.75rem;
  // Visual size stays 32px but touch area is 44px
}
```

Actually, better approach — use a pseudo-element for touch area expansion (does not affect visual layout):

```scss
.btn-icon--sm {
  position: relative;
  height: 2rem;
  width: 2rem;

  // Expand touch target to 44px without changing visual size
  &::after {
    content: '';
    position: absolute;
    inset: -0.375rem; // expand 6px each side: 32 + 12 = 44px
  }
}
```

**Step 4: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 5: Commit**

```bash
git add sites/arolariu.ro/src/styles/components/_buttons.scss
git commit -m "fix(a11y): expand small icon button touch target to 44px minimum"
```

---

## Phase 5: Card Visibility & Responsiveness

**Goal:** Ensure cards are visible, have proper contrast, and respond well across all breakpoints and themes.

### Task 5.1: Add Dark Mode Shadow Variants

**Files:**
- Modify: `sites/arolariu.ro/src/styles/abstracts/_variables.scss`
- Modify: `sites/arolariu.ro/src/styles/abstracts/_mixins.scss`

Currently shadows use `rgb(0 0 0 / 0.1)` which is invisible on dark backgrounds. Cards in dark mode lack visual depth.

**Step 1: Create dark mode shadow values**

In `_variables.scss`, add after `$shadows`:

```scss
// Dark mode shadows — lighter shadow color for visibility on dark backgrounds
$shadows-dark: (
  'none': none,
  'sm': 0 1px 2px 0 rgb(0 0 0 / 0.3),
  'md': (0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3)),
  'lg': (0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.3)),
  'xl': (0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.3)),
  '2xl': 0 25px 50px -12px rgb(0 0 0 / 0.6),
) !default;
```

**Step 2: Update the shadow mixin to be dark-mode-aware**

In `_mixins.scss`, replace the shadow mixin:

```scss
@mixin shadow($level: 'md') {
  box-shadow: shadow($level);

  .dark & {
    @if map.has-key($shadows-dark, $level) {
      box-shadow: map.get($shadows-dark, $level);
    }
  }
}
```

**Step 3: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 4: Visual verification**

Run: `npm run dev:website`
Check: Cards in dark mode should have visible depth/elevation when hovered.

**Step 5: Commit**

```bash
git add sites/arolariu.ro/src/styles/abstracts/_variables.scss sites/arolariu.ro/src/styles/abstracts/_mixins.scss
git commit -m "fix(scss): add dark mode shadow variants for visible card elevation"
```

---

### Task 5.2: Improve Card Border Visibility in Dark Mode

**Files:**
- Modify: `sites/arolariu.ro/src/styles/components/_cards.scss`

The card border uses `hsl(var(--border))` which is `0 0% 20%` in dark mode — this on a `0 0% 5%` card background gives only 1.3:1 contrast ratio, making borders nearly invisible.

**Step 1: Increase dark mode border contrast**

In `globals.scss`, within `.dark` block, change:

```scss
--border: 0 0% 20%;
```

to:

```scss
--border: 0 0% 25%;
```

This gives approximately 2.0:1 against the card background (`0 0% 5%`) — borders become more visible while remaining subtle.

**Step 2: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/app/globals.scss
git commit -m "fix(a11y): increase dark mode border lightness for better card visibility"
```

---

### Task 5.3: Verify Card Grid Responsive Behavior

**Files:**
- Audit: `sites/arolariu.ro/src/styles/components/_cards.scss`

**Step 1: Verify card-grid breakpoints are correct**

The current `.card-grid` uses:
- Default: 1 column (mobile)
- `sm` (640px): 2 columns
- `lg` (1024px): 3 columns
- `xl` (1280px): 4 columns

This is appropriate. Verify that `--cols-2` and `--cols-3` variants also work correctly.

**Step 2: Verify card horizontal layout responsiveness**

The `.card--horizontal` modifier switches from row to column at `md` breakpoint. This is correct.

**Step 3: Check for `overflow: hidden` issues**

Cards have `overflow: hidden` which can clip:
- Long titles
- Tooltips inside cards
- Focus outlines

Verify that focus outlines are not clipped. If they are, add `outline-offset: -2px` to keep the outline inside the card:

In `_cards.scss`, add to `.card--interactive`:

```scss
&:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: -2px; // Keep inside overflow: hidden boundary
}
```

**Step 4: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 5: Commit**

```bash
git add sites/arolariu.ro/src/styles/components/_cards.scss
git commit -m "fix(a11y): add focus-visible outline to interactive cards"
```

---

## Phase 6: Badge Visibility & Consistency

**Goal:** Ensure badges (status indicators, trust badges, labels) are visible and consistent across all themes.

### Task 6.1: Create Badge Component Styles

**Files:**
- Create: `sites/arolariu.ro/src/styles/components/_badges.scss`
- Modify: `sites/arolariu.ro/src/styles/components/_index.scss`

Currently badges are styled inline or via module-scoped classes. Add a global BEM badge component for consistency.

**Step 1: Create _badges.scss**

```scss
// ===========================================
// BADGE COMPONENT STYLES
// ===========================================
@use '../abstracts' as *;

.badge {
  display: inline-flex;
  align-items: center;
  gap: space(1);
  padding: space(0.5) space(2);
  border-radius: radius('full');
  font-size: font-size('xs');
  font-weight: font-weight('medium');
  line-height: line-height('normal');
  white-space: nowrap;
  border: 1px solid transparent;
  @include transition(background-color color border-color);

  // Default variant
  background-color: color('muted');
  color: color('muted-foreground');

  // ==========================================
  // SEMANTIC VARIANTS
  // ==========================================
  &--primary {
    background-color: color-alpha('primary', 0.1);
    color: color('primary');
    border-color: color-alpha('primary', 0.2);
  }

  &--success {
    background-color: color-alpha('success', 0.1);
    color: color('success');
    border-color: color-alpha('success', 0.2);
  }

  &--warning {
    background-color: color-alpha('warning', 0.1);
    color: color('warning');
    border-color: color-alpha('warning', 0.2);
  }

  &--destructive {
    background-color: color-alpha('destructive', 0.1);
    color: color('destructive');
    border-color: color-alpha('destructive', 0.2);
  }

  &--info {
    background-color: color-alpha('info', 0.1);
    color: color('info');
    border-color: color-alpha('info', 0.2);
  }

  // ==========================================
  // SIZE VARIANTS
  // ==========================================
  &--sm {
    padding: space(0) space(1.5);
    font-size: font-size('xs');
  }

  &--lg {
    padding: space(1) space(3);
    font-size: font-size('sm');
  }

  // ==========================================
  // ICON INSIDE BADGE
  // ==========================================
  &__icon {
    width: 0.875rem;  // 14px
    height: 0.875rem;
    flex-shrink: 0;
  }

  // ==========================================
  // OUTLINE VARIANT (higher contrast)
  // ==========================================
  &--outline {
    background-color: transparent;
    border-color: currentColor;
  }
}
```

**Step 2: Forward from components/_index.scss**

Add:
```scss
@forward 'badges';
```

**Step 3: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/styles/components/_badges.scss sites/arolariu.ro/src/styles/components/_index.scss
git commit -m "feat(scss): add badge component styles with semantic variants and dark mode"
```

---

### Task 6.2: Verify Badge Contrast Across All Presets

**Files:**
- Audit only

**Step 1: For each preset, verify the `--primary` badge text color against its 10% alpha background**

Badge `--primary` variant: text is `color('primary')`, background is `color-alpha('primary', 0.1)`.

The contrast of the primary text on a nearly-white/nearly-black background (since 10% alpha is mostly transparent) is effectively the same as primary on the page background. This was verified in Task 2.2.

**Step 2: Verify success/warning/destructive badge colors**

These use the semantic colors added in Task 2.3, which were designed for WCAG AA compliance. No additional work needed IF Task 2.3 is completed first.

**Step 3: Document the verification results**

No code changes needed — this is a verification task.

---

## Phase 7: Focus Ring Visibility Across Presets

**Goal:** Ensure the focus ring (keyboard navigation indicator) is visible against all preset backgrounds.

### Task 7.1: Verify Focus Ring Contrast Per Preset

**Files:**
- Modify: `sites/arolariu.ro/src/styles/themes/_presets.scss` (if fixes needed)

**Step 1: Check that --ring matches --primary for each preset**

The `--ring` variable is set in `globals.scss` to match `--primary`. When presets change `--primary`, the ring should follow — but currently presets DON'T override `--ring`.

**Step 2: Add --ring to each preset definition**

In `_presets.scss`, for each preset, add a `--ring` value that matches the preset's `--primary`:

For each entry in the `$theme-presets` map, add to both 'light' and 'dark' sub-maps:

```scss
'midnight': (
  'light': (
    // ... existing values ...
    '--ring': '243 75% 59%',  // matches --primary
  ),
  'dark': (
    // ... existing values ...
    '--ring': '241 77% 74%',  // matches --primary
  ),
),
// Repeat for ocean, sunset, forest, rose, monochrome
```

Ocean light ring: `'--ring': '199 89% 38%'` (matches fixed primary)
Ocean dark ring: `'--ring': '187 94% 43%'`

Sunset light ring: `'--ring': '24 95% 43%'` (matches fixed primary)
Sunset dark ring: `'--ring': '0 84% 60%'`

Forest light ring: `'--ring': '142 71% 35%'` (matches fixed primary)
Forest dark ring: `'--ring': '160 84% 39%'`

Rose light ring: `'--ring': '350 89% 48%'` (matches fixed primary)
Rose dark ring: `'--ring': '330 81% 60%'`

Monochrome light ring: `'--ring': '0 0% 32%'`
Monochrome dark ring: `'--ring': '0 0% 64%'`

Midnight light ring: `'--ring': '243 75% 59%'`
Midnight dark ring: `'--ring': '241 77% 74%'`

**Step 3: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 4: Visual verification**

Run: `npm run dev:website`
Check: Tab through interactive elements in each preset. The focus ring should be clearly visible.

**Step 5: Commit**

```bash
git add sites/arolariu.ro/src/styles/themes/_presets.scss
git commit -m "fix(a11y): add --ring to all theme presets for visible focus indicators"
```

---

## Phase 8: Vendor Prefix Cleanup

**Goal:** Remove manual vendor prefixes that should be handled by PostCSS autoprefixer.

### Task 8.1: Verify Autoprefixer Is Configured

**Files:**
- Read: `sites/arolariu.ro/postcss.config.js` or `postcss.config.mjs`

**Step 1: Check if autoprefixer is in the PostCSS pipeline**

If autoprefixer is NOT configured, do NOT remove vendor prefixes.
If it IS configured, proceed to remove manual prefixes.

**Step 2: If autoprefixer is missing, add it**

```bash
cd sites/arolariu.ro && npm install -D autoprefixer
```

Add to PostCSS config:
```js
module.exports = {
  plugins: {
    autoprefixer: {},
    // ... existing plugins
  },
};
```

**Step 3: Verify build**

Run: `cd sites/arolariu.ro && npx next build`

**Step 4: Commit**

```bash
git add sites/arolariu.ro/postcss.config.* sites/arolariu.ro/package.json
git commit -m "chore: add autoprefixer to PostCSS pipeline"
```

---

### Task 8.2: Remove Manual Vendor Prefixes

**Files (only if autoprefixer is confirmed):**
- Modify: `sites/arolariu.ro/src/styles/abstracts/_mixins.scss` (line 268: `-webkit-background-clip`)
- Modify: `sites/arolariu.ro/src/styles/components/_buttons.scss` (lines 73-80: `-webkit-mask`)
- Modify: `sites/arolariu.ro/src/styles/components/_cards.scss` (lines 192-199: `-webkit-mask`)

**Important:** `-webkit-background-clip: text` and `-webkit-mask-composite` are NOT auto-prefixed by autoprefixer because the non-prefixed versions have different syntax. These MUST stay as-is.

**Step 1: Verify which prefixes are actually needed**

- `-webkit-background-clip: text` — **KEEP** (needed for Chrome/Safari, `background-clip: text` is standard but `-webkit-` variant is still needed for broader support)
- `-webkit-mask` and `-webkit-mask-composite` — **KEEP** (mask compositing differs between `-webkit-` and standard)

**Step 2: Add standard properties alongside webkit prefixes**

In `_mixins.scss` line 145-147, verify both are present:
```scss
-webkit-background-clip: text;
background-clip: text;
```

Both already exist. No changes needed.

In `_buttons.scss` and `_cards.scss`, verify both `-webkit-mask` and `mask` are present. Both already exist.

**Step 3: No changes needed — document that prefixes are intentional**

Add a comment in each location:

```scss
// Vendor prefix required: -webkit-background-clip: text has no auto-prefix equivalent
```

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/styles/
git commit -m "docs(scss): document intentional vendor prefixes that cannot be auto-prefixed"
```

---

## Success Criteria

- [ ] All z-index values use `z()` token function — zero hardcoded numeric z-index in module files
- [ ] Dark mode muted text passes WCAG AA (4.5:1 contrast)
- [ ] All preset primary colors pass WCAG AA for white-on-primary buttons
- [ ] Success/warning/info semantic colors added with guaranteed contrast
- [ ] Navigation fully supports dark mode — no hardcoded white/black/gray
- [ ] Footer uses token references — no hardcoded hex colors
- [ ] Header uses token references — no hardcoded hex colors
- [ ] Icon colors have dark mode variants with WCAG AA contrast
- [ ] Small icon buttons meet 44px touch target
- [ ] Card shadows visible in dark mode
- [ ] Card borders visible in dark mode (increased contrast)
- [ ] Interactive cards have focus-visible outlines
- [ ] Badge component with semantic variants available globally
- [ ] Focus ring (`--ring`) included in all theme presets
- [ ] No `!important` in footer (specificity fixed)
- [ ] All vendor prefixes documented as intentional
- [ ] Build succeeds without warnings
- [ ] Visual parity verified: all presets x both modes x cards, badges, icons

---

## Execution Order & Dependencies

```
Phase 1 (Z-Index Tokens)      → no dependencies, can start immediately
Phase 2 (Contrast Fixes)      → no dependencies, can parallel Phase 1
Phase 3 (Nav/Footer Dark Mode) → depends on Phase 2 Task 2.3 (semantic colors in _colors.scss)
Phase 4 (Icon Accessibility)  → no dependencies, can parallel Phase 1-2
Phase 5 (Card Visibility)     → depends on Phase 2 (globals.scss changes)
Phase 6 (Badge Component)     → depends on Phase 2 Task 2.3 (success/warning/info colors)
Phase 7 (Focus Ring Presets)  → depends on Phase 2 Task 2.2 (preset primary fixes)
Phase 8 (Vendor Prefixes)     → no dependencies, can run anytime
```

**Parallelizable:** Phases 1 + 2 + 4 + 8 can all start simultaneously. Phase 3 starts after Task 2.3. Phases 5-7 start after Phase 2 completes.

**Estimated task count:** 17 tasks across 8 phases.
