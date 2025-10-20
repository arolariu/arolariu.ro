---
description: 'Next.js and React development standards with App Router, RSC, and observability'
applyTo: 'sites/arolariu.ro/**/*.tsx, sites/arolariu.ro/**/*.ts, sites/arolariu.ro/**/*.jsx, sites/arolariu.ro/**/*.js, sites/arolariu.ro/**/*.css'
---

# Copilot Instructions for React/Next.js Codebase

## 📚 Essential Context

**Before implementing any frontend code, consult these resources:**

1. **Frontend RFCs**: Check `docs/rfc/` for frontend-specific architectural decisions
   - Frontend RFCs are numbered **1000-1999**
   - Review relevant RFCs for observability, architecture patterns, and best practices
   - Examples: OpenTelemetry implementation, type-safe telemetry, SSR/CSR patterns

2. **Frontend Documentation**: `docs/frontend/README.md`
   - Component patterns and guidelines
   - State management strategies
   - Performance optimization techniques

3. **Main Copilot Instructions**: `.github/copilot-instructions.md`
   - Complete monorepo architecture
   - Component library usage (@arolariu/components)
   - Testing and quality standards

**Technology Stack:**
- Next.js 16.0.0-beta.0 (App Router with React Server Components)
- React 19.2.0 (with RSC support)
- TypeScript 5.9.3 (strict mode)
- Tailwind CSS 4.1.14
- Zustand 5.0.8 for state management
- Clerk for authentication
- next-intl 4.3.11 for internationalization

## Project Overview

This is a Next.js 16 application with TypeScript, using the App Router pattern with React Server Components as default.
The project follows domain-driven design principles with a focus on type safety, performance, observability, and maintainability.

## Architecture & Structure

### Directory Structure

```
src/
├── app/                        # Next.js App Router
│   ├── domains/                # Domain-specific features
│   │   └── [domain]/
│   │       ├── _components/    # Domain components
│   │       ├── _hooks/         # Domain-specific hooks
│   │       ├── _context/       # React Context providers
│   │       ├── _types/         # TypeScript interfaces
│   │       ├── _utils/         # Utility functions
│   │       ├── page.tsx        # React Server Component route page
│   │       └── island.tsx      # React Client Component page wrapper
├── components/                 # Shared components that hold business logic
├── presentation/               # Shared components for UI presentation, no business logic
├── hooks/                      # Global custom hooks
├── lib/                        # Utilities and configurations
│   ├── utils.generic.ts        # Generic utility functions that are available for both client and server contexts
│   ├── utils.client.ts         # Client-specific utilities, that are only accessible via the client context
│   └── utils.server.ts         # Server-specific utilities, that are only accessible via the server context
└── types/                      # Global TypeScript types
```

### Naming Conventions

- **Files**: `camelCase.tsx` for components, `camelCase.ts` for utilities
- **Components**: `PascalCase` (e.g., `InvoicePreview`)
- **Hooks**: `camelCase` starting with `use` (e.g., `useInvoiceActions`)
- **Types**: `PascalCase` (e.g., `InvoiceScan`)
- **Constants**: `UPPER_SNAKE_CASE`
- **Private domain files**: Prefix with `_` (e.g., `_components/`, `_hooks/`)

## React Development Standards

### Component Patterns

#### 1. Functional Components with TypeScript

```tsx


import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  title: string;
  isVisible?: boolean;
}

export default function MyComponent({
  children,
  title,
  isVisible = true,
}: Readonly<Props>) {
  // Component logic
  return (
    <div>
      <h1>{title}</h1>
      {isVisible && children}
    </div>
  );
}
```

#### 2. Memoized Components for Performance

```tsx
import { memo, useCallback } from "react";

export const ExpensiveComponent = memo(function ExpensiveComponent({
  data,
  onUpdate,
}) {
  const handleUpdate = useCallback(
    (newValue) => {
      onUpdate(newValue);
    },
    [onUpdate]
  );

  return <div>{/* Component content */}</div>;
});
```

### State Management Pattern

#### Context + Custom Hooks Pattern

```tsx
// 1. Define types
interface ContextType {
  data: DataType[];
  setData: Dispatch<SetStateAction<DataType[]>>;
  status: StatusType;
  setStatus: Dispatch<SetStateAction<StatusType>>;
}

// 2. Create context with provider
export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DataType[]>([]);
  const [status, setStatus] = useState<StatusType>("UNKNOWN");

  const value = useMemo(
    () => ({ data, setData, status, setStatus }),
    [data, status]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// 3. Custom hook for context access
export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }

  return context;
}

// 4. Custom hook for actions
export function useDataActions() {
  const { data, setData, setStatus } = useData();

  const addItem = useCallback(
    (item: DataType) => {
      setData((prev) => [...prev, item]);
    },
    [setData]
  );

  return { addItem /* other actions */ };
}
```

## Component Library Integration

### Using @arolariu/components

```tsx
import { Button, Dialog, DialogContent, toast } from "@arolariu/components";

// Always use the component library for UI elements
// Maintain consistency across the application
```

### Custom Components

- Extend library components when needed
- Follow the same API patterns as library components
- Use Tailwind CSS for styling
- Implement proper accessibility attributes

## Performance Optimization

### 1. Memory Management

```tsx
// Always clean up blob URLs
useEffect(() => {
  return () => {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
    }
  };
}, [blobUrl]);

// Use utility functions for cleanup
export function cleanupBlobUrl(item: DataItem): void {
  if (item.url) {
    URL.revokeObjectURL(item.url);
    item.url = undefined;
  }
}
```

### 2. Efficient Re-renders

```tsx
// Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Use useCallback for event handlers
const handleClick = useCallback(
  (id: string) => {
    onItemClick(id);
  },
  [onItemClick]
);
```

## Error Handling & Validation

### 1. Input Validation

```tsx
export function validateFile(file: File): ValidationError | null {
  if (!SUPPORTED_TYPES.includes(file.type)) {
    return {
      id: generateId(),
      message: `Unsupported file type: ${file.type}`,
      code: "INVALID_TYPE",
    };
  }
  return null;
}
```

### 2. User Feedback

```tsx
// Use toast notifications for user feedback
toast("Operation successful", {
  description: "Your file has been uploaded.",
  duration: 5000,
  style: { backgroundColor: "green", color: "white" },
  icon: <span className="text-white">✔️</span>,
});

// Provide undo functionality where appropriate
toast("Item deleted", {
  action: {
    label: "Undo",
    onClick: () => restoreItem(deletedItem),
  },
});
```

## File Organization Best Practices

### 1. Import Order

```tsx
// 1. React imports
import { useCallback, useEffect, useState } from "react";

// 2. Third-party libraries
import { toast } from "@arolariu/components";

// 3. Internal imports (absolute paths)
import { useGlobalHook } from "@/hooks";

// 4. Relative imports
import type { LocalType } from "../_types/LocalType";
import { localUtility } from "../_utils/localUtility";
import { ComponentName } from "./ComponentName";
```

### 2. Component Structure

```tsx


// Imports (ordered as above)

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
