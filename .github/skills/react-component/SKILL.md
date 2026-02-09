---
name: react-component
description: 'Creates React components following arolariu.ro patterns: Server Components by default, Island pattern for interactivity, strict TypeScript, Readonly props, accessibility-first, with Vitest tests achieving 90%+ coverage.'
---

# React Component Scaffolding

Generates React components following the arolariu.ro frontend patterns.

## When to Use

- Creating a new page with the Island pattern
- Adding a reusable component to the shared library
- Creating a new Client Component with state management
- Building a form with validation

## Component Types

### Server Component (Default)

Use for pages that fetch data and render static content.

```tsx
// sites/arolariu.ro/src/app/[route]/page.tsx
import type {Metadata} from "next";
import {createMetadata} from "@/metadata";
import {getTranslations} from "next-intl/server";
import RenderScreen from "./island";

/**
 * Generates metadata for the page.
 * @returns Page metadata for SEO and social sharing.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Namespace.__metadata__");
  return createMetadata({title: t("title"), description: t("description")});
}

/**
 * Server Component page — fetches data and delegates to Client Component.
 * @returns The rendered page.
 */
export default async function PageName(): Promise<React.JSX.Element> {
  const data = await fetchServerData();
  return <RenderScreen initialData={data} />;
}
```

### Client Component (Island)

Use for interactive content that needs browser APIs, event handlers, or React hooks.

```tsx
// sites/arolariu.ro/src/app/[route]/island.tsx
"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";

/**
 * Props for the island component.
 */
interface Props {
  /** Initial data from server component. */
  readonly initialData: DataType[];
}

/**
 * Client Component island — handles interactivity and state.
 * @param props - Component props with initial server data.
 * @returns The interactive screen content.
 */
export default function RenderScreen({
  initialData,
}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("Namespace");
  const [items, setItems] = useState(initialData);

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      {/* Interactive content */}
    </main>
  );
}
```

### Custom Hook

Use for reusable stateful logic.

```tsx
// sites/arolariu.ro/src/hooks/useEntity.tsx
import {useState, useEffect} from "react";

/**
 * Hook input configuration.
 */
interface UseEntityOptions {
  /** The entity identifier to fetch. */
  readonly entityId: string;
}

/**
 * Hook return type.
 */
interface UseEntityResult {
  readonly entity: EntityType | null;
  readonly isLoading: boolean;
  readonly error: Error | null;
}

/**
 * Hook to fetch and manage entity state.
 * @param options - Configuration with entity ID.
 * @returns Entity data, loading state, and error.
 * @example
 * ```tsx
 * const {entity, isLoading, error} = useEntity({entityId: "abc-123"});
 * ```
 */
export function useEntity({entityId}: UseEntityOptions): UseEntityResult {
  const [entity, setEntity] = useState<EntityType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async (): Promise<void> => {
      try {
        const data = await getEntity(entityId);
        if (isMounted) setEntity(data);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [entityId]);

  return {entity, isLoading, error};
}
```

### Shared UI Component

For `@arolariu/components` library.

```tsx
// packages/components/src/components/ui/component-name.tsx
import * as React from "react";
import {cn} from "@/lib/utils";

interface ComponentNameProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline";
}

const ComponentName = React.forwardRef<HTMLDivElement, ComponentNameProps>(
  ({className, variant = "default", ...props}, ref) => {
    return (
      <div
        ref={ref}
        className={cn("base-styles", className)}
        {...props}
      />
    );
  },
);
ComponentName.displayName = "ComponentName";

export {ComponentName};
export type {ComponentNameProps};
```

## Test Template

```tsx
import {describe, expect, it, vi} from "vitest";
import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("ComponentName", () => {
  it("should render without crashing", () => {
    render(<ComponentName />);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("should display initial data", () => {
    render(<ComponentName initialData={mockData} />);
    expect(screen.getByText("Expected Text")).toBeInTheDocument();
  });

  it("should handle user interaction", async () => {
    const user = userEvent.setup();
    render(<ComponentName />);
    await user.click(screen.getByRole("button", {name: /submit/i}));
    await waitFor(() => {
      expect(screen.getByText("Success")).toBeInTheDocument();
    });
  });
});
```

## Checklist

- [ ] Correct component type (Server/Client/Hook/Shared)
- [ ] `"use client"` only on Client Components
- [ ] Props interface with `Readonly<Props>`
- [ ] Explicit return types on all functions
- [ ] JSDoc documentation on component and props
- [ ] `useTranslations()` for user-facing strings
- [ ] Loading and error state handling
- [ ] Dark mode compatible styles (Tailwind)
- [ ] Accessibility: semantic HTML, ARIA where needed
- [ ] Tests with 90%+ coverage (AAA pattern)
- [ ] No `any` types
- [ ] If shared: added to `packages/components/src/index.ts` barrel export
