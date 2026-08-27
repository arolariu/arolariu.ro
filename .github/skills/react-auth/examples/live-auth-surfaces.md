# Live Authentication and Authorization Surfaces

These pointers describe current behavior. Read source and tests before
proposing a change.

## Clerk matcher

- `sites/arolariu.ro/src/proxy.ts`

The current protected route matcher contains `/admin(.*)`. The broader Next
matcher also runs middleware for dynamic pages and API routes, but that does
not make all of them protected. Changing either matcher is auth behavior and
requires explicit approval.

## Server-page redirect

- `sites/arolariu.ro/src/app/auth/page.tsx`
- `sites/arolariu.ro/src/app/auth/page.spec.tsx`

The auth page performs its authenticated-user redirect on the server before
rendering the client island. Preserve that ownership. The existing browser
spec is broad; an approved redirect change needs deterministic guest and
authenticated coverage.

## Invoice guest/public/shared/owner policy

- `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/page.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/island.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/fetchInvoice.ts`

The server page currently permits public invoices, or authenticated owners/
explicitly shared users, and rejects other actors. The island uses owner state
for presentation; it is not the access boundary. `fetchInvoice` is a public
Server Action and its documented owner/shared behavior must be independently
verified rather than inferred from the page.

## Route Handlers

- `sites/arolariu.ro/src/app/api/auth/clerk/route.ts`
- `sites/arolariu.ro/src/app/api/user/route.ts`

The Clerk webhook verifies its signature before user metadata mutation.
`/api/user` derives Clerk identity server-side and has an established guest
fallback. Either failure/fallback contract is security-sensitive.

## Server Action authorization evidence

- `sites/arolariu.ro/src/lib/actions/email/sendEmail.ts`
- `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/createInvoice.ts`

`sendEmail` requires a Clerk session. `createInvoice` currently preserves a
caller-provided `userIdentifier` when supplied; do not copy or silently alter
that policy. Use `react-server-action` for RPC mechanics and this skill for any
approved auth-policy decision.
