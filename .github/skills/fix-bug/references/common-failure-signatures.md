# Common Failure Signatures

Load this catalog only after capturing a concrete symptom. These signatures
narrow investigation; they do not replace reproduction or root-cause proof.

| Signature | Likely boundary | Inspect live | First proof to seek | Avoid |
| --- | --- | --- | --- | --- |
| Build cannot resolve generated files or typed artifacts; locale key is missing or emitted types lag messages | Generation input/output contract | `scripts/generate.ts`, `scripts/generate.i18n.ts`, locale JSON files, `sites/arolariu.ro/messages/en.d.json.ts`, root troubleshooting guidance | Show whether source input is absent, generator output is stale, or code references a nonexistent key | Hand-editing generated output or copying a global command snapshot into the fix |
| HTTP status is successful but frontend receives `{}`, wrong field types, invalid dates/identifiers/enums, or silently dropped nested data | Transport validation | `sites/arolariu.ro/src/types/invoices/transport.ts`, its tests, affected action, matching API response DTO test | Feed the exact raw body to the real parser and assert the field path or normalized result | Trusting TypeScript casts, accepting partial data, or mocking the parser |
| Hydration mismatch, content flash, browser API on server, or client state differs before/after mount | Server/client and hydration lifecycle | `sites/arolariu.ro/src/app/domains/invoices/_components/DeferredMount.tsx`, owning island/hook, store `hasHydrated` flow, component tests | Fixed pre-hydration state followed by deterministic rehydration/mount transition | Moving the whole page client-side or adding an unconditional mounted flag |
| Deleted/invalid entity returns after reload; old persisted fields survive lifecycle transition; selected state leaks into persistence | Zustand persistence/merge/storage | Owning store, `sites/arolariu.ro/src/stores/createEntityStore.ts`, `sites/arolariu.ro/src/stores/storage/indexedDBStorage.ts`, store/storage tests | Seed one stale persisted record and prove the exact rehydrated/updated state | Mocking the repository storage module or clearing all user state as a generic fix |
| Backend throws wrong outer exception, loses marker/inner cause, or maps a known dependency failure to service error | The Standard TryCatch classification | Affected `*.Exceptions.cs`, direct dependency exception family, exact exception tests, shared HTTP mapper when protocol is affected | Inject one exact direct failure and assert exact outer plus inner chain | Broad `Assert.Throws`, catch-all reclassification, or symptom-only HTTP mapping |
| Service cannot resolve; an Invoices endpoint/worker bypasses Management; architecture test reports constructor graph or sideways layer violation | DI/layer boundary | `sites/api.arolariu.ro/src/Invoices/Modules/`, service constructors, `InvoiceStandardLayeringArchitectureTests.cs`, endpoint/worker dependency | Resolve the owning registration or reflect the exact constructor graph | Registering duplicate services or adding a bypass just to satisfy DI |
| Cancellation becomes a 5xx/domain failure, retry continues after cancellation, or client disconnect and timeout collapse together | Cancellation ownership | Service TryCatch partial, retry loop, `RequestCancellation.cs`, `EndpointCancellationTests.cs`, cancellation-focused Foundation/worker tests | Use an already-cancelled or controlled token and assert propagation or exact protocol result | Catching cancellation as `Exception`, adding retries, or asserting only “failed” |
| Build fails on a warning even though test logic passes | Compiler/analyzer boundary | `sites/api.arolariu.ro/Directory.Build.props`, test project props, diagnostic source | Reproduce the smallest build diagnostic and fix its source | `NoWarn`, pragma, analyzer weakening, or treating warning failure as unrelated |
| MCP tool or Copilot extension file exists but the capability is unavailable, stale, or returns a success-shaped fallback | Runtime readiness, not source presence | `AGENTS.md` troubleshooting, `.github/mcp.json`, `.github/extensions/`, extension tests, extension manager status/log | Verify loaded status and runtime log separately from source/tests | Claiming readiness from a file, silently bypassing a failed extension, or exposing secrets from logs |

## Signature Discipline

- Use exact current paths and reopen them; generated artifacts, persistence
  shapes, exception families, and registrations are dynamic.
- A matching signature identifies the next inspection boundary, not the fix.
- If two signatures fit equally well, return to the reproduction and capture
  the earlier causal event.
