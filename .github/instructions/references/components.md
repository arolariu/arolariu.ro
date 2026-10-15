# Component Library Reference Catalog

Owner: `.github/instructions/components.instructions.md`. This catalog holds extensive `@arolariu/components`-specific examples,
anti-patterns, edge cases, and rationale. It does not define a workflow — component procedure uses `react-client-component` when the file
directly needs client features and `react-server-component` when it remains server-compatible — and it does not restate generic
React/TypeScript rules or root safety policy.

## Base UI composition: `useRender` + `mergeProps`

`packages/components/src/components/ui/button.tsx` is the canonical composition pattern. Read it in full before adding a new Base UI
wrapper; the shape below is abbreviated:

```tsx
import {Button as ButtonPrimitive} from "@base-ui/react/button";
import * as React from "react";

function ExampleButton({ref, ...props}: Readonly<React.ComponentPropsWithRef<typeof ButtonPrimitive>>): React.JSX.Element {
  return (
    <ButtonPrimitive
      {...props}
      ref={ref}
    />
  );
}
```

Key points a new component must preserve:

- `useRender` + `mergeProps` — not manual `cloneElement` — merges the library's className/handlers with a consumer-supplied `render` element
  so both sets of event handlers fire.
- The `Component.Props` / `Component.State` namespace pattern (`namespace Button { export type State = ...; export type Props = ...; }`) is
  the enterprise-friendly public type surface; export the namespace-free `ButtonProps`/`ButtonState` names too when a consumer needs them
  directly (both are exported from `button.tsx` and re-exported from the barrel).

## Domain independence and non-native interaction

The live `button.tsx` delegates interaction to the actual Base UI Button. For a non-button render target, use `nativeButton={false}` and
preserve the supplied DOM props/ref. Do not restore an ad hoc child-slot or disabled-only keyboard shim.

Disabled controls must not activate through pointer or keyboard. The primitive's explicit `focusableWhenDisabled` policy may retain keyboard
focus without enabling activation. Test ordinary native targets and supported custom targets through the real primitive.

Components stay domain-agnostic: no `sites/**` import, no invoice/merchant/ account-specific prop, copy, or business logic. A component that
needs domain data takes it as a prop from the consumer in `sites/arolariu.ro`; it does not fetch or know about `Invoice`/`Merchant` types
itself.

## API, variant, and ref decisions

- Variant/size maps are `Record<Variant, string>` keyed by an exported string-literal union (`ButtonVariant`, `ButtonSize`) and resolved
  through a `buttonVariants({variant, size, className})` helper that also merges the consumer's `className` with `cn()` — export the helper
  (`buttonVariants`) alongside the component when consumers need the composed class string without rendering the component (for example a
  `render`-based composition elsewhere).
- Receive a typed React 19 `ref` prop when consumers need to focus, measure or scroll the actual node. Preserve cleanup-returning callback
  refs and generic inference.
- Expose `render`, never removed `asChild` or a legacy alias. The package has no React 18 forwarding fallback.

## CSS Modules and class composition

Every component that owns visual presentation pairs with a colocated `<name>.module.css` and composes classes exclusively through `cn()`
from `src/lib/utilities.ts` (a thin `clsx` wrapper). Intentional style-free composition primitives may omit the CSS file:

```tsx
import {cn} from "@/lib/utilities";
import styles from "./button.module.css";

const composedClassName = cn(styles.button, variantStyles[variant], sizeStyles[size], className);
```

Anti-pattern: concatenating class name strings manually (`` `${styles.button} ${className}` ``) instead of `cn()` breaks when `className` is
`undefined` (produces a trailing space and, more importantly, skips `clsx`'s falsy-value filtering used elsewhere for conditional classes).

## Accessibility and focus

- Prefer a native `<button>` for button behavior. If a public API must support an enabled non-native button-role target, add focusability
  plus Enter/Space activation and focused tests; do not cite the historical disabled-only helper as proof that this parity already exists.
- Preserve Base UI's existing ARIA wiring. Where the installed primitive lacks a required relationship, use the package's tested owning
  boundary (for example Tooltip description registration), not a competing global role/ID policy.
- Apply `packages/components/ACCESSIBILITY.md`: applicable WCAG 2.2 A/AA criteria, meaningful localized consumer content and explicit
  native-browser/AT evidence.
- `focus-scope.tsx` and `visually-hidden.tsx` are the existing focus-trap and screen-reader-only primitives; reuse them instead of writing a
  new `tabIndex`/`sr-only` implementation for a new overlay or icon-only control.

## Stories, tests, and exports

Every public component ships with a colocated Storybook story, a colocated Vitest/Testing Library test, and a barrel export —
`button.stories.tsx`, `button.test.tsx`, and the `src/index.ts` entry are all touched together:

```tsx
// button.stories.tsx
const meta = {
  title: "Components/Actions/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: {componentSubtitle: "✅ Stable"},
  argTypes: {
    variant: {control: "select", options: ["default", "destructive", "outline", "secondary", "ghost", "link"]},
  },
} satisfies Meta<typeof Button>;
```

```tsx
// button.test.tsx
it("preserves canonical non-button composition", () => {
  render(
    <Button
      nativeButton={false}
      render={<a href='/dashboard' />}
      className='custom-class'>
      Go to dashboard
    </Button>,
  );
  const link = screen.getByRole("button", {name: "Go to dashboard"});
  expect(link).toHaveAttribute("href", "/dashboard");
  expect(link).not.toHaveAttribute("type");
});
```

```ts
// src/index.ts — component and its prop/variant types exported together
export {Alert, AlertDescription, AlertTitle} from "./components/ui/alert";
export type {AlertProps, AlertVariant} from "./components/ui/alert";
```

Anti-pattern correction: adding a component file and its test but forgetting the `src/index.ts` export makes the component invisible to
`@arolariu/components` consumers even though its local tests pass — the component-library build validation must confirm the barrel, not just
the component file, before the change is complete.

## Live pointers

- `packages/components/src/components/ui/button.tsx` + `button.test.tsx` + `button.stories.tsx` — full composition/test/story triplet
  referenced above
- `packages/components/src/lib/utilities.ts` — `cn()` implementation
- `packages/components/src/components/ui/focus-scope.tsx`, `visually-hidden.tsx` — reusable accessibility primitives
- `packages/components/src/index.ts` — barrel export contract
- `docs/rfc/1006-component-library-architecture.md` §3 (component patterns), §7 (accessibility), §8.2 (why Base UI + CSS Modules)
