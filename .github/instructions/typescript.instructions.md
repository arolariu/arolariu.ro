---
description: 'Guidelines for TypeScript Development targeting TypeScript 5.x and ES2022 output'
applyTo: '**/*.ts'
---

# TypeScript Development Guidelines

Comprehensive TypeScript standards for the arolariu.ro monorepo targeting TypeScript 5.9.3 with ES2022 output.

---

## 🎯 Quick Reference

| Aspect | Value |
|--------|-------|
| **TypeScript** | 5.9.3 |
| **Target** | ES2022 |
| **Module** | ESNext (bundler resolution) |
| **Strict Mode** | All options enabled |
| **JSX** | preserve (for Next.js) |
| **Node** | ≥24.x |

---

## 📚 Essential Context

| Resource | Location | Purpose |
|----------|----------|---------|
| RFC 1002 | `docs/rfc/1002-comprehensive-jsdoc-documentation-standard.md` | JSDoc standards |
| Types Directory | `sites/arolariu.ro/src/types/` | Domain type definitions |
| Root TSConfig | `tsconfig.json` | Strictest configuration |

---

## ⚙️ TypeScript Configuration

### Strictest Possible Settings

The project uses the strictest TypeScript configuration:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true
  }
}
```

### Strict Mode Implications

| Setting | Implication |
|---------|-------------|
| `noImplicitAny` | All types must be explicit |
| `strictNullChecks` | Handle `null`/`undefined` explicitly |
| `noUncheckedIndexedAccess` | Array access returns `T \| undefined` |
| `exactOptionalPropertyTypes` | `undefined` ≠ missing property |
| `noPropertyAccessFromIndexSignature` | Use bracket notation for index signatures |
| `noImplicitReturns` | All code paths must return |
| `noFallthroughCasesInSwitch` | Explicit break/return in switch |
| `verbatimModuleSyntax` | Use `import type` for types |

---

## 🚫 The `any` Prohibition

**NEVER use `any`** - this is a strict TypeScript codebase.

```typescript
// ❌ FORBIDDEN
function process(data: any): any { /* ... */ }
const result: any = fetchData();

// ✅ CORRECT - Use unknown + type guards
function process(data: unknown): ProcessedData {
  if (isValidData(data)) {
    return transform(data);
  }
  throw new Error("Invalid data format");
}

// ✅ CORRECT - Use generics
function process<T extends DataType>(data: T): ProcessedResult<T> {
  return transform(data);
}
```

---

## 📁 Type Organization

### Project Structure

```
sites/arolariu.ro/src/types/
├── index.ts              # Central exports & global types
├── typedEnv.ts           # Type-safe environment variables
├── DDD/                  # Domain-Driven Design types
│   ├── Entities/         # Base entity interfaces
│   │   ├── BaseEntity.ts
│   │   ├── NamedEntity.ts
│   │   └── AuditableEntity.ts
│   └── ValueObjects/     # Immutable value objects
└── invoices/             # Invoice domain types
    ├── Invoice.ts
    ├── Product.ts
    ├── Merchant.ts
    └── enums.ts
```

### Barrel Exports

```typescript
// types/index.ts
export type {BaseEntity, NamedEntity, AuditableEntity} from "./DDD/Entities";
export type {Invoice, InvoiceCategory, InvoiceStatus} from "./invoices";
export type {Product, ProductCategory} from "./invoices/Product";
export type {Merchant} from "./invoices/Merchant";
export type {UserInformation, NavigationItem} from "./common";
```

---

## 🏗️ Type Patterns

### Base Entity Types (DDD)

```typescript
// types/DDD/Entities/BaseEntity.ts
export interface BaseEntity<TIdentifier> {
  readonly id: TIdentifier;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// types/DDD/Entities/NamedEntity.ts
export interface NamedEntity<TIdentifier> extends BaseEntity<TIdentifier> {
  readonly name: string;
}

// types/DDD/Entities/AuditableEntity.ts
export interface AuditableEntity<TIdentifier> extends NamedEntity<TIdentifier> {
  readonly createdBy: string;
  readonly updatedBy: string;
  readonly isDeleted: boolean;
}
```

### Discriminated Unions

```typescript
// State machines with exhaustive checking
type FetchState<T> =
  | {status: "idle"}
  | {status: "loading"}
  | {status: "success"; data: T}
  | {status: "error"; error: Error};

function handleState<T>(state: FetchState<T>): ReactNode {
  switch (state.status) {
    case "idle":
      return null;
    case "loading":
      return <Spinner />;
    case "success":
      return <DataView data={state.data} />;
    case "error":
      return <ErrorView error={state.error} />;
    // TypeScript ensures exhaustiveness
  }
}

// Exhaustive check helper
function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}
```

### Branded Types

```typescript
// Prevent type confusion for domain identifiers
declare const brand: unique symbol;
type Brand<T, TBrand extends string> = T & {readonly [brand]: TBrand};

type InvoiceId = Brand<string, "InvoiceId">;
type MerchantId = Brand<string, "MerchantId">;
type UserId = Brand<string, "UserId">;

// Factory functions
function createInvoiceId(id: string): InvoiceId {
  return id as InvoiceId;
}

function createMerchantId(id: string): MerchantId {
  return id as MerchantId;
}

// Now these cannot be confused
function getInvoice(id: InvoiceId): Promise<Invoice> { /* ... */ }
function getMerchant(id: MerchantId): Promise<Merchant> { /* ... */ }

// getInvoice(merchantId); // ❌ Type error!
```

### Type Guards & Validators

```typescript
// Type guard with full runtime validation
export function isInvoice(obj: unknown): obj is Invoice {
  if (typeof obj !== "object" || obj === null) return false;
  
  const invoice = obj as Record<string, unknown>;
  return (
    typeof invoice["id"] === "string" &&
    typeof invoice["name"] === "string" &&
    typeof invoice["totalAmount"] === "number" &&
    Array.isArray(invoice["items"])
  );
}

// Assertion function
export function assertInvoice(obj: unknown): asserts obj is Invoice {
  if (!isInvoice(obj)) {
    throw new Error("Invalid invoice data");
  }
}

// Usage with noUncheckedIndexedAccess
function processInvoices(invoices: Invoice[]): void {
  const first = invoices[0]; // Type: Invoice | undefined
  
  if (first) {
    // Type: Invoice (narrowed)
    console.log(first.name);
  }
  
  // Or use at() with explicit handling
  const last = invoices.at(-1);
  if (last) {
    console.log(last.name);
  }
}
```

### Utility Type Patterns

```typescript
// Make specific properties required
type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Make specific properties optional
type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Deep readonly
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// Non-empty array
type NonEmptyArray<T> = [T, ...T[]];

// Dictionary type
type Dictionary<T> = Record<string, T>;

// Nullable
type Nullable<T> = T | null;

// Usage
type CreateInvoiceInput = WithOptional<Invoice, "id" | "createdAt" | "updatedAt">;
type InvoiceView = DeepReadonly<Invoice>;
```

---

## 📝 Function Signatures

### Explicit Return Types

```typescript
// ✅ Always declare return types
function calculateTotal(items: Product[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ Async functions
async function fetchInvoice(id: InvoiceId): Promise<Invoice> {
  const response = await api.get(`/invoices/${id}`);
  return response.data;
}

// ✅ Generic functions
function findById<T extends BaseEntity<string>>(
  items: readonly T[],
  id: string,
): T | undefined {
  return items.find((item) => item.id === id);
}

// ✅ Higher-order functions
function createHandler<T>(
  processor: (data: T) => void,
): (event: CustomEvent<T>) => void {
  return (event) => processor(event.detail);
}
```

### Parameter Patterns

```typescript
// Readonly parameters for immutability
function processItems(items: readonly Product[]): ProcessedData {
  // items.push() would be a type error
  return items.map(transform);
}

// Object parameters with destructuring
interface FetchOptions {
  readonly id: string;
  readonly includeRelations?: boolean;
  readonly signal?: AbortSignal;
}

async function fetchWithOptions({
  id,
  includeRelations = false,
  signal,
}: Readonly<FetchOptions>): Promise<Invoice> {
  // Implementation
}

// Rest parameters with tuple types
function log(level: LogLevel, ...messages: readonly string[]): void {
  console.log(`[${level}]`, ...messages);
}
```

---

## 🔄 Async Patterns

### Error Handling

```typescript
// Result type pattern
type Result<T, E = Error> =
  | {ok: true; value: T}
  | {ok: false; error: E};

async function safeFetch<T>(url: string): Promise<Result<T>> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return {ok: false, error: new Error(`HTTP ${response.status}`)};
    }
    const data: T = await response.json();
    return {ok: true, value: data};
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

// Usage
const result = await safeFetch<Invoice>("/api/invoices/123");
if (result.ok) {
  console.log(result.value.name);
} else {
  console.error(result.error.message);
}
```

### Cancellation

```typescript
async function fetchWithCancellation<T>(
  url: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(url, {signal});
  
  if (signal?.aborted) {
    throw new DOMException("Request cancelled", "AbortError");
  }
  
  return response.json();
}

// Usage with cleanup
function useFetchData<T>(url: string): {data: T | null; loading: boolean} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    
    fetchWithCancellation<T>(url, controller.signal)
      .then(setData)
      .finally(() => setLoading(false));
    
    return () => controller.abort();
  }, [url]);

  return {data, loading};
}
```

---

## 📦 Module System

### Import/Export Patterns

```typescript
// ✅ Use type imports for types only
import type {Invoice, Product} from "@/types";
import type {ComponentProps} from "react";

// ✅ Named exports for utilities
export function formatCurrency(amount: number): string { /* ... */ }
export function formatDate(date: Date): string { /* ... */ }

// ✅ Type re-exports
export type {Invoice, Product, Merchant} from "./domain";

// ✅ Const assertions for literal types
export const SUPPORTED_LOCALES = ["en", "ro"] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

// ❌ Avoid default exports (except pages/layouts)
// export default function utility() { /* ... */ }

// ✅ Default exports only for React page components
export default function Page(): React.JSX.Element { /* ... */ }
```

### Path Aliases

```typescript
// tsconfig.json paths
{
  "paths": {
    "@/*": ["./src/*"],
    "@/types": ["./src/types"],
    "@/lib/*": ["./src/lib/*"],
    "@/components/*": ["./src/components/*"]
  }
}

// Usage
import {Invoice} from "@/types";
import {cn} from "@/lib/utils";
import {Button} from "@arolariu/components";
```

---

## 📖 JSDoc Documentation (RFC 1002)

### Public API Documentation

```typescript
/**
 * Calculates the total amount for an invoice including tax.
 *
 * @param items - The list of products in the invoice
 * @param taxRate - The tax rate as a decimal (e.g., 0.19 for 19%)
 * @returns The total amount including tax
 *
 * @example
 * ```typescript
 * const items = [{price: 100}, {price: 50}];
 * const total = calculateTotal(items, 0.19);
 * console.log(total); // 178.5
 * ```
 *
 * @throws {Error} If items array is empty
 * @see {@link Product} for item structure
 */
export function calculateTotal(
  items: readonly Product[],
  taxRate: number,
): number {
  if (items.length === 0) {
    throw new Error("Cannot calculate total for empty items");
  }
  
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  return subtotal * (1 + taxRate);
}
```

### Type Documentation

```typescript
/**
 * Represents an invoice in the system.
 *
 * @remarks
 * Invoices are the core entity in the invoice management domain.
 * They contain product items, merchant information, and payment details.
 *
 * @example
 * ```typescript
 * const invoice: Invoice = {
 *   id: "inv_123",
 *   name: "March Groceries",
 *   items: [{rawName: "Milk", price: 2.50}],
 *   totalAmount: 2.50,
 * };
 * ```
 */
export interface Invoice extends NamedEntity<string> {
  /** The unique identifier of the merchant */
  readonly merchantId: string;
  
  /** List of products in this invoice */
  readonly items: readonly Product[];
  
  /** Total amount in the invoice currency */
  readonly totalAmount: number;
  
  /**
   * The currency used for this invoice.
   * @defaultValue "RON"
   */
  readonly currency?: Currency;
}
```

---

## 🔒 Type-Safe Environment Variables

```typescript
// types/typedEnv.ts
type RequiredEnvVar = 
  | "API_URL"
  | "API_JWT"
  | "CLERK_SECRET_KEY";

type OptionalEnvVar =
  | "NEXT_PUBLIC_DEBUG"
  | "OTEL_ENABLED";

type SecretEnvVar =
  | "API_JWT"
  | "CLERK_SECRET_KEY"
  | "DATABASE_URL";

export function getEnvVar(key: RequiredEnvVar): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getOptionalEnvVar(key: OptionalEnvVar): string | undefined {
  return process.env[key];
}

// Usage
const apiUrl = getEnvVar("API_URL"); // Type: string (guaranteed)
const debug = getOptionalEnvVar("NEXT_PUBLIC_DEBUG"); // Type: string | undefined
```

---

## ✅ Quality Checklist

### Before Committing TypeScript Code

- [ ] No `any` types (use `unknown` + type guards)
- [ ] Explicit return types on all functions
- [ ] `readonly` on parameters that shouldn't be mutated
- [ ] JSDoc on all public APIs
- [ ] Type guards for runtime validation
- [ ] Proper error handling with typed errors
- [ ] Index access handled (`T | undefined`)
- [ ] Import types with `import type`

### Common Patterns Applied

- [ ] Discriminated unions for state machines
- [ ] Branded types for domain IDs
- [ ] Result type for fallible operations
- [ ] Const assertions for literals
- [ ] Utility types for transformations

---

## 🔗 Related Resources

- **RFC 1002**: JSDoc Documentation Standard
- **Root TSConfig**: `tsconfig.json`
- **ESLint Config**: `eslint.config.ts` (TypeScript rules)
- **Types Directory**: `sites/arolariu.ro/src/types/`
