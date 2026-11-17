# JSDoc Documentation Guide

## Quick Reference for RFC 1002: Comprehensive JSDoc/TSDoc Documentation Standard

This guide provides practical examples for documenting TypeScript/React code in the arolariu.ro frontend.

## Quick Start

### Basic JSDoc Structure

Every public function, component, and type should have JSDoc:

````typescript
/**
 * One-sentence summary (80 chars max).
 *
 * @remarks
 * Detailed explanation with context.
 *
 * @param paramName - Description
 * @returns Description of return value
 *
 * @example
 * ```typescript
 * const result = myFunction('value');
 * ```
 */
````

### Module Headers

Major modules also start with a file-level header (RFC 1002):

```typescript
/**
 * @fileoverview Generic utilities and environment-derived constants.
 * @module sites/arolariu.ro/src/lib/utils.generic
 */
```

## Common Patterns

### React Server Components

````typescript
/**
 * Displays the user's invoice dashboard with real-time updates.
 *
 * @remarks
 * This is a React Server Component that fetches data directly.
 * No client-side JavaScript is shipped for this component.
 * `fetchInvoices()` derives the user's identity on the server, so no user ID is passed in.
 *
 * @returns Server-rendered invoice dashboard
 *
 * @example
 * ```tsx
 * export default async function Page() {
 *   return <InvoiceDashboard />;
 * }
 * ```
 */
export async function InvoiceDashboard(): Promise<React.JSX.Element> {
  const result = await fetchInvoices();
  return <div>{/* ... */}</div>;
}
````

### React Client Components

````typescript
"use client";

/**
 * Interactive invoice filter with real-time search and sorting.
 *
 * @remarks
 * This is a Client Component due to:
 * - Uses useState for search term
 * - Requires onClick handlers
 * - Needs immediate user feedback
 *
 * @param props - Filter configuration
 * @returns Interactive filter UI
 *
 * @example
 * ```tsx
 * <InvoiceFilter onFilterChange={handleFilter} />
 * ```
 */
export function InvoiceFilter(props: FilterProps): React.JSX.Element {
  const [searchTerm, setSearchTerm] = useState("");
  // ...
}
````

### Custom Hooks

````typescript
/**
 * Manages invoice selection state with multi-select support.
 *
 * @remarks
 * Provides:
 * - Select/deselect individual invoices
 * - Select/deselect all invoices
 * - Persistent selection across re-renders
 *
 * @param invoiceIds - Available invoice IDs
 * @returns Selection state and control functions
 *
 * @example
 * ```typescript
 * const {selectedIds, toggleSelection, selectAll} = useInvoiceSelection(ids);
 * ```
 */
export function useInvoiceSelection(invoiceIds: string[]): SelectionState {
  // ...
}
````

### Server Actions

````typescript
"use server";

/**
 * Replaces an invoice with a complete updated payload.
 *
 * @remarks
 * This is a Server Action that:
 * - Is implemented on the server but exposed as browser-callable RPC
 * - Validates untrusted input
 * - Derives identity and authorization on the server
 * - Returns a type-safe result object instead of throwing
 *
 * @param input - The invoice ID and complete invoice object.
 * @param input.invoiceId - UUIDv4 of the invoice to replace.
 * @param input.invoice - Complete invoice payload that replaces the existing resource.
 * @returns A result object containing the updated invoice, or an error result when validation, authorization, or the backend request fails.
 *
 * @example
 * ```typescript
 * const result = await updateInvoice({invoiceId: invoice.id, invoice: updatedInvoice});
 * if (result.success) {
 *   toast.success("Invoice updated!");
 * }
 * ```
 */
export async function updateInvoice({invoiceId, invoice}: ServerActionInputType): ServerActionOutputType {
  // ...
}
````

### Utility Functions

````typescript
/**
 * Formats a number as currency with locale support.
 *
 * @remarks
 * - Uses Intl.NumberFormat for locale-aware formatting
 * - Handles zero, negative, and large numbers correctly
 *
 * @param possibleAmount - Numeric amount to format
 * @param options - ISO 4217 `currencyCode`, BCP 47 `locale`, and optional `Intl.NumberFormatOptions` overrides
 * @returns Formatted currency string (e.g., "$1,234.56")
 *
 * @example
 * ```typescript
 * formatCurrency(1234.56, {currencyCode: "USD", locale: "en-US"}); // "$1,234.56"
 * formatCurrency(1234.56, {currencyCode: "EUR", locale: "de-DE"}); // "1.234,56 €"
 * ```
 */
export function formatCurrency(possibleAmount: number, options: FormatCurrencyOptions): string {
  // ...
}
````

### Type Definitions

````typescript
/**
 * Represents a user invoice with payment and item details.
 *
 * @remarks
 * Domain Model:
 * - Aggregate root of the invoices bounded context
 * - Invoices stay editable after creation (`updateInvoice`, `patchInvoice`)
 * - The total is stored in `paymentInformation.totalCostAmount`
 * - Payment information is always present
 *
 * @example
 * ```typescript
 * const total = invoice.paymentInformation.totalCostAmount;
 * const paidByCard = invoice.paymentInformation.paymentType === PaymentType.Card;
 * ```
 */
export interface Invoice extends NamedEntity<string> {
  // id, name, description, and audit fields are inherited from NamedEntity.

  /** Reference identifier (GUIDv4) of the merchant that issued the invoice */
  merchantReference: string;

  /** Line items present on the invoice */
  items: Product[];

  /** Payment details, including the total cost and payment type */
  paymentInformation: PaymentInformation;

  // userIdentifier, sharedWith, scans, and the remaining fields are omitted here.
}
````

### Context Providers

````typescript
"use client";

/**
 * Provides application-wide font selection (normal or dyslexic-friendly) to the component tree.
 *
 * @remarks
 * Implementation:
 * - Persists the font preference to localStorage
 * - Syncs the preference across tabs via storage events
 * - Applies the selected font class to `document.documentElement`
 * - Memoizes the context value to prevent unnecessary re-renders
 *
 * @param props - Component props
 * @param props.children - Child components to receive font context
 * @returns Provider component wrapping children with font context
 *
 * @example
 * ```tsx
 * <FontContextProvider>
 *   <App />
 * </FontContextProvider>
 * ```
 *
 * @see {@link useFontContext} for consuming the context
 */
export function FontContextProvider({children}: Readonly<{children: React.ReactNode}>): React.JSX.Element {
  // ...
}
````

## Essential Tags

### @remarks - Detailed Explanation

Use for multi-paragraph context, design decisions, trade-offs:

```typescript
/**
 * Lazy-loads the invoice chart component.
 *
 * @remarks
 * Performance Optimization:
 * - Reduces initial bundle size by ~150KB
 * - Chart only loads when user clicks "View Analytics"
 * - Uses React.lazy() with Suspense boundary
 * - Shows skeleton loader during chunk download
 *
 * Trade-offs:
 * - Adds ~200ms delay on first chart view
 * - Worth it: only 15% of users view analytics
 */
const InvoiceChart = lazy(() => import("./InvoiceChart"));
```

### @param - Parameter Documentation

Include type, purpose, constraints, defaults:

```typescript
/**
 * Filters invoices by date range and merchant.
 *
 * @param invoices - Array of invoices to filter (must not be empty)
 * @param startDate - Filter start date (inclusive, ISO 8601 format)
 * @param endDate - Filter end date (inclusive, defaults to today)
 * @param merchantId - Optional merchant filter (undefined = all merchants)
 * @returns Filtered invoice array (may be empty)
 */
function filterInvoices(
  invoices: Invoice[],
  startDate: string,
  endDate: string = new Date().toISOString(),
  merchantId?: string,
): Invoice[] {
  // ...
}
```

### @returns - Return Value Documentation

Explain what's returned, when undefined/null, edge cases:

```typescript
/**
 * Fetches user invoice by ID.
 *
 * @param invoiceId - Invoice identifier
 * @returns Invoice object if found, null if not found
 *
 * @throws {AuthenticationError} If user is not logged in
 * @throws {NetworkError} If API request fails
 */
async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  // ...
}
```

### @example - Usage Examples

Show realistic code samples:

````typescript
/**
 * Debounces a function to limit execution rate.
 *
 * @example
 * Basic usage:
 * ```typescript
 * const debouncedSearch = debounce((term: string) => {
 *   console.log("Searching for:", term);
 * }, 300);
 *
 * debouncedSearch("hello"); // Waits 300ms before logging
 * ```
 *
 * @example
 * With React state:
 * ```typescript
 * const handleSearch = debounce((term: string) => {
 *   setSearchResults(performSearch(term));
 * }, 500);
 *
 * <input onChange={(e) => handleSearch(e.target.value)} />
 * ```
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(func: T, wait: number): (...args: Parameters<T>) => void {
  // ...
}
````

### @see - Cross-References

Link to related code, RFCs, external docs. Use `{@link}` for symbols and URLs, and cite RFCs as plain text:

```typescript
/**
 * Creates optimized metadata for SEO and social sharing.
 *
 * @see RFC 1004 - Metadata and SEO System
 * @see {@link https://nextjs.org/docs/app/api-reference/functions/generate-metadata} Next.js Metadata API
 * @see {@link metadata} for base metadata configuration
 */
export const createMetadata = (partialMetadata: PartialMetadata = {}): Readonly<Metadata> => {
  // ...
};
```

## Documentation Checklist

Before committing, verify:

- [ ] All public functions have JSDoc
- [ ] JSDoc includes one-sentence summary
- [ ] Complex logic has @remarks explaining "why"
- [ ] All parameters documented with @param
- [ ] Return values documented with @returns
- [ ] At least one @example for non-trivial functions
- [ ] Client Components explain why they're client-side
- [ ] Server Actions document side effects (revalidation, etc.)
- [ ] Error conditions documented with @throws
- [ ] Related code referenced with @see

## Anti-Patterns to Avoid

### ❌ Don't: Obvious Comments

```typescript
/**
 * Gets the user.
 * @param userId - The user ID
 * @returns The user
 */
function getUser(userId: string): User {}
```

### ✅ Do: Add Context

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
async function getUser(userId: string): Promise<User | null> {}
```

### ❌ Don't: Document Implementation Details

```typescript
/**
 * Uses useState to track the count value and setCount to update it.
 */
const [count, setCount] = useState(0);
```

### ✅ Do: Document Purpose

```typescript
/**
 * Tracks number of selected invoices for bulk actions.
 */
const [selectedCount, setSelectedCount] = useState(0);
```

## Quick Reference

| Code Element         | Required Tags                       | Optional Tags                     |
| -------------------- | ----------------------------------- | --------------------------------- |
| Function             | Summary, `@param`, `@returns`       | `@remarks`, `@example`, `@throws` |
| React Component      | Summary, `@param props`, `@returns` | `@remarks`, `@example`            |
| Custom Hook          | Summary, `@param`, `@returns`       | `@remarks`, `@example`            |
| Server Action        | Summary, `@param`, `@returns`       | `@remarks`, `@throws`, `@example` |
| Type/Interface       | Summary, field comments             | `@remarks`, `@example`            |
| Utility              | Summary, `@param`, `@returns`       | `@remarks`, `@example`, `@see`    |
| Module (file header) | `@fileoverview`, `@module`          | `@remarks`, `@see`                |

## Publication

`npm run build:docs` and `npm run dev:docs` first run the docs site's `assemble` target (`npm run docs:assemble`). It runs TypeDoc with
`typedoc.website.json`, also available alone as `npm run docs:typedoc:website`. TypeDoc reads `sites/arolariu.ro/src` through
`sites/arolariu.ro/tsconfig.typedoc.json` and writes Markdown to `sites/docs.arolariu.ro/_generated/ts-reference/website`. That tsconfig
excludes tests, stories, generated code, `src/app/**`, and several layout components, so JSDoc in those files is not published.

## Additional Resources

- **[RFC 1002](../rfc/1002-comprehensive-jsdoc-documentation-standard.md)**: Full JSDoc standard documentation
- **TypeScript TSDoc**: <https://tsdoc.org/>
- **JSDoc Reference**: <https://jsdoc.app/>
- **VS Code IntelliSense**: <https://code.visualstudio.com/docs/languages/typescript>
