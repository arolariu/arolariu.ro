# Contributing to `@arolariu/components`

Thank you for contributing to the component library.

This package is built around a **Base UI + CSS Modules** architecture. The goal is to keep components accessible, composable, well-typed, and easy to maintain across the monorepo.

If you are adding or updating a component, this document is the source of truth for how component code in `packages/components` should be authored.

---

## What This Package Uses

- **Base UI** for accessible primitives and composition APIs
- **CSS Modules** for scoped component styling
- **TypeScript** for public API safety
- **Vitest + Testing Library** for unit and interaction tests
- **RSLib** for package builds

Please align new contributions with the current source architecture in:

- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/switch.tsx`
- `src/index.css`

---

## Quick Start

### Prerequisites

- Node.js 22+
- npm
- Git

### Setup

```bash
git clone https://github.com/arolariu/arolariu.ro.git
cd arolariu.ro
npm install
cd packages/components
```

### Useful Commands

```bash
npm run build
npm run test
npm run build:clean
```

---

## Contribution Scope

Good contributions include:

- fixing bugs in existing components
- improving accessibility behavior
- adding tests
- improving JSDoc and usage documentation
- adding new components that fit the package architecture
- refining CSS token usage or state styling patterns

Before opening a pull request, make sure your changes:

- build successfully
- include or update tests
- preserve accessibility semantics
- follow the authoring pattern documented below

---

## Source Layout

New UI components belong in `src/components/ui/`.

Canonical component file structure:

```text
src/components/ui/
  component.tsx          ← Component implementation
  component.module.css   ← Scoped styles
  component.test.tsx     ← Unit tests
```

When adding a new public component:

1. Create the implementation in `src/components/ui/`.
2. Create a colocated CSS Module.
3. Create a colocated test file.
4. Export the public API from `src/index.ts`.

---

## Architecture Principles

### 1. Prefer Base UI Primitives

Use Base UI when a primitive exists for the behavior you need. This ensures:

- keyboard support
- accessible state attributes
- correct ARIA semantics
- predictable composition via `render`

Examples in the current codebase:

- `src/components/ui/input.tsx`
- `src/components/ui/switch.tsx`
- `src/components/ui/accordion.tsx`
- `src/components/ui/button.tsx`

### 2. Use CSS Modules for Styling

All component styles should live in a colocated `*.module.css` file.

Do not introduce alternate styling systems for library component surfaces when a CSS Module belongs with the component.

### 3. Keep Public APIs Typed and Documented

Public props and state types should be explicit, exported when needed, and documented with JSDoc according to RFC 1002.

### 4. Preserve Composition

Components should support Base UI's composition model through `render` where appropriate. When wrapping a Base UI primitive, the wrapper should preserve the primitive's semantics and state exposure.

---

## Canonical Component Authoring Pattern

For new primitive-like components and wrappers, follow this pattern:

```tsx
// 1. Import Base UI primitive + utilities
import { useRender } from "@base-ui/react/use-render";
import { mergeProps } from "@base-ui/react/merge-props";
import { cn } from "@/lib/utilities";
import styles from "./component.module.css";

// 2. Define state and props interfaces with JSDoc
export interface ComponentState { ... }
export interface ComponentProps extends useRender.ComponentProps<"div", ComponentState> { ... }

// 3. Implement with useRender
function Component(props: Component.Props) {
  const { render, className, children, ...otherProps } = props;
  return useRender({
    defaultTagName: "div",
    render,
    props: mergeProps({ className: cn(styles.root, className) }, otherProps, { children }),
  });
}
Component.displayName = "Component";

// 4. Add namespace types
export namespace Component {
  export type State = ComponentState;
  export type Props = ComponentProps;
}
```

### Implementation Notes

- Import `useRender` and `mergeProps` from `@base-ui/react`.
- Merge consumer `className` values with module classes via `cn`.
- Set a stable `displayName`.
- Add the `Component` namespace with `State` and `Props` aliases for the public typing pattern used in this package.
- Keep state serializable and focused on what the render callback needs.

### Wrapping an Existing Base UI Primitive

When a Base UI primitive already provides behavior, wrap it instead of recreating it. In that case, follow the pattern used in files such as:

- `src/components/ui/input.tsx`
- `src/components/ui/switch.tsx`
- `src/components/ui/accordion.tsx`

That usually means:

1. render the Base UI primitive
2. pass the wrapper styles through the primitive's `render` prop
3. merge consumer props with `mergeProps`
4. preserve Base UI state and accessibility behavior

### Backward Compatibility

Some components still carry compatibility shims from older APIs, such as `asChild` support in `src/components/ui/button.tsx`. Do not add compatibility props unless they are required for an existing public contract.

For new components, prefer the Base UI `render` model first.

---

## Type and JSDoc Requirements

Document public component APIs so the code explains behavior, not just signatures.

At minimum:

- document exported props interfaces
- document exported state interfaces and type aliases
- document the component itself
- include examples for non-trivial APIs
- document behavior, constraints, and accessibility implications

### Recommended Pattern

```tsx
/**
 * Serializable state exposed to Base UI render callbacks.
 */
export interface ComponentState extends Record<string, unknown> {
  disabled: boolean;
}

/**
 * Props for the shared component wrapper.
 */
export interface ComponentProps extends useRender.ComponentProps<"div", ComponentState> {
  /**
   * Additional CSS classes merged with the root styles.
   */
  className?: string;
}

/**
 * Renders a styled component wrapper with Base UI composition support.
 *
 * @example
 * ```tsx
 * <Component />
 * ```
 */
function Component(props: Readonly<Component.Props>): React.ReactElement {
  // implementation
}
```

Avoid documentation that only restates the symbol name.

---

## CSS Module Authoring Rules

CSS Modules are the canonical styling approach for this package.

### Use Design Tokens from `src/index.css`

Use the shared `--ac-*` custom properties defined in:

- `src/index.css`

Examples:

- `--ac-primary`
- `--ac-foreground`
- `--ac-border`
- `--ac-radius-md`
- `--ac-space-3`
- `--ac-transition-fast`

Do not hardcode values that should come from the token system unless the value is truly component-specific.

### Style State Through `data-*` Attributes

Base UI exposes state through attributes such as:

- `[data-checked]`
- `[data-disabled]`
- `[data-panel-open]`

Use those attributes as the primary styling contract.

Example:

```css
.root[data-checked] {
  background-color: var(--ac-primary);
}

.root[data-disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}
```

Current examples:

- `src/components/ui/switch.module.css`
- `src/components/ui/accordion.module.css`
- `src/components/ui/button.module.css`

### Guard Hover Styles with Pointer-Capable Media Queries

Hover styles should be wrapped in:

```css
@media (hover: hover) {
  .root:hover {
    /* hover styles */
  }
}
```

This matches the current package styling approach and avoids misleading hover behavior on touch-first devices.

### Use `color-mix(in oklch, ...)` for Dynamic Color Treatments

When deriving hover or softened surfaces from tokens, prefer:

```css
background-color: color-mix(in oklch, var(--ac-primary), transparent 10%);
```

This is already used in the package and keeps color transformations consistent with the OKLCH token system.

### Keep Styles Scoped

- use local class names from the module
- avoid global selectors unless there is a strong package-level need
- avoid introducing resets in component CSS
- keep structure and state selectors easy to read

---

## Testing Requirements

Every component must include a colocated `*.test.tsx` file.

Minimum required coverage for each component:

1. **Smoke test**  
   Confirms the component renders without crashing.

2. **Ref forwarding test**  
   Confirms refs reach the expected DOM node when the component supports refs.

3. **`className` merge test**  
   Confirms custom classes are preserved alongside default module styling.

4. **State change or interaction test**  
   Confirms the component updates correctly for clicks, keyboard input, open/closed state, checked state, or other interactive behavior.

5. **Accessibility test**  
   Confirms expected roles, labels, ARIA attributes, and accessible naming.

Reference tests in the current codebase:

- `src/components/ui/input.test.tsx`
- `src/components/ui/switch.test.tsx`
- `src/components/ui/button.test.tsx`

### Testing Stack

- Vitest
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@testing-library/user-event` for interactions

### Testing Guidance

- prefer role-based queries
- verify accessible names
- cover keyboard behavior for interactive controls
- assert state attributes such as `aria-checked` or `data-disabled`
- keep tests focused on public behavior rather than internal implementation details

---

## Accessibility Expectations

Accessibility is a release requirement, not a follow-up task.

When contributing a component:

- use the appropriate Base UI primitive when available
- preserve keyboard interaction
- preserve focus visibility
- preserve or improve ARIA semantics
- verify labels, roles, and descriptions in tests

If a component is presentational only, it should still avoid introducing inaccessible structure or misleading semantics.

---

## Styling and Naming Conventions

### File Naming

Use lowercase kebab-case:

- `button.tsx`
- `button.module.css`
- `button.test.tsx`

### CSS Class Naming

Prefer simple, local names that match the component structure:

- `root`
- `trigger`
- `thumb`
- `panel`
- `icon`
- `content`

Use variant or size names only when they represent real styling branches:

- `default`
- `destructive`
- `outline`
- `sizeSm`
- `sizeLg`

### Export Naming

- component names use PascalCase
- exported prop and state types use PascalCase
- colocated helpers should have clear names such as `buttonVariants`

---

## Pull Request Checklist

Before opening a pull request, verify that you have:

- [ ] followed the Base UI + CSS Modules architecture
- [ ] added or updated JSDoc for public APIs
- [ ] added `component.test.tsx`
- [ ] covered smoke, ref, className, interaction, and accessibility cases
- [ ] used `--ac-*` tokens from `src/index.css`
- [ ] styled component states with `data-*` attributes where applicable
- [ ] wrapped hover styles in `@media (hover: hover)`
- [ ] used `color-mix(in oklch, ...)` when deriving dynamic colors
- [ ] exported the component from `src/index.ts`
- [ ] confirmed the package builds and tests pass

---

## Need Help?

If you are unsure how to structure a contribution:

1. start by reviewing an existing component with similar behavior
2. follow the patterns in `button.tsx`, `input.tsx`, or `switch.tsx`
3. keep the implementation small and well-documented
4. open a draft pull request early if you want feedback

Thank you for helping keep `@arolariu/components` consistent, accessible, and maintainable.
