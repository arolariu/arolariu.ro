# Live Manifest and Usage Examples

These are dynamic source pointers, not templates. They intentionally omit
current versions. Always inspect the live declaration, resolved state, and
usage before research or mutation.

## npm Lock-Domain Resolution and Peers

**Live source:**

- [`package.json`](../../../../package.json)
- [`package-lock.json`](../../../../package-lock.json)
- [`.npmrc`](../../../../.npmrc)
- [`nx.json`](../../../../nx.json)
- [`sites/arolariu.ro/package.json`](../../../../sites/arolariu.ro/package.json)
- [`packages/components/package.json`](../../../../packages/components/package.json)
- [`.github/scripts/package.json`](../../../../.github/scripts/package.json)
- [`.github/scripts/package-lock.json`](../../../../.github/scripts/package-lock.json)
- [`sites/arolariu.ro/src/components/Navigation.tsx`](../../../../sites/arolariu.ro/src/components/Navigation.tsx)

**Why representative:** the root owns its workspaces and root lock, while
`.github/scripts` is outside that workspace membership and owns an adjacent
manifest/lock pair. The website and shared package demonstrate member
dependency/peer intent, and live website source demonstrates an actual package
use. Nx treats root-domain dependency metadata as project input.

**Inspect:** first pair every tracked npm lockfile with its owning manifest and
workspace membership. Then inspect only the target's owning manifest, relevant
member declarations, lock entries, effective npm configuration,
peer/engine/export metadata, imports/config/plugins, and affected tests/builds.
Inspect Nx inputs only when the root domain is affected.

**Choose another source set when:** another legitimate nested manifest/lock
pair owns the target. A nested lock does not by itself require unrelated
workspace reads, dual updates, or a stop; include multiple domains only when
the target or an approved shared contract actually crosses them.

## NuGet Central API and Project-Local Tooling Ownership

**Live source:**

- [`Directory.Packages.props`](../../../../sites/api.arolariu.ro/Directory.Packages.props)
- [`Directory.Build.props`](../../../../sites/api.arolariu.ro/Directory.Build.props)
- [`Invoices.csproj`](../../../../sites/api.arolariu.ro/src/Invoices/arolariu.Backend.Domain.Invoices.csproj)
- [`Invoices/packages.lock.json`](../../../../sites/api.arolariu.ro/src/Invoices/packages.lock.json)
- [`AppHost.csproj`](../../../../tooling/AppHost/AppHost.csproj)
- [`LocalDevelopment.Bootstrap.csproj`](../../../../tooling/LocalDevelopment.Bootstrap/LocalDevelopment.Bootstrap.csproj)
- [`LocalDevelopment.Identity.csproj`](../../../../tooling/LocalDevelopment.Identity/LocalDevelopment.Identity.csproj)
- [`AzureDocumentIntelligenceBroker.cs`](../../../../sites/api.arolariu.ro/src/Invoices/Brokers/DocumentIntelligenceBroker/AzureDocumentIntelligenceBroker.cs)
- [`AzureDocumentIntelligenceBroker.Internals.cs`](../../../../sites/api.arolariu.ro/src/Invoices/Brokers/DocumentIntelligenceBroker/AzureDocumentIntelligenceBroker.Internals.cs)
- [`DocumentIntelligenceRecordContractTests.cs`](../../../../sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Brokers/DocumentIntelligenceRecordContractTests.cs)

**Why representative:** API projects inherit central package versions and some
commit per-project lockfiles. Tooling projects sit outside that import boundary,
own local `PackageReference` versions, and have no committed package lock.
Provider-specific SDK calls, provider-neutral mapping, and contract tests show
how usage surfaces remain separate from version ownership.

**Inspect:** the target's actual central or project-local declaration, MSBuild
imports, all consumers, existing lockfiles or recorded lockless graph evidence,
target-framework compatibility, constructors/methods/models, serialization
mapping, DI, lifecycle, analyzers, exception tests, and official exact-target
API docs.

**Choose another source set when:** the package is Core/Auth/Common-only,
test-only, analyzer-only, another tooling dependency, or affects
EF/persistence. Follow its actual version owner, consuming projects, available
lock evidence, and contract tests rather than this broker.

## Layered Python Requirements and Runtime

**Live source:**

- [`requirements.txt`](../../../../sites/exp.arolariu.ro/requirements.txt)
- [`requirements-dev.txt`](../../../../sites/exp.arolariu.ro/requirements-dev.txt)
- [`pyproject.toml`](../../../../sites/exp.arolariu.ro/pyproject.toml)
- [`project.json`](../../../../sites/exp.arolariu.ro/project.json)
- [`Dockerfile`](../../../../sites/exp.arolariu.ro/Dockerfile)
- [`models.py`](../../../../sites/exp.arolariu.ro/models.py)
- [`main.py`](../../../../sites/exp.arolariu.ro/main.py)
- [`main.test.py`](../../../../sites/exp.arolariu.ro/main.test.py)

**Why representative:** production and development constraints are layered,
runtime/tool configuration is separate, the container installs only the
production layer, and live FastAPI/Pydantic source plus tests expose migration
surfaces. The requirements include compatible ranges and no committed Python
lockfile supplies an exact resolved graph.

**Inspect:** exact direct specifier text, observed transitive graph and its
evidence limit, Python support, models, validation/serialization,
routes/dependencies, telemetry/lifespan, TestClient, pytest/Ruff behavior,
local project targets, and production image install and startup. If exact graph
rollback is required, plan an approved resolver-enforcing snapshot before
mutation.

**Choose another source set when:** only a dev/documentation tool changes.
Keep production source/container checks out of scope only after proving the
tool is absent from the production requirements and runtime.
