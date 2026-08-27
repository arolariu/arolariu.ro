# Stable Server Component Patterns

Use a template only after a live sibling confirms the same category. Replace
every angle-bracket placeholder from live source; never paste it literally.

## Provenance

- Localized metadata: `sites/arolariu.ro/src/app/about/page.tsx`,
  `sites/arolariu.ro/src/app/domains/invoices/view-invoices/page.tsx`,
  `sites/arolariu.ro/src/metadata.ts`
- Server page/island handoff: `sites/arolariu.ro/src/app/page.tsx`,
  `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/page.tsx`
- Boundaries: `sites/arolariu.ro/src/app/loading.tsx`,
  `sites/arolariu.ro/src/app/error.tsx`
- Tests: `sites/arolariu.ro/src/app/error.test.tsx`,
  `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/not-found.test.tsx`,
  `sites/arolariu.ro/vitest.setup.ts`

## Invariants

- Pages/layouts are Server Components unless a concrete client requirement
  exists below them.
- Client props are precise, readonly, minimal, and serializable.
- Metadata uses the shared helper, current locale, and a typed live message
  selector.
- Loading does not add a competing page landmark; error boundaries are client
  components with an observable reset.
- User-visible and accessible copy is localized.
- Tests assert roles, names, state, navigation, and recovery rather than
  implementation details.

## Live-derived values

Derive route literals, `PageProps` types, selector paths, style module names,
prop/domain types, action names, parser/result handling, skeleton geometry,
return destinations, and test setup from the target segment and closest
sibling. Derive whether the current message branch is named `metadata` or
`__metadata__`; do not guess.

## Isolated server-compatible component

```tsx
import styles from "./<ComponentName>.module.scss";

type Props = Readonly<{
  heading: string;
  items: readonly <SerializableItem>[];
}>;

export function <ComponentName>({heading, items}: Props): React.JSX.Element {
  return (
    <section
      aria-labelledby='<live-heading-id>'
      className={styles["section"]}>
      <h2 id='<live-heading-id>'>{heading}</h2>
      <ul>
        {items.map((item) => (
          <li key={item.<stable-id>}>{<render-serializable-item>}</li>
        ))}
      </ul>
    </section>
  );
}
```

Do not add `"use client"` unless this module directly gains a hook, handler,
browser API, client Context, or client-state dependency. Verify every import
and consumer before claiming exclusive server execution.

## Localized metadata function

```tsx
import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getTranslations} from "next-intl-selector/server";
import {getLocale} from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  const locale = await getLocale();

  return createMetadata({
    locale,
    title: t((messages) => messages.<route-metadata-selector>.title),
    description: t((messages) => messages.<route-metadata-selector>.description),
  });
}
```

If the sibling uses a different repository-owned typed translation API, use the
live API rather than adapting this template mechanically.

## Server page delegating to an island

```tsx
import Render<RouteName>Screen from "./island";

export default async function <RouteName>Page(
  props: Readonly<PageProps<"<route-literal>">>,
): Promise<React.JSX.Element> {
  const params = await props.params;
  const initialData = await <existing-server-owner>({id: params.<param>});
  const mapped = <map-typed-result-or-boundary>(initialData);

  return <Render<RouteName>Screen initialData={mapped} />;
}
```

```tsx
"use client";

type Props = Readonly<{
  initialData: <serializable-live-type>;
}>;

export default function Render<RouteName>Screen({
  initialData,
}: Props): React.JSX.Element {
  // Hooks, browser APIs, local state, and handlers only.
  return <section>{/* localized interactive content */}</section>;
}
```

Delete the island entirely when the route has no client requirement.

## Loading and error boundary shapes

```tsx
// loading.tsx — Server Component
import {Skeleton} from "@arolariu/components";
import styles from "./loading.module.scss";

export default function Loading(): React.JSX.Element {
  return (
    <div className={styles["<live-wrapper-class>"]}>
      <Skeleton className={styles["<live-skeleton-class>"]} />
    </div>
  );
}
```

```tsx
// error.tsx
"use client";

import {useTranslations} from "next-intl-selector";
import {useEffect} from "react";

type Props = Readonly<{
  error: Error & {digest?: string};
  reset: () => void;
}>;

export default function RouteError({error, reset}: Props): React.JSX.Element {
  const t = useTranslations();

  useEffect(() => {
    <safe-error-reporter>(error);
  }, [error]);

  return (
    <section role='alert' aria-live='assertive'>
      <h1>{t((messages) => messages.<error-selector>.title)}</h1>
      <button type='button' onClick={reset}>
        {t((messages) => messages.<error-selector>.retry)}
      </button>
    </section>
  );
}
```

Current loading siblings use non-landmark wrappers and raw `Skeleton`
placeholders; the shared Skeleton does not itself establish a named live
region. If the requested behavior needs an announcement, treat that as a new
accessibility decision and test it rather than attributing it to this stable
shape. For the error template, use the current safe reporter; do not create one
from the placeholder.

## Colocated client-boundary test harness

```tsx
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it} from "vitest";
import Render<RouteName>Screen from "./island";

describe("Render<RouteName>Screen", () => {
  it("exposes the primary action and completes the user interaction", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Render<RouteName>Screen
        initialData={<live-builder-or-fixture>}
      />,
    );

    // Act
    await user.click(screen.getByRole("button", {name: "<selector path from the global test shim>"}));

    // Assert the route's observable completion state, not an undeclared prop.
    expect(screen.getByRole("status")).toHaveTextContent("<localized completion state>");
  });
});
```

Use `sites/arolariu.ro/vitest.setup.ts` translation/navigation shims and current
builders. Mock only the true external boundary required by the behavior.

## Invalidated when

Do not use these templates if the live route changes translation API, metadata
helper, route typing, error/loading signatures, test setup, transport result,
or RSC serialization pattern; if a sibling no longer matches, inspect and
update this resource before reuse.
