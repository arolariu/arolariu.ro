# Live Store Examples

These are current inspection targets, not static templates. Follow the chain
into consumers and tests before deciding.

## Generic entity-store factory

### Live source

- `sites/arolariu.ro/src/stores/createEntityStore.ts`
- `sites/arolariu.ro/src/stores/createEntityStore.test.ts`
- `sites/arolariu.ro/src/stores/storage/indexedDBStorage.ts`
- `sites/arolariu.ro/src/stores/storage/indexedDBStorage.test.ts`

### Why representative

The factory owns generic ID-based CRUD, selection consistency, hydration state,
partialized entity persistence, and environment-specific devtools wrapping.
The storage adapter owns row-level IndexedDB transactions.

### Inspect

Verify the requested entity has a stable `id`, the generic action set is
sufficient, the table is already supported, and transient fields do not belong
in the factory. Inspect real storage behavior rather than copying test mocks.

## Thin entity stores and consumers

### Live source

- `sites/arolariu.ro/src/stores/invoicesStore.tsx`
- `sites/arolariu.ro/src/stores/merchantsStore.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/useInvoice.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/useInvoices.tsx`
- their colocated tests

### Why representative

Invoice and merchant stores configure the generic factory, while the hooks show
narrow `useShallow` selectors, hydration-aware loading, cached reads, and fresh
server-action updates.

### Inspect

Trace stale-versus-fresh precedence, error handling, selector allocation, and
whether selection is reconciled when collections are replaced. Do not add
fetching to the store when current ownership remains in hooks/actions.

## Specialized scan store

### Live source

- `sites/arolariu.ro/src/stores/scansStore.tsx`
- `sites/arolariu.ro/src/stores/scansStore.test.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/view-scans/_hooks/useScans.tsx`

### Why representative

The store deliberately retains domain-specific scan lifecycle actions and
transient sync fields that do not fit the generic entity factory, while only
the scan collection is persisted.

### Inspect

Check metadata invariants, selection reconciliation, date fields, partialized
state, and consumer hydration. Choose a specialized extension only when the
behavior genuinely exceeds the factory.

## Preferences and browser synchronization

### Live source

- `sites/arolariu.ro/src/stores/preferencesStore.ts`
- `sites/arolariu.ro/src/stores/preferencesStore.test.ts`
- `sites/arolariu.ro/src/app/_components/PreferencesSubscriptions.tsx`
- `sites/arolariu.ro/src/app/_components/PreferencesSubscriptions.test.tsx`
- `sites/arolariu.ro/src/app/providers.tsx`

### Why representative

The store persists a typed preference projection through shared storage; the
root behavior component separately owns BroadcastChannel, visibility
rehydration, locale cookie refresh, theme DOM synchronization, and cleanup.

### Inspect

Keep state actions pure and browser side effects in the mounted subscriber.
Confirm hydration, feedback-loop suppression, cleanup, and which preferences
are safe across accounts. Do not infer cross-tab support for entity stores.

## URL and Context alternatives

### Live source

- `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_hooks/useInvoiceFilters.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_hooks/useInvoiceFilters.test.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/create-invoice/_context/CreateInvoiceContext.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.tsx`

### Why representative

These live alternatives keep shareable state in the URL and feature-lifetime
state in Context, preventing unnecessary global stores.

### Inspect

Prove the proposed state outlives both alternatives and has unrelated consumers
before selecting Zustand.
