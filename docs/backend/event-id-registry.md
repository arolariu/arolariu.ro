# Backend Event ID Reference

The source-generated `[LoggerMessage]` declarations are the authoritative
event registry. This document explains ownership and review rules without
copying a volatile event-by-event inventory.

## Live owners

| Area | Source owner |
| --- | --- |
| Common configuration/telemetry | `sites/api.arolariu.ro/src/Common/**/Log.cs` and logging extension files |
| Core host/middleware/health | `sites/api.arolariu.ro/src/Core/**/Log.cs` |
| Core.Auth | `sites/api.arolariu.ro/src/Core.Auth/**/Log.cs` |
| Invoices | `sites/api.arolariu.ro/src/Invoices/Modules/Log.cs` |

Search those declarations before assigning a new identifier:

```text
[LoggerMessage(<event-id>, <level>, "<message template>")]
```

Do not choose an identifier from this document alone.

## Current Invoices range conventions

The Invoices log module groups established families by broad role:

| Prefix family | Current use |
| --- | --- |
| `100_xxx` | Foundation/capability failures |
| `200_xxx` | Orchestration failures |
| `300_xxx` | Processing, worker, queue, and durable-analysis events |
| `400_xxx` | Classifier/generative-provider events |
| `500_xxx` | Management classification |
| `600_xxx` | Provider call lifecycle |
| `900_xxx` | Shared validation warnings |

These are conventions observed in the live module, not reserved global
numeric ranges. Confirm uniqueness across all compiled `[LoggerMessage]`
declarations before adding an event.

## Adding or changing an event

1. Use the log module owned by the bounded context/component.
2. Reuse an existing declaration when the semantic event is identical.
3. Select an unused identifier near related current events.
4. Keep the template stable and arguments bounded.
5. Update tests or operational queries when event identity is contractual.
6. Search the complete backend for the identifier before completion.

Changing an event ID can break alerts, dashboards, and log queries. Treat a
renumber as an observable contract change rather than formatting cleanup.

## Privacy and cardinality

Safe arguments are bounded operation, layer, target, outcome, reason category,
attempt/count, duration, and approved identifiers.

For new or changed events, do not add:

- OCR/scan/request payloads;
- product, merchant, or customer names;
- prompts or provider responses;
- credentials, tokens, connection strings, or authorization headers;
- new raw exception messages when they can contain customer/provider data.
  Existing generated exception events that accept `exception.Message` are live
  privacy debt and are not safe exemplars;
- unbounded values used as metric dimensions.

## Source-generated logging

Prefer source-generated declarations for recurring or hot-path events. They
provide:

- compile-time template/argument validation;
- stable event identity;
- lower allocation overhead;
- one discoverable owner for message text and level.

Do not add a parallel ad hoc log with the same semantic event at another layer.
Activities carry trace correlation; logs should not invent another correlation
scheme.

## Metrics are separate

Metric instrument names and label contracts are owned by the current metering
source under `src/Common/Telemetry/Metering` and Invoices metrics helpers.
They are not event IDs and should not be copied into this registry.

See [RFC 2002](../rfc/2002-opentelemetry-backend-observability.md) and the
[OpenTelemetry guide](./opentelemetry-guide.md).
