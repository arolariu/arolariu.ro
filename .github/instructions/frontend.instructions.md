---
description: 'Next.js and React development standards with App Router, RSC, and observability'
applyTo: 'sites/arolariu.ro/**/*.tsx, sites/arolariu.ro/**/*.ts, sites/arolariu.ro/**/*.jsx, sites/arolariu.ro/**/*.js, sites/arolariu.ro/**/*.css'
---

# Frontend Development Guidelines

Comprehensive guidelines for the arolariu.ro Next.js frontend application.

---

## 🎯 Quick Reference

| Aspect | Value |
|--------|-------|
| **Framework** | Next.js 16.0.0 (App Router) |
| **React** | 19.2.0 (with RSC) |
| **TypeScript** | 5.9.3 (strict mode) |
| **Styling** | Tailwind CSS 4.x |
| **State** | Zustand 5.x + Context API |
| **Auth** | Clerk |
| **i18n** | next-intl 4.x |
| **Components** | @arolariu/components (shadcn/ui based) |
| **Node** | ≥24.x |

---

## 📚 Essential Context

| Resource | Location | Purpose |
|----------|----------|---------|
| RFC 1001 | `docs/rfc/1001-opentelemetry-observability-system.md` | Frontend telemetry |
| RFC 1002 | `docs/rfc/1002-comprehensive-jsdoc-documentation-standard.md` | JSDoc standards |
| RFC 1003 | `docs/rfc/1003-internationalization-system.md` | i18n patterns |
| RFC 1004 | `docs/rfc/1004-metadata-seo-system.md` | SEO & metadata |
| Frontend Docs | `docs/frontend/README.md` | Implementation details |

---

## 📁 Project Structure

```
sites/arolariu.ro/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Root layout (RSC)
│   │   ├── page.tsx                # Home page (RSC)
│   │   ├── providers.tsx           # Context providers
│   │   ├── island.tsx              # Client Component wrapper
│   │   ├── globals.css             # Global styles
│   │   ├── (privacy-and-terms)/    # Route groups
│   │   ├── about/                  # Static pages
│   │   ├── api/                    # API routes
│   │   ├── auth/                   # Auth pages
│   │   ├── domains/                # Business domains
│   │   │   ├── invoices/           # Invoice domain
│   │   │   │   ├── page.tsx        # RSC route page
│   │   │   │   ├── island.tsx      # Client wrapper
│   │   │   │   ├── layout.tsx      # Domain layout
│   │   │   │   ├── _components/    # Domain components
│   │   │   │   ├── _contexts/      # Domain contexts
│   │   │   │   └── _dialogs/       # Domain dialogs
│   │   │   └── layout.tsx          # Domains layout
│   │   └── _components/            # App-level components
│   │
│   ├── components/                 # Shared components (with logic)
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── Commander.tsx
│   │
│   ├── presentation/               # UI components (no logic)
│   │
│   ├── contexts/                   # Global React contexts
│   │   └── FontContext.tsx         # Font selection context
│   │
│   ├── hooks/                      # Custom React hooks
│   │   ├── index.ts                # Barrel export
│   │   ├── useInvoice.tsx
│   │   ├── useInvoices.tsx
│   │   ├── useMerchant.tsx
│   │   ├── useMerchants.tsx
│   │   ├── usePagination.tsx
│   │   └── useUserInformation.tsx
│   │
│   ├── stores/                     # Zustand stores
│   │   ├── index.ts
│   │   ├── invoicesStore.tsx       # Invoice state + IndexedDB
│   │   ├── merchantsStore.tsx      # Merchant state + IndexedDB
│   │   └── storage/                # Storage adapters
│   │       └── indexedDBStorage.ts
│   │
│   ├── lib/                        # Utilities & actions
│   │   ├── utils.generic.ts        # Shared utilities
│   │   ├── utils.client.ts         # Client-only utilities
│   │   ├── utils.server.ts         # Server-only utilities
│   │   └── actions/                # Server Actions
│   │       ├── cookies.ts
│   │       └── invoices/
│   │           ├── fetchInvoice.ts
│   │           └── fetchInvoices.ts
│   │
│   ├── types/                      # TypeScript definitions
│   │   ├── index.ts                # Global types
│   │   ├── typedEnv.ts             # Environment types
│   │   ├── DDD/                    # Domain types
│   │   └── invoices/               # Invoice domain types
│   │
│   ├── i18n/                       # Internationalization
│   │   └── request.ts
│   │
│   ├── metadata.ts                 # SEO metadata config
│   ├── telemetry.ts                # OpenTelemetry config
│   └── instrumentation.ts          # OTel initialization
│
├── messages/                       # Translation files
│   ├── en.json
│   └── ro.json
│
├── public/                         # Static assets
│   └── manifest/                   # PWA manifest & icons
│
├── next.config.ts                  # Next.js config
├── tailwind.config.ts              # Tailwind config
├── tsconfig.json                   # TypeScript config
├── vitest.config.ts                # Unit test config
└── playwright.config.ts            # E2E test config
```

---

## ⚛️ React Server Components (RSC)

### Default: Server Components

```tsx
// app/domains/invoices/page.tsx - Server Component (NO "use client")
import {createMetadata} from "@/metadata";
import {getTranslations} from "next-intl/server";
import RenderInvoicesScreen from "./island";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Invoices.__metadata__");
  return createMetadata({title: t("title"), description: t("description")});
}

export default async function InvoicesPage(): Promise<React.JSX.Element> {
  // Direct async data fetching
  const data = await fetchData();
  
  // Delegate interactivity to Client Component
  return <RenderInvoicesScreen initialData={data} />;
}
```

### Client Components (Island Pattern)

Only use `"use client"` when you need:
- Browser APIs (window, localStorage)
- Event handlers (onClick, onChange)
- React hooks (useState, useEffect)
- Browser-only libraries

```tsx
// app/domains/invoices/island.tsx
"use client";

import {useInvoices} from "@/hooks";
import {useState} from "react";

interface Props {
  initialData: Invoice[];
}

export default function RenderInvoicesScreen({initialData}: Readonly<Props>): React.JSX.Element {
  const {invoices, isLoading} = useInvoices();
  const [filter, setFilter] = useState("");
  
  return (
    <div>
      <input onChange={(e) => setFilter(e.target.value)} />
      {/* Interactive content */}
    </div>
  );
}
```

### Server Actions

```tsx
// lib/actions/invoices/createInvoice.ts
"use server";

import {revalidatePath} from "next/cache";

export async function createInvoice(formData: FormData) {
  const data = Object.fromEntries(formData);
  const result = await saveToDatabase(data);
  
  revalidatePath("/domains/invoices");
  return {success: true, data: result};
}

// Usage in Client Component
import {createInvoice} from "@/lib/actions/invoices/createInvoice";

<form action={createInvoice}>
  <input name="name" required />
  <button type="submit">Create</button>
</form>
```

---

## 🏗️ Component Patterns

### Functional Components with Props

```tsx
import type {ReactNode} from "react";

interface Props {
  children: ReactNode;
  title: string;
  isVisible?: boolean;
}

export default function MyComponent({
  children,
  title,
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

### Memoized Components

```tsx
import {memo, useCallback} from "react";

interface Props {
  data: DataType;
  onUpdate: (id: string) => void;
}

export const ExpensiveComponent = memo(function ExpensiveComponent({
  data,
  onUpdate,
}: Readonly<Props>): React.JSX.Element {
  const handleClick = useCallback(() => {
    onUpdate(data.id);
  }, [data.id, onUpdate]);

  return <button onClick={handleClick}>{data.name}</button>;
});
```

### Context + Custom Hooks Pattern

```tsx
// contexts/FontContext.tsx
"use client";

import {createContext, use, useCallback, useMemo, useState} from "react";

type FontType = "normal" | "dyslexic";

interface FontContextValue {
  fontType: FontType;
  setFont: (type: FontType) => void;
}

const FontContext = createContext<FontContextValue | undefined>(undefined);

export function FontContextProvider({children}: {children: React.ReactNode}): React.JSX.Element {
  const [fontType, setFontType] = useState<FontType>("normal");
  
  const setFont = useCallback((type: FontType) => {
    setFontType(type);
    localStorage.setItem("selectedFont", type);
  }, []);
  
  const value = useMemo(() => ({fontType, setFont}), [fontType, setFont]);
  
  return (
    <FontContext.Provider value={value}>
      {children}
    </FontContext.Provider>
  );
}

export function useFontContext(): FontContextValue {
  const context = use(FontContext);
  if (!context) {
    throw new Error("useFontContext must be used within FontContextProvider");
  }
  return context;
}
```

---

## 🗃️ State Management

### Zustand Store with IndexedDB Persistence

```tsx
// stores/invoicesStore.tsx
import type {Invoice} from "@/types/invoices";
import {create} from "zustand";
import {devtools, persist} from "zustand/middleware";
import {createIndexedDBStorage} from "./storage/indexedDBStorage";

interface InvoicesState {
  invoices: ReadonlyArray<Invoice>;
  selectedInvoices: Invoice[];
  hasHydrated: boolean;
}

interface InvoicesActions {
  setInvoices: (invoices: ReadonlyArray<Invoice>) => void;
  upsertInvoice: (invoice: Invoice) => void;
  removeInvoice: (invoiceId: string) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

type InvoicesStore = InvoicesState & InvoicesActions;

const indexedDBStorage = createIndexedDBStorage<InvoicesPersistedState, Invoice>({
  table: "invoices",
  entityKey: "invoices",
});

export const useInvoicesStore = create<InvoicesStore>()(
  devtools(
    persist(
      (set) => ({
        invoices: [],
        selectedInvoices: [],
        hasHydrated: false,
        
        setInvoices: (invoices) => set({invoices}),
        upsertInvoice: (invoice) => set((state) => ({
          invoices: state.invoices.some((i) => i.id === invoice.id)
            ? state.invoices.map((i) => i.id === invoice.id ? invoice : i)
            : [...state.invoices, invoice],
        })),
        removeInvoice: (invoiceId) => set((state) => ({
          invoices: state.invoices.filter((i) => i.id !== invoiceId),
        })),
        setHasHydrated: (hasHydrated) => set({hasHydrated}),
      }),
      {
        name: "invoices-store",
        storage: indexedDBStorage,
        onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
      }
    )
  )
);
```

### Custom Data Fetching Hook

```tsx
// hooks/useInvoice.tsx
"use client";

import fetchInvoice from "@/lib/actions/invoices/fetchInvoice";
import {useInvoicesStore} from "@/stores";
import type {Invoice} from "@/types/invoices";
import {useEffect, useState} from "react";
import {useShallow} from "zustand/react/shallow";

type HookInput = Readonly<{invoiceIdentifier: string}>;
type HookOutput = Readonly<{
  invoice: Invoice | null;
  isLoading: boolean;
  isError: boolean;
}>;

export function useInvoice({invoiceIdentifier}: HookInput): HookOutput {
  const [isError, setIsError] = useState(false);

  const {cachedInvoice, upsertInvoice, hasHydrated} = useInvoicesStore(
    useShallow((state) => ({
      cachedInvoice: state.invoices.find((inv) => inv.id === invoiceIdentifier) ?? null,
      upsertInvoice: state.upsertInvoice,
      hasHydrated: state.hasHydrated,
    })),
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const invoice = await fetchInvoice({invoiceId: invoiceIdentifier});
        upsertInvoice(invoice);
      } catch (error) {
        console.error("Error fetching invoice:", error);
        setIsError(true);
      }
    };
    fetchData();
  }, [invoiceIdentifier]);

  return {invoice: cachedInvoice, isLoading: !hasHydrated, isError};
}
```

---

## 🎨 Styling with Tailwind CSS

### Using @arolariu/components

```tsx
import {Button, Dialog, DialogContent, DialogHeader, toast} from "@arolariu/components";

export function MyComponent() {
  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>Title</DialogHeader>
        <Button onClick={() => toast("Success!")}>
          Click Me
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

### Tailwind Class Patterns

```tsx
// Use cn() for conditional classes
import {cn} from "@arolariu/components";

<div className={cn(
  "flex items-center gap-4 p-4",
  "bg-white dark:bg-black",
  isActive && "border-2 border-primary",
  className
)} />

// Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" />

// Dark mode
<div className="bg-white text-black dark:bg-black dark:text-white" />
```

---

## 🌐 Internationalization (i18n)

### Server-Side Translation

```tsx
// In Server Components
import {getTranslations, getLocale} from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("Namespace");
  const locale = await getLocale();
  
  return <h1>{t("title")}</h1>;
}
```

### Client-Side Translation

```tsx
// In Client Components
"use client";

import {useTranslations} from "next-intl";

export function Component() {
  const t = useTranslations("Namespace");
  
  return <p>{t("message")}</p>;
}
```

### Translation Files

```json
// messages/en.json
{
  "Namespace": {
    "title": "Page Title",
    "message": "Welcome, {name}!"
  },
  "Invoices": {
    "__metadata__": {
      "title": "Invoices",
      "description": "Manage your invoices"
    }
  }
}
```

---

## 📊 SEO & Metadata (RFC 1004)

### Using createMetadata

```tsx
// app/domains/invoices/page.tsx
import {createMetadata} from "@/metadata";
import type {Metadata} from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Invoices.__metadata__");
  const locale = await getLocale();
  
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    openGraph: {
      images: ["/og/invoices.png"],
    },
  });
}
```

---

## 📡 Observability (RFC 1001)

### Telemetry Types

```typescript
// From telemetry.ts
export type LogLevel = "debug" | "info" | "warn" | "error";
export type RenderContext = "server" | "client" | "edge" | "api";
export type SpanOperationType =
  | `http.server.${string}`
  | `http.client.${string}`
  | `db.${string}`
  | `api.${string}`
  | `page.${string}`
  | `component.${string}`;
```

### Using Telemetry

```tsx
import {withSpan, createCounter, logWithTrace} from "@/instrumentation.server";

// Server Component with tracing
export default async function Page() {
  return withSpan("page.invoices.render", async (span) => {
    span.setAttribute("page.route", "/domains/invoices");
    const data = await fetchData();
    return <InvoicesScreen data={data} />;
  });
}

// Client Component with metrics
"use client";
const pageViewCounter = createCounter("page.views", "Total page views");

export function TrackedComponent() {
  useEffect(() => {
    pageViewCounter.add(1, {route: "/invoices"});
  }, []);
}
```

---

## 🔐 Authentication (Clerk)

### Protected Routes

```tsx
// In Server Components
import {auth, currentUser} from "@clerk/nextjs/server";
import {redirect} from "next/navigation";

export default async function ProtectedPage() {
  const {userId} = await auth();
  if (!userId) redirect("/auth/sign-in");
  
  const user = await currentUser();
  return <div>Welcome, {user?.firstName}</div>;
}
```

### User Information Hook

```tsx
// hooks/useUserInformation.tsx
"use client";

import {useUser} from "@clerk/nextjs";

export function useUserInformation() {
  const {user, isLoaded, isSignedIn} = useUser();
  
  return {
    user,
    isLoading: !isLoaded,
    isSignedIn: Boolean(isSignedIn),
  };
}
```

---

## 🧪 Testing

### Unit Tests (Vitest)

```tsx
// hooks/useInvoice.test.tsx
import {renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {useInvoice} from "./useInvoice";

describe("useInvoice", () => {
  it("returns loading state initially", () => {
    const {result} = renderHook(() => 
      useInvoice({invoiceIdentifier: "test-id"})
    );
    
    expect(result.current.isLoading).toBe(true);
  });
});
```

### E2E Tests (Playwright)

```typescript
// playwright/invoices.spec.ts
import {expect, test} from "@playwright/test";

test("user can view invoices", async ({page}) => {
  await page.goto("/domains/invoices");
  await expect(page.getByRole("heading", {name: "Invoices"})).toBeVisible();
});
```

---

## 📝 Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| **Files** | camelCase.tsx | `useInvoice.tsx` |
| **Components** | PascalCase | `InvoiceCard` |
| **Hooks** | use + PascalCase | `useInvoices` |
| **Stores** | camelCase + Store | `invoicesStore` |
| **Actions** | verb + Noun | `fetchInvoice` |
| **Types** | PascalCase | `InvoiceStatus` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| **Private folders** | _prefix | `_components/` |
| **Route groups** | (parentheses) | `(auth)/` |

---

## ✅ Quality Checklist

### Before Committing

- [ ] Server Component by default (no unnecessary `"use client"`)
- [ ] Props marked as `Readonly<Props>`
- [ ] Explicit return types on functions
- [ ] JSDoc on public APIs
- [ ] Loading and error states handled
- [ ] Accessibility attributes (aria-*, role)
- [ ] Dark mode styles included
- [ ] Translation keys added (i18n)
- [ ] Tests written/updated

### Performance

- [ ] `useMemo` for expensive calculations
- [ ] `useCallback` for stable references
- [ ] `memo()` for pure components
- [ ] Blob URLs cleaned up
- [ ] Images optimized with next/image

---

## 🚫 Anti-Patterns to Avoid

| Anti-Pattern | Instead Do |
|--------------|------------|
| `"use client"` everywhere | Server Components by default |
| Prop drilling | Context API or Zustand |
| Inline styles | Tailwind CSS classes |
| Direct DOM manipulation | React refs and state |
| Missing cleanup | useEffect cleanup function |
| Missing error boundaries | Implement error.tsx |
| Raw `any` types | Proper TypeScript types |
| Large monolithic components | Smaller focused components |
| Missing loading states | Suspense + loading.tsx |

---

## 📋 Common Commands

```bash
# Development
npm run dev:website

# Build
npm run build:website

# Testing
npm run test:website       # All tests
npm run test:vitest        # Unit tests
npm run test:playwright    # E2E tests

# Quality
npm run lint
npm run format
```

---

## 🔗 Related Resources

- **RFC 1001**: OpenTelemetry Observability System
- **RFC 1002**: JSDoc Documentation Standard  
- **RFC 1003**: Internationalization System
- **RFC 1004**: Metadata & SEO System
- **Component Library**: `packages/components/`

// Types and interfaces
interface Props {
  // Props definition
}

// Constants
const CONSTANT_VALUE = 10;

// Helper functions (outside component if pure)
function helperFunction(param: string): string {
  return param.toUpperCase();
}

// Main component
export default function ComponentName({ prop1, prop2 }: Readonly<Props>) {
  // Hooks (in order: state, effects, custom hooks)
  const [state, setState] = useState<Type>(initialValue);

  useEffect(() => {
    // Effect logic
  }, [dependencies]);

  const { customData } = useCustomHook();

  // Event handlers
  const handleEvent = useCallback(
    (param: Type) => {
      // Handler logic
    },
    [dependencies]
  );

  // Render conditions
  if (condition) {
    return <AlternativeView />;
  }

  // Main render
  return <div>{/* Component JSX */}</div>;
}
```

## Refactoring Guidelines

### 1. DRY Principle Implementation

- Extract common logic into custom hooks
- Create utility functions for repeated operations
- Use TypeScript interfaces to standardize data structures
- Leverage existing hooks and libraries before creating new ones

### 2. Component Decomposition

- Keep components focused on single responsibility
- Extract complex logic into custom hooks
- Use composition over inheritance
- Separate presentation from business logic

### 3. Type System Improvements

- Replace primitive types with structured interfaces
- Use utility functions instead of inline type checking
- Implement proper validation with meaningful error messages
- Create reusable type guards and validators

## Testing Considerations

### 1. Component Testing

- Test component behavior, not implementation
- Use proper TypeScript types in tests
- Mock external dependencies appropriately
- Test error states and edge cases

### 2. Hook Testing

- Test custom hooks in isolation
- Verify state updates and side effects
- Test cleanup functions and memory management
- Ensure proper error handling

## Accessibility & UX

### 1. Semantic HTML

```tsx
// Use proper semantic elements
<main>
  <section aria-labelledby="section-title">
    <h2 id="section-title">Section Title</h2>
    <button aria-describedby="button-help">Action</button>
    <span id="button-help" className="sr-only">
      Help text
    </span>
  </section>
</main>
```

### 2. Loading States

```tsx
// Always provide loading states
if (isLoading) {
  return (
    <div className="flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary" />
    </div>
  );
}
```

## Specific Patterns Established

### 1. Pagination with Search

- Always use the `usePaginationWithSearch` hook for data pagination
- Configure appropriate page sizes for different views
- Implement proper navigation controls with accessibility

### 2. File Handling

- Use structured types (e.g., `InvoiceScan`) instead of raw `Blob` objects
- Implement proper validation and error handling
- Manage memory with automatic cleanup of blob URLs
- Provide user feedback for file operations

### 3. Dialog and Modal Patterns

- Use the component library's Dialog components
- Implement proper accessibility with titles and descriptions
- Handle escape key and backdrop clicks appropriately
- Size dialogs appropriately for content

## React Server Components (RSC) Guidelines

### Default to Server Components

```tsx
// app/page.tsx - Server Component by default (NO "use client")
export default async function Page() {
  const data = await fetchData(); // Direct data fetching
  return <PageContent data={data} />;
}
```

### Client Components (When Needed)

Only use `"use client"` directive when you need:
- Browser APIs (window, localStorage, etc.)
- Event handlers (onClick, onChange, etc.)
- React hooks (useState, useEffect, etc.)
- Browser-only libraries

```tsx
"use client"; // Required at top of file

import { useState } from "react";

export function InteractiveComponent() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### Server Actions Pattern

```tsx
// lib/actions/myAction.ts
"use server";

import { revalidatePath } from "next/cache";

export async function updateData(formData: FormData) {
  const data = processFormData(formData);
  await saveToDatabase(data);
  revalidatePath("/path");
  return { success: true, data };
}

// Usage in component
import { updateData } from "@/lib/actions/myAction";

<form action={updateData}>
  <input name="field" />
  <button type="submit">Submit</button>
</form>
```

## Observability & Telemetry

### Implementing Telemetry (see Frontend RFCs 1000-1999)

```tsx
import { withSpan, createSpan } from "@/lib/telemetry";

// Server Component with telemetry
export default async function Page() {
  return withSpan("Page.render", async (span) => {
    span.setAttribute("page.route", "/example");
    const data = await fetchData();
    return <div>{data}</div>;
  });
}

// Client Component with telemetry
"use client";
export function Component() {
  const handleClick = async () => {
    const span = createSpan("user.action", { action: "click" });
    try {
      await performAction();
      span.end();
    } catch (error) {
      span.recordException(error);
      span.end();
    }
  };
}
```

**Note**: Consult Frontend RFCs (1000-1999) for detailed telemetry patterns and implementation guidance.
```

## Common Anti-Patterns to Avoid

1. **Using "use client" unnecessarily**: Prefer Server Components by default
2. **Prop Drilling**: Use Context API for shared state
3. **Inline Styles**: Use Tailwind CSS classes or CSS modules
4. **Direct DOM Manipulation**: Use React patterns and refs
5. **Memory Leaks**: Always clean up resources in useEffect cleanup
6. **Missing Error Boundaries**: Implement proper error handling
7. **Inconsistent Naming**: Follow established naming conventions
8. **Large Components**: Break down into smaller, focused components
9. **Missing TypeScript**: Always use proper typing for props and state
10. **Ignoring Telemetry**: Add observability to critical paths

## Documentation Standards

### JSDoc Comments

```tsx
/**
 * Processes user uploads and validates file types.
 * @param files Array of files to process
 * @param options Processing options
 * @returns Promise resolving to processed results
 * @throws When file validation fails
 */
export async function processUploads(
  files: File[],
  options: ProcessingOptions
): Promise<ProcessedResult[]> {
  // Implementation
}
```

### README Updates

- Document new features and components
- Provide usage examples
- Update architecture diagrams when needed
- Include troubleshooting guides

## Quick Reference

### Project Structure
```
sites/arolariu.ro/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx         # Root layout (RSC)
│   │   ├── page.tsx           # Home page (RSC)
│   │   └── (routes)/          # Route groups
│   ├── components/            # Shared components with logic
│   ├── presentation/          # UI-only presentation components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities
│   │   ├── telemetry.ts      # OpenTelemetry setup (RFC 1001)
│   │   ├── utils.client.ts   # Client-only utilities
│   │   ├── utils.server.ts   # Server-only utilities
│   │   └── actions/          # Server Actions
│   └── types/                 # TypeScript definitions
└── public/                    # Static assets
```

### Common Commands
- Dev: `npm run dev:website`
- Build: `npm run build:website`
- Test: `npm run test:website`
- Lint: `npm run lint`
- Format: `npm run format`

### Key Patterns
- **RSC First**: Server Components by default, Client Components only when needed
- **Server Actions**: For mutations and form submissions
- **Telemetry**: Observability patterns (see Frontend RFCs 1000-1999)
- **Type Safety**: Strict TypeScript with domain types
- **Component Library**: Use @arolariu/components for UI

Remember: The goal is to maintain high code quality, consistency, and developer experience while building scalable, observable, and maintainable React applications with Next.js 16 and React 19.
