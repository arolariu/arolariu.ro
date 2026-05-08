# arolariu.ro — Design System & Frontend Guidelines

> **Audience:** AI coding agents and human designers working on `sites/arolariu.ro/`.
> **Purpose:** Single, authoritative reference for the visual language, design tokens, component patterns, and motion vocabulary of the arolariu.ro web platform.
>
> Read this **before** writing any frontend code. The system is opinionated by design — deviating without cause produces drift.

---

## 1. Brand Identity — "Crystalline Court"

arolariu.ro is a personal full-stack platform that wears its sophistication on its sleeve. The aesthetic is best understood as **Digital Renaissance** — classical typography under a vivid jewel-tone gradient, set against ethereal blurred orbs and crystalline geometric ornament. It is **not** flat, not brutalist, not playful, not Material Design. Treat it as a refined court: ceremonious typography, regal color, restrained ornament, and high craft in the details.

### 1.1 Aesthetic Pillars

| Pillar | Expression |
|---|---|
| **Regal typography** | Caudex serif (Renaissance-revival, weight 700) sets all body text by default. Headings carry weight without shouting. |
| **Jewel-tone gradients** | A signature triad — **sapphire blue → ruby fuchsia → amethyst violet** — flows through wordmarks, badges, CTA glows, and gradient-bordered cards. Always animate or anchor it; never use it as a flat background fill. |
| **Ethereal orbs** | Large, blurred (24–64px) circular blobs colored with `color-alpha('primary', 0.2)` or `color-alpha('tertiary', 0.2)` float behind hero sections and CTAs. They are atmosphere, not decoration. |
| **Crystalline ornament** | The `TechSphere` (interconnected wireframe globe) on the homepage, `BackgroundBeams` (animated radiant lines), and faint grid overlays (`linear-gradient(... 1px, transparent 1px)` at 50px tiles) provide geometric counterpoint to the soft orbs. |
| **Royal foundation** | The `--footer-bg` resolves to `var(--primary)` — every page closes on a slab of saturated brand color. Footer text is `--primary-foreground` (high-contrast white). |
| **Crafted detail** | Fluid `clamp()` typography, gradient borders via `mask-composite`, focus rings, dark mode parity, dyslexic-font opt-in, reduced-motion compliance, high-contrast media queries. |

### 1.2 Voice in the Visual

- **Confident, never loud.** Hero titles use the largest size on the scale (`8xl` ≈ 6rem fluid), but always set against generous negative space.
- **Asymmetric balance, not chaos.** Hero is a 1-column grid below `lg`, 2-column above — wordmark left, ornament right. Mission/value sections use 3-up card grids.
- **Atmosphere over decoration.** Background orbs and beams are positioned with `z('behind')` and `pointer-events: none`. They never compete with content.
- **Weight through gradient, not through bold.** Hero word marks use `gradient-bg + background-clip: text + color: transparent` — color *is* the emphasis.

### 1.3 What This Site Is Not

Do not introduce these aesthetic patterns; they break the identity:

- ❌ **Generic sans-serif body text** (Inter, Roboto, system-ui). Caudex is the default — change this and the brand collapses.
- ❌ **Glassmorphism as a hero treatment.** Frosted glass exists (`@include glass`) but is reserved for code-block surfaces and modal-adjacent overlays.
- ❌ **Drop-shadow trees** (multiple cards each with `shadow('lg')` on rest). Shadows step from `sm → md → lg → xl → 2xl` with intent; rest state is usually `md` or none.
- ❌ **Flat purple-on-white gradients** (the "AI slop" cliche). The triad is **blue–pink–purple**, in that order, traversing the rim of color space, not a single hue.
- ❌ **Inline styles** (`style={{...}}`). Forbidden by the project conventions in `CLAUDE.md`.
- ❌ **`@arolariu/components` reskins.** The shared library at `packages/components/` ships pre-themed; consume it, don't restyle it.

---

## 2. Design Tokens

All tokens are defined in SCSS under `src/styles/abstracts/` and surfaced through accessor functions. **Always use the function — never hardcode the underlying value.**

| File | Defines |
|---|---|
| `_config.scss` | Feature switches: `$enable-fluid-type`, `$enable-css-layers`, `$css-prefix` (`aro`), etc. |
| `_colors.scss` | `color('name')`, `color-alpha('name', $α)`, `static-color('white')` |
| `_typography.scss` | `font-size()`, `font-weight()`, `line-height()`, `letter-spacing()`, `$font-family-default`, `$font-family-dyslexic`, `$font-family-mono` |
| `_variables.scss` | `space()`, `breakpoint()`, `z()`, `radius()`, `shadow()`, `duration()`, `easing()`, `blur-size()`, `opacity()` |
| `_mixins.scss` | `flex-center`, `respond-to`, `gradient-bg`, `glass`, `card-hover`, `orb`, `focus-ring`, `dark`, `reduced-motion`, etc. |

### 2.1 Color System

Colors are HSL-channel CSS custom properties (e.g. `--primary: 221.2 83.2% 53.3%`) consumed through SCSS helpers. The HSL-channel pattern lets `color-alpha()` compose `hsl(var(--primary) / 0.2)` without losing theme reactivity.

#### Default light-mode palette (`:root` in `base/_globals.scss`)

| Token | HSL | Approx hex | Role |
|---|---|---|---|
| `--background` | `0 0% 100%` | `#ffffff` | Page surface |
| `--foreground` | `222.2 84% 4.9%` | `#020817` | Body text |
| `--primary` | `221.2 83.2% 53.3%` | `#3b82f6` | **Sapphire blue** — wordmark, footer, CTAs |
| `--secondary` | `262 94% 52%` | `#7c3aed` | **Amethyst violet** — gradient terminal |
| `--tertiary` | `330 92% 46%` | `#e11d74` | **Ruby fuchsia** — gradient midpoint, links |
| `--muted` | `210 40% 96.1%` | `#f1f5f9` | Subtle backgrounds, code blocks |
| `--muted-foreground` | `215.4 16.3% 46.9%` | `#64748b` | Secondary text |
| `--card` | `0 0% 100%` | `#ffffff` | Card surface |
| `--border` | `214.3 31.8% 91.4%` | `#e2e8f0` | Default border |
| `--ring` | `221.2 83.2% 53.3%` | `#3b82f6` | Focus ring (matches primary) |
| `--destructive` | `0 84.2% 60.2%` | `#ef4444` | Errors, destructive actions |
| `--success` | `142 71% 35%` | `#15803d` | Success states |
| `--warning` | `38 92% 40%` | `#c2780c` | Warnings |
| `--info` | `199 89% 38%` | `#0c84b8` | Informational |
| `--link` | `var(--tertiary)` | — | **Light mode links → ruby**, **dark mode links → violet** (set in `.dark`) |
| `--footer-bg` | `var(--primary)` | — | Footer slab — always the brand primary |

**Dark mode** (`.dark` ancestor) flips backgrounds to true black, lifts brand colors to higher lightness (e.g. `--primary: 214 100% 47%`), and swaps `--link` to `var(--secondary)` (violet).

#### Usage rules

```scss
// ✅ Semantic tokens — theme-reactive
color: color('foreground');
background: color('card');
border: 1px solid color('border');
background: color-alpha('primary', 0.1);   // 10% tint of primary

// ✅ Static colors when truly static
background: static-color('white');         // pure white, never themed
border: 1px solid static-color('black');

// ❌ Never hardcode literals
color: #3b82f6;
background: rgb(59, 130, 246);
border: 1px solid hsl(221, 83%, 53%);
```

#### The Signature Gradient

The **`@include gradient-bg($direction)`** mixin is the brand's most recognizable mark. It emits:

```scss
linear-gradient($direction,
  color-alpha('primary',   $α),  // sapphire blue
  color-alpha('tertiary',  $α),  // ruby fuchsia (midpoint)
  color-alpha('secondary', $α)); // amethyst violet
```

Apply it with intent:

| Use | Pattern |
|---|---|
| **Gradient text (hero, brand)** | `@include gradient-bg(); -webkit-background-clip: text; background-clip: text; color: transparent;` |
| **Gradient border (`btn-outline-gradient`, `card--featured`)** | Pseudo-element + `mask-composite: exclude` trick (see `_buttons.scss`). |
| **Gradient CTA glow** | Wrap button in a `position: relative` container with an absolute, blurred gradient sibling (see `Hero.module.scss` `ctaGlow`). |
| **Background blob** | Apply to a large blurred orb (`width: 24rem; filter: blur(64px)`), not as a flat fill. |

Do not use `gradient-bg` as a body background, page background, or large flat surface — it dilutes the signature.

### 2.2 Typography

#### Font families

| Variable | Family | Source | Use |
|---|---|---|---|
| `$font-family-default` | **Caudex** (700), then Georgia, Times | next/font Google, preloaded, CSS var `--font-default` | Default for entire app — body, headings, UI |
| `$font-family-dyslexic` | **Atkinson Hyperlegible**, system-ui | next/font, lazy, CSS var `--font-dyslexic` | User opt-in via `FontContext` (a11y) |
| `$font-family-mono` | ui-monospace, SF Mono, Menlo, Consolas | system stack | `<code>`, `<pre>`, build SHA, technical content |

**Caudex** is the brand's anchor — a modern serif with Renaissance roots. Pair it with the gradient triad and you get the "Crystalline Court" identity. The font is wired via `FontContext.tsx`, which sets `--font-default` on `<html>` and supports localStorage-persisted dyslexic-font swapping.

#### Type scale (`$font-sizes` map)

`xs` 12 · `sm` 14 · `base` 16 · `lg` 18 · `xl` 20 · `2xl` 24 · `3xl` 30 · `4xl` 36 · `5xl` 48 · `6xl` 60 · `7xl` 72 · `8xl` 96 · `9xl` 128

When `$enable-fluid-type` is on (default), tokens `xl` and above return `clamp(min, intercept + slope·vw, max)` expressions interpolating between **320px** and **1280px** viewports. The `5xl → 6xl → 8xl` progression on the homepage hero `<h1>` is achieved through fluid scaling, **not** breakpoint jumps.

```scss
font-size: font-size('base');   // → 1rem
font-size: font-size('5xl');    // → clamp(2.25rem, 2rem + 1.25vw, 3rem)  (when fluid)
```

#### Weight & rhythm

- **Body** — `font-weight: normal` (400) (Caudex 700 is loaded; the loaded weight is heavy enough that we render it at "normal" for body)
- **Headings** — `font-weight('semibold')` (600) by default in `_elements.scss`; hero title uses `normal` (400) and lets the gradient carry emphasis
- **Line height** — `tight` (1.25) for headings, `normal` (1.5) for body, `relaxed` (1.625) for long-form
- **Letter spacing** — `tight` (-0.025em) for compact headings; `widest` (0.1em) for uppercase utility labels (e.g., the footer brand name)

#### Default heading scale (from `base/_elements.scss`)

```scss
h1 { font-size: font-size('5xl'); }    // ~48px static, fluid to 3rem
h2 { font-size: font-size('4xl'); }    // ~36px
h3 { font-size: font-size('3xl'); }    // ~30px
h4 { font-size: font-size('2xl'); }    // ~24px
h5 { font-size: font-size('lg'); }     // 18px
h6 { font-size: font-size('base'); }   // 16px
```

Override only with intent. Hero `<h1>` overrides up to `8xl` because the page is the brand's storefront.

### 2.3 Spacing

Unitless multipliers from `0` to `96` mapped to rem. Common values: `4` = 1rem (16px), `6` = 1.5rem (24px), `8` = 2rem, `12` = 3rem, `16` = 4rem, `20` = 5rem (hero vertical breathing).

```scss
padding: space(6) space(8);    // 24px / 32px
gap: space(4);                 // 16px
margin-top: space(20);         // 80px — hero top spacing
```

**Section rhythm:** Hero sections consistently use `padding: space(20) 0` (80px y). Mission/value sections use `space(12)` to `space(16)`. Cards use `space(6)` internal padding (`space(4)` for `--compact` modifier).

### 2.4 Breakpoints

`2xsm` 320 · `xsm` 480 · `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1440 · `3xl` 1976

Mobile-first. Hero is single-column below `lg`, two-column above. The homepage TechSphere ornament is hidden below `lg` (replaced by a smaller `.mobileOrb`).

```scss
@include respond-to('lg') { grid-template-columns: repeat(2, 1fr); }
@include respond-below('md') { display: none; }
```

### 2.5 Border radius

`none` 0 · `sm` 2px · `md` 6px · `lg` 8px (default) · `xl` 12px (cards) · `2xl` 16px · `3xl` 24px · `full` 9999px (CTA pills, logo, social icons).

Cards default to `radius('xl')`. CTAs and badges in the hero use `radius('full')` for a pill silhouette. The site logo and footer logo always use `9999px` (perfect circle).

### 2.6 Elevation

Material-3 inspired, with separate `$shadows` (light) and `$shadows-dark` (dark) maps. Use the **mixin**, not the function directly — the mixin auto-resolves dark mode:

```scss
@include shadow('md');   // ✅ correct — picks light or dark variant
box-shadow: shadow('md');// works but light-mode only
```

| Level | Use |
|---|---|
| `none` | Flat |
| `sm` | Subtle depth (1dp) — rest state for some inputs |
| `md` | **Card rest state** (3dp) — the default |
| `lg` | Hover-lift cards, popovers (6dp) |
| `xl` | Modals, mobile nav panel (12dp) |
| `2xl` | Maximum elevation, code-block surface (24dp) |

### 2.7 Motion

#### Durations (`$durations`)

`instant` 0ms · `fast` 100ms · **`normal` 150ms** (default) · `moderate` 250ms · `slow` 350ms · `slower` 500ms · `slowest` 700ms

#### Easings (`$easings`)

- `ease` `cubic-bezier(0.4, 0, 0.2, 1)` — Material standard, the default
- `ease-out` `cubic-bezier(0, 0, 0.2, 1)` — entrance (decelerating in)
- `ease-in` `cubic-bezier(0.4, 0, 1, 1)` — exit (accelerating out)
- `spring` `cubic-bezier(0.34, 1.56, 0.64, 1)` — gentle overshoot, use on hover-lift only

#### Application

```scss
@include transition((border-color, box-shadow));         // multi-prop, normal/ease
@include transition(transform, 'moderate', 'spring');    // 250ms with overshoot
```

For React-driven animation (page enter, parallax, looping orb pulses), use the `motion` library (`motion/react`). Stagger entrances with `transition={{ duration: 0.8, delay: 0.3 }}` on hero panels — this is the established pattern.

#### Reduced motion

The animations layer auto-clamps every transition and animation to `0.01ms` under `@media (prefers-reduced-motion: reduce)`. Don't override this. When using `motion`, pair page-load animations with semantic content (the `<h1>` is rendered visible on first paint; only the *container* scales).

### 2.8 Z-index scale

Never use raw z numbers. The scale:

| Token | Value | Use |
|---|---|---|
| `behind` | -1 | Background orbs, BackgroundBeams |
| `base` | 0 | Default |
| `raised` | 1 | Loading spinners |
| `content` | 10 | Content above decorative bg |
| `content-high` | 20 | Timeline connectors over content |
| `overlay-subtle` | 50 | Section-scoped overlays |
| `dropdown` | 1000 | Desktop nav dropdown |
| `sticky` | 1020 | Header (desktop) |
| `fixed` | 1030 | Header (mobile fixed top) |
| `modal-backdrop` | 1040 | Modal scrim |
| `modal` | 1050 | Modal dialog, mobile nav overlay |
| `popover` | 1060 | Popover content |
| `tooltip` | 1070 | Tooltip |
| `toast` | 1080 | Topmost — toast notifications |

### 2.9 Opacity scale

`subtle` 0.05 · `light` 0.1 · `medium` 0.2 · `semi` 0.5 · `heavy` 0.8 · `near` 0.9 · `full` 1.

Used for tinted overlays: `color-alpha('primary', opacity('light'))` = 10% sapphire wash.

### 2.10 Blur scale

`sm` 2px · `md` 4px · **`lg` 8px** (frosted glass default) · `xl` 12px · `2xl` 16px.

Orbs use bigger blurs (24–64px) outside the scale — they're decorative, not surface.

---

## 3. Theming System

Two orthogonal axes:

1. **Light vs dark** — toggled by `next-themes` setting `class="dark"` on `<html>`. Drives every CSS variable.
2. **Theme preset** — set by `useThemePreset` hook setting `data-theme-preset="<name>"` on `<html>`. Overrides `--primary`, `--secondary`, `--tertiary`, `--ring`, `--surface-elevated`.

### Available presets

| Name | Vibe | Light/dark variants |
|---|---|---|
| (default — no attribute) | **Cyan / purple / pink** — the signature look (sapphire blue is actual default `--primary`, but the *named* palette in `theme-presets.ts` previews as cyan-purple-pink) | base globals |
| `midnight` | Deep indigo → blue, elegant and dark | `_presets.scss` |
| `ocean` | Sky → cyan → teal, cool and refreshing | `_presets.scss` |
| `sunset` | Orange → red → pink, warm and vibrant | `_presets.scss` |
| `forest` | Green → emerald → teal, natural | `_presets.scss` |
| `rose` | Rose → pink → fuchsia, soft | `_presets.scss` |
| `monochrome` | Grayscale, clean | `_presets.scss` |

To add a preset:

1. Add the entry to `$theme-presets` in `src/styles/themes/_presets.scss` — both `light` and `dark` keys.
2. Add metadata to `src/lib/theme-presets.ts`.
3. Update the `ThemePresetName` type if needed.

No new JS is required — the `@each` loop in `_presets.scss` generates `[data-theme-preset="name"]` and `[data-theme-preset="name"].dark` selectors automatically.

### Custom user theme

`themePreset === "custom"` triggers runtime JS injection of CSS variables from `CustomThemeColors` (HSL strings). This is the only path that bypasses the SCSS-only model.

---

## 4. SCSS Architecture (7-1 with CSS Layers)

Entry point: `src/styles/main.scss`, imported once via `app/globals.scss`.

```
abstracts/         # SCSS helpers (NO css output) — variables, functions, mixins
base/              # Reset, element defaults, :root + .dark CSS variables
themes/            # [data-theme-preset] CSS variable overrides
animations/        # @keyframes + transition utility classes
utilities/         # Atomic helpers (.flex, .relative, .top-0, etc.)
components/        # BEM component styles (.card, .header, .footer, .desktop-nav, ...)
```

CSS `@layer` order is `base, themes, animations, utilities, components` — utilities deterministically beat base, components beat utilities. This eliminates `!important` arms races.

### File-naming and selector conventions

| Context | Convention | Example |
|---|---|---|
| **CSS Modules** (page/component-scoped, lives next to `.tsx`) | camelCase keys | `styles.cardWrapper`, `styles["section"]` |
| **Global components** (BEM, in `styles/components/`) | kebab-case BEM | `.card__header`, `.card--elevated`, `.mobile-nav__panel` |
| **Utility classes** (in `styles/utilities/`) | kebab-case | `.flex`, `.items-center` |
| **CSS custom properties** | `--` prefix, no SCSS prefix in `var()` | `var(--primary)`, `hsl(var(--ring) / 0.3)` |
| **SCSS map keys** | kebab-case strings | `'primary'`, `'2xl'`, `'tertiary'` |
| **SCSS function names** | kebab-case | `space()`, `font-size()`, `color()` |

### Module SCSS template

```scss
// MyComponent.module.scss
@use '../../styles/abstracts' as *;     // pulls in ALL helpers as bare names

.section {
  position: relative;
  padding: space(20) 0;
  background-color: color('background');
  @include shadow('md');

  @include respond-to('lg') {
    padding: space(24) 0;
  }
}

.title {
  font-size: font-size('5xl');
  font-weight: font-weight('semibold');
  letter-spacing: letter-spacing('tight');
  @include text-balance;        // prevents orphan words in headings
}

.titleGradient {
  @include gradient-bg();
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

### When to use modules vs global BEM

- **CSS Modules** (`.module.scss` next to the component) for **page-, route-, and feature-scoped** styles. The vast majority of files. Modules go in `app/<route>/_components/<Name>.module.scss` and are imported as `import styles from "./Name.module.scss"`.
- **Global BEM** (`src/styles/components/_*.scss`) only for the **chrome**: `.header`, `.footer`, `.desktop-nav`, `.mobile-nav`, `.card`, `.btn-gradient`. These are app-wide primitives consumed without an import.

Default to modules. Promote to global BEM only when a third+ page wants the same primitive.

---

## 5. Component Patterns

### 5.1 The Island pattern (Next.js App Router)

```
page.tsx          ← Server Component: data, metadata, SEO
   └ island.tsx   ← Client Component ("use client"): all interactivity
       └ _components/   ← local sub-components, also CSCs/RSCs
           └ _effects/  ← decorative client visuals (TechSphere, BackgroundBeams)
```

The page is rendered server-side; the `island` is the only interactive boundary. CSS Modules live next to the component that owns them.

### 5.2 The Hero anatomy (the brand's storefront)

Reference: `app/_components/Hero.tsx` + `Hero.module.scss`.

```tsx
<section className={styles.section}>           {/* min-height: 100vh; padding: space(20) 0 */}
  <article className={styles.article}>          {/* grid 1 → lg:2 cols, gap: space(12) */}
    <motion.div                                  {/* left: scale-in entrance */}
      initial={{scale: 0.8}} animate={{scale: 1}} transition={{duration: 0.8, delay: 0.3}}
      className={styles.content}
    >
      <h1 className={styles.title}>
        <span className={styles.titleGradient}>{title}</span>   {/* gradient-text */}
      </h1>
      <p className={styles.subtitle}>{subtitle}</p>             {/* muted-foreground */}
      <div className={styles.ctaWrapper}>                       {/* relative wrapper */}
        <div className={styles.ctaGlow} />                      {/* gradient blur sibling */}
        <Link className={styles.ctaButton}>{cta}</Link>         {/* black pill, white text */}
      </div>
    </motion.div>
    <motion.div                                  {/* right: opacity + scale */}
      initial={{opacity: 0, scale: 0.8}} animate={{opacity: 1, scale: 1}}
      className={styles.visual}
    >
      <motion.div className={styles.orbPrimary}                 {/* pulsing sapphire orb */}
        animate={{scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3]}}
        transition={{duration: 8, repeat: Infinity, repeatType: "reverse"}}
      />
      <motion.div className={styles.orbPurple} ... />            {/* pulsing ruby orb */}
      <TechSphere />                                              {/* desktop only */}
      <div className={styles.mobileAnimation}>...</div>           {/* below sm */}
    </motion.div>
  </article>
</section>
```

**Hero rules:**
- **Title is a single `<h1>`** with one `<span class={titleGradient}>` for emphasis — never multiple gradient runs.
- **Subtitle uses `color('muted-foreground')`** — never the gradient.
- **Two pulsing orbs** flank the right-hand visual at opposite corners (top-left and bottom-right), 8s and 6s loop times to avoid lockstep.
- **`BackgroundBeams`** from `@arolariu/components` renders behind the hero at `z('behind')` with `pointer-events: none`. A second instance handles the header overflow band (mask-image fade).
- **CTA glow:** absolute gradient sibling at `inset: -1px`, `radius('full')`, behind a black `border-radius: full` pill button with white text.

### 5.3 Section page rhythm

Below the hero, pages alternate:

1. **Mission / value statement** — centered, `font-size('2xl')` headline, gradient-text key phrase, body in `muted-foreground`.
2. **3-up card grid** — `responsive-grid(1, 2, 3, space(8))` of `--featured` cards or simple `border + shadow('md')` cards. Each card has icon (`@include icon-size(2.5rem)` or larger), heading, description.
3. **Stats row** — 4 columns at `lg`, large fluid numbers in `--primary`, label below.
4. **Explore further** — 2-column horizontal cards with image, title, bulleted feature list, CTA.
5. **FAQ accordion** — Radix-driven, uses `@keyframes accordion-down/up` from `_keyframes.scss`.
6. **Closing CTA** — centered headline + 2 buttons (primary + outline).

This is a **template**, not a mandate — but new about-style pages should feel familiar.

### 5.4 Cards

Three layers of card primitives:

- **`@arolariu/components`** `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter` — the shadcn-style baseline. Use this **first** when the card is generic.
- **Global BEM** `.card`, `.card__header`, `.card--featured`, `.card--elevated`, `.card--gradient-overlay`, `.card-grid` (in `styles/components/_cards.scss`) — when you need the gradient-border feature card or grid layout.
- **CSS Module ad-hoc** — for one-off card visuals (e.g., `Features.module.scss` `.card`). Avoid when a shared variant exists.

**Card hover:** Use `@include card-hover('xl', 0.3, 'primary')` — animates border-color, box-shadow, and background-color. The `--featured` modifier adds a gradient border via `mask-composite: exclude`.

### 5.5 Buttons

- **Primary action** — `@arolariu/components` `Button` (the shadcn default).
- **Gradient filled** — `.btn-gradient` (with `--sm`, `--lg`).
- **Gradient outline** — `.btn-outline-gradient` (mask-composite gradient border).
- **Icon button** — `.btn-icon` (with `--sm` 32px+44px-target, `--lg` 48px, `--ghost` no-border).
- **Link-style** — `.btn-link` (underlined, link-colored).

All buttons include `@include focus-ring` (a 2px outline of `var(--ring)` with 2px offset) and a disabled state.

### 5.6 Header, navigation, footer

- **Header** — fixed on mobile (`z('fixed')`), relative on desktop (`z('sticky')`). Brand on left (logo + uppercase wordmark), nav center (desktop) or hamburger (mobile), auth + theme on right.
- **Desktop nav** — hover-reveal dropdowns, `radius('xl')` panels, `shadow('lg')`, opacity transition.
- **Mobile nav** — slide-in 20rem panel from left, scrim at `color-alpha('foreground', 0.4)`, `z('modal')`.
- **Footer** — solid `var(--footer-bg)` (= `--primary`) slab with SVG wave on top, 3-column responsive grid (brand spans 2 cols on `lg`), white text with `primary-foreground`. Always closes the page on royal blue.

---

## 6. Decorative Motif Library

These are the recurring visual elements. Reach for them in this order before inventing new ones:

| Motif | Mixin / source | Usage |
|---|---|---|
| **Orb (blob)** | `@include orb($size, $blur, $color)` | Behind heroes, CTAs, sections; `pointer-events: none`; `position: absolute`. Size 3–24rem, blur 24–64px, color is `color-alpha('primary'/'tertiary'/'secondary', 0.2–0.3)`. |
| **Pulsing orb** | Wrap with `motion.div` and animate `{scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3]}` looping 4–8s. | Hero accent. |
| **Background beams** | `<BackgroundBeams />` from `@arolariu/components` | Full-page or header-overflow ambient lines at `z('behind')`. Mask the bottom with `mask-image: linear-gradient(...)` for fade-out. |
| **Grid pattern overlay** | `background-image: linear-gradient(color-alpha('secondary', 0.14) 1px, transparent 1px), linear-gradient(90deg, color-alpha('tertiary', 0.14) 1px, transparent 1px); background-size: 50px 50px;` | About hero, structural sections. |
| **Gradient text** | `@include gradient-bg(); -webkit-background-clip: text; background-clip: text; color: transparent;` | Wordmark, hero titles, key phrases. |
| **Gradient border** | `&::before { content: ''; position: absolute; inset: 0; padding: 2px; @include gradient-bg(); -webkit-mask: linear-gradient(white,white) content-box, linear-gradient(white,white); -webkit-mask-composite: xor; mask-composite: exclude; }` | `.btn-outline-gradient`, `.card--featured`. |
| **CTA glow** | Absolute gradient sibling at `inset: -1px`, `radius('full')`, blurred or solid behind a contrasting pill. | Hero CTA. |
| **Frosted glass** | `@include glass($blur, $opacity, $bg)` | Code-block surface (Technologies section), modal-adjacent overlays. **Not for hero.** |
| **TechSphere** | `<TechSphere />` from `app/_effects/` | Homepage right-hand ornament; aspect 1/1; max-width 600px; desktop only. |
| **SVG wave (footer)** | The `.footer__wave` SVG sits at the top of the footer (`-mt-5` → `-mt-10`). | Always include when introducing a `--footer-bg` slab on a page. |

### Anti-motifs

- ❌ **Drop shadow on text** — use gradient text instead.
- ❌ **Multiple gradients per section** — one signature gradient run per visual block.
- ❌ **Pure white panels on white background** — surfaces need `border` (`color('border')`) or elevation (`@include shadow('md')`).
- ❌ **Random emoji or icon noise** — icons come from `lucide-react` (consumed via the component library). One icon per card header, optionally one per list item.

---

## 7. Motion Vocabulary

### 7.1 Principles

1. **Stagger, don't simultaneously fire.** Hero left and hero right both animate with `delay: 0.3`, but their inner orbs and visuals start later (`0.6`+).
2. **Loop atmosphere, transition states.** Background orbs loop forever (`repeat: Infinity, repeatType: "reverse"`). Hover transitions use `'normal'` (150ms) duration with `ease`.
3. **Translate small, scale gentle.** Hover-lift is `-2px` to `-4px` translateY; scale changes are `0.95–1.0` or `1.0–1.2`. No flips, no 360° spins (except `<Loader />`).
4. **Spring is for delight, not for state change.** Reserve `spring` easing for hover-lift on featured cards.

### 7.2 Library choice

- **CSS / SCSS** — for hover, focus, single-state transitions. Use `@include transition()`.
- **Motion** (`motion/react`) — for entrance animations, looping atmosphere, staggered reveals, scroll-driven effects. **Always preferred over Framer Motion v11/lower** — `motion` is the project standard.

### 7.3 Reduced motion

Already enforced globally — the animations layer clamps every transition to `0.01ms` under `prefers-reduced-motion: reduce`. When using `motion`, you don't need to manually respect the preference *for transitions*; you do need to ensure that **content is not hidden behind opacity-0 entrances** that would never resolve. The hero's `<h1>` is rendered normally; only the *container* scales — that pattern is correct.

---

## 8. Accessibility

These are not optional polish; they are part of the brand's craft.

| Concern | Provision |
|---|---|
| **Reduced motion** | Auto-clamped via `_transitions.scss` under `prefers-reduced-motion`. |
| **High contrast** | `prefers-contrast: more` and `forced-colors: active` overrides in `_globals.scss` raise border opacity and shift link colors. |
| **Reduced transparency** | `@include reduced-transparency` mixin available — provide solid backgrounds for frosted-glass surfaces inside the wrapper. |
| **Dyslexia** | `FontContext` allows users to swap to Atkinson Hyperlegible. Persist to `localStorage`, sync across tabs via storage events. |
| **Focus rings** | Every interactive element gets `@include focus-ring` (2px `--ring` outline, 2px offset). |
| **Touch targets** | Icon buttons `--sm` (32px visual) expand their hit area to 44px via an `::after` overlay. |
| **Semantic HTML** | Always use `<header>`, `<main>`, `<nav>`, `<section>`, `<article>`, `<footer>`. Headings are sequential. |
| **Alt text** | Every `<Image>` requires alt text from i18n (`Common.accessibility.*`). |
| **Print** | `@if $enable-print-styles { @media print { display: none; } }` hides chrome on print. |

---

## 9. The Agent's Build Checklist

When asked to build a new page, section, or component:

1. **Scope** — Is this a new page, a section in an existing page, a reusable global, or a route-local component? Default to route-local + CSS Module.
2. **Server vs client** — Is it interactive? If no, `page.tsx` is a Server Component returning the structure. If yes, the interactivity goes in `island.tsx` (`"use client"`) and `page.tsx` thinly delegates.
3. **Tokens, not values** — Pull the SCSS abstracts (`@use '../../styles/abstracts' as *;`) and write only `space()`, `color()`, `font-size()`, `radius()`, `shadow()`, `duration()`, `easing()`, etc. Reject any literal except `0`, `1px`, `100%`, and percentages.
4. **Reach for existing motifs first** — orb, gradient-bg, glass, card-hover, hover-lift, gradient text. Only invent when truly missing.
5. **Compose responsive layouts with `respond-to`** — never write raw `@media (min-width: 768px)`.
6. **Wire animations through `motion`** for entrance/loop, through `@include transition()` for state.
7. **Confirm dark mode** — the `.dark` class auto-flips CSS variables; manual `@include dark { ... }` only when a property doesn't pick up via tokens (e.g., gradient-overlay opacity).
8. **Confirm accessibility** — focus rings, alt text, semantic landmarks, motion-safe.
9. **Tests collocated** — `Foo.test.tsx` next to `Foo.tsx`. Stories `Foo.stories.tsx` likewise. (A11y snapshot tests live at `app/aria-snapshots.spec.tsx`.)
10. **Run only `npm run test:unit`** — the user runs lint, build, e2e, and dotnet manually.

### Adding a new section to an existing page (worked example)

```bash
sites/arolariu.ro/src/app/about/_components/NewSection.tsx           # the component
sites/arolariu.ro/src/app/about/_components/NewSection.module.scss   # the styles
sites/arolariu.ro/src/app/about/_components/NewSection.stories.tsx   # Storybook
sites/arolariu.ro/src/app/about/_components/NewSection.test.tsx      # Vitest (if any logic)
```

Then import it in `app/about/island.tsx` (the client island). Add translation keys in `messages/en.json` (and `ro.json`, `fr.json`) under `About.newSection.*`. Run `npm run generate:i18n` to sync if needed.

---

## 10. Quick reference cheat sheet

```scss
// Always at the top of a *.module.scss
@use '../../styles/abstracts' as *;

// Tokens you'll reach for daily
color('primary')               color-alpha('primary', 0.1)    static-color('white')
font-size('5xl')               font-weight('semibold')         line-height('tight')
letter-spacing('tight')        space(8)                        breakpoint('lg')
z('content')                   radius('xl')                    shadow('md')
duration('normal')             easing('ease')                  blur-size('lg')
opacity('semi')

// Mixins you'll reach for daily
@include respond-to('lg')              @include respond-below('md')
@include flex-center                   @include flex-between
@include grid(3, space(6))             @include responsive-grid(1, 2, 3, space(8))
@include shadow('md')                  @include transition((border-color, box-shadow))
@include hover-lift(-2px)              @include card-hover('lg', 0.3, 'primary')
@include gradient-bg()                 @include glass(8px, 0.5, 'card')
@include text-balance                  @include truncate                @include line-clamp(3)
@include focus-ring                    @include orb(10rem, 48px, color-alpha('primary', 0.2))
@include dark { ... }                  @include reduced-motion { ... } @include reduced-transparency { ... }

// The signature hero gradient text
.titleGradient {
  @include gradient-bg();
  -webkit-background-clip: text; background-clip: text;
  color: transparent;
}
```

```tsx
// The signature pulsing orb
<motion.div
  className={styles.orb}
  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
  transition={{ duration: 8, repeat: Infinity, repeatType: "reverse" }}
/>

// The signature staggered hero entrance
<motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}
  transition={{ duration: 0.8, delay: 0.3 }}>
  ...
</motion.div>
```

---

## 11. References

- **SCSS abstracts** — `src/styles/abstracts/` (`_config.scss`, `_colors.scss`, `_typography.scss`, `_variables.scss`, `_mixins.scss`)
- **Base layer** — `src/styles/base/_globals.scss` (CSS variables), `_elements.scss` (HTML defaults)
- **Theme presets** — `src/styles/themes/_presets.scss` + `src/lib/theme-presets.ts`
- **Animations** — `src/styles/animations/_keyframes.scss`, `_transitions.scss`
- **Global components** — `src/styles/components/_*.scss`
- **Hero reference** — `src/app/_components/Hero.tsx` + `Hero.module.scss`
- **Decorative effects** — `src/app/_effects/TechSphere.tsx`, `BackgroundBeams` from `@arolariu/components`
- **Font wiring** — `src/contexts/FontContext.tsx`
- **Provider stack** — `src/app/providers.tsx` (auth → font → theme → translation)
- **Project conventions** — `CLAUDE.md` and `AGENTS.md` at the repository root

When the SCSS source and this document disagree, **the SCSS source wins** — file an update to this document so the drift is recorded.
