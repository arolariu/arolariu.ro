# Live Server Action Examples

These files are evidence of current behavior, not blanket approval of every
detail. Read the action, caller, helper, parser, and test together.

## Invoice transport actions

- `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/fetchInvoice.ts`
- `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/fetchInvoice.test.ts`
- `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/createInvoice.ts`
- `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/createInvoice.test.ts`
- `sites/arolariu.ro/src/types/invoices/transport.ts`
- `sites/arolariu.ro/src/lib/utils.server.ts`

Useful live patterns include identifier checks, session-derived backend
credentials, `fetchWithTimeout`, `withSpan`, transport parsing from `unknown`,
and discriminated results.

Inspect authorization separately. `fetchInvoice` documents owner/shared access
and relies on the downstream boundary for that decision. `createInvoice`
currently accepts a caller-provided `userIdentifier` when present; that is
security-sensitive live behavior, not a pattern for a new action. Do not
silently preserve or fix either policy—route material auth behavior changes to
`react-auth`.

## User-triggered email action

- `sites/arolariu.ro/src/lib/actions/email/sendEmail.ts`
- `sites/arolariu.ro/src/lib/actions/email/sendEmail.test.ts`
- `sites/arolariu.ro/emails/_registry.ts`

`sendEmail` enforces a Clerk session, resolves only registered templates,
merges fixed variant props defensively, and forwards an optional idempotency
key. It also demonstrates a distinct result shape owned by its callers. For a
new material change, validate address/template/ICU inputs at runtime and
confirm who owns authorization to contact the recipient; do not infer that
authentication alone is sufficient.

## Private server-only contrast

- `sites/arolariu.ro/src/lib/actions/storage/fetchConfig.ts`
- `sites/arolariu.ro/src/lib/actions/storage/fetchConfig.test.ts`

`fetchConfig.ts` imports `"server-only"` and intentionally omits `"use
server"` so a caller cannot turn a configuration key into an arbitrary RPC
relay. Use this boundary for server-owned reads.

## Test interpretation

Current action tests identify important branches, but some mock repository
helpers. New tests should execute repository-owned validation/mapping when
that is the behavior under test and substitute only the true external
boundary (for example Clerk, network, or email provider).
