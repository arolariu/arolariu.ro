# TypeScript Reference Catalog

Owner: `.github/instructions/typescript.instructions.md`. This catalog holds
extensive, repository-specific TypeScript examples, anti-patterns, edge cases,
and rationale. It does not define a workflow; use `nextjs-page`,
`react-component`, `zustand-store`, or another skill for the procedure. It does
not restate versions, global commands, or root safety policy — see root
`AGENTS.md`.

## `unknown` plus type guard, not `any`

Shared guard primitives already exist. Reuse them instead of inline
`typeof`/`as` checks:

```ts
// sites/arolariu.ro/src/types/guards.ts
export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isArrayOf<T>(value: unknown, guard: (item: unknown) => item is T): value is readonly T[] {
  return Array.isArray(value) && value.every((item) => guard(item));
}
```

Anti-pattern correction:

```ts
// ❌ Silences the compiler instead of proving the shape
function readTitle(data: any): string {
  return data.title;
}

// ✅ Narrows before use
function readTitle(data: unknown): string {
  if (isRecord(data) && isNonEmptyString(data["title"])) {
    return data["title"];
  }
  throw new Error("Expected a record with a non-empty title");
}
```

Domain-specific guards live beside the types they validate (for example
`isAllergenAssessment` in `sites/arolariu.ro/src/types/invoices/Allergen.ts`),
not in the shared `guards.ts` module. Add a new guard beside its type; do not
grow the shared module with domain checks.

## Transport validation at the trust boundary

`sites/arolariu.ro/src/types/invoices/transport.ts` is the permanent runtime
boundary for the invoices bounded context. Every server action response is
routed through one of its parsers before reaching UI code — a TypeScript
`as Invoice` cast never validates at runtime.

Design rules encoded in that module (read the file before adding a parser):

- Entity parsers (`Invoice`, `Product`, `Merchant`) tolerate additive backend
  properties by design and do not call `hasOnlyKeys`, so a new backend field
  never breaks an old client.
- Value-object guards (for example `AllergenAssessment`) are intentionally
  closed and call `hasOnlyKeys` internally because their contracts are stable.
- Timestamps are parsed with `new Date()` and the parser throws when the
  result is `NaN`.
- A field that is present but invalid always throws; a field that is absent
  may receive a safe default only when the type has a clear zero value and the
  backend legitimately omits it.
- The GUID predicate reuses `validateStringIsGuidType` from
  `@/lib/utils.generic` — it does not introduce a second UUID regex.

```ts
// sites/arolariu.ro/src/types/invoices/transport.ts
export class TransportValidationError extends Error {
  readonly path: string;
  constructor(path: string, detail: string) {
    super(`Transport validation failed at "${path}": ${detail}`);
    this.name = "TransportValidationError";
    this.path = path;
  }
}
```

`sites/arolariu.ro/src/lib/utils.server.ts` maps a caught
`TransportValidationError` to a `"SERVER_ERROR"` `ServerActionResult` rather
than a generic network failure — see the frontend catalog's transport-error
section for the full mapping.

## Identifier normalization

Reuse `sites/arolariu.ro/src/lib/utils.generic.ts` rather than adding a second
UUID/GUID implementation:

```ts
export function validateStringIsGuidType(input: string, paramName = "identifier"): asserts input is string {
  // throws on non-UUID input; accepts the EMPTY_GUID/LAST_GUID sentinels
}

export function generateGuid(seed?: string | Uint8Array): Readonly<string> { /* ... */ }
```

`transport.ts`'s `isGuid()` predicate wraps `validateStringIsGuidType` in a
`try/catch` to turn the assertion into a boolean guard — that is the
established pattern for converting an `asserts` function into a type
predicate; do not duplicate the regex.

## Discriminated unions

`ServerActionResult<T>` is the repository's canonical discriminated union for
fallible operations (see `sites/arolariu.ro/src/lib/utils.server.ts`):

```ts
export type ServerActionResult<T> = Promise<
  | Readonly<{success: true; data: T; error?: never}>
  | Readonly<{success: false; data?: never; error: {code: ServerActionErrorCode; message: string; status?: number}}>
>;
```

The `error?: never` / `data?: never` pair on the opposite branch is what makes
`result.data` and `result.error` mutually exclusive after narrowing on
`success` — omitting it would let a caller read `result.error` on the success
branch without a compiler error.

A larger discriminated union with a compile-time payload registry lives in
`sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.tsx`
(`DialogType`, `DialogMode`, `DialogPayloads`). It shows how to key a mapped
type by a string-literal union so that `openDialog("EDIT_INVOICE__ITEMS", "edit", payload)`
fails to compile when `payload` does not match `DialogPayloads["EDIT_INVOICE__ITEMS"]`.
The soundness of that narrowing depends on the active dialog being the only
one mounted — read the file's `@remarks` before extending the union.

## Generics for reusable stores and entities

`sites/arolariu.ro/src/stores/createEntityStore.ts` (RFC 1007 §2) generalizes
the invoice/merchant/scan store shape:

```ts
export interface BaseEntity {
  readonly id: string;
}

export interface EntityActions<E extends BaseEntity> {
  setEntities: (entities: ReadonlyArray<E>) => void;
  upsertEntity: (entity: E) => void;
  removeEntity: (entityId: string) => void;
  updateEntity: (entityId: string, updates: Partial<E>) => void;
  getEntityById: (entityId: string) => E | undefined;
}

export type EntityStore<E extends BaseEntity> = EntityState<E> & EntityActions<E>;
```

The production `useInvoicesStore`/`useMerchantsStore`/`useScansStore` stores
are still hand-rolled rather than built on this factory (partial adoption per
RFC 1007 §2.6) — do not assume every store already uses it; check the target
store file before generalizing it.

`sites/arolariu.ro/src/types/DDD/Entities/BaseEntity.ts` shows the sibling DDD
generic pattern (`BaseEntity<T> extends IAuditable { readonly id: T }`),
generic over the identifier type rather than the entity shape.

## `readonly` and immutability

- `BaseEntity<T>` marks `id` `readonly`; audit fields follow the same
  convention in `IAuditable`.
- Component and hook contracts use `Readonly<Props>` /
  `Readonly<{...}>` — see the React catalog for the component-shape rule.
- Prefer `ReadonlyArray<T>` for persisted collections (Zustand persisted state
  in `invoicesStore.tsx`, `EntityPersistedState<E>`) so a consumer cannot
  mutate the array in place; the store still exposes a mutable in-memory
  `selectedEntities: E[]` field for local list manipulation, so `readonly` is
  a per-field decision, not a blanket rule.

## `satisfies` for shape-checked object literals without widening

`sites/arolariu.ro/src/metadata.ts` uses `satisfies` throughout so a typo in a
literal key fails at the definition site while the resulting value keeps its
literal type (as opposed to widening to the annotated interface):

```ts
export const metadata: Metadata = {
  // ...
  robots: {
    follow: true,
    index: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
    googleBot: {/* ... */},
  } satisfies Robots,
  icons: [...normalIcons, ...appleTouchIcons] satisfies Icon[],
};
```

`sites/arolariu.ro/src/lib/theme-presets.ts` shows the same pattern for a
`Record`:

```ts
export const THEME_PRESETS = {
  default: {name: "Default", description: "...", preview: ["#06b6d4", "#8b5cf6", "#ec4899"]},
  // ...
} as const satisfies Record<string, ThemePresetMeta>;
```

Anti-pattern correction: annotating the constant `Record<string, ThemePresetMeta>`
directly (instead of `satisfies`) would widen every preset key to `string` and
lose the literal `"default" | "midnight" | ...` union used elsewhere for
preset selection.

## Module and public API boundaries

- `packages/components/src/index.ts` is the single barrel; every public
  component and its prop type are exported together
  (`export {Alert, ...}; export type {AlertProps, AlertVariant}`). Adding a
  component without a matching barrel export makes it unreachable from
  `@arolariu/components` consumers.
- Base UI primitives the library re-exports for convenience
  (`mergeProps`, `useRender`, `CSPProvider`, `DirectionProvider`) are exported
  from the same barrel rather than requiring consumers to depend on
  `@base-ui/react` directly.
- Default exports are reserved for Next.js pages/layouts
  (`export default async function InvoicesHomepage(...)`); everything else —
  utilities, hooks, guards, components — uses named exports so barrels and
  tree-shaking stay predictable.

## Type-system edge cases from the live `tsconfig`

- The website's `tsconfig.json` overrides the root's
  `exactOptionalPropertyTypes: true` to `false`
  (`sites/arolariu.ro/tsconfig.json`). Do not assume
  `exactOptionalPropertyTypes` semantics apply uniformly across the monorepo;
  check the nearest `tsconfig.json` before relying on the distinction between
  an omitted optional property and one explicitly set to `undefined`.
- `noUncheckedIndexedAccess` (root `tsconfig.json`) means array/index access
  returns `T | undefined`; narrow before use (`invoices[0]` is
  `Invoice | undefined`, not `Invoice`) instead of asserting it away.
- `verbatimModuleSyntax` requires `import type` for type-only imports; mixing
  a value and its type in one import (`import {Invoice} from "@/types"` where
  `Invoice` is only a type) is a build error, not a style nit.

## Anti-pattern corrections summary

| Anti-pattern | Why it fails here | Correction |
| --- | --- | --- |
| `data as Invoice` on a fetch response | Skips the transport boundary; a drifted backend field throws deep in the UI instead of at the boundary | Route through `types/invoices/transport.ts` parsers |
| A second UUID regex next to a new guard | Duplicates `validateStringIsGuidType`; drifts when one copy is fixed | Import and wrap the existing assertion |
| Annotating a preset/config object with its interface directly | Widens literal keys, loses union inference | `as const satisfies Interface` |
| A new domain guard added to `types/guards.ts` | Mixes domain-specific and domain-agnostic validation in one module | Place the guard beside its type (for example `types/invoices/Allergen.ts`) |
| Adding a component export without updating `src/index.ts` | Component compiles but is unreachable from `@arolariu/components` | Update the barrel in the same change |

## Live source pointers

- `sites/arolariu.ro/src/types/guards.ts` — domain-agnostic guards
- `sites/arolariu.ro/src/types/invoices/transport.ts` — transport validation boundary
- `sites/arolariu.ro/src/lib/utils.generic.ts` — identifier/format helpers
- `sites/arolariu.ro/src/lib/utils.server.ts` — `ServerActionResult`, error mapping
- `sites/arolariu.ro/src/stores/createEntityStore.ts` — generic entity store factory
- `sites/arolariu.ro/src/types/DDD/Entities/BaseEntity.ts` — DDD generic entity
- `sites/arolariu.ro/src/metadata.ts`, `sites/arolariu.ro/src/lib/theme-presets.ts` — `satisfies` usage
- `packages/components/src/index.ts` — barrel export contract
- `sites/arolariu.ro/tsconfig.json`, root `tsconfig.json` — active strict flags
