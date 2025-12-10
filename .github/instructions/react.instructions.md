---
applyTo: '**/*.jsx, **/*.tsx'
description: 'Core React patterns for the arolariu.ro monorepo. Applies to component library, websites, and all React code. For Next.js-specific patterns, see frontend.instructions.md.'
---

# React Development Guidelines

Core React patterns for the arolariu.ro monorepo. These guidelines apply to **all React code** across the repository.

**Scope:** Component library, all websites, shared code
**For Next.js specifics:** See `frontend.instructions.md`
**For TypeScript specifics:** See `typescript.instructions.md`

---

## 🎯 Quick Reference

| Aspect | Standard |
|--------|----------|
| **React Version** | 19.2.0 |
| **Component Style** | Functional only (no classes) |
| **Props** | Always `Readonly<Props>` |
| **Return Type** | Explicit `React.JSX.Element` |
| **State** | Zustand (global), Context (scoped), useState (local) |
| **Memoization** | `memo`, `useMemo`, `useCallback` when needed |
| **Effects** | Always include cleanup |
| **Documentation** | JSDoc on public APIs |

---

## ⚛️ Component Patterns

### Functional Component Template

```tsx
import type {ReactNode} from "react";

/**
 * Brief description of what this component does.
 *
 * @param props - Component props
 * @returns The rendered component
 *
 * @example
 * ```tsx
 * <MyComponent title="Hello" isVisible>
 *   <ChildContent />
 * </MyComponent>
 * ```
 */

interface Props {
  /** The title to display */
  title: string;
  /** Child elements to render */
  children: ReactNode;
  /** Whether the component is visible */
  isVisible?: boolean;
}

export default function MyComponent({
  title,
  children,
  isVisible = true,
}: Readonly<Props>): React.JSX.Element {
  if (!isVisible) return <></>;

  return (
    <section aria-labelledby="section-title">
      <h2 id="section-title">{title}</h2>
      {children}
    </section>
  );
}
```

### Key Rules

1. **Always use `Readonly<Props>`** - Prevents accidental mutation
2. **Explicit return type** - `React.JSX.Element` or `Promise<React.JSX.Element>` for async
3. **Default exports for pages** - Named exports for reusable components
4. **Destructure props** - Don't pass entire props object around

---

## 🎣 Hook Patterns

### Custom Hook Template

```tsx
"use client";

import {useEffect, useState} from "react";

/**
 * Input parameters for the hook.
 */
type HookInput = Readonly<{
  entityId: string;
}>;

/**
 * Return value from the hook.
 */
type HookOutput = Readonly<{
  data: EntityType | null;
  isLoading: boolean;
  isError: boolean;
}>;

/**
 * Fetches entity data by ID.
 *
 * @param params - Hook configuration
 * @returns Object containing data, loading state, and error state
 *
 * @example
 * ```tsx
 * const {data, isLoading, isError} = useEntity({entityId: "123"});
 * ```
 */
export function useEntity({entityId}: HookInput): HookOutput {
  const [data, setData] = useState<EntityType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let isMounted = true; // Cleanup flag

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const result = await fetchEntity(entityId);
        if (isMounted) {
          setData(result);
          setIsError(false);
        }
      } catch (error) {
        console.error("Error fetching entity:", error);
        if (isMounted) setIsError(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false; // Cleanup on unmount
    };
  }, [entityId]);

  return {data, isLoading, isError};
}
```

### Rules of Hooks

1. **Only call at top level** - Never inside conditions, loops, or nested functions
2. **Only call in React functions** - Components or custom hooks
3. **Prefix with `use`** - `useInvoice`, `useMerchants`, `usePagination`
4. **Always cleanup effects** - Return cleanup function from `useEffect`

---

## 🧠 Memoization Patterns

### When to Memoize

```tsx
import {memo, useCallback, useMemo} from "react";

// ✅ Memoize expensive calculations
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.date - b.date);
}, [items]);

// ✅ Memoize callbacks passed to children
const handleUpdate = useCallback((id: string) => {
  updateItem(id);
}, [updateItem]);

// ✅ Memoize components that receive stable props
export const ExpensiveList = memo(function ExpensiveList({
  items,
  onSelect,
}: Readonly<Props>): React.JSX.Element {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} onClick={() => onSelect(item.id)}>
          {item.name}
        </li>
      ))}
    </ul>
  );
});
```

### When NOT to Memoize

```tsx
// ❌ Don't memoize primitive values
const doubled = useMemo(() => count * 2, [count]); // Overkill

// ❌ Don't memoize if props change frequently
const MemoizedAlwaysChanges = memo(Component); // Useless if props change

// ❌ Don't memoize simple inline handlers
<button onClick={() => setCount(count + 1)} /> // Fine as is
```

---

## 🌳 Context Pattern

### Context + Provider + Hook

```tsx
"use client";

import {createContext, use, useCallback, useMemo, useState, type ReactNode} from "react";

// 1. Define types
type ThemeType = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

// 2. Create context with undefined default
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// 3. Create provider component
export function ThemeProvider({children}: {children: ReactNode}): React.JSX.Element {
  const [theme, setThemeState] = useState<ThemeType>("system");

  const setTheme = useCallback((newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
  }, []);

  // Memoize value to prevent unnecessary re-renders
  const value = useMemo(() => ({theme, setTheme}), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// 4. Create custom hook with error boundary
export function useTheme(): ThemeContextValue {
  const context = use(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
```

### Context Guidelines

1. **Always memoize provider value** - Prevents child re-renders
2. **Create custom hook** - Provides better error messages
3. **Use `use()` in React 19** - Instead of `useContext()`
4. **Keep context focused** - One responsibility per context

---

## 🗃️ State Management Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                     Zustand Stores                          │
│  Global state, IndexedDB persistence, devtools             │
│  Use for: Invoices, merchants, app-wide preferences        │
├─────────────────────────────────────────────────────────────┤
│                     React Context                           │
│  Scoped state, domain-specific, component tree sharing     │
│  Use for: Dialogs, fonts, feature-specific state           │
├─────────────────────────────────────────────────────────────┤
│                     useState / useReducer                   │
│  Local component state, form inputs, UI toggles            │
│  Use for: Single component, no sharing needed              │
└─────────────────────────────────────────────────────────────┘
```

### Zustand Pattern (from codebase)

```tsx
import {create} from "zustand";
import {devtools, persist} from "zustand/middleware";

interface StoreState {
  items: ReadonlyArray<Item>;
  selectedIds: string[];
}

interface StoreActions {
  setItems: (items: ReadonlyArray<Item>) => void;
  upsertItem: (item: Item) => void;
  removeItem: (id: string) => void;
}

type Store = StoreState & StoreActions;

export const useItemStore = create<Store>()(
  devtools(
    persist(
      (set) => ({
        items: [],
        selectedIds: [],

        setItems: (items) => set({items}),
        upsertItem: (item) => set((state) => ({
          items: state.items.some((i) => i.id === item.id)
            ? state.items.map((i) => i.id === item.id ? item : i)
            : [...state.items, item],
        })),
        removeItem: (id) => set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),
      }),
      {name: "item-store"}
    )
  )
);
```

---

## ♿ Accessibility Requirements

### Semantic HTML

```tsx
// ✅ Use semantic elements
<main>
  <article aria-labelledby="article-title">
    <h1 id="article-title">Title</h1>
    <nav aria-label="Article sections">
      <ul>...</ul>
    </nav>
    <section aria-labelledby="section-1">
      <h2 id="section-1">Section</h2>
    </section>
  </article>
</main>

// ❌ Don't use divs for everything
<div class="main">
  <div class="article">
    <div class="title">Title</div>
  </div>
</div>
```

### Interactive Elements

```tsx
// ✅ Keyboard accessible
<button
  onClick={handleClick}
  onKeyDown={(e) => e.key === "Enter" && handleClick()}
  aria-label="Delete invoice"
  aria-describedby="delete-help"
>
  <TrashIcon aria-hidden="true" />
</button>
<span id="delete-help" className="sr-only">
  Permanently removes this invoice
</span>

// ❌ Non-accessible clickable div
<div onClick={handleClick}>
  <TrashIcon />
</div>
```

### Required ARIA Attributes

| Element | Required | Example |
|---------|----------|---------|
| `<img>` | `alt` | `alt="Invoice preview"` |
| Icon buttons | `aria-label` | `aria-label="Close dialog"` |
| Loading states | `aria-busy` | `aria-busy={isLoading}` |
| Dialogs | `aria-modal`, `role` | `role="dialog" aria-modal="true"` |
| Error messages | `role="alert"` | `<div role="alert">{error}</div>` |

---

## 🎨 Component Library Usage

### Importing from @arolariu/components

```tsx
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  toast,
  cn,
} from "@arolariu/components";

export function MyFeature(): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <h2>Title</h2>
      </CardHeader>
      <CardContent>
        <Button
          variant="default"
          size="lg"
          onClick={() => toast.success("Done!")}
        >
          Action
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Class Merging with `cn()`

```tsx
import {cn} from "@arolariu/components";

// Merge classes conditionally
<div className={cn(
  "flex items-center gap-4",
  "bg-white dark:bg-black",
  isActive && "ring-2 ring-primary",
  className // Allow override from props
)} />
```

### Extending Components

```tsx
// ✅ Extend via composition
import {Button, type ButtonProps} from "@arolariu/components";

interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean;
}

export function LoadingButton({
  isLoading,
  children,
  disabled,
  ...props
}: LoadingButtonProps): React.JSX.Element {
  return (
    <Button disabled={disabled || isLoading} {...props}>
      {isLoading ? <Spinner /> : children}
    </Button>
  );
}

// ❌ Don't modify library components directly
```

---

## 🧪 Testing Patterns

### Component Tests

```tsx
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {MyComponent} from "./MyComponent";

describe("MyComponent", () => {
  it("renders title correctly", () => {
    render(<MyComponent title="Test Title" />);
    expect(screen.getByRole("heading", {name: "Test Title"})).toBeInTheDocument();
  });

  it("calls onClick handler when button clicked", async () => {
    const handleClick = vi.fn();
    render(<MyComponent onClick={handleClick} />);

    await userEvent.click(screen.getByRole("button"));

    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("shows loading state", () => {
    render(<MyComponent isLoading />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });
});
```

### Hook Tests

```tsx
import {renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {useEntity} from "./useEntity";

describe("useEntity", () => {
  it("returns loading state initially", () => {
    const {result} = renderHook(() => useEntity({entityId: "123"}));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it("fetches and returns data", async () => {
    const {result} = renderHook(() => useEntity({entityId: "123"}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });
});
```

---

## 🚫 Anti-Patterns

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| `any` types | No type safety | Proper interfaces |
| Props mutation | Unexpected behavior | `Readonly<Props>` |
| Missing cleanup | Memory leaks | Effect cleanup functions |
| Prop drilling | Hard to maintain | Context or Zustand |
| Inline objects in deps | Infinite loops | `useMemo` for objects |
| Missing keys | Poor reconciliation | Unique `key` prop |
| Index as key | Incorrect updates | Use item ID |
| Direct DOM access | Breaks React model | Use refs properly |
| Async in useEffect | Unhandled promises | IIFE or separate function |

### Common Mistakes

```tsx
// ❌ Missing cleanup
useEffect(() => {
  const interval = setInterval(tick, 1000);
  // No cleanup!
}, []);

// ✅ With cleanup
useEffect(() => {
  const interval = setInterval(tick, 1000);
  return () => clearInterval(interval);
}, []);

// ❌ Object in dependencies
useEffect(() => {
  doSomething(config);
}, [{option: true}]); // New object every render!

// ✅ Memoize or use primitives
const config = useMemo(() => ({option: true}), []);
useEffect(() => {
  doSomething(config);
}, [config]);

// ❌ Async useEffect
useEffect(async () => {
  const data = await fetchData();
}, []);

// ✅ IIFE pattern
useEffect(() => {
  (async () => {
    const data = await fetchData();
  })();
}, []);
```

---

## 📋 Checklist

### Before Committing

- [ ] Props typed with `Readonly<Props>`
- [ ] Explicit return types on components
- [ ] Effects have cleanup functions
- [ ] Memoization used appropriately
- [ ] Accessibility attributes included
- [ ] Loading and error states handled
- [ ] JSDoc on public APIs
- [ ] Tests written/updated

### Code Review Focus

- [ ] No `any` types
- [ ] No prop drilling (use Context/Zustand)
- [ ] No inline object dependencies
- [ ] Proper key props (not index)
- [ ] Semantic HTML used
- [ ] No memory leaks
- [ ] Consistent naming conventions

---

## 🔗 Related Instructions

| File | Scope | Content |
|------|-------|---------|
| `frontend.instructions.md` | `sites/arolariu.ro/**` | Next.js, RSC, i18n, metadata |
| `typescript.instructions.md` | `**/*.ts` | Type patterns, strict mode |
| `code-review.instructions.md` | All files | Review standards |

For Next.js-specific patterns (Server Components, Server Actions, App Router), see `frontend.instructions.md`.
