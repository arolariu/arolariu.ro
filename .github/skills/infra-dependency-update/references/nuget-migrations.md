# NuGet Migrations

Load only after live inspection establishes NuGet ownership.

## Live Ownership Model

- [`Directory.Packages.props`](../../../../sites/api.arolariu.ro/Directory.Packages.props) owns versions for projects in the API subtree.
  Individual API projects such as
  [`Invoices.csproj`](../../../../sites/api.arolariu.ro/src/Invoices/arolariu.Backend.Domain.Invoices.csproj) declare package use without
  duplicating centrally managed versions.
- [`Directory.Build.props`](../../../../sites/api.arolariu.ro/Directory.Build.props) owns API target-framework/language/compiler policy.
- Every API project commits a lock, such as
  [`Invoices/packages.lock.json`](../../../../sites/api.arolariu.ro/src/Invoices/packages.lock.json), which is durable resolved-state
  evidence. Do not infer a lock for a project that has none.
- [`Tooling Directory.Packages.props`](../../../../tooling/Directory.Packages.props) owns tooling PackageReference versions independently of
  the API catalog. Tooling projects declare package use, including [`AppHost.csproj`](../../../../tooling/src/AppHost/AppHost.csproj),
  [`LocalDevelopment.Bootstrap.csproj`](../../../../tooling/src/LocalDevelopment.Bootstrap/LocalDevelopment.Bootstrap.csproj),
  [`LocalDevelopment.Data.csproj`](../../../../tooling/src/LocalDevelopment.Data/LocalDevelopment.Data.csproj), and
  [`LocalDevelopment.Identity.csproj`](../../../../tooling/src/LocalDevelopment.Identity/LocalDevelopment.Identity.csproj). The AppHost SDK
  declaration remains project-local. No `packages.lock.json` is committed for those tooling owners.

Inspect MSBuild import boundaries, the actual version owner, every consuming project, and only lockfiles that exist. API and tooling central
ownership remain separate; do not add inline PackageReference versions to either centrally managed subtree or assume the API catalog governs
tooling. SDK declarations have their own resolution boundary.

## Read-Only Compatibility Pass

1. Find central `PackageVersion`, project-local `PackageReference Version`, and versioned project `Sdk` owners, plus all consumers,
   transitive-only consumers, source namespaces/types, configuration, DI, serialization, analyzers, tests, and existing lockfiles.
2. Read the exact NuGet package page, maintainer release/migration notes, API reference, target-framework support, dependencies, and
   advisories.
3. Compare the package's target frameworks with the live owner: API `Directory.Build.props` or the tooling root build file. Check
   SDK/runtime support without copying its current value into this resource. For packages that may duplicate assemblies supplied by the
   deployed shared framework, also inspect the exact runtime image and the resolved/published app-local graph. A newer
   `Microsoft.Extensions.*` or ASP.NET implementation can be copied beside the app and bypass servicing from its matching
   `aspnet:<runtime-major>` image; keep such implementations on the runtime's servicing cohort unless a separate app-local servicing plan is
   approved and documented. Apply this to actual implementations, not mechanically to independent packages such as
   `Microsoft.Extensions.AI`; inspect each package's role and resolved graph.
4. Inspect analyzer and compiler diagnostic changes because repository warnings fail builds.
5. For Azure/service SDKs, verify constructor/method/model/serialization and lifecycle changes against official API docs and current broker
   boundary.
6. For ASP.NET/EF/serialization packages, verify coupled runtime packages, generated migrations or design-time tooling, defaults,
   wire/persistence shape, and provider compatibility.
7. Examine each existing lockfile's direct/transitive state and package-source integrity. For a lockless owner, record the available
   assets/graph evidence and its reproducibility limit instead of inventing a lock.

Every pre-approval [`dotnet package list`](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-list) inventory must
explicitly target a project and disable implicit restore, for example
`dotnet package list --project <PROJECT> --no-restore --include-transitive`. Use the same `--no-restore` requirement for separate
vulnerability or deprecation queries. The current SDK otherwise restores automatically. If existing assets are absent or stale, record that
evidence limit and do not restore to refresh them before approval. Restore/update, `dotnet add package`, and lockfile generation remain
blocked before approval.

## After Explicit Approval

1. Establish focused build/test baselines for every consuming project.
2. Change the version at the approved owner: the API/tooling central declaration or a project's local SDK declaration. Change ownership
   itself only when that scope is separately approved.
3. Restore affected projects. Review each existing `packages.lock.json` delta before source edits; for a lockless owner, capture and compare
   the freshly resolved graph without creating a lock as incidental cleanup.
4. Update one API/serialization/analyzer consumer cohort at a time.
5. Run the smallest consuming builds/tests after each cohort. Include current contract tests for provider records, DTO transport,
   persistence serialization, or HTTP mapping when those surfaces are affected.
6. Verify warnings-as-errors, DI composition, runtime startup, and any provider/emulator boundary required by the exact migration.

Representative contract locations include:

- [`DocumentIntelligenceRecordContractTests.cs`](../../../../sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Brokers/DocumentIntelligenceRecordContractTests.cs)
- [`AnalysisPersistenceSerializationTests.cs`](../../../../sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Brokers/AnalysisPersistenceSerializationTests.cs)
- [`InvoiceResponseTransportContractTests.cs`](../../../../sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/DTOs/InvoiceResponseTransportContractTests.cs)

Inspect whether the target package actually affects these surfaces; do not run or update unrelated suites mechanically.

## Retiring Security Workarounds

After upgrading a parent package, revisit direct references and central pins added only to mitigate a transitive advisory:

1. Identify the advisory, affected and fixed ranges, original dependency path, and whether application code genuinely consumes the package.
   A central version entry alone does not prove a direct dependency or transitive override; inspect references and pinning configuration.
2. With mutation approval, remove only the workaround in an isolated restore and inspect every affected project/target-framework graph.
   Check actual resolved versions and upstream minimum constraints, not just the parent's release number or an advisory-free old assets
   file.
3. If all affected paths disappear or resolve outside the vulnerable ranges without the workaround, remove its unused central declaration,
   workaround-only references, and stale explanatory comments together. Regenerate existing locks natively and verify consuming
   builds/tests.
4. Otherwise retain the smallest necessary mitigation and record the still-vulnerable path. Preserve genuine direct API dependencies even
   when their original advisory is fixed. Report the reproducibility limit for lockless owners.

## Stop Conditions

- The target does not support the live target framework/runtime.
- The same consuming project has conflicting imported central and local ownership.
- A downgrade/conflict is “resolved” by suppression or an unexplained direct reference.
- Serialization, auth, schema/data, or public HTTP behavior changes without separate approval.
- An existing lock cannot be regenerated deterministically with the repository SDK and sources, or a lockless owner's accepted rollback
  evidence is insufficient for the required guarantee.
