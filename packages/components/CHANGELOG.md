# 📋 Release History

> **Stay updated with the latest improvements, features, and fixes!**

All notable changes to **@arolariu/components** are documented here following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
format and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## 🎉 Latest Releases

### [3.0.0] - Unreleased (release preparation)

**Review follow-up**

- Restore React 18 DOM ref forwarding for `AlertDialogCancel` and `LegacyAlertDialogAction`, retaining their existing dismissal behavior.
- Preserve cleanup-returning React 19 `CommandGroup` refs through search, callback replacement and unmount, including legacy React 18 null
  detachment.
- Add caller-owned `Stepper.completedLabel`, defaulting to `"Completed"`, so completed-step assistive text can be localized or deliberately
  omitted.
- Move Storybook-only layouts and demonstration styles into their owning story files. Production component CSS Modules and npm assets no
  longer carry demo rules.

**Status:** unreleased artifact preparation. Component and Storybook documentation builds, four actual npm-packed artifact contracts, 28
isolated React 18.2 packed fixtures and the parent's latest review-followup component workspace coverage, scoped review, configured ESLint
and 177-changed-file Prettier checks have passed. This is not publication, PR or physical-browser approval. The website retains its official
published 2.4 tarball and runtime calls; adopting a new artifact is a separate authorized task.

**Added**

- Explicit root/public named types and preserved component namespaces for every supported family, plus full Combobox/Progress/ScrollArea
  parts, Avatar badge/group/count, CalendarDayButton, NavigationMenuPositioner, DrawerSwipeHandle, Popover naming parts and TooltipArrow.
- NativeSelect and exact Base UI DirectionProvider/useDirection/TextDirection exposure; additive domain-independent
  Attachment/Bubble/Marker/Message display families.
- Explicit LegacyToaster/legacyToast, LegacyCommandDialog and LegacyAlertDialogAction compatibility APIs and public subpaths.
- Shipped MIGRATION guide, preserving historical v0 → v1 documentation and adding comprehensive 2.4 → 3 examples and behavior inventory.
- Real-module root/type/namespace/export-generator contracts and verified actual packed-artifact contracts. Private underscore helpers are
  excluded from generated public subpaths and blocked through the retained dist wildcard.

**Breaking / migration required**

- Canonical `toast` is a Base UI manager, not the callable status facade; use `add`/`update`/`close`/`promise` and canonical
  timeout/limit/type/actionProps. Facade duration/status/custom/history remains explicit on legacy APIs. `Toast` is a component; canonical
  notification data is ToastData/ToastObject. Legacy invalid/inactive updates throw and rejected async lifecycles stay rejected.
- Canonical CommandDialog supplies only the modal shell; include exactly one Command, or use LegacyCommandDialog with no nested root. Native
  substring/custom-score matching is retained, not a cmdk implementation.
- AlertDialogAction no longer closes automatically; callers own async success-close/failure/pending policies. Content close controls now
  default visible for Dialog/Sheet, exported Close controls are unstyled, and Sheet's automatic close follows content.
- Badge defaults to span/HTMLSpanElement; composed refs and callbacks now truthfully follow their actual native/primitive owners. Non-button
  canonical Button targets require nativeButton=false.
- Canonical Accordion uses arrays unless an explicit legacy type is supplied; Select/Combobox preserve generic nullable/multiple values and
  original callback details. Combobox conveniences move to explicit parts. Omitted Slider/Progress defaults remain primitive-owned.
- ChartContainer id/class/ref target its native outer root. Tooltip/Legend content are ref-capable JSX, internal chart scope IDs are unique,
  nullish formatter results suppress rows and ranges use `~`. All 59 chart aliases and RHF pass-throughs remain.
- Skeleton counts reject negative/fractional/nonfinite/over-limit input with RangeError before allocation: each count ≤ 10,000 and table
  total cells including optional default-visible header ≤ 10,000. Valid zero/default dimensions and div refs remain.
- Meaningless Field/Form message output is omitted, explicit null boundary fallbacks remain null and unknown throws normalize to Error.
  LoadingOverlay stays visual; blocking and announcements are caller-owned. Calendar animation class overrides are single tokens.

**Compatibility and limits**

- Base UI peer minimum becomes **`^1.9`**, the actually tested drawer-capable version. Public 1.0 lacks `./drawer`; older Base UI consumers
  must upgrade. This is not a claim about the earliest possible supporting release.
- React/ReactDOM **`^18.2 || ^19`** and all other runtime package names/ranges remain unchanged. Independent React 18.2 source smoke
  evidence and all 28 fixtures against actual packed ESM have passed, distinct from React 19 and without source proxies.
- CSS Modules/tokens/side effects, ESM/types/source/styles, retained visual extensions, deprecated Flip `righ`, chart metadata/no-ops and
  explicit compatibility flags remain. No Sonner, Headless UI or cmdk engine/dependency is introduced; unselected families stay gated.
- Physical paint/native focus/inert/touch/scroll anchoring/screen-reader behavior and aggregate coverage are not inferred from focused
  Vitest/Happy DOM/source typing. See MIGRATION for full defaults/ref/value/render/error changes and deferred release evidence.

**Validation — latest review-followup checkpoint 2026-10-14**

- With `AROLARIU_COMPONENTS_PACKED_ROOT` pointing to the genuine new extraction,
  `npm run test:unit --workspace=@arolariu/components -- --maxWorkers=2 --reporter=dot` exited **0**: **127 files / 3,147 tests / no
  skips**, including all **four packed contracts** and **93 story-style mount tests**. Start **15:21:14 local**; duration **335.46
  seconds**.
- Statements **98.35% (3765/3828)**; branches **95.32% (2996/3143)**; functions **99.41% (1022/1028)**; lines **99.24% (3571/3598)**.
  Existing thresholds/exclusions remain unchanged: 80% branches; 95% functions, lines and statements.
- Real React18 source and packed lanes each passed **28 fixtures**. Story migration removed **224 classes from 74 production CSS Modules**
  into **80 story-owned style mounts**; actual packed legacy selectors fell **432 → 0**, with **26,551 fewer uncompressed production CSS
  bytes**. Parent's **74 graphs / 3,611 preserved declarations** and **97-story TypeScript graph** checks passed with zero diagnostics.
- Independent review (`328aa289`) reported no findings: all four original review items addressed, story-style boundary approved. Parent's
  configured full ESLint and **177-changed-file** format checks passed.
- Expected Motion/npm notices, intentional ErrorBoundary demo error reporting and the chart zero-geometry warning stayed visible; this is
  not a warning-free claim. The historical 15 hook/story strong-type baseline, website fixture/build-environment limits, physical-browser
  acceptance, publication and website adoption are not cleared by this component checkpoint.

**Validation — historical initial v3 checkpoint 2026-10-14**

The following **3,043-test checkpoint is historical**, before the latest review/style follow-up above.

- With `AROLARIU_COMPONENTS_PACKED_ROOT` pointing to the real extracted artifact,
  `npm run test:unit --workspace=@arolariu/components -- --maxWorkers=2 --reporter=dot` exited **0**: **126 files / 3,043 tests / no
  skips**, including all three actual packed contracts. Start **10:50:17 local**; duration **333.64 seconds**.
- Statements **98.35% (3769/3832)**; branches **95.32% (2997/3144)**; functions **99.41% (1025/1031)**; lines **99.25% (3573/3600)**.
  Thresholds/exclusions are unchanged: 80% branches; 95% functions, lines and statements.
- Final scoped review (`a3e8b0b6`): I1/I2 and M1–M10 all addressed; zero remaining and zero new Important regressions. Parent-reported
  configured ESLint and Prettier for all **383 changed files** passed. Real React18 source and packed lanes each passed **18 fixtures**.
- Expected Motion reduced notices/npm configuration warnings remain visible; no React Tabs act warnings after `c16112a1a`. Corrections
  `62e463118`, `d63c6bdc6`, `c16112a1a` were fixture-only, not production/dist changes.
- Known 15 hook/story strong-type diagnostics and website fixture/build-environment blocks remain outside this component coverage pass. This
  is not an all-monorepo pass; physical-browser acceptance, publication and website adoption remain separately gated.

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
