# RFC 1002: Comprehensive JSDoc/TSDoc Documentation Standard

- **Status**: Implemented
- **Date**: 2025-01-26
- **Authors**: Alexandru Olariu
- **Related Components**: `sites/arolariu.ro`, `eslint.config.ts`, `typedoc.website.json`, `typedoc.components.json`
- **Related RFCs**: RFC 1001 (OpenTelemetry Observability), RFC 2004 (XML Documentation Standard)

---

## Abstract

This RFC documents the comprehensive JSDoc/TSDoc documentation standard employed throughout the arolariu.ro frontend (`sites/arolariu.ro`)
codebase. Built on **Next.js 16** (App Router) with **React 19**, this TypeScript-based application uses **type-safe, IntelliSense-optimized
JSDoc comments** that serve multiple purposes: IDE autocomplete, API documentation generation, developer onboarding, and architectural
knowledge preservation.

Unlike minimal code comments, our JSDoc standard creates **production-grade, tutorial-level documentation** embedded in source code. This
documentation explains not just the _what_ (visible in code), but the _why_ (architectural context), _how_ (usage patterns), _when_
(appropriate use cases), and _what trade-offs_ were considered during implementation.

This standard leverages JSDoc/TSDoc tags (`@param`, `@returns`, `@example`, `@fileoverview`, `@see`, `@remarks`, etc.) to create rich,
structured, cross-referenced documentation that transforms the codebase into a **living technical manual** for TypeScript/React development.

---

## Documentation Accuracy Note

If any example in this RFC diverges from the live implementation, source code in this repository is the source of truth and this RFC must be
updated.

### Component package contract documentation

For `@arolariu/components`, document the actual primitive/native owner of render state, callback details, DOM refs and namespace types. Do
not describe a polymorphic ref as a fixed button/div, a nullable generic value as string-only, or a primitive callback as stateless. Public
standalone prop/state names accompany supported namespaces through explicit package exports; collision aliases such as `RHFFieldError`,
`RechartsLabel` and `ToastData` must be deliberate and explained.

Version-scoped MIGRATION/README/EXAMPLES/CHANGELOG entries must distinguish canonical APIs from removed ones, with exact before/after
imports and composition. Preserve historical guides rather than overwriting old-version instructions. Document breaking defaults, native
tags, error/count limits, value/nullability, callback/render ownership, retained extensions and intentional no-ops. Private underscore
helpers must not appear as advertised package APIs.

Source tests/types, built/packed declarations/modules/CSS, React-floor source evidence, React-floor packed evidence and physical-browser
limits are different claims; attribute each to its own evidence. Shipped documentation and RFCs state the verification commands and what
they cover, not dated run logs, test or file counts, or review identifiers, which go stale with every change.

#### Package prop documentation

Every public prop that an `@arolariu/components` component declares or re-declares carries its own JSDoc description, whether the prop is
declared in an interface, a type alias or an intersection member. An optional prop with a default states it with `@default`, matching the
implementation, and the tag changes whenever the default does; required props have no `@default`. A wrapper that overrides an inherited
default (for example Base UI placement) re-declares that prop with its own description and `@default` instead of inheriting the primitive's
documentation. Props passed through unchanged may rely on the primitive's documentation.

```typescript
export type ExampleTriggerProps = Readonly<{
  /**
   * Accessible name for the icon-only trigger. Localize it.
   */
  label: string;
  /**
   * Side of the trigger the popup opens on.
   * @default "bottom"
   */
  side?: "top" | "bottom";
}>;
```

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

1. **Framework Complexity**: Next.js App Router, React Server Components, Client Components, Server Actions—each requires different mental
   models
2. **Type Confusion**: TypeScript types are visible in code, but their _purpose_ and _constraints_ are not
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

| Level                    | Audience         | Content                                              | JSDoc Tags                 |
| ------------------------ | ---------------- | ---------------------------------------------------- | -------------------------- |
| **Summary**              | All              | One-sentence description of purpose                  | `/** ... */` (first line)  |
| **Detailed Explanation** | Developers       | Multi-paragraph context, usage, design decisions     | `@remarks`, `@description` |
| **Parameter Context**    | API Consumers    | Parameter types, constraints, valid ranges, defaults | `@param`                   |
| **Return Value**         | API Consumers    | What gets returned, when undefined, edge cases       | `@returns`                 |
| **Examples**             | Learners         | Real code samples showing typical usage              | `@example`                 |
| **Cross-References**     | Architects       | Links to related types, components, patterns, RFCs   | `@see`, `@link`            |
| **Type Context**         | TypeScript Users | Generic type parameters, constraints, variance       | `@template`                |
| **Deprecation**          | Maintainers      | What's deprecated, why, what to use instead          | `@deprecated`              |

---

## JSDoc/TSDoc Structure

### Basic JSDoc Template

````typescript
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
````

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
 * import { startTelemetry } from "@/instrumentation.server";
 * startTelemetry();
 *
 * @example
 * // Use in application code
 * import { withSpan, createCounter, logWithTrace } from "@/instrumentation.server";
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
 * Formats a numeric amount as a localized currency string.
 */
export function formatCurrency(possibleAmount: number, options: FormatCurrencyOptions): string {}

/**
 * Extracts a Base64-encoded string from a Blob object.
 */
export async function extractBase64FromBlob(blob: Blob): Promise<string> {}

/**
 * Renders the site-wide footer with navigation, metadata, and social links.
 */
function Footer(): React.JSX.Element {}
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
 * @param input - Browser-controlled input validated at the action boundary.
 * @param input.invoiceId - The UUID of the invoice to fetch.
 * @returns A typed success/error result. Identity is derived server-side.
 */
export async function fetchInvoice(input: Readonly<{invoiceId: string}>): ServerActionResult<Readonly<Invoice>> {}

/**
 * Formats a date string or object into a human-readable string.
 * @param possibleDate - Date, ISO string, null, or undefined; returns "" when missing or invalid.
 * @param options - Intl.DateTimeFormat options; `locale` is required and `dateStyle` defaults to "short" unless date fields are set.
 * @returns The localized date string (e.g., "3/15/23" for en-US).
 */
export function formatDate(possibleDate: DateLike, options: FormatDateOptions): string {}

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
  attributes?: TelemetryAttributes,
): Promise<T> {}
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
export function dumpBrowserInformation(): Readonly<string> {}

/**
 * Generates a UUID v4 (random) or v5 (namespaced) string.
 * @param seed - Optional seed string or byte array for deterministic UUID generation.
 * @returns A standard UUID string (e.g., "b23090df-9e68-4c12-ae2a-5368db13b6c1").
 */
export function generateGuid(seed?: string | Uint8Array): Readonly<string> {}

/**
 * Fetches a single invoice by identifier from the backend API.
 * @returns Hook state containing the cached invoice, hydration loading state, and fetch error flag.
 */
export function useInvoice({invoiceIdentifier}: HookInputType): HookOutputType {}
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
 * Formats a numeric amount as a localized currency string.
 *
 * @param possibleAmount - The numeric value to format
 * @param options - Formatting configuration (currencyCode, locale, and optional Intl.NumberFormat overrides)
 * @returns Formatted currency string (e.g., "$123.45")
 *
 * @example
 * // Returns "$123.45"
 * formatCurrency(123.45, {currencyCode: "USD", locale: "en-US"});
 *
 * @example
 * // Returns "100 €"
 * formatCurrency(100, {currencyCode: "EUR", locale: "de-DE"});
 *
 * @example
 * // Returns "£50"
 * formatCurrency(50, {currencyCode: "GBP", locale: "en-GB"});
 */
export function formatCurrency(possibleAmount: number, options: FormatCurrencyOptions): string {}
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
export async function fetchUserProfile(userId: string): Promise<UserProfile> {}
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
export type SpanOperationType = `http.server.${string}` | `http.client.${string}` | `db.${string}` | `cache.${string}`;
```

---

## Documentation by Code Element Type

### React Components

**Template**:

````typescript
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
export function MyComponent(props: MyComponentProps): React.JSX.Element {}
````

**Real Examples** (excerpts from `src/components/Footer.tsx` and `src/components/Header.tsx`):

```typescript
/**
 * Renders the site-wide footer with navigation, metadata, and social links.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive required).
 * …
 * @returns Footer JSX element with navigation, branding, and metadata sections
 */
function Footer(): React.JSX.Element {}

// This component is memoized to prevent unnecessary re-renders
export default memo(Footer);

/**
 * Renders the site-wide header with responsive navigation, branding, and controls.
 *
 * @remarks
 * …
 * **Dependencies:**
 * - `@arolariu/components`: `useWindowSize` hook for responsive viewport detection
 * …
 * **Performance Considerations:**
 * - Component is memoized via `React.memo` to prevent unnecessary re-renders
 * …
 * @returns Header JSX element with responsive navigation, branding, and control buttons
 */
function Header(): React.JSX.Element {}

// This component is memoized to prevent unnecessary re-renders
export default memo(Header);
```

### Custom Hooks

**Template**:

````typescript
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
export function useMyHook(input: InputType): OutputType {}
````

**Real Example** (excerpt from `src/app/domains/invoices/_hooks/invoice/useInvoice.tsx`):

```typescript
/**
 * Fetches a single invoice by identifier from the backend API.
 *
 * @remarks
 * **Rendering Context**: Client Component hook (requires "use client" directive).
 *
 * **Data Fetching:**
 * - Calls server action {@link fetchInvoice} via authenticated API
 * - Automatically refetches when `invoiceIdentifier` changes
 * - Cached data shown immediately after hydration while fresh data loads
 *
 * **Hydration Behavior:**
 * - `isLoading` remains true only until IndexedDB hydration completes
 * …
 * **Error Handling:**
 * - Logs errors to console
 * - Sets `isError` flag but does not throw
 * …
 * @param params - Hook configuration.
 * @param params.invoiceIdentifier - UUID of the invoice to fetch and cache.
 * @returns Hook state containing the cached invoice, hydration loading state, and fetch error flag.
 */
export function useInvoice({invoiceIdentifier}: HookInputType): HookOutputType {}
```

The hook reads and upserts the cached invoice through the `useInvoicesStore` Zustand store; identity is derived server-side by the
`fetchInvoice` server action.

### Server Actions

**Template**:

````typescript
"use server";

/**
 * Server action description.
 *
 * @remarks
 * **Execution Context**: Implemented server-side and exported as
 * browser-callable RPC. Inputs are untrusted and return values are serialized.
 *
 * **Authentication**: How is identity derived server-side and authorization
 * enforced for this operation/resource?
 *
 * **Side Effects**: Database writes? External API calls? Cache invalidation?
 *
 * **Error Handling**: Which established result discriminants can the caller
 * receive?
 *
 * @param param - Parameter description
 * @returns The established typed success/error result
 *
 * @example
 * ```tsx
 * const result = await myServerAction(formData);
 * ```
 */
export async function myServerAction(param: Type): Promise<Result> {
  // Implementation
}
````

**Real Example**:

```typescript
/**
 * Server action that fetches a single invoice for a user.
 *
 * @remarks
 * **Execution Context**: Browser-callable RPC implemented on the server.
 *
 * **RPC Boundary**: Browser-callable export; treat input as untrusted.
 *
 * **Authentication**: Derives the current identity and token server-side,
 * then enforces resource authorization independently.
 *
 * **Side Effects**: Makes authenticated API call to backend REST endpoint.
 *
 * **Error Handling**: Returns the established discriminated result contract.
 *
 * @param input - The validated action input.
 * @param input.invoiceId - The UUID of the invoice to fetch.
 * @returns A typed success/error result containing the invoice when authorized.
 */
export async function fetchInvoice(input: Readonly<{invoiceId: string}>): ServerActionResult<Readonly<Invoice>> {
  // Implementation
}
```

### Type Definitions

**Template**:

````typescript
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
````

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

````typescript
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
export function myUtility(param: Type): Result {}
````

**Real Examples**:

````typescript
/**
 * Generates a UUID v4 (random) or v5 (namespaced) string.
 *
 * @remarks
 * **Behavior:**
 * - If a `seed` is provided, generates a deterministic UUID v5 using the DNS namespace.
 * - If no `seed` is provided, generates a random UUID v4.
 *
 * **Usage Context:**
 * - Use without seed for unique identifiers (primary keys).
 * - Use with seed for deterministic identifiers based on input data (e.g., hashing).
 *
 * @param seed - Optional seed string or byte array for deterministic UUID generation.
 * @returns A standard UUID string (e.g., "b23090df-9e68-4c12-ae2a-5368db13b6c1").
 *
 * @example
 * ```typescript
 * // Random UUID v4
 * const id = generateGuid();
 *
 * // Deterministic UUID v5
 * const hash = generateGuid("my-seed-string");
 * ```
 */
export function generateGuid(seed?: string | Uint8Array): Readonly<string> {}

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
export function isBrowserStorageAvailable(type: "localStorage" | "sessionStorage"): boolean {}
````

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
export default async function RootLayout(props: Readonly<LayoutProps<"/">>): Promise<React.JSX.Element> {}
```

Client Components declare `"use client"` once, as the first statement of the module (as in `src/contexts/FontContext.tsx`), not inside the
component body:

````typescript
"use client";

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
  // Implementation
}
````

### Memoization

```typescript
/**
 * Renders the site-wide header with responsive navigation, branding, and controls.
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
 * @returns Header JSX element with responsive navigation, branding, and control buttons
 */
function Header(): React.JSX.Element {}

// This component is memoized to prevent unnecessary re-renders
export default memo(Header);
```

### Dynamic Imports

```typescript
const WebVitals = dynamic(() => import("./web-vitals"));

/**
 * Context providers wrapping the entire application.
 *
 * @remarks
 * **Performance**: `WebVitals` is lazily imported with `next/dynamic` at module scope and is rendered only when the
 * `webVitalsEnabled` feature flag is enabled.
 *
 * **Provider Nesting Order**:
 * 1. TranslationProvider (next-intl) - Outermost; supplies messages, locale, and time zone
 * 2. AuthProvider (Clerk) - Localized authentication context
 * 3. FontProvider - Custom font selection state
 * 4. ThemeProvider (next-themes) - Light/dark mode
 *
 * @param props - Provider props including locale, messages, feature flags, and children
 * @returns Context providers wrapping children
 */
export default function ContextProviders({locale, messages, featureFlags, children}: Readonly<Props>): React.JSX.Element {
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

````typescript
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
export function filterItems<T extends BaseEntity>(items: T[], predicate: (item: T) => boolean): T[] {
  return items.filter(predicate);
}
````

---

## Real-World Examples

### Example 1: Comprehensive Utility Function

**File**: `src/lib/utils.generic.ts` (signature and body match the source; the JSDoc describes the implemented behavior)

```typescript
/**
 * Formats a numeric amount as a localized currency string.
 *
 * @remarks
 * Uses `Intl.NumberFormat` with the caller-supplied `locale` and `currencyCode`.
 *
 * **Formatting Rules**:
 * - Style: `"currency"`
 * - Fraction digits: 0–2 (whole amounts print without decimals)
 * - Additional `Intl.NumberFormatOptions` passed through `options` override these defaults
 *
 * @param possibleAmount - The numeric value to format.
 * @param options - Formatting configuration (currencyCode, locale, and optional Intl.NumberFormat overrides).
 * @returns A formatted currency string with the appropriate symbol and formatting.
 *
 * @example
 * // Returns "$123.45"
 * formatCurrency(123.45, {currencyCode: "USD", locale: "en-US"});
 *
 * @example
 * // Returns "100 €"
 * formatCurrency(100, {currencyCode: "EUR", locale: "de-DE"});
 *
 * @example
 * // Returns "£50"
 * formatCurrency(50, {currencyCode: "GBP", locale: "en-GB"});
 */
export function formatCurrency(possibleAmount: number, options: FormatCurrencyOptions): string {
  const formatOptions: Intl.NumberFormatOptions = {
    style: "currency",
    currency: options.currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  };

  const value = new Intl.NumberFormat(options.locale, formatOptions).format(possibleAmount);
  return value;
}
```

### Example 2: OpenTelemetry Type Definitions

**File**: `src/instrumentation.server.ts`

```typescript
/**
 * Log levels for structured logging.
 * @remarks
 * - `info`: Informational messages about normal application operation
 * - `warn`: Warning messages for potentially harmful situations
 * - `error`: Error messages for serious problems and failures
 * - `debug`: Detailed debug information (development only)
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Rendering context for Next.js operations.
 * @remarks
 * - `server`: Server-side rendering (SSR) or server components
 * - `client`: Client-side rendering (CSR) after hydration
 * - `edge`: Edge runtime (middleware, edge functions)
 * - `api`: Backend-for-Frontend API routes
 */
export type RenderContext = "server" | "client" | "edge" | "api";

/**
 * Standard semantic attribute keys for HTTP operations.
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

  /**
   * HTTP request target (path + query string)
   */
  "http.target"?: string;

  /**
   * Server address (host)
   */
  "server.address"?: string;

  /**
   * Client IP address
   */
  "client.address"?: string;

  /**
   * User agent string
   */
  "http.user_agent"?: string;
}
```

### Example 3: Context Provider with Lifecycle Docs

**File**: `src/contexts/FontContext.tsx` (excerpt; the code matches the source, while the source JSDoc is more detailed than the comments
shown here)

````typescript
"use client";

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
 * - Client-side: Reads the stored preference in the lazy `useState` initializer on the first client render
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
````

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
- Generates a Markdown API reference (via `typedoc-plugin-markdown`) into the git-ignored `sites/docs.arolariu.ro/_generated/ts-reference/`
  folder, which the docs site renders under `/reference/typescript`
- Supports Markdown in JSDoc comments
- Cross-references resolve automatically

**Configuration** (`typedoc.website.json`, abridged):

```json
{
  "$schema": "https://typedoc.org/schema.json",
  "entryPoints": ["sites/arolariu.ro/src"],
  "entryPointStrategy": "expand",
  "tsconfig": "sites/arolariu.ro/tsconfig.typedoc.json",
  "out": "sites/docs.arolariu.ro/_generated/ts-reference/website",
  "plugin": ["typedoc-plugin-markdown"],
  "readme": "none",
  "excludeExternals": true,
  "sort": ["source-order"]
}
```

`typedoc.components.json` uses the same options with `packages/components/src`, `packages/components/tsconfig.typedoc.json`, and the output
folder `sites/docs.arolariu.ro/_generated/ts-reference/components`. Both configurations exclude declaration, test, and story files.
`sites/arolariu.ro/tsconfig.typedoc.json` also excludes `src/app/**` and several client components (including `src/components/Footer.tsx`
and `src/components/Header.tsx`) from the TypeDoc program.

**Generation Command**:

```bash
npm run docs:typedoc # runs both commands below
npm run docs:typedoc:website
npm run docs:typedoc:components
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

### 4. ESLint JSDoc Validation (not implemented)

**Current State**:

- JSDoc is not lint-enforced: `eslint-plugin-jsdoc` is not installed or configured in `eslint.config.ts`, and no `jsdoc/*` rules are enabled
- The only documentation-comment rule in `eslint.config.ts` turns off `unicorn/no-asterisk-prefix-in-documentation-comments`, so standard
  `*`-prefixed JSDoc blocks are allowed

**Not configured** (rules originally described by this RFC; using them would require adding the `eslint-plugin-jsdoc` dependency):

```typescript
import jsdoc from "eslint-plugin-jsdoc";

export default [
  {
    plugins: {jsdoc},
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
  },
];
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
 * **Execution Context**: Browser-callable Server Action implemented on the server.
 *
 * **Authentication**: Derives the current identity server-side and enforces
 * resource authorization independently.
 *
 * **Validation**: Treats form data as untrusted and validates it before transport.
 *
 * **Error Handling**: Returns the established typed success/error result.
 *
 * **Side Effects**: Performs the documented API mutation and records bounded telemetry.
 *
 * @param formData - Browser-controlled invoice form data.
 * @returns A typed success/error result for the saved invoice.
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
export async function fetchInvoice(id: string): Promise<Invoice> {}
```

**Good**:

```typescript
/**
 * Server action that fetches a single invoice for the authenticated user.
 *
 * @remarks
 * **Execution Context**: Browser-callable RPC implemented on the server.
 * **Authentication**: Derives the current identity/token server-side and
 * enforces invoice ownership or sharing.
 * **Caching**: Uses the current no-store authenticated transport contract.
 *
 * @param input - Browser-controlled input validated by the action.
 * @param input.invoiceId - The UUID of the invoice to fetch.
 * @returns A typed success/error result containing the invoice when accessible.
 */
export async function fetchInvoice(input: Readonly<{invoiceId: string}>): ServerActionResult<Readonly<Invoice>> {}
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
export default function Layout() {}
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
export default async function Layout(props: LayoutProps) {}
```

### ❌ Anti-Pattern 4: Implementation Details in Summary

**Bad**:

```typescript
/**
 * Uses Intl.NumberFormat to format a number as currency using the caller-supplied
 * locale and currency code, with zero to two fraction digits.
 */
```

**Good**:

```typescript
/**
 * Formats a numeric amount as a localized currency string.
 *
 * @remarks
 * **Implementation**: Uses `Intl.NumberFormat` with the caller-supplied locale and currency code.
 */
```

### ❌ Anti-Pattern 5: Outdated Documentation

**Bad** (code changed, docs didn't):

```typescript
/**
 * Fetches all invoices.
 */
export async function getInvoices(userId: string) {} // NOW: User-scoped
```

**Good**:

```typescript
/**
 * Fetches all invoices for a specific user.
 *
 * @param userId - User identifier used to scope invoice query
 * @returns Array of invoices owned by the user. Empty array if none found.
 */
export async function getInvoices(userId: string) {}
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
- [ ] Props documented: application components may rely on a TypeScript props interface; `@arolariu/components` props follow
      [Package prop documentation](#package-prop-documentation) (a description on every public prop the package declares or re-declares and
      `@default` on every such defaulted optional prop, whether in an interface or a type alias; pass-through props excepted)
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

The arolariu.ro frontend codebase employs a **comprehensive, framework-aware JSDoc/TSDoc standard** that transforms TypeScript code into
self-documenting, educational material. This documentation serves as:

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

This standard ensures that every piece of TypeScript/React code is **self-documenting, contextually rich, and pedagogically
valuable**—transforming the frontend codebase into a **living technical manual** that teaches Next.js/React patterns while it functions.

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

**Document Version**: 1.1.0 **Last Updated**: 2026-11-17 **Maintainer**: Alexandru Olariu ([@arolariu](https://github.com/arolariu))
