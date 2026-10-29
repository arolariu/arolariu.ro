# Rebuild, validate and selectively tear down Azure

This is an operator procedure, **not an authorization to run it**. Obtain the exact tenant/subscription/targets, actor, action, cost and
recovery approval before each live phase. The scripts do not run from `main.bicep`, log in, select another identity, install dependencies or
create a host. They are the same standalone PowerShell 7 files locally, in Cloud Shell and in a separately approved deploymentScripts host.

**Provisioned does not mean ready.** The current graph still excludes `/admin` and `/admin/*` from Easy Auth, the application-level admin
authorization issue is not repaired here, and an empty SQL database has no tracked auth-schema initialization step. DNS, model quota and
actual application-identity permissions also need proof. Do not tear down a working deployment on the strength of offline tests.

## 1. Preserve before changing anything

Record approved resource IDs and secure backups/recovery for SQL, Cosmos, invoice blobs, real signing/Clerk/AI material, configuration
labels, image digests, and GitHub environment settings. Do not export secret values into the repository, console, transcripts or this
runbook. Preserve existing usable secrets; the ensure task does not rotate them.

Preserve the DNS zone and registrar state by default. Deleting/recreating a signed zone changes its name servers and DS material; stale
parent DS can break resolution. Record registrar NS/DS/TTL, certificate dependencies, Clerk/Resend/DMARC and other vendor records before an
explicitly approved DNS migration. Bicep does not recreate every external vendor record or wait for propagation.

There is **no resource-group-delete recipe** here. Retained Key Vault names/purge protection can block a deterministic-name rebuild for the
configured retention period; do not promise a vault purge or bypass protection. AI active deletion, retained recovery and permanent purge
are separate operations below.

Current resource source is [`main.bicep`](../Bicep/main.bicep) and its facade. The restored ARM JSON/SQL artifacts are historical
references, not regenerated deployment or idempotent bootstrap outputs. Follow the [deployment guide](../Bicep/DEPLOYMENT_GUIDE.md) for
local compiler checks and separately approved validation/what-if/create operations.

## 2. Choose a real host and actor

Use the module prerequisites in the [task reference](README.md#prerequisites-and-authority); install them separately through the approved
package process. Az.Accounts supplies native ARM REST and Graph credentials; no Graph SDK is required. SqlServer is required for SQL.
Directory-only tasks have a tenant, not a fictional subscription scope.

| Phase                              | Existing actor/authority                                                                       | What it proves                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Resource provisioning              | Approved ARM/Graph deployer with creation and scoped assignment rights                         | Resource control-plane outcome only                    |
| Secret/configuration population    | Infrastructure identity with existing scoped grants, or an explicitly approved operator lease  | Business configuration and verified owned cleanup      |
| SQL population                     | Existing infrastructure SQL administrator, or an approved reversible user-admin/firewall lease | Contained-user and membership state, not backend login |
| Easy Auth configuration inspection | Authorized ARM/Graph management actor                                                          | Actual config/registration linkage; not app access     |
| Cosmos/SQL/backend auth proof      | Actual existing backend identity, matched to its principal ID                                  | Only the checks reported by that probe                 |
| Website auth proof                 | Actual existing frontend identity, matched to its principal ID                                 | Only that caller's protected-path contract             |
| Negative-caller proof              | Separately available real denied identity/context                                              | Actual denial, not inability to acquire a token        |
| Deletion/purge                     | Existing exact ARM or Graph authority, separately approved                                     | Only the selected object's lifecycle                   |

Default Cloud Shell authenticates the signed-in user. Providing a managed-identity client ID is **not impersonation**. A hosted identity
must actually be available and preauthenticated before invoking a task; these files never create compute or switch profiles to manufacture
one. Subscription ownership/directory administration alone is not Key Vault, App Configuration or SQL data access.

Examples below start in the repository root. Supply approved non-secret scope and an existing matching context:

```powershell
$tasks = (Resolve-Path '.\infra\Azure\PowerShell').Path
$tenant = [guid] $env:TASK_TENANT_ID
$subscription = [guid] $env:TASK_SUBSCRIPTION_ID
if ($tenant -eq [guid]::Empty -or $subscription -eq [guid]::Empty) { throw 'Supply approved scope.' }
$context = Get-AzContext -ErrorAction Stop
if ($context.Tenant.Id -ne $tenant.ToString() -or $context.Subscription.Id -ne $subscription.ToString()) {
    throw 'Select and authorize the intended existing context outside these tasks.'
}
$context | Select-Object @{n='TenantId';e={$_.Tenant.Id}}, @{n='SubscriptionId';e={$_.Subscription.Id}},
    @{n='Cloud';e={$_.Environment.Name}}, @{n='AccountKind';e={$_.Account.Type}}
```

Never print the complete context or tokens. Each task emits safe Information-stream actor/scope metadata. Application probes compare the
actual credential's principal/client IDs; an infrastructure run cannot count as backend/frontend evidence.

## 3. Resolve the approved deployment metadata

Read only non-secret outputs from the exact approved subscription deployment. Do not change the default subscription or search accounts for
one that happens to work:

```powershell
$deploymentName = '<approved-subscription-deployment-name>'
$json = az deployment sub show --subscription $subscription --name $deploymentName `
    --query properties.outputs.deploymentInfo.value --output json
if ($LASTEXITCODE -ne 0) { throw 'Deployment output lookup failed.' }
$info = $json | ConvertFrom-Json -AsHashtable
$group = [string] $info.resourceGroupName
$prefix = [string] $info.resourcePrefix
$groupId = "/subscriptions/$subscription/resourceGroups/$group"
$vaultId = "$groupId/providers/Microsoft.KeyVault/vaults/$($info.resources.keyVaultName)"
$storeId = "$groupId/providers/Microsoft.AppConfiguration/configurationStores/$($info.resources.appConfigurationName)"
$sqlServerId = "$groupId/providers/Microsoft.Sql/servers/$prefix-sqlserver"
$databaseName = "$prefix-sqlserver-db-primary"
$databaseId = "$sqlServerId/databases/$databaseName"
$cosmosId = "$groupId/providers/Microsoft.DocumentDB/databaseAccounts/$prefix-nosqlserver"
$aiId = "$groupId/providers/Microsoft.CognitiveServices/accounts/$prefix-ai-foundry"
$siteId = "$groupId/providers/Microsoft.Web/sites/exp-arolariu-ro"
$frontendId = "$groupId/providers/Microsoft.ManagedIdentity/userAssignedIdentities/$prefix-uami-frontend"
$backendId = "$groupId/providers/Microsoft.ManagedIdentity/userAssignedIdentities/$prefix-uami-backend"
$infrastructureId = "$groupId/providers/Microsoft.ManagedIdentity/userAssignedIdentities/$prefix-uami-infrastructure"

$read = @{ ExpandProperties = $true; DefaultProfile = $context; ErrorAction = 'Stop' }
$frontend = Get-AzResource -ResourceId $frontendId @read
$backend = Get-AzResource -ResourceId $backendId @read
$infrastructure = Get-AzResource -ResourceId $infrastructureId @read
$sql = Get-AzResource -ResourceId $sqlServerId @read
$cosmos = Get-AzResource -ResourceId $cosmosId @read
$ai = Get-AzResource -ResourceId $aiId @read
$blob = Get-AzResource -ResourceId "$groupId/providers/Microsoft.Storage/storageAccounts/$($prefix)sacc" @read
$telemetry = Get-AzResource -ResourceId "$groupId/providers/Microsoft.Insights/components/$prefix-insights" @read
$expSite = Get-AzResource -ResourceId $siteId @read
$backendPrincipalId = [guid] $backend.Properties.principalId
$backendClientId = [guid] $backend.Properties.clientId
$frontendPrincipalId = [guid] $frontend.Properties.principalId
$infrastructurePrincipalId = [guid] $infrastructure.Properties.principalId
$expClientId = [guid] $info.experiments.appClientId
$sqlFqdn = [string] $sql.Properties.fullyQualifiedDomainName
$cosmosEndpoint = [string] $cosmos.Properties.documentEndpoint
$blobEndpoint = [string] $blob.Properties.primaryEndpoints.blob
$aiEndpoint = [string] $ai.Properties.endpoint
$telemetryConnection = [string] $telemetry.Properties.ConnectionString
$serviceUri = 'https://' + $expSite.Properties.defaultHostName + '/'
```

The names above derive from the current [storage](../Bicep/storage/deploymentFile.bicep),
[identity](../Bicep/identity/userAssignedIdentity.bicep), [AI](../Bicep/ai/deploymentFile.bicep) and
[observability](../Bicep/observability/deploymentFile.bicep) owners. Verify actual resolved IDs before effects. The facade emits client IDs,
not every principal/endpoint; the explicit reads complete that inventory without fetching keys.

## 4. Populate secrets before references

There are **four required secret inputs**, shared where appropriate:

| Vault secret                      | Approved value source                                                                         | Consumers                    |
| --------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------- |
| `PRODUCTION-JWT-SECRET`           | Preserved real signing material, or separately approved new signing material                  | API and both website labels  |
| `PRODUCTION-ClerkSecretKey`       | Production Clerk application                                                                  | Production website           |
| `DEVELOPMENT-ClerkSecretKey`      | Development Clerk application                                                                 | Development website          |
| `PRODUCTION-CognitiveServicesKey` | Actual selected AI account credential, retrieved through a separately approved secure channel | API OCR/analysis SDK clients |

Clerk publishable keys are ordinary public configuration inputs, not required vault secrets. Preserve any legacy publishable-key secrets or
unused development JWT/AI material; this procedure does not delete them. Optional Resend secrets are only needed if email is enabled.

For an existing sufficiently authorized infrastructure context, each command preserves a usable existing secret and securely prompts only
when absent:

```powershell
& (Join-Path $tasks 'Ensure-KeyVaultSecret.ps1') -TenantId $tenant -SubscriptionId $subscription `
    -TargetResourceId $vaultId -SecretName 'PRODUCTION-JWT-SECRET'
& (Join-Path $tasks 'Ensure-KeyVaultSecret.ps1') -TenantId $tenant -SubscriptionId $subscription `
    -TargetResourceId $vaultId -SecretName 'PRODUCTION-ClerkSecretKey'
& (Join-Path $tasks 'Ensure-KeyVaultSecret.ps1') -TenantId $tenant -SubscriptionId $subscription `
    -TargetResourceId $vaultId -SecretName 'DEVELOPMENT-ClerkSecretKey'
& (Join-Path $tasks 'Ensure-KeyVaultSecret.ps1') -TenantId $tenant -SubscriptionId $subscription `
    -TargetResourceId $vaultId -SecretName 'PRODUCTION-CognitiveServicesKey'
```

For unattended calls supply a `[SecureString] SecretValue` through an approved in-memory channel, with explicit `NonInteractive` and
`Confirm:false`; never put a literal secret in an argument/history/file. No script retrieves or rotates the AI account key automatically.
Current [AI provisioning](../Bicep/ai/aiFoundry.bicep) allows the existing key-authenticated SDK contract; do not silently disable local AI
auth or substitute a dummy key.

If the operator lacks data access, explicitly add `ManageTemporaryAccess` and a **fresh** `RecoveryReceiptPath` for each call. The operator
must already have the exact role-assignment authority. Use a private durable directory outside the repository and retain receipts until
cleanup is verified; do not reuse a receipt across operations:

```powershell
$receiptDirectory = '<existing-private-durable-directory>'
$receiptPath = Join-Path $receiptDirectory ("secret-$([guid]::NewGuid()).json")
& (Join-Path $tasks 'Ensure-KeyVaultSecret.ps1') -TenantId $tenant -SubscriptionId $subscription `
    -TargetResourceId $vaultId -SecretName 'PRODUCTION-JWT-SECRET' `
    -ManageTemporaryAccess -RecoveryReceiptPath $receiptPath
```

No broader subscription/tenant authority is acquired. See [owned access and recovery](README.md#owned-temporary-access-and-recovery).

## 5. Ensure backend SQL binding and memberships

The API always requests the `PRODUCTION` label and uses the primary SQL database. The secondary database is not a replica or substitute. The
generic ensure-user task takes an explicit 16-byte SID; **the caller derives it from the managed application's client ID**, not its
principal/object ID. This is separate from the SQL server Entra administrator's ARM `sid`, which is an object ID.

```powershell
$sqlUserName = 'backend-uami'
$expectedSid = '0x' + [BitConverter]::ToString($backendClientId.ToByteArray()).Replace('-', '')
& (Join-Path $tasks 'Ensure-SqlContainedUser.ps1') -TenantId $tenant -SubscriptionId $subscription `
    -TargetResourceId $databaseId -UserName $sqlUserName -ExpectedSid $expectedSid
foreach ($role in 'db_datareader', 'db_datawriter', 'db_ddladmin') {
    & (Join-Path $tasks 'Ensure-SqlRoleMembership.ps1') -TenantId $tenant -SubscriptionId $subscription `
        -TargetResourceId $databaseId -UserName $sqlUserName -RoleName $role
}
$sqlConnection = "Server=tcp:$sqlFqdn,1433;Database=$databaseName;Authentication=Active Directory Managed Identity;User Id=$backendClientId;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
```

Run using existing real SQL authority where possible. If a signed-in operator instead needs the approved access lifecycle, add
`ManageTemporaryAccess` and a new durable receipt to **each** user/membership invocation. Supply `ClientIPAddress` only as an explicit exact
IPv4 if the current path is rejected; no IP discovery or broad firewall rule is performed. `OperatorLoginName` is optional safe identity
metadata when the existing user login cannot be used.

Serialize SQL operator administration in a maintenance/bootstrap window: the user-admin lease replaces the infrastructure administrator
temporarily and can affect connections. The prior typed administrator is restored before the owned firewall rule is removed. Entra-only
enforcement is never toggled. No lease is needed when the existing infrastructure context has the required actual SQL permissions.

**Schema remains a separate gate.** [`AuthDbContext`](../../../sites/api.arolariu.ro/src/Core.Auth/Brokers/AuthDbContext.cs) derives the
standard Identity schema, but source has no tracked migration/initializer/release schema step. `SELECT 1`, contained-user creation and
`/health` do not prove `/auth/*` works. Do not run guessed DDL/migrations; obtain a separately approved schema creation/restore procedure.

## 6. Complete the configuration inventory

Source of truth: the [experiments catalog](../../../sites/exp.arolariu.ro/config/catalog.py), the API
[bootstrap consumer](../../../sites/api.arolariu.ro/src/Core/Domain/General/Extensions/WebApplicationBuilderExtensions.cs) and website
[runtime configuration](../../../sites/arolariu.ro/src/lib/config/configProxy.ts). There are **26 required key/label entries**: 16
PRODUCTION (10 API keys plus six unique website keys), and 10 DEVELOPMENT website keys. Shared PRODUCTION keys are written once. Labels are
uppercase; `Site:Environment` values may use the source defaults below.

### PRODUCTION: 16 required entries

| Key                                 | Kind                  | Value source/format                                                             |
| ----------------------------------- | --------------------- | ------------------------------------------------------------------------------- |
| `Auth:JWT:Secret`                   | Key Vault reference   | `PRODUCTION-JWT-SECRET`                                                         |
| `Auth:JWT:Issuer`                   | Ordinary              | Preserved issuer identifier; source default `https://auth.arolariu.ro`          |
| `Auth:JWT:Audience`                 | Ordinary              | Preserved matching audience; source default `https://api.arolariu.ro`           |
| `Identity:Tenant:Id`                | Ordinary              | Approved tenant GUID                                                            |
| `Endpoints:Database:SQL`            | Ordinary, server-only | Exact encrypted managed-identity connection string above                        |
| `Endpoints:Database:NoSQL`          | Ordinary, server-only | Actual raw Cosmos HTTPS document endpoint, not an account-key connection string |
| `Endpoints:Storage:Blob`            | Ordinary              | Actual primary Blob service URL                                                 |
| `Endpoints:Observability:Telemetry` | Ordinary, server-only | Actual Application Insights connection string                                   |
| `Endpoints:AI:OCR`                  | Ordinary              | Actual selected AIServices account endpoint                                     |
| `Endpoints:AI:OCR:Key`              | Key Vault reference   | `PRODUCTION-CognitiveServicesKey`                                               |
| `Auth:Clerk:PublishableKey`         | Ordinary              | Production Clerk publishable key                                                |
| `Auth:Clerk:SecretKey`              | Key Vault reference   | `PRODUCTION-ClerkSecretKey`                                                     |
| `Endpoints:Service:Api`             | Ordinary              | Approved API base URL, normally `https://api.arolariu.ro`                       |
| `Site:Environment`                  | Ordinary              | `Production`                                                                    |
| `Site:Name`                         | Ordinary              | `arolariu.ro`                                                                   |
| `Site:Url`                          | Ordinary              | `https://arolariu.ro`                                                           |

### DEVELOPMENT: 10 required entries

| Key                         | Kind                | Value source/format                                         |
| --------------------------- | ------------------- | ----------------------------------------------------------- |
| `Auth:Clerk:PublishableKey` | Ordinary            | Development Clerk publishable key                           |
| `Auth:Clerk:SecretKey`      | Key Vault reference | `DEVELOPMENT-ClerkSecretKey`                                |
| `Auth:JWT:Audience`         | Ordinary            | Same shared API audience as PRODUCTION                      |
| `Auth:JWT:Issuer`           | Ordinary            | Same shared API issuer as PRODUCTION                        |
| `Auth:JWT:Secret`           | Key Vault reference | The same `PRODUCTION-JWT-SECRET`, not a new development key |
| `Endpoints:Service:Api`     | Ordinary            | Same shared API base URL                                    |
| `Endpoints:Storage:Blob`    | Ordinary            | Actual Blob service URL                                     |
| `Site:Environment`          | Ordinary            | `Development`                                               |
| `Site:Name`                 | Ordinary            | `dev.arolariu.ro`                                           |
| `Site:Url`                  | Ordinary            | `https://dev.arolariu.ro`                                   |

Populate ordinary values with the ordinary setter. After supplying the two real public Clerk values and preserved JWT identifiers, this
explicit inventory calls the canonical file; it is not an implicit Bicep bootstrap. Start with `WhatIf`, inspect the target/key/label plan,
then separately approve/apply. For access-managed calls, create a new receipt per row, not one shared receipt:

```powershell
$productionPublishableKey = '<real-production-Clerk-publishable-key>'
$developmentPublishableKey = '<real-development-Clerk-publishable-key>'
$jwtIssuer = 'https://auth.arolariu.ro'
$jwtAudience = 'https://api.arolariu.ro'
$production = [ordered]@{
    'Auth:JWT:Issuer' = $jwtIssuer; 'Auth:JWT:Audience' = $jwtAudience; 'Identity:Tenant:Id' = $tenant.ToString()
    'Endpoints:Database:SQL' = $sqlConnection; 'Endpoints:Database:NoSQL' = $cosmosEndpoint
    'Endpoints:Storage:Blob' = $blobEndpoint; 'Endpoints:Observability:Telemetry' = $telemetryConnection
    'Endpoints:AI:OCR' = $aiEndpoint; 'Auth:Clerk:PublishableKey' = $productionPublishableKey
    'Endpoints:Service:Api' = 'https://api.arolariu.ro'; 'Site:Environment' = 'Production'
    'Site:Name' = 'arolariu.ro'; 'Site:Url' = 'https://arolariu.ro'
}
$development = [ordered]@{
    'Auth:Clerk:PublishableKey' = $developmentPublishableKey; 'Auth:JWT:Audience' = $jwtAudience; 'Auth:JWT:Issuer' = $jwtIssuer
    'Endpoints:Service:Api' = 'https://api.arolariu.ro'; 'Endpoints:Storage:Blob' = $blobEndpoint
    'Site:Environment' = 'Development'; 'Site:Name' = 'dev.arolariu.ro'; 'Site:Url' = 'https://dev.arolariu.ro'
}
foreach ($label in 'PRODUCTION', 'DEVELOPMENT') {
    $values = if ($label -eq 'PRODUCTION') { $production } else { $development }
    foreach ($key in $values.Keys) {
        & (Join-Path $tasks 'Set-AppConfigurationValue.ps1') -TenantId $tenant -SubscriptionId $subscription `
            -TargetResourceId $storeId -Key $key -Label $label -Value $values[$key] -ContentType '' -WhatIf
    }
}
```

Remove `WhatIf` only for the separately approved execution; manual writes still confirm. Automation supplies explicit `NonInteractive` and
`Confirm:false` with caller-owned defaults disabled. Neither setter prints configuration values.

After usable secrets exist, create **typed versionless** references with the reference task:

```powershell
$references = @(
    @{ Key = 'Auth:JWT:Secret'; Label = 'PRODUCTION'; Secret = 'PRODUCTION-JWT-SECRET' },
    @{ Key = 'Auth:JWT:Secret'; Label = 'DEVELOPMENT'; Secret = 'PRODUCTION-JWT-SECRET' },
    @{ Key = 'Auth:Clerk:SecretKey'; Label = 'PRODUCTION'; Secret = 'PRODUCTION-ClerkSecretKey' },
    @{ Key = 'Auth:Clerk:SecretKey'; Label = 'DEVELOPMENT'; Secret = 'DEVELOPMENT-ClerkSecretKey' },
    @{ Key = 'Endpoints:AI:OCR:Key'; Label = 'PRODUCTION'; Secret = 'PRODUCTION-CognitiveServicesKey' }
)
foreach ($reference in $references) {
    & (Join-Path $tasks 'Set-AppConfigurationKeyVaultReference.ps1') -TenantId $tenant -SubscriptionId $subscription `
        -TargetResourceId $storeId -VaultResourceId $vaultId -Key $reference.Key -Label $reference.Label -SecretName $reference.Secret -WhatIf
}
```

Optional website settings in both labels: ordinary empty `Communication:Email:ApiKey` disables email; otherwise use a validated reference to
the real corresponding Resend secret. Feature keys `FeatureManagement:website.commander.enabled` and
`FeatureManagement:website.web-vitals.enabled` are optional ordinary boolean strings. `Site:Author` is not required by the catalog. Do not
blindly import legacy defaults or create dangling optional references: the experiments provider resolves references eagerly.

## 7. Release compatible code and images

Recreated resources require existing GitHub environment settings to be reconciled, not an automatic workflow dispatch. From
`deploymentInfo.githubConnectionValues`, retain the exact names `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`,
`AZURE_CONTAINER_REGISTRY_ADDRESS`, `AZURE_CLIENT_ID`, `AZURE_FRONTEND_MANAGED_IDENTITY_CLIENT_ID` and
`AZURE_BACKEND_MANAGED_IDENTITY_CLIENT_ID`. The last three CI-login values select the **infrastructure** UAMI, not application runtime
identities. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is environment-specific public build input. Set repository variable
`EXP_ENTRA_APP_CLIENT_ID` to `deploymentInfo.experiments.appClientId`, never the infrastructure client ID.

Recreated Static Web Apps need fresh deployment credentials under the existing secret names `AZURE_STATIC_WEB_APPS_CV_TOKEN`,
`AZURE_STATIC_WEB_APPS_DOCS_TOKEN` and `AZURE_STATIC_WEB_APPS_STATUS_TOKEN`. Obtain/set credentials only through a separately approved
secure channel; do not print them. OIDC subjects must still match the exact repository's development/production environment.

| Workflow                                                                   | Ref/target consequence                                                                               |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [Experiments](../../../.github/workflows/official-exp-trigger.yml)         | Pushes on `main`; manual workflow ref must contain the reviewed runtime/config contract              |
| [API](../../../.github/workflows/official-api-trigger.yml)                 | Pushes on `main`; same compatibility requirement                                                     |
| [Website build](../../../.github/workflows/official-website-build.yml)     | Pushes on `preview`; manual environment/container selection controls the public baked profile        |
| [Website release](../../../.github/workflows/official-website-release.yml) | Successful preview build auto-releases development; production uses the selected ref's SHA image tag |

For production, build `frontend/arolariu` with environment `production` at the **same reviewed ref/SHA** that the production release
dispatch selects. Do not build at `preview` then release an unrelated old `main` SHA, assume a new image exists, or bypass the final-image
gate. Preserve the existing manual release controls; changing workflow triggers/tags is not part of this procedure.

Release experiments first after configuration is complete, then API, then production/development website. Fixed application names still
require explicit migration approval. CV/docs/status can be delivered independently. The website runtime requires a real registration ID;
synthetic smoke IDs are test fixtures only and are not baked into production.

## 8. Obtain actual identity-specific proof

These are separately approved live operations. Run application probes from a host that actually has the expected existing context. The
following variables come from step 3; they do not impersonate those identities.

Management actor:

```powershell
& (Join-Path $tasks 'Test-EasyAuthConfiguration.ps1') -TenantId $tenant -SubscriptionId $subscription `
    -SiteResourceId $siteId -ExpectedApplicationClientId $expClientId `
    -ExpectedCallerPrincipalIds @($frontendPrincipalId, $backendPrincipalId, $infrastructurePrincipalId)
```

`Verified` here proves configuration only; `RuntimeAccess` stays `NotVerified`. Current `/admin` exclusions fail `UnsafeAuthExclusion`
intentionally. No policy is repaired or silently waived.

Actual backend context:

```powershell
& (Join-Path $tasks 'Test-CosmosDataAccess.ps1') -TenantId $tenant -SubscriptionId $subscription `
    -ExpectedPrincipalId $backendPrincipalId -AccountResourceId $cosmosId -AccountEndpoint $cosmosEndpoint `
    -DatabaseName 'primary' -ContainerName 'invoices'
& (Join-Path $tasks 'Test-CosmosDataAccess.ps1') -TenantId $tenant -SubscriptionId $subscription `
    -ExpectedPrincipalId $backendPrincipalId -AccountResourceId $cosmosId -AccountEndpoint $cosmosEndpoint `
    -DatabaseName 'primary' -ContainerName 'merchants'
& (Join-Path $tasks 'Test-SqlDataAccess.ps1') -TenantId $tenant -SubscriptionId $subscription `
    -ExpectedPrincipalId $backendPrincipalId -ExpectedClientId $backendClientId -DatabaseResourceId $databaseId `
    -ServerFqdn $sqlFqdn -DatabaseName $databaseName -UserName $sqlUserName `
    -RequiredTables @('dbo.AspNetUsers', 'dbo.AspNetRoles', 'dbo.AspNetUserRoles', 'dbo.AspNetUserClaims',
        'dbo.AspNetUserLogins', 'dbo.AspNetUserTokens', 'dbo.AspNetRoleClaims')
& (Join-Path $tasks 'Test-EasyAuthAccess.ps1') -TenantId $tenant -ExpectedPrincipalId $backendPrincipalId `
    -ServiceUri $serviceUri -ExpectedApplicationClientId $expClientId -ExpectedAccess Allowed
```

Cosmos checks account/database/container/partition metadata, not document CRUD or every direct-transport path; its initial supported
audience/endpoint contract is AzureCloud only. A 403 at root metadata remains a real scope/provider gate, not permission to broaden the
database-scoped grant. SQL checks real current-user/client-SID binding and effective database/object read-write permissions; omitting
`RequiredTables` leaves schema `NotVerified`. Table absence/invisibility is not repaired.

Run the auth call again from the **actual frontend** context with `ExpectedPrincipalId=$frontendPrincipalId`. Run a separate
`ExpectedAccess Denied` call only from an available real denied actor, using that actor's actual expected principal ID. Failure to acquire a
token is not service denial proof.

Auth proof requires non-secret readiness, anonymous 401 and authenticated 404 (allowed) or 403 (denied) on a fresh nonexistent protected
root path. It never requests config/admin secrets or follows redirects. Optional `WrongAudienceToken` is a SecureString supplied through an
approved existing credential channel: only a current matching-context v2 token with a verified tenant signature is suitable.
Unsigned/bad-signature/expired/unavailable negative context stays `NotVerified`; no unrelated powerful token is fetched implicitly.

Only use `ServiceUri` from the approved site's metadata (or the intended `https://exp.arolariu.ro/` after DNS). An Azure hostname suffix is
not independent ownership proof. Do not forward credentials to a hostname copied from untrusted output.

## 9. Selectively delete or permanently purge

Each command discovers/selects **one** object and separately confirms its action. Native name patterns are manual-only; automation uses
exact IDs, expected client IDs for Graph, and explicit `NonInteractive -Confirm:$false`. There is no global Force or cascade/prefix sweep.
Permanent purges additionally require typing/passing the exact selected canonical resource/object ID.

AI: explicitly remove model deployments first, then an empty active account, then decide **separately** whether recovery should remain
possible or an exact retained record should be irreversibly purged. Provisioned deployment billing can continue after account deletion until
purge; deleting models first avoids treating account deletion as a billing stop.

```powershell
& (Join-Path $tasks 'Remove-AiDeployment.ps1') -TenantId $tenant -SubscriptionId $subscription `
    -ResourceGroupName $group -AccountName "$prefix-ai-foundry" -DeploymentName '*'
& (Join-Path $tasks 'Remove-AiAccount.ps1') -TenantId $tenant -SubscriptionId $subscription `
    -ResourceGroupName $group -AccountName "$prefix-ai-foundry"
& (Join-Path $tasks 'Remove-DeletedAiAccount.ps1') -TenantId $tenant -SubscriptionId $subscription `
    -ResourceGroupName $group -Location 'swedencentral' -AccountName '*'
```

The last task uses original group/location, even if the group no longer exists. It refuses an active/recovered account and requires existing
subscription-level `Microsoft.CognitiveServices/locations/resourceGroups/deletedAccounts/delete` authority; group Contributor does not
manufacture that permission. It never grants subscription Contributor. Reuse an exact retained ID with explicit permanent acknowledgement
only after approving that irreversible action.

Entra: **preserve the registration by default**. Use the SP-only task if only the enterprise-app principal should be removed. Application
removal is a different task and can have provider-owned linked-SP effects; observations report what remains rather than asserting a cascade.
A restored/recreated registration/SP can change client/principal IDs and Bicep alternate-key behavior.

```powershell
& (Join-Path $tasks 'Remove-EntraServicePrincipal.ps1') -TenantId $tenant -DisplayName '*experiments*'
& (Join-Path $tasks 'Remove-EntraApplication.ps1') -TenantId $tenant -DisplayName '*experiments*'
& (Join-Path $tasks 'Remove-DeletedEntraApplication.ps1') -TenantId $tenant -DisplayName '*experiments*'
& (Join-Path $tasks 'Remove-DeletedEntraServicePrincipal.ps1') -TenantId $tenant -DisplayName '*experiments*'
```

These are **alternatives/independent phases**, not a block to execute blindly. Inspect displayed object ID, client ID, type, home tenant and
deletion generation. The deleted-item tasks accept only their own eligible actual Graph type, never users/groups, foreign/first-party
objects or managed-identity backing SPs. Neither permanent purge implicitly purges a linked object. An explicitly identified local orphan
needs authoritative metadata and an independently supplied expected client ID; missing ownership is a failure, not a guess.

Example automation after exact target approval (values are variables, never placeholders that authorize a real object):

```powershell
& {
    $PSDefaultParameterValues = @{ Disabled = $true }
    & (Join-Path $tasks 'Remove-DeletedEntraApplication.ps1') -TenantId $tenant `
        -ApplicationObjectId $approvedDeletedApplicationObjectId -ExpectedApplicationClientId $approvedApplicationClientId `
        -AcknowledgePermanentDeletion $approvedDeletedApplicationObjectId.ToString() -NonInteractive -Confirm:$false
}
```

## 10. Recover owned access, not business data

`Changed` describes the business target. A leased inspection can return `NoChange`, `AccessChanged=true`, `CleanupStatus=Completed`. Unknown
WhatIf state is deferred, not absent/verified. No success result is emitted when cleanup fails.

Preserve the non-secret recovery receipt, inspect its exact task/tenant/subscription/target and pending owned IDs, and invoke **that same
owner's** cleanup-only mode. Do not dynamically execute an arbitrary filename from an untrusted receipt:

```powershell
& (Join-Path $tasks 'Ensure-SqlContainedUser.ps1') -TenantId $tenant -SubscriptionId $subscription `
    -TargetResourceId $databaseId -ResumeCleanup -RecoveryReceiptPath $receiptPath
```

Use the corresponding secret/ordinary/reference/membership filename for its receipt. Cleanup does not repeat the business mutation and
refuses changed ownership/administrator/firewall state. Do not overwrite another operator's concurrent change or remove a pre-existing
grant. If recovery cannot verify controller state, stop and reconcile the exact pending IDs with approved authority.

Receipts can contain necessary prior/temporary SQL login metadata. Protect them as operator artifacts. Hard process/host loss can bypass
`finally`; role removal does not guarantee immediate authorization-cache eviction. Retain recovery state outside ephemeral hosts. No data
deletion, secret rotation, schema repair, restore, role escalation or resource-group rollback is a cleanup fallback.

For separately approved deploymentScripts hosting, stage the unchanged canonical file and declared modules. Keep `cleanupPreference`
`Always` and script-record retention at the documented minimum, observe exact execution/ACI/backing-storage IDs, and verify removal after
success **and failure**, plus eventual record expiry. Do not delete application storage or permanent identities as host cleanup. See the
[hosting example](README.md#non-executed-standalone-deploymentscripts-example); no host is deployed by this toolkit.

## Remaining readiness and evidence gates

| Gate                                    | Required outcome before a rebuild is declared ready                                                               |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| DNS/registrar/vendor records/TLS        | Approved continuity/migration and externally observed propagation/certificates                                    |
| Existing admin authorization/exclusions | Separate reviewed security correction; the config inspector currently fails them                                  |
| Auth database schema                    | Approved initialization/restore and real `/auth/*` proof, not health/SELECT 1                                     |
| Cosmos scoped permissions               | Actual backend metadata/data evidence; no guessed broader role                                                    |
| SQL binding/permissions                 | Actual backend principal/client-SID login and effective permissions/schema                                        |
| Easy Auth v2                            | Actual allowed and available denied caller contexts; unavailable negatives remain unverified                      |
| Provider/Graph/model quotas             | Exact target/region/authority and real provider validation under a new checkpoint                                 |
| Retained names                          | Deliberate recovery/purge/preserve decision; no protected-vault bypass                                            |
| Release refs/settings                   | Compatible reviewed image/code SHA, real public registration variable and correct CI/runtime identity distinction |
| Final website image                     | DEVELOPMENT and PRODUCTION Linux smoke scenarios genuinely pass before release                                    |

Offline PowerShell tests exercise the real task files with external boundaries faked; they are not live cloud permission/deletion proof. For
this delivery, local final-image execution remained unavailable: the approved Microsoft proxy returned 404 for pinned
`vite-plugin-storybook-nextjs@10.6.4`. The operator accepted that local prerequisite exception. Syntax/contract checks do not replace the
image test; the CI smoke gate remains enabled before image push. No live Azure/Graph/SQL operation is implied by these instructions.
