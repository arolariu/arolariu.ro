# Backend OpenTelemetry Guide

Source-grounded guidance for tracing, metrics, and structured logging in
`sites/api.arolariu.ro`. RFC 2002 owns observability intent; live source under
`src/Common/Telemetry` and current tests own implementation behavior.

## Telemetry layers

| Concern | Current owner |
| --- | --- |
| Activity sources and generators | `src/Common/Telemetry/Tracing/ActivityGenerators.cs` |
| OpenTelemetry registration | `src/Common/Telemetry/Tracing/TracingExtensions.cs` |
| Shared semantic tag helpers | `src/Common/Telemetry/Tracing/ActivityExtensions.cs` |
| Metrics registration/helpers | `src/Common/Telemetry/Metering/` |
| Logging providers/enrichment | `src/Common/Telemetry/Logging/` |
| Invoices source-generated events | `src/Invoices/Modules/Log.cs` |
| Endpoint exception/cancellation results | `src/Common/Http/` and Invoices endpoint helpers |

ASP.NET Core, HTTP, database, and configured provider instrumentation supply
automatic spans. Manual Activities mark meaningful application, domain, and
provider boundaries.

## Activity source selection

Use the source for the bounded context that owns the operation:

- `CommonPackageTracing` for shared infrastructure;
- `CorePackageTracing` for host/runtime behavior;
- `AuthPackageTracing` for Core.Auth;
- `InvoicePackageTracing` for Invoices endpoints, Management, Processing,
  Orchestration, Foundation, and Brokers.

Do not create an ActivitySource per class or introduce a parallel tracing
abstraction.

## Invoices span flow

```text
ASP.NET Core request span
  -> Endpoint Activity
    -> Management Activity
      -> Processing Activity
        -> Orchestration Activity
          -> Foundation Activity
            -> Broker/provider Activity
```

The analysis worker starts from the queue message's propagated trace context
and follows the same Management entry path. A replacement message preserves
the logical correlation/trace contract while advancing the bounded attempt.

## Starting and completing an Activity

Use the live helper methods rather than hand-building duplicate tag keys:

```csharp
using var activity =
  InvoicePackageTracing.StartActivity(nameof(ReadInvoice), ActivityKind.Internal);

activity?
  .SetLayerContext("Management", nameof(InvoiceManagementService))
  .SetOperationType("CRUD.Read")
  .SetInvoiceContext(invoiceId, userId);

// Await the real operation with its caller-owned token.

activity?.RecordSuccess();
```

On an escaping failure, record the exception and set error status at the
boundary that owns the failure. Do not mark a normal client disconnect as a
server fault.

The current shared `ActivityExtensions.RecordException` writes exception type,
message, stack trace, and status description. Endpoint handlers use that
helper. This is live telemetry-privacy debt: do not treat the recorder as
redacted, and do not add new customer/provider-bearing exception messages
without a separately tested redaction change.

## Endpoint Activities

Invoices endpoint handlers:

- use `ActivityKind.Server`;
- add bounded operation and identifier context;
- invoke only `IInvoiceManagementService`;
- classify cancellation before general exceptions;
- return other failures through `ExceptionToHttpResultMapper`.

Write handlers use `RequestCancellation.ForWrite`; read handlers observe the
request token supplied by Minimal API binding. Do not copy payload fields,
amounts, product/merchant names, scan locations, prompts, or exception messages
into tags.

## Service and Broker Activities

Management through Foundation use internal Activities that identify the role,
component, operation, and bounded entity identifiers. Brokers may add
provider-neutral database/storage context such as operation, container, and
request charge.

Provider SDK instrumentation can add its own child spans. Preserve parent
context and avoid duplicating the same provider call at multiple manual
boundaries.

## Privacy and cardinality

Safe examples:

- operation and service role;
- invoice, merchant, user, correlation, message, or run identifiers where the
  established helper allows them;
- target enum, attempt, outcome, count, duration, and bounded status category;
- database system/container/operation and numeric request charge.

Do not add these values to new custom telemetry:

- OCR or scan content;
- product, merchant, or customer names;
- prompts or generated provider responses;
- scan URLs or request bodies;
- credentials, tokens, authorization headers, or connection strings;
- no additional raw exception details that can contain the above;
- unbounded user-controlled values as metric dimensions.

## Structured logging

Use source-generated logging declarations in the owning bounded-context module
for recurring events. Preserve stable event identifiers and bounded arguments.
Several current exception events accept `exception.Message`; treat that as
existing privacy debt rather than a safe pattern to extend.
Activities provide correlation; log messages should not duplicate payloads or
invent another correlation mechanism.

Use ordinary logging only when no existing generated event owns the behavior
and the call is not a hot recurring path.

## Metrics

Metrics use bounded operation/entity/outcome labels and avoid identifiers or
customer data as dimensions. Review both the instrument and every recording
site when changing a metric name, unit, or label set.

Health failures, endpoint outcomes, queue activity, and configuration refresh
have separate owners. Do not merge them only because they share a numeric
type.

## Testing

Use:

- `ActivityListener` for source/name/kind/parent/status/tag assertions;
- exact source-generated logging tests where event identity is contractual;
- in-memory meter collection for bounded metric labels/outcomes;
- endpoint privacy tests for forbidden tags and safe ProblemDetails;
- controlled queue trace context for worker continuity;
- no-op/listener-absent cases so telemetry never becomes required for business
  behavior.

Current anchors include:

- `InvoiceEndpointsTelemetryPrivacyTests.cs`;
- Activity assertions in
  `InvoiceProcessingServiceCurrentArchitectureTests.cs`;
- tracing/metering/logging tests under the API test projects;
- endpoint cancellation and timeout integration tests.

## Configuration

The API reads current telemetry configuration through its typed options and
registers OpenTelemetry from the Core builder. Azure export uses the configured
Application Insights connection endpoint; local Aspire injects OTLP endpoints
for the dashboard.

Derive endpoint/protocol values from live AppHost and application
configuration. Do not copy connection strings or assume an environment is
configured because a documentation example exists.

## References

- [RFC 2002](../rfc/2002-opentelemetry-backend-observability.md)
- [Distributed tracing reference](./distributed-tracing.md)
- [Event ID registry](./event-id-registry.md)
- `sites/api.arolariu.ro/src/Common/Telemetry/`
- `sites/api.arolariu.ro/src/Invoices/Modules/Log.cs`
