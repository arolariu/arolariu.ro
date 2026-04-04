# Distributed Tracing Reference

> End-to-end trace context propagation from Next.js frontend to .NET backend to Azure services.

## Trace Flow Overview

```
Next.js Server Action (withSpan)
  │ fetchWithTimeout() → injectTraceContextHeaders()
  │   ├── traceparent: 00-{traceId}-{spanId}-01
  │   ├── tracestate: (empty)
  │   └── X-Request-Id: {traceId}
  ▼
ASP.NET Core API
  │ AddAspNetCoreInstrumentation() auto-extracts traceparent
  │ Creates Activity with same traceId
  │ Enriches: http.request.id, enduser.id, http.client.ip
  │ Adds baggage: enduser.id (propagated downstream)
  │
  ├── InvoiceProcessingService.CreateInvoice    (child span)
  │   └── InvoiceOrchestrationService           (grandchild span)
  │       └── InvoiceStorageFoundationService   (great-grandchild span)
  │           └── InvoiceNoSqlBroker            (great-great-grandchild span)
  │               ├── Cosmos DB SDK (native OTel spans via Azure.Cosmos.Operation)
  │               └── Tags: db.system, db.operation, db.cosmosdb.request_charge
  │
  ├── HttpClient → Azure Form Recognizer       (child span, traceparent auto-injected)
  ├── HttpClient → Azure OpenAI                (child span, traceparent auto-injected)
  └── HttpClient → Azure Translator            (child span, traceparent auto-injected)
  │
  ▼
Azure Monitor / Application Insights
  All spans share the same traceId for end-to-end correlation
```

## W3C Header Propagation

| Hop | Header | Auto-Injected? | Mechanism |
|-----|--------|----------------|-----------|
| Frontend → Backend | `traceparent` | ✅ | `propagation.inject()` in `injectTraceContextHeaders()` |
| Frontend → Backend | `X-Request-Id` | ✅ | Fallback correlation ID = traceId |
| Backend receives | `traceparent` | ✅ | `AddAspNetCoreInstrumentation()` auto-extracts |
| Backend → Azure OpenAI | `traceparent` | ✅ | `AddHttpClientInstrumentation()` auto-injects |
| Backend → Form Recognizer | `traceparent` | ✅ | `AddHttpClientInstrumentation()` auto-injects |
| Backend → Cosmos DB | SDK-internal | ✅ | `CosmosClientTelemetryOptions.DisableDistributedTracing = false` |

## Backend Service Layer Hierarchy

Each layer calls `InvoicePackageTracing.StartActivity(nameof(Method))`. The .NET `Activity` API automatically parents via `Activity.Current`, forming a child chain:

```
HTTP GET /rest/v1/invoices (ASP.NET Core root span)
  └── CreateInvoice (Processing — service.layer=Processing)
      └── CreateInvoiceObject (Orchestration — service.layer=Orchestration)
          └── CreateInvoiceObject (Foundation — service.layer=Foundation)
              └── CreateInvoiceAsync (Broker — service.layer=Broker)
                  ├── db.system=cosmosdb, db.operation=create
                  ├── db.cosmosdb.request_charge=5.2
                  └── Azure.Cosmos.Operation (SDK-native span)
```

## ActivitySource Registry

| ActivitySource Name | Bounded Context | Registered In |
|---------------------|-----------------|---------------|
| `arolariu.Backend.Common` | Common infrastructure | `TracingExtensions.cs` |
| `arolariu.Backend.Core` | Core API | `TracingExtensions.cs` |
| `arolariu.Backend.Auth` | Authentication | `TracingExtensions.cs` |
| `arolariu.Backend.Domain.Invoices` | Invoice domain | `TracingExtensions.cs` |
| `Azure.Cosmos.Operation` | Cosmos DB SDK | `TracingExtensions.cs` |

## Querying Traces in Application Insights (KQL)

### Find end-to-end trace by operation
```kql
union requests, dependencies, traces
| where operation_Id == "<traceId>"
| order by timestamp asc
| project timestamp, itemType, name, duration, success, resultCode,
          customDimensions["service.layer"],
          customDimensions["db.operation"],
          customDimensions["db.cosmosdb.request_charge"]
```

### Find slow invoice operations (>2s)
```kql
requests
| where name contains "invoices"
| where duration > 2000
| project timestamp, name, duration, operation_Id, resultCode
| order by duration desc
| take 50
```

### Cosmos DB RU consumption by operation type
```kql
dependencies
| where type == "Azure DocumentDB" or customDimensions["db.system"] == "cosmosdb"
| summarize avg_ru=avg(todouble(customDimensions["db.cosmosdb.request_charge"])),
            p95_ru=percentile(todouble(customDimensions["db.cosmosdb.request_charge"]), 95),
            count=count()
  by tostring(customDimensions["db.operation"]),
     tostring(customDimensions["db.cosmosdb.container"])
| order by avg_ru desc
```

### Frontend-to-backend trace correlation
```kql
requests
| where customDimensions["service.namespace"] == "arolariu.ro"
| where isnotempty(operation_Id)
| join kind=inner (
    dependencies
    | where customDimensions["cloud.role"] == "api"
) on operation_Id
| project timestamp, 
          frontend_name=name, 
          backend_name=name1, 
          total_duration=duration + duration1,
          operation_Id
| order by total_duration desc
| take 20
```

### Failed traces with full span tree
```kql
requests
| where success == false
| project operation_Id, name, duration, resultCode, timestamp
| join kind=inner (
    union requests, dependencies, traces, exceptions
    | project operation_Id, itemType, name, message, timestamp
) on operation_Id
| order by timestamp asc
```

### User-specific traces (via baggage propagation)
```kql
union requests, dependencies
| where customDimensions["enduser.id"] == "<userId>"
| order by timestamp desc
| take 100
```

## Span Enrichment Reference

### Automatic (ActivityEnrichingProcessor)
Every span receives: `correlation.id`, `root.trace_id`, `parent.span_id`, `span.depth`, `environment.name`, `host.name`, `process.id`, `thread.id`, `start.timestamp_utc`, `duration.ms`, `display.name`, and any `baggage.*` items.

### ASP.NET Core Request Spans
`http.request.id`, `http.client.ip`, `enduser.id`, `http.response.content_length`.

### Broker Layer Spans
`service.layer`, `service.component`, `operation.type`, `db.system`, `db.name`, `db.operation`, `db.cosmosdb.container`, `db.cosmosdb.partition_key`, `db.cosmosdb.request_charge`, `db.statement`, `db.query.type`.

### Domain Context
`invoice.id`, `invoice.user_id`, `invoice.merchant_id`, `merchant.id`, `user.id`.
