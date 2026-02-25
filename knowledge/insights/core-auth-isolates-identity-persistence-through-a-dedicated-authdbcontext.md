---
description: "Core.Auth owns AuthDbContext for identity storage, separate from the Invoices NoSQL broker — bounded contexts do not share database contexts"
type: decision
source: "docs/rfc/2001-domain-driven-design-architecture.md"
status: current
created: 2026-02-25
---

# Core.Auth isolates identity persistence through a dedicated AuthDbContext

The Core.Auth bounded context maintains its own `AuthDbContext` for identity persistence, completely separate from the Invoices domain's `IInvoiceNoSqlBroker` (which uses Cosmos DB). This data isolation is a deliberate architectural decision: authentication concerns (users, tokens, roles, claims) live in a different storage boundary from business domain data (invoices, merchants, products). The two contexts never share a database context or reach into each other's persistence layer.

Core.Auth exposes its capabilities through `AuthEndpoints.cs` for Minimal API exposure and registers its services through `WebApplicationBuilderExtensions.cs` in the `Modules/` directory. The auth service registration is invoked from the General domain's startup extensions (`builder.AddAuthServices()`), which means auth configuration flows through the infrastructure domain rather than being independently bootstrapped. This reflects the fact that authentication is a cross-cutting concern consumed by all bounded contexts but owned by Core.Auth.

The practical implication is that identity-related schema changes, migrations, or storage technology swaps (e.g., moving from SQL to a managed identity provider) can happen within Core.Auth without touching the Invoices domain. Conversely, changing the Invoices domain's Cosmos DB configuration has no impact on authentication. This isolation also means that in tests, the auth and invoice persistence layers can be mocked independently.

---

Related Insights:
- [[four-bounded-contexts-partition-the-backend-into-core-auth-invoices-and-common]] — foundation: the bounded context structure that enforces this isolation
- [[domain-configuration-registers-via-extension-methods-on-webapplicationbuilder]] — enables: how Core.Auth registers its services through the extension method pattern
- [[brokers-are-thin-wrappers-with-zero-business-logic]] — extends: AuthDbContext functions as the auth domain's broker-equivalent thin wrapper

Domains:
- [[backend-architecture]]
