# 📋 Release History

> **Stay updated with the latest improvements, features, and fixes!**

All notable changes to **@arolariu/components** are documented here following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
format and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## 🎉 Latest Releases

### [3.0.0] - Unreleased

**💥 Breaking Changes**

- Require React and ReactDOM 19; package-owned DOM refs are ordinary typed props with callback cleanup.
- Remove all `asChild` APIs, scalar Accordion/type adapters, Checkbox's legacy indeterminate shorthand, Tooltip delay aliases, obsolete
  navigation/anchor parts, no-op compatibility props, deprecated color aliases, Flip's misspelling and Cell.
- Deduplicate merged-ref identities and prevent obsolete attachment disposers from detaching replacement nodes.
- Preserve automatic NavigationMenu and Drawer anatomy through actual opaque React Flight render transport.
- Target applicable WCAG 2.2 A/AA with native/primitive keyboard and focus behavior, localized generated controls, corrected default token
  contrast and bounded/controllable motion. Ship ACCESSIBILITY with explicit consumer responsibilities and native/AT evidence limits.
- CommandDialog supplies only the modal shell; include exactly one explicit `Command` root (v2.4 created it automatically). Native
  substring/custom-score matching is retained, not a cmdk implementation.
- Command keeps and navigates the consumer's rendered order inside CommandList, including memoized-row reorders that re-render no Command
  part: no reordering unless filtering, score order with rendered-order ties while filtering, and rendered order restored afterwards. Each
  CommandItem/CommandGroup renders a hidden, empty `data-command-anchor` span as its first DOM node; consumer
  `:first-child`/`:nth-child`/adjacent-sibling selectors over Command parts must account for it. Alt+arrows move to the next or previous
  group boundary in that visual order, nested groups included, without reversing or cycling. After a memoized-row move, keyboard order
  catches up in the commit the list observer schedules (a brief, normally sub-frame window); content, text and attribute changes inside
  options never trigger a re-read.
- Button props are a naming union: icon sizes (`icon`, `icon-xs`, `icon-sm`, `icon-lg`) require a string `aria-label` or `aria-labelledby`,
  and `interface X extends ButtonProps` (likewise `InputGroupButtonProps`, `AlertDialogActionProps` and `SidebarTriggerProps`) fails with
  TS2312; use `type X = ButtonProps & {…}`. Links are native anchors styled with `buttonVariants()`, not Button render targets;
  `nativeButton={false}` is for non-link targets such as a `<div>`. A real anchor with the `link` variant stays underlined at rest, while
  `<Button variant="link">` underlines on hover.
- The pure class helpers `badgeVariants`, `buttonVariants`, `buttonGroupVariants`, `markerVariants`, `navigationMenuTriggerStyle`,
  `tabsListVariants` and `toggleVariants` live in directive-free modules that the package root re-exports, so Server Components can call
  them through `@arolariu/components`; in v2.4 only `badgeVariants` was callable there, and `markerVariants` and `tabsListVariants` are new.
  Component subpaths such as `@arolariu/components/button` still export them from `"use client"` modules, where they are client references:
  import them from a subpath only in Client Components. The `badge` subpath is now one of those client modules (v2.4's was directive-free),
  so a Server Component that called `badgeVariants` from `@arolariu/components/badge` must import it from the root.
- Carousel props are a naming union: pass a localized `aria-label` or `aria-labelledby` (preferably the `id` of a visible heading); v2.4
  rendered an unnamed `role="region"`. `interface X extends CarouselProps` fails with TS2312, so use `type X = CarouselProps & {…}`. Under
  `prefers-reduced-motion: reduce`, transitions are instant through a `duration: 0` the carousel adds to
  `opts.breakpoints["(prefers-reduced-motion: reduce)"]` (keeping a caller entry's other options and outranking other breakpoints'
  `duration`); the caller's or Embla's default `duration` returns when the preference clears.
- `toast` is a Base UI manager, not the callable status facade: use `toast.add`/`update`/`close`/`promise` with canonical
  `timeout`/`limit`/`type`/`actionProps`. `Toast` is a component; notification data is `ToastData`/`ToastObject`.
- Toast `timeout` defaults to `0` (persistent; v2.4's `duration` defaulted to 5000 ms), so pass `timeout` to keep auto-dismissal. The
  ready-made close control is named by Toaster `closeLabel` (default `"Close toast"`, was `"Close notification"`). Facade options are
  removed: `closeButton` (the control is always rendered; compose Toast parts to change it), `containerAriaLabel`
  (`viewportProps["aria-label"]`), `toastOptions` (no default-options merge), `cancel` (compose Toast parts), `onDismiss`/`onAutoClose`
  (per-toast `onClose`/`onRemove`, which report no cause), `toast.custom` (compound composition with typed `data`) and `toast.getHistory`
  (no replacement). MIGRATION maps every v2.4 Toaster and per-toast option.
- Automatic motion in the visual effects settles five seconds after mount unless `loop`, which requires a caller-supplied, localized pause
  control that sets `motionPaused`. While paused, FireworksBackground draws a deterministic static starburst: the fixed color or the first
  palette entry at the `particleSize` midpoint. Skeleton pulses twice (four seconds) instead of indefinitely.
- New generated, localizable controls: ResizableHandle renders native −/+ step buttons after each separator (two extra tab stops;
  `decreaseLabel`, `increaseLabel`, `resizeStep`); FireworksBackground renders a native launch button (`launchLabel`) that stays available
  after automatic launches settle and in `population={0}` click-only mode, and is `aria-disabled` (still focusable) under reduced motion,
  `motionPaused` or a hidden document; Scratcher renders a reveal button and a completion status (`revealLabel`, `completedLabel`); after
  the reveal the button stays focusable and is `aria-disabled` (activation ignored) until the card resets. PaginationPrevious/PaginationNext
  are named by their visible `text` (`"Previous"`/`"Next"`), and collapsed SidebarMenuButton tooltips open without delay (`delay={0}` on
  their own trigger; v2.4 used Base UI's 600 ms default), while other tooltips are unaffected.
- `TooltipProvider` is Base UI's provider (v2.4's was a pass-through that ignored `delayDuration`): its `delay`, `closeDelay` and `timeout`
  (default 400 ms) now apply to the tooltips inside it, and a tooltip there opens instantly when another closed less than `timeout` earlier.
  Wrapping an app in `<TooltipProvider>` therefore changes its tooltip timing.
- `ResizableHandle` step buttons sit at least 11px clear of the 1px separator, so presses on them never start a drag while the group's
  `resizeTargetMinimumSize` is at most 22px (the defaults are 10px fine / 20px coarse); keep that clearance through the `data-slot` hooks if
  you widen the separator or the hit area. In vertical groups − sits above and + below the line. Their container is excluded from the
  primitive's hit-region scan (`data-resize-preview`), so separator presses keep focus, the `active` state and double-click reset. New
  `withControls` opt-out and `data-slot` hooks; pointerdown on the controls propagates normally. Scope consumer `[data-resize-preview]`
  styles to the primitive's own preview overlays.
- New `--ac-primary-emphasis` token (light `oklch(0.488 0.243 264.376)`, dark `oklch(0.7 0.14 265.638)`) for primary text, icons and value
  indicators on neutral surfaces: Badge `link` text, the active Stepper number, Accordion hover text, the Progress/Meter fills, the Slider
  range fill and NumberField scrubbing text use it. Themes that override `--ac-primary` must override it too. Destructive
  DropdownMenu/ContextMenu/Menubar/DropDrawer items mix 20% foreground into their text. Default Badges and interactive default Bubbles hover
  to `color-mix(in oklch, var(--ac-primary) 90%, var(--ac-foreground))`. Plain nested `<a>` links in Bubble content, AlertTitle,
  AlertDescription, EmptyDescription, FieldDescription, ItemDescription and MarkerContent inherit the surrounding text colour and are
  underlined (EmptyDescription, FieldDescription, ItemDescription and MarkerContent links also take `--ac-foreground` on hover); their
  type-only `:where(…) a:is(a)` selectors beat element-only `a {}` resets in any stylesheet order. Class-styled anchors such as
  `buttonVariants()` keep their own paint, including on hover (v2.4's `.description a` rules in Empty, Field and Item overrode it), so on
  the primary surface of Bubble's `default` variant use an opaque-fill variant: Button `default`, `secondary`, `outline` or `destructive`,
  or Badge `default`, `secondary` or `destructive` (Badge `outline` is transparent, unlike Button `outline`). Transparent-fill variants
  (Button `link`/`ghost`; Badge `outline`/`ghost`/`link`) keep text colours meant for neutral surfaces and are not supported there. The
  current NavigationMenu link (`active`/`aria-current="page"`) gets a 2px underline, and the active Command option a 2px `--ac-ring`
  outline.
- DropdownMenuContent and MenubarContent leave `side` to Base UI unless provided (below the trigger; toward the inline end of a vertical
  Menubar). ContextMenuContent defaults to the logical `side="inline-end"`, which mirrors in RTL and is reported as
  `data-side="inline-end"`; v2.4 passed no placement, so Base UI's context-menu default applied (with Base UI 1.9: `data-side="bottom"`,
  side offset −5, align offset 2). `DropDrawerSub.title` sets the localizable mobile panel heading and drawer dialog name (fallbacks:
  trigger `label`, visible trigger text, root `mobileTitle`).
- DropDrawer gains `presentation` (`"responsive"` by default, or `"menu"`/`"drawer"`). `"responsive"` uses the Drawer while
  `(max-width: 767px)` matches and always renders the desktop Menu during server rendering and hydration; `"menu"` and `"drawer"` force one
  owner, including on the server. Mobile `DropDrawerSub` `onOpenChange` details support destructured `cancel()` and `allowPropagation()`
  like Base UI's, and the mobile Back and drill-down chevrons mirror in RTL.
- DropdownMenuContent and DropdownMenuSubContent (so also Menubar and the desktop DropDrawer menu), ContextMenuContent and its sub-content,
  DropDrawer's mobile drawer and the Sidebar roots write `dir="rtl"` only under an RTL `DirectionProvider` (a caller's `dir` wins) and never
  a default `dir="ltr"`; v2.4 wrote no `dir` on any of them. Base UI's `useDirection()` reports `"ltr"` without a provider, so menus keep
  LTR submenu placement and arrow keys even in an RTL document: wrap RTL apps in `DirectionProvider direction="rtl"`. An explicit LTR
  provider inside an RTL document needs `dir="ltr"` on the part.
- `AccordionTrigger.headerProps` (`AccordionHeaderProps`, also `AccordionTrigger.HeaderProps`/`HeaderState`) customizes the heading, an
  `<h3>` by default that now carries `data-slot="accordion-header"`; applications set the level with `headerProps.render`.
- LoadingOverlay keeps a persistent, visually hidden status region, empty while hidden, and writes `loadingLabel` (default `"Loading"`) into
  it while `visible`; the overlay element itself has no role, live-region attributes or default name. AsyncBoundary is a Client Component;
  with the default (decorative spinner) fallback it renders a new visually hidden `<span role="status">` sibling after its content for the
  boundary's whole lifetime and writes `loadingLabel` into it while suspended. In list or table contexts pass a fitting `loadingFallback`,
  which renders no region; custom or `null` fallbacks own their announcement. Spinner and skeleton guidance now points to a status region
  mounted before loading starts, without `aria-busy` on it.
- CommandInput's name is the localizable `fallbackLabel` (default `"Search commands"`) only when no `aria-label`, `aria-labelledby`,
  associated `<label>`, `title` or `placeholder` names it, and never in server HTML. CommandEmpty is a polite status region
  (`aria-atomic="true"`) that only toggles its children and stays mounted while its CommandList is mounted on the client (in place, when
  outside a list), so later "no results" text is written into an existing region; an empty state present when the list first mounts appears
  together with the region. Inside CommandList it is portaled into a `display: contents` `data-slot="command-empty-slot"` element rendered
  before the listbox, so it is no longer a listbox child.
- ComboboxEmpty is a polite `role="status"` region whose root stays mounted while it is rendered (Base UI) and only toggles its children; it
  collapses its padding while empty, so style its margins with `:empty`/`:not(:empty)` and never hide it with `hidden`, `display: none`,
  `aria-hidden` or conditional rendering. ComboboxContent defaults to `align="start"` and `sideOffset={6}` (Base UI: `"center"`, `0`).
- Form: server HTML and the hydration render carry the label/control association (including explicit control/label IDs) and
  `aria-describedby` for written descriptions and messages (including server-known errors) that have explicit IDs or are the item's single
  generated part of their kind. Generated IDs become unique after hydration; parts rendered internally by other components link once they
  mount.
- Sidebar: `SidebarMenuButton`/`SidebarMenuSubButton` `isActive` now sets `aria-current="page"` (overridable, including
  `aria-current={undefined}`), with a forced-colors current cue and an underline on sub-buttons. The mobile sheet renders a visible, named
  close control by default, pinned to the top inline-end corner (`showCloseButton`, `closeLabel` default `"Close sidebar"`); in v2.4 that
  name belonged to a full-screen overlay button. The new `persistState` (default `true`) controls the `sidebar_state` cookie SidebarProvider
  writes, as v2.4 did, on every desktop open-state change (`path=/`, `max-age=604800`, controlled proposals included); the provider never
  reads it, so seed `defaultOpen` from it, or pass `false` when the application persists the state. Ctrl+B / Cmd+B still toggles the sidebar
  but now yields to a `keydown` handler that calls `preventDefault()` first.
- FocusScope: natively focusable `aria-disabled` controls (Base UI `focusableWhenDisabled`, disabled toolbar roving stops) are tab stops —
  Tab continues past them, and wrapping, `autoFocus` and focus restoration include them. A scope in a same-origin iframe document looks up
  `HTMLElement`/`HTMLDetailsElement`/`HTMLFieldSetElement`/`HTMLLegendElement` from the element's own window. `contain` documents the
  consumer's obligation to provide and announce a keyboard exit (WCAG 2.1.2).
- `useFocusManager` candidates also skip `aria-disabled`, hidden, `inert`, `display: none`/`visibility: hidden`, closed-`<details>` and
  disabled-`<fieldset>` content (v2.4 skipped only `disabled` and negative-`tabindex` elements). `focusNext`/`focusPrevious` from a focused
  element that is not a candidate (a focusable `aria-disabled` control, a `tabindex="-1"` element or a wrapper) continue to the nearest
  candidate after or before it in DOM order instead of jumping to the first or last candidate; with focus outside the container, or on
  nothing, they still go to the first or last candidate, and moves past either end always wrap.
- AlertDialogAction no longer closes automatically; callers own async success-close/failure/pending policies. Content close controls now
  default visible for Dialog/Sheet, exported Close controls are unstyled, and Sheet's automatic close follows content.
- DialogContent and SheetContent render the dimming, pointer-blocking backdrop only when the root has `modal={true}` (the default); code
  that relied on it with `modal={false}` or `"trap-focus"` must use `modal={true}`. DialogContent, SheetContent, AlertDialogContent and
  DrawerContent accept `portalProps` (`keepMounted`, `container` and the other Portal props). With vertical `snapPoints`, Drawer requests
  its largest snap point through `onSnapPointChange` (`reason: "none"`) when keyboard or programmatic focus lands beyond the visible snap
  height: uncontrolled drawers expand, and controlled owners apply or cancel the request.
- `ChartLegendContent.inactiveSuffix` localizes or suppresses the inactive-series suffix.
- ScrollArea reserves a stable 1.5rem gutter plus scroll padding (inline-end for the vertical track, block-end for the horizontal one)
  whenever a package-styled track is mounted, like `scrollbar-gutter: stable`. `ScrollBar` now keeps its track mounted by default
  (`keepMounted` defaults to `true`; the idle track stays in the DOM, hidden, and paints nothing), so the gutter is in server HTML, never
  depends on Base UI's overflow measurement, and cannot flip-flop or reflow after hydration. The content box is 1.5rem narrower (or shorter,
  for a horizontal track) even without overflow. The viewport is `box-sizing: border-box`, and the gutter overrides its own end padding on
  that axis. The convenience `ScrollArea` always reserves the vertical gutter; compose `ScrollAreaRoot` with `ScrollBar keepMounted={false}`
  to opt out, which restores mount-on-overflow (the gutter then appears after hydration and can oscillate for width-dependent content).
- Badge defaults to span/HTMLSpanElement; composed refs and callbacks now truthfully follow their actual native/primitive owners.
- Alert keeps v2.4's normal flow, so free-form text, paragraphs and links are not split into grid cells. The new `AlertAction`
  (`AlertActionProps`, `AlertAction.Props`), as a direct child, switches the alert to a two-column grid: the action sits in the trailing
  column beside the title and description, and every other element child stays in the message column. Wrap loose text in `AlertDescription`
  when an action is present.
- `EmptyDescription` composes through Base UI `render` (`useRender`, default `<p>`): use `render={<div />}` for block content. Caller props,
  including `data-slot`, are applied last, and `EmptyDescriptionState` (`EmptyDescription.State`) types render callbacks. The `empty` module
  is now a client module (v2.4's was server-compatible), like Badge, Marker and BubbleContent; Server Components can still render every
  part.
- Table's scroll viewport (`data-slot="table-container"`, a plain `<div>` in v2.4) is a tab stop (`tabIndex={0}`) with a focus ring, so
  keyboard users can scroll overflowing tables. The new `containerProps` (attributes and `ref`) names it with `role: "region"` plus
  `aria-labelledby` (the caption) or `aria-label`, or opts out with `tabIndex: -1` when the table can never overflow.
- Tabs gain a forced-colors selected-tab cue: the default variant's indicator paints `Highlight` and snaps instead of sliding, and the
  selected tab switches to `HighlightText` only while that indicator is displayed (not in server HTML or before Base UI measures it); the
  `line` variant keeps `CanvasText` over its `Highlight` underline.
- Accordion values are arrays in both single- and multiple-panel modes; Select/Combobox preserve generic nullable/multiple values and
  original callback details. Combobox conveniences move to explicit parts. Omitted Slider/Progress defaults remain primitive-owned.
- ChartContainer id/class/ref target its native outer root. Tooltip/Legend content are ref-capable JSX, internal chart scope IDs are unique,
  nullish formatter results suppress rows and ranges use `~`. Supported non-deprecated chart aliases and RHF pass-throughs remain.
- Skeleton counts reject negative/fractional/nonfinite/over-limit input with RangeError before allocation: each count ≤ 10,000 and table
  total cells including optional default-visible header ≤ 10,000. Valid zero/default dimensions and div refs remain.
- Meaningless Field/Form message output is omitted, explicit null boundary fallbacks remain null and unknown throws normalize to Error.
  Calendar animation class overrides are single tokens.

**✨ Added**

- Explicit root/public named types (including `FocusManager`, `Politeness` and `EmptyDescriptionState`; `useFocusManager` and `useAnnounce`
  are now also root exports) and preserved component namespaces for every supported family, plus full Combobox/Progress/ScrollArea parts,
  AlertAction, Avatar badge/group/count, CalendarDayButton, NavigationMenuPositioner, DrawerSwipeHandle, Popover naming parts and
  TooltipArrow.
- NativeSelect and exact Base UI DirectionProvider/useDirection/TextDirection exposure; additive domain-independent
  Attachment/Bubble/Marker/Message display families.
- Caller-owned `Stepper.completedLabel`, defaulting to `"Completed"`, so completed-step assistive text can be localized or deliberately
  omitted.
- Separator and ButtonGroupSeparator accept a Base UI state-callback `className` as well as a string (v2.4 typed it as a string);
  ButtonGroupSeparator merges the result after its group class.
- Shipped MIGRATION guide, preserving historical v0 → v1 documentation and adding comprehensive 2.4 → 3 examples and behavior inventory.
- Real-module root/type/namespace/export-generator contracts and packed-archive contract tests. Private underscore helpers are excluded from
  generated public subpaths and blocked through the retained dist wildcard.

**🐛 Fixed**

- FireworksBackground compares its `color` palette and speed/size ranges by value, so new-but-equal inline arrays and objects no longer
  restart the canvas (v2.4 restarted it on every new identity).
- RippleButton and FlipButton follow `prefers-reduced-motion`, tracked live after hydration: no ripples or press/hover scaling, and an
  instant flip. v2.4 ignored the preference.

**🔧 Compatibility**

- Base UI peer minimum becomes **`^1.9`** (2.4 accepted `^1`), the tested drawer-capable version. Public 1.0 lacks `./drawer`; older Base UI
  consumers must upgrade. This is not a claim about the earliest possible supporting release.
- React and ReactDOM peers become **`^19`** (2.4 accepted `^18.2 || ^19`). The Motion, React Hook Form and Recharts peer ranges and the
  runtime dependencies are unchanged; no Sonner, Headless UI or cmdk engine or dependency is added.
- The documented browser floor now matches the shipped CSS: Chrome/Edge 120, Firefox 121 and Safari 16.5 (see the README's
  [Browser Support](./README.md#-browser-support)). 2.4's README listed Chrome/Edge 90, Firefox 88 and Safari 14, which its stylesheets
  already exceeded.
- CSS Modules, `--ac-*` tokens, CSS side effects, ESM/declaration/source/style outputs and the retained visual extensions remain.
  Storybook-only layouts and demonstration styles live in their owning story files, so production CSS Modules and npm assets carry no demo
  rules.
- Physical paint, native focus/inert, touch, scroll anchoring and screen-reader behavior are not inferred from Vitest/Happy DOM or source
  typing; ACCESSIBILITY lists the manual browser and assistive-technology checks.

**✅ Verification**

From the package directory, `npm test` builds the package, packs and extracts a real npm archive and runs the complete Vitest suite against
it: the colocated tests, the complete source/test/story TypeScript graph and the packed ESM/declaration/style/private-import contracts. See
MIGRATION's [Verification and limits](./MIGRATION.md#verification-and-limits).

**📚 Migration Guide**

[MIGRATION.md](./MIGRATION.md#v24-to-v3) covers every breaking default, ref, value, render and error change with before/after examples.

### [2.4.0](https://www.npmjs.com/package/@arolariu/components/v/2.4.0) - 2026-10-11

**✨ Added**

- Accept Motion 14 alongside Motion 13 in the peer dependency range. Existing Motion 13 consumers do not need to upgrade.
- Add explicit TypeScript declaration targets for `@arolariu/components/styles` and `@arolariu/components/styles.css`, allowing strict
  side-effect imports without consumer-owned ambient declarations. Both subpaths still load the same stylesheet.

**🔧 Compatibility**

- Existing component APIs, React 18/19 peer support, and stylesheet runtime behavior are unchanged.
- Runtime dependency ranges are unchanged from 2.3.0.

**📚 Migration Guide**

No component call-site changes are required. Motion 13 remains supported; Motion 14 is now also accepted. Existing stylesheet imports keep
working, and TypeScript consumers no longer need an ambient declaration for either supported stylesheet subpath.

### [2.3.0](https://www.npmjs.com/package/@arolariu/components/v/2.3.0) - 2026-08-06

**💥 Breaking Changes**

- ⚠️ **`motion` peer dependency widened to `^13`**: The `motion` peer range has moved from `^12` to `^13`. Consumers pinned to `motion@12`
  must upgrade. This ships as a **minor** bump (deviating from the library's normal SemVer policy) because the library's own API surface is
  unchanged, but the peer constraint is breaking for anyone who cannot move to `motion@13`. Upgrading is straightforward — the
  `motion/react` import path and all symbols used by this library (`AnimatePresence`, `motion`, `useAnimation`, `useAnimate`, `useInView`,
  `useSpring`, `useMotionValue`, `useReducedMotion`, `stagger`, and the
  `Transition`/`HTMLMotionProps`/`Variant`/`UseInViewOptions`/`SpringOptions` types) are unchanged in `motion@13`. See the
  [motion changelog](https://motion.dev/changelog) for any other migration notes relevant to your application code.

- 📅 **`<Calendar>` props removed (react-day-picker v10)**: `CalendarProps` is derived via `React.ComponentProps<typeof DayPicker>`, so
  `react-day-picker`'s upstream removals propagate directly into this library's published types. The following props are **gone** and will
  produce TypeScript type errors at your call sites:

  | Removed prop            | Replacement                           |
  | ----------------------- | ------------------------------------- |
  | `fromDate`              | `startMonth`                          |
  | `fromMonth`             | `startMonth`                          |
  | `fromYear`              | `startMonth` (pass first day of year) |
  | `toDate`                | `endMonth`                            |
  | `toMonth`               | `endMonth`                            |
  | `toYear`                | `endMonth` (pass last day of year)    |
  | `initialFocus`          | `autoFocus`                           |
  | `components={{Button}}` | slot removed — no replacement         |

  The `<Calendar>` component itself compiles correctly against `react-day-picker@10`; no implementation changes were required. Only the
  derived `CalendarProps` type is affected. Consumers passing any of these props must update their call sites.

**⬆️ Dependency Updates**

- 🎬 **`motion` peer bumped to `^13`** (see Breaking Changes above). The components themselves are implementation-only with respect to this
  upgrade: no exported component props, no exported types, and no animation behaviour changed. `dropdrawer.tsx` continues to import
  `AnimatePresence`, `motion`, and `Transition` from `motion/react` — those symbols exist unchanged in `motion@13`. The peer range is the
  only consumer-facing requirement.
- 📅 **`react-day-picker` upgraded to v10** — internal dependency (not a peer). The upgrade removes deprecated calendar props from
  `CalendarProps` as described above.

**🔧 Internal — Icon name canonicalization**

- 🏷️ **lucide-react canonical names adopted** (commit `bca8ce3c6`): internal imports switched from the legacy alias names to their canonical
  equivalents — `MoreHorizontal` → `Ellipsis`, `ChevronDownIcon`/`ChevronLeftIcon`/`ChevronRightIcon` →
  `ChevronDown`/`ChevronLeft`/`ChevronRight`, `AlertCircle` → `CircleAlert`, `CheckCircle2` → `CircleCheck`. The old names remain live
  aliases in `lucide-react@1.28.0` (they are declared via `export { New as Old }`) — **this is not consumer-visible**: icons render
  identically, no props changed, and no consumer import path is affected. The renames are a purely internal housekeeping change.

**📚 Migration Guide**

```diff
- <Calendar fromDate={new Date(2024, 0, 1)} toDate={new Date(2024, 11, 31)} initialFocus />
+ <Calendar startMonth={new Date(2024, 0)} endMonth={new Date(2024, 11)} autoFocus />
```

If you are on `motion@12`, upgrade before updating `@arolariu/components`:

```bash
npm install motion@^13
```

---

### [2.2.0](https://www.npmjs.com/package/@arolariu/components/v/2.2.0) - 2026-05-19

**🧹 Internal — Code quality**

- 🎯 **0 ESLint errors / 0 warnings**: resolved all 95 findings (92 errors + 3 warnings) across 25 files in `packages/components` without
  adding any new in-source `eslint-disable` comments.

**🪝 Hooks hardening**

- 🧷 **`useClipboard`**: fixed a race condition between concurrent `copy()` calls by extracting timeout scheduling into a synchronous
  helper. Removed `console.error` noise (errors are already exposed via the returned `error` state).
- 🔒 **`useLocalStorage`**: removed `console.error` calls from non-fatal fallback paths (JSON parse failures already return the initial
  value). Modernized type-narrowing (`instanceof Function` → `typeof === "function"`).
- 👁️ **`useIntersectionObserver`**: destructured `threshold`/`root`/`rootMargin` into stable locals so React's exhaustive-deps lint passes
  cleanly.
- 🏷️ **`useInterval` & `useTimeout`**: renamed internal `savedCallback` ref to `savedCallbackRef` to match the project's ref-naming
  convention.
- 🔗 **`useMergedRefs`**: replaced React-19-deprecated `MutableRefObject` with `RefObject` (whose `.current` is now writable). Restructured
  loop to avoid `continue`.
- 🔁 **`useControllableState`**: inverted negated condition for clarity.

**🧩 Components**

- 🏹 **forwardRef refactor**: converted 33 `React.forwardRef(function Name(...))` patterns to arrow-callback form across 13 components
  (`alert-dialog`, `avatar`, `calendar`, `checkbox-group`, `dropdrawer`, `meter`, `navigation-menu`, `progress`, `scratcher`, `separator`,
  `toast`, `toggle-group`, `toolbar`). Display names preserved.
- 🔄 **`combobox`**: migrated internal `<PopoverTrigger asChild>` usage to the modern `render` prop, matching the established pattern in
  `alert-dialog`, `drawer`, `dropdown-menu`.
- 📅 **`calendar`**: consolidated `react-day-picker` import.

**⚙️ Tooling**

- 🛠️ **ESLint config**: scoped `unicorn/prefer-export-from` and `n/no-unsupported-features/node-builtins` to `off` for
  `packages/components/**` (the package is browser-only; the import-then-export pattern is required for RSLib dist generation per v2.0.0).

**📚 Migration Guide**

No public API changes. Drop-in replacement for 2.1.x.

---

### [2.1.0](https://www.npmjs.com/package/@arolariu/components/v/2.1.0) - 2026-04-17

**⬆️ Dependency Updates**

- 🎯 **Base UI upgraded to v1.4**: Bumped `@base-ui/react` peer dependency from `^1.3` to `^1.4`
  ([v1.4.0 release notes](https://github.com/mui/base-ui/releases/tag/v1.4.0)).

**🔧 Base UI 1.4 Highlights** (no breaking changes for consumers of `@arolariu/components`)

- 🛠️ **General**: More accurate `render` prop warnings; fix for circular JSON `TypeError`; `form` prop exposed on hidden inputs;
  `suppressHydrationWarning` added to hidden inputs; improved outside-press dismissal in shared shadow roots; `Positioner` now correctly
  repositions to a different trigger when reopened with `keepMounted`; full-width anchored `modal` popups now lock scroll on touch input.
- 🪟 **Alert Dialog / Dialog**: Fixed detached trigger HMR with recreated handles.
- 🔎 **Autocomplete / Combobox**: Initial live region announcements fixed; iOS viewport settling fix; scroll-lock no longer triggered by
  controlled value re-renders; browser autofill works with object values when autofill uses the label; item taps no longer blur the input;
  rendered chips respected for keyboard navigation; clicks in `Chips` / `InputGroup` areas now focus the input or open the popup.
- 🖼️ **Avatar**: No more flash when the image is cached.
- ☑️ **Checkbox**: Uncontrolled default initialization fixed; input state changes prevented in `readOnly` mode.
- 📂 **Collapsible**: Open state fixed when `keepMounted` has no transitions.
- 🧾 **Drawer**: Touch scroll fixed in portaled popups; nested swipe cancel state fixed; interrupted swipe dismiss cleanup fixed; warning
  added when a popup is missing `Viewport`; dialogs no longer affect nested drawer stack.
- 🏷️ **Field**: Form error matching in `<Field.Error>` fixed.
- 📋 **Menu**: `SubmenuTrigger` now respects disabled state from `render`; dialog focus preserved on pointer leave.
- 🧭 **Navigation Menu**: Invalid `aria-orientation` removed; generic `Value` typing added; initial trigger switch size fix.

---

### [2.0.0](https://www.npmjs.com/package/@arolariu/components/v/2.0.0) - 2026-04-06

**💥 Breaking Changes**

- 🔄 **Resizable panels upgraded to v4**: Upgraded `react-resizable-panels` from v3 to v4.
  - `direction` prop renamed to `orientation` (e.g., `<ResizablePanelGroup orientation='horizontal'>`)
  - Size props now use string percentages instead of numbers (`defaultSize="50%"` instead of `defaultSize={50}`)
  - `minSize`, `maxSize`, `collapsedSize` also accept string values (`"20%"`, `"0%"`, etc.)
  - Type `ImperativePanelGroupHandle` renamed to `GroupImperativeHandle`
  - Type `ImperativePanelHandle` renamed to `PanelImperativeHandle`
  - `ResizablePanelGroup` is now a function component (was `ForwardRefExoticComponent`); use the new `useGroupRef()` hook from
    `react-resizable-panels` for imperative access
- 📁 **Toast module renamed**: Internal module file renamed from `sonner` to `toast` to reflect the Base UI Toast implementation adopted in
  v1.0.0. Exported names (`Toaster`, `toast`, `Toast`) are unchanged.

**🔧 Improvements**

- 🔗 **Fixed rslib bundler compatibility**: Converted all direct re-export statements (`export ... from "external-package"`) to
  import-then-export pattern across 6 component files (calendar, chart, form, input-otp, resizable, toast). This ensures types and values
  are properly included in the `/dist/` output.
- 📖 **Storybook stories and tests**: Added comprehensive test suites and story variants for all components (1300+ tests, 439+ story
  variants)

**📚 Migration Guide**

```diff
- import type {ImperativePanelGroupHandle} from "@arolariu/components";
+ import type {GroupImperativeHandle} from "@arolariu/components";

- <ResizablePanelGroup direction='horizontal'>
-   <ResizablePanel defaultSize={50}>
+ <ResizablePanelGroup orientation='horizontal'>
+   <ResizablePanel defaultSize='50%'>
```

---

### [1.1.0](https://www.npmjs.com/package/@arolariu/components/v/1.1.0) - 2026-03-24

**✨ New Features**

- 🪝 **13 new utility hooks**: `useControllableState`, `useEventCallback`, `useMergedRefs`, `useId`, `useOnClickOutside`, `usePrevious`,
  `useTimeout`, `useDebounce`, `useThrottle`, `useLocalStorage`, `useClipboard`, `useIntersectionObserver`, `useInterval`
- 🔍 **Combobox compound component**: searchable dropdown composing Command + Popover + Button with single/multi select, keyboard
  navigation, and async loading support
- 🎬 **Storybook 10 with RSBuild**: full design system documentation with `storybook-react-rsbuild` + `storybook-addon-rslib` integration
- 📖 **439 story variants** across 84 components with component-specific states (disabled, error, loading, sizes, custom content)
- 📄 **MDX documentation pages**: Welcome, Getting Started, and Design Principles
- 🎨 **Design token showcase**: interactive Foundations stories for Colors, Spacing, Border Radius, Typography, Motion, and Component Sizes
- 🌗 **Dual light/dark theme** toggle in Storybook toolbar with matching preview backgrounds
- 🏷️ **Brand identity**: arolariu.ro logo in Storybook sidebar, custom dark + light themes
- 📐 **Sidebar organization**: Introduction → Foundations → Components (11 subcategories)
- 🏅 **Component status badges**: Stable, New in v1.0 tags on key components

**🔧 Improvements**

- 🔗 **forwardRef on 35 additional components** (82 of 84 now support ref forwarding)
- 📊 **Recharts v3.8** — 48+ chart primitives, 11 hooks, all re-exported
- 📝 **React Hook Form** — full API surface with `useFormContext`, `useFormState`, `Controller`, 17 types
- ♿ **A11y platform layer**: `VisuallyHidden`, `FocusScope`, `useFocusManager`, `useAnnounce`
- 🎭 **Motion system**: tokens, presets (fadeIn, slideUp, scaleIn), `Presence`, `Collapse`
- 💀 **Loading patterns**: `CardSkeleton`, `TableSkeleton`, `FormSkeleton`, `ListSkeleton`, `LoadingOverlay`
- 🛡️ **Error boundaries**: `ErrorBoundary` (class component with retry), `AsyncBoundary` (Suspense + ErrorBoundary)
- 🆕 **New components**: `CopyButton`, `Stepper`, `Timeline`
- 🏗️ **RSC compatibility**: removed unnecessary `"use client"` from 9 presentational components
- 📦 **Dependency audit**: calendar migrated from deprecated `table` to `month_grid`, carousel axis/orientation fix, all third-party wrapper
  types exported

**🐛 Bug Fixes**

- 🔒 Fixed stale closure in `useLocalStorage` setValue (functional state updater)
- 🔒 Fixed stale closure in `useControllableState` uncontrolled mode
- 🔒 Fixed `useThrottle` callback ref to prevent timer reset on re-render
- 🎯 Fixed tooltip z-index stacking context (Positioner needs z-index, not Popup)
- 🎯 Fixed Commander layout (removed separators, flex list, scroll support)
- 🎯 Fixed tooltip contrast (force child color inheritance)
- 🎯 Fixed button.module.css `:disabled` alongside `[data-disabled]`
- 📦 Removed 84 erroneous `.stories` subpath exports from package.json
- 📦 Fixed `sideEffects` glob from `*.css` to `**/*.css` for nested CSS modules
- 📦 Changed all storybook devDependencies from pinned versions to `*` (monorepo pattern)

**📚 Documentation**

- 📖 `MIGRATION.md` — comprehensive v0.x → v1.0 migration guide
- 📖 `EXAMPLES.md` — 10 production-ready pattern recipes
- 📖 `RFC 1006` — updated to reflect Base UI + CSS Modules architecture
- 📖 Storybook Welcome, Getting Started, Design Principles MDX pages

**🧪 Testing**

- 95%+ line/function/statement coverage, 80%+ branch coverage
- 1300+ tests across 102 test files
- All ESLint errors resolved (0 errors, 0 warnings)
- Storybook build verified clean

---

### [1.0.0](https://www.npmjs.com/package/@arolariu/components/v/1.0.0) - 2026-03-13

**💥 Breaking Changes**

- 🔄 **Migrated component primitives from Radix UI to Base UI** using the consolidated `@base-ui/react` package instead of 25+
  `@radix-ui/react-*` packages.
- 🎨 **Migrated styling from Tailwind CSS to CSS Modules**. The component library no longer depends on Tailwind utility classes for internal
  styling.
- 🧩 **Variant helper functions remain available**: `badgeVariants`, `buttonVariants`, and `buttonGroupVariants` still exist in the public
  API, but now use CSS Module class-name maps instead of CVA.
- 🌈 **Renamed design tokens to the `--ac-*` namespace**. CSS custom properties are now prefixed consistently, for example `--ac-primary`
  and `--ac-radius-md`.
- 🔁 **Shifted composition toward Base UI's `render` prop**. `asChild` still works as a backward-compatibility shim, but `render` is now the
  preferred API for new code.
- 🔔 **Migrated the toast system from `sonner` to a Base UI Toast-backed implementation** while preserving the existing `Toaster` and
  `toast` exports.
- ⌨️ **Migrated the command palette away from `cmdk`** to a package-native implementation aligned with the new Base UI architecture.
- 🗂️ **Migrated `DropDrawer` away from `vaul`** to the Base UI Drawer foundation.
- 🧹 **Removed legacy dependencies**: `@radix-ui/*`, `tailwind-merge`, `class-variance-authority`, `tailwindcss-animate`, `vaul`, `sonner`,
  and `cmdk`.

**✨ New Features & Improvements**

- 🆕 **New components introduced in the 1.0.0 architecture**: `NumberField`, `Meter`, `Toolbar`, and `CheckboxGroup`.
- 🧠 **Simplified class merging**: `cn()` now uses `clsx` only.
- 🌙 **Documented dark mode activation** with either a `.dark` class or a `[data-theme="dark"]` attribute.
- 🏗️ **Retained the RSLib build pipeline** for ESM output, typings, and source maps.
- 🔧 **All 32 Base UI wrappers use `useRender` + `mergeProps`** — canonical Base UI composition pattern for proper event handler merging and
  ref forwarding.
- 🏷️ **TypeScript namespace types** — 31 components export `Component.Props` / `Component.State` namespaces for enterprise-grade type
  consumption.
- 📦 **Re-exported Base UI utilities**: `CSPProvider`, `DirectionProvider`, `mergeProps`, `useRender` for consumer convenience.
- 📝 **Enterprise-grade JSDoc** on all 71 components — every exported function has `@remarks`, `@example`, `@see`; every prop has
  `/** description @default */`.
- 🪪 **`displayName`** set on all exported components for React DevTools and error stack traces.
- 🧪 **53 Vitest test files** covering all 71 components with smoke, ref, className, interaction, and accessibility tests.
- 📦 **Test files excluded from npm publish** — `*.test.*`, `*.spec.*`, `*.stories.*` stripped from published package.

### [0.5.0](https://www.npmjs.com/package/@arolariu/components/v/0.5.0) - 2026-01-16

**✨ New Features & Improvements**

- 🔄 **Renamed `gradient-utils` to `color-conversion-utilities`** with more descriptive function names:
  - `hexToHsl` → `convertHexToHslString`
  - `hslToHex` → `convertHslToHexString`
  - `isValidHexColor` → `validateHexColorFormat`
  - `getComplementaryColor` → `calculateComplementaryHexColor`
  - `adjustLightness` → `adjustHexColorLightness`
  - `parseHslString` → `parseHslStringToComponents`
- 📚 **Legacy aliases maintained** for backwards compatibility (deprecated)

### [0.4.2](https://www.npmjs.com/package/@arolariu/components/v/0.4.2) - 2025-12-18

**✨ New Features & Improvements**

- 🆕 **New Component: `CardAction`** - A component for adding actions to cards.

### [0.4.1](https://www.npmjs.com/package/@arolariu/components/v/0.4.1) - 2025-12-08

**🔧 Bug Fixes & Maintenance**

- ⬆️ **Recharts V3** Upgraded chart.tsx to use Rechars v3.5

### [0.4.0](https://www.npmjs.com/package/@arolariu/components/v/0.4.0) - 2025-12-05

**✨ New Features & Improvements**

- 🔒 Switched to Trusted Publishing workflow for attestation of package.
- Removed storybook stories for now, will re-introduce at a later date.

### [0.3.1](https://www.npmjs.com/package/@arolariu/components/v/0.3.1) - 2025-11-11

**🔧 Bug Fixes & Maintenance**

- 🐛 **Linting** Migrated from deprecated ElementRef to ComponentRef.

### [0.3.0](https://www.npmjs.com/package/@arolariu/components/v/0.3.0) - 2025-11-10

**✨ New Features & Improvements**

- 🆕 **New Component: `ButtonGroup`** - A group of buttons that behave as a single unit.
- 🆕 **New Component: `EmptyState`** - A component to display an empty state with a message and illustration.
- 🆕 **New Component: `Field`** - A component for form fields.
- 🆕 **New Component: `InputGroup`** - A component for grouping input elements.
- 🆕 **New Component: `Item`** - A component for displaying a single item in a list.
- 🆕 **New Component: `Kbd`** - A component for displaying keyboard shortcuts.
- 🆕 **New Component: `Spinner`** - A component for displaying a loading spinner.

### [0.2.0](https://www.npmjs.com/package/@arolariu/components/v/0.2.0) - 2025-10-01

**✨ New Features & Improvements**

- ⚙️ **Migrated tooling to monorepo-based NPM+NX** for better package management and development experience.
- ⬆️ **Updated rslib/rsbuild** core packages to latest versions.

### [0.1.2](https://www.npmjs.com/package/@arolariu/components/v/0.1.2) - 2025-09-08

**🔧 Dependencies & Infrastructure**

- ⬆️ **Updated rslib/rsbuild** core packages to latest versions.
- 🆕 **useWindowSize Hook** Added new hook to get window dimensions.

### [0.1.1](https://www.npmjs.com/package/@arolariu/components/v/0.1.1) - 2025-08-25

**🔧 Dependencies & Infrastructure**

- ⬆️ **Upgraded Radix UI** packages to latest versions for better performance.
- ⬆️ **Updated rslib/rsbuild** core packages to latest versions.
- 🆕 **Typewriter Component** Added new component from Aceternity UI.
- ⬆️ **Recharts V3** Upgraded chart.tsx to use Rechars v3.

### [0.1.0](https://www.npmjs.com/package/@arolariu/components/v/0.1.0) - 2025-08-12

**🔧 Dependencies & Infrastructure**

- 💥 **Breaking Change: Only export ESM format** starting from this version.
- ⬆️ **Upgraded Radix UI** packages to latest versions for better performance.
- ⬆️ **Updated rslib/rsbuild** core packages to latest versions.

### [0.0.40](https://www.npmjs.com/package/@arolariu/components/v/0.0.40) - 2025-07-25

**🔧 Dependencies & Infrastructure**

- ⬆️ **Upgraded Radix UI** packages to latest versions for better performance.
- ⬆️ **Updated rslib/rsbuild** core packages to latest versions.

### [0.0.39](https://www.npmjs.com/package/@arolariu/components/v/0.0.39) - 2025-06-25

**🔧 Dependencies & Infrastructure**

- ⬆️ **Upgraded Radix UI** packages to latest versions for better performance.
- ⬆️ **Updated rslib/rsbuild** core packages to latest versions.
- ⬆️ **Bumped Storybook** to v8 with enhanced documentation features.
- 🔗 **Fixed broken anchor links** in readme.md file.

### [0.0.38](https://www.npmjs.com/package/@arolariu/components/v/0.0.38) - 2025-05-16

**✨ Features & Documentation**

- ⬆️ **Radix UI updates** - Latest component primitives.
- ⬆️ **Build tool updates** - Enhanced rslib/rsbuild packages.
- 📚 **Complete Storybook coverage** - Interactive stories for all major components.
- 🆕 **New Component**: `DropDrawer` - Advanced drawer with drop zones.
  - Thanks to [Jia Wei Ng](https://github.com/jiaweing/DropDrawer) for the contribution! 🙏

### [0.0.37](https://www.npmjs.com/package/@arolariu/components/v/0.0.37) - 2025-04-20

**🎨 Component Library Expansion**

- ⬆️ **Radix UI updates** - Latest component primitives.
- 📖 **Enhanced README** - Better documentation for new components.
- ✨ **9 new Animate-UI components** - Beautiful animations out of the box.
- 🪄 **2 new Magic-UI components** - Enhanced utility components.
- 🎭 **1 new Aceternity-UI component** - Creative design patterns.

### [0.0.36](https://www.npmjs.com/package/@arolariu/components/v/0.0.36) - 2025-04-17

**🔄 Package Manager Migration**

- 📦 **Migrated from npm to Yarn** - Better dependency management and performance.
- ⬆️ **Updated ShadCN packages** - Latest component definitions and patterns.

### [0.0.35](https://www.npmjs.com/package/@arolariu/components/v/0.0.35) - 2025-04-08

**🛠️ Build System Overhaul**

- 🔧 **Vite → Rslib migration** - Faster builds and better tree-shaking.
- 📅 **Calendar component upgrade** - Updated from v8 to v9 with new features.

### [0.0.34](https://www.npmjs.com/package/@arolariu/components/v/0.0.34) - 2025-03-27

**🧹 Dependency Cleanup**

- ⬆️ **Package version updates** - Latest stable versions.
- ❌ **Removed daisyUI dependency** - Cleaner build without unused CSS framework.
- 🧽 **De-duplicated yarn.lock** - Optimized dependency tree.

### [0.0.33](https://www.npmjs.com/package/@arolariu/components/v/0.0.33) - 2025-03-13

**🎯 Developer Experience**

- ✨ **Added `toast` function** - Programmatic toast notifications with the `Toast` components.

### [0.0.32](https://www.npmjs.com/package/@arolariu/components/v/0.0.32) - 2025-03-05

---

**[📦 View on npm](https://www.npmjs.com/package/@arolariu/components)** • **[⭐ Star on GitHub](https://github.com/arolariu/arolariu.ro)**
