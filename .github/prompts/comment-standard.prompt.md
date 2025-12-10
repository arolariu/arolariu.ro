---
name: "comment-documentation-standard"
description: "Analyzes, validates, and generates comprehensive documentation comments for TypeScript/React (JSDoc) and C# (XML) following RFC 1002 and RFC 2004 standards."
---

# Comment Documentation Standard Checker and Generator

## Purpose

This prompt analyzes source code files for documentation comments, validates them against the arolariu.ro documentation standards, and generates or updates comments to align with established patterns.

**Standards:**
- **TypeScript/React**: RFC 1002 (Comprehensive JSDoc/TSDoc Documentation Standard)
- **C#/.NET**: RFC 2004 (Comprehensive XML Documentation Standard)

**Reference Files:**
- **Frontend Guide**: `/docs/frontend/jsdoc-guide.md`
- **Backend Guide**: `/docs/backend/README.md`
- **RFC 1002**: `/docs/rfc/1002-comprehensive-jsdoc-documentation-standard.md`
- **RFC 2004**: `/docs/rfc/2004-comprehensive-xml-documentation-standard.md`

---

## Core Instructions

When invoked with source code files:

1. **Identify file type** (TypeScript/TSX/JavaScript or C#)
2. **Analyze existing comments** against the appropriate RFC standard
3. **Validate completeness**: Check for missing tags, insufficient detail, outdated information
4. **Generate or update** comprehensive comments following the templates below
5. **Preserve code functionality** - only modify comments, never alter logic

---

# Part 1: TypeScript/React Documentation (RFC 1002)

## Required JSDoc Tags

- **Summary line** (first line) - One-sentence description (max 80 chars)
- **@param** - For all function/method parameters
- **@returns** - For all non-void functions
- **@remarks** - For detailed explanations (WHY, not just WHAT)
- **@example** - For non-trivial usage examples

## Optional but Recommended

- **@fileoverview** / **@module** - For file-level documentation (always include for new files)
- **@see** - Cross-references to related code
- **@throws** - For error conditions
- **@template** - For generic type parameters
- **@deprecated** - For deprecated code

## File-Level Documentation (Required for New Files)

```typescript
/**
 * @fileoverview Brief description of the file's purpose
 * @module module/path
 *
 * @remarks
 * Detailed explanation of:
 * - What this module provides
 * - Key exports and their purposes
 * - Usage patterns
 *
 * @see {@link RelatedModule}
 */
```

## JSDoc Structure Template

```typescript
/**
 * One-sentence description of what this does (80 chars max).
 *
 * @remarks
 * Multi-paragraph detailed explanation:
 * - Why does this exist?
 * - What problem does it solve?
 * - What are the design trade-offs?
 *
 * **Key Characteristics:**
 * - Performance considerations
 * - Framework-specific behavior (SSR, CSR, edge)
 * - Thread-safety or mutability concerns
 *
 * **Usage Context:**
 * - When should this be used?
 * - When should it NOT be used?
 *
 * @param paramName - Description with constraints and valid values
 * @returns Description of return value, nullability, edge cases
 *
 * @example
 * ```typescript
 * const result = myFunction(validInput);
 * ```
 *
 * @see {@link RelatedType}
 */
export function myFunction(paramName: string): ReturnType {
  // Implementation
}
```

## React Server Components

```typescript
/**
 * Displays the invoice dashboard with real-time updates.
 *
 * @remarks
 * **Rendering Context**: Server Component (default in Next.js App Router).
 *
 * **Async Component**: Can use `await` for direct data fetching.
 *
 * **Data Fetching**: Fetches invoices directly without client-side API calls.
 *
 * @param props - Component properties
 * @returns Server-rendered dashboard JSX
 *
 * @example
 * ```tsx
 * <InvoiceDashboard userId="123" />
 * ```
 */
export async function InvoiceDashboard(props: Props): Promise<React.JSX.Element> {
  // Implementation
}
```

## React Client Components

```typescript
"use client";

/**
 * Interactive invoice filter with real-time search.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` required).
 *
 * **Why Client Component?**
 * - Uses useState for search term
 * - Requires onClick handlers
 * - Needs immediate user feedback
 *
 * @param props - Filter configuration
 * @returns Interactive filter UI
 */
export function InvoiceFilter(props: Props): React.JSX.Element {
  // Implementation
}
```

## Server Actions

```typescript
"use server";

/**
 * Server action that fetches a single invoice for a user.
 *
 * @remarks
 * **Execution Context**: Server-side only (Next.js server action).
 *
 * **Authentication**: Requires valid JWT token in authToken parameter.
 *
 * **Side Effects**: Makes authenticated API call to backend REST endpoint.
 *
 * **Error Handling**: Throws error on non-OK response or network failure.
 *
 * @param id - The UUID of the invoice. Must be a valid UUIDv4 string.
 * @param authToken - JWT token for API authorization header.
 * @returns Promise resolving to the invoice, or throws an error.
 */
export async function fetchInvoice(id: string, authToken: string): Promise<Invoice> {
  // Implementation
}
```

## Custom Hooks

```typescript
/**
 * Manages invoice selection state with multi-select support.
 *
 * @remarks
 * Provides:
 * - Select/deselect individual invoices
 * - Select/deselect all invoices
 * - Persistent selection across re-renders
 *
 * **Performance**: Uses useCallback to prevent unnecessary re-renders.
 *
 * @param invoiceIds - Available invoice IDs
 * @returns Selection state and control functions
 *
 * @example
 * ```typescript
 * const { selected, toggleSelection, selectAll } = useInvoiceSelection(ids);
 * ```
 */
export function useInvoiceSelection(invoiceIds: string[]): SelectionState {
  // Implementation
}
```

## Zustand Stores

```typescript
/**
 * @fileoverview Zustand store for invoice state management with IndexedDB persistence.
 * @module stores/invoicesStore
 *
 * @remarks
 * **State Management Pattern**: Zustand with persist middleware.
 *
 * **Persistence**: Uses IndexedDB for client-side storage via custom storage adapter.
 *
 * **Key Features:**
 * - CRUD operations for invoices
 * - Selection state management
 * - Filtering and sorting utilities
 * - Hydration handling for SSR compatibility
 *
 * @see {@link useInvoice} - Hook for single invoice operations
 * @see {@link useInvoices} - Hook for list operations
 */

import {create} from "zustand";
import {persist} from "zustand/middleware";

/**
 * Invoice store state and actions interface.
 *
 * @remarks
 * **Immutability**: All state updates create new references.
 *
 * **Selectors**: Use `useInvoicesStore.getState()` for non-reactive access.
 */
interface InvoicesStoreState {
  /** All loaded invoices */
  invoices: Invoice[];
  /** Currently selected invoices for batch operations */
  selectedInvoices: Invoice[];
  /** Sets all invoices, replacing existing state */
  setInvoices: (invoices: Invoice[]) => void;
  /** Upserts a single invoice by ID */
  upsertInvoice: (invoice: Invoice) => void;
}

export const useInvoicesStore = create<InvoicesStoreState>()(
  persist(
    (set) => ({
      invoices: [],
      selectedInvoices: [],
      setInvoices: (invoices) => set({invoices}),
      upsertInvoice: (invoice) =>
        set((state) => ({
          invoices: state.invoices.some((i) => i.id === invoice.id)
            ? state.invoices.map((i) => (i.id === invoice.id ? invoice : i))
            : [...state.invoices, invoice],
        })),
    }),
    {name: "invoices-storage"}
  )
);
```

## Type Definitions

```typescript
/**
 * Represents an invoice in the system.
 *
 * @remarks
 * **Domain Concept**: Aggregate root in the invoices bounded context.
 *
 * **Immutability**: ID is immutable after creation.
 *
 * **Validation**: All monetary values must be non-negative.
 *
 * @example
 * ```typescript
 * const invoice: Invoice = {
 *   id: "uuid-here",
 *   merchantId: "merchant-uuid",
 *   totalAmount: 123.45,
 *   currency: Currency.USD,
 *   items: []
 * };
 * ```
 */
export interface Invoice {
  id: string;
  merchantId: string;
  totalAmount: number;
  currency: Currency;
  items: Product[];
}
```

---

# Part 2: C# Documentation (RFC 2004)

## Required XML Tags

- **`<summary>`** - One-sentence description (max 80 chars)
- **`<remarks>`** - Detailed multi-paragraph explanation
- **`<param>`** - For all method parameters
- **`<returns>`** - For all non-void methods
- **`<exception>`** - For all thrown exceptions

## Optional but Recommended

- **`<example>`** with **`<code>`** - Usage examples
- **`<see cref="">`** - Cross-references
- **`<seealso cref="">`** - Related types
- **`<value>`** - For properties
- **`<para>`** - For paragraph structure in remarks
- **`<list type="bullet">`** - For bullet points

## XML Documentation Template

```csharp
/// <summary>
/// One-sentence description of what this element does (80 characters max).
/// </summary>
/// <remarks>
/// <para>
/// First paragraph: High-level context. Why does this exist?
/// </para>
/// <para>
/// <b>Key Characteristic:</b> Thread-safety, mutability, idempotency.
/// </para>
/// <para>
/// <b>Usage Context:</b> When should this be used? When NOT?
/// </para>
/// <para>
/// <b>Design Rationale:</b> Why designed this way? What trade-offs?
/// </para>
/// <para>
/// <b>Architecture Alignment:</b> DDD, The Standard, overall architecture.
/// </para>
/// </remarks>
/// <param name="paramName">
/// What is this parameter? Valid values? What if null/invalid?
/// </param>
/// <returns>
/// What is returned? When is null? Edge cases?
/// </returns>
/// <exception cref="ExceptionType">
/// When thrown? What causes it? How to handle?
/// </exception>
/// <example>
/// <code>
/// // Real working code showing typical usage
/// var result = MyMethod(validInput);
/// </code>
/// </example>
/// <seealso cref="RelatedType"/>
public ReturnType MyMethod(ParameterType paramName)
{
    // Implementation
}
```

## Class Documentation

```csharp
/// <summary>
/// Represents the main entry point for the arolariu.ro backend API.
/// </summary>
/// <remarks>
/// <para>
/// The application follows a modular monolith architecture with domains:
/// - General domain: Core infrastructure and cross-cutting concerns
/// - Invoices domain: Business logic for invoice management
/// - Authentication domain: User authentication services
/// </para>
/// <para>
/// <b>Deployment:</b> Designed for containerized deployment on Azure.
/// </para>
/// <para>
/// <b>Configuration Phases:</b>
/// <list type="number">
///   <item><description>Builder: Sets up services and dependencies</description></item>
///   <item><description>Application: Configures request pipeline</description></item>
/// </list>
/// </para>
/// </remarks>
public class Program
{
    // Implementation
}
```

## Domain Entity (DDD)

```csharp
/// <summary>
/// Represents the invoice aggregate root controlling line items, merchant linkage,
/// payment details, and AI enrichment artifacts.
/// </summary>
/// <remarks>
/// <para>
/// This aggregate encapsulates the canonical mutable state of an invoice.
/// Identity (<c>id</c>) is immutable (Version 7 GUID).
/// </para>
/// <para>
/// <b>Soft Delete Lifecycle:</b> When soft-deleted, invoice and contained
/// products are marked; queries exclude unless explicitly overridden.
/// </para>
/// <para>
/// <b>Sentinel Defaults:</b> <see cref="Guid.Empty"/> for <c>UserIdentifier</c>
/// and <c>MerchantReference</c> indicate unenriched state.
/// </para>
/// <para>
/// <b>Thread-safety:</b> Not thread-safe. Do not share across threads without
/// external synchronization.
/// </para>
/// </remarks>
public sealed class Invoice : NamedEntity<Guid>
{
    // Implementation
}
```

## Method Documentation

```csharp
/// <summary>
/// Persists a new invoice aggregate to the data store with validation.
/// </summary>
/// <remarks>
/// <para>
/// <b>Validation:</b> Ensures non-null identifier, non-negative monetary values,
/// and required fields before persistence.
/// </para>
/// <para>
/// <b>Side Effects:</b> Emits telemetry span for database operation.
/// </para>
/// <para>
/// <b>Idempotency:</b> Not idempotent. Multiple calls create duplicates.
/// </para>
/// </remarks>
/// <param name="invoice">
/// Fully populated invoice aggregate with required fields (id, UserIdentifier, Items).
/// Must not be null.
/// </param>
/// <returns>
/// Task that completes when invoice has been persisted.
/// Throws exceptions on validation or dependency failures.
/// </returns>
/// <exception cref="ArgumentNullException">
/// Thrown when <paramref name="invoice"/> is null.
/// </exception>
/// <exception cref="InvoiceValidationException">
/// Thrown when invoice fails domain validation rules.
/// </exception>
public async Task CreateInvoiceAsync(Invoice invoice)
{
    // Implementation
}
```

---

# Part 3: Analysis and Update Process

## Step 1: Analyze Existing Comments

For each code element:

1. **Check if comments exist**
2. **Validate against standard:**
   - Is summary present and concise (≤80 chars)?
   - Are all @param/@returns/`<param>`/`<returns>` tags present?
   - Is @remarks/`<remarks>` explaining WHY, not just WHAT?
   - Are examples provided for non-trivial code?
3. **Identify gaps:**
   - Missing tags
   - Insufficient detail
   - Outdated information
   - Poor formatting

## Step 2: Generate Missing Comments

When no comments exist:

1. **Analyze the code:**
   - Understand purpose and behavior
   - Identify parameters, return values, exceptions
   - Determine rendering context (React components)
   - Identify architectural patterns (DDD, The Standard)

2. **Generate comprehensive documentation:**
   - Concise summary
   - Detailed remarks explaining context
   - All parameters with constraints
   - Return values and edge cases
   - Realistic examples
   - Cross-references

## Step 3: Update Inadequate Comments

When comments exist but are inadequate:

1. **Preserve accurate information**
2. **Enhance with missing details:**
   - Add missing tags
   - Expand remarks with context
   - Add examples if missing
   - Improve clarity and specificity
3. **Fix inaccuracies** if code changed

---

# Part 4: Quality Guidelines

## ✅ Do This

- **Write for multiple audiences**: developers, API consumers, learners
- **Explain WHY, not just WHAT**: TypeScript/C# already shows what
- **Use concrete examples**: Real code snippets, not toy examples
- **Be specific**: "Valid UUIDv4 string" not "ID string"
- **Document trade-offs**: Performance, immutability, etc.
- **Cross-reference liberally**: Link to types, RFCs, external docs
- **Update when code changes**: Treat as first-class code

## ❌ Don't Do This

- **Don't repeat obvious info**: `@param id - The id` is useless
- **Don't document implementation**: Focus on public API
- **Don't use vague language**: "Handles data" tells nothing
- **Don't forget edge cases**: When is null returned? What errors?
- **Don't skip examples**: Complex APIs need demonstrations
- **Don't let comments become stale**: Outdated docs worse than no docs

---

# Part 5: Anti-Patterns to Avoid

## ❌ Obvious Comments (TypeScript)

```typescript
/**
 * Gets the user.
 * @param userId - The user ID
 * @returns The user
 */
function getUser(userId: string): User { }
```

## ✅ Contextual Comments (TypeScript)

```typescript
/**
 * Fetches user with cached profile data.
 *
 * @remarks
 * - Cached for 5 minutes via React Cache
 * - Includes related invoices (eager loading)
 * - Returns null for deleted accounts
 *
 * @param userId - UUID of user to fetch
 * @returns User with profile, or null if not found
 */
async function getUser(userId: string): Promise<User | null> { }
```

## ❌ Repeating Signature (C#)

```csharp
/// <summary>
/// Creates an invoice.
/// </summary>
/// <param name="invoice">Invoice</param>
public void CreateInvoice(Invoice invoice) { }
```

## ✅ Explaining Context (C#)

```csharp
/// <summary>
/// Persists a new invoice aggregate to the data store with validation.
/// </summary>
/// <param name="invoice">
/// Fully populated invoice aggregate with required fields (id, UserIdentifier, Items).
/// Must not be null.
/// </param>
/// <exception cref="ArgumentNullException">When invoice is null.</exception>
public void CreateInvoice(Invoice invoice) { }
```

---

# Part 6: Documentation Checklist

## For Every Function/Method

- [ ] Summary line present and concise (≤80 chars)
- [ ] @remarks/`<remarks>` explains purpose and context
- [ ] All @param/`<param>` tags present with constraints
- [ ] @returns/`<returns>` explains return value and edge cases
- [ ] @example/`<example>` provided for non-obvious usage
- [ ] Cross-references added (@see/`<see cref="">`)
- [ ] Error conditions documented (@throws/`<exception>`)

## For React Components

- [ ] Component purpose documented
- [ ] Rendering context specified (Server/Client/Edge)
- [ ] Props documented
- [ ] Dependencies documented (context providers, hooks)
- [ ] Performance considerations (memoization, dynamic imports)
- [ ] Example showing typical JSX usage

## For C# Classes

- [ ] Class purpose and architectural context documented
- [ ] Thread-safety documented
- [ ] Mutability documented
- [ ] Design trade-offs explained
- [ ] References to related RFCs or patterns (DDD, The Standard)
- [ ] Example provided for complex types

---

# Part 7: Usage Instructions

When invoked with source files:

1. **Identify file type** (TypeScript/React or C#)
2. **Analyze existing comments** against appropriate standard
3. **Generate comprehensive comments** for undocumented code
4. **Update inadequate comments** to meet quality standards
5. **Preserve all code logic** - only modify comments
6. **Output updated file** with improved documentation

---

## References

- **RFC 1002**: Comprehensive JSDoc/TSDoc Documentation Standard (TypeScript/React)
- **RFC 2004**: Comprehensive XML Documentation Standard (C#)
- **Frontend JSDoc Guide**: `/docs/frontend/jsdoc-guide.md`
- **Backend Documentation**: `/docs/backend/README.md`
- **Copilot Instructions**: `/.github/copilot-instructions.md`

---

## Final Notes

This prompt should be invoked:

- **During code reviews** - Validate comment quality
- **Before committing** - Ensure new code is documented
- **During refactoring** - Update comments to match changes
- **For legacy code** - Add missing documentation

**Goal**: Production-grade, tutorial-level documentation that transforms the codebase into a living technical manual.
