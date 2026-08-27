# Azure Bicep Reference Catalog

Owner: `.github/instructions/bicep.instructions.md`. This catalog holds
extensive, repository-specific Azure Bicep examples, anti-patterns, edge
cases, and rationale for `infra/Azure/Bicep`. It does not define a workflow
and it does not authorize any infrastructure mutation — every change still
requires the explicit user approval described in the Infrastructure Expert
agent's read-only-versus-mutation classification and escalation examples. It
does not restate versions, global commands, or root safety policy — see root
`AGENTS.md`. It does not duplicate `refactor`, `documentation`, or
`dependency-migration` skill workflow procedures; this catalog explains the
architecture and constraints those approved changes must fit into, with code,
not procedure.

## Module composition and deployment order

`main.bicep` (subscription scope) creates the resource group and delegates
everything else to `facade.bicep` (resource group scope). The facade's
numbered header is a readability sequence, not a complete deployment order:
Bicep combines explicit `dependsOn` edges with implicit dependencies created
by symbolic output references.

```bicep
// infra/Azure/Bicep/facade.bicep
// Deployment Order (with dependencies):
// 1. Identity      → Creates managed identities (no dependencies)
// 2. Configuration → Creates Key Vault, App Config (no dependencies)
// 3. Observability → Creates monitoring resources (depends on: Identity, Configuration)
// 4. Storage       → Creates storage, databases, ACR (depends on: Identity)
// 5. Compute       → Creates App Service Plans (depends on: Identity)
// 6. Sites         → Deploys web applications (depends on: Storage, Configuration)
// 7. Network       → Creates Front Door, DNS (depends on: Sites)
// 8. Bindings      → Configures custom domains (depends on: Sites, Network)
// 9. AI            → Deploys Azure OpenAI (header says Configuration)
// 10. RBAC         → Resource-scoped role assignments (depends on: respective resources)
```

The live effective DAG is:

| Module group | Effective dependencies |
| --- | --- |
| Identity | none |
| Configuration | none |
| Observability | Identity, Configuration |
| Storage | Identity |
| Compute | Identity |
| Sites | Identity, Configuration, Observability, Storage, Compute |
| Network | Sites |
| Bindings | Sites, Network, Compute |
| AI | none in current source |
| RBAC modules | The resource-producing groups whose outputs each module consumes |

Sites' extra edges come from identity, monitoring, and plan outputs even
though its explicit `dependsOn` lists only Storage and Configuration.
Bindings similarly consumes Compute outputs. Conversely, AI currently has no
Configuration reference or explicit dependency despite the header comment;
treat that as live documentation drift, not an edge to assume or add without
an approved infrastructure change.

Module groups 1–9 use `deploymentFile.bicep` orchestrators (for example
`observability/deploymentFile.bicep` and `storage/deploymentFile.bicep`) that
wire sub-modules and re-expose only the outputs the facade needs. RBAC is the
deliberate exception: `facade.bicep` invokes the individual `rbac/*.bicep`
modules directly.

A `resourceConventionPrefix` is derived once in the facade and threaded to
the module groups that accept it:

```bicep
// infra/Azure/Bicep/facade.bicep
var resourceConventionPrefix = 'q${substring(uniqueString(resourceDeploymentDate), 0, 5)}'
```

The Sites orchestrator does not accept that prefix. Its App Services and
Static Web Apps use stable fixed names such as `api-arolariu-ro`,
`www-arolariu-ro`, and `cv-arolariu-ro`. Do not rename those resources merely
to make the prefix rule universal; resource replacement and public-hostname
impact require explicit review.

### The identity-array convention is a positional contract

`identity/deploymentFile.bicep` returns a single `managedIdentitiesList` array,
and every downstream module indexes into it by position instead of by name:

```bicep
// infra/Azure/Bicep/facade.bicep
managedIdentityBackendClientId: identitiesDeployment.outputs.managedIdentitiesList[1].clientId
managedIdentityFrontendClientId: identitiesDeployment.outputs.managedIdentitiesList[0].clientId
managedIdentityInfrastructurePrincipalId: identitiesDeployment.outputs.managedIdentitiesList[2].principalId
```

The convention is documented only in `facade.bicep`'s header comment
(`[0] = Frontend`, `[1] = Backend`, `[2] = Infrastructure`) and in
`identity/userAssignedIdentity.bicep`'s `identities` array literal — nothing
enforces the ordering at compile time. Anti-pattern: reordering, inserting, or
removing an entry in that `identities` array without updating every
`managedIdentitiesList[N]` consumer across `facade.bicep` silently rebinds
RBAC and app settings to the wrong identity. Treat any change to that array as
touching every module that indexes into it, not just `identity/`.

## User-defined types and naming

Two exported UDTs standardize cross-module parameter passing:

```bicep
// infra/Azure/Bicep/types/identity.type.bicep
@metadata({ type: 'identity', name: 'identity' })
@export()
type identity = {
  name: string
  displayName: string
  resourceId: string // Azure Resource ID
  principalId: string // Azure Principal ID (GUID)
  clientId: string // Azure Client ID (GUID) — used for DefaultAzureCredential
}
```

```bicep
// infra/Azure/Bicep/types/common.type.bicep
@export()
@metadata({ description: 'Resource tagging configuration' })
type resourceTags = {
  environment: 'DEVELOPMENT' | 'PRODUCTION'
  deploymentType: 'Bicep' | 'ARM' | 'Terraform'
  deploymentDate: string
  deploymentAuthor: string
  module: string
  costCenter: string
  project: string
  version: string
}
```

`resourceTags` is a closed union — `environment` only accepts `'DEVELOPMENT'`
or `'PRODUCTION'`, so a new environment tier requires widening the type, not
just passing a new string literal.

Tagging is centralized through a shared function, not a copy-pasted variable:

```bicep
// infra/Azure/Bicep/constants/tags.bicep
import { resourceTags } from '../types/common.type.bicep'

@export()
func createTags(moduleName string, deploymentDate string) resourceTags => {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: deploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: moduleName
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  // Read remaining tag values, including the current schema version, from
  // the live createTags function instead of copying them into guidance.
}
```

Most resource modules (`storageAccount.bicep`, `keyVault.bicep`,
`appServicePlans.bicep`, ...) import `createTags` and call
`union(commonTags, { displayName: '...' })` on their resources. **Live drift
to be aware of, not silently copied forward:** inline typed `commonTags`
blocks also exist in `identity/userAssignedIdentity.bicep`,
`bindings/api-arolariu-ro-bindings.bicep`, and
`bindings/dev-arolariu-ro-bindings.bicep`. Search for
`var commonTags resourceTags` before assuming the shared function is
universal, and do not normalize these files as unrelated cleanup.

Naming follows `${resourceConventionPrefix}-<role>` for identities
(`${prefix}-frontend`, `${prefix}-backend`, `${prefix}-infrastructure`) and
`${resourceConventionPrefix}-<purpose>` elsewhere (`${prefix}-workspace`,
`${prefix}-insights`, `${prefix}-production` / `${prefix}-development` for App
Service Plans). Match the existing prefix pattern for a given module family
instead of inventing a new naming scheme.

## Identity, RBAC, and least privilege

Three User-Assigned Managed Identities are created once
(`identity/userAssignedIdentity.bicep`) and receive only resource-scoped role
assignments — never a subscription- or resource-group-wide role:

```bicep
// infra/Azure/Bicep/rbac/storage-rbac.bicep
resource storageAccount 'Microsoft.Storage/storageAccounts@<current-api-version>' existing = {
  name: storageAccountName
}

resource frontendBlobContributor 'Microsoft.Authorization/roleAssignments@<current-api-version>' = {
  scope: storageAccount
  name: guid(storageAccount.id, frontendPrincipalId, storageBlobDataContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataContributor)
    principalId: frontendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Frontend: contribute blob data to storage account'
  }
}
```

Every RBAC module follows the same shape: reference the target resource as
`existing`, import role GUIDs from `constants/roles.bicep` (never inline a raw
GUID), scope the assignment to that resource, and derive a deterministic name
via `guid(resource.id, principalId, roleGuid)` so redeploying is idempotent.
The three identities receive deliberately asymmetric privilege on the same
resource:

| Identity | Storage Blob | Storage Queue | Storage Table |
| --- | --- | --- | --- |
| Frontend | Data Contributor | Data Reader | Data Reader |
| Backend | Data Owner | Data Contributor | Data Contributor |
| Infrastructure | Data Reader | Data Reader | Data Reader |

Adding a new capability for one identity (for example, giving Frontend queue
write access) is a role-assignment change and requires confirmation per the
Infrastructure Expert agent's identity/RBAC decision matrix — it is not a
"just add a line" edit even though the surrounding file structure makes it
look mechanical.

`constants/roles.bicep` is the single source of truth for role GUIDs, each
with an inline comment pointing at the Microsoft built-in roles reference:

```bicep
// infra/Azure/Bicep/constants/roles.bicep
@export()
var storageBlobDataOwner = 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b'
```

OIDC federation replaces stored Azure credentials for GitHub Actions jobs that
invoke `azure/login`. Only the infrastructure identity receives the current
federated credentials, for the `development` and `production` GitHub
Environments, matched by exact subject strings:

```bicep
// infra/Azure/Bicep/identity/federatedCredentials.bicep
var federatedCredentials = [
  { name: 'FederatedGithubCredentialForDevelopment', subject: 'repo:arolariu/arolariu.ro:environment:development' }
  { name: 'FederatedGithubCredentialForProduction', subject: 'repo:arolariu/arolariu.ro:environment:production' }
]

@batchSize(1) // there's a limitation to create sequential fed creds
resource federatedCredentialsForInfrastructureIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@<current-api-version>' = [
  for credential in federatedCredentials: {
    parent: managedIdentity
    name: credential.name
    properties: {
      issuer: 'https://token.actions.githubusercontent.com'
      subject: credential.subject
      audiences: ['api://AzureADTokenExchange']
    }
  }
]
```

The `@batchSize(1)` decorator is not cosmetic — Azure rejects parallel
federated-credential creation on the same identity, so removing it reintroduces
a real deployment failure, not just a slower one.

Do not add an Azure federated subject merely because a workflow names a GitHub
Environment. `npm-publish` uses npm Trusted Publishing, while CV,
documentation, and status deploy through Static Web Apps token secrets; those
jobs do not authenticate with this Azure identity. A matching federated
credential is required only when the job actually uses `azure/login` with the
infrastructure UAMI.

## Secrets

Key Vault uses RBAC authorization exclusively — no access policies, and
secrets are never assigned inline in a consuming module:

```bicep
// infra/Azure/Bicep/configuration/keyVault.bicep
resource keyVault 'Microsoft.KeyVault/vaults@<current-api-version>' = {
  properties: {
    enableRbacAuthorization: true
    enablePurgeProtection: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    networkAcls: {}
  }
}

var secrets = loadJsonContent('keyVault.json')
resource keyVaultSecrets 'Microsoft.KeyVault/vaults/secrets@<current-api-version>' = [
  for secret in secrets.items: {
    parent: keyVault
    name: secret.name
    properties: { value: secret.value, attributes: { enabled: true } }
  }
]
```

`keyVault.json` (and `appConfiguration.json` for App Configuration) hold
placeholder values checked into source; real secret values are expected to be
rotated post-deployment or injected by CI/CD, per the module's own header
comment — do not read a placeholder value in these files as a real credential,
and never replace one with a real secret in the Bicep source tree.

SQL Server secrets are the one place secure parameters flow directly into a
resource property, and both administrator inputs are marked `@secure()`:

```bicep
// infra/Azure/Bicep/storage/sqlServer.bicep
@secure()
param sqlServerAdministratorUserName string

@secure()
param sqlServerAdministratorPassword string
```

`bicepconfig.json`'s `secure-parameter-default`, `secure-secrets-in-params`,
`outputs-should-not-contain-secrets`, and `use-secure-value-for-secure-inputs`
analyzer rules are all set to `error` — a secret flowing through a
non-`@secure()` parameter or into an `output` is a build-time lint failure,
not a review nit.

App Configuration disables local (key-based) authentication entirely:

```bicep
// infra/Azure/Bicep/configuration/appConfiguration.bicep
properties: {
  disableLocalAuth: true // We will explicilty connect via managed identities.
}
```

Database-level (as opposed to control-plane RBAC) grants for the SQL Server's
Azure AD administrators live in a companion SQL script, not Bicep:
`rbac/sql-rbac-uami.sql`. A SQL Server RBAC change is therefore potentially a
two-file change — the resource-scoped `Microsoft.Authorization/roleAssignments`
in `rbac/sql-server-rbac.bicep` for control-plane access, and the `.sql` script
for `CREATE USER ... FROM EXTERNAL PROVIDER` database-level grants.

## Networking

`publicNetworkAccess: 'Enabled'` (or `'enabled'`/`'Allow'` depending on the
resource's casing convention) is the deliberate current baseline across every
module in this repository — Storage, Cosmos DB, SQL Server, Key Vault, App
Configuration, ACR, and AI Foundry all allow public network access today, with
private endpoints called out as a documented future option, not a gap to
"just fix":

```bicep
// infra/Azure/Bicep/storage/storageAccount.bicep
networkAcls: {
  bypass: 'AzureServices, Logging, Metrics'
  defaultAction: 'Allow'
}
```

Both tightening (adding a private endpoint or `defaultAction: 'Deny'`) and
further loosening (broadening CORS, disabling a network rule) a resource's
current network posture are exposure changes and require confirmation per the
Infrastructure Expert agent's identity/RBAC/secret/network matrix — the
baseline being "already public" does not make a further change lower-risk.

Storage CORS is deliberately scoped per consumer. The root/development origin
rule documents its `PUT` requirement for direct SAS uploads:

```bicep
// infra/Azure/Bicep/storage/storageAccount.bicep
{
  // CORS: PUT is required for client-side direct blob uploads using SAS tokens.
  // Access is gated by short-lived User Delegation SAS keys (30min TTL) with per-blob scope.
  allowedOrigins: ['https://arolariu.ro', 'https://dev.arolariu.ro']
  allowedMethods: ['GET', 'HEAD', 'PUT', 'OPTIONS']
}
```

The API and localhost rule sets also currently allow `PUT` for their own
consumers. Do not remove it from either based only on the SAS-upload comment;
inspect the corresponding caller before changing any method list.

Cosmos DB explicitly disables VNet filtering and AAD-bypass while still
requiring TLS 1.2 and disabling key-based auth:

```bicep
// infra/Azure/Bicep/storage/noSqlServer.bicep
isVirtualNetworkFilterEnabled: false
virtualNetworkRules: []
networkAclBypass: 'None'
disableLocalAuth: true
minimalTlsVersion: 'Tls12'
```

Azure Front Door's WAF is pinned to `Standard_AzureFrontDoor`, which caps what
protection is available — a comment documents the ceiling directly at the
call site instead of leaving it implicit:

```bicep
// infra/Azure/Bicep/network/azureFrontDoor.bicep
// Managed rule sets (DRS, Bot Manager) require Premium SKU.
// Standard_AzureFrontDoor only supports custom rules.
managedRules: {
  managedRuleSets: []
}
```

Upgrading to Premium to get managed rule sets (DRS/Bot Manager) is
simultaneously a cost decision and a security decision — surface both sides
when it comes up, don't just approve the SKU bump.

## Diagnostics

**No module in `infra/Azure/Bicep` currently deploys a live
`Microsoft.Insights/diagnosticSettings` resource.** `observability/README.md`
documents the intended shape as a recommendation:

```bicep
// infra/Azure/Bicep/observability/README.md (documentation only — not deployed)
resource appServiceDiagnostics 'Microsoft.Insights/diagnosticSettings@<current-api-version>' = {
  scope: appService
  name: 'diagnostics'
  properties: {
    workspaceId: logAnalyticsWorkspace.id
    logs: [
      { category: 'AppServiceHTTPLogs', enabled: true }
      { category: 'AppServiceConsoleLogs', enabled: true }
    ]
  }
}
```

Anti-pattern: assuming an existing App Service, Storage Account, Cosmos DB
account, or Key Vault already emits diagnostic logs to the Log Analytics
workspace because the README shows the pattern, or copying the README snippet
verbatim without checking the current API version and without treating "add a
`diagnosticSettings` resource" as the genuinely new resource it is (new
resource → cost/monitoring-data decision → confirm first). The live
integration today is limited to Application Insights
(`APPLICATIONINSIGHTS_CONNECTION_STRING` app settings on the App Services) and
the App Services' own telemetry pipeline, not resource-level diagnostic
settings.

## API versions

`bicepconfig.json` configures the `use-recent-api-versions` analyzer. Read its
current level and age threshold from that file instead of copying them here.

For every resource family, inspect the exact live module and the supported API
version of each parent and nested resource type. Do not select an API version
from memory, from this catalog, or merely because the Bicep extension suggests
it. Representative source owners include:

- `storage/storageAccount.bicep`
- `configuration/keyVault.bicep`
- `storage/noSqlServer.bicep`
- `storage/sqlServer.bicep`
- `sites/api-arolariu-ro.bicep`
- `compute/appServicePlans.bicep`
- `identity/userAssignedIdentity.bicep`
- `ai/aiFoundry.bicep`
- `rbac/*.bicep`

Some resource families deliberately keep parent and nested-child versions in
sync (for example Storage blob services/containers). That is not universal:
`storage/sqlServer.bicep` uses a current server API while its nested
`auditingPolicies` resource remains on the API version supported by that child
type. Check compatibility per nested resource and preserve documented
exceptions rather than synchronizing versions mechanically.

## Cost and SKU

`compute/appServicePlans.bicep` documents the current SKU rationale directly
in its header and resource definitions. `COST_OPTIMIZATION.md` owns the current
cost distribution and price assumptions. Read both live sources before
comparing or proposing a SKU; do not copy SKU capacities or monthly estimates
from this catalog.

Other deliberate low-cost tier choices worth knowing before proposing a
change: Cosmos DB uses the free tier with `capacity: { totalThroughputLimit:
1000 }`; Azure Container Registry uses `Basic` (10 GB, no geo-replication, no
Premium content trust); App Configuration uses the `free` SKU, which is *why*
`softDeleteRetentionInDays: 0` and `enablePurgeProtection: false` are set —
the free tier does not support either feature, so those are constraints, not
oversights. Any SKU/tier change on any of these is a cost decision per the
Infrastructure Expert agent's cost/SKU matrix, even when it looks like a
one-line edit.

## `what-if` and validation

The repository's own `DEPLOYMENT_GUIDE.md` documents `az bicep build`,
`az bicep lint`, and `az deployment sub create` for subscription-scope
deployment — it does not currently document an `az deployment sub what-if`
invocation. Constructing one for an approved change follows the same
subscription-scope shape as the documented `create` command:

```bash
# infra/Azure/Bicep/DEPLOYMENT_GUIDE.md documents the create form; what-if
# uses the identical scope and parameters:
az deployment sub what-if \
  --location swedencentral \
  --template-file main.bicep \
  --parameters @main.parameters.json
```

`what-if` against a live subscription is itself a mutation-adjacent validation
step under the Infrastructure Expert agent's contract — it requires the same
approval as the change it validates, not just approval to "check" something.
`az bicep build --file main.bicep` and `az bicep lint --file main.bicep` are
the safe, approval-independent checks; they compile and lint locally without
touching Azure.

## Anti-pattern corrections summary

| Anti-pattern | Why it fails here | Correction |
| --- | --- | --- |
| Reordering `identity/userAssignedIdentity.bicep`'s `identities` array | `facade.bicep` indexes `managedIdentitiesList[0/1/2]` positionally; reordering silently rebinds RBAC/app settings to the wrong identity | Treat the array order as a contract; update every `[N]` consumer in the same change |
| Copying `observability/README.md`'s `diagnosticSettings` snippet as if it were already deployed | No module currently creates a live `Microsoft.Insights/diagnosticSettings` resource | Confirm the resource does not exist before assuming diagnostics are wired; adding one is a new-resource/monitoring decision |
| Inlining a raw role-definition GUID in a new RBAC module | Bypasses the single source of truth and its inline documentation link | Import the named constant from `constants/roles.bicep`; add a new export there if the role is missing |
| Declaring a new module's own `commonTags` variable instead of `createTags()` | Diverges from the shared tagging contract most modules follow (with known identity and binding exceptions) | Import and call `createTags(moduleName, deploymentDate)` unless matching an already-inconsistent sibling on purpose |
| Removing `@batchSize(1)` from `federatedCredentialsForInfrastructureIdentity` "to speed up deployment" | Azure rejects parallel federated-credential creation on the same identity | Keep the decorator; the sequential creation is a real Azure limitation, not caution |
| Assuming parent and nested child resources must share one API version | Some families align versions, while others such as SQL auditing use a child-specific supported version | Verify each nested resource type; update together only where live source and provider compatibility support it |
| Treating `publicNetworkAccess: 'Enabled'` as a bug to silently fix | It is the repository's deliberate current baseline across every resource | Escalate a tightening (or further loosening) change instead of changing it inline |

## Live source pointers

- `infra/Azure/Bicep/main.bicep`, `facade.bicep` — subscription/resource-group
  entry points and the explicit-plus-implicit module dependency graph
- `infra/Azure/Bicep/types/common.type.bicep`, `types/identity.type.bicep` —
  exported UDTs consumed across modules
- `infra/Azure/Bicep/constants/tags.bicep`, `constants/roles.bicep` — shared
  tagging function and role-definition GUIDs
- `infra/Azure/Bicep/identity/userAssignedIdentity.bicep`,
  `identity/federatedCredentials.bicep` — the three-identity model and OIDC
  federation
- `infra/Azure/Bicep/rbac/storage-rbac.bicep`, `rbac/key-vault-rbac.bicep`,
  `rbac/ai-rbac.bicep` — resource-scoped RBAC assignment pattern
- `infra/Azure/Bicep/storage/storageAccount.bicep`,
  `storage/noSqlServer.bicep`, `storage/sqlServer.bicep`,
  `storage/containerRegistry.bicep` — network/secret/API-version conventions
  per data-tier resource
- `infra/Azure/Bicep/configuration/keyVault.bicep`,
  `configuration/appConfiguration.bicep` — secret storage and free-tier
  constraints
- `infra/Azure/Bicep/compute/appServicePlans.bicep`, `COST_OPTIMIZATION.md` —
  SKU rationale and current cost distribution
- `infra/Azure/Bicep/network/azureFrontDoor.bicep` — WAF/CDN tier ceiling
- `infra/Azure/Bicep/observability/README.md` — documented-but-not-deployed
  diagnostic settings shape
- `infra/Azure/Bicep/DEPLOYMENT_GUIDE.md` — the only live `az bicep`/
  `az deployment sub` commands actually documented in this repository
- `infra/Azure/Bicep/bicepconfig.json` — enforced analyzer rules (secure
  parameters, API-version age, resource/parameter/output limits)
