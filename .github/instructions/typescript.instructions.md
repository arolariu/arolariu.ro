---
description: 'Guidelines for TypeScript Development targeting TypeScript 5.x and ES2022 output'
applyTo: '**/*.ts'
---

# TypeScript Development

> These instructions assume projects are built with TypeScript 5.9.3 compiling to an ES2022 JavaScript baseline. Adjust guidance if your runtime requires older language targets or down-level transpilation.

## 📚 Essential Context

**This project uses STRICTEST possible TypeScript configuration:**

```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "noPropertyAccessFromIndexSignature": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true
}
```

**Key TypeScript Patterns in This Codebase:**
- Domain-Driven Design types (see `src/types/DDD/`)
- Discriminated unions for state machines
- Branded types for domain concepts (Invoice IDs, etc.)
- Type guards and validators
- Utility types for common patterns

**Reference:**
- Main Instructions: `.github/copilot-instructions.md` (Type Safety section)
- Domain Types: `sites/arolariu.ro/src/types/`
- **RFCs**: Check `docs/rfc/` for type patterns and architectural decisions
  - Frontend RFCs: 1000-1999 (frontend type patterns)
  - Backend RFCs: 2000-2999 (DDD type patterns)

## Core Intent

- Respect the existing architecture and coding standards.
- Prefer readable, explicit solutions over clever shortcuts.
- Extend current abstractions before inventing new ones.
- Prioritize maintainability and clarity, short methods and classes, clean code.
- **Never use `any`** - this is a strict TypeScript codebase.

## General Guardrails

- Target TypeScript 5.x / ES2022 and prefer native features over polyfills.
- Use pure ES modules; never emit `require`, `module.exports`, or CommonJS helpers.
- Rely on the project's build, lint, and test scripts unless asked otherwise.
- Note design trade-offs when intent is not obvious.

## Project Organization

- Follow the repository's folder and responsibility layout for new code.
- Use kebab-case filenames (e.g., `user-session.ts`, `data-service.ts`) unless told otherwise.
- Keep tests, types, and helpers near their implementation when it aids discovery.
- Reuse or extend shared utilities before adding new ones.

## Naming & Style

- Use PascalCase for classes, interfaces, enums, and type aliases; camelCase for everything else.
- Skip interface prefixes like `I`; rely on descriptive names.
- Name things for their behavior or domain meaning, not implementation.

## Formatting & Style

- Run the repository's lint/format scripts (e.g., `npm run lint`) before submitting.
- Match the project's indentation, quote style, and trailing comma rules.
- Keep functions focused; extract helpers when logic branches grow.
- Favor immutable data and pure functions when practical.

## Type System Expectations

- Avoid `any` (implicit or explicit); prefer `unknown` plus narrowing.
- Use discriminated unions for realtime events and state machines.
- Centralize shared contracts instead of duplicating shapes.
- Express intent with TypeScript utility types (e.g., `Readonly`, `Partial`, `Record`).

## Async, Events & Error Handling

- Use `async/await`; wrap awaits in try/catch with structured errors.
- Guard edge cases early to avoid deep nesting.
- Send errors through the project's logging/telemetry utilities.
- Surface user-facing errors via the repository's notification pattern.
- Debounce configuration-driven updates and dispose resources deterministically.

## Architecture & Patterns

- Follow the repository's dependency injection or composition pattern; keep modules single-purpose.
- Observe existing initialization and disposal sequences when wiring into lifecycles.
- Keep transport, domain, and presentation layers decoupled with clear interfaces.
- Supply lifecycle hooks (e.g., `initialize`, `dispose`) and targeted tests when adding services.

## External Integrations

- Instantiate clients outside hot paths and inject them for testability.
- Never hardcode secrets; load them from secure sources.
- Apply retries, backoff, and cancellation to network or IO calls.
- Normalize external responses and map errors to domain shapes.

## Security Practices

- Validate and sanitize external input with schema validators or type guards.
- Avoid dynamic code execution and untrusted template rendering.
- Encode untrusted content before rendering HTML; use framework escaping or trusted types.
- Use parameterized queries or prepared statements to block injection.
- Keep secrets in secure storage, rotate them regularly, and request least-privilege scopes.
- Favor immutable flows and defensive copies for sensitive data.
- Use vetted crypto libraries only.
- Patch dependencies promptly and monitor advisories.

## Configuration & Secrets

- Reach configuration through shared helpers and validate with schemas or dedicated validators.
- Handle secrets via the project's secure storage; guard `undefined` and error states.
- Document new configuration keys and update related tests.

## UI & UX Components

- Sanitize user or external content before rendering.
- Keep UI layers thin; push heavy logic to services or state managers.
- Use messaging or events to decouple UI from business logic.

## Testing Expectations

- Add or update unit tests with the project's framework and naming style.
- Expand integration or end-to-end suites when behavior crosses modules or platform APIs.
- Run targeted test scripts for quick feedback before submitting.
- Minimum 85% code coverage for critical paths.

## Domain-Driven Design Type Patterns

### Base Entity Types
```typescript
// types/DDD/Entities/BaseEntity.ts
export interface BaseEntity<T> {
  id: T;
  createdAt: Date;
  updatedAt: Date;
}

// types/DDD/Entities/NamedEntity.ts
export interface NamedEntity<T> extends BaseEntity<T> {
  name: string;
}
```

### Value Objects
```typescript
// Immutable value objects for domain concepts
export interface Money {
  readonly amount: number;
  readonly currency: Currency;
}

// Type guards for validation
export function isMoney(obj: unknown): obj is Money {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "amount" in obj &&
    "currency" in obj
  );
}
```

### Discriminated Unions
```typescript
// State machines with exhaustive checks
type LoadingState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: DataType }
  | { status: "error"; error: Error };

function handleState(state: LoadingState) {
  switch (state.status) {
    case "idle":
      return null;
    case "loading":
      return <Spinner />;
    case "success":
      return <Data data={state.data} />;
    case "error":
      return <Error error={state.error} />;
  }
}
```

### Branded Types
```typescript
// Prevent type confusion for domain IDs
type InvoiceId = string & { readonly __brand: "InvoiceId" };
type UserId = string & { readonly __brand: "UserId" };

function createInvoiceId(id: string): InvoiceId {
  return id as InvoiceId;
}

// Now these cannot be confused
function getInvoice(id: InvoiceId): Invoice { /* ... */ }
// getInvoice(userId); // Type error!
```

## Quick Reference

### Project-Specific Type Locations
```
sites/arolariu.ro/src/types/
├── index.ts              # Global types
├── DDD/                  # Domain-Driven Design patterns
│   ├── Entities/        # Base entity interfaces
│   └── ValueObjects/    # Value object types
├── invoices/            # Invoice domain types
│   ├── Invoice.ts
│   ├── Product.ts
│   └── Merchant.ts
└── typedEnv.ts          # Type-safe environment variables
```

### Common Type Utilities
- `Readonly<T>`: Make all properties readonly
- `Partial<T>`: Make all properties optional
- `Required<T>`: Make all properties required
- `Pick<T, K>`: Select specific properties
- `Omit<T, K>`: Exclude specific properties
- `Record<K, V>`: Object with specific key-value types
- `NonNullable<T>`: Exclude null and undefined
- `ReturnType<T>`: Extract function return type
- `Parameters<T>`: Extract function parameter types

### Strict Mode Implications
- **No implicit any**: All types must be explicit
- **Strict null checks**: Handle null/undefined explicitly
- **No unchecked index access**: Array access returns `T | undefined`
- **Exact optional properties**: undefined ≠ missing property
- **No implicit returns**: All code paths must return a value
- Avoid brittle timing assertions; prefer fake timers or injected clocks.

## Performance & Reliability

- Lazy-load heavy dependencies and dispose them when done.
- Defer expensive work until users need it.
- Batch or debounce high-frequency events to reduce thrash.
- Track resource lifetimes to prevent leaks.

## Documentation & Comments

- Add JSDoc to public APIs; include `@remarks` or `@example` when helpful.
- Write comments that capture intent, and remove stale notes during refactors.
- Update architecture or design docs when introducing significant patterns.
