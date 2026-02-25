---
description: "Insert becomes Create/Add, Select becomes Read/Retrieve, Update becomes Modify, Delete becomes Remove -- currently using CRUD verbs with planned migration to stronger domain terms"
type: convention
source: "docs/rfc/2003-the-standard-implementation.md"
status: current
created: 2026-02-25
---

# Business language maps technical CRUD to domain verbs in every service layer

The Standard requires that service method names use domain terminology rather than database-level CRUD verbs. The mapping replaces technical terms with business equivalents: Insert becomes Add, Select becomes Retrieve, Update becomes Modify, Delete becomes Remove. This is not cosmetic -- it forces developers to think in terms of business operations rather than persistence mechanics, and it makes the codebase readable to domain experts who do not know SQL.

In the arolariu.ro backend, Foundation services currently use hybrid names: `CreateInvoiceObject`, `ReadInvoiceObject`, `UpdateInvoiceObject`, `DeleteInvoiceObject`. These are acceptable domain-neutral terms under The Standard's flexibility, but the RFC explicitly plans a future refinement toward stronger business language: `AddInvoice`, `RetrieveInvoice`, `ModifyInvoice`, `RemoveInvoice`. The Broker layer uses direct persistence verbs (`CreateInvoiceAsync`, `ReadInvoiceAsync`) because Brokers are pure data access with no business language expectation.

The business language convention applies at every layer above Brokers. Processing services name methods after the higher-order operation (`AnalyzeInvoice`, `AddProduct`, `GetProducts`) rather than the persistence action they delegate to. This creates a natural vocabulary gradient: Brokers speak database, Foundation speaks domain CRUD, Processing speaks business operations, and Exposers speak HTTP.

---

Related Insights:
- [[foundation-services-introduce-validation-and-business-language-to-broker-operations]] -- foundation: Foundation is where business language first appears
- [[brokers-are-thin-wrappers-with-zero-business-logic]] -- contrast: Brokers use raw persistence verbs, not business language
- [[endpoints-expose-only-processing-services-following-the-standard-exposer-pattern]] -- extends: Exposers map HTTP verbs (POST, GET) to business method names

Domains:
- [[backend-architecture]]
