---
description: Domain map for .NET 10, The Standard five-layer architecture, DDD, and backend conventions
type: moc
created: 2026-02-25
---

# backend architecture

Backend architecture for the arolariu.ro API (sites/api.arolariu.ro/). Built on .NET 10 ASP.NET Core Minimal APIs with Domain-Driven Design following The Standard methodology.

## Domain-Driven Design — RFC 2001

### Architecture Decisions

- [[backend-is-a-modular-monolith-not-microservices]] — microservices, CQRS+ES, and traditional layered architecture all rejected for current scale
- [[domain-events-are-implicit-through-service-layer-coordination-not-explicit-types]] — no explicit event classes; The Standard's layers handle workflow coordination instead
- [[core-auth-isolates-identity-persistence-through-a-dedicated-authdbcontext]] — bounded contexts never share database contexts

### Conventions

- [[four-bounded-contexts-partition-the-backend-into-core-auth-invoices-and-common]] — Core=infrastructure, Core.Auth=identity, Invoices=business, Common=shared abstractions
- [[ddd-folder-structure-mirrors-tactical-patterns-within-each-bounded-context]] — AggregatorRoots/, Entities/, ValueObjects/ alongside Services/ and Brokers/
- [[all-domain-entities-inherit-through-baseentity-to-namedentity-hierarchy]] — sealed concrete entities with init-only id via two-level abstract chain
- [[interface-segregation-splits-each-domain-into-four-service-layer-interfaces]] — I{Entity}NoSqlBroker, I{Entity}StorageFoundationService, I{Entity}OrchestrationService, I{Entity}ProcessingService
- [[backend-test-naming-follows-method-condition-expected-pattern]] — MethodName_Condition_ExpectedResult() with xUnit [Fact] and DisplayName

### Patterns

- [[invoice-is-the-primary-aggregate-root-owning-scans-payments-items-and-recipes]] — the central aggregate with rich owned state in the Invoices context
- [[merchant-is-a-referenced-entity-with-independent-lifecycle-not-owned-by-invoice]] — independent entity referenced by Invoice, not owned by it
- [[value-objects-in-the-invoices-domain-are-immutable-types-without-identity]] — PaymentInformation, Recipe, Allergen compared by value without id
- [[domain-configuration-registers-via-extension-methods-on-webapplicationbuilder]] — Add*DomainConfiguration() extension method pair for builder and app
- [[primary-constructors-implement-dependency-injection-at-every-service-layer]] — C# primary constructors enforce DIP with interface-typed parameters
- [[dtos-decouple-http-request-shapes-from-domain-aggregate-structure]] — CreateInvoiceDto.ToInvoice() at the endpoint boundary
- [[open-closed-principle-enables-extension-through-policies-and-additional-service-implementations]] — additive new capabilities via DI and policy registration
- [[endpoints-expose-only-processing-services-following-the-standard-exposer-pattern]] — Minimal API handlers inject only IProcessingService

### Constraints

- [[domain-and-application-layers-require-85-percent-test-coverage]] — infrastructure layer exempted, focus on domain and service layers

## Backend Observability -- RFC 2002

The backend uses OpenTelemetry for distributed tracing, structured logging, and metrics collection, exporting to Azure Application Insights.

### Architecture Decisions

- [[activity-sources-align-with-ddd-bounded-contexts-for-domain-scoped-tracing]] -- one ActivitySource per bounded context (Common, Core, Auth, Invoices) enables domain-scoped filtering and sampling
- [[azure-monitor-otlp-exporter-bridges-opentelemetry-to-application-insights]] -- vendor-neutral OTel APIs with Azure-specific exporter, avoiding Application Insights SDK lock-in
- [[source-generated-logging-eliminates-allocation-overhead-in-dotnet]] -- LoggerMessage source generators achieve less than 50ns per log call with compile-time validation
- [[managed-identity-replaces-connection-strings-for-telemetry-authentication]] -- DefaultAzureCredential in dev, Managed Identity in production, no secrets in code
- [[head-based-sampling-controls-trace-volume-in-production]] -- 1-10% sampling rate balances cost against observability coverage

### Patterns

- [[trycatch-pattern-integrates-activity-tracing-into-every-service-method]] -- The Standard's TryCatch wrapper couples error handling with automatic span lifecycle
- [[three-extension-methods-partition-telemetry-setup-by-signal-type]] -- AddOTelLogging/Metering/Tracing each configure one signal independently
- [[backend-auto-instrumentation-covers-aspnetcore-httpclient-and-efcore]] -- 90% of telemetry requires zero code changes via three instrumentation packages
- [[ioptions-manager-resolves-telemetry-endpoints-from-config-then-keyvault]] -- layered resolution: appsettings.json for dev, Key Vault for production
- [[activity-listener-with-shouldlistento-validates-traces-in-integration-tests]] -- in-memory trace capture for xUnit tests without external exporters

### Conventions

- [[nameof-convention-for-activity-names-ensures-refactoring-safety]] -- nameof(Method) instead of string literals for IDE rename propagation
- [[console-exporters-are-conditionally-compiled-for-debug-builds-only]] -- compile-time stripping via conditional compilation, not runtime disabling
- [[backend-metrics-rely-on-aspnetcore-and-httpclient-automatic-meters]] -- six standard OTel metrics with 60-second batch export

### Constraints and Gotchas

- [[telemetry-data-excludes-pii-through-redaction-and-secret-masking]] -- no PII in traces/logs, secrets referenced only by Key Vault URL
- [[dual-telemetry-runs-otel-alongside-legacy-application-insights-until-q2-2026]] -- dual SDK overhead until legacy is removed after OTel feature parity

### Cross-Stack

- [[frontend-and-backend-telemetry-converge-at-azure-application-insights]] -- both Next.js and .NET telemetry land in the same Application Insights workspace for full-stack correlation
- [[trace-context-must-propagate-across-the-bff-boundary-for-end-to-end-transaction-visibility]] -- W3C traceparent must flow from Next.js BFF to .NET API for distributed trace continuity

## The Standard Implementation — RFC 2003

This is the **core backend architecture RFC**. It defines the five-layer service hierarchy, dependency management rules, and flow-forward constraints that every backend service must follow.

### Architectural Foundation

- [[tri-nature-theory-grounds-the-standard-in-dependencies-purpose-and-exposure]] — the theoretical basis: Dependencies (Brokers), Purpose (Foundation/Processing/Orchestration), Exposure (Exposers)
- [[service-layers-flow-strictly-downward-in-the-standard]] — the central invariant: Exposers call Processing, Processing calls Orchestration, Orchestration calls Foundation, Foundation calls Brokers -- never sideways or upward
- [[the-florance-pattern-limits-each-service-to-two-or-three-dependencies]] — max 2-3 domain dependencies per service (logging/telemetry excluded)

### Layer Responsibilities

- [[brokers-are-thin-wrappers-with-zero-business-logic]] — bottom layer: Cosmos DB, AI services, translation wrapped with no validation or domain rules
- [[foundation-services-introduce-validation-and-business-language-to-broker-operations]] — broker-neighboring layer: structural/logical validation plus domain verb naming
- [[processing-services-perform-higher-order-logic-without-direct-broker-access]] — computational layer: enrichment, batch operations, collection manipulation
- [[orchestration-services-coordinate-multi-entity-workflows-across-processing-services]] — coordination layer: cross-entity flows like create-then-analyze-then-link
- [[endpoints-expose-only-processing-services-following-the-standard-exposer-pattern]] — protocol layer: HTTP mapping with no business logic

### Conventions

- [[business-language-maps-technical-crud-to-domain-verbs-in-every-service-layer]] — Insert/Select/Update/Delete become Create/Read/Update/Delete (planned migration to Add/Retrieve/Modify/Remove)
- [[each-layer-validates-its-own-inputs-independently]] — Brokers validate nothing, Foundation validates structure, Processing validates used-data only, Orchestration validates cross-entity, Exposers validate protocol
- [[partial-classes-split-services-into-implementation-validation-and-exception-files]] — services use 3 partial files (main, .Validations.cs, .Exceptions.cs)
- [[exposer-endpoints-split-across-four-partial-class-files-by-concern]] — endpoints use 4 partial files (routes, handlers, mappings, metadata)
- [[exception-naming-follows-entity-layer-category-convention-for-traceability]] — {Entity}{Layer}Service{Category}Exception naming pattern

### Error Handling

- [[three-tier-exception-classification-separates-validation-dependency-and-dependency-validation-failures]] — every layer wraps exceptions into Validation, Dependency, or DependencyValidation categories
- [[trycatch-pattern-integrates-activity-tracing-into-every-service-method]] — TryCatchAsync combines exception wrapping with OpenTelemetry Activity spans

### Testing

- [[interface-driven-design-enables-mock-based-unit-testing-at-every-layer]] — Pure Contracting: every service implements an interface enabling test doubles via Moq
- [[each-layer-mocks-only-the-layer-directly-below-for-test-isolation]] — Foundation mocks Brokers, Processing mocks Foundation, Orchestration mocks Processing, Exposers mock Processing

### Gotchas

- [[all-service-exceptions-currently-map-to-500-status-missing-proper-http-differentiation]] — all catch blocks return 500 InternalServerError regardless of exception category; ValidationException should be 400

## XML Documentation — RFC 2004

The backend enforces a comprehensive XML documentation standard that goes beyond typical C# comments, creating tutorial-level documentation serving IDE IntelliSense, DocFX, and Swagger/OpenAPI simultaneously. Documentation is treated as a first-class development artifact with build-time enforcement.

### Architecture Decisions

- [[xml-documentation-is-treated-as-first-class-code-not-an-afterthought]] -- documentation evolves with code, explaining the "why" for multiple audiences: developers, API consumers, and tooling
- [[cs1591-warnings-as-errors-enforces-xml-documentation-completeness-at-build-time]] -- the compiler enforces documentation coverage on all public/protected members, making it impossible to ship undocumented APIs

### Dependencies

- [[xml-documentation-feeds-intellisense-docfx-and-swagger-simultaneously]] -- a single XML doc comment serves three consumers: IDE tooltips, static documentation, and OpenAPI specs
- [[swashbuckle-maps-xml-summary-to-swagger-operation-descriptions-via-includexml-comments]] -- IncludeXmlComments bridges compiled XML to Swagger operation and parameter descriptions

### Patterns

- [[each-standard-layer-requires-distinct-xml-documentation-emphasizing-its-role]] -- documentation varies by layer: brokers document dependency abstraction, Foundation documents CRUD+validation, Orchestration documents coordination
- [[interface-docs-require-layer-role-responsibilities-list-and-implementation-references]] -- three-part interface template: Layer Role, responsibility bullets, and see cref links to implementations
- [[see-cref-cross-references-create-a-navigable-code-documentation-graph]] -- liberal <see cref> and <seealso cref> create a clickable navigation graph in IDEs and DocFX
- [[inheritdoc-propagates-base-documentation-while-allowing-layer-specific-overrides]] -- <inheritdoc/> avoids duplication across the DDD entity hierarchy with layer-specific <remarks> additions

### Conventions

- [[xml-summary-tags-are-capped-at-80-characters-matching-the-jsdoc-convention]] -- concise summaries balanced for IntelliSense, DocFX, and Swagger display widths
- [[xml-summaries-use-verb-first-phrasing-for-methods-and-descriptive-phrasing-for-types]] -- "Provides"/"Validates" for methods, "Represents"/"Foundation service" for types, "The [noun] to [verb]" for params
- [[remarks-tags-structure-context-into-labeled-bold-sections-for-scannable-documentation]] -- bold-labeled sections (Purpose, Architecture Context, Thread-safety, Design Rationale) create scannable doc blocks
- [[xml-remarks-must-reference-ddd-patterns-and-the-standard-layer-roles]] -- every class-level remarks block includes "Layer Role (The Standard)" and DDD pattern references
- [[method-remarks-must-document-behavior-validation-side-effects-and-idempotency]] -- methods require labeled sections for Behavior, Validation, Side Effects, and Idempotency
- [[param-tags-document-domain-constraints-not-just-parameter-types]] -- params specify valid/invalid ranges, null behavior, defaults, and cross-parameter dependencies
- [[enum-documentation-requires-sentinel-values-and-numeric-spacing-conventions]] -- enums document UNKNOWN=0 sentinel meaning, increment spacing, and analytics context
- [[value-object-documentation-must-specify-mutability-equality-semantics-and-thread-safety]] -- records require three labeled sections: Mutability, Equality, Thread-safety

### Constraints

- [[broker-documentation-must-not-describe-business-logic-only-dependency-abstraction]] -- broker docs must list what they do NOT do: no validation, no orchestration, no authorization
- [[xml-documentation-anti-patterns-prevent-signature-repetition-and-vague-summaries]] -- five banned anti-patterns: signature repetition, vague summaries, missing exceptions, implementation in summary, stale docs

## Key Source Documents

- RFC 2001: Domain-Driven Design Architecture
- RFC 2002: OpenTelemetry Backend Observability
- RFC 2003: The Standard Implementation
- RFC 2004: Comprehensive XML Documentation

## Tensions

- Domain events are handled implicitly through service layers, but future requirements (notifications, analytics reactions) may necessitate explicit domain event types — see [[domain-events-are-implicit-through-service-layer-coordination-not-explicit-types]]
- The three-tier exception classification exists in code but is invisible at the HTTP boundary because all exceptions map to 500 — see [[all-service-exceptions-currently-map-to-500-status-missing-proper-http-differentiation]]
- The Standard recommends Exposers depend on a single Processing service, but the arolariu.ro endpoints currently inject Processing directly (skipping Orchestration in the call chain from endpoint to service) — this is valid per The Standard but limits what the endpoint layer can coordinate

## Open Questions

- Should Merchant eventually be promoted to its own bounded context if merchant management complexity grows?
- When will explicit domain event types (e.g., InvoiceCreatedEvent) become necessary?
- When will the exception-to-HTTP-status mapping be refined? (see [[all-service-exceptions-currently-map-to-500-status-missing-proper-http-differentiation]])
- Should business language migration (Create/Read -> Add/Retrieve) be prioritized? (see [[business-language-maps-technical-crud-to-domain-verbs-in-every-service-layer]])
