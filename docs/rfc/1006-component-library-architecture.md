# RFC 1006: Component Library Architecture

- **Status**: Implemented
- **Date**: 2025-12-25 (Updated: 2026-03-13 for v1.0)
- **Authors**: Alexandru-Razvan Olariu
- **Related Components**: `packages/components/`, `@arolariu/components` npm package

---

## Abstract

This RFC documents the architecture and design decisions for the @arolariu/components shared React component library. Built on Base UI primitives with CSS Modules styling, the library provides 71+ accessible, production-ready components for building modern web interfaces. The library is published to npm and consumed by the arolariu.ro website and potentially other projects.

**Version 1.0 Update:** This RFC has been updated to reflect the architectural migration from Radix UI + Tailwind CSS to Base UI + CSS Modules. The core principles of accessibility, type safety, and tree-shakeability remain unchanged.

---

## 1. Motivation

### 1.1 Problem Statement

Modern web applications require consistent UI components that:

1. **Accessibility First**: Meet WCAG 2.1 AA standards out of the box
2. **Type Safety**: Provide full TypeScript support with explicit prop types
3. **Consistent Design**: Maintain visual cohesion across applications
4. **Tree-Shakeable**: Import only what's needed to minimize bundle size
5. **Customizable**: Allow styling overrides without breaking functionality
6. **Well-Documented**: Include Storybook stories and API documentation

### 1.2 Design Goals

- **Base UI Primitives**: Build on modern, unstyled accessibility primitives (successor to Radix UI)
- **CSS Modules Architecture**: Scoped styling with no runtime CSS-in-JS overhead
- **OKLCH Design Tokens**: Advanced color manipulation with `--ac-*` custom properties
- **Tree-Shaking**: ESM modules with individual component exports
- **Type Safety**: Namespace types (`Component.Props`, `Component.State`) for enterprise codebases
- **Monorepo Integration**: Seamless development within Nx monorepo
- **NPM Publishing**: Automated CI/CD for package releases with provenance attestation

---

## 2. Technical Design

### 2.1 Architecture Overview

```text
packages/components/
├── src/
│   ├── components/
│   │   └── ui/                    # All 71+ UI components
│   │       ├── button.tsx         # Component logic
│   │       ├── button.module.css  # CSS Module styles
│   │       ├── button.test.tsx    # Co-located tests
│   │       ├── card.tsx
│   │       ├── card.module.css
│   │       ├── dialog.tsx
│   │       ├── dialog.module.css
│   │       └── ...
│   ├── hooks/                     # Custom React hooks
│   │   ├── use-mobile.tsx
│   │   └── use-render.tsx         # Re-export from Base UI
│   ├── lib/                       # Utility functions
│   │   ├── utilities.ts           # cn() classname merger (clsx-based)
│   │   └── color-conversion-utilities.ts  # OKLCH/HSL/Hex conversions
│   ├── motion/                    # Motion utilities
│   │   └── Motion.tsx
│   ├── index.ts                   # Barrel exports
│   └── index.css                  # Design tokens (--ac-* variables)
├── rslib.config.ts               # RSLib build configuration
├── package.json                  # npm package manifest
├── tsconfig.json                 # TypeScript configuration
├── MIGRATION.md                  # v0.x → v1.0 migration guide
└── EXAMPLES.md                   # Real-world usage patterns
```

### 2.2 Build System

The library uses **RSLib** (built on Rsbuild) for bundling:

```typescript
// rslib.config.ts
import {pluginReact} from "@rsbuild/plugin-react";
import {defineConfig} from "@rslib/core";

export default defineConfig({
  source: {
    entry: {
      index: ["./src/**", "!./src/**/*.test.*"],
    },
  },
  lib: [
    {
      format: "esm",
      bundle: false,
      dts: true,
      output: { distPath: { root: "./dist/" } },
    },
  ],
  plugins: [pluginReact()],
});
```

**Build Outputs**:
- ESM modules for modern bundlers (Next.js, Vite)
- TypeScript declarations (`.d.ts`)
- Source maps for debugging

### 2.3 Component Categories

| Category | Components | Description |
|----------|-----------|-------------|
| **Layout** | Card, AspectRatio, Separator, Resizable | Structure and spacing |
| **Interactive** | Button, Input, Checkbox, Select, Slider | User inputs |
| **Navigation** | Tabs, Breadcrumb, NavigationMenu, Sidebar | Page navigation |
| **Overlays** | Dialog, Sheet, Popover, Tooltip, DropDrawer | Modal content |
| **Data Display** | Table, Calendar, Avatar, Badge, Chart | Data visualization |
| **Animated BG** | DotBackground, BubbleBackground, Fireworks | Visual effects |
| **Form Controls** | Form, InputOTP, RadioGroup, Switch, Textarea | Form inputs |
| **Feedback** | Alert, Progress, Skeleton, Sonner | User feedback |

### 2.4 Component Inventory (71+ Components)

**Base UI Wrappers (32 components):**
```text
accordion          alert-dialog       aspect-ratio       checkbox
checkbox-group     collapsible        dialog             drawer
dropdown-menu      field              form               hover-card
input              meter              navigation-menu    number-field
popover            progress           radio-group        scroll-area
select             slider             switch             tabs
textarea           toggle             toggle-group       toolbar
tooltip            alert              context-menu       menubar
sheet
```

**Custom Components (39 components):**
```text
avatar             background-beams   badge              breadcrumb
bubble-background  button-group       button             calendar
card               carousel           chart              command
counting-number    dot-background     dropdrawer         empty
fireworks-background flip-button      gradient-background gradient-text
highlight-text     hole-background    input-group        input-otp
item               kbd                label              pagination
resizable          ripple-button      scratcher          separator
sidebar            skeleton           sonner             spinner
table              typewriter         card-skeleton      form-skeleton
list-skeleton      table-skeleton     async-boundary     error-boundary
copy-button        focus-scope        loading-overlay    stepper
timeline           visually-hidden
```

---

## 3. Component Patterns

### 3.1 Component Structure (Base UI Wrapper)

Base UI wrapper components follow this canonical pattern:

```typescript
// components/ui/button.tsx
"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./button.module.css";

// 1. Define variant class maps (replaces CVA)
const variantStyles: Record<ButtonVariant, string> = {
  default: styles.default!,
  destructive: styles.destructive!,
  outline: styles.outline!,
  secondary: styles.secondary!,
  ghost: styles.ghost!,
  link: styles.link!,
};

const sizeStyles: Record<ButtonSize, string> = {
  default: styles.sizeDefault!,
  sm: styles.sizeSm!,
  lg: styles.sizeLg!,
  icon: styles.sizeIcon!,
};

export type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
export type ButtonSize = "default" | "sm" | "lg" | "icon";

// 2. Define serializable state for render callbacks
export interface ButtonState extends Record<string, unknown> {
  variant: ButtonVariant;
  size: ButtonSize;
  disabled: boolean;
}

// 3. Define props interface
export interface ButtonProps extends Omit<React.ComponentPropsWithRef<"button">, "children" | "className"> {
  /** Visual style variant. @default "default" */
  variant?: ButtonVariant;
  /** Size preset. @default "default" */
  size?: ButtonSize;
  /** Additional CSS classes merged with button styles. @default undefined */
  className?: string;
  /** Button content or render callback receiving button state. @default undefined */
  children?: React.ReactNode | ((state: ButtonState) => React.ReactNode);
  /** Custom element or render callback used to replace the underlying button. @default undefined */
  render?: useRender.RenderProp<ButtonState>;
  /** Backward-compatible child-slot API that maps to `render` prop. @default false @deprecated Prefer `render` prop. */
  asChild?: boolean;
}

// 4. Forward ref component with useRender + mergeProps
const Button = React.forwardRef<React.ComponentRef<"button">, Button.Props>(
  (props: Readonly<Button.Props>, ref): React.ReactElement => {
    const {
      variant = "default",
      size = "default",
      className,
      children,
      render: renderProp,
      asChild = false,
      disabled = false,
      ...otherProps
    } = props;

    // State passed to render callbacks
    const state: Button.State = {variant, size, disabled};

    // Resolve children (static or callback)
    const resolvedChildren = typeof children === "function" ? children(state) : children;

    // Base UI composition pattern: useRender + mergeProps
    return (
      <button
        ref={ref}
        disabled={disabled}
        {...otherProps}
        {...useRender({
          defaultTagName: "button",
          render: asChild ? resolvedChildren : renderProp,
          props: mergeProps(
            {
              className: cn(
                styles.button,
                variantStyles[variant],
                sizeStyles[size],
                className
              ),
            },
            {}
          ),
        })}
      >
        {!asChild ? resolvedChildren : null}
      </button>
    );
  }
);
Button.displayName = "Button";

// 5. Export namespace types (enterprise pattern)
// eslint-disable-next-line no-redeclare
namespace Button {
  export type Props = ButtonProps;
  export type State = ButtonState;
}

export {Button};
```

**Corresponding CSS Module:**
```css
/* button.module.css */
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--ac-radius-md);
  font-weight: 500;
  transition-property: color, background-color, border-color;
  transition-duration: 150ms;
}

.default {
  background-color: var(--ac-primary);
  color: var(--ac-primary-foreground);
}

.default:hover {
  background-color: color-mix(in oklch, var(--ac-primary) 90%, transparent);
}

.destructive {
  background-color: var(--ac-destructive);
  color: var(--ac-destructive-foreground);
}

.sizeDefault {
  height: 2.5rem;
  padding-inline: 1rem;
}

.sizeSm {
  height: 2.25rem;
  padding-inline: 0.75rem;
}
```

### 3.2 Utility Function: cn()

The `cn()` function merges class names using `clsx`:

```typescript
// lib/utilities.ts
import {type ClassValue, clsx} from "clsx";

/**
 * Merges class names using clsx for conditional classes and conflict resolution.
 * @param inputs - Class name values (strings, objects, arrays, undefined, null)
 * @returns Merged class name string
 * @example
 * ```tsx
 * cn("base-class", styles.button, {
 *   [styles.active]: isActive,
 *   [styles.disabled]: isDisabled,
 * });
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
```

**Usage**:
```typescript
import {cn} from "@arolariu/components/utilities";
import styles from "./my-component.module.css";

cn(
  styles.button,
  className,
  {
    [styles.active]: isActive,
    [styles.disabled]: isDisabled,
  }
);
```

### 3.3 Compound Components Pattern

For complex components, use compound component pattern:

```typescript
// Card component with sub-components
import {Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter} from "@arolariu/components/card";
import {Button} from "@arolariu/components/button";
import styles from "./my-card.module.css";

<Card className={styles.card}>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description text</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

```css
/* my-card.module.css */
.card {
  max-width: 32rem;
  margin-inline: auto;
}
```

### 3.4 useRender + mergeProps Composition

Base UI's canonical composition pattern:

```typescript
import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";

// Example: Custom input with icon
<Input
  render={useRender({
    defaultTagName: "input",
    render: renderProp,
    props: mergeProps(
      {className: cn(styles.input, className)},
      {
        onFocus: handleFocus,
        onBlur: handleBlur,
      }
    ),
  })}
/>
```

**Key Benefits:**
- ✅ Proper event handler merging (user + component handlers both fire)
- ✅ Ref forwarding without manual composition
- ✅ Type-safe prop overrides
- ✅ Consistent with Base UI ecosystem

### 3.5 forwardRef Pattern

All components use `React.forwardRef` for ref forwarding:

```typescript
const MyComponent = React.forwardRef<HTMLDivElement, MyComponentProps>(
  (props, ref) => {
    return <div ref={ref} {...props} />;
  }
);
MyComponent.displayName = "MyComponent";
```

**Why:**
- ✅ Required for Base UI composition
- ✅ Better React DevTools debugging
- ✅ Clear error stack traces
- ✅ Enables ref-based DOM manipulation

### 3.6 Namespace Type Pattern

Enterprise-grade type consumption:

```typescript
// Component definition
namespace Button {
  export type Props = ButtonProps;
  export type State = ButtonState;
}

export {Button};

// Consumer usage
import type {Button} from "@arolariu/components/button";

function MyComponent(props: Button.Props) {
  // ...
}
```

**Why:**
- ✅ Avoids export name collisions
- ✅ Cleaner import statements
- ✅ Better IDE autocomplete
- ✅ Consistent with Base UI patterns

### 3.7 Co-located Test Pattern

Every component has a co-located test file:

```text
button.tsx           # Component implementation
button.module.css    # CSS Module styles
button.test.tsx      # Vitest tests
```

**Test structure:**
```typescript
// button.test.tsx
import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {Button} from "./button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("forwards ref", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Click me</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("applies className", () => {
    render(<Button className="custom">Click me</Button>);
    expect(screen.getByText("Click me")).toHaveClass("custom");
  });
});
```

---

## 4. Import Patterns

### 4.1 Direct Component Imports (Recommended)

```typescript
// Tree-shakeable: Only imports Button code + CSS
import {Button} from "@arolariu/components/button";
import {Card, CardHeader, CardContent} from "@arolariu/components/card";
```

### 4.2 Barrel Imports

```typescript
// All components (larger bundle, use sparingly)
import {Button, Card, Dialog} from "@arolariu/components";
```

### 4.3 Style Import (Required Once)

```typescript
// Import once in app entry point (design tokens only)
import "@arolariu/components/styles";

// Component CSS is auto-loaded when components are imported
```

### 4.4 Utility Imports

```typescript
// Class name utilities
import {cn} from "@arolariu/components/utilities";

// Color conversion utilities
import {
  convertHexToOklchString,
  adjustHexColorLightness,
} from "@arolariu/components/color-conversion-utilities";

// Hooks
import {useIsMobile} from "@arolariu/components/useIsMobile";

// Base UI re-exports
import {mergeProps} from "@arolariu/components/mergeProps";
import {useRender} from "@arolariu/components/useRender";
```

---

## 5. Design Tokens

### 5.1 OKLCH Color Space

All color tokens use OKLCH (Oklab Lightness Chroma Hue) for perceptually uniform colors:

```css
:root {
  /* Primary brand colors */
  --ac-primary: oklch(0.6 0.2 250);
  --ac-primary-foreground: oklch(1 0 0);
  
  /* Semantic colors */
  --ac-destructive: oklch(0.55 0.22 25);
  --ac-success: oklch(0.65 0.18 145);
  --ac-warning: oklch(0.7 0.15 85);
  
  /* Neutral palette */
  --ac-background: oklch(1 0 0);
  --ac-foreground: oklch(0.15 0.01 250);
  --ac-muted: oklch(0.96 0.01 250);
  --ac-muted-foreground: oklch(0.45 0.01 250);
  
  /* Spacing scale */
  --ac-spacing-xs: 0.25rem;
  --ac-spacing-sm: 0.5rem;
  --ac-spacing-md: 1rem;
  --ac-spacing-lg: 1.5rem;
  --ac-spacing-xl: 2rem;
  
  /* Radius scale */
  --ac-radius-sm: 0.25rem;
  --ac-radius-md: 0.5rem;
  --ac-radius-lg: 1rem;
  --ac-radius-full: 9999px;
}

/* Dark mode */
.dark,
[data-theme="dark"] {
  --ac-primary: oklch(0.65 0.18 250);
  --ac-background: oklch(0.15 0.01 250);
  --ac-foreground: oklch(0.95 0.01 250);
}
```

### 5.2 Token Categories

| Category | Prefix | Examples |
|----------|--------|----------|
| **Colors** | `--ac-` | `--ac-primary`, `--ac-destructive` |
| **Spacing** | `--ac-spacing-` | `--ac-spacing-md`, `--ac-spacing-lg` |
| **Radius** | `--ac-radius-` | `--ac-radius-md`, `--ac-radius-full` |
| **Shadow** | `--ac-shadow-` | `--ac-shadow-sm`, `--ac-shadow-lg` |
| **Typography** | `--ac-font-` | `--ac-font-sans`, `--ac-font-mono` |

### 5.3 Color Manipulation

Use `color-mix()` for dynamic color variations:

```css
.button {
  background-color: var(--ac-primary);
}

.button:hover {
  /* Mix with transparent to lighten */
  background-color: color-mix(in oklch, var(--ac-primary) 90%, transparent);
}

.button:active {
  /* Mix with black to darken */
  background-color: color-mix(in oklch, var(--ac-primary) 85%, black);
}
```

---

## 6. NPM Package Configuration

### 6.1 package.json

```json
{
  "name": "@arolariu/components",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "default": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./styles": "./dist/index.css",
    "./button": {
      "import": "./dist/components/ui/button.js",
      "types": "./dist/components/ui/button.d.ts"
    },
    "./utilities": {
      "import": "./dist/lib/utilities.js",
      "types": "./dist/lib/utilities.d.ts"
    },
    "./color-conversion-utilities": {
      "import": "./dist/lib/color-conversion-utilities.js",
      "types": "./dist/lib/color-conversion-utilities.d.ts"
    },
    "./useIsMobile": {
      "import": "./dist/hooks/use-mobile.js",
      "types": "./dist/hooks/use-mobile.d.ts"
    },
    "./mergeProps": {
      "import": "./dist/lib/merge-props.js",
      "types": "./dist/lib/merge-props.d.ts"
    },
    "./useRender": {
      "import": "./dist/lib/use-render.js",
      "types": "./dist/lib/use-render.d.ts"
    }
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0",
    "@base-ui/react": "^0.0.1",
    "motion": "^11.0.0"
  },
  "sideEffects": ["**/*.css"]
}
```

### 6.2 Publishing Workflow

The `official-components-publish.yml` GitHub Action:

1. Triggers on tag push (`components-v*`) and manual `workflow_dispatch`
2. Builds library with RSLib
3. Runs tests
4. Publishes to npm registry
5. Creates GitHub release

---

## 7. Accessibility

### 7.1 Base UI Foundation

All interactive components are built on Base UI primitives:

- **Keyboard Navigation**: Full keyboard support (Tab, Enter, Escape, Arrow keys)
- **Screen Readers**: ARIA attributes, roles, and live regions
- **Focus Management**: Proper focus trapping in modals and popovers
- **Color Contrast**: WCAG 2.1 AA compliant OKLCH colors
- **Touch Targets**: Minimum 44×44px for interactive elements

### 7.2 Accessibility Features by Component

| Component | Accessibility Features |
|-----------|----------------------|
| Dialog | Focus trap, Escape to close, `aria-modal`, `role="dialog"` |
| Select | Keyboard navigation, `aria-expanded`, `aria-selected`, `aria-activedescendant` |
| Tabs | Arrow key navigation, `aria-selected`, `aria-controls`, `role="tablist"` |
| Tooltip | Delayed show, keyboard dismissible, `role="tooltip"`, `aria-describedby` |
| Alert | `role="alert"`, `aria-live="assertive"` |
| Slider | `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, Arrow key adjustment |
| Checkbox | `aria-checked`, Space/Enter toggle |
| RadioGroup | Arrow key navigation, `aria-checked`, `role="radiogroup"` |
| Switch | `aria-checked`, `role="switch"` |
| Meter | `aria-valuemin`, `aria-valuemax`, `aria-valuenow` |

### 7.3 ARIA Patterns Implemented

- **Focus Management**: `useFocusTrap`, `useFocusReturn`
- **Keyboard Navigation**: Arrow keys, Tab, Enter, Space, Escape
- **Screen Reader Announcements**: `aria-live`, `aria-atomic`, `aria-relevant`
- **Descriptive Labels**: `aria-label`, `aria-labelledby`, `aria-describedby`
- **State Communication**: `aria-expanded`, `aria-selected`, `aria-checked`, `aria-disabled`

---

## 8. Trade-offs and Alternatives

### 8.1 Considered Alternatives

| Alternative | Reason for Rejection (v1.0) |
|-------------|---------------------|
| **Material UI** | Opinionated styling, larger bundle, runtime CSS-in-JS |
| **Chakra UI** | Runtime CSS-in-JS, Next.js RSC issues, performance overhead |
| **Headless UI** | Less comprehensive, missing components, smaller ecosystem |
| **shadcn/ui (copy-paste)** | Hard to update, no versioning, maintenance burden |
| **Ant Design** | Too enterprise-focused, large bundle, opinionated design |
| **Radix UI (v0.x)** | Fragmented packages (25+), CVA dependency, Tailwind coupling |

### 8.2 Why Base UI + CSS Modules? (v1.0)

**Base UI**:
- ✅ Unstyled primitives (full styling control)
- ✅ Successor to Radix UI (same team)
- ✅ Consolidated `@base-ui/react` package (vs. 25+ packages)
- ✅ React 18/19 compatible
- ✅ Modern composition patterns (`useRender`, `mergeProps`)
- ✅ Active maintenance by MUI team

**CSS Modules**:
- ✅ Zero runtime overhead (statically extracted)
- ✅ Scoped styles (no class name collisions)
- ✅ Framework agnostic (works with Next.js, Vite, CRA)
- ✅ Better code splitting (tree-shakeable CSS)
- ✅ Type-safe with TypeScript (`.module.css.d.ts`)
- ✅ No build-time JIT dependency

**OKLCH Color Space**:
- ✅ Perceptually uniform (consistent lightness across hues)
- ✅ Wider gamut support (P3, Rec2020)
- ✅ Better color manipulation (`color-mix()`)
- ✅ Future-proof (CSS Color Level 4 standard)

### 8.3 Trade-offs Accepted

**Removed Tailwind CSS:**
- ❌ **Lost**: Utility-first API, rapid prototyping, JIT compiler
- ✅ **Gained**: Smaller bundle, no config needed, CSS Module scoping

**Migrated from Radix UI to Base UI:**
- ❌ **Lost**: Mature documentation, larger community
- ✅ **Gained**: Consolidated package, modern patterns, smaller bundle

**Dropped CVA (class-variance-authority):**
- ❌ **Lost**: Type-safe variant generation
- ✅ **Gained**: Simpler implementation, no dependency, CSS Module class maps

---

## 9. Testing Strategy

### 9.1 Test Coverage

- **53 test files** covering all 71 components
- Co-located tests (`*.test.tsx` next to `*.tsx`)
- Vitest + React Testing Library
- Smoke tests, prop tests, interaction tests, accessibility tests

### 9.2 Test Structure

```typescript
// button.test.tsx
import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {Button} from "./button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("forwards ref", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Click me</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("applies className", () => {
    render(<Button className="custom">Click me</Button>);
    expect(screen.getByText("Click me")).toHaveClass("custom");
  });

  it("supports variant prop", () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByText("Delete")).toHaveClass("destructive");
  });
});
```

### 9.3 CI/CD Testing

- **GitHub Actions**: Run tests on PR + push
- **Code Coverage**: Tracked with Vitest coverage
- **Build Validation**: Ensure RSLib build succeeds
- **Type Checking**: `tsc --noEmit` validation

---

## 10. Related Documentation

- [Base UI Documentation](https://base-ui.com/react/components)
- [CSS Modules Guide](https://github.com/css-modules/css-modules)
- [OKLCH Color Space](https://oklch.com/)
- [React forwardRef](https://react.dev/reference/react/forwardRef)
- [packages/components/README.md](https://github.com/arolariu/arolariu.ro/blob/main/packages/components/README.md) - Full component catalog
- [packages/components/MIGRATION.md](https://github.com/arolariu/arolariu.ro/blob/main/packages/components/MIGRATION.md) - v0.x → v1.0 migration guide
- [packages/components/EXAMPLES.md](https://github.com/arolariu/arolariu.ro/blob/main/packages/components/EXAMPLES.md) - Real-world usage patterns

---

## 11. File Locations

| File | Purpose |
|------|---------|
| `packages/components/src/components/ui/` | 71 component implementations |
| `packages/components/src/components/ui/*.module.css` | CSS Module styles |
| `packages/components/src/components/ui/*.test.tsx` | Co-located tests |
| `packages/components/src/hooks/` | Custom React hooks |
| `packages/components/src/lib/` | Utility functions |
| `packages/components/src/motion/` | Motion utilities |
| `packages/components/src/index.ts` | Barrel exports |
| `packages/components/src/index.css` | Design tokens (`--ac-*`) |
| `packages/components/rslib.config.ts` | RSLib build configuration |
| `packages/components/package.json` | NPM package manifest |
| `packages/components/MIGRATION.md` | v0.x → v1.0 migration guide |
| `packages/components/EXAMPLES.md` | Real-world usage patterns |
| `.github/workflows/official-components-publish.yml` | CI/CD workflow |

---

## 12. Version History

| Version | Date | Major Changes |
|---------|------|---------------|
| **v1.0.0** | 2026-03-13 | Base UI + CSS Modules architecture, OKLCH tokens, 71 components |
| **v0.5.0** | 2026-01-16 | Renamed `gradient-utils` to `color-conversion-utilities` |
| **v0.4.0** | 2025-12-05 | Trusted Publishing, Recharts v3 |
| **v0.3.0** | 2025-11-10 | Added ButtonGroup, EmptyState, Field, InputGroup, Item, Kbd, Spinner |
| **v0.2.0** | 2025-10-01 | Migrated to Nx monorepo |
| **v0.1.0** | 2025-08-12 | Initial release with Radix UI + Tailwind CSS |
