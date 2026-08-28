# .NET Review

Use for changes under the API, AppHost, .NET tooling, workers, Brokers,
services, endpoints, DI, or DTOs. Read the API guide, C# and backend
instructions, and relevant accepted RFC only where the finding depends on
architectural intent.

## Architecture and dependency direction

- Invoices adapters and workers consume Management; Management delegates to
  Processing; Processing to Orchestration; Orchestration to Foundation; and
  Foundation to Brokers.
- Flag Foundation-to-Foundation calls, endpoint/worker bypasses, hidden domain
  dependencies, or service-locator workarounds that change runtime direction.
- Respect the documented Core.Auth exception; its direct Identity-manager
  topology is not an Invoices violation.
- Check constructor changes together with DI registration, lifetime,
  architecture tests, and hosted-worker scopes.

## Exceptions, async, and cancellation

- Preserve exact layer classification, marker semantics, and required
  inner-exception identity.
- `OperationCanceledException` must not become a domain/dependency fault.
- Review token ownership, forwarding, retry termination, cleanup tasks, and
  no-later-call behavior.
- Flag `.Result`, `.Wait()`, unawaited tasks, fire-and-forget work, or blocking
  provider calls on reachable async paths.
- Endpoint cancellation and safe `ProblemDetails` belong to the shared
  mapping policy; raw exception details must not escape.

## Data, queue, and transport contracts

- Preserve partition and ownership discriminators through every layer.
- Review queue message ID/pop-receipt transitions, visibility ownership,
  persist/delete/enqueue order, logical attempt count, and duplicate/loss
  windows.
- DTOs and endpoint results must retain serialized names, nullability, status,
  safe projections, and supported consumer compatibility.
- Provider SDK records/types must not escape Broker mapping into domain or
  public contracts. When a current Broker contract lets a raw provider
  exception reach its direct Foundation consumer, Foundation owns classifying
  it; the provider exception must not escape above that boundary.

## Observability and performance

- Preserve Activity source/name/kind, parent context, safe tags, and
  source-generated logging where changed.
- Flag customer payload, OCR text, names, prompts, URLs, credentials, or raw
  provider responses added to telemetry.
- Review new per-item storage/provider calls, repeated serialization, broad
  scans, or sync-over-async on hot request/worker paths.

## Test evidence

Use architecture reflection for constructor direction, real DI resolution for
registration/lifetime, transport tests for serialized shape, controlled tokens
for cancellation, deterministic operation lists for queue order, and exact
exception assertions for classification. A direct-layer mock proves only
behavior owned by the real service under test.

Live authorities include `backend.md`, `minimal-apis.md`, C# guidance, API
architecture tests, and the .NET resources under the `code-*` skills.
