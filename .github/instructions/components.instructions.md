---
version: "1.0.0"
lastUpdated: "2026-02-09"
name: 'Component Library'
description: 'Guidelines for the @arolariu/components shared UI library built on Base UI and CSS Modules'
applyTo: 'packages/components/**/*.tsx, packages/components/**/*.ts'
---

# Component Library Guidelines

## Instruction Contract

### Scope
Applies to shared component library changes in `packages/components/`.

### Mandatory Rules
- Use `cn()` class merging and `forwardRef` patterns where required.
- Keep components domain-agnostic and exported through `src/index.ts`.
- Include Storybook coverage for newly added public components.

### Prohibited Actions
- Do not import from application-specific `sites/` paths.
- Do not ship component changes without barrel export updates.
- Do not introduce inline styles instead of CSS Modules.

### Required Verification Commands
```bash
npm run build:components
```

### Failure Handling
- If verification fails, stop and report failing command output with impacted files.
- If constraints conflict with task requests, escalate and request explicit user direction.
- If uncertainty remains on behavior-impacting choices, ask before continuing.

### Drift Watchpoints
- Barrel export completeness
- Component API signatures and story coverage
- Build/publish assumptions for `@arolariu/components`


Guidelines for developing and maintaining the `@arolariu/components` shared UI library.

---

## Quick Reference

| Property | Value |
|----------|-------|
| **Package** | `@arolariu/components` |
| **Location** | `packages/components/` |
| **Base** | Base UI + CSS Modules |
| **Styling** | CSS Modules with `cn()` utility |
| **Stories** | Colocated in `src/components/ui/` + docs in `src/stories/` |
| **Exports** | Barrel export via `src/index.ts` |

---

## Project Structure

```
packages/components/
  src/
    components/
      ui/                    # UI primitives + colocated stories and tests
    hooks/                   # Shared React hooks
    lib/
      utilities.ts           # cn() utility for class merging
    stories/                 # Storybook docs/foundations (Welcome, Typography, etc.)
    index.ts                 # Barrel export — ALL components must be exported here
```

---

## Component Creation Checklist

When adding a new component:

1. **Create the component** in `src/components/ui/[component-name].tsx`
2. **Export from barrel** — Add to `src/index.ts`
3. **Add Storybook story** in `src/components/ui/[component-name].stories.tsx` (colocated)
4. **Follow patterns**: Base UI primitives, `cn()` for styling, `forwardRef` for DOM refs
5. **Accessibility**: ARIA attributes, keyboard navigation, focus management

---

## Component Pattern

```tsx
"use client";

import * as React from "react";
import {cn} from "@/lib/utilities";
import styles from "./button.module.css";

const variantStyles: Record<string, string> = {
  default: styles.default!,
  destructive: styles.destructive!,
  outline: styles.outline!,
  ghost: styles.ghost!,
};

export type ButtonVariant = "default" | "destructive" | "outline" | "ghost";
export type ButtonSize = "default" | "sm" | "lg" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({className, variant = "default", size = "default", ...props}, ref) => {
    return (
      <button
        className={cn(styles.base, variantStyles[variant], className)}
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

- **Always** use `cn()` from `@/lib/utilities` for class merging (never manual concatenation)
- **Always** use `forwardRef` for components that render DOM elements
- **Always** export both the component and its props type
- **Always** add the component to `src/index.ts` barrel export
- **Always** set `displayName` on forwardRef components
- **Never** add project-specific business logic to shared components
- **Never** import from `sites/` directories — components must be standalone
- **Never** use inline styles — use CSS Modules exclusively

---

## Styling with cn()

```tsx
import {cn} from "@/lib/utilities";
import styles from "./component.module.css";

// Merge CSS Module classes with conditional and user-provided classes
<div className={cn(
  styles.base,
  isActive && styles.active,
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
// src/components/ui/button.stories.tsx
import type {Meta, StoryObj} from "@storybook/react";
import {Button} from "./button";

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
