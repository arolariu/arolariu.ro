# 📋 Release History

> **Stay updated with the latest improvements, features, and fixes!**

All notable changes to **@arolariu/components** are documented here following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## 🎉 Latest Releases

### [2.1.0](https://www.npmjs.com/package/@arolariu/components/v/2.1.0) - 2026-04-17

**⬆️ Dependency Updates**

- 🎯 **Base UI upgraded to v1.4**: Bumped `@base-ui/react` peer dependency from `^1.3` to `^1.4` ([v1.4.0 release notes](https://github.com/mui/base-ui/releases/tag/v1.4.0)).

**🔧 Base UI 1.4 Highlights** (no breaking changes for consumers of `@arolariu/components`)

- 🛠️ **General**: More accurate `render` prop warnings; fix for circular JSON `TypeError`; `form` prop exposed on hidden inputs; `suppressHydrationWarning` added to hidden inputs; improved outside-press dismissal in shared shadow roots; `Positioner` now correctly repositions to a different trigger when reopened with `keepMounted`; full-width anchored `modal` popups now lock scroll on touch input.
- 🪟 **Alert Dialog / Dialog**: Fixed detached trigger HMR with recreated handles.
- 🔎 **Autocomplete / Combobox**: Initial live region announcements fixed; iOS viewport settling fix; scroll-lock no longer triggered by controlled value re-renders; browser autofill works with object values when autofill uses the label; item taps no longer blur the input; rendered chips respected for keyboard navigation; clicks in `Chips` / `InputGroup` areas now focus the input or open the popup.
- 🖼️ **Avatar**: No more flash when the image is cached.
- ☑️ **Checkbox**: Uncontrolled default initialization fixed; input state changes prevented in `readOnly` mode.
- 📂 **Collapsible**: Open state fixed when `keepMounted` has no transitions.
- 🧾 **Drawer**: Touch scroll fixed in portaled popups; nested swipe cancel state fixed; interrupted swipe dismiss cleanup fixed; warning added when a popup is missing `Viewport`; dialogs no longer affect nested drawer stack.
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
  - `ResizablePanelGroup` is now a function component (was `ForwardRefExoticComponent`); use the new `useGroupRef()` hook from `react-resizable-panels` for imperative access
- 📁 **Toast module renamed**: Internal module file renamed from `sonner` to `toast` to reflect the Base UI Toast implementation adopted in v1.0.0. Exported names (`Toaster`, `toast`, `Toast`) are unchanged.

**🔧 Improvements**

- 🔗 **Fixed rslib bundler compatibility**: Converted all direct re-export statements (`export ... from "external-package"`) to import-then-export pattern across 6 component files (calendar, chart, form, input-otp, resizable, toast). This ensures types and values are properly included in the `/dist/` output.
- 📖 **Storybook stories and tests**: Added comprehensive test suites and story variants for all components (1300+ tests, 439+ story variants)

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

- 🪝 **13 new utility hooks**: `useControllableState`, `useEventCallback`, `useMergedRefs`, `useId`, `useOnClickOutside`, `usePrevious`, `useTimeout`, `useDebounce`, `useThrottle`, `useLocalStorage`, `useClipboard`, `useIntersectionObserver`, `useInterval`
- 🔍 **Combobox compound component**: searchable dropdown composing Command + Popover + Button with single/multi select, keyboard navigation, and async loading support
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
- 📦 **Dependency audit**: calendar migrated from deprecated `table` to `month_grid`, carousel axis/orientation fix, all third-party wrapper types exported

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
- 🔄 **Migrated component primitives from Radix UI to Base UI** using the consolidated `@base-ui/react` package instead of 25+ `@radix-ui/react-*` packages.
- 🎨 **Migrated styling from Tailwind CSS to CSS Modules**. The component library no longer depends on Tailwind utility classes for internal styling.
- 🧩 **Variant helper functions remain available**: `badgeVariants`, `buttonVariants`, and `buttonGroupVariants` still exist in the public API, but now use CSS Module class-name maps instead of CVA.
- 🌈 **Renamed design tokens to the `--ac-*` namespace**. CSS custom properties are now prefixed consistently, for example `--ac-primary` and `--ac-radius-md`.
- 🔁 **Shifted composition toward Base UI's `render` prop**. `asChild` still works as a backward-compatibility shim, but `render` is now the preferred API for new code.
- 🔔 **Migrated the toast system from `sonner` to a Base UI Toast-backed implementation** while preserving the existing `Toaster` and `toast` exports.
- ⌨️ **Migrated the command palette away from `cmdk`** to a package-native implementation aligned with the new Base UI architecture.
- 🗂️ **Migrated `DropDrawer` away from `vaul`** to the Base UI Drawer foundation.
- 🧹 **Removed legacy dependencies**: `@radix-ui/*`, `tailwind-merge`, `class-variance-authority`, `tailwindcss-animate`, `vaul`, `sonner`, and `cmdk`.

**✨ New Features & Improvements**
- 🆕 **New components introduced in the 1.0.0 architecture**: `NumberField`, `Meter`, `Toolbar`, and `CheckboxGroup`.
- 🧠 **Simplified class merging**: `cn()` now uses `clsx` only.
- 🌙 **Documented dark mode activation** with either a `.dark` class or a `[data-theme="dark"]` attribute.
- 🏗️ **Retained the RSLib build pipeline** for ESM output, typings, and source maps.
- 🔧 **All 32 Base UI wrappers use `useRender` + `mergeProps`** — canonical Base UI composition pattern for proper event handler merging and ref forwarding.
- 🏷️ **TypeScript namespace types** — 31 components export `Component.Props` / `Component.State` namespaces for enterprise-grade type consumption.
- 📦 **Re-exported Base UI utilities**: `CSPProvider`, `DirectionProvider`, `mergeProps`, `useRender` for consumer convenience.
- 📝 **Enterprise-grade JSDoc** on all 71 components — every exported function has `@remarks`, `@example`, `@see`; every prop has `/** description @default */`.
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
