# Distributed Tracing Reference

End-to-end trace propagation from the Next.js website through the .NET API and
its external dependencies.

## Request flow

```text
Website Server Action / server helper
  -> fetchWithTimeout()
     injects W3C trace context
  -> ASP.NET Core request Activity
  -> Invoices Endpoint Activity
  -> InvoiceManagementService
  -> InvoiceProcessingService
  -> approved Orchestration
  -> capability Foundation
  -> Broker/provider SDK
```

`X-Request-Id` is an operator-friendly correlation field. It does not replace
W3C `traceparent`/`tracestate`, and it must not be treated as the parent span
contract.

## Website to API

The website's shared server transport helper injects current trace context and
uses the configured API base URL. Server Actions parse untrusted responses
before committing domain data.

The API's ASP.NET Core instrumentation extracts W3C headers and creates the
request Activity. HTTP client instrumentation propagates the current context
to downstream HTTP services.

## Invoices hierarchy

Each observable boundary starts an Activity from
`InvoicePackageTracing`:

```text
HTTP request
  -> Endpoint (ActivityKind.Server)
    -> Management
      -> Processing
        -> Orchestration
          -> Foundation
            -> Broker
              -> provider-native dependency span
```

The display names come from current method names. Do not hard-code a sample
method chain as the only valid trace; select the operation under investigation
from live source.

## Queue and worker continuation

Durable analysis messages carry provider-neutral correlation and trace
context. The worker:

1. receives the current queue delivery through Management;
2. starts consumer work with the propagated parent;
3. preserves correlation across visibility renewal;
4. persists successful work before deleting the current message;
5. advances the logical attempt when publishing failed-only replacement work.

Message ID/pop receipt identify a provider delivery; correlation ID identifies
logical work. Do not substitute one for the other in trace queries or logs.

## Activity sources

| Source | Boundary |
| --- | --- |
| `arolariu.Backend.Common` | Shared infrastructure |
| `arolariu.Backend.Core` | Host/runtime |
| `arolariu.Backend.Auth` | Core.Auth |
| `arolariu.Backend.Domain.Invoices` | Invoices endpoint and service graph |

The actual registrations are owned by
`src/Common/Telemetry/Tracing/TracingExtensions.cs`. Provider SDKs may register
additional sources; inspect current configuration before depending on one.

## Safe correlation context

Established helpers add bounded values such as:

- service layer/component and operation type;
- invoice, merchant, user, message, correlation, or analysis-run identifiers;
- database system/container/operation and numeric request charge;
- outcome, count, attempt, and duration.

Never attach OCR text, names, prompts, scan URLs, request bodies, credentials,
connection strings, authorization headers, or raw provider responses.

## Application Insights queries

Find one trace:

```kusto
union requests, dependencies, traces, exceptions
| where operation_Id == "<trace-id>"
| order by timestamp asc
```

Inspect Invoices layer timing:

```kusto
union requests, dependencies, traces
| where tostring(customDimensions["service.layer"]) != ""
| project timestamp,
          name,
          duration,
          success,
          operation_Id,
          layer=tostring(customDimensions["service.layer"]),
          operation=tostring(customDimensions["operation.type"])
| order by timestamp asc
```

Inspect Cosmos request charge only when the exporter emits the configured
numeric attribute:

```kusto
dependencies
| extend requestCharge =
    todouble(customDimensions["db.cosmosdb.request_charge"])
| where isnotnull(requestCharge)
| summarize average=avg(requestCharge),
            p95=percentile(requestCharge, 95),
            calls=count()
  by tostring(customDimensions["db.operation"]),
     tostring(customDimensions["db.cosmosdb.container"])
```

Schema/table placement can differ with exporter configuration. Validate a
query against current telemetry before committing it to an alert or dashboard.

## Verification

Current trace evidence should prove:

- one trace ID across website, API, and downstream calls;
- the Endpoint -> Management -> Processing hierarchy;
- correct parentage for worker-consumed queue work;
- no duplicate manual span around one provider operation;
- cancellation status distinguishes timeout from client disconnect;
- no sensitive or unbounded customer data appears in tags/logs.

See [RFC 2002](../rfc/2002-opentelemetry-backend-observability.md) and the
[OpenTelemetry guide](./opentelemetry-guide.md).
