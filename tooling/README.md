# Local development tooling

The .NET tooling is a self-contained source/test area. Repository-wide runtime, security, and Git guidance belongs to
[root AGENTS.md](../AGENTS.md); [the local-environment runbook](../infra/Local/readme.md) owns startup modes, scenario-reset effects,
certificates, and service observation.

## Project ownership

```text
tooling\
  Directory.Build.props
  Directory.Packages.props
  README.md
  AGENTS.md
  src\
    AppHost\
    LocalDevelopment.Bootstrap\
    LocalDevelopment.Identity\
  tests\
    AppHost.Tests\
    LocalDevelopment.Bootstrap.Tests\
    LocalDevelopment.Identity.Tests\
```

AppHost is the native Aspire composition root. Its `Infrastructure`, `Applications`, and `LocalDevelopment` slices keep resource definitions
beside their readiness, provisioning, and configuration behavior. `RepositoryLayout` anchors project/configuration locations to the host
project rather than shell cwd.

Bootstrap owns guarded invoice-scenario validation, materialization, reset/write ordering, and storage adapters. Identity owns loopback-only
persona lookup and token creation. The helper executables do not reference AppHost or one another. They do not adopt the API's Invoices
service-layer hierarchy.

Each test project directly references only its production owner. AppHost's native project-resource references remain necessary for its
graph. Bootstrap owns the single `SeedData\scenario.v1.json` source fixture; Identity tests link that same JSON as contract data instead of
depending on Bootstrap's model implementation.

## Build and package policy

[Directory.Build.props](Directory.Build.props) is the only tooling build-policy file. It enables warnings-as-errors, existing
`.editorconfig` build enforcement, and production XML documentation. Production uses the SDK's latest recommended analysis; `.Tests`
projects use the fixed framework-default analyzer baseline selected by project name during early MSBuild evaluation.

The test-name convention matters: every tooling test project ends in `.Tests`. This avoids relying on `IsTestProject` before a csproj
assigns it. There is no second props file under `tests`, no new suppression list, and no imported API compiler/optimization policy.

[Directory.Packages.props](Directory.Packages.props) owns NuGet package versions independently of the API catalog. Project files declare
package use without inline versions. The Aspire SDK declaration stays in [AppHost.csproj](src/AppHost/AppHost.csproj), because SDK
resolution is a separate, earlier boundary. Do not add transitive pins or change a version during a layout refactor.

## Verification

From the repository root:

```powershell
dotnet build tooling\src\AppHost\AppHost.csproj
dotnet build tooling\src\LocalDevelopment.Bootstrap\LocalDevelopment.Bootstrap.csproj
dotnet build tooling\src\LocalDevelopment.Identity\LocalDevelopment.Identity.csproj

dotnet test tooling\tests\AppHost.Tests\AppHost.Tests.csproj
dotnet test tooling\tests\LocalDevelopment.Bootstrap.Tests\LocalDevelopment.Bootstrap.Tests.csproj
dotnet test tooling\tests\LocalDevelopment.Identity.Tests\LocalDevelopment.Identity.Tests.csproj
```

Use `--configuration Release` to verify the other build configuration. Check effective MSBuild properties as well as compiler output when
changing policy. Platform-specific skips are explicit: Windows ACL cases require Windows; Unix permissions and OS-delivered SIGTERM cases
require a Unix .NET runtime.

The SIGTERM test starts the real Bootstrap child against a synthetic loopback storage response. It exercises cancellation without accessing
real Cosmos/Azurite data. Native graph tests do not start the distributed application.

## Development and debugging

The root Aspire entry points and engine flags are unchanged. Consult the linked runbook before startup: **Aspire restores its local scenario
by deleting existing scenario data**, and certificate-free website startup can affect local trust.

The existing [VS Code profiles](../.vscode/launch.json) and [tasks](../.vscode/tasks.json) target `tooling\src\AppHost`. Visual Studio uses
the AppHost project in [the root solution](../arolariu.slnx). Set source or method breakpoints through the debugger's symbol search rather
than importing line-bound breakpoint XML.

| Concern                 | Symbol to inspect                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------- |
| Repository rooting      | `AppHost.Repository.RepositoryLayout.Resolve`                                           |
| Native composition      | `AppHost.Infrastructure.InfrastructureResources.AddInfrastructure`                      |
| SQL readiness           | `AppHost.Infrastructure.Sql.SqlReadinessHealthCheck.CheckHealthAsync`                   |
| Failed Azurite recovery | `AppHost.Infrastructure.Storage.AzuriteBootstrap.BootstrapHealthCheck.CheckHealthAsync` |
| Scenario phase ordering | `LocalDevelopment.Bootstrap.Scenarios.Invoices.LocalScenarioBootstrap.RunAsync`         |
| Persona token creation  | `LocalDevelopment.Identity.Personas.DevelopmentTokenFactory.Create`                     |

Exception breakpoints for storage/provider failures or cancellation can help distinguish a transient retry from a terminal failure. Pausing
a bootstrap or readiness breakpoint intentionally leaves dependents waiting; do not interpret that pause as a broken resource gate. Avoid
inspecting/copying secret values into logs or screenshots.

Configuration generation runs before the dashboard: use AppHost startup output for overlay-generation errors and resource console logs for
app startup failures. Azurite recovery reattempts only failed idempotent provisioning on health polls; it does not rerun scenario
deletion/seeding or repeat a successful registration.
