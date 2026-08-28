# ASP.NET Core Minimal APIs Reference Catalog

Owner: `.github/instructions/backend.instructions.md`. This catalog holds
repository-specific Minimal API protocol examples, edge cases, and rationale
for `sites/api.arolariu.ro`. It does not define an implementation workflow,
service-layer architecture, test-selection procedure, build command, or
authentication-policy change.

## Endpoint adapter boundary

Invoices endpoints depend on `IInvoiceManagementService`. They own HTTP
binding, caller context, DTO conversion, cancellation classification,
protocol results, and endpoint telemetry; business sequencing belongs behind
Management. The full Standard graph remains in `backend.md`.

Core.Auth is a deliberate security-sensitive exception whose endpoints use
ASP.NET Core Identity managers directly. That topology is not a precedent for
Invoices and any auth behavior change remains an escalation.

## Current partial-class anatomy

| File | Current responsibility |
| --- | --- |
| `InvoiceEndpoints.cs` | Public registration entry and route grouping |
| `InvoiceEndpoints.Mappings.cs` | Verbs, paths, media types, policies, names, timeouts, and route-builder metadata |
| `InvoiceEndpoints.Metadata.cs` | Handler signatures, binding attributes, XML docs, and Swagger annotations |
| `InvoiceEndpoints.Handlers.cs` | Management calls, DTO projection, protocol branches, Activities, and `TypedResults` |
| `InvoiceEndpoints.Internals.cs` | Shared endpoint-only cancellation and principal helpers |

This is the current organization, not a requirement that every bounded
context create every partial file.

## Route, binding, and metadata contract

Keep the mapping and handler surfaces aligned:

- `MapGroup` and `MapGet`/`MapPost`/`MapPut`/`MapPatch`/`MapDelete` own the
  public verb/path;
- route/query/body binding and `[FromServices]` must match the handler
  signature;
- `.Accepts`, `.Produces*`, `.WithName`, authorization, rate limits, and
  request-timeout metadata must describe reachable outcomes;
- Swagger annotations in `InvoiceEndpoints.Metadata.cs` are a second
  declaration surface and can drift from route-builder metadata;
- public URI versioning is a protocol contract and must not be changed as
  incidental cleanup.

Minimal API binds a handler `CancellationToken` from request cancellation.
That natural binding is appropriate for reads; writes use the repository's
separate write-scope policy described below.

## Request and response mapping

Map transport DTOs into domain inputs before calling Management, then project
domain results into caller-safe response DTOs. Never return provider records,
lower-layer exceptions, or internal ownership fields.

Use typed results that match the observable contract:

- `Created` includes the stable resource location for a completed create;
- `Accepted` represents queued or accepted work and its response body/location
  must remain compatible with consumers;
- `Ok`, `NoContent`, `NotFound`, `Forbid`, and `Conflict` remain distinct;
- an empty collection is not automatically a missing single resource;
- owner/superuser projections must not leak fields unavailable to the caller.

Some current handlers coordinate more than one Management call. Treat that as
live behavior to preserve, not a template for new endpoint-owned business
sequencing.

## ProblemDetails and global fallback

Endpoint handlers classify cancellation before general exceptions. General
exceptions flow through
`sites/api.arolariu.ro/src/Common/Http/ExceptionToHttpResultMapper.cs`, which
walks the inner chain for the deepest classifiable marker and emits safe RFC
7807 `ProblemDetails`.

Do not hand-write another endpoint status switch or expose
`exception.Message`, provider details, stack traces, or raw type names in a
server-error response. The shared mapper owns safe status/title/type/detail
selection and trace correlation.

The global exception handler is defense in depth for failures that escape or
occur outside endpoint handlers. It does not replace endpoint-owned
cancellation classification or authorize a second mapping table.

## Cancellation and request timeouts

Reads observe `HttpContext.RequestAborted` through Minimal API binding. Writes
deliberately avoid abandoning a mutation solely because the client
disconnects; `RequestCancellation` combines application shutdown with an
explicit write budget.

When an endpoint catches cancellation:

- request-timeout cancellation maps to 504;
- client disconnect can map to the repository's 499 result;
- host/application cancellation continues to obey its owning boundary;
- no later mutation or retry should run after the owned token cancels.

Review the route timeout policy and handler write budget together. Dedicated
analysis timeout definitions exist, while current analysis routes/handlers
still use CRUD policy/budget values. This is live drift, not a pattern, and
changing it alters observable protocol behavior.

## Live drift, not templates

- Route-builder metadata and Swagger attributes are separate declaration
  surfaces and currently do not enumerate every result the shared mapper or
  cancellation handler can produce.
- Several Swagger descriptions use authorization wording for 401 and
  unauthenticated wording for 403, opposite the shared mapper's current
  meanings. Verify status semantics from live code rather than copying text.
- `IsPrincipalSuperUser` currently returns `true` as an explicitly documented
  placeholder. Never use it as an authorization exemplar or expose new
  admin-tier behavior through it; changing it is security work.
- Some existing handlers coordinate multiple Management calls. Preserve
  established behavior when touched, but do not make endpoint-owned business
  sequencing the default for new work.

## Endpoint observability and privacy

Endpoint Activities own the HTTP/application adapter span and use bounded
operation, identifier, count, and result attributes. Internal service
Activities and their safe domain tags remain documented in `backend.md` and
the `backend-vertical-slice` telemetry resource.

Never attach request bodies, OCR text, product or merchant names, prompts,
scan URLs, provider responses, credentials, authorization headers, or raw
exception details to endpoint telemetry. Cancellation caused by the client is
not automatically a server failure.

## Protocol evidence anchors

- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Integration/InvoiceEndpointsStatusCodeTests.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Integration/EndpointCancellationTests.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Integration/RequestTimeoutBehaviourTests.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Endpoints/MerchantCollectionAuthorizationTests.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Integration/InvoiceEndpointsTelemetryPrivacyTests.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/DTOs/InvoiceResponseTransportContractTests.cs`

These paths identify current protocol contracts. Test selection and authoring
procedures remain in `backend-vertical-slice` and `code-unit-test`.

## Protocol anti-patterns

| Anti-pattern | Correction |
| --- | --- |
| Endpoint injects Processing, Foundation, or a Broker | Preserve the Management adapter boundary described in `backend.md` |
| Endpoint maps exceptions from only the outer wrapper | Use the shared deepest-classifiable mapper |
| General failure returns raw exception text | Emit safe `ProblemDetails` only |
| Mapping metadata and Swagger annotations disagree | Align both declaration surfaces with reachable handler results |
| Reads and writes share one cancellation policy | Preserve request-abort reads and bounded write ownership |
| Request/customer content becomes an Activity tag | Keep only approved bounded context |
| Core.Auth direct Identity injection is copied into Invoices | Treat Core.Auth as the documented exception, not a template |
| Existing multi-call handler coordination is copied into new work | Put new business sequencing behind Management |

## Live inspection pointers

- `sites/api.arolariu.ro/src/Invoices/Endpoints/InvoiceEndpoints.cs`
- `sites/api.arolariu.ro/src/Invoices/Endpoints/InvoiceEndpoints.Mappings.cs`
- `sites/api.arolariu.ro/src/Invoices/Endpoints/InvoiceEndpoints.Metadata.cs`
- `sites/api.arolariu.ro/src/Invoices/Endpoints/InvoiceEndpoints.Handlers.cs`
- `sites/api.arolariu.ro/src/Invoices/Endpoints/InvoiceEndpoints.Internals.cs`
- `sites/api.arolariu.ro/src/Common/Http/ExceptionToHttpResultMapper.cs`
- `sites/api.arolariu.ro/src/Common/Http/ExceptionMappingHandler.cs`
- `sites/api.arolariu.ro/src/Common/Http/RequestCancellation.cs`
- `sites/api.arolariu.ro/src/Core/Domain/General/Extensions/WebApplicationExtensions.cs`

Reopen live source before using any route, result, timeout, metadata, or
telemetry example.
