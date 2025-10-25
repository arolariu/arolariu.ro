# JSDoc Documentation Guide

## Quick Reference for RFC 1002: Comprehensive JSDoc/TSDoc Documentation Standard

This guide provides practical examples for documenting TypeScript/React code in the arolariu.ro frontend.

## Quick Start

### Basic JSDoc Structure

Every public function, component, and type should have JSDoc:

```typescript
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
```

## Common Patterns

### React Server Components

```typescript
/**
 * Displays the user's invoice dashboard with real-time updates.
 *
 * @remarks
 * This is a React Server Component that fetches data directly.
 * No client-side JavaScript is shipped for this component.
 * 
 * @param props - Component properties
 * @returns Server-rendered invoice dashboard
 * 
 * @example
 * ```tsx
 * export default async function Page() {
 *   return <InvoiceDashboard userId="123" />;
 * }
 * ```
 */
export async function InvoiceDashboard(props: DashboardProps): Promise<React.JSX.Element> {
  const data = await fetchInvoices(props.userId);
  return <div>{/* ... */}</div>;
}
```

### React Client Components

```typescript
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
```

### Custom Hooks

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
```

### Server Actions

```typescript
"use server";

/**
 * Updates an invoice and revalidates the cache.
 *
 * @remarks
 * This is a Server Action that:
 * - Runs only on the server (never exposed to client)
 * - Validates user permissions
 * - Revalidates the /invoices path
 * - Returns type-safe result
 * 
 * @param formData - Form data containing invoice fields
 * @returns Success/error result with updated invoice
 * 
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {ValidationError} If invoice data is invalid
 * 
 * @example
 * ```typescript
 * const result = await updateInvoice(formData);
 * if (result.success) {
 *   toast.success("Invoice updated!");
 * }
 * ```
 */
export async function updateInvoice(formData: FormData): Promise<ActionResult<Invoice>> {
  // ...
}
```

### Utility Functions

```typescript
/**
 * Formats a number as currency with locale support.
 *
 * @remarks
 * - Uses Intl.NumberFormat for locale-aware formatting
 * - Falls back to USD if currency is undefined
 * - Handles zero, negative, and large numbers correctly
 * 
 * @param amount - Numeric amount to format
 * @param currency - ISO 4217 currency code (e.g., "USD", "EUR")
 * @param locale - BCP 47 locale string (defaults to "en-US")
 * @returns Formatted currency string (e.g., "$123.45")
 * 
 * @example
 * ```typescript
 * formatCurrency(1234.56, "USD", "en-US"); // "$1,234.56"
 * formatCurrency(1234.56, "EUR", "ro-RO"); // "1.234,56 €"
 * ```
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  // ...
}
```

### Type Definitions

```typescript
/**
 * Represents a user invoice with payment and item details.
 *
 * @remarks
 * Domain Model:
 * - Invoices are immutable after creation (except metadata)
 * - Total amount is computed from items (not stored separately)
 * - Payment information is optional (unpaid invoices)
 * 
 * @example
 * ```typescript
 * const invoice: Invoice = {
 *   id: "inv_123",
 *   merchantId: "mrc_456",
 *   items: [{productId: "prod_789", quantity: 2}],
 *   paymentInformation: {method: PaymentType.CARD},
 *   metadata: {tags: ["grocery"]},
 * };
 * ```
 */
export interface Invoice {
  /** Unique invoice identifier (format: inv_[a-z0-9]{10}) */
  id: string;
  
  /** Merchant who issued this invoice */
  merchantId: string;
  
  /** Line items included in this invoice */
  items: InvoiceItem[];
  
  /** Payment details (undefined if unpaid) */
  paymentInformation?: PaymentInformation;
  
  /** User-defined metadata (tags, notes, etc.) */
  metadata: InvoiceMetadata;
}
```

### Context Providers

```typescript
/**
 * Provides theme state (light/dark mode) to the component tree.
 *
 * @remarks
 * Implementation:
 * - Persists theme preference to localStorage
 * - Syncs with system preferences (prefers-color-scheme)
 * - Prevents flash of unstyled content (FOUC)
 * - Uses CSS variables for theme values
 * 
 * @param props - Provider configuration
 * @returns Theme context provider
 * 
 * @example
 * ```tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 * 
 * @see {@link useTheme} for consuming theme context
 */
export function ThemeProvider({children}: {children: React.ReactNode}): React.JSX.Element {
  // ...
}
```

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
  merchantId?: string
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

```typescript
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
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  // ...
}
```

### @see - Cross-References

Link to related code, RFCs, external docs:

```typescript
/**
 * Creates optimized metadata for SEO and social sharing.
 *
 * @see {@link RFC1004} for complete metadata architecture
 * @see {@link https://nextjs.org/docs/app/api-reference/functions/generate-metadata} Next.js Metadata API
 * @see {@link metadata} for base metadata configuration
 */
export function createMetadata(partial: PartialMetadata): Metadata {
  // ...
}
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
function getUser(userId: string): User { }
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
async function getUser(userId: string): Promise<User | null> { }
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

| Code Element | Required Tags | Optional Tags |
|--------------|---------------|---------------|
| Function | Summary, `@param`, `@returns` | `@remarks`, `@example`, `@throws` |
| React Component | Summary, `@param props`, `@returns` | `@remarks`, `@example` |
| Custom Hook | Summary, `@param`, `@returns` | `@remarks`, `@example` |
| Server Action | Summary, `@param`, `@returns` | `@remarks`, `@throws`, `@example` |
| Type/Interface | Summary, field comments | `@remarks`, `@example` |
| Utility | Summary, `@param`, `@returns` | `@remarks`, `@example`, `@see` |

## Additional Resources

- **RFC 1002**: Full JSDoc standard documentation
- **TypeScript TSDoc**: <https://tsdoc.org/>
- **JSDoc Reference**: <https://jsdoc.app/>
- **VS Code IntelliSense**: <https://code.visualstudio.com/docs/languages/typescript>
