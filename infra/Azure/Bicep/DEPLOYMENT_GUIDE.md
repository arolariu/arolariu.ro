# Fresh infrastructure deployment guide

This runbook deploys the [two-stage Bicep graph](README.md) into a newly approved scope. It does not migrate, reconcile, or tear down an
existing environment. Commands below are examples for an operator who has obtained the stated approvals; they have not themselves
established Azure readiness.

## 1. Approve the target and preflight

Before any Azure validation, what-if, deployment, provider registration, or release, record the tenant, subscription, fresh resource group,
regions, authority, and accepted cost. The checked-in profile is `arolariu-rg` in France Central, with AI in Sweden Central and Static Web
Apps in West Europe. Existing release workflows expect that resource group and the fixed application names.

Confirm these prerequisites without deleting conflicting resources:

- Global availability of the fixed App Service/Static Web App names, generated service names, and authority over `arolariu.ro`. Changing the
  resource group alone does not isolate the fixed names or the public domain.
- Approved permissions to create the resource group/resources and assign their scoped roles. Azure RBAC does not grant Microsoft Graph
  permissions: separately authorize the Graph extension's application, service-principal, and group operations in the target tenant.
- Required registered providers: `Microsoft.Resources`, `Microsoft.ManagedIdentity`, `Microsoft.KeyVault`, `Microsoft.AppConfiguration`,
  `Microsoft.Storage`, `Microsoft.ContainerRegistry`, `Microsoft.Sql`, `Microsoft.DocumentDB`, `Microsoft.Web`, `Microsoft.Insights`,
  `Microsoft.OperationalInsights`, `Microsoft.Network`, `Microsoft.Cdn`, `Microsoft.CognitiveServices`, and `Microsoft.ContainerInstance`.
- Quota and regional support for the declared plans/databases, deployment-script ACI and backing storage, Front Door, and AI. The AI
  contract is `model-router`, `OpenAI`, version `2025-11-18`, `GlobalStandard`, capacity `10`, in Sweden Central. Stop for approval if
  unavailable; do not silently substitute a region, model, SKU, or capacity.
- Network access to the Azure management/data endpoints and the script services. Domains also requires the public Cloudflare JSON DNS
  resolver. It sends public DNS names/types, not credentials or expected verification tokens.

There is no bootstrap-only identity to remove. The infrastructure identity intentionally remains SQL Entra administrator, App Configuration
Data Owner, and Key Vault Secrets Officer at the approved scopes. SQL permits Azure-service traffic through the `0.0.0.0`-`0.0.0.0` firewall
exception; this includes Azure traffic outside this subscription and still requires database authentication. Do not treat that rule as a
private endpoint.

## 2. Compile and test locally

Run from the repository root with its existing dependencies. Select a verified stable Bicep 0.48.1 executable explicitly through
`BICEP_CLI_PATH`; do not assume Azure CLI's separately installed compiler is the same executable. This compiler recognizes all current pins,
with the approved Storage `2026-06-01` compatibility exception. Treat BCP081 as a failed schema gate even if compilation exits zero.

```powershell
$Bicep = $env:BICEP_CLI_PATH
if ([string]::IsNullOrWhiteSpace($Bicep)) { throw 'Set BICEP_CLI_PATH to the verified compiler executable.' }
& $Bicep --version

$Artifacts = Join-Path $env:TEMP ('arolariu-bicep-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $Artifacts | Out-Null
$Template = Join-Path $Artifacts 'main.json'
$Parameters = Join-Path $Artifacts 'main.parameters.json'
& $Bicep build .\infra\Azure\Bicep\main.bicep --no-restore --outfile $Template
if ($LASTEXITCODE -ne 0) { throw 'Template compilation failed.' }
& $Bicep build-params .\infra\Azure\Bicep\main.bicepparam --no-restore --outfile $Parameters
if ($LASTEXITCODE -ne 0) { throw 'Parameter compilation failed.' }
& $Bicep lint .\infra\Azure\Bicep\main.bicep --no-restore
if ($LASTEXITCODE -ne 0) { throw 'Template linting failed.' }

npm exec --no -- vitest run --config .\scripts\vitest.config.ts .\scripts\azure\bicep.test.ts .\scripts\architecture.test.ts --coverage.enabled=false
```

Inspect compiler diagnostics as well as exit codes. If the pinned Graph extension is missing from the cache, restore the existing reference
with `& $Bicep restore .\infra\Azure\Bicep\main.bicep`, then repeat compilation. Do not suppress missing schemas or enable experimental
features. Generated JSON must come from the current source, not a historical ARM snapshot.

The tests compile real templates and execute their inline scripts with closed external-boundary fakes. They prove local contracts,
retry/failure behavior, and cleanup requests, not actual Azure permissions, model availability, certificates, or resource deletion.
Application integration also requires the repository's focused audience/health tests, `npm run test:unit`, and `npm run build:website`.

## 3. Deploy Foundation after target approval

Use the compiled JSON to avoid Azure CLI recompiling with a different Bicep binary. Pass the approved subscription explicitly and verify the
tenant before proceeding. The examples retain the checked-in fixed-name profile; a different profile needs a separate compatibility
decision.

```powershell
$TenantId = '<approved-tenant-id>'
$SubscriptionId = '<approved-subscription-id>'
az login --tenant $TenantId
az account show --subscription $SubscriptionId --query '{tenant:tenantId, subscription:id}' --output table

$FoundationDeployment = 'arolariu-foundation-' + (Get-Date -Format 'yyyyMMddHHmmss')
az deployment sub what-if --subscription $SubscriptionId --name $FoundationDeployment --location francecentral --template-file $Template --parameters "@$Parameters" deploymentStage=foundation
```

Review the actual proposed resources, privileges, public endpoints, and costs. What-if is not proof of data-plane or Graph success. After
the concrete deployment approval:

```powershell
az deployment sub create --subscription $SubscriptionId --name $FoundationDeployment --location francecentral --template-file $Template --parameters "@$Parameters" deploymentStage=foundation
az deployment sub show --subscription $SubscriptionId --name $FoundationDeployment --query 'properties.outputs.deploymentInfo.value' --output json
```

Foundation provisions resources, applies permanent scoped grants, bootstraps the backend SQL user, probes backend SQL/Cosmos/blob/queue
access, then populates resolved configuration and prepares application hosts/DNS. A failed bootstrap or probe fails deployment; it must not
be reinterpreted as successful readiness.

The SQL user is bound to the backend identity SID and receives reader/writer/DDL memberships, not database owner. The separate backend login
probe is the required live SID-encoding proof. Cosmos probes account/container metadata and read-only invoice/merchant queries within the
approved database-scoped native grant. Blob list and queue peek use the backend identity without test writes or visibility changes. If any
identity check fails, investigate that exact operation; do not broaden permissions, silently remap users, add Graph Directory Readers, or
fall back to account keys.

## 4. Complete the external handoffs

### Third-party Key Vault values

Use the emitted `resources.keyVaultName` and the established secret-management process to supply these operator-owned values:

| Environment | Secret names                                                                             |
| ----------- | ---------------------------------------------------------------------------------------- |
| DEVELOPMENT | `DEVELOPMENT-ClerkPublishableKey`, `DEVELOPMENT-ClerkSecretKey`, `DEVELOPMENT-ResendKey` |
| PRODUCTION  | `PRODUCTION-ClerkPublishableKey`, `PRODUCTION-ClerkSecretKey`, `PRODUCTION-ResendKey`    |

Never put their values in parameters, source, deployment outputs, tickets, or terminal transcripts. The bootstrap does not overwrite them.
Missing/known-placeholder values appear in `pendingExternalSecretNames`; an authorization/service failure is not classified as a missing
secret. Rerun Foundation with a new deployment attempt after supplying missing values to refresh that report.

Resend is optional: when its value is absent/known-placeholder, the bootstrap writes an ordinary empty email setting instead of a dangling
Key Vault reference. Email stays disabled and configuration startup can proceed once required Clerk values exist. A real operator-supplied
Resend key remains a typed reference and is never overwritten.

Both website labels call the same API and therefore reference its `PRODUCTION-JWT-SECRET`. It is generated from 64 random bytes only when
absent/known-placeholder; real existing values are preserved. Any old `DEVELOPMENT-JWT-SECRET` is left untouched, not rotated or deleted.
This profile does not deploy independent development API authentication. AI keys come from the actual deployed account through secure
template channels. Endpoints, managed identity selectors, telemetry, and versionless Key Vault references are populated automatically. Do
not manually patch Azure endpoint placeholders or run SQL grant files.

### Registrar delegation and DNSSEC

Publish `dnsDelegation.nameServers` as the domain's registrar nameservers and the **current** `dnsDelegation.dsRecords` in the parent zone.
Coordinate DS replacement/rollover with the registrar; stale parent DS can make the domain unavailable. Azure-owned records and verification
tokens are already prepared by Foundation. No placeholder vendor DNS record is a deployment prerequisite.

### Existing GitHub connections

Update the existing development/production environment connections with `githubConnectionValues`:

| Existing value name                         | Value to use                                            |
| ------------------------------------------- | ------------------------------------------------------- |
| `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`  | Emitted tenant/subscription.                            |
| `AZURE_CONTAINER_REGISTRY_ADDRESS`          | Emitted registry login server.                          |
| `AZURE_CLIENT_ID`                           | Infrastructure UAMI client ID.                          |
| `AZURE_FRONTEND_MANAGED_IDENTITY_CLIENT_ID` | Infrastructure UAMI client ID, despite the legacy name. |
| `AZURE_BACKEND_MANAGED_IDENTITY_CLIENT_ID`  | Infrastructure UAMI client ID, despite the legacy name. |

Only the infrastructure identity has GitHub federation for the existing `development` and `production` environments. These legacy secret
names select the **CI login**, not the application runtime identity. App Service settings supply the actual frontend/backend client IDs and
override baked build arguments. Preserve existing static-site credential handling. Do not add a new infrastructure workflow, change
federated subjects, or dispatch a release without its separate approval.

## 5. Complete Domains, then release applications

After public registrar propagation, use the same compiled source/profile and a new deployment name:

```powershell
$DomainsDeployment = 'arolariu-domains-' + (Get-Date -Format 'yyyyMMddHHmmss')
az deployment sub what-if --subscription $SubscriptionId --name $DomainsDeployment --location francecentral --template-file $Template --parameters "@$Parameters" deploymentStage=domains
# Run create only after reviewing and approving this stage's actual plan.
az deployment sub create --subscription $SubscriptionId --name $DomainsDeployment --location francecentral --template-file $Template --parameters "@$Parameters" deploymentStage=domains
az deployment sub show --subscription $SubscriptionId --name $DomainsDeployment --query 'properties.outputs.deploymentInfo.value' --output json
```

Domains does not redeploy Foundation or update the resource group. Its bounded DNS gate compares public NS/current DS/CNAME/TXT/apex A
answers with the actual current Azure resources before certificates, SNI bindings, and Front Door route/WAF completion. DNS not ready,
resolver failure, and invalid input fail distinctly; do not bypass the gate with manual hostname/SSL commands.

Then use the unchanged release workflows in dependency order: **experiments, API, production/development website**. CV/docs/status content
can ship independently once their hosts, credentials, and domains exist. The experiments placeholder image and provisioned App Service
runtime settings are not released applications.

After releases, check the website `/api/health/`, API `/health`, and experiments `/api/health`, actual container pulls, experiments
audience/caller authorization, and a real permitted application flow. Verify AI inference against the pinned model separately. A successful
Bicep deployment never implies these application checks passed.

The cloud Cosmos check reuses the application's authenticated singleton client to read the `primary` database, with a ten-second
health-check timeout and cancellation. Denied data access reports unhealthy; it is not an anonymous endpoint-reachability check. The
existing local emulator URL probe is unchanged.

## 6. Observe execution-resource cleanup on success and failure

All four inline scripts use provider-created ACI/backing storage, `cleanupPreference: 'Always'`, one-hour record retention, stable names,
and a per-attempt force-update tag. No script uses the application Storage account for execution. Permanent infrastructure identities, SQL
administration, and configuration-writer roles are not disposable bootstrap resources.

For **both a successful run and a separately approved controlled failed run**:

1. Capture the exact script resource IDs and their `properties.status.containerInstanceId` / `storageAccountId` before record expiry.
   Successful Foundation/Domains outputs aggregate these as `executionResourceIds`; failed parent deployments may have no outputs, so read
   the known script records directly.
2. Query every captured execution ID and require an explicit resource-not-found/404 after provider cleanup. A 403, timeout, policy denial,
   or unreadable status is not evidence of deletion.
3. Check each deployment-script record's expiration/status and, after retention expires, require its own resource-not-found response. Record
   timestamps and exact IDs without secret environment values or unsanitized service response bodies.

The script names are `<resourcePrefix>-sql-bootstrap`, `<resourcePrefix>-backend-probe`, `<resourcePrefix>-config-bootstrap`, and
`<resourcePrefix>-dns-readiness`. Inspect only status, not the entire configuration/script resource:

```powershell
# Set ScriptId and ExecutionId to exact captured IDs in the approved target.
az resource show --subscription $SubscriptionId --ids $ScriptId --api-version 2023-08-01 --query 'properties.{state:provisioningState,container:status.containerInstanceId,storage:status.storageAccountId,expires:status.expirationTime}' --output json
az resource show --subscription $SubscriptionId --ids $ExecutionId --query id --output tsv
```

Use a dedicated, approved failure scenario; never cause failure by deleting application data, revoking permanent production grants, or
breaking public DNS. If an execution resource remains, retain its exact ID and diagnose the provider/policy error. Any manual deletion
requires exact-resource approval. Do not delete the resource group, application Storage, or all resources matching a prefix as cleanup.

## Recovery and evidence

Stop on failed validation and preserve safe error categories, deployment names, and exact affected IDs. Fix the source or approved external
prerequisite, then rerun the appropriate stage with a new attempt timestamp. Foundation preserves real JWT/third-party secret material;
Domains completes existing resources without invoking Foundation.

There is no automatic resource-group-delete rollback. Resource groups contain persistent application data and Key Vault has purge
protection; Entra resources also have a separate lifecycle. Production migration, data restoration, name replacement, permission broadening,
and teardown each require a separate plan and approval.

Record local checks separately from Azure bootstrap, external handoffs, domain completion, observed cleanup, and post-release health. The
[historical cost guide](COST_OPTIMIZATION.md) is not a current deployment quote.

References: [Bicep CLI](https://learn.microsoft.com/azure/azure-resource-manager/bicep/bicep-cli),
[deployment-script cleanup](https://learn.microsoft.com/azure/azure-resource-manager/bicep/deployment-script-bicep),
[Graph Bicep prerequisites](https://learn.microsoft.com/graph/templates/bicep/quickstart-create-bicep-interactive-mode).
