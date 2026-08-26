# Stable Component Shapes and Tests

Use only after a same-scope live sibling confirms the pattern.

## Provenance

- Readonly route component and behavior test:
  `sites/arolariu.ro/src/app/domains/invoices/_components/classification/ClassificationPicker.tsx`
  and
  `sites/arolariu.ro/src/app/domains/invoices/_components/classification/ClassificationPicker.test.tsx`
- Website CSS Module usage:
  `sites/arolariu.ro/src/app/about/_components/Hero.tsx` and
  `sites/arolariu.ro/src/app/about/_components/Hero.module.scss`
- Shared ref/composition behavior:
  `packages/components/src/components/ui/button.tsx` and
  `packages/components/src/components/ui/button.test.tsx`
- User interaction/focus behavior:
  `packages/components/src/components/ui/dialog.test.tsx`
- Global website test shims: `sites/arolariu.ro/vitest.setup.ts`

## Invariants

- Props are precise and readonly; exported functions have explicit returns.
- `"use client"` appears only when the file directly needs a client feature.
- Styling is colocated and follows the owning project's module convention.
- Native semantics or existing shared primitives own interaction.
- A forwarded ref targets the documented public DOM node and exists only when
  consumers need it.
- Tests exercise user-observable roles, names, interactions, keyboard/focus,
  and state; repository modules are not mocked as an implementation shortcut.

## Live-derived values

Derive prop/domain types, translation selectors, module extension/import depth,
class names, primitive imports, callback contracts, ref element, builders,
external boundaries, and expected accessible names from the consumer and live
sibling.

## Readonly server-compatible shape

```tsx
import styles from "./<ComponentName>.module.scss";

type Props = Readonly<{
  heading: string;
  items: readonly <ItemType>[];
}>;

export function <ComponentName>({heading, items}: Props): React.JSX.Element {
  return (
    <section
      className={styles["section"]}
      aria-labelledby='<live-derived-heading-id>'>
      <h2 id='<live-derived-heading-id>'>{heading}</h2>
      <ul>
        {items.map((item) => (
          <li key={item.<stable-domain-id>}>{<render-live-item>}</li>
        ))}
      </ul>
    </section>
  );
}
```

Do not add a client directive unless the component itself gains a client-only
requirement.

## Narrow client boundary

```tsx
"use client";

import {Button} from "@arolariu/components";
import {useState} from "react";
import styles from "./<ComponentName>.module.scss";

type Props = Readonly<{
  initialOpen?: boolean;
  onChange: (open: boolean) => void;
}>;

export function <ComponentName>({
  initialOpen = false,
  onChange,
}: Props): React.JSX.Element {
  const [open, setOpen] = useState(initialOpen);

  const handleToggle = (): void => {
    const next = !open;
    setOpen(next);
    onChange(next);
  };

  return (
    <section className={styles["section"]}>
      <Button
        aria-expanded={open}
        aria-controls='<live-derived-region-id>'
        onClick={handleToggle}>
        {<localized-visible-name>}
      </Button>
      {open ? <div id='<live-derived-region-id>'>{<content>}</div> : null}
    </section>
  );
}
```

Keep event-derived updates in the handler. Do not add an effect to mirror
`open` into another state value.

## CSS Module composition

Website components derive the SCSS import path and mixins from a sibling:

```scss
@use '<live-relative-path>/styles/abstracts' as *;

.section {
  color: hsl(var(--foreground));

  &:focus-within {
    @include focus-ring;
  }

  @include reduced-motion {
    scroll-behavior: auto;
  }
}
```

Shared-library components use their current `.module.css` plus `cn()` pattern.
Do not mix the two owners or add inline style objects.

## Ref forwarding when the public contract requires it

```tsx
import * as React from "react";

type Props = Readonly<React.ComponentPropsWithoutRef<"<live-element>">>;

export const <ComponentName> = React.forwardRef<
  <LiveHTMLElement>,
  Props
>((props, ref): React.ReactElement => (
  <<live-element>
    ref={ref}
    {...props}
  />
));

<ComponentName>.displayName = "<ComponentName>";
```

For a composed shared primitive, use the matching live Base UI `render` and
`mergeProps` pattern instead of raw prop spreading.

## Testing Library user behavior

```tsx
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {<ComponentName>} from "./<ComponentName>";

describe("<ComponentName>", () => {
  it("supports the named keyboard and pointer interaction", async () => {
    // Arrange
    const user = userEvent.setup();
    const onChange = vi.fn<(open: boolean) => void>();
    render(<<ComponentName> onChange={onChange} />);
    const control = screen.getByRole("button", {name: "<live accessible name>"});

    // Act
    await user.tab();
    await user.keyboard("{Enter}");

    // Assert
    expect(control).toHaveFocus();
    expect(control).toHaveAttribute("aria-expanded", "true");
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
```

Add separate tests only for materially distinct behavior such as disabled
activation, Escape/focus return, loading/error/empty, cleanup, or ref
forwarding.

## Invalidated when

Do not use these shapes if the owning project changes CSS Module conventions,
translation/test setup, Base UI composition, React ref API, client-boundary
rules, or the live sibling's accessibility contract. Re-inspect and update this
resource first.
