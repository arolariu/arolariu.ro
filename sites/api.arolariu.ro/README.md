# api.arolariu.ro

The backend is a .NET Minimal API modular monolith. Root `AGENTS.md` owns
repository-wide versions, commands, safety, and testing policy;
[`AGENTS.md`](./AGENTS.md) owns the API-specific architecture contract.

## Architecture

### Bounded contexts

| Context | Responsibility |
| --- | --- |
| `Core` | Host composition, middleware, health, OpenAPI, and runtime configuration |
| `Core.Auth` | ASP.NET Core Identity endpoints and persistence |
| `Invoices` | Invoice, merchant, product, scan, metadata, and analysis behavior |
| `Common` | Shared HTTP, exception, telemetry, and DDD primitives |

Invoices implements the complete flow-forward chain:

```text
Endpoints / AnalysisWorker
  -> InvoiceManagementService
    -> InvoiceProcessingService
      -> approved Orchestration services
        -> capability Foundation services
          -> Brokers
```

- Endpoints and the analysis worker consume only
  `IInvoiceManagementService`.
- Management exposes application use cases and delegates to the unified
  Processing boundary.
- Processing owns computation, workflow sequencing, persistence order, and
  durable analysis policy.
- Orchestration composes approved Foundation capabilities.
- Foundation validates capability inputs and classifies direct Broker
  failures.
- Brokers wrap provider SDKs and map provider records into provider-neutral
  contracts; they contain no business logic.
- Services follow the root direct-domain collaborator budget;
  framework/support dependencies do not count.

Core.Auth is a deliberate exception. Framework-owned routes are registered
through `MapIdentityApi`, while the custom logout handler uses
`SignInManager<IdentityUser>` directly. It does not have the Invoices
Management/Processing/Orchestration/Foundation hierarchy.

See:

- [`docs/rfc/2001-domain-driven-design-architecture.md`](../../docs/rfc/2001-domain-driven-design-architecture.md)
- [`docs/rfc/2003-the-standard-implementation.md`](../../docs/rfc/2003-the-standard-implementation.md)
- [`docs/backend/the-standard-guide.md`](../../docs/backend/the-standard-guide.md)

## Minimal API boundary

Invoices routes are grouped under `/rest/v1`. The endpoint partials separate
mapping, metadata, handlers, and endpoint-only helpers:

| File | Responsibility |
| --- | --- |
| `src/Invoices/Endpoints/InvoiceEndpoints.cs` | Route registration entry point |
| `InvoiceEndpoints.Mappings.cs` | Verbs, paths, policies, timeouts, and route-builder metadata |
| `InvoiceEndpoints.Metadata.cs` | Binding signatures, XML docs, and Swagger annotations |
| `InvoiceEndpoints.Handlers.cs` | Management calls, DTO projection, protocol results, and endpoint Activities |
| `InvoiceEndpoints.Internals.cs` | Cancellation and principal helpers |

Endpoint handlers catch cancellation before general exceptions. Reads observe
request cancellation; writes use an application-owned timeout/shutdown scope.
Other failures flow through the shared `ExceptionToHttpResultMapper`, which
returns safe RFC 7807 responses without leaking provider or internal exception
details.

The global `ExceptionMappingHandler` is defense in depth for failures that
escape endpoint handlers or occur earlier in the pipeline.

## Local development

Aspire is the default full-stack mode:

```powershell
npm run dev -- --engine rancher
npm run dev -- --engine podman
```

Use the standalone API only when full-stack orchestration is unnecessary:

```powershell
npm run dev:api
```

Direct build from the repository root:

```powershell
dotnet build sites/api.arolariu.ro/src/Core
```

The current root command contract and local orchestration details are in:

- [`../../AGENTS.md`](../../AGENTS.md)
- [`../../infra/Local/readme.md`](../../infra/Local/readme.md)

## HTTP and OpenAPI

In the standard local configuration:

| Surface | Location |
| --- | --- |
| API | `http://localhost:5000` |
| Swagger UI | `http://localhost:5000/` |
| Swagger document | `/swagger/v1/swagger.json` |
| Microsoft OpenAPI document | `/openapi/v1.json` |
| Health | `/health` |

Derive deployed URLs and route inventories from live configuration and source;
do not treat this table as an exhaustive endpoint catalog.

## Tests

The API test projects use MSTest:

```powershell
dotnet test sites/api.arolariu.ro/tests/arolariu.Backend.Core.Tests/arolariu.Backend.Core.Tests.csproj
dotnet test sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/arolariu.Backend.Domain.Tests.csproj
```

Tests use `Method_Condition_Expected` names, deterministic builders, and exact
exception classification where contractual. Focused service tests substitute
the real service's direct injected dependency contracts; broader integration,
transport, DI, and architecture tests keep the repository boundary under test
real.

Important contract suites include:

- Invoices constructor/dependency architecture;
- endpoint status, cancellation, and timeout behavior;
- transport DTO serialization;
- queue order and visibility ownership;
- provider mapping and contract-owned exception translation;
- telemetry privacy and trace continuity.

The Postman/Newman collection under this project covers deployed HTTP
contracts. Invoke it through the root E2E command so the current environment
and safety controls are applied.

## Persistence and external systems

- SQL Server stores ASP.NET Core Identity data.
- Cosmos DB stores invoice and merchant documents.
- Azure Blob Storage/Azurite stores invoice scans.
- Azure Queue Storage/Azurite carries durable analysis messages.
- Document Intelligence, generative AI, and taxonomy providers are isolated
  behind Brokers.

Partition selection and provider calls remain in Brokers. Ownership
discriminators flow unchanged through Management, Processing, Orchestration,
and Foundation.

## Observability

The API uses OpenTelemetry Activities, metrics, and source-generated logging.
ASP.NET Core and HTTP/database dependencies provide automatic instrumentation;
the Invoices layers add bounded operation, entity identifier, outcome, and
service-layer context.

Never add OCR text, product or merchant names, prompts, scan URLs, credentials,
authorization headers, raw provider responses, or customer payloads to
telemetry. The current shared exception recorder still emits exception
type/message/stack; treat that as existing privacy debt rather than a safe
pattern to extend.

See:

- [`docs/rfc/2002-opentelemetry-backend-observability.md`](../../docs/rfc/2002-opentelemetry-backend-observability.md)
- [`docs/backend/opentelemetry-guide.md`](../../docs/backend/opentelemetry-guide.md)
- [`docs/backend/distributed-tracing.md`](../../docs/backend/distributed-tracing.md)

## Documentation

Public C# APIs require useful XML documentation. The compiler emits XML files
and treats warnings as errors. The documentation pipeline invokes the
repository-local DefaultDocumentation tool and publishes generated Markdown
through the Docusaurus site; generated output is not edited by hand.

See [`docs/rfc/2004-comprehensive-xml-documentation-standard.md`](../../docs/rfc/2004-comprehensive-xml-documentation-standard.md).
