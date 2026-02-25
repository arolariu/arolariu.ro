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

## Key Source Documents

- RFC 2001: Domain-Driven Design Architecture
- RFC 2002: OpenTelemetry Backend Observability
- RFC 2003: The Standard Implementation
- RFC 2004: Comprehensive XML Documentation

## Tensions

- Domain events are handled implicitly through service layers, but future requirements (notifications, analytics reactions) may necessitate explicit domain event types — see [[domain-events-are-implicit-through-service-layer-coordination-not-explicit-types]]

## Open Questions

- What are the specific Florance Pattern violations to watch for?
- Should Merchant eventually be promoted to its own bounded context if merchant management complexity grows?
- When will explicit domain event types (e.g., InvoiceCreatedEvent) become necessary?
