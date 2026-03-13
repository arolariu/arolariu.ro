# 📋 Release History

> **Stay updated with the latest improvements, features, and fixes!**

All notable changes to **@arolariu/components** are documented here following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## 🎉 Latest Releases

### [1.0.0](https://www.npmjs.com/package/@arolariu/components/v/1.0.0) - 2026-03-13
**💥 Breaking Changes**
- 🔄 **Migrated component primitives from Radix UI to Base UI** using the consolidated `@base-ui/react` package instead of 25+ `@radix-ui/react-*` packages.
- 🎨 **Migrated styling from Tailwind CSS to CSS Modules**. The component library no longer depends on Tailwind utility classes for internal styling.
- 🧩 **Removed CVA variant helpers**: `badgeVariants`, `buttonVariants`, and `buttonGroupVariants` are no longer part of the public API.
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
