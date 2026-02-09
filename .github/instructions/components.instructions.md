---
version: "1.0.0"
lastUpdated: "2026-02-09"
name: 'Component Library'
description: 'Guidelines for the @arolariu/components shared UI library built on Radix UI, shadcn/ui, and Tailwind CSS'
applyTo: 'packages/components/**/*.tsx, packages/components/**/*.ts'
---

# Component Library Guidelines

Guidelines for developing and maintaining the `@arolariu/components` shared UI library.

---

## Quick Reference

| Property | Value |
|----------|-------|
| **Package** | `@arolariu/components` |
| **Location** | `packages/components/` |
| **Base** | Radix UI + shadcn/ui |
| **Styling** | Tailwind CSS with `cn()` utility |
| **Stories** | Storybook at `stories/` |
| **Exports** | Barrel export via `src/index.ts` |

---

## Project Structure

```
packages/components/
  src/
    components/
      ui/                    # UI primitives (Button, Dialog, Card, etc.)
    lib/
      utils.ts               # cn() utility for class merging
    index.ts                 # Barrel export — ALL components must be exported here
  stories/                   # Storybook stories
```

---

## Component Creation Checklist

When adding a new component:

1. **Create the component** in `src/components/ui/[component-name].tsx`
2. **Export from barrel** — Add to `src/index.ts`
3. **Add Storybook story** in `stories/[component-name].stories.tsx`
4. **Follow patterns**: Radix primitives, `cn()` for styling, `forwardRef` for DOM refs
5. **Accessibility**: ARIA attributes, keyboard navigation, focus management

---

## Component Pattern

```tsx
import * as React from "react";
import {cn} from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({className, variant = "default", size = "default", ...props}, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium",
          // variant styles...
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export {Button};
export type {ButtonProps};
```

---

## Key Rules

- **Always** use `cn()` from `@/lib/utils` for class merging (never manual concatenation)
- **Always** use `forwardRef` for components that render DOM elements
- **Always** export both the component and its props type
- **Always** add the component to `src/index.ts` barrel export
- **Always** set `displayName` on forwardRef components
- **Never** add project-specific business logic to shared components
- **Never** import from `sites/` directories — components must be standalone
- **Never** use inline styles — use Tailwind CSS classes exclusively

---

## Styling with cn()

```tsx
import {cn} from "@/lib/utils";

// Merge base classes with conditional and user-provided classes
<div className={cn(
  "base-class",
  isActive && "active-class",
  className, // Allow consumers to override
)} />
```

---

## Barrel Export

Every new component MUST be added to `src/index.ts`:

```typescript
// src/index.ts
export {Button} from "./components/ui/button";
export type {ButtonProps} from "./components/ui/button";
export {Card, CardContent, CardHeader, CardTitle} from "./components/ui/card";
// ... add new exports here
```

---

## Storybook Stories

```tsx
// stories/button.stories.tsx
import type {Meta, StoryObj} from "@storybook/react";
import {Button} from "../src/components/ui/button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: "Button",
  },
};

export const Destructive: Story = {
  args: {
    children: "Delete",
    variant: "destructive",
  },
};
```
