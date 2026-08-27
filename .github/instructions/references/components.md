# Component Library Reference Catalog

Owner: `.github/instructions/components.instructions.md`. This catalog holds
extensive `@arolariu/components`-specific examples, anti-patterns, edge
cases, and rationale. It does not define a workflow — component procedure
lives in `react-component` — and it does not restate generic React/TypeScript
rules (see the sibling catalogs) or root safety policy.

## Base UI composition: `useRender` + `mergeProps`

`packages/components/src/components/ui/button.tsx` is the canonical
composition pattern. Read it in full before adding a new Base UI wrapper;
the shape below is abbreviated:

```tsx
const Button = React.forwardRef<HTMLButtonElement, Button.Props>((props, ref): React.ReactElement => {
  const {render, asChild = false, variant = "default", size = "default", disabled = false, className, children, ...otherProps} = props;

  const state: Button.State = {variant, size, disabled};
  const composedClassName = buttonVariants({variant, size, className});
  const renderProp = asChild && React.isValidElement(children) ? children : render;
  const shouldRenderNativeButton = !renderProp || isIntrinsicButtonElement(renderProp);

  return useRender<Button.State, HTMLButtonElement>({
    defaultTagName: "button",
    ref,
    render: renderProp,
    state,
    props: mergeProps<"button">({className: composedClassName}, typeProps, otherProps, interactionProps, {
      children: renderProp ? undefined : children,
    }),
  });
});

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Button {
  export type State = ButtonState;
  export type Props = ButtonProps;
}

export {Button, buttonVariants};
```

Key points a new component must preserve:

- `useRender` + `mergeProps` — not manual `cloneElement` — merges the
  library's className/handlers with a consumer-supplied `render` element so
  both sets of event handlers fire.
- The `Component.Props` / `Component.State` namespace pattern
  (`namespace Button { export type State = ...; export type Props = ...; }`)
  is the enterprise-friendly public type surface; export the namespace-free
  `ButtonProps`/`ButtonState` names too when a consumer needs them directly
  (both are exported from `button.tsx` and re-exported from the barrel).

## Domain independence and non-native interaction

`button.tsx`'s `createNonNativeInteractionProps(disabled)` currently preserves
the **disabled** state when `render`/`asChild` composes the component onto a
non-`<button>` element (for example an anchor):

```tsx
function createNonNativeInteractionProps(disabled: boolean): React.HTMLAttributes<HTMLElement> {
  return {
    "aria-disabled": disabled || undefined,
    role: "button",
    tabIndex: disabled ? -1 : undefined,
    onClick(event) {
      if (!disabled) return;
      event.preventDefault();
      if ("preventBaseUIHandler" in event && typeof event.preventBaseUIHandler === "function") {
        event.preventBaseUIHandler();
      }
    },
    onKeyDown(event) {
      if (!disabled || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      /* ...same preventBaseUIHandler guard */
    },
  };
}
```

This is why a native `<button disabled>` and a `<Button render={<a />} disabled>`
must both end up non-interactive and non-focusable: the native element gets
the real `disabled` attribute, and the non-native element gets
`aria-disabled`, `tabIndex={-1}`, and blocked click/Enter/Space handling.
Anti-pattern: adding `disabled` styling without also blocking the click/key
handlers on a non-native `render` target leaves the composed element visually
disabled but still activatable by keyboard.

**Live limitation, not a pattern to copy:** the helper does not make an
enabled arbitrary element keyboard-equivalent to a native button. It leaves
enabled `tabIndex` unset and does not activate on Space. An anchor retains its
native Enter behavior, but a generic element remains unfocusable and neither
target gains native Space activation.

Components stay domain-agnostic: no `sites/**` import, no invoice/merchant/
account-specific prop, copy, or business logic. A component that needs
domain data takes it as a prop from the consumer in `sites/arolariu.ro`; it
does not fetch or know about `Invoice`/`Merchant` types itself.

## API, variant, and ref decisions

- Variant/size maps are `Record<Variant, string>` keyed by an exported
  string-literal union (`ButtonVariant`, `ButtonSize`) and resolved through a
  `buttonVariants({variant, size, className})` helper that also merges the
  consumer's `className` with `cn()` — export the helper (`buttonVariants`)
  alongside the component when consumers need the composed class string
  without rendering the component (for example a `render`-based composition
  elsewhere).
- `React.forwardRef<ElementType, Component.Props>` is required whenever a
  component can render a real DOM node consumers may need to focus,
  measure, or scroll into view.
- `asChild` is retained only as a backward-compatible alias for `render` on
  existing public APIs (`asChild = false` internally converts to the
  `render` prop) — a new component should expose `render` directly and skip
  adding a new `asChild` prop; do not add `asChild` to a component that never
  had it.

## CSS Modules and class composition

Every component pairs with a colocated `<name>.module.css` and composes
classes exclusively through `cn()` from `src/lib/utilities.ts` (a thin
`clsx` wrapper):

```tsx
import {cn} from "@/lib/utilities";
import styles from "./button.module.css";

const composedClassName = cn(styles.button, variantStyles[variant], sizeStyles[size], className);
```

Anti-pattern: concatenating class name strings manually
(`` `${styles.button} ${className}` ``) instead of `cn()` breaks when
`className` is `undefined` (produces a trailing space and, more importantly,
skips `clsx`'s falsy-value filtering used elsewhere for conditional classes).

## Accessibility and focus

- Prefer a native `<button>` for button behavior. If a public API must support
  an enabled non-native button-role target, add focusability plus Enter/Space
  activation and focused tests; do not cite the current `Button` helper as
  proof that this parity already exists.
- Preserve Base UI's built-in ARIA wiring for compound overlay components
  (`Dialog`, `Popover`, `Tooltip`, `AlertDialog`) rather than adding manual
  `aria-*` attributes on top of them; Base UI's accessibility primitives are
  the reason this library replaced the previous Radix UI + Tailwind stack
  (RFC 1006 §1.2/§8.2) and re-implementing ARIA wiring by hand reintroduces
  the bugs that migration fixed.
- `focus-scope.tsx` and `visually-hidden.tsx` are the existing focus-trap and
  screen-reader-only primitives; reuse them instead of writing a new
  `tabIndex`/`sr-only` implementation for a new overlay or icon-only control.

## Stories, tests, and exports

Every public component ships with a colocated Storybook story, a colocated
Vitest/Testing Library test, and a barrel export — `button.stories.tsx`,
`button.test.tsx`, and the `src/index.ts` entry are all touched together:

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
it("supports the deprecated asChild API without adding native button attributes", () => {
  render(<Button asChild className="custom-class"><a href="/dashboard">Go to dashboard</a></Button>);
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

Anti-pattern correction: adding a component file and its test but forgetting
the `src/index.ts` export makes the component invisible to
`@arolariu/components` consumers even though its local tests pass — the
component-library build validation must confirm the barrel, not just the
component file, before the change is complete.

## Live pointers

- `packages/components/src/components/ui/button.tsx` +
  `button.test.tsx` + `button.stories.tsx` — full composition/test/story
  triplet referenced above
- `packages/components/src/lib/utilities.ts` — `cn()` implementation
- `packages/components/src/components/ui/focus-scope.tsx`,
  `visually-hidden.tsx` — reusable accessibility primitives
- `packages/components/src/index.ts` — barrel export contract
- `docs/rfc/1006-component-library-architecture.md` §3 (component patterns),
  §7 (accessibility), §8.2 (why Base UI + CSS Modules)
