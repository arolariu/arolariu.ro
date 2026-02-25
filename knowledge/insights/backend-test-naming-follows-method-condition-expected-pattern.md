---
description: "All backend tests use MethodName_Condition_ExpectedResult() naming with xUnit [Fact] attributes and DisplayName for readability"
type: convention
source: "docs/rfc/2001-domain-driven-design-architecture.md"
status: current
created: 2026-02-25
---

# Backend test naming follows Method_Condition_Expected pattern

Every backend test method follows the strict naming convention `MethodName_Condition_ExpectedResult()` — for example, `CreateInvoice_WithValidData_ReturnsSuccessResult()` or `CreateInvoice_WithEmptyProducts_ThrowsArgumentException()`. This three-part name makes the test's intent immediately clear without reading the body: what is being tested, under what conditions, and what should happen.

Tests use xUnit's `[Fact]` attribute with a `DisplayName` parameter that provides a human-readable description (e.g., `"Invoice creation succeeds with valid data"`). The test body follows Arrange-Act-Assert (AAA) structure with explicit comment markers for each section. This combination of structured naming, display names, and AAA sections means test reports are readable by non-developers and test failures point directly to the broken invariant. The convention applies across all bounded contexts — both domain logic tests and integration tests.

---

Related Insights:
- [[domain-and-application-layers-require-85-percent-test-coverage]] — constraint: the coverage target these tests must meet
- [[invoice-is-the-primary-aggregate-root-owning-scans-payments-items-and-recipes]] — example: the primary entity under test

Domains:
- [[backend-architecture]]
- [[cross-cutting]]
