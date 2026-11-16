---
name: arolariu.ro
description:
  Visual system of Alexandru-Razvan Olariu's personal platform and invoice domain. Royal blue, magenta and violet on paper-white and true
  black, set in Caudex, with a wireframe-globe hero and gradient headlines.
colors:
  primary: "hsl(221.2 83.2% 53.3%)"
  primary-foreground: "hsl(210 40% 98%)"
  secondary: "hsl(262 94% 52%)"
  secondary-foreground: "hsl(0 0% 100%)"
  tertiary: "hsl(330 92% 46%)"
  tertiary-foreground: "hsl(0 0% 100%)"
  background: "hsl(0 0% 100%)"
  foreground: "hsl(222.2 84% 4.9%)"
  surface-elevated: "hsl(210 40% 98%)"
  inverse-surface: "hsl(222.2 47.4% 11.2%)"
  muted: "hsl(210 40% 96.1%)"
  muted-foreground: "hsl(215.4 16.3% 46.9%)"
  border: "hsl(214.3 31.8% 91.4%)"
  border-strong: "hsl(214.3 31.8% 82%)"
  success: "hsl(142 71% 35%)"
  warning: "hsl(38 92% 40%)"
  info: "hsl(199 89% 38%)"
  destructive: "hsl(0 84.2% 60.2%)"
  destructive-foreground: "hsl(210 40% 98%)"
  library-primary: "oklch(0.488 0.243 264.376)"
typography:
  display:
    fontFamily: "Caudex, Georgia, 'Times New Roman', serif"
    fontSize: 6rem
    fontWeight: 400
    lineHeight: 1.25
  headline:
    fontFamily: "Caudex, Georgia, 'Times New Roman', serif"
    fontSize: 2.25rem
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "Caudex, Georgia, 'Times New Roman', serif"
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Caudex, Georgia, 'Times New Roman', serif"
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Caudex, Georgia, 'Times New Roman', serif"
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1.5
  code:
    fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace"
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: 2px
  md: 6px
  lg: 8px
  xl: 12px
  2xl: 16px
  3xl: 24px
  full: 9999px
spacing:
  "1": 0.25rem
  "2": 0.5rem
  "3": 0.75rem
  "4": 1rem
  "6": 1.5rem
  "8": 2rem
  "12": 3rem
  "16": 4rem
  "20": 5rem
  "24": 6rem
components:
  button-cta:
    backgroundColor: "#000000"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: 12px 32px
  button-library:
    backgroundColor: "{colors.library-primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: 11.2px
  card-feature:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: 32px
  theme-toggle:
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    size: 40px
  header:
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    height: 64px
  footer:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.body}"
  code-block:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    typography: "{typography.code}"
    rounded: "{rounded.lg}"
---

# Design System: arolariu.ro

## Overview

**Creative North Star: "The Jewel Atelier"** (formerly "Crystalline Court")

The site is a craftsman's studio bench. A cut gem sits on clean paper under a single light: that is the whole picture. The paper is white
(or true black in dark mode) and almost everything else is restraint. The gem is the wireframe globe in the hero. The light is a pair of
blurred orbs and one gradient that runs royal blue, then magenta, then violet. The setting is a thin gradient rim around the one call to
action on the page. Nothing else needs to shout, because the bench is quiet.

The system serves two moods under one identity. The marketing and about surfaces are expressive: large Caudex headlines, animated
backgrounds, the globe. The invoice domain is an operating surface: cards, tables, tabs and dialogs that borrow the same palette, radii and
type but stay calm. Expression is a property of the page, never of a data row.

**Key Characteristics:**

- Paper and ink neutrals carry the layout; color is rationed to the blue, magenta and violet triad plus four intent colors.
- One serif family (Caudex) for everything, loaded in a single bold face. The warmth comes from the letterforms, not from weight changes.
- Soft, wide depth: large low-contrast shadows on cards and blurred orbs behind content. Hard, tight shadows are absent.
- A gradient is a signature, not a fill: headline text and the rim of the primary call to action.
- Six named theme presets re-tint the triad without touching the layout, and a user-defined custom preset swaps the primary color (the
  gradient's first stop), so every color must reach the screen through a token.
- Light and dark are both first-class. Dark is true black with lifted, pastel versions of the triad.

### Named Rules

**The Paper-and-Ink Rule.** Large surfaces are background or surface only. Never paint a section with a brand color; the only brand-filled
slab on the page is the footer.

**The One Gradient Rule.** The primary, tertiary, secondary gradient appears as headline text or as a 1px call-to-action rim, and once per
viewport. It is never a button fill, a card background or a divider.

**The Soft Light Rule.** Depth is wide and quiet. Use the elevation scale below and blurred orbs; do not add dark, tight or colored drop
shadows.

**The Single Face Rule.** Caudex ships in one bold face, so every weight renders as that face. Do not rely on `font-weight` to build
hierarchy; build it with size, color and spacing.

**The Token Reach Rule.** Colors reach the screen through the token layers. A literal hex in a component breaks presets and dark mode. The
hero call to action (`black` on `white`) is the one documented literal; treat it as debt, not precedent.

## Colors

The palette is a neutral bench plus a three-color triad. All values below are the **light** theme and match the HSL channel tokens in the
site stylesheet; dark counterparts follow in a table. Names describe the role; exact values sit in parentheses.

### Primary

- **Royal Blue** (`hsl(221.2 83.2% 53.3%)`, about `rgb(37 99 235)`): the brand anchor. Used for focus rings, text selection, the footer slab
  and the leading stop of the gradient. On white it measures 5.2:1, so it is safe for text and icons on paper.
- **Royal Blue Foreground** (`hsl(210 40% 98%)`): text and icons placed on Royal Blue. Measured at 4.94:1 against the footer slab.
- **Library Blue** (`oklch(0.488 0.243 264.376)`): the deeper blue that the shared component library uses for its own primary fill. It is a
  second blue next to Royal Blue; see the Two-Blues Rule.

### Secondary

- **Ultraviolet** (`hsl(262 94% 52%)`): the closing stop of the gradient and the link hover color. Its foreground is white
  (`hsl(0 0% 100%)`).

### Tertiary

- **Magenta Flame** (`hsl(330 92% 46%)`, about `rgb(225 9 117)`): the default link color in light mode and the middle gradient stop. It
  measures 4.67:1 on white. Its foreground is white (`hsl(0 0% 100%)`).

### Neutral

- **Paper** (`hsl(0 0% 100%)`): page and card background.
- **Ink** (`hsl(222.2 84% 4.9%)`, about `rgb(2 8 23)`): body text and headings.
- **Slate Wash** (`hsl(210 40% 96.1%)`): muted fills, code blocks, quiet chips.
- **Slate Mist** (`hsl(215.4 16.3% 46.9%)`): secondary text.
- **Cloud** (`hsl(210 40% 98%)`): the elevated surface for stacked panels.
- **Midnight Slate** (`hsl(222.2 47.4% 11.2%)`): the inverse surface, for dark panels inside a light page.
- **Hairline** (`hsl(214.3 31.8% 91.4%)`) and **Hairline Strong** (`hsl(214.3 31.8% 82%)`): borders and dividers. Use the strong one when a
  border must survive on a tinted surface.

### Intent

- **Success Green** (`hsl(142 71% 35%)`), **Amber Warning** (`hsl(38 92% 40%)`), **Info Cyan** (`hsl(199 89% 38%)`) and **Alert Red**
  (`hsl(0 84.2% 60.2%)`, foreground `hsl(210 40% 98%)`). Success, warning and info take white text in light mode and black text in dark
  mode.
- **Known contrast gap:** in light mode these pairs measure 3.70:1 (success), 3.29:1 (warning), 4.36:1 (info) and 3.59:1 (destructive),
  below the 4.5:1 floor for normal text. They clear only the 3:1 bar for large text and non-text indicators. Do not copy them as normal-text
  pairings; existing uses such as the delete button in `DeleteScanDialog.module.scss` are recorded gaps, not approved patterns. The
  dark-mode pairs clear 8.7:1 or more.

### Dark Theme Counterparts

Dark mode is true black with lifted triad colors. Values are HSL channels from the same token layer.

| Role                     | Light                                        | Dark                                         |
| ------------------------ | -------------------------------------------- | -------------------------------------------- |
| background               | `0 0% 100%`                                  | `0 0% 0%`                                    |
| foreground               | `222.2 84% 4.9%`                             | `0 0% 100%`                                  |
| surface / elevated       | `0 0% 100%` / `210 40% 98%`                  | `0 0% 4%` / `0 0% 8%`                        |
| card and popover         | `0 0% 100%`                                  | `0 0% 5%`                                    |
| primary                  | `221.2 83.2% 53.3%`                          | `214 100% 47%`                               |
| secondary                | `262 94% 52%`                                | `268 96% 80%`                                |
| tertiary                 | `330 92% 46%`                                | `336 94% 76%`                                |
| muted / muted foreground | `210 40% 96.1%` / `215.4 16.3% 46.9%`        | `0 0% 15%` / `0 0% 75%`                      |
| border / border strong   | `214.3 31.8% 91.4%` / `214.3 31.8% 82%`      | `0 0% 25%` / `0 0% 35%`                      |
| success / warning / info | `142 71% 35%` / `38 92% 40%` / `199 89% 38%` | `142 71% 55%` / `38 92% 55%` / `199 89% 55%` |
| destructive              | `0 84.2% 60.2%`                              | `0 62.8% 30.6%`                              |
| link color               | tertiary                                     | secondary                                    |

### Named Rules

**The Triad Rule.** Blue, magenta and violet are the only chromatic brand colors. A fourth hue must be an intent color with a job (success,
warning, info, destructive) and must never decorate.

**The Preset Rule.** The triad is a theme, not a constant. Six presets (midnight, ocean, sunset, forest, rose, monochrome) replace
`primary`, `primary-foreground`, `secondary`, `tertiary`, the ring and the elevated surface in both modes (in light mode the elevated
surface becomes a preset-tinted dark), and the footer follows `primary`. Never describe the footer as "blue" in copy or tests; describe it
as the primary color.

**The Two-Blues Rule.** Site components read the HSL tokens (Royal Blue); components from `@arolariu/components` read their own `--ac-*`
tokens (Library Blue). They are close but not equal. Do not place a library button directly beside a site element that must match it
exactly; override the library token on the consuming surface if a match is required.

**The Contrast Floor Rule.** Text must clear 4.5:1 against what is actually behind it, including blurred orbs and animated beams. Slate Mist
on Slate Wash measures about 4.3:1 and fails, so set text on muted fills in Ink. High contrast and forced-colors preferences darken the
foreground and strengthen borders; do not override them.

## Typography

**Display and Body Font:** Caudex (with Georgia and Times New Roman as fallbacks), loaded through `next/font` in the 700 face only.
**Accessibility Font:** Atkinson Hyperlegible, loaded on demand when the visitor chooses the dyslexic-friendly option. **Mono Font:** the
system monospace stack (`ui-monospace`, `SF Mono`, `Menlo`, `Consolas`).

**Character:** A bookish old-style serif that makes a software portfolio feel hand-set. At display size the high-contrast letterforms read
as jewelry engraving; at body size the single bold face reads as warm and confident. The cost is density, which the generous line height
pays back.

### Hierarchy

- **Display** (hero h1, 400 requested, 6rem on wide screens, 1.25 line height): the gradient headline. It steps down through 2.25rem, 3rem,
  3.75rem and 6rem as the viewport grows.
- **Headline** (h2, 2.25rem fluid, 1.25): section titles. Fluid between a smaller size at 320px and the stated size at 1280px.
- **Title** (h4 and card titles, 1.5rem fluid, 1.25): card and panel headings. Heading tokens use a semibold request.
- **Body** (1rem, 1.5): paragraphs, with 1rem of space after each. Keep lines under about 65 to 75 characters.
- **Label** (0.75rem, 500 requested): button text and compact controls, as sampled on the library `Button`.
- **Code** (0.875rem, mono): inline and block code on Slate Wash.

### Named Rules

**The Fluid Heading Rule.** Headings use the fluid size tokens, which interpolate continuously between 320px and 1280px. Do not add
breakpoint jumps for heading sizes.

**The Dyslexic-Safe Rule.** Every layout must survive the swap to Atkinson Hyperlegible, which has different metrics than Caudex. Test with
the font toggled before shipping a tight layout.

## Layout

The site is a centered, mobile-first column system. Spacing is a rem scale on a 4px base; sections breathe with generous vertical padding,
and cards pack tightly inside that air.

- **Spacing scale (`space()` keys, each key is 0.25rem):** 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28,
  32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96. So `space(4)` is `1rem` and `space(96)` is `24rem`. The keys have fractional steps and
  gaps; use a listed key rather than assuming every integer exists.
- **Breakpoints:** 2xsm 320, xsm 480, sm 640, md 768, lg 1024, xl 1280, 2xl 1440, 3xl 1976 (pixels). Design mobile first and add upward.
- **Shell:** a 64px header (4rem plus the top safe-area inset) with a page-background fill, fixed below `lg` and in flow from `lg`, the
  page, then the footer slab. A bottom bar (Home, Scan, Invoices, Profile) appears on every invoice route below `md`.
- **Hero:** full viewport height, 5rem vertical padding, one column on small screens and two columns from `lg`, with the globe on the right.
- **Horizontal overflow:** the root clips horizontal overflow so decorative orbs and beams never create a sideways scrollbar.
- **Layering:** behind -1, base 0, raised 1, content 10, content-high 20, overlay-subtle 50, dropdown 1000, sticky 1020, fixed 1030, modal
  backdrop 1040, modal 1050, popover 1060, tooltip 1070, toast 1080. Use the named layer, never a bare number.

### Named Rules

**The Breathing Section Rule.** Marketing sections get 5rem or more of vertical padding; invoice operating surfaces stay tighter so data
stays in view. Do not give a table the spacing of a hero.

**The No-Sideways-Scroll Rule.** The root clips horizontal overflow so decorative orbs and beams never create a sideways scrollbar. Keep
decorative layers absolutely positioned inside their section, and never rely on the clip to hide real content.

## Elevation & Depth

Depth is atmospheric. Cards sit on paper with a hairline border and a large, low-opacity shadow; the background carries blurred orbs, grid
patterns and animated beams that read as light behind the glass.

| Level | Light                                                                 | Dark                                                                  |
| ----- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| sm    | `0 1px 2px 0 rgb(0 0 0 / 0.05)`                                       | `0 1px 2px 0 rgb(0 0 0 / 0.3)`                                        |
| md    | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`    | `0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3)`    |
| lg    | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`  | `0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.3)`  |
| xl    | `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)` | `0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.3)` |
| 2xl   | `0 25px 50px -12px rgb(0 0 0 / 0.25)`                                 | `0 25px 50px -12px rgb(0 0 0 / 0.6)`                                  |

- **Cards:** hairline border plus the `2xl` shadow at rest on the marketing cards (measured live). Dense operating surfaces should stay on
  the smaller steps; the `hover-lift` helper raises a card by 2px and moves it to the `lg` shadow.
- **Orbs:** circular blurs (about 10rem wide, 48px blur) filled with the primary or tertiary color at 20% opacity, placed behind content.
- **Frosted surfaces:** a 2 to 12px backdrop blur (the auth panels use a raw 12px) on a translucent card surface (the home code block uses
  2px at 30% card opacity; the About pillar cards use 8px at 50%; invoice overlays and toolbars use 8px). Use the `backdrop-blur` helper;
  the `glass` helper exists but has no consumer today.
- **Blur scale:** 2, 4, 8, 12 and 16px. Opacity scale: 0.05, 0.1, 0.2, 0.5, 0.8, 0.9 and 1.

### Named Rules

**The Orb Contrast Rule.** An orb or beam is decoration under content. If body text crosses one, give the text a surface or move the orb. Do
not tune the orb color to make a lone page pass.

**The Glass Floor Rule.** A translucent surface must stay readable over the busiest thing behind it. If text on a frosted card fails
contrast over an orb, a beam or a grid, raise the surface opacity; do not remove the border or the text weight.

## Shapes

Shapes are soft but not bubbly. The site stylesheet defaults to an 8px radius; cards step up to 12px; call-to-action and toggle controls are
full pills. The shared component library rounds its controls from a 14px base radius, which yields 11.2px on `Button`.

- **Small** (2px, 6px): chips, badges, code spans.
- **Default** (8px): inputs, code blocks, tabs.
- **Card** (12px): feature and invoice cards.
- **Panel** (16px, 24px): dialogs and large panels.
- **Pill** (9999px): the hero call to action, the theme toggle and avatars.

### Named Rules

**The Two-Radius-Layers Rule.** Site components use the stylesheet scale; library components use the library's derived scale. Do not
hand-tune a library control to match a site card; wrap or compose instead.

## Components

### Buttons

- **Shape:** the hero call to action is a full pill, 12px by 32px of padding, white text on black, framed by a 1px gradient rim. Library
  buttons use the 11.2px radius and the Library Blue fill with 12px, 500-weight text.
- **Primary:** one filled action per view. In invoice flows this is the confirm or create action.
- **Focus:** a 2px ring in the ring color with a 2px offset on site elements (the library button uses an inset offset), drawn on
  `:focus-visible` only.
- **Disabled and busy:** keep the layout stable; long actions should show a busy state and an announced result.

### Cards

- **Corner style:** 12px.
- **Background:** Paper, with the elevated surface for nested panels.
- **Shadow:** see Elevation; marketing cards use `2xl`, operating cards use `sm` with a `lg` lift.
- **Border:** 1px Hairline. The `card-hover` helper tints it toward the primary color at 30% opacity on hover for interactive cards.
- **Internal padding:** 32px on the marketing feature cards (measured live).

### Navigation

- **Header:** 64px with an opaque page-background fill (`hsl(var(--background))`). The brand mark and name sit on the left; **Domains** and
  **About** sit in the center; Sign in and the theme toggle sit on the right.
- **Mobile:** a menu button opens a navigation panel with expandable groups; below `md`, every invoice route adds a four-item bottom bar
  from the shared invoices layout.
- **Theme toggle:** a 40px circular outline button that switches light and dark directly. There is no menu.
- **Command palette:** **Ctrl or Cmd plus K** opens a palette for navigation, theme, language, accessibility font and a few playful effects.
  It is feature-flagged and may be absent in an environment.
- **Footer:** a Royal Blue slab with a wavy top edge, two link columns (subdomains and about), social icons, the build date, the commit SHA
  and an uppercase wordmark.

### Inputs, Tabs and Dialogs

- **Tabs** switch peer views without a page load (for example invoices, statistics and live analysis).
- **Dialogs** hold focused tasks (import, export, share, delete, rename) and must carry a labelled close control. The library dialog takes a
  `closeLabel` for this purpose.
- **Fields** use Hairline borders, the ring color on focus and visible labels; errors pair color with text.

### Feedback

- **Toasts** appear in one labelled notification region and sit on the toast layer. Success, info and neutral toasts auto-dismiss after 5
  seconds (`DEFAULT_CONFIRMATION_TIMEOUT_MS` in `src/lib/notify.ts`); errors, warnings and loading toasts stay until the visitor closes
  them.
- **Skeletons** are the loading pattern: route loading files for the invoice flows mirror the final layout instead of showing a spinner.
- **Empty states** explain what is missing and offer the next action, such as uploading a first receipt.

### Icons

Icons come from the Tabler set through `react-icons/tb` (`Tb*` components). Use one icon per action or card header, and give every icon-only
control a localized accessible name.

### Signature: The Gem and the Glow

The wireframe globe (a Three.js WebGL scene of faceted lines and drifting points) is the one illustration that belongs only to this site. It
stops rendering while off screen, while the tab is hidden and under a reduced-motion preference. Pair it with the two orbs and the gradient
headline, and keep the rest of the page calm.

### Motion and Interaction

Motion confirms and orients; it does not decorate content that is trying to be read.

- **Durations:** 0, 100, 150, 250, 350, 500 and 700ms. The default is 150ms; 500ms and 700ms are defined for entrances and page-level moves
  but are not yet consumed in SCSS.
- **Easing:** the standard curve `cubic-bezier(0.4, 0, 0.2, 1)` for most motion, `ease-out` `cubic-bezier(0, 0, 0.2, 1)` for entering
  elements, and a spring `cubic-bezier(0.34, 1.56, 0.64, 1)` for playful confirmations.
- **Scroll reveal:** sections fade and rise once as they enter the viewport. Reveals are one-shot on most pages.
- **Reduced motion:** a global `*` rule in `animations/_transitions.scss` collapses CSS animation and transition durations under
  `prefers-reduced-motion`, and the globe stops animating. The `motion/react` reveals are not covered by those helpers (no global motion
  configuration is set), so each reveal needs its own reduced-motion handling.

### Named Rules

**The One Primary Rule.** One filled primary action per view. A second filled action competes with the first; make it an outline or ghost.

**The Focus Always Rule.** Every interactive element has a visible `:focus-visible` ring. Never remove the outline without replacing it.

## Do's and Don'ts

### Do:

- **Do** reach for tokens: `var(--primary)`, `var(--foreground)`, the spacing, radius and shadow scales, and the library's `--ac-*`
  variables inside library components.
- **Do** test every new surface in light and dark, with at least two presets, with the dyslexic font on, and with a reduced-motion
  preference.
- **Do** write the gradient on headline text with a transparent text fill and a solid fallback color, and keep it to one headline per view.
- **Do** give every control a visible focus ring, a comfortable touch target on mobile (44px preferred) and an accessible name.
- **Do** build hierarchy with size, color and spacing, because the single Caudex face ignores weight.
- **Do** localize all user-facing strings in English, Romanian and French and test with the longest translation.

### Don't:

- **Don't** use a brand color as a section background. The footer is the only slab.
- **Don't** fill a button, card or divider with the gradient.
- **Don't** put body text over an orb, beam or grid without a surface behind it.
- **Don't** hard-code hex or HSL in a component, except where a documented token gap forces it.
- **Don't** add tight, dark or colored drop shadows, glow outlines on text, or a fourth brand hue.
- **Don't** leave text on a translucent surface without checking it over the orbs, beams and grid behind it.
- **Don't** claim the footer is blue, or that body weight is 400; presets and the single bold face make both statements false.
- **Don't** add a second filled primary action to a view.
