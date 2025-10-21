# RFC 1002: Comprehensive JSDoc/TSDoc Documentation Standard

**Status**: Accepted
**Authors**: Alexandru Olariu
**Created**: 2025-01-26
**Related RFCs**: RFC 1001 (OpenTelemetry Observability), RFC 2004 (XML Documentation Standard)

---

## Abstract

This RFC documents the comprehensive JSDoc/TSDoc documentation standard employed throughout the arolariu.ro frontend (`sites/arolariu.ro`) codebase. Built on **Next.js 16** (App Router) with **React 19**, this TypeScript-based application uses **type-safe, IntelliSense-optimized JSDoc comments** that serve multiple purposes: IDE autocomplete, API documentation generation, developer onboarding, and architectural knowledge preservation.

Unlike minimal code comments, our JSDoc standard creates **production-grade, tutorial-level documentation** embedded in source code. This documentation explains not just the *what* (visible in code), but the *why* (architectural context), *how* (usage patterns), *when* (appropriate use cases), and *what trade-offs* were considered during implementation.

This standard leverages JSDoc/TSDoc tags (`@param`, `@returns`, `@example`, `@fileoverview`, `@see`, `@remarks`, etc.) to create rich, structured, cross-referenced documentation that transforms the codebase into a **living technical manual** for TypeScript/React development.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Documentation Philosophy](#documentation-philosophy)
3. [JSDoc/TSDoc Structure](#jsdoctsdoc-structure)
4. [Core Documentation Tags](#core-documentation-tags)
5. [Advanced Documentation Techniques](#advanced-documentation-techniques)
6. [Documentation by Code Element Type](#documentation-by-code-element-type)
7. [Next.js & React Patterns](#nextjs--react-patterns)
8. [TypeScript Integration](#typescript-integration)
9. [Real-World Examples](#real-world-examples)
10. [Tooling Integration](#tooling-integration)
11. [Quality Guidelines](#quality-guidelines)
12. [Common Anti-Patterns](#common-anti-patterns)
13. [Documentation Checklist](#documentation-checklist)

---

## Problem Statement

TypeScript/React frontends face unique documentation challenges:

1. **Framework Complexity**: Next.js App Router, React Server Components, Client Components, Server Actions—each requires different mental models
2. **Type Confusion**: TypeScript types are visible in code, but their *purpose* and *constraints* are not
3. **Context Loss**: Why was a component memoized? Why client-side only? Why this state management approach?
4. **Scattered Knowledge**: Architecture decisions hidden in Slack threads or lost in team memory
5. **Onboarding Friction**: New developers struggle with Next.js conventions and project-specific patterns
6. **Stale Documentation**: External wikis become outdated as code evolves

### Design Goals

Our JSDoc/TSDoc standard addresses these challenges by:

1. **Embedding Documentation in Code**: Single source of truth that evolves with implementation
2. **Providing Multi-Level Context**: Quick summaries → Detailed behavior → Design rationale → Usage examples
3. **Enabling IDE-Integrated Learning**: IntelliSense becomes a teaching tool for Next.js/React patterns
4. **Documenting Framework-Specific Patterns**: RSC vs CSC, server actions, streaming, suspense boundaries
5. **Explaining Trade-Offs**: Performance (memoization), bundle size (dynamic imports), UX (loading states)
6. **Cross-Referencing Architecture**: Link to RFCs, OpenTelemetry spans, type definitions, related components

---

## Documentation Philosophy

### Core Principles

1. **Documentation is Code**: JSDoc comments are first-class citizens, not afterthoughts
2. **Write for Multiple Audiences**:
   - Future you (6 months later, debugging SSR hydration mismatch)
   - New team members (learning Next.js App Router)
   - API consumers (other developers using your hooks/utilities)
   - Tooling (TypeDoc, VS Code IntelliSense, GitHub Copilot)
3. **Explain the Why, Not Just the What**: TypeScript types show signatures; JSDoc explains intent
4. **Leverage Structure**: Use JSDoc tags to create scannable, hierarchical documentation
5. **Cross-Reference Liberally**: Link to types, related components, RFCs, external docs (Next.js, React)
6. **Document Contracts, Not Implementation**: Focus on public API surface and guarantees

### Documentation Levels

| Level | Audience | Content | JSDoc Tags |
|-------|----------|---------|-----------|
| **Summary** | All | One-sentence description of purpose | `/** ... */` (first line) |
| **Detailed Explanation** | Developers | Multi-paragraph context, usage, design decisions | `@remarks`, `@description` |
| **Parameter Context** | API Consumers | Parameter types, constraints, valid ranges, defaults | `@param` |
| **Return Value** | API Consumers | What gets returned, when undefined, edge cases | `@returns` |
| **Examples** | Learners | Real code samples showing typical usage | `@example` |
| **Cross-References** | Architects | Links to related types, components, patterns, RFCs | `@see`, `@link` |
| **Type Context** | TypeScript Users | Generic type parameters, constraints, variance | `@template` |
| **Deprecation** | Maintainers | What's deprecated, why, what to use instead | `@deprecated` |

---

## JSDoc/TSDoc Structure

### Basic JSDoc Template

```typescript
/**
 * One-sentence description of what this element does (80 characters max).
 *
 * @remarks
 * Multi-paragraph detailed explanation. Why does this exist? What problem does it solve?
 *
 * **Key Characteristics:**
 * - Thread-safety, mutability, performance considerations
 * - Framework-specific behavior (SSR, CSR, edge runtime)
 *
 * **Usage Context:**
 * - When should this be used? When should it NOT be used?
 * - Next.js-specific guidance (Server vs Client Component)
 *
 * **Design Rationale:**
 * - Why was this designed this way? What trade-offs were made?
 * - Performance vs. bundle size vs. developer experience
 *
 * @param parameterName - What is this parameter? What are valid values?
 * @returns What is returned? When is undefined returned? What are edge cases?
 *
 * @example
 * ```tsx
 * // Real working code showing typical usage
 * const result = myFunction(validInput);
 * ```
 *
 * @see {@link RelatedType}
 * @see {@link https://nextjs.org/docs/app/building-your-application/rendering/server-components}
 */
```

### File-Level Documentation

Use `@fileoverview` for comprehensive module documentation:

```typescript
/**
 * @fileoverview OpenTelemetry configuration, initialization, and utilities
 *
 * This module provides comprehensive observability capabilities for the application including:
 * - Distributed tracing with automatic and manual instrumentation
 * - Metrics collection (counters, histograms, up/down counters)
 * - Structured logging with trace correlation
 * - OTLP HTTP exporters for traces and metrics
 *
 * @module telemetry
 * @see {@link https://opentelemetry.io/docs/languages/js/getting-started/nodejs/}
 * @see {@link https://opentelemetry.io/docs/specs/otel/}
 *
 * @example
 * // Initialize in instrumentation.ts
 * import { startTelemetry } from '@/lib/telemetry';
 * startTelemetry();
 *
 * @example
 * // Use in application code
 * import { withSpan, createCounter, logWithTrace } from '@/lib/telemetry';
 *
 * const counter = createCounter('requests.total', 'Total number of requests');
 * counter.add(1, { method: 'GET' });
 *
 * await withSpan('operation.name', async (span) => {
 *   span.setAttribute('user.id', userId);
 *   logWithTrace('info', 'Processing request', { userId });
 *   return await doWork();
 * });
 */
```

---

## Core Documentation Tags

### 1. Summary (First Line)

**Purpose**: One-sentence description visible in IntelliSense quick info.

**Guidelines**:

- **80 characters maximum** (keep concise for tooltips)
- Start with a verb for functions (Fetches, Formats, Validates, Provides)
- Start with "Represents" or "Defines" for types/interfaces
- Be specific and descriptive
- No implementation details

**Examples**:

```typescript
/**
 * Formats a number as a currency string based on the specified currency code.
 */
export function formatCurrency(amount: number, currency?: string | Currency): string { }

/**
 * Extracts a Base64-encoded string from a Blob object.
 */
export async function extractBase64FromBlob(blob: Blob): Promise<string> { }

/**
 * The footer component displaying site navigation, metadata, and legal links.
 */
export default function Footer(): React.JSX.Element { }
```

### 2. Parameter Tag (`@param`)

**Purpose**: Document parameter types, constraints, valid ranges, nullability, and behavior.

**Syntax**: `@param parameterName - Description with constraints and behavior`

**Guidelines**:

- Describe the parameter's purpose in context
- Specify valid/invalid values
- Document nullability (optional? can be undefined?)
- Explain default values if applicable
- Reference related parameters if dependencies exist
- For TypeScript, types are inferred but constraints are not

**Examples**:

```typescript
/**
 * Server action that fetches a single invoice for a user.
 * @param id - The UUID of the invoice to fetch. Must be a valid UUIDv4 string.
 * @param authToken - The JWT token of the user. Used for API authorization header.
 * @returns A promise resolving to the invoice, or throws an error if the request failed.
 */
export default async function fetchInvoice(id: string, authToken: string): Promise<Invoice> { }

/**
 * Formats a date string into a human-readable format.
 * @param dateString - The date string or Date object to format. Optional; returns empty string if not provided.
 * @returns A formatted date string in the format "MMM DD, YYYY" (e.g., "Mar 15, 2023").
 */
export function formatDate(dateString?: string | Date): string { }

/**
 * Executes a function within an OpenTelemetry span for distributed tracing.
 * @param spanName - Name of the span following semantic conventions (e.g., "http.server.request", "db.query")
 * @param fn - Async function to execute within the span. Receives the span for adding attributes/events
 * @param attributes - Optional type-safe attributes to set on span creation
 * @returns Promise resolving to the function's return value
 */
export async function withSpan<T>(
  spanName: SpanOperationType,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> { }
```

### 3. Returns Tag (`@returns`)

**Purpose**: Document return value type, meaning, when null/undefined, edge cases.

**Syntax**: `@returns Description of return value, nullability, and edge cases`

**Guidelines**:

- Describe the return value's meaning
- Specify when null/undefined is returned
- Document collection behavior (empty array vs. undefined)
- Explain asynchronous return types (Promise, suspense)
- For React components, mention JSX.Element

**Examples**:

```typescript
/**
 * Collects and returns comprehensive information about the user's browser and environment.
 * @returns A JSON string containing detailed browser and environment information.
 */
export function dumpBrowserInformation(): Readonly<string> { }

/**
 * Function that generates a GUID via random number generation.
 * @returns A UUIDv4 compliant GUID, converted to a string.
 * @example
 * GUID: b23090df-9e68-4c12-ae2a-5368db13b6c1
 * GUID: 8b3f7b7e-6b1b-4b7b-8b1b-4b7b8b1b4b7b
 */
export function generateGuid(arraybuffer?: ArrayBuffer): Readonly<string> { }

/**
 * This hook fetches the invoice information.
 * @returns The invoice information and loading state.
 */
export function useInvoice({invoiceIdentifier}: HookInputType): HookOutputType { }
```

### 4. Example Tag (`@example`)

**Purpose**: Provide real, working code samples showing typical usage.

**Guidelines**:

- Use code blocks with TypeScript/TSX syntax highlighting
- Show realistic scenarios, not toy examples
- Include context (imports, variable declarations, error handling)
- Demonstrate best practices
- Multiple examples for complex APIs
- Show both simple and advanced usage

**Examples**:

```typescript
/**
 * Formats a currency amount with the appropriate symbol and locale.
 *
 * @param amount - The numeric amount to format
 * @param currency - Currency code (e.g., "USD") or Currency object
 * @returns Formatted currency string (e.g., "$123.45")
 *
 * @example
 * // Returns "$123.45"
 * formatCurrency(123.45, "USD");
 *
 * @example
 * // Returns "€100.00"
 * formatCurrency(100, "EUR");
 *
 * @example
 * // Returns "£50.00"
 * formatCurrency(50, "GBP");
 */
export function formatCurrency(amount: number, currency?: string | Currency): string { }
```

### 5. See/Link Tags (`@see`, `@link`)

**Purpose**: Cross-reference related types, components, external documentation, RFCs.

**Syntax**:

- `@see {@link TypeName}` - Link to local type/function/class
- `@see {@link https://example.com}` - Link to external URL
- Inline: `{@link TypeName}` - Link within prose

**Examples**:

```typescript
/**
 * Log levels for structured logging.
 *
 * @remarks
 * - `info`: Informational messages about normal application operation
 * - `warn`: Warning messages for potentially harmful situations
 * - `error`: Error messages for serious problems and failures
 * - `debug`: Detailed debug information (development only)
 *
 * @see {@link https://opentelemetry.io/docs/specs/otel/logs/}
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Standard semantic attribute keys for HTTP operations.
 *
 * @see {@link https://opentelemetry.io/docs/specs/semconv/http/}
 */
export interface HttpAttributes {
  "http.method": HttpMethod;
  "http.status_code": number;
}
```

### 6. Remarks Tag (`@remarks`)

**Purpose**: Multi-paragraph detailed explanation providing context and design rationale.

**Guidelines**:

- Use for extended documentation beyond the summary
- Explain architectural alignment (Next.js patterns, React best practices)
- Document framework-specific behavior (SSR, CSR, edge runtime)
- Include design decisions and trade-offs
- Mention known limitations and future enhancements
- Use Markdown for formatting (bold, lists, code)

**Examples**:

```typescript
/**
 * Rendering context for Next.js operations.
 *
 * @remarks
 * - `server`: Server-side rendering (SSR) or server components
 * - `client`: Client-side rendering (CSR) after hydration
 * - `edge`: Edge runtime (middleware, edge functions)
 * - `api`: Backend-for-Frontend API routes
 */
export type RenderContext = "server" | "client" | "edge" | "api";
```

---

## Advanced Documentation Techniques

### 1. Type Parameters (`@template`)

Document generic type parameters with `@template`:

```typescript
/**
 * Generic type representing a paginated response.
 *
 * @template T - The type of items in the data array
 */
export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};
```

### 2. Deprecation (`@deprecated`)

Mark deprecated APIs with migration guidance:

```typescript
/**
 * Fetches user profile from legacy API.
 *
 * @deprecated Use `fetchUserProfileV2` instead. This function will be removed in v3.0.0.
 * The new function provides better type safety and supports pagination.
 *
 * @see {@link fetchUserProfileV2}
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile> { }
```

### 3. Inline Type Links

Use `{@link}` inline for type references in prose:

```typescript
/**
 * Validates an invoice's payment information before persisting to the database.
 *
 * @remarks
 * Ensures that {@link PaymentInformation.totalCostAmount} is non-negative,
 * {@link Currency} is specified, and {@link PaymentInformation.transactionDate}
 * is not in the future.
 */
```

### 4. Module-Level Organization

Group related exports with `@module`:

```typescript
/**
 * @fileoverview Client-side utilities for browser environment
 *
 * This module provides browser-specific functionality:
 * - Browser storage (localStorage, sessionStorage) availability checks
 * - Navigator information extraction
 * - Screen information retrieval
 * - Base64 encoding from Blob objects
 *
 * @module utils.client
 *
 * @remarks
 * **Important**: All functions in this module are client-side only and will throw
 * in server/edge environments. Use feature detection before calling.
 */
```

### 5. Structured Remarks

Use Markdown for hierarchical information:

```typescript
/**
 * Operation types for span naming.
 *
 * @remarks
 * Use these prefixes for consistent span naming:
 * - `http.server.*`: Incoming HTTP requests
 * - `http.client.*`: Outgoing HTTP requests
 * - `db.*`: Database operations
 * - `cache.*`: Cache operations
 * - `api.*`: API route handlers
 * - `component.*`: React component rendering
 * - `page.*`: Page rendering operations
 * - `auth.*`: Authentication operations
 * - `validation.*`: Data validation
 * - `business.*`: Business logic operations
 *
 * @see {@link https://opentelemetry.io/docs/specs/semconv/}
 */
export type SpanOperationType =
  | `http.server.${string}`
  | `http.client.${string}`
  | `db.${string}`
  | `cache.${string}`;
```

---

## Documentation by Code Element Type

### React Components

**Template**:

```typescript
/**
 * Brief description of what this component renders.
 *
 * @remarks
 * **Rendering Context**: Server Component / Client Component / Edge
 *
 * **Purpose**: Why does this component exist? What UX problem does it solve?
 *
 * **Dependencies**: What context providers or hooks does it require?
 *
 * **Performance**: Is it memoized? Why or why not? Bundle size considerations?
 *
 * @example
 * ```tsx
 * <MyComponent prop1="value" prop2={123} />
 * ```
 */
export function MyComponent(props: MyComponentProps): React.JSX.Element { }
```

**Real Examples**:

```typescript
/**
 * The footer component displaying site navigation, metadata, and legal links.
 * This component is used to display the footer of the website.
 * @returns The footer component.
 */
export default function Footer(): React.JSX.Element { }

/**
 * The header component.
 * @returns The header component.
 *
 * @remarks
 * This component is memoized to prevent unnecessary re-renders when parent state changes.
 * It adapts to mobile/desktop viewports using the {@link useWindowSize} hook.
 */
export default memo(Header);
```

### Custom Hooks

**Template**:

```typescript
/**
 * Hook description explaining what state/behavior it provides.
 *
 * @remarks
 * **Dependencies**: What contexts/providers must be available?
 *
 * **Side Effects**: Does it make API calls? Update external state?
 *
 * **Re-render Triggers**: What causes this hook to re-run?
 *
 * @param input - Hook input parameters
 * @returns Hook output (state, actions, loading flags)
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useMyHook({ id: '123' });
 * ```
 */
export function useMyHook(input: InputType): OutputType { }
```

**Real Example**:

```typescript
/**
 * This hook fetches the invoice information.
 * @returns The invoice information and loading state.
 *
 * @remarks
 * **Dependencies**: Requires {@link useUserInformation} for authentication context.
 *
 * **Side Effects**: Fetches invoice from API on mount and when `invoiceIdentifier` changes.
 *
 * **Error Handling**: Sets `isError` flag on fetch failure. Check this before rendering invoice data.
 */
export function useInvoice({invoiceIdentifier}: HookInputType): HookOutputType { }
```

### Server Actions

**Template**:

```typescript
/**
 * Server action description.
 *
 * @remarks
 * **Execution Context**: Server-side only. Automatically serializes return value.
 *
 * **Authentication**: Requires user to be authenticated? How is auth checked?
 *
 * **Side Effects**: Database writes? External API calls? Cache invalidation?
 *
 * **Error Handling**: What errors can be thrown? How should client handle them?
 *
 * @param param - Parameter description
 * @returns Promise resolving to result
 *
 * @example
 * ```tsx
 * const result = await myServerAction(formData);
 * ```
 */
export async function myServerAction(param: Type): Promise<Result> {
  "use server";
  // Implementation
}
```

**Real Example**:

```typescript
/**
 * Server action that fetches a single invoice for a user.
 *
 * @remarks
 * **Execution Context**: Server-side only (Next.js server action).
 *
 * **Authentication**: Requires valid JWT token in `authToken` parameter.
 *
 * **Side Effects**: Makes authenticated API call to backend REST endpoint.
 *
 * **Error Handling**: Throws error on non-OK response or network failure.
 * Client should catch and display error message.
 *
 * @param id - The UUID of the invoice to fetch. Must be a valid UUIDv4 string.
 * @param authToken - The JWT token of the user. Used for API authorization header.
 * @returns A promise resolving to the invoice, or throws an error if the request failed.
 */
export default async function fetchInvoice(id: string, authToken: string): Promise<Invoice> {
  "use server";
  // Implementation
}
```

### Type Definitions

**Template**:

```typescript
/**
 * Type description explaining what it represents.
 *
 * @remarks
 * **Purpose**: Why does this type exist? What domain concept does it model?
 *
 * **Constraints**: What invariants must be maintained?
 *
 * **Usage Context**: When should this type be used vs. alternatives?
 *
 * @example
 * ```typescript
 * const example: MyType = {
 *   field1: "value",
 *   field2: 123
 * };
 * ```
 */
export type MyType = {
  field1: string;
  field2: number;
};
```

**Real Examples**:

```typescript
/**
 * The type of the object that represents information about a user.
 */
export type UserInformation = {
  user: User | null;
  userIdentifier: string;
  userJwt: string;
};

/**
 * The status of an upload operation.
 * This is used to track the status of an upload operation.
 *
 * @remarks
 * Status follows a two-phase pattern: client-side → server-side.
 * Each phase can be PENDING, SUCCESS, or FAILURE.
 */
export type UploadStatus =
  | "UNKNOWN"
  | "PENDING__CLIENTSIDE"
  | "PENDING__SERVERSIDE"
  | "SUCCESS__CLIENTSIDE"
  | "SUCCESS__SERVERSIDE"
  | "FAILURE__CLIENTSIDE"
  | "FAILURE__SERVERSIDE";
```

### Utility Functions

**Template**:

```typescript
/**
 * Function description explaining what it does.
 *
 * @remarks
 * **Algorithm**: High-level explanation of approach.
 *
 * **Performance**: Time/space complexity if relevant.
 *
 * **Edge Cases**: How are edge cases handled?
 *
 * @param param - Parameter with constraints
 * @returns Return value with nullability info
 *
 * @example
 * ```typescript
 * const result = myUtility(input);
 * ```
 */
export function myUtility(param: Type): Result { }
```

**Real Examples**:

```typescript
/**
 * Function that generates a GUID via random number generation.
 *
 * @remarks
 * **Algorithm**: Uses `crypto.getRandomValues()` for cryptographically strong randomness
 * when available, with Math.random() fallback.
 *
 * **Format**: UUIDv4 compliant (version 4, variant 10).
 *
 * @param arraybuffer - Optional ArrayBuffer to use as entropy source
 * @returns A UUIDv4 compliant GUID, converted to a string.
 *
 * @example
 * GUID: b23090df-9e68-4c12-ae2a-5368db13b6c1
 * GUID: 8b3f7b7e-6b1b-4b7b-8b1b-4b7b8b1b4b7b
 * GUID: b1624a43-1f96-4d22-b94f-d030cc5df437
 */
export function generateGuid(arraybuffer?: ArrayBuffer): Readonly<string> { }

/**
 * This function checks if the browser storage is available.
 * This function is extracted from the MDN Web Docs regarding the Web Storage API.
 *
 * @remarks
 * **Purpose**: Feature detection for localStorage/sessionStorage support.
 *
 * **Edge Cases**: Returns true even when quota is exceeded IF storage has existing items.
 * This acknowledges QuotaExceededError only if storage is functional.
 *
 * @param type - The storage type to check ("localStorage" or "sessionStorage")
 * @returns True if the storage is available, false otherwise.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Storage}
 */
export function isBrowserStorageAvailable(type: "localStorage" | "sessionStorage"): boolean { }
```

---

## Next.js & React Patterns

### Server vs. Client Components

**Document Rendering Context**:

```typescript
/**
 * Root layout component wrapping the entire application.
 *
 * @remarks
 * **Rendering Context**: Server Component (default in App Router).
 *
 * **Async Component**: Can use `await` for data fetching (locale, cookies).
 *
 * **Hydration**: Wraps children with client-side providers (auth, theme, i18n).
 *
 * **Suspense Boundary**: Uses `<Suspense>` for streaming HTML with loading fallback.
 *
 * @param props - Layout props including children
 * @returns The root layout JSX
 */
export default async function RootLayout(props: LayoutProps<"/">): Promise<React.JSX.Element> { }

/**
 * FontContextProvider component provides a context for managing font selection.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive required).
 *
 * **Client-Side Storage**: Persists font preference to localStorage.
 *
 * **Hydration Safety**: Initializes state server-side with default, hydrates with localStorage value client-side.
 *
 * @returns A provider component that supplies the font context to its children.
 *
 * @example
 * ```tsx
 * <FontContextProvider>
 *   <YourComponent />
 * </FontContextProvider>
 * ```
 */
export function FontContextProvider({children}: Readonly<{children: React.ReactNode}>): React.JSX.Element {
  "use client";
  // Implementation
}
```

### Memoization

```typescript
/**
 * The header component.
 *
 * @remarks
 * **Performance Optimization**: This component is memoized with `React.memo()` to prevent
 * unnecessary re-renders when parent components (layout) re-render due to route changes.
 *
 * **Why Memoize?**
 * - Header is static for most navigation (no prop changes)
 * - Re-rendering triggers expensive responsive layout calculations
 * - Improves Core Web Vitals (reduces layout shifts)
 *
 * **When Not to Memoize?**
 * - If header needs to react to every route change (dynamic breadcrumbs)
 * - If props change frequently (defeats memoization benefit)
 *
 * @returns The header component.
 */
export default memo(Header);
```

### Dynamic Imports

```typescript
/**
 * Context providers wrapping the entire application.
 *
 * @remarks
 * **Performance**: `WebVitals` is dynamically imported to reduce initial bundle size.
 * It's only loaded client-side after hydration, preventing blocking of critical rendering path.
 *
 * **Provider Nesting Order**:
 * 1. AuthProvider (Clerk) - Outermost for authentication context
 * 2. FontProvider - Custom font selection state
 * 3. ThemeProvider (next-themes) - Light/dark mode
 * 4. TranslationProvider (next-intl) - Internationalization
 *
 * @param props - Provider props including locale and children
 * @returns Context providers wrapping children
 */
export default function ContextProviders({locale, children}: Readonly<Props>): React.JSX.Element {
  const WebVitals = dynamic(() => import("./web-vitals"));
  // Implementation
}
```

---

## TypeScript Integration

### Type-Safe JSDoc

TypeScript infers types from JSDoc when no TypeScript types are present:

```typescript
/**
 * @param {string} name - User's name
 * @param {number} age - User's age
 * @returns {string} Greeting message
 */
function greet(name, age) {
  return `Hello, ${name}! You are ${age} years old.`;
}
```

But in TypeScript files, **use TypeScript types directly**:

```typescript
/**
 * Greets a user with their name and age.
 *
 * @param name - User's name (must not be empty)
 * @param age - User's age (must be positive)
 * @returns Greeting message
 */
function greet(name: string, age: number): string {
  return `Hello, ${name}! You are ${age} years old.`;
}
```

### Generic Constraints Documentation

```typescript
/**
 * Filters an array of items based on a predicate function.
 *
 * @template T - The type of items in the array. Must extend `BaseEntity` for ID-based filtering.
 * @param items - Array of items to filter
 * @param predicate - Filter function returning true for items to keep
 * @returns Filtered array of items
 *
 * @example
 * ```typescript
 * const users = filterItems(allUsers, user => user.isActive);
 * ```
 */
export function filterItems<T extends BaseEntity>(
  items: T[],
  predicate: (item: T) => boolean
): T[] {
  return items.filter(predicate);
}
```

---

## Real-World Examples

### Example 1: Comprehensive Utility Function

**File**: `src/lib/utils.generic.ts`

```typescript
/**
 * Formats a number as a currency string based on the specified currency code.
 *
 * @remarks
 * Uses `Intl.NumberFormat` for locale-aware formatting. Defaults to USD if no currency provided.
 *
 * **Supported Formats**:
 * - ISO 4217 currency codes (string): "USD", "EUR", "GBP", etc.
 * - Currency objects: `{code: "USD", symbol: "$"}`
 *
 * **Locale**: Fixed to "en-US" for consistency across the application.
 * Future enhancement could accept locale parameter for internationalization.
 *
 * @param amount - The numeric value to be formatted as currency.
 * @param currency - The ISO 4217 currency code (e.g., 'USD', 'EUR', 'GBP') or Currency object. Defaults to USD.
 * @returns A formatted currency string with the appropriate symbol and formatting.
 *
 * @example
 * // Returns "$123.45"
 * formatCurrency(123.45, "USD");
 *
 * @example
 * // Returns "€100.00"
 * formatCurrency(100, "EUR");
 *
 * @example
 * // Returns "£50.00"
 * formatCurrency(50, "GBP");
 */
export function formatCurrency(amount: number, currency?: string | Currency): string {
  return currency
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: typeof currency === "string" ? currency : currency.code,
      }).format(amount)
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
}
```

### Example 2: OpenTelemetry Type Definitions

**File**: `src/telemetry.ts`

```typescript
/**
 * Log levels for structured logging.
 *
 * @remarks
 * - `info`: Informational messages about normal application operation
 * - `warn`: Warning messages for potentially harmful situations
 * - `error`: Error messages for serious problems and failures
 * - `debug`: Detailed debug information (development only)
 *
 * @see {@link https://opentelemetry.io/docs/specs/otel/logs/}
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Rendering context for Next.js operations.
 *
 * @remarks
 * - `server`: Server-side rendering (SSR) or server components
 * - `client`: Client-side rendering (CSR) after hydration
 * - `edge`: Edge runtime (middleware, edge functions)
 * - `api`: Backend-for-Frontend API routes
 *
 * **OpenTelemetry Integration**: Used as span attribute to differentiate execution contexts.
 * This helps identify performance bottlenecks specific to SSR, CSR, or edge runtime.
 */
export type RenderContext = "server" | "client" | "edge" | "api";

/**
 * Standard semantic attribute keys for HTTP operations.
 *
 * @remarks
 * Follows OpenTelemetry semantic conventions for HTTP instrumentation.
 * Use these exact attribute names for consistency with auto-instrumentation.
 *
 * @see {@link https://opentelemetry.io/docs/specs/semconv/http/}
 */
export interface HttpAttributes {
  /**
   * HTTP request method
   */
  "http.method": HttpMethod;

  /**
   * HTTP response status code
   */
  "http.status_code": number;

  /**
   * HTTP route pattern (e.g., "/api/users/:id")
   */
  "http.route"?: string;

  /**
   * Full HTTP request URL
   */
  "http.url"?: string;
}
```

### Example 3: Context Provider with Lifecycle Docs

**File**: `src/contexts/FontContext.tsx`

```typescript
/**
 * Default font for the application.
 * This font is used when no other font is selected.
 */
const defaultFont: NextFontWithVariable = Caudex({
  weight: "700",
  style: "normal",
  subsets: ["latin"],
  variable: "--font-default",
  preload: true,
});

/**
 * Dyslexic font for the application.
 * This font is used when the user selects the dyslexic font option.
 * It is designed to improve readability for individuals with dyslexia.
 */
const dyslexicFont: NextFontWithVariable = Atkinson_Hyperlegible({
  weight: "400",
  style: "normal",
  subsets: ["latin"],
  variable: "--font-dyslexic",
  preload: false,
});

/**
 * FontContextValueType is an interface that defines the shape of the context value
 * provided by the FontContext. It includes the current font and a function to set the font.
 * This interface is used to ensure type safety when consuming the context in components.
 */
interface FontContextValueType {
  font: NextFontWithVariable;
  fontType: FontType;
  fontClassName: string;
  setFont: (fontType: FontType) => void;
}

/**
 * FontContextProvider component provides a context for managing font selection.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` required for hooks/effects).
 *
 * **State Persistence**: Font preference is saved to localStorage for cross-session persistence.
 *
 * **Hydration Safety**:
 * - Server-side: Returns default "normal" font to avoid hydration mismatch
 * - Client-side: Reads localStorage preference after mount
 *
 * **Multi-Tab Sync**: Listens to `storage` events to sync font changes across browser tabs.
 *
 * **Font Application**: Uses `useEffect` to apply font class to `<html>` element,
 * removing conflicting font classes safely without removing unrelated classes.
 *
 * **Performance**:
 * - `defaultFont` is preloaded (common case)
 * - `dyslexicFont` loads on demand (accessibility feature)
 *
 * @param children - React children to wrap with font context
 * @returns A provider component that supplies the font context to its children.
 *
 * @example
 * ```tsx
 * <FontContextProvider>
 *   <YourComponent />
 * </FontContextProvider>
 * ```
 */
export function FontContextProvider({children}: Readonly<{children: React.ReactNode}>): React.JSX.Element {
  "use client";

  const [fontType, setFontType] = useState<FontType>((): FontType => {
    if (isBrowserStorageAvailable("localStorage")) {
      const storedPreference = localStorage.getItem(STORAGE_KEY);
      if (storedPreference === "normal" || storedPreference === "dyslexic") {
        return storedPreference;
      }
    }
    return "normal"; // Default fallback
  });

  /**
   * Function to handle font change.
   * This function takes a font type as an argument and updates the selectedFont state
   * accordingly. It will also trigger the useEffect call, since the selectedFont state is a dependency.
   * @param fontType - The type of font to set (normal or dyslexic).
   */
  const handleFontChange = useCallback((fontType: "normal" | "dyslexic") => {
    if (isBrowserStorageAvailable("localStorage")) {
      localStorage.setItem(STORAGE_KEY, fontType);
    }
    setFontType(fontType);
  }, []);

  // ... rest of implementation
}
```

---

## Tooling Integration

### 1. VS Code IntelliSense

**How it Works**:

- JSDoc comments appear in IntelliSense tooltips when hovering over types/functions
- First line (summary) shows in quick info
- `@param`, `@returns` show in signature help
- `@example` code blocks can be viewed in expanded documentation
- TypeScript compiler validates JSDoc type annotations

**Best Practices**:

- Keep summary concise (80 chars) for tooltip readability
- Use `@remarks` for extended information (users can expand)
- Provide `@example` for complex APIs (shows in "Examples" section)

### 2. TypeDoc Documentation Generation

**How it Works**:

- TypeDoc parses TypeScript files and extracts JSDoc comments
- Generates static HTML documentation sites
- Supports Markdown in JSDoc comments
- Cross-references resolve automatically

**Configuration** (`typedoc.json`):

```json
{
  "entryPoints": ["src/index.ts"],
  "out": "docs",
  "exclude": ["**/*.test.ts", "**/*.spec.ts"],
  "excludePrivate": true,
  "excludeProtected": false,
  "readme": "README.md",
  "theme": "default",
  "plugin": ["typedoc-plugin-markdown"]
}
```

**Generation Command**:

```bash
npx typedoc --options typedoc.json
```

### 3. GitHub Copilot Context

**How it Works**:

- Copilot reads JSDoc comments to understand function purpose
- Uses `@param` and `@returns` for autocomplete suggestions
- `@example` blocks provide usage patterns for AI suggestions
- Better JSDoc = Better Copilot suggestions

**Best Practices**:

- Include realistic `@example` blocks for AI training
- Explain edge cases and error handling
- Document type constraints beyond TypeScript types

### 4. ESLint JSDoc Validation

**How it Works**:

- `eslint-plugin-jsdoc` enforces JSDoc standards
- Validates JSDoc syntax and completeness
- Checks for mismatches between code and documentation

**Configuration** (`.eslintrc.js`):

```javascript
module.exports = {
  plugins: ["jsdoc"],
  rules: {
    "jsdoc/check-alignment": "error",
    "jsdoc/check-param-names": "error",
    "jsdoc/check-tag-names": "error",
    "jsdoc/check-types": "error",
    "jsdoc/require-description": "warn",
    "jsdoc/require-param": "error",
    "jsdoc/require-param-description": "warn",
    "jsdoc/require-returns": "error",
    "jsdoc/require-returns-description": "warn",
  },
};
```

---

## Quality Guidelines

### 1. Completeness

✅ **Document**:

- All exported functions, types, interfaces, classes
- All React components (both Server and Client)
- All custom hooks
- All server actions
- Public utility functions

❌ **Skip**:

- Private implementation details (unless complex algorithms)
- Trivial getters/setters without logic
- Auto-generated code
- Test utilities (unless reusable)

### 2. Clarity

✅ **Good**:

```typescript
/**
 * Validates an invoice's payment information before persisting to the database.
 *
 * @remarks
 * Ensures that total cost amount is non-negative, currency is specified, and
 * transaction date is not in the future. Validation failures throw domain-specific
 * exceptions to be handled by the presentation layer.
 *
 * @param paymentInfo - Payment information to validate
 * @throws {InvalidPaymentError} When payment data violates business rules
 */
```

❌ **Bad**:

```typescript
/**
 * Validates payment info.
 */
```

### 3. Accuracy

✅ **Good**:

```typescript
/**
 * Fetches user profile from API.
 *
 * @param userId - User identifier (UUID v4 format)
 * @returns User profile or undefined when user not found or API error occurs
 */
```

❌ **Bad**:

```typescript
/**
 * Gets user.
 * @returns User
 */
```

### 4. Consistency

**Use Consistent Terminology**:

- "Server Component" vs "Client Component" (not "SSR" vs "CSR" interchangeably)
- "Server Action" (not "API function" or "backend call")
- "Hook" (not "custom React hook" every time)

**Consistent Phrasing**:

- Start function summaries with verbs: "Fetches", "Formats", "Validates", "Provides"
- Start type summaries with nouns: "Represents", "Defines", "Type for"
- Start `@param` with description: "The [noun] to [verb]..."

### 5. Depth

**Provide Multi-Level Context**:

```typescript
/**
 * Persists invoice data to backend API with optimistic UI updates.
 *
 * @remarks
 * **Execution Context**: Server Action (runs server-side only).
 *
 * **Optimistic Updates**: Updates UI immediately, reverts on error.
 *
 * **Validation**: Client-side validation in form component + server-side validation in API.
 *
 * **Error Handling**: Displays toast notification on failure, logs error to OpenTelemetry.
 *
 * **Performance**: Debounced to 500ms to prevent excessive API calls during rapid edits.
 *
 * @param formData - Invoice form data (validated with Zod schema)
 * @returns Promise resolving to saved invoice or throwing validation error
 */
```

---

## Common Anti-Patterns

### ❌ Anti-Pattern 1: Repeating Function Signature

**Bad**:

```typescript
/**
 * Fetches invoice.
 * @param id - Invoice ID
 * @returns Invoice
 */
export async function fetchInvoice(id: string): Promise<Invoice> { }
```

**Good**:

```typescript
/**
 * Server action that fetches a single invoice for the authenticated user.
 *
 * @remarks
 * **Execution Context**: Server-side only (Next.js server action).
 * **Authentication**: Requires valid JWT token from user session.
 * **Caching**: Response is cached for 5 minutes using Next.js cache.
 *
 * @param id - The UUID of the invoice to fetch. Must be a valid UUIDv4 string.
 * @returns A promise resolving to the invoice, or throws NotFoundError if invoice doesn't exist.
 * @throws {NotFoundError} When invoice ID doesn't exist or user lacks permission.
 * @throws {AuthenticationError} When user session is invalid or expired.
 */
export async function fetchInvoice(id: string): Promise<Invoice> { }
```

### ❌ Anti-Pattern 2: Vague Summaries

**Bad**:

```typescript
/**
 * Handles invoice operations.
 */
```

**Good**:

```typescript
/**
 * Custom hook managing invoice CRUD operations with optimistic updates and error handling.
 */
```

### ❌ Anti-Pattern 3: Missing Framework Context

**Bad**:

```typescript
/**
 * Layout component.
 */
export default function Layout() { }
```

**Good**:

```typescript
/**
 * Root layout component wrapping the entire Next.js application.
 *
 * @remarks
 * **Rendering Context**: Server Component (async, can fetch data).
 * **Hydration**: Wraps children with client-side providers (auth, theme, i18n).
 * **Suspense**: Uses React Suspense for streaming HTML with loading fallback.
 * **Metadata**: Generates Open Graph tags via Next.js metadata API.
 */
export default async function Layout(props: LayoutProps) { }
```

### ❌ Anti-Pattern 4: Implementation Details in Summary

**Bad**:

```typescript
/**
 * Uses Intl.NumberFormat to format a number as currency using the en-US locale
 * and the currency parameter or defaults to USD if not provided.
 */
```

**Good**:

```typescript
/**
 * Formats a number as a currency string based on the specified currency code.
 *
 * @remarks
 * **Implementation**: Uses `Intl.NumberFormat` with "en-US" locale for consistency.
 * Defaults to USD when no currency provided.
 */
```

### ❌ Anti-Pattern 5: Outdated Documentation

**Bad** (code changed, docs didn't):

```typescript
/**
 * Fetches all invoices.
 */
export async function getInvoices(userId: string) { } // NOW: User-scoped
```

**Good**:

```typescript
/**
 * Fetches all invoices for a specific user.
 *
 * @param userId - User identifier used to scope invoice query
 * @returns Array of invoices owned by the user. Empty array if none found.
 */
export async function getInvoices(userId: string) { }
```

---

## Documentation Checklist

Use this checklist when documenting new code:

### Functions and Hooks

- [ ] Summary line present and concise (< 80 chars)
- [ ] `@remarks` explains purpose and framework context (Server/Client Component, etc.)
- [ ] All `@param` tags present with constraints
- [ ] `@returns` explains return value (when null, edge cases)
- [ ] `@example` provided for non-obvious usage
- [ ] Cross-references to related types/functions (`@see`)
- [ ] Async/Promise behavior documented
- [ ] Error handling documented (what errors, when)

### React Components Checklist

- [ ] Component purpose documented
- [ ] Rendering context specified (Server/Client/Edge)
- [ ] Props documented (if not using TypeScript interface)
- [ ] Dependencies documented (context providers, hooks required)
- [ ] Performance considerations (memoization, dynamic imports)
- [ ] `@example` showing typical usage in JSX

### Type Definitions Checklist

- [ ] Type purpose explained
- [ ] Domain concept described (what it models)
- [ ] Constraints/invariants documented
- [ ] Usage context explained (when to use vs. alternatives)
- [ ] `@example` showing object literal

### Server Actions Checklist

- [ ] Execution context documented (server-side only)
- [ ] Authentication requirements specified
- [ ] Side effects listed (DB writes, API calls, cache invalidation)
- [ ] Error handling explained
- [ ] Return value serialization mentioned

### Module/File

- [ ] `@fileoverview` present for major modules
- [ ] High-level purpose explained
- [ ] Key exports listed
- [ ] Related modules cross-referenced
- [ ] Framework-specific guidance (Next.js, React)

---

## Conclusion

The arolariu.ro frontend codebase employs a **comprehensive, framework-aware JSDoc/TSDoc standard** that transforms TypeScript code into self-documenting, educational material. This documentation serves as:

1. **Living Architecture Documentation**: Next.js patterns, React best practices, design decisions embedded in code
2. **API Reference Material**: IntelliSense tooltips, TypeDoc-generated sites for API consumers
3. **Onboarding Material**: New developers learn App Router, Server Components, Server Actions through inline docs
4. **Quality Enforcement**: Documentation reviews catch design inconsistencies
5. **AI Training Data**: Better JSDoc = Better GitHub Copilot suggestions

### Key Takeaways

✅ **Document the Why, Not Just the What**: TypeScript shows types; JSDoc explains intent, constraints, trade-offs

✅ **Use Full JSDoc Tag Set**: `@param`, `@returns`, `@example`, `@remarks`, `@see`, `@fileoverview`, `@template`, `@deprecated`

✅ **Provide Multi-Level Context**: Quick summary → Framework context → Design rationale → Usage examples

✅ **Cross-Reference Architecture**: Link to types, components, RFCs, Next.js docs, React docs

✅ **Write for Multiple Audiences**: Developers, API consumers, new team members, tooling (TypeDoc, Copilot)

✅ **Maintain Documentation**: Update JSDoc when code changes (treat as first-class code)

✅ **Document Framework Patterns**: Server/Client Components, Server Actions, SSR/CSR, dynamic imports, Suspense

This standard ensures that every piece of TypeScript/React code is **self-documenting, contextually rich, and pedagogically valuable**—transforming the frontend codebase into a **living technical manual** that teaches Next.js/React patterns while it functions.

---

## References

- **JSDoc Official Documentation**: <https://jsdoc.app/>
- **TSDoc Specification**: <https://tsdoc.org/>
- **TypeDoc Documentation Generator**: <https://typedoc.org/>
- **Next.js Documentation**: <https://nextjs.org/docs>
- **React Documentation**: <https://react.dev/>
- **OpenTelemetry JavaScript**: <https://opentelemetry.io/docs/languages/js/>
- **RFC 1001**: OpenTelemetry Observability System (`docs/rfc/1001-opentelemetry-observability-system.md`)
- **RFC 2004**: XML Documentation Standard (Backend) (`docs/rfc/2004-comprehensive-xml-documentation-standard.md`)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-26
**Maintainer**: Alexandru Olariu ([@arolariu](https://github.com/arolariu))
