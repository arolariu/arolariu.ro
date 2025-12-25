# RFC 1006: Component Library Architecture

- **Status**: Implemented
- **Date**: 2025-12-25
- **Authors**: Alexandru-Razvan Olariu
- **Related Components**: `packages/components/`, `@arolariu/components` npm package

---

## Abstract

This RFC documents the architecture and design decisions for the @arolariu/components shared React component library. Built on Radix UI primitives with Tailwind CSS styling, the library provides 60+ accessible, production-ready components for building modern web interfaces. The library is published to npm and consumed by the arolariu.ro website and potentially other projects.

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

- **Radix Primitives**: Build on battle-tested accessibility primitives
- **Tailwind Integration**: First-class Tailwind CSS support
- **Tree-Shaking**: ESM modules with individual component exports
- **Storybook**: Interactive documentation for all components
- **Monorepo Integration**: Seamless development within Nx monorepo
- **NPM Publishing**: Automated CI/CD for package releases

---

## 2. Technical Design

### 2.1 Architecture Overview

```text
packages/components/
├── src/
│   ├── components/
│   │   └── ui/                    # All 60+ UI components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       └── ...
│   ├── hooks/                     # Custom React hooks
│   │   └── use-mobile.tsx
│   ├── lib/                       # Utility functions
│   │   └── utilities.ts           # cn() classname merger
│   ├── index.ts                   # Barrel exports
│   └── index.css                  # Base styles
├── stories/                       # Storybook stories
│   ├── Button.stories.tsx
│   └── ...
├── rslib.config.ts               # RSLib build configuration
├── package.json                  # npm package manifest
└── tsconfig.json                 # TypeScript configuration
```

### 2.2 Build System

The library uses **RSLib** (built on Rsbuild) for bundling:

```typescript
// rslib.config.ts
export default {
  lib: [
    {
      format: "esm",
      output: { distPath: { root: "./dist/esm" } },
    },
    {
      format: "cjs", 
      output: { distPath: { root: "./dist/cjs" } },
    },
  ],
  source: {
    entry: { index: "./src/index.ts" },
  },
  output: {
    externals: ["react", "react-dom"],
  },
};
```

**Build Outputs**:
- ESM modules for modern bundlers (Next.js, Vite)
- CommonJS for legacy Node.js environments
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

### 2.4 Component Inventory (60+ Components)

```text
accordion          alert-dialog       alert              aspect-ratio
avatar             background-beams   badge              breadcrumb
bubble-background  button-group       button             calendar
card               carousel           chart              checkbox
collapsible        command            context-menu       counting-number
dialog             dot-background     drawer             dropdown-menu
dropdrawer         empty              field              fireworks-background
flip-button        form               gradient-background gradient-text
highlight-text     hole-background    hover-card         input-group
input-otp          input              item               kbd
label              menubar            navigation-menu    pagination
popover            progress           radio-group        resizable
ripple-button      scratcher          scroll-area        select
separator          sheet              sidebar            skeleton
slider             sonner             spinner            switch
table              tabs               textarea           toggle-group
toggle             tooltip            typewriter
```

---

## 3. Component Patterns

### 3.1 Component Structure

Each component follows a consistent pattern:

```typescript
// components/ui/button.tsx
import * as React from "react";
import {Slot} from "@radix-ui/react-slot";
import {cva, type VariantProps} from "class-variance-authority";
import {cn} from "@/lib/utilities";

// 1. Define variants using cva
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// 2. Define props interface
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

// 3. Forward ref component
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({className, variant, size, asChild = false, ...props}, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({variant, size, className}))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// 4. Export component and variants
export {Button, buttonVariants};
```

### 3.2 Utility Function: cn()

The `cn()` function merges Tailwind classes intelligently:

```typescript
// lib/utilities.ts
import {type ClassValue, clsx} from "clsx";
import {twMerge} from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Usage**:
```typescript
cn("px-4 py-2", className, {
  "bg-primary": isActive,
  "bg-muted": !isActive,
});
```

### 3.3 Compound Components Pattern

For complex components, use compound component pattern:

```typescript
// Card component with sub-components
import {Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter} from "@arolariu/components/card";

<Card>
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

---

## 4. Import Patterns

### 4.1 Direct Component Imports (Recommended)

```typescript
// Tree-shakeable: Only imports Button code
import {Button} from "@arolariu/components/button";
import {Card, CardHeader, CardContent} from "@arolariu/components/card";
```

### 4.2 Barrel Imports

```typescript
// All components (larger bundle, use sparingly)
import {Button, Card, Dialog} from "@arolariu/components";
```

### 4.3 Style Import (Required)

```typescript
// Import once in app entry point
import "@arolariu/components/styles";
```

---

## 5. Storybook Documentation

### 5.1 Story Structure

```typescript
// stories/Button.stories.tsx
import type {Meta, StoryObj} from "@storybook/react";
import {Button} from "../src/components/ui/button";

const meta = {
  title: "UI/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Button",
    variant: "default",
  },
};

export const Destructive: Story = {
  args: {
    children: "Delete",
    variant: "destructive",
  },
};
```

### 5.2 Storybook Deployment

- **URL**: https://storybook.arolariu.ro
- **Build**: `npm run storybook:build`
- **CI/CD**: Deployed via GitHub Actions on main branch push

---

## 6. NPM Package Configuration

### 6.1 package.json

```json
{
  "name": "@arolariu/components",
  "version": "1.x.x",
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "types": "./dist/esm/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js",
      "types": "./dist/esm/index.d.ts"
    },
    "./styles": "./dist/esm/index.css",
    "./button": "./dist/esm/components/ui/button.js",
    "./card": "./dist/esm/components/ui/card.js"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "sideEffects": ["*.css"]
}
```

### 6.2 Publishing Workflow

The `official-components-publish.yml` GitHub Action:

1. Triggers on push to main (when `packages/components` changes)
2. Builds library with RSLib
3. Runs tests
4. Publishes to npm registry
5. Creates GitHub release

---

## 7. Accessibility

### 7.1 Radix UI Foundation

All interactive components are built on Radix UI primitives:

- **Keyboard Navigation**: Full keyboard support (Tab, Enter, Escape, Arrow keys)
- **Screen Readers**: ARIA attributes and live regions
- **Focus Management**: Proper focus trapping in modals
- **Color Contrast**: WCAG 2.1 AA compliant colors

### 7.2 Accessibility Features by Component

| Component | Accessibility Features |
|-----------|----------------------|
| Dialog | Focus trap, Escape to close, aria-modal |
| Select | Keyboard navigation, aria-expanded, aria-selected |
| Tabs | Arrow key navigation, aria-selected, aria-controls |
| Tooltip | Delayed show, keyboard dismissible |
| Alert | role="alert", aria-live |

---

## 8. Trade-offs and Alternatives

### 8.1 Considered Alternatives

| Alternative | Reason for Rejection |
|-------------|---------------------|
| **Material UI** | Opinionated styling, larger bundle |
| **Chakra UI** | Runtime CSS-in-JS, Next.js RSC issues |
| **Headless UI** | Less comprehensive, missing components |
| **shadcn/ui (copy-paste)** | Hard to update, no versioning |
| **Ant Design** | Too enterprise-focused, large bundle |

### 8.2 Why Radix + Tailwind?

**Radix UI**:
- ✅ Unstyled primitives (full styling control)
- ✅ Battle-tested accessibility
- ✅ React 19 compatible
- ✅ Active maintenance

**Tailwind CSS**:
- ✅ Utility-first (no naming conflicts)
- ✅ PurgeCSS for production builds
- ✅ Next.js native support
- ✅ Design token integration

---

## 9. Related Documentation

- [Radix UI Documentation](https://www.radix-ui.com/docs/primitives)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Class Variance Authority](https://cva.style/docs)
- [Storybook Documentation](https://storybook.js.org/docs)
- [packages/components/readme.md](../../packages/components/readme.md) - Full component catalog

---

## 10. File Locations

| File | Purpose |
|------|---------|
| `packages/components/src/` | Component source code |
| `packages/components/stories/` | Storybook stories |
| `packages/components/rslib.config.ts` | Build configuration |
| `packages/components/package.json` | NPM package manifest |
| `.github/workflows/official-components-publish.yml` | CI/CD workflow |
