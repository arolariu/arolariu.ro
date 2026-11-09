# Tooling local guide

[Root AGENTS.md](../AGENTS.md) owns repository-wide versions, safety, coding, testing, and Git policy. [README.md](README.md) owns tooling
commands, layout, package policy, and debugger entry points. This guide adds only local ownership and preservation boundaries.

## Capability ownership

- `src\AppHost\LocalApplication.cs` owns native composition and cross-capability wiring. Resource slices configure only their own resources;
  graph tests call production composition, while the isolated native fixture shares only the wait graph.
- `src\LocalDevelopment.Data` owns scenario validation, materialization, initialization, and provider operations without Aspire
  dependencies. `NoSqlDataProvider`, `SqlDataProvider`, and `StorageDataProvider` are stateless static capability entry points; the NoSQL
  implementation still uses Cosmos DB.
- `src\LocalDevelopment.Common` owns provider-neutral retry contracts, named-policy lookup, execution, and HTTP/network classification in
  `Http\Resilience`, with no package or project dependencies. Data owns SDK-specific policy configuration in `LocalDataRetryPolicies`.
- `src\LocalDevelopment.Bootstrap` owns the guarded command, cancellation, SDK client lifetime, and canonical seed fixture packaging.
- `src\LocalDevelopment.Identity` owns local persona/token behavior.
- Neither helper references AppHost or the other helper.
- AppHost and Bootstrap may reference Data; AppHost and Data use Common. Identity remains independent.
- Data owns clear/restore SDK operations and schema restoration, not authorization. AppHost retains reset confirmation, native-target
  validation, repeated live-instance checks, and process lifecycle sequencing.
- Do not copy Invoices Standard layers or add a resource/repository framework to these small executable projects.

Use the native graph and current source for resource ordering, endpoints, health, and lifecycle behavior. Preserve project/resource
metadata, secret identifiers, local target guards, scenario order/content, and persona/token contracts when moving or extracting code.
Composition only registers resources/callbacks. Keep overlay generation before composition in Program and certificate issuance at startup.

## Build and test boundaries

- The root `Directory.Build.props` and `Directory.Packages.props` own effective build policy and NuGet versions; do not import API ownership
  into tooling.
- The Aspire SDK declaration remains in the AppHost csproj.
- Every tooling test project ends in `.Tests`; the one root props file uses that intrinsic project-name convention for early test-policy
  selection.
- Each test project directly references only its owning production project.
- Bootstrap owns the four persona source seed fixtures. Identity's consistency test links those JSON files as data; do not create a
  model/project dependency just to parse it or duplicate the fixture. Data.Tests links the same seed files and owns scenario coverage.
- Keep platform-specific file-access and real child-process signal coverage with their owners. A platform skip is not executed proof.

Compiler-policy changes must be checked through effective properties and actual diagnostics. Preserve runtime/error contracts while
remediating source findings; surface an irreconcilable framework/policy conflict rather than concealing it.

Local startup/reset and certificate effects are defined by the [local-environment runbook](../infra/Local/readme.md); tests must not
silently replace safe synthetic boundaries with a real scenario reset.
