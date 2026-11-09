# Component Library Reference Catalog

Owner: `.github/instructions/components.instructions.md`. This catalog holds extensive `@arolariu/components`-specific examples,
anti-patterns, edge cases, and rationale. It does not define a workflow — component procedure uses `react-client-component` when the file
directly needs client features and `react-server-component` when it remains server-compatible — and it does not redefine the instruction's
rules, generic React/TypeScript rules or root safety policy.

## Base UI composition: wrap the primitive, or `useRender` + `mergeProps`

The package has two composition shapes. Read the live file in full before adding a component; the excerpts below are abbreviated.

**Wrapping a Base UI primitive.** `packages/components/src/components/ui/button.tsx` delegates rendering, refs, keyboard activation, focus
and disabled behavior to `@base-ui/react/button`. It passes the caller's `ref`, `render` and remaining props to the primitive, composes its
own classes with `buttonVariants()` (imported from the directive-free `_button-variants.ts`; see the variant decisions below), and resolves
a `render` callback with its own `variant`/`size` added to the primitive's state:

```tsx
import {Button as ButtonPrimitive} from "@base-ui/react/button";

import {buttonVariants} from "./_button-variants";

const Button = (props: Readonly<Button.Props>): React.ReactElement => {
  const {ref, render, variant = "default", size = "default", nativeButton, className, children, ...otherProps} = props;

  return (
    <ButtonPrimitive
      data-slot='button'
      data-variant={variant}
      data-size={size}
      ref={ref}
      nativeButton={nativeButton}
      className={buttonVariants({variant, size, className})}
      render={typeof render === "function" ? (elementProps, state) => render(elementProps, {...state, variant, size}) : render}
      {...otherProps}>
      {children}
    </ButtonPrimitive>
  );
};
```

**A package-owned element.** `packages/components/src/components/ui/badge.tsx` has no Base UI primitive, so it calls `useRender` with a
default tag and its own state, and merges the package class (from `badgeVariants()` in the directive-free `_badge-variants.ts`) with the
caller's props through `mergeProps`:

```tsx
import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";

import {badgeVariants} from "./_badge-variants";

const Badge = ({ref, className, variant = "default", render, ...props}: Readonly<BadgeProps>): React.ReactElement =>
  useRender<BadgeState, HTMLElement>({
    defaultTagName: "span",
    ref,
    render,
    state: {slot: "badge", variant},
    props: mergeProps<"span">({className: badgeVariants({variant, className})}, props),
  });
```

Key points a new component must preserve:

- Let the primitive, or `useRender` with `mergeProps`, merge the consumer's `render` element and props — not manual `cloneElement` — so both
  sets of event handlers fire. `mergeProps` concatenates class names and chains handlers (the rightmost runs first and can call
  `event.preventBaseUIHandler()`); it does not merge `ref`, so pass the ref to the primitive or to `useRender`.
- The `Component.Props` / `Component.State` namespace pattern (`namespace Button { export type State = ...; export type Props = ...; }`) is
  the enterprise-friendly public type surface; export the namespace-free `ButtonProps`/`ButtonState` names too when a consumer needs them
  directly (both are exported from `button.tsx` and re-exported from the barrel).

## Domain independence and non-native interaction

The live `button.tsx` delegates interaction to the actual Base UI Button. For a non-link render target that takes button semantics, such as
a `<div>`, use `nativeButton={false}` and preserve the supplied DOM props/ref. Links stay native `<a href>` elements styled with
`buttonVariants()`, never Button render targets. Do not restore an ad hoc disabled-only keyboard shim.

Disabled controls must not activate through pointer or keyboard. The primitive's explicit `focusableWhenDisabled` policy may retain keyboard
focus without enabling activation. Test ordinary native targets and supported custom targets through the real primitive.

Components stay domain-agnostic: no `sites/**` import, no invoice/merchant/ account-specific prop, copy, or business logic. A component that
needs domain data takes it as a prop from the consumer in `sites/arolariu.ro`; it does not fetch or know about `Invoice`/`Merchant` types
itself.

## API, variant, and ref decisions

- Variant/size maps are `Record<Variant, string>` keyed by an exported string-literal union (`ButtonVariant`, `ButtonSize`) and resolved
  through a `buttonVariants({variant, size, className})` helper that also merges the consumer's `className` with `cn()` — put the helper and
  its maps in a directive-free private module (`src/components/ui/_<helper>.ts`, for example `_button-variants.ts`: no `"use client"`, no
  runtime React import, only the CSS Module and `cn()`, and component types only through a whole-clause `import type`, because the build can
  keep a bare runtime import of a module whose imported bindings are used only as types). Import and re-export it from the component module,
  and have `src/index.ts` re-export it from the private module, so Server Components can call it through `@arolariu/components` while the
  component subpath keeps its API (as a client reference). `src/index.test.ts` (`serverCallableClassHelpers`) enforces this. Consumers use
  the helper when they need the composed class string without rendering the component (for example a native `<a href>` that needs the button
  appearance).
- Type the public ref by what `render` can produce: Button and Badge accept `React.Ref<HTMLElement>` because a caller can replace their
  default `<button>`/`<span>`, and composed callback refs are the merged callbacks Base UI supplies.

## CSS Modules and class composition

Every component that owns visual presentation pairs with a colocated `<name>.module.css` and composes classes exclusively through `cn()`
from `src/lib/utilities.ts` (a thin `clsx` wrapper). Intentional style-free composition primitives may omit the CSS file:

```tsx
// _button-variants.ts
import {cn} from "@/lib/utilities";
import styles from "./button.module.css";

const composedClassName = cn(styles.button, variantStyles[variant], sizeStyles[size], className);
```

Anti-pattern: concatenating class name strings manually (`` `${styles.button} ${className}` ``) instead of `cn()` breaks when `className` is
`undefined` (produces a trailing space and, more importantly, skips `clsx`'s falsy-value filtering used elsewhere for conditional classes).

## Accessibility and focus

- Prefer a native `<button>` for button behavior. For an enabled non-native target, Base UI's `nativeButton={false}` supplies
  `role="button"`, focusability and Enter/Space activation; cover the composed target with focused tests through the real primitive (see
  `button.test.tsx`) rather than citing the historical disabled-only helper as proof of parity.
- Preserve Base UI's existing ARIA wiring. Where the installed primitive lacks a required relationship, use the package's tested owning
  boundary (for example Tooltip description registration), not a competing global role/ID policy.
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
it("activates a non-native rendered button with the keyboard", async () => {
  const user = userEvent.setup();
  const onClick = vi.fn();
  render(
    <Button
      nativeButton={false}
      render={<div />}
      onClick={onClick}>
      Run
    </Button>,
  );

  await user.tab();
  expect(screen.getByRole("button", {name: "Run"})).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(onClick).toHaveBeenCalledTimes(1);
});
```

```ts
// src/index.ts — component and its prop/variant types exported together
export {Alert, AlertAction, AlertDescription, AlertTitle} from "./components/ui/alert";
export type {AlertProps, AlertVariant} from "./components/ui/alert";
```

Anti-pattern correction: adding a component file and its test but forgetting the `src/index.ts` export makes the component invisible to
`@arolariu/components` consumers even though its local tests pass — the component-library build validation must confirm the barrel, not just
the component file, before the change is complete.

## Live pointers

- `packages/components/src/components/ui/button.tsx` + `button.test.tsx` + `button.stories.tsx` — full composition/test/story triplet
  referenced above; `badge.tsx` — the `useRender` + `mergeProps` shape
- `packages/components/src/components/ui/_button-variants.ts`, `_badge-variants.ts` — directive-free class helpers re-exported by
  `src/index.ts`; `src/index.test.ts` (`serverCallableClassHelpers`) — their server-callability contract
- `packages/components/src/lib/utilities.ts` — `cn()` implementation
- `packages/components/src/components/ui/focus-scope.tsx`, `visually-hidden.tsx` — reusable accessibility primitives
- `packages/components/src/index.ts` — barrel export contract
- RFC 1006 — [Base UI composition](../../../docs/rfc/1006-component-library-architecture.md#base-ui-composition),
  [Props and exports](../../../docs/rfc/1006-component-library-architecture.md#props-and-exports),
  [Styling](../../../docs/rfc/1006-component-library-architecture.md#styling),
  [Accessibility](../../../docs/rfc/1006-component-library-architecture.md#accessibility) and
  [Trade-offs](../../../docs/rfc/1006-component-library-architecture.md#trade-offs) (why Base UI and CSS Modules)
