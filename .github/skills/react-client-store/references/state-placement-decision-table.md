# State Placement Decision Table

Use before any Zustand edit. Choose the first narrow owner that satisfies the
behavior.

| State signal | Owner | Live consumer/source | Why not Zustand |
| --- | --- | --- | --- |
| Request-time data, cookies, secrets, server feature flags, or authoritative backend snapshot | Server Component / server action | `sites/arolariu.ro/src/app/layout.tsx`; `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/page.tsx` | Avoid duplicate client authority and secret/serialization risk |
| Bookmarkable/shareable filter, sort, view, or pagination contract | URL state | `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_hooks/useInvoiceFilters.tsx` and its test | URL already owns reload, sharing, and navigation semantics |
| Derived display value | Compute during render | `sites/arolariu.ro/src/hooks/usePagination.tsx` | Storing derived values creates synchronization bugs |
| One component/control | Local `useState`/`useReducer` | `sites/arolariu.ro/src/app/domains/invoices/_components/classification/ClassificationPicker.tsx` | Global subscriptions outlive and overexpose local intent |
| One mounted feature subtree | Scoped Context | `sites/arolariu.ro/src/app/domains/invoices/create-invoice/_context/CreateInvoiceContext.tsx`; `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.tsx` | Provider lifetime matches the behavior |
| Existing domain entities used by unrelated consumers | Existing entity/specialized store | `sites/arolariu.ro/src/stores/invoicesStore.tsx`, `sites/arolariu.ro/src/stores/merchantsStore.tsx`, `sites/arolariu.ro/src/stores/scansStore.tsx` | Extend the current owner rather than duplicate state |
| Existing site preferences needed across unrelated routes/providers | Existing preferences store | `sites/arolariu.ro/src/stores/preferencesStore.ts`; `sites/arolariu.ro/src/app/_components/PreferencesSubscriptions.tsx` | Cross-route lifetime and persistence already exist |
| New genuinely global client domain with unrelated consumers | New Zustand store, only after approval | Inspect `sites/arolariu.ro/src/stores/index.ts`, factory/storage, and all consumers | Protected architecture decision; prove every narrower option insufficient |

## Existing store fit

### Generic entity factory fits when

- every item has a stable string `id`;
- durable state is the entity collection;
- generic set/upsert/remove/update/selection/lookup behavior is sufficient;
- entity-level IndexedDB storage is appropriate.

Inspect `sites/arolariu.ro/src/stores/createEntityStore.ts`, then the thin
invoice and merchant wrappers. Do not add domain-specific actions to every
entity store merely to serve one consumer.

### Specialized store fits when

- state has domain lifecycle actions or additional transient sync state;
- persisted collection shape differs from the generic `entities` contract;
- migration to the factory would widen or weaken behavior.

`sites/arolariu.ro/src/stores/scansStore.tsx` is the live specialized example.
Extend it only for scan-owned behavior.

### Shared preferences fit when

- the value is an approved cross-route preference;
- key-value snapshot persistence is appropriate;
- root browser synchronization owns its side effects.

Inspect `sites/arolariu.ro/src/stores/preferencesStore.ts` and
`sites/arolariu.ro/src/app/_components/PreferencesSubscriptions.tsx`. Do not
place arbitrary domain data in the shared table.

## New-store approval boundary

An explicit task, including one that asks for a new store, is not the required
approval. If a new store remains necessary, stop before creating it and obtain
a concrete checkpoint after documenting:

1. consumers in unrelated route branches;
2. why server, URL, local state, Context, and each existing store fail;
3. persistence and user-ownership needs;
4. expected reset/logout and hydration behavior;
5. proposed public store contract and test scope.

The checkpoint must explicitly approve that proposed new store after reviewing
this evidence.

Approval for a store is not approval for a dependency, storage schema,
cross-user persistence, authentication behavior, or ambiguous product
semantics.
