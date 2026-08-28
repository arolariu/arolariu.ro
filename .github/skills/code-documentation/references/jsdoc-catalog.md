# JSDoc/TSDoc Catalog

Use this catalog only after selecting JSDoc/TSDoc. The governing standard is
[RFC 1002](../../../../docs/rfc/1002-comprehensive-jsdoc-documentation-standard.md);
live source and current TypeDoc configuration determine the actual contract and
rendered surface.

## Coverage

Document exported functions, components, hooks, server actions, types,
interfaces, classes, and non-obvious public constants. Private implementation
details need comments only when they preserve reasoning that cannot be made
clear in code. Do not document generated code or restate a declaration.

## Tag Decisions

| Element | Requirement | Useful content |
| --- | --- | --- |
| Summary | Baseline for every documented public symbol | Caller-visible purpose, led by a precise verb or domain noun; no implementation walkthrough |
| `@fileoverview` / `@module` | Use for a major module whose role or runtime boundary is not obvious | Ownership, key exports, runtime constraints, and links to related owners |
| `@remarks` | Use when rationale, lifecycle, side effects, rendering, performance, or constraints exceed the summary | Why the API exists, when to use it, observable guarantees, trade-offs proven by source |
| `@param` | Required for every parameter; names must match the signature | Domain role, accepted values, units, defaults, null/undefined behavior, relationship to other inputs |
| `@returns` | Use for non-void functions, async operations, hooks, and components | Meaning of the value, empty/null/undefined cases, Promise completion, stable object/callback semantics |
| `@throws` | Use for every error intentionally visible to the caller | Exact escaping error type when known and the condition that causes it; do not list caught or translated internals |
| `@example` | Use when correct use is non-obvious or context-sensitive | Minimal public import and realistic invocation that still matches current types and runtime |
| `@template` | Use for a generic parameter whose role or constraint is not obvious from TypeScript | Semantic relationship between input and output, not a repetition of `extends` |
| `@deprecated` | Use only for an approved deprecation | Reason, supported replacement, and migration direction |
| `@see` / `{@link ...}` | Use when another symbol, RFC, or official source owns detail | A resolvable local symbol or durable URL with a clear relationship |

Optional tags are conditional, not padding; `@param` remains required for every
parameter. A short, exact comment is better than empty `@remarks`, a toy
example, or a fabricated failure mode.

## Rendering and Runtime Context

Derive context from directives, imports, hooks, consumers, and framework
boundaries rather than from a neighboring comment.

| Surface | Explain when relevant | Verify |
| --- | --- | --- |
| Server Component or server-only utility | Server execution, awaited data, serialization, cache/revalidation, and server-only dependencies | No client hooks/browser APIs; current call site and framework boundary |
| Client Component or hook | Why a client boundary exists, required provider, browser/storage/event side effects, cleanup, and re-render triggers | `"use client"`, hooks/browser use, provider placement, tests |
| Server action or transport helper | Trust boundary, validation, authentication assumptions, external calls, returned transport shape, and escaping failures | Current implementation and callers; never expose credentials in an example |
| Shared utility/type | Environment assumptions, mutation, determinism, sentinels, units, and edge cases | Branches, tests, and all public consumers |

Do not claim memoization, caching, accessibility behavior, authentication,
telemetry, or performance characteristics merely because the framework could
provide them.

## Async and Error Contracts

- State what fulfillment means and whether an empty value is distinct from
  absence.
- Record timeout, abort, cancellation, retry, and cleanup behavior only when
  implemented.
- Trace each documented error from the throw site through catch/translation
  layers to the caller. Name the caller-visible result, not a swallowed cause.
- For discriminated result objects, document each public branch instead of
  saying the function “throws” when it returns failure data.
- For hooks, document loading/error/empty state and stale-response or unmount
  behavior when those are part of the returned contract.

## Meaningful Examples

An example must:

1. use the current public import and type names;
2. include enough rendering/provider/server context to be valid;
3. use safe, non-secret values;
4. demonstrate the behavior that is otherwise easy to misuse;
5. show error/result handling when that is central to the API; and
6. avoid copied output, versions, identifiers, or locale text that will drift.

Prefer one representative example over several near-duplicates. If a realistic
example needs substantial application setup, link a current live consumer.

## Anti-Obvious-Comment Guidance

Avoid:

```typescript
/** Gets the invoice. */
function getInvoice(id: string): Invoice;
```

Add the contract the type cannot express:

```typescript
/**
 * Resolves the invoice visible in the caller's ownership scope.
 *
 * @param id - Canonical invoice identifier after transport validation.
 * @returns The visible invoice, or absence according to the current caller contract.
 */
function getInvoice(id: string): Invoice | undefined;
```

The second form is valid only if live behavior proves those statements.

## Final JSDoc Review

- Parameter names, optionality, defaults, generic constraints, and return
  nullability match the declaration.
- Rendering and async claims match directives, effects, cleanup, and call sites.
- Errors match observable throws or result branches.
- Examples use current imports, types, providers, and safe values.
- Cross-links resolve under the current TypeDoc configuration.
- The comment adds intent or constraints rather than narrating syntax.
