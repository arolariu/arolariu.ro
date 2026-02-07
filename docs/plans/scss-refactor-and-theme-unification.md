# SCSS Refactor & Theme System Unification Plan

**Branch:** `user/aolariu/migration-to-scss`
**Date:** 2026-02-07
**Scope:** `sites/arolariu.ro` — SCSS architecture, theme system, next-themes integration

---

## Executive Summary

The current styling system has grown organically during the Tailwind-to-SCSS migration and now contains **redundant theme subsystems**, **scattered concerns**, and **unnecessary runtime JavaScript** for theme application. This plan consolidates the theming architecture into a **CSS-first approach** that leverages next-themes properly, eliminates the `GradientThemeContext`, and reorganizes the SCSS codebase for correctness, extensibility, and performance.

**Key outcomes:**
- Eliminate `GradientThemeContext` (~200 lines of runtime JS + a React context)
- Move 7 of 8 theme presets from runtime JS to compiled CSS (zero-JS theme switching)
- Consolidate `globals.scss` scattered concerns into proper 7-1 partials
- Remove hardcoded colors in favor of CSS variable references
- Eliminate empty/documentation-only CSS selectors that bloat output
- Establish a single source of truth for all theme colors (SCSS maps)

---

## Current State Analysis

### Architecture Diagram (Current)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CURRENT THEME SYSTEM                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  globals.scss                                                               │
│  ├── :root { --primary, --gradient-from, ... }    (light mode defaults)     │
│  ├── .dark { --primary, --gradient-from, ... }    (dark mode defaults)      │
│  ├── base resets (body, html, button)             ← SHOULD BE in base/      │
│  ├── utility classes (.text-glow, .bg-grid, ...)  ← SHOULD BE in utilities/ │
│  └── @keyframes (float, glowing)                  ← DUPLICATED in animations/│
│                                                                             │
│  next-themes ThemeProvider                                                  │
│  ├── Manages: light ↔ dark (toggles .dark class on <html>)                 │
│  └── ONLY handles light/dark — presets NOT integrated                       │
│                                                                             │
│  GradientThemeContext (REDUNDANT)                                           │
│  ├── 5 gradient presets (default, ocean, sunset, forest, purple)            │
│  ├── Converts hex → HSL at RUNTIME                                         │
│  ├── Applies --gradient-from/via/to via JS                                  │
│  └── CONFLICTS with useThemePreset (both set same variables)                │
│                                                                             │
│  useThemePreset hook                                                        │
│  ├── 7 named presets + custom from theme-presets.ts                         │
│  ├── Applies ALL CSS variables via JS (including gradients)                 │
│  ├── Reads resolvedTheme from next-themes for light/dark variant            │
│  └── Sets data-theme-preset attribute on <html>                             │
│                                                                             │
│  preferencesStore (Zustand + IndexedDB)                                     │
│  ├── primaryColor, secondaryColor, tertiaryColor (hex — for gradients)      │
│  ├── themePreset: "default" | "midnight" | ... | "custom"                   │
│  └── customThemeColors: { gradientFrom, gradientVia, ... }                  │
│                                                                             │
│  themes/_presets.scss, themes/_user-themes.scss, themes/_variables.scss      │
│  └── MOSTLY COMMENTS — generate empty CSS selectors                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Problems Identified

| # | Problem | Impact | Severity |
|---|---------|--------|----------|
| 1 | **Dual gradient systems** — `GradientThemeContext` and `useThemePreset` both set `--gradient-from/via/to` | Race condition; unpredictable which wins | High |
| 2 | **Runtime JS for static themes** — 7 named presets apply CSS variables via `document.documentElement.style.setProperty()` in useEffect | Unnecessary JS execution; potential FOUC on preset switch | High |
| 3 | **Scattered globals.scss** — Contains resets, utilities, keyframes, and variables in one file | Violates 7-1 pattern; hard to maintain | Medium |
| 4 | **Hardcoded colors** — `.text-glow`, `.blue-underline`, `.glow-effect` use `#1e90ff`, `rgba(59,130,246,...)` | Don't respond to theme changes | Medium |
| 5 | **Empty CSS selectors** — `[data-gradient-preset="ocean"] {}` etc. generate empty rules | Bloated CSS output | Low |
| 6 | **Duplicate keyframes** — `float` and `glowing` defined in both globals.scss and animations/ | Potential conflicts | Low |
| 7 | **Theme presets defined in 3 places** — theme-presets.ts (full), GradientThemeContext.tsx (gradients), themes/*.scss (docs) | No single source of truth | High |
| 8 | **next-themes underutilized** — Only manages light/dark; `disableTransitionOnChange`, custom storageKey, nonce not used | Missing features, potential FOUC during theme switch | Medium |
| 9 | **GradientThemeContext hex→HSL at runtime** — Converts colors every render when store updates | Unnecessary computation | Low |
| 10 | **Preset overlap** — GradientThemeContext has 5 presets; theme-presets.ts has 7+custom | Confusing DX, partial feature overlap | Medium |

---

## Target State Architecture

### Architecture Diagram (Target)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TARGET THEME SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  globals.scss (SLIM — variables only)                                       │
│  ├── :root { --primary, --gradient-from, ... }    (light mode defaults)     │
│  └── .dark { --primary, --gradient-from, ... }    (dark mode defaults)      │
│                                                                             │
│  themes/_presets.scss (NEW — single source of truth for all preset colors)  │
│  ├── SCSS $theme-presets map with all 7 presets                             │
│  ├── @each loop generates:                                                  │
│  │   ├── [data-theme-preset="ocean"]       { ... light vars ... }           │
│  │   └── [data-theme-preset="ocean"].dark  { ... dark vars ... }            │
│  └── Pure CSS — no runtime JS needed for named presets                      │
│                                                                             │
│  next-themes ThemeProvider (enhanced config)                                │
│  ├── attribute="class" — toggles .dark class                                │
│  ├── disableTransitionOnChange=true — smooth theme transitions              │
│  ├── storageKey="arolariu-theme" — namespaced storage                       │
│  └── Manages: light ↔ dark ↔ system (same as before)                       │
│                                                                             │
│  useThemePreset hook (SIMPLIFIED)                                           │
│  ├── Named presets → ONLY sets data-theme-preset attribute (CSS handles it) │
│  ├── "custom" preset → applies CSS variables via JS (only runtime case)     │
│  └── NO dependency on resolvedTheme for named presets                       │
│                                                                             │
│  ❌ GradientThemeContext — ELIMINATED                                        │
│  ├── Custom gradient colors absorbed into useThemePreset "custom" path      │
│  ├── Preset detection logic removed (SCSS handles presets)                  │
│  └── useGradientTheme() consumers migrated to usePreferencesStore           │
│                                                                             │
│  preferencesStore (Zustand + IndexedDB) — simplified                        │
│  ├── themePreset: "default" | "midnight" | ... | "custom"                   │
│  ├── customThemeColors: { gradientFrom, gradientVia, ... } | null           │
│  └── (primaryColor/secondaryColor/tertiaryColor → DEPRECATED or removed)    │
│                                                                             │
│  7-1 Architecture (properly organized)                                      │
│  ├── abstracts/ — unchanged (variables, mixins, functions, colors, typo)    │
│  ├── base/ — absorbs resets from globals.scss                               │
│  ├── themes/ — now generates real CSS from preset maps                      │
│  ├── animations/ — absorbs keyframes from globals.scss                      │
│  ├── utilities/ — absorbs utility classes from globals.scss                 │
│  ├── components/ — unchanged                                                │
│  └── pages/ — unchanged                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Consolidate globals.scss into 7-1 Architecture

**Goal:** Slim down `globals.scss` to contain ONLY CSS custom property definitions. Move everything else to the correct 7-1 partition.

**Files Modified:**
- `src/app/globals.scss` — Remove non-variable content
- `src/styles/base/_elements.scss` — Absorb base resets
- `src/styles/utilities/_effects.scss` — NEW: absorb visual utility classes
- `src/styles/animations/_keyframes.scss` — Absorb duplicate keyframes

**Steps:**

1.1. **Move base resets from globals.scss to base/_elements.scss**
   - Move `*, ::after, ::before, ::backdrop, ::file-selector-button { border-color }` rule
   - Move `body { background-color; color; min-height }` rule
   - Move `html { text-rendering }` rule
   - Move `button { cursor: pointer }` rule
   - Move `.text { font-family }` class
   - These already partially exist in `base/_reset.scss` and `base/_elements.scss` — merge carefully

1.2. **Move utility classes from globals.scss to utilities/**
   - Create `src/styles/utilities/_effects.scss`
   - Move `.bg-grid-pattern`, `.text-glow`, `.text-glow-strong`, `.blue-underline`, `.glow-effect`, `.parallax-layer`
   - Forward from `utilities/_index.scss`

1.3. **Replace hardcoded colors in utility classes**
   - `.text-glow`: Replace `rgba(59, 130, 246, 0.5)` with `color-alpha('primary', 0.5)` or `hsl(var(--accent-primary) / 0.5)`
   - `.text-glow-strong`: Replace `rgba(59, 130, 246, 0.8)` with `hsl(var(--accent-primary) / 0.8)`
   - `.blue-underline::after`: Replace `#1e90ff` with `hsl(var(--primary))`
   - `.glow-effect::before`: Replace `#1e90ff` with `hsl(var(--primary))`

1.4. **Deduplicate keyframes**
   - Remove `@keyframes float` and `@keyframes glowing` from globals.scss
   - Verify they exist in `animations/_keyframes.scss` (add if missing)
   - The `@keyframes glowing` may be unique to globals.scss — move to animations/

1.5. **Move accessibility reduced-motion to base/**
   - Move `@media (prefers-reduced-motion: reduce)` block to `base/_reset.scss`
   - This is a base-level concern, not a utility

1.6. **Resulting globals.scss** should contain ONLY:
   ```scss
   // CSS Custom Properties — Theme Variables
   :root { /* light mode variables */ }
   .dark { /* dark mode variables */ }
   ```

**Verification:** Build succeeds, visual regression test passes, no duplicate selectors in compiled CSS.

---

### Phase 2: Unify Theme Presets into SCSS (CSS-First Approach)

**Goal:** Move all 7 named preset color definitions from `theme-presets.ts` runtime JavaScript into compiled SCSS. The browser applies themes via CSS selectors instead of JavaScript DOM manipulation.

**Files Modified:**
- `src/styles/themes/_presets.scss` — Rewrite: SCSS map + @each loop generating real CSS
- `src/styles/themes/_user-themes.scss` — Remove (consolidated into _presets.scss)
- `src/styles/themes/_variables.scss` — Remove (documentation moved to _presets.scss header)
- `src/styles/themes/_index.scss` — Simplify forwards
- `src/lib/theme-presets.ts` — Reduce to metadata only (name, description, preview)

**Steps:**

2.1. **Create the SCSS theme map in `themes/_presets.scss`**

   Define a `$theme-presets` SCSS map mirroring the data from `theme-presets.ts`:

   ```scss
   @use 'sass:map';

   // Single source of truth for all theme preset CSS variables.
   // Each preset defines light and dark mode overrides.
   // Generated selectors: [data-theme-preset="name"] and [data-theme-preset="name"].dark

   $theme-presets: (
     'midnight': (
       'light': (
         '--primary': '243 75% 59%',
         '--primary-foreground': '0 0% 100%',
         '--gradient-from': '245 58% 51%',
         '--gradient-via': '243 75% 59%',
         '--gradient-to': '241 77% 74%',
         '--accent-primary': '243 75% 59%',
         '--footer-bg': '245 58% 30%',
       ),
       'dark': (
         '--primary': '241 77% 74%',
         '--primary-foreground': '0 0% 100%',
         '--gradient-from': '245 58% 51%',
         '--gradient-via': '243 75% 59%',
         '--gradient-to': '241 77% 74%',
         '--accent-primary': '241 77% 74%',
         '--footer-bg': '245 58% 25%',
       ),
     ),
     // ... ocean, sunset, forest, rose, monochrome
   );
   ```

2.2. **Generate CSS selectors via @each loop**

   ```scss
   // Generate theme preset CSS variable overrides
   @each $name, $modes in $theme-presets {
     $light: map.get($modes, 'light');
     $dark: map.get($modes, 'dark');

     // Light mode overrides
     [data-theme-preset='#{$name}'] {
       @each $prop, $value in $light {
         #{$prop}: #{$value};
       }
     }

     // Dark mode overrides
     [data-theme-preset='#{$name}'].dark {
       @each $prop, $value in $dark {
         #{$prop}: #{$value};
       }
     }
   }
   ```

   This generates clean, static CSS like:
   ```css
   [data-theme-preset="ocean"] {
     --primary: 199 89% 48%;
     --gradient-from: 199 89% 48%;
     /* ... */
   }
   [data-theme-preset="ocean"].dark {
     --primary: 187 94% 43%;
     /* ... */
   }
   ```

2.3. **Reduce `theme-presets.ts` to metadata only**

   ```typescript
   export interface ThemePresetMeta {
     readonly name: string;
     readonly description: string;
     readonly preview: readonly [string, string, string];
   }

   export const THEME_PRESETS: Record<string, ThemePresetMeta> = {
     default: {
       name: "Default",
       description: "Cyan, purple, and pink — the signature look",
       preview: ["#06b6d4", "#8b5cf6", "#ec4899"],
     },
     midnight: {
       name: "Midnight",
       description: "Deep indigo and blue — elegant and dark",
       preview: ["#3730a3", "#6366f1", "#818cf8"],
     },
     // ... remaining presets (metadata only, no CSS values)
   } as const;

   export type ThemePresetName = keyof typeof THEME_PRESETS;
   ```

   The `light` and `dark` objects are removed — SCSS is now the source of truth.

2.4. **Remove `themes/_user-themes.scss` and `themes/_variables.scss`**
   - Content consolidated into `_presets.scss` header comments
   - Update `themes/_index.scss` to forward only `_presets.scss`

**Verification:** Each preset generates correct CSS selectors. Setting `data-theme-preset="ocean"` on `<html>` applies the correct variables in both light and dark mode without JavaScript.

---

### Phase 3: Eliminate GradientThemeContext

**Goal:** Remove the `GradientThemeContext` entirely. Custom gradient colors are handled by `useThemePreset`. Named preset gradients are handled by SCSS (Phase 2).

**Files Modified:**
- `src/contexts/GradientThemeContext.tsx` — DELETE
- `src/app/providers.tsx` — Remove GradientThemeProvider
- `src/hooks/useThemePreset.ts` — Absorb custom color application
- `src/stores/preferencesStore.ts` — Simplify gradient fields
- Any consumers of `useGradientTheme()` — Migrate

**Steps:**

3.1. **Audit `useGradientTheme()` consumers**
   - Search codebase for all imports of `useGradientTheme` or `GradientThemeContext`
   - Map each consumer to its replacement:
     - Reading gradient colors → `usePreferencesStore()` directly
     - Setting preset → `usePreferencesStore().setThemePreset()`
     - Color picker → `usePreferencesStore().setCustomThemeColors()`

3.2. **Absorb custom color application into `useThemePreset`**
   - Move the hex→HSL conversion utility into a shared util (or import from `@arolariu/components`)
   - In `useThemePreset`, when `themePreset === "custom"`:
     - Read `customThemeColors` from store
     - Apply CSS variables via JS (same as current behavior)
     - Also apply `--gradient-from/via/to` from the custom colors
   - The `darkenHsl()` function moves to `useThemePreset` or a shared util

3.3. **Remove GradientThemeProvider from providers.tsx**

   ```tsx
   // BEFORE:
   <ThemeProvider ...>
     <GradientThemeProvider>
       <ThemePresetApplier />
       {children}
     </GradientThemeProvider>
   </ThemeProvider>

   // AFTER:
   <ThemeProvider ...>
     <ThemePresetApplier />
     {children}
   </ThemeProvider>
   ```

3.4. **Simplify preferencesStore**
   - The `primaryColor`, `secondaryColor`, `tertiaryColor` fields were used by GradientThemeContext
   - Evaluate whether to keep them for the custom color picker UI, or migrate to `customThemeColors` exclusively
   - If the Settings UI allows picking individual gradient colors, keep the fields but rename for clarity
   - If the Settings UI uses the `CustomThemeColors` interface, remove the individual color fields

3.5. **Delete `src/contexts/GradientThemeContext.tsx`**

3.6. **Update exports/imports**
   - Remove from `src/contexts/index.ts` (if barrel exists)
   - Remove from `src/stores/index.ts` `GradientTheme` export (if used externally)

**Verification:** No runtime errors. Theme preset switching works. Custom color picker still functions. `useGradientTheme` import errors are all resolved.

---

### Phase 4: Simplify useThemePreset Hook

**Goal:** The hook becomes a thin layer that sets ONE data attribute for named presets, and applies CSS variables ONLY for the "custom" preset.

**Files Modified:**
- `src/hooks/useThemePreset.ts` — Rewrite

**Steps:**

4.1. **Rewrite useThemePreset**

   ```typescript
   export function useThemePreset(): void {
     const themePreset = usePreferencesStore((s) => s.themePreset);
     const customThemeColors = usePreferencesStore((s) => s.customThemeColors);
     const hasHydrated = usePreferencesStore((s) => s.hasHydrated);

     useEffect(() => {
       if (!hasHydrated) return;
       const root = document.documentElement;

       // Set data attribute — SCSS handles named preset variables
       root.setAttribute("data-theme-preset", themePreset);

       if (themePreset === "custom" && customThemeColors) {
         // Only "custom" needs runtime JS variable application
         applyCustomThemeColors(root, customThemeColors);
       } else {
         // Named presets: clear any previously applied inline styles
         clearInlineThemeStyles(root);
       }
     }, [themePreset, customThemeColors, hasHydrated]);
   }
   ```

4.2. **Remove `resolvedTheme` dependency for named presets**
   - Named presets now have both `[data-theme-preset="X"]` and `[data-theme-preset="X"].dark` SCSS selectors
   - The `.dark` class from next-themes automatically selects the right variable set
   - `resolvedTheme` is NO LONGER NEEDED — removes a re-render trigger

4.3. **Add cleanup for inline styles when switching away from "custom"**
   - When switching from "custom" to a named preset, remove inline `style` properties
   - This ensures SCSS-defined variables take precedence

4.4. **Helper functions**

   ```typescript
   const THEME_CSS_PROPS = [
     '--primary', '--primary-foreground', '--gradient-from',
     '--gradient-via', '--gradient-to', '--accent-primary', '--footer-bg'
   ] as const;

   function clearInlineThemeStyles(root: HTMLElement): void {
     for (const prop of THEME_CSS_PROPS) {
       root.style.removeProperty(prop);
     }
   }

   function applyCustomThemeColors(root: HTMLElement, colors: CustomThemeColors): void {
     root.style.setProperty('--gradient-from', colors.gradientFrom);
     root.style.setProperty('--gradient-via', colors.gradientVia);
     root.style.setProperty('--gradient-to', colors.gradientTo);
     root.style.setProperty('--primary', colors.primary);
     root.style.setProperty('--primary-foreground', colors.primaryForeground);
     root.style.setProperty('--accent-primary', colors.gradientFrom);
     root.style.setProperty('--footer-bg', colors.footerBg);
   }
   ```

**Verification:** Switching between presets applies correct colors instantly. Switching from "custom" to a named preset clears inline styles. No dependency on `resolvedTheme` for named presets.

---

### Phase 5: Enhance next-themes Configuration

**Goal:** Leverage next-themes features we're currently not using.

**Files Modified:**
- `src/app/providers.tsx` — Update ThemeProvider props
- `src/app/layout.tsx` — Potentially add nonce

**Steps:**

5.1. **Add `disableTransitionOnChange`**
   ```tsx
   <ThemeProvider
     enableSystem
     enableColorScheme
     defaultTheme="system"
     attribute="class"
     themes={["light", "dark"]}
     disableTransitionOnChange
     storageKey="arolariu-theme"
   >
   ```
   - Prevents jarring intermediate states during light↔dark switch
   - next-themes injects a temporary `<style>` that disables all transitions, then removes it

5.2. **Add namespaced `storageKey`**
   - Change from default `"theme"` to `"arolariu-theme"`
   - Prevents conflicts if multiple apps share the same domain

5.3. **Evaluate `attribute={["class", "data-theme"]}`**
   - Using both `class` and `data-theme` attributes simultaneously
   - Allows SCSS to use either `.dark {}` or `[data-theme="dark"] {}` selectors
   - This provides future flexibility without breaking current `.dark` selectors
   - **Decision needed:** Is the added flexibility worth the extra attribute? If not, keep `attribute="class"` only.

5.4. **CSP nonce support (optional, if CSP headers are configured)**
   - If the site uses Content-Security-Policy headers, pass the nonce to next-themes
   - This allows the injected `<script>` to execute under strict CSP

**Verification:** Theme switching is smooth (no flash during transition). localStorage key is namespaced.

---

### Phase 6: SCSS Quality & Consistency Audit

**Goal:** Ensure all 70+ `.module.scss` files follow consistent patterns and maximize use of the design system.

**Files Modified:** All `.module.scss` files (audit and selective fixes)

**Steps:**

6.1. **Naming convention audit**
   - Verify all module classes use **camelCase** (e.g., `cardWrapper`, not `card-wrapper`)
   - Verify all global component classes use **BEM with kebab-case** (e.g., `.card__header--elevated`)
   - Document the convention in a comment at the top of `main.scss`

6.2. **Replace inline media queries with mixins**
   - Search for raw `@media (min-width:` or `@media (max-width:` in module files
   - Replace with `@include respond-to('md')` etc.
   - This ensures breakpoint consistency

6.3. **Replace hardcoded values with design tokens**
   - Search for raw `px`, `rem`, `em` values that match design token values
   - Replace with `space()`, `font-size()`, `radius()` function calls
   - Example: `padding: 1.5rem` → `padding: space(6)`
   - Example: `border-radius: 0.5rem` → `border-radius: radius('lg')`
   - Example: `font-size: 0.875rem` → `font-size: font-size('sm')`

6.4. **Replace raw color values with SCSS color helpers**
   - Search for `hsl(var(--` patterns
   - Replace with `color('primary')`, `color-alpha('card', 0.5)` etc.
   - This provides validation (unknown color names error at compile time)

6.5. **Ensure `@use '../styles/abstracts' as *;` is present in all modules**
   - Some modules may be importing abstracts at different depths
   - Standardize the import path (consider a shared alias if SCSS supports it)

6.6. **Remove unused composes patterns**
   - Audit CSS Modules `composes:` usage for correctness
   - Ensure composed classes exist in the same module

6.7. **Add `@layer` rules for cascade control (optional, progressive)**
   ```scss
   // main.scss
   @layer base, themes, components, utilities;
   ```
   - This gives explicit control over which styles win in specificity conflicts
   - Note: Requires evaluation of browser support targets and interaction with @arolariu/components

**Verification:** Lint passes. Build succeeds. Visual regression matches.

---

### Phase 7: Performance Optimizations

**Goal:** Minimize CSS output, reduce runtime work, and improve rendering performance.

**Steps:**

7.1. **Remove empty SCSS selectors**
   - Delete all empty `[data-gradient-preset="..."] {}` blocks from old `_presets.scss`
   - These generate empty CSS rules that bloat the output

7.2. **Audit utility class generation scope**
   - `utilities/_spacing.scss` generates classes for ALL spacing values (m-0 through m-96)
   - Evaluate which spacing values are actually used
   - Consider reducing the `$utility-spacings` list to only commonly used values
   - Alternative: Remove utility classes entirely if all components use SCSS modules

7.3. **Optimize `will-change` usage**
   - Currently only `.parallax-layer { will-change: transform; }`
   - Audit for missing `will-change` on frequently animated elements
   - Ensure `will-change` is not overused (creates compositing layers)

7.4. **Review `@media (prefers-reduced-motion)` comprehensiveness**
   - Current implementation uses `!important` to override all animations
   - Verify it catches CSS animations defined in module files
   - Ensure motion library (framer-motion/motion) also respects this preference

7.5. **Consider `content-visibility: auto` for long pages**
   - Pages like about/, privacy-policy, terms-of-service have many sections
   - `content-visibility: auto` skips rendering off-screen sections
   - Add as a mixin: `@mixin content-visibility-auto { content-visibility: auto; contain-intrinsic-size: auto 500px; }`

7.6. **CSS output size audit**
   - After all changes, compare CSS bundle size before and after
   - Target: no increase (ideally decrease due to removed empty selectors and consolidated code)

---

## File Change Summary

| Action | File | Phase |
|--------|------|-------|
| MODIFY | `src/app/globals.scss` | 1 |
| MODIFY | `src/styles/base/_elements.scss` | 1 |
| MODIFY | `src/styles/base/_reset.scss` | 1 |
| CREATE | `src/styles/utilities/_effects.scss` | 1 |
| MODIFY | `src/styles/utilities/_index.scss` | 1 |
| MODIFY | `src/styles/animations/_keyframes.scss` | 1 |
| REWRITE | `src/styles/themes/_presets.scss` | 2 |
| DELETE | `src/styles/themes/_user-themes.scss` | 2 |
| DELETE | `src/styles/themes/_variables.scss` | 2 |
| MODIFY | `src/styles/themes/_index.scss` | 2 |
| MODIFY | `src/lib/theme-presets.ts` | 2 |
| DELETE | `src/contexts/GradientThemeContext.tsx` | 3 |
| MODIFY | `src/app/providers.tsx` | 3, 5 |
| MODIFY | `src/hooks/useThemePreset.ts` | 4 |
| MODIFY | `src/stores/preferencesStore.ts` | 3 |
| MODIFY | `src/app/my-profile/_components/SettingsAppearance.tsx` | 3 |
| AUDIT | All `*.module.scss` files (70+) | 6 |

---

## Execution Order & Dependencies

```
Phase 1 (globals.scss cleanup)
  ↓
Phase 2 (SCSS theme presets)  ←──┐
  ↓                              │
Phase 3 (eliminate GradientCtx) ─┘  (depends on Phase 2 SCSS presets being ready)
  ↓
Phase 4 (simplify useThemePreset)   (depends on Phase 2 + 3)
  ↓
Phase 5 (next-themes config)        (independent, can run anytime after Phase 3)
  ↓
Phase 6 (SCSS quality audit)        (independent, can run anytime)
  ↓
Phase 7 (performance)               (after all other phases)
```

**Phases 1, 5, and 6 are independent** and can be executed in parallel.
**Phases 2→3→4 are sequential** and form the critical path.

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Settings UI breaks when GradientThemeContext removed | Medium | High | Audit all useGradientTheme consumers before deletion |
| CSS specificity conflicts between globals.scss and SCSS preset selectors | Low | Medium | `[data-theme-preset="X"]` has higher specificity than `:root` — correct by default |
| IndexedDB-stored preferences reference removed fields | Low | Medium | Add migration logic in store or handle gracefully with defaults |
| CSS custom properties in HSL format mismatch between SCSS and JS | Low | High | Validate HSL values match exactly between SCSS map and current theme-presets.ts |
| Stale inline styles persist when switching presets | Medium | Medium | clearInlineThemeStyles() in Phase 4 handles this |
| @layer browser support issues | Low | Low | Phase 6.7 is marked optional; modern browsers all support @layer |

---

## Testing Strategy

1. **Per-phase visual regression:** After each phase, visually verify all theme presets in both light and dark mode
2. **Automated checks:** Build succeeds (`npm run build:website`), lint passes (`npm run lint`)
3. **Manual testing matrix:**
   - Each of the 7 named presets × light mode × dark mode = 14 combinations
   - Custom preset with user-defined colors × light × dark = 2 combinations
   - System theme preference switching
   - Preset switching speed (should be instant — CSS-only for named presets)
4. **Performance:** Measure CSS bundle size before and after
5. **Accessibility:** Verify `prefers-reduced-motion` still works correctly

---

## Success Metrics

- [ ] `GradientThemeContext.tsx` deleted — ~200 lines of runtime JS removed
- [ ] `globals.scss` reduced to ~30 lines (CSS variables only)
- [ ] 0 runtime `style.setProperty()` calls for named presets (CSS-only)
- [ ] Single source of truth for theme colors in `themes/_presets.scss`
- [ ] 0 hardcoded colors in utility classes
- [ ] 0 empty CSS selectors in compiled output
- [ ] 0 duplicate keyframe definitions
- [ ] All module.scss files pass naming convention audit
- [ ] CSS bundle size equal to or smaller than before
