---
description: "Integration tests register an ActivityListener filtering on 'arolariu.Backend' source prefix, capturing started activities into a list for assertion without external exporters"
type: pattern
source: "docs/rfc/2002-opentelemetry-backend-observability.md"
status: current
created: 2026-02-25
---

# ActivityListener with ShouldListenTo validates traces in integration tests

The backend tests its tracing instrumentation by registering a `System.Diagnostics.ActivityListener` that captures activities in-memory rather than exporting them to Azure Monitor. The listener's `ShouldListenTo` delegate filters on the `arolariu.Backend` name prefix, ensuring only domain-relevant activities are captured. The `Sample` delegate returns `ActivitySamplingResult.AllData` to guarantee every matching activity is fully recorded, overriding any production sampling configuration.

This testing pattern enables assertions like `Assert.Contains(activities, a => a.DisplayName == nameof(CreateInvoice))` -- verifying that a service method produces the expected span without needing a running Application Insights instance or OTLP collector. The test is self-contained and runs in the unit test framework (xUnit), making it suitable for CI pipelines.

The approach validates the contract between business code and the observability layer: if a developer removes a `StartActivity` call from a service method, the test fails. This catches instrumentation regressions that would otherwise only be noticed when production dashboards go silent. Since [[trycatch-pattern-integrates-activity-tracing-into-every-service-method]], every service method should produce an activity, and this testing pattern can enforce that expectation systematically.

The frontend's telemetry testing strategy described in [[integration-tests-validate-type-safe-telemetry-attributes-at-runtime]] uses a similar in-memory capture approach but through the OpenTelemetry SDK's `InMemorySpanExporter`. The backend uses the lower-level `ActivityListener` API because .NET's `System.Diagnostics.Activity` is the native tracing primitive, and the listener integrates more naturally with xUnit's test lifecycle.

---

Related Insights:
- [[trycatch-pattern-integrates-activity-tracing-into-every-service-method]] — foundation: the pattern being validated by these tests
- [[activity-sources-align-with-ddd-bounded-contexts-for-domain-scoped-tracing]] — enables: ShouldListenTo filters on the domain source names
- [[integration-tests-validate-type-safe-telemetry-attributes-at-runtime]] — extends: frontend equivalent using InMemorySpanExporter

Domains:
- [[backend-architecture]]
