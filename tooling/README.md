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
    LocalDevelopment.Common\
    LocalDevelopment.Data\
    LocalDevelopment.Identity\
  tests\
    AppHost.Tests\
    LocalDevelopment.Bootstrap.Tests\
    LocalDevelopment.Common.Tests\
    LocalDevelopment.Data.Tests\
    LocalDevelopment.Identity.Tests\
```

AppHost is the native Aspire composition root. `Program.cs` generates the exp overlay before calling `LocalApplication.Compose`. Composition
registers resources without starting processes or writing configuration/certificates. Its `Infrastructure`, `Applications`, and
`LocalDevelopment` slices configure their own resources; cross-capability references, endpoint expressions, and startup waits are visible
together in `LocalApplication`. `RepositoryLayout` anchors project/configuration locations to the host project rather than shell cwd.

To extend the graph, add a focused resource registration beside its capability, then wire dependencies in `LocalApplication.Compose`. Graph
tests call that production entry point. The isolated native reset fixture shares only `WireStartupDependencies`, keeping controlled HTTP
processes instead of starting real website/API applications.

Data owns invoice-scenario validation, materialization, initialization/write ordering, and provider operations without Aspire dependencies.
It also owns clear/restore SDK operations and application schema restoration. AppHost retains interactive reset confirmation, native-target
authorization, repeated live-instance checks, and writer shutdown/restart ordering; Data does not authorize resets. Bootstrap owns the
guarded command, cancellation, SDK client lifetime, and fixture packaging. AppHost and Bootstrap may reference Data. Identity owns
loopback-only persona lookup and token creation and remains independent. The helper executables do not reference AppHost or one another.
They do not adopt the API's Invoices service-layer hierarchy.

Provider operations have one static entry point per capability: `NoSql\NoSqlDataProvider`, `Sql\SqlDataProvider`, and
`Storage\StorageDataProvider`. They receive caller-owned clients or connection factories rather than keeping global client state. `NoSql` is
the capability name; its current implementation still uses the Cosmos SDK and existing partition contracts. Storage's create-only
`EnsureStorageAsync`, startup access/CORS operations, and post-deletion `RestoreStorageAsync` remain distinct.

The dependency-free Common library owns `LocalDevelopment.Common.Http.Resilience`: the retry contract, immutable named-policy registry,
executor, and HTTP/network failure classification. Data's `LocalDataRetryPolicies` configures the SDK-specific profiles; AppHost and Data
use the same executor. `azurite-startup` retains six attempts and linear waits, `scenario-transient` retains five attempts and doubling
waits, and `storage-deletion-pending` retains thirty attempts with one-second waits only for deletion-in-progress conflicts. To configure a
case, copy its `RetryPolicy` with the required settings and register it by name in a `RetryPolicyRegistry`; callers select it with the
registry indexer. Retry logging stays at the call site. Common references neither Aspire nor provider/domain projects and adds no retry
package dependency.

Each test project directly references only its production owner. AppHost's native project-resource references remain necessary for its
graph. Bootstrap owns the fully expanded `SeedData\alice.json`, `bob.json`, `charlie.json`, and `dmitryi.json` source fixtures; Identity
tests link those same JSON files as contract data instead of depending on Bootstrap's model implementation. Data.Tests links the same
fixtures and owns scenario coverage. `SEED_DATA_DIRECTORY` selects the directory containing all four version-matched files. The obsolete
`SEED_MANIFEST_PATH` override fails with migration guidance. Profile sizes and existing-store adoption are documented in the
local-environment runbook.

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
dotnet build tooling\src\LocalDevelopment.Common\LocalDevelopment.Common.csproj
dotnet build tooling\src\LocalDevelopment.Data\LocalDevelopment.Data.csproj
dotnet build tooling\src\LocalDevelopment.Identity\LocalDevelopment.Identity.csproj

dotnet test tooling\tests\AppHost.Tests\AppHost.Tests.csproj
dotnet test tooling\tests\LocalDevelopment.Bootstrap.Tests\LocalDevelopment.Bootstrap.Tests.csproj
dotnet test tooling\tests\LocalDevelopment.Common.Tests\LocalDevelopment.Common.Tests.csproj
dotnet test tooling\tests\LocalDevelopment.Data.Tests\LocalDevelopment.Data.Tests.csproj
dotnet test tooling\tests\LocalDevelopment.Identity.Tests\LocalDevelopment.Identity.Tests.csproj
```

Use `--configuration Release` to verify the other build configuration. Check effective MSBuild properties as well as compiler output when
changing policy. Platform-specific skips are explicit: Windows ACL cases require Windows; Unix permissions and OS-delivered SIGTERM cases
require a Unix .NET runtime.

The SIGTERM test starts the real Bootstrap child against a synthetic loopback storage response. It exercises cancellation without accessing
real Cosmos/Azurite data. Native graph tests do not start the distributed application.

### Opt-in local data acceptance

`LocalDataIntegration` tests are skipped unless `AROLARIU_RUN_LOCAL_DATA_TESTS=1`. The SDK-boundary cases use the tracked
[isolated Compose fixture](tests/Fixtures/local-data.compose.yml); labels, volume names, loopback ports, and explicit engine selection are
checked before any cleanup. The native acceptance case starts its own uniquely scoped volumes, real Bootstrap, and controlled HTTP processes
instead of the website/API applications. It requires unoccupied standard service ports and an already trusted development certificate; it
does not install trust, packages, or missing images.

Run native acceptance without concurrent tooling builds or test suites. Its helper processes use the shared build outputs, and cold emulator
initialization and application health checks share a bounded startup deadline.

From the repository root, with the reviewed fixture images already available:

```powershell
$engine = "rancher" # Or "podman"; run the engines sequentially because fixture ports are shared.
$env:AROLARIU_CONTAINER_ENGINE = $engine
$env:AROLARIU_RUN_LOCAL_DATA_TESTS = "1"
$env:AROLARIU_LOCAL_DATA_TEST_SCOPE = "arolariu-seed-tests-" + [guid]::NewGuid().ToString("N")
npm run containers:compose -- --engine $engine --file tooling\tests\Fixtures\local-data.compose.yml -- -p $env:AROLARIU_LOCAL_DATA_TEST_SCOPE up -d

# Repeat until BOTH containers report healthy before running the tests.
$cli = if ($engine -eq "rancher") { "docker" } else { "podman" }
& $cli inspect --format '{{.Name}} {{.State.Health.Status}}' `
  "$env:AROLARIU_LOCAL_DATA_TEST_SCOPE-cosmos" "$env:AROLARIU_LOCAL_DATA_TEST_SCOPE-storage"

dotnet test tooling\tests\LocalDevelopment.Data.Tests\LocalDevelopment.Data.Tests.csproj
dotnet test tooling\tests\AppHost.Tests\AppHost.Tests.csproj
npm run containers:compose -- --engine $engine --file tooling\tests\Fixtures\local-data.compose.yml -- -p $env:AROLARIU_LOCAL_DATA_TEST_SCOPE down
```

The explicit Compose project name keeps Podman Compose from treating the interpolated top-level `name` as a literal. Do not rely on
`up --wait`, which is not supported by every Podman Compose provider; use the health inspection above on either engine.

Ordinary `down` preserves the two test volumes. Remove only the two exact names derived from the recorded fixture scope when those test
artifacts are no longer needed; never prune or remove developer/selfhost volumes. The native case removes its own three temporary volumes
after stopping its processes. These checks do not replace full website/API E2E validation.

## Development and debugging

The root Aspire entry points and engine flags are unchanged. Ordinary startup preserves local data and initializes missing first-use seed
data without overwriting existing records. Consult the linked runbook before using the destructive dashboard **Reset local data** command;
certificate-free website startup can still affect local trust.

AppHost enables `AspireUseCliBundle` with `AspireCliInvocationMode=DnxPinned`. The SDK obtains Dashboard and DCP from the CLI bundle rather
than platform-specific orchestration NuGet packages. `dotnet run` delegates to the exact `Aspire.Cli` version paired with
`Aspire.AppHost.Sdk` through `dnx`, rather than selecting whichever global CLI is on `PATH`. Initial bundle preparation or a changed SDK
version can require downloads through the configured NuGet sources; warm/offline use requires the corresponding tool and bundle caches. The
existing root commands and engine flags remain unchanged. VS Code's Aspire extension invokes its selected CLI directly, so keep that
installation aligned with the project's SDK.

AppHost launch currently uses Debug: the SDK's CLI run hook does not forward `--configuration Release` and can fail looking for a Debug
executable. Release builds and tests remain supported; recheck this launch limitation when upgrading the SDK.

Console logging defaults to warnings and errors, with `Aspire.Hosting.DistributedApplication` retained at information level for startup,
dashboard login, and endpoint announcements. A console-specific default is required because the Aspire CLI's `ASPIRE_LOGLEVEL=Debug`
overrides the generic default, but console-specific rules also take precedence over Aspire's built-in category filters. The console section
therefore restates those filters: Kestrel, gRPC, and dashboard third-party logs report errors only, Kestrel server warnings remain visible,
and health-check logs are omitted because readiness is reported by the dashboard. Readiness waits are unchanged. A unit test fails if a
future Aspire version adds a stricter filter that the console section does not match. The engine-specific VS Code profiles apply the same
console-only filter. Other logging providers retain their existing levels; application resource logs remain available in the dashboard.

The existing [VS Code profiles](../.vscode/launch.json) and [tasks](../.vscode/tasks.json) target `tooling\src\AppHost`. Visual Studio uses
the AppHost project in [the root solution](../arolariu.slnx). Set source or method breakpoints through the debugger's symbol search rather
than importing line-bound breakpoint XML.

| Concern                 | Symbol to inspect                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------- |
| Repository rooting      | `AppHost.Repository.RepositoryLayout.Resolve`                                           |
| Native composition      | `AppHost.LocalApplication.Compose`                                                      |
| SQL readiness           | `AppHost.Infrastructure.Sql.SqlReadinessHealthCheck.CheckHealthAsync`                   |
| Failed Azurite recovery | `AppHost.Infrastructure.Storage.AzuriteBootstrap.BootstrapHealthCheck.CheckHealthAsync` |
| Scenario phase ordering | `LocalDevelopment.Data.Scenarios.Invoices.LocalScenarioBootstrap.RunAsync`              |
| Persona token creation  | `LocalDevelopment.Identity.Personas.DevelopmentTokenFactory.Create`                     |

Exception breakpoints for storage/provider failures or cancellation can help distinguish a transient retry from a terminal failure. Pausing
a bootstrap or readiness breakpoint intentionally leaves dependents waiting; do not interpret that pause as a broken resource gate. Avoid
inspecting/copying secret values into logs or screenshots.

Configuration generation runs before the dashboard: use AppHost startup output for overlay-generation errors and resource console logs for
app startup failures. Azurite recovery reattempts only failed idempotent provisioning on health polls; it does not rerun scenario
initialization/reset or repeat a successful registration.

The website's `/api/health/` probe uses the `API_URL` and `EXP_PROXY_URL` endpoints injected by Aspire. Without explicit overrides, its
existing Azure/Docker defaults remain in effect. Follow the website's trailing-slash redirect and inspect the final status and dependency
entries: an HTTP 308 alone does not prove health. Native exp may use HTTPS; retain certificate validation rather than forcing its URL to
HTTP.
