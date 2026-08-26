# NuGet Migrations

Load only after live inspection establishes NuGet ownership.

## Live Ownership Model

- [`Directory.Packages.props`](../../../../sites/api.arolariu.ro/Directory.Packages.props)
  owns versions for projects in the API subtree. Individual API projects such
  as
  [`Invoices.csproj`](../../../../sites/api.arolariu.ro/src/Invoices/arolariu.Backend.Domain.Invoices.csproj)
  declare package use without duplicating centrally managed versions.
- [`Directory.Build.props`](../../../../sites/api.arolariu.ro/Directory.Build.props)
  owns API target-framework/language/compiler policy.
- API projects with a committed lock, such as
  [`Invoices/packages.lock.json`](../../../../sites/api.arolariu.ro/src/Invoices/packages.lock.json),
  have durable resolved-state evidence. Do not infer a lock for a project that
  has none.
- Tooling projects are outside the API central-management subtree and own
  versions directly in project files, including
  [`AppHost.csproj`](../../../../tooling/AppHost/AppHost.csproj),
  [`LocalDevelopment.Bootstrap.csproj`](../../../../tooling/LocalDevelopment.Bootstrap/LocalDevelopment.Bootstrap.csproj),
  and
  [`LocalDevelopment.Identity.csproj`](../../../../tooling/LocalDevelopment.Identity/LocalDevelopment.Identity.csproj).
  No `packages.lock.json` is committed for those tooling owners.

Inspect MSBuild import boundaries, the actual version owner, every consuming
project, and only lockfiles that exist. API central ownership and tooling
project-local ownership are both valid; do not add a project-local `Version`
to a centrally managed API reference or assume the API central file governs
tooling.

## Read-Only Compatibility Pass

1. Find central `PackageVersion`, project-local `PackageReference Version`, and
   versioned project `Sdk` owners, plus all consumers, transitive-only
   consumers, source namespaces/types, configuration, DI, serialization,
   analyzers, tests, and existing lockfiles.
2. Read the exact NuGet package page, maintainer release/migration notes, API
   reference, target-framework support, dependencies, and advisories.
3. Compare the package's target frameworks with the live owner: API
   `Directory.Build.props` or the tooling project file. Check SDK/runtime
   support without copying its current value into this resource.
4. Inspect analyzer and compiler diagnostic changes because repository
   warnings fail builds.
5. For Azure/service SDKs, verify constructor/method/model/serialization and
   lifecycle changes against official API docs and current broker boundary.
6. For ASP.NET/EF/serialization packages, verify coupled runtime packages,
   generated migrations or design-time tooling, defaults, wire/persistence
   shape, and provider compatibility.
7. Examine each existing lockfile's direct/transitive state and package-source
   integrity. For a lockless owner, record the available assets/graph evidence
   and its reproducibility limit instead of inventing a lock.

Every pre-approval
[`dotnet package list`](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-list)
inventory must explicitly target a project and disable implicit restore, for
example
`dotnet package list --project <PROJECT> --no-restore --include-transitive`.
Use the same `--no-restore` requirement for separate vulnerability or
deprecation queries. The current SDK otherwise restores automatically. If
existing assets are absent or stale, record that evidence limit and do not
restore to refresh them before approval. Restore/update, `dotnet add package`,
and lockfile generation remain blocked before approval.

## After Explicit Approval

1. Establish focused build/test baselines for every consuming project.
2. Change the version at the approved owner: the API central declaration or a
   tooling project's local package/SDK declaration. Change ownership itself
   only when that scope is separately approved.
3. Restore affected projects. Review each existing `packages.lock.json` delta
   before source edits; for a lockless owner, capture and compare the freshly
   resolved graph without creating a lock as incidental cleanup.
4. Update one API/serialization/analyzer consumer cohort at a time.
5. Run the smallest consuming builds/tests after each cohort. Include current
   contract tests for provider records, DTO transport, persistence
   serialization, or HTTP mapping when those surfaces are affected.
6. Verify warnings-as-errors, DI composition, runtime startup, and any
   provider/emulator boundary required by the exact migration.

Representative contract locations include:

- [`DocumentIntelligenceRecordContractTests.cs`](../../../../sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Brokers/DocumentIntelligenceRecordContractTests.cs)
- [`AnalysisPersistenceSerializationTests.cs`](../../../../sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Brokers/AnalysisPersistenceSerializationTests.cs)
- [`InvoiceResponseTransportContractTests.cs`](../../../../sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/DTOs/InvoiceResponseTransportContractTests.cs)

Inspect whether the target package actually affects these surfaces; do not run
or update unrelated suites mechanically.

## Stop Conditions

- The target does not support the live target framework/runtime.
- The same consuming project has conflicting imported central and local
  ownership.
- A downgrade/conflict is “resolved” by suppression or an unexplained direct
  reference.
- Serialization, auth, schema/data, or public HTTP behavior changes without
  separate approval.
- An existing lock cannot be regenerated deterministically with the repository
  SDK and sources, or a lockless owner's accepted rollback evidence is
  insufficient for the required guarantee.
