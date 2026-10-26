# Tooling local guide

[Root AGENTS.md](../AGENTS.md) owns repository-wide versions, safety, coding, testing, and Git policy. [README.md](README.md) owns tooling
commands, layout, package policy, and debugger entry points. This guide adds only local ownership and preservation boundaries.

## Capability ownership

- `src\AppHost` composes native Aspire resources; keep infrastructure, application, and local-helper behavior in their capability slices.
- `src\LocalDevelopment.Bootstrap` owns the guarded invoice scenario and its external storage adapters.
- `src\LocalDevelopment.Identity` owns local persona/token behavior.
- Neither helper references AppHost or the other helper.
- Do not copy Invoices Standard layers or add a resource/repository framework to these small executable projects.

Use the native graph and current source for resource ordering, endpoints, health, and lifecycle behavior. Preserve project/resource
metadata, secret identifiers, local target guards, scenario order/content, and persona/token contracts when moving or extracting code.

## Build and test boundaries

- The root `Directory.Build.props` and `Directory.Packages.props` own effective build policy and NuGet versions; do not import API ownership
  into tooling.
- The Aspire SDK declaration remains in the AppHost csproj.
- Every tooling test project ends in `.Tests`; the one root props file uses that intrinsic project-name convention for early test-policy
  selection.
- Each test project directly references only its owning executable.
- Bootstrap owns the single source seed fixture. Identity's consistency test links that JSON as data; do not create a model/project
  dependency just to parse it or duplicate the fixture.
- Keep platform-specific file-access and real child-process signal coverage with their owners. A platform skip is not executed proof.

Compiler-policy changes must be checked through effective properties and actual diagnostics. Preserve runtime/error contracts while
remediating source findings; surface an irreconcilable framework/policy conflict rather than concealing it.

Local startup/reset and certificate effects are defined by the [local-environment runbook](../infra/Local/readme.md); tests must not
silently replace safe synthetic boundaries with a real scenario reset.
