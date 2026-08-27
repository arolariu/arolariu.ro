# Auth and Transport Edge Cases

Open only for guest/authenticated visibility or a transport-result decision.

## Missing or invalid transport data

- Validate API JSON before JSX. See
  `sites/arolariu.ro/src/types/invoices/transport.ts` and the `tryParse` call
  in
  `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/fetchInvoice.ts`.
- Distinguish absent resource, forbidden access, malformed payload, transient
  dependency failure, and a successful empty collection.
- A `404` can call `notFound()` only when the route contract treats it as
  absence. Other typed failures need their established forbidden/error/retry
  mapping.
- Do not cast `unknown` transport data to a domain type or display internal
  provider/error text to the user.

## Guest and authenticated behavior

- Inspect `sites/arolariu.ro/src/proxy.ts`; do not assume every domain route is
  middleware-protected.
- `sites/arolariu.ro/src/app/auth/page.tsx` demonstrates a server redirect for
  an authenticated user.
- `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/page.tsx`
  demonstrates explicit owner/shared/public guest rules. Those are
  security-sensitive behavior, not a reusable template.
- Preserve fail-closed behavior for protected data. Ask before changing guest
  fallback, redirects, middleware matchers, or visibility rules.
