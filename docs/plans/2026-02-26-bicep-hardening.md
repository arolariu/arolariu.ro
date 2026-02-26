# Bicep IaC Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden the entire Bicep IaC architecture — fix security vulnerabilities across all modules, migrate RBAC to resource-level scoping with least privilege, harden Front Door/WAF, tighten storage and database security, enforce stricter linting, and clean up outputs.

**Architecture:** The current architecture assigns all 28 RBAC role assignments at resource-group scope and creates them before target resources exist. This plan restructures RBAC to be co-located after each resource is deployed (AVM pattern), scoped to the individual resource. It also fixes security gaps found across modules during a full audit.

**Tech Stack:** Azure Bicep, Azure RBAC, Azure CLI

---

## Full Audit Results

### Critical Issues

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | WAF has zero managed rule sets (prevention mode with no rules) | Critical | `network/azureFrontDoor.bicep:84-86` |
| 2 | `allowBlobPublicAccess: true` on storage account | Critical | `storage/storageAccount.bicep:75` |
| 3 | `allowSharedKeyAccess: true` despite managed identity auth | Critical | `storage/storageAccount.bicep:76` |
| 4 | `adminUserEnabled: true` on container registry | Critical | `storage/containerRegistry.bicep:72` |
| 5 | OpenAI module outputs entire resource object (may leak secrets) | Critical | `ai/openai.bicep:77` |

### High Issues

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 6 | All 28 RBAC assignments at resource-group scope | High | `rbac/*.bicep` |
| 7 | Front Door `enforceCertificateNameCheck: false` (disables TLS hostname verification on origin) | High | `network/azureFrontDoor.bicep:194` |
| 8 | Health probe interval 100 seconds (too slow for failure detection) | High | `network/azureFrontDoor.bicep:179` |
| 9 | Cosmos DB `disableLocalAuth: false` | High | `storage/noSqlServer.bicep:83` |
| 10 | Storage network ACLs `defaultAction: 'Allow'` | High | `storage/storageAccount.bicep:79` |
| 11 | Missing critical linter rules | High | `bicepconfig.json` |

### Medium Issues

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 12 | Backend has redundant Blob Contributor + Blob Data Owner | Medium | `rbac/backend-uami-rbac.bicep` |
| 13 | Backend has OpenAI Contributor (only needs User) | Medium | `rbac/backend-uami-rbac.bicep` |
| 14 | Backend has Key Vault Contributor (only needs Secrets User) | Medium | `rbac/backend-uami-rbac.bicep` |
| 15 | Infrastructure has redundant ACR Read/Pull/Push/Contributor | Medium | `rbac/infrastructure-uami-rbac.bicep` |
| 16 | Grafana `azureMonitorWorkspaceIntegrations: []` (not connected) | Medium | `observability/grafana.bicep:78` |
| 17 | App Insights outputs deprecated `InstrumentationKey` | Medium | `observability/application-insights.bicep:88` |
| 18 | Network deploymentFile comment says "Premium" but SKU is Standard | Medium | `network/deploymentFile.bicep:8` |
| 19 | Container registry has duplicate outputs (`containerRegistryId` and `containerRegistryResourceId`) | Low | `storage/containerRegistry.bicep:96-97` |
| 20 | Dev site has `functionAppScaleLimit: 0` (Function App property, not App Service) | Low | `sites/dev-arolariu-ro.bicep:92` |
| 21 | Using JSON param files instead of `.bicepparam` | Low | `main.parameters.json` |
| 22 | Role definition GUIDs duplicated across 3 RBAC files | Low | `rbac/*.bicep` |
| 23 | Cosmos DB missing resource ID output | Low | `storage/noSqlServer.bicep` |
| 24 | App Configuration missing name output | Low | `configuration/appConfiguration.bicep` |

---

## Task 1: Harden Linter Configuration

**Files:**
- Modify: `infra/Azure/Bicep/bicepconfig.json`

**Step 1: Read the current bicepconfig.json**

**Step 2: Replace with hardened configuration**

Add all security rules at `error` level, add code quality rules, enable `use-recent-api-versions`:

```json
{
  "experimentalFeaturesEnabled": {
    "symbolicNameCodegen": true,
    "compileTimeImports": true
  },
  "analyzers": {
    "core": {
      "enabled": true,
      "verbose": false,
      "rules": {
        "no-hardcoded-env-urls": { "level": "error" },
        "no-hardcoded-location": { "level": "error" },
        "no-loc-expr-outside-params": { "level": "error" },
        "no-unused-params": { "level": "warning" },
        "no-unused-vars": { "level": "warning" },
        "no-unused-existing-resources": { "level": "warning" },
        "no-unused-imports": { "level": "warning" },
        "secure-parameter-default": { "level": "error" },
        "secure-params-in-nested-deploy": { "level": "error" },
        "secure-secrets-in-params": { "level": "error" },
        "outputs-should-not-contain-secrets": { "level": "error" },
        "use-secure-value-for-secure-inputs": { "level": "error" },
        "protect-commandtoexecute-secrets": { "level": "error" },
        "adminusername-should-not-be-literal": { "level": "error" },
        "simplify-interpolation": { "level": "warning" },
        "prefer-interpolation": { "level": "warning" },
        "prefer-unquoted-property-names": { "level": "warning" },
        "no-unnecessary-dependson": { "level": "warning" },
        "no-deployments-resources": { "level": "warning" },
        "no-conflicting-metadata": { "level": "warning" },
        "no-explicit-any": { "level": "error" },
        "use-parent-property": { "level": "warning" },
        "use-resource-symbol-reference": { "level": "warning" },
        "use-safe-access": { "level": "warning" },
        "use-stable-resource-identifiers": { "level": "warning" },
        "use-recent-api-versions": { "level": "warning", "maxAllowedAgeInDays": 730 },
        "max-params": { "level": "warning", "maxNumberOfParameters": 20 },
        "max-variables": { "level": "warning", "maxNumberOfVariables": 30 },
        "max-outputs": { "level": "warning", "maxNumberOfOutputs": 15 },
        "max-resources": { "level": "error" },
        "max-asserts": { "level": "error" }
      }
    }
  },
  "formatting": {
    "indentKind": "Space",
    "indentSize": 2,
    "insertFinalNewline": true,
    "keepMultipleBlankLines": false
  },
  "cloud": {
    "currentProfile": "AzureCloud"
  }
}
```

**Step 3: Run `az bicep build --file infra/Azure/Bicep/main.bicep` to find violations**

Expected: Will flag multiple issues — fix them in subsequent tasks.

**Step 4: Commit**

```bash
git add infra/Azure/Bicep/bicepconfig.json
git commit -m "chore(infra): harden bicep linter — all security rules at error level"
```

---

## Task 2: Fix Azure Front Door Security

**Files:**
- Modify: `infra/Azure/Bicep/network/azureFrontDoor.bicep`
- Modify: `infra/Azure/Bicep/network/deploymentFile.bicep`

**Step 1: Read `azureFrontDoor.bicep`**

**Step 2: Add DRS managed rule set to WAF**

Replace the empty `managedRuleSets` with the Default Rule Set:

```bicep
managedRules: {
  managedRuleSets: [
    {
      ruleSetType: 'Microsoft_DefaultRuleSet'
      ruleSetVersion: '2.1'
      ruleSetAction: 'Block'
    }
    {
      ruleSetType: 'Microsoft_BotManagerRuleSet'
      ruleSetVersion: '1.1'
    }
  ]
}
```

**Step 3: Fix origin security and health probe settings**

```bicep
// Fix enforceCertificateNameCheck — enable TLS hostname verification
enforceCertificateNameCheck: true

// Fix health probe interval — 30s for faster failure detection
healthProbeSettings: {
  probePath: '/'
  probeRequestType: 'HEAD'
  probeProtocol: 'Https'
  probeIntervalInSeconds: 30
}
```

**Step 4: Fix the "Premium" comment in `network/deploymentFile.bicep:8`**

Change `Azure Front Door Premium` to `Azure Front Door Standard`.

**Step 5: Commit**

```bash
git add infra/Azure/Bicep/network/
git commit -m "fix(infra): harden Front Door — add WAF rules, fix origin TLS, faster health probes"
```

---

## Task 3: Fix Storage Account Security

**Files:**
- Modify: `infra/Azure/Bicep/storage/storageAccount.bicep`

**Step 1: Read `storageAccount.bicep`**

**Step 2: Harden storage security properties**

```bicep
// Disable public blob access — use SAS tokens or MI instead
allowBlobPublicAccess: false

// Disable shared key access — enforce managed identity auth
allowSharedKeyAccess: false
```

**Step 3: Commit**

```bash
git add infra/Azure/Bicep/storage/storageAccount.bicep
git commit -m "fix(infra): disable public blob access and shared key access on storage"
```

---

## Task 4: Fix Container Registry Security

**Files:**
- Modify: `infra/Azure/Bicep/storage/containerRegistry.bicep`

**Step 1: Read `containerRegistry.bicep`**

**Step 2: Disable admin user and remove duplicate output**

```bicep
// Disable admin user — use managed identity for all access
adminUserEnabled: false
```

Remove the duplicate output `containerRegistryResourceId` (keep `containerRegistryId`).

**Step 3: Commit**

```bash
git add infra/Azure/Bicep/storage/containerRegistry.bicep
git commit -m "fix(infra): disable ACR admin user, remove duplicate output"
```

---

## Task 5: Fix Dev Site Misconfiguration

**Files:**
- Modify: `infra/Azure/Bicep/sites/dev-arolariu-ro.bicep`

**Step 1: Read `dev-arolariu-ro.bicep`**

**Step 2: Remove `functionAppScaleLimit: 0`**

This property is for Function Apps, not App Services. Remove it entirely.

**Step 3: Commit**

```bash
git add infra/Azure/Bicep/sites/dev-arolariu-ro.bicep
git commit -m "fix(infra): remove invalid functionAppScaleLimit from dev site"
```

---

## Task 6: Fix Database Security

**Files:**
- Modify: `infra/Azure/Bicep/storage/noSqlServer.bicep`

**Step 1: Read `noSqlServer.bicep`**

**Step 2: Disable Cosmos DB local auth**

```bicep
disableLocalAuth: true
```

Add the missing resource ID output:
```bicep
output noSqlServerId string = noSqlServer.id
```

**Step 3: Commit**

```bash
git add infra/Azure/Bicep/storage/noSqlServer.bicep
git commit -m "fix(infra): disable Cosmos DB local auth, add missing ID output"
```

---

## Task 7: Fix OpenAI and Observability Outputs

**Files:**
- Modify: `infra/Azure/Bicep/ai/openai.bicep`
- Modify: `infra/Azure/Bicep/ai/deploymentFile.bicep`
- Modify: `infra/Azure/Bicep/observability/application-insights.bicep`
- Modify: `infra/Azure/Bicep/observability/grafana.bicep`
- Modify: `infra/Azure/Bicep/observability/deploymentFile.bicep`

**Step 1: Read all affected files**

**Step 2: Fix OpenAI — remove unsafe resource object output, add name output**

In `openai.bicep`, replace:
```bicep
// REMOVE: outputs entire resource (may leak secrets)
// output resource object = openAi

// ADD: safe individual outputs
output openAiName string = openAi.name
```

**Step 3: Update `ai/deploymentFile.bicep` to expose openAiName**

```bicep
output openAiName string = openAiDeployment.outputs.openAiName
```

**Step 4: Remove deprecated InstrumentationKey output from Application Insights**

In `application-insights.bicep`, remove:
```bicep
// REMOVE: deprecated, use connection string only
// output applicationInsightsInstrumentationKey string = applicationInsights.properties.InstrumentationKey
```

Update `observability/deploymentFile.bicep` to remove the InstrumentationKey forwarding:
```bicep
// REMOVE:
// output appInsightsInstrumentationKey string = applicationInsightsDeployment.outputs.applicationInsightsInstrumentationKey
```

**Step 5: Update sites to stop using deprecated InstrumentationKey**

In `sites/deploymentFile.bicep`, remove the `appInsightsInstrumentationKey` parameter.

In `sites/arolariu-ro.bicep` and `sites/api-arolariu-ro.bicep`:
- Remove the `appInsightsInstrumentationKey` parameter
- Remove the `APPINSIGHTS_INSTRUMENTATIONKEY` app setting (deprecated)
- Keep only `APPLICATIONINSIGHTS_CONNECTION_STRING`

**Step 6: Connect Grafana to the monitoring workspace**

Update `observability/deploymentFile.bicep` to pass workspace ID to Grafana:
```bicep
module managedGrafanaDeployment 'grafana.bicep' = {
  // ...
  params: {
    // ...
    logAnalyticsWorkspaceId: logAnalyticsWorkspaceDeployment.outputs.logAnalyticsWorkspaceId
  }
}
```

In `grafana.bicep`, accept and use the workspace ID:
```bicep
param logAnalyticsWorkspaceId string

// In properties:
grafanaIntegrations: {
  azureMonitorWorkspaceIntegrations: [
    { azureMonitorWorkspaceResourceId: logAnalyticsWorkspaceId }
  ]
}
```

**Step 7: Commit**

```bash
git add infra/Azure/Bicep/ai/ infra/Azure/Bicep/observability/ infra/Azure/Bicep/sites/
git commit -m "fix(infra): remove unsafe outputs, drop InstrumentationKey, connect Grafana"
```

---

## Task 8: Create Shared Role Definitions Type

**Files:**
- Create: `infra/Azure/Bicep/types/roles.type.bicep`

**Step 1: Create the shared role definitions file**

Single source of truth for all Azure built-in role definition GUIDs, eliminating duplication across 3 RBAC files:

```bicep
metadata description = 'Shared Azure built-in role definition GUIDs for RBAC assignments'
metadata version = '1.0.0'

// Storage Roles
@export() var storageBlobDataReader = '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1'
@export() var storageBlobDataContributor = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
@export() var storageBlobDataOwner = 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b'
@export() var storageQueueDataReader = '19e7f393-937e-4f77-808e-94535e297925'
@export() var storageQueueDataContributor = '974c5e8b-45b9-4653-ba55-5f855dd0fb88'
@export() var storageTableDataReader = '76199698-9eea-4c19-bc75-cec21354c6b6'
@export() var storageTableDataContributor = '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3'

// Container Registry Roles
@export() var acrPull = '7f951dda-4ed3-4680-a7ca-43fe172d538d'
@export() var acrPush = '8311e382-0749-4cb8-b61a-304f252e45ec'

// Database Roles
@export() var sqlDbContributor = '9b7fa17d-e63e-47b0-bb0a-15c516ac86ec'
@export() var cosmosDbDataOperator = '230815da-be43-4aae-9cb4-875f7bd000aa'

// Configuration Roles
@export() var appConfigurationDataReader = '516239f1-63e1-4d78-a4de-a74fb236a071'
@export() var appConfigurationDataOwner = 'fe86443c-f201-4fc4-9d2a-ac61149fbda0'
@export() var keyVaultSecretsUser = '4633458b-17de-408a-b874-0445c86b69e6'
@export() var keyVaultReader = '21090545-7ca7-4776-b22c-e363652d74d2'

// AI Roles
@export() var cognitiveServicesOpenAiUser = '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'

// Compute Roles
@export() var websiteContributor = 'de139f84-1756-47ae-9be6-808fbbe84772'
```

**Step 2: Commit**

```bash
git add infra/Azure/Bicep/types/roles.type.bicep
git commit -m "feat(infra): add shared role definition GUIDs for DRY RBAC"
```

---

## Task 9: Add Resource Name Outputs to All Modules

Before RBAC can be scoped to individual resources, each module must output the resource names needed for `existing` references.

**Files:**
- Modify: `infra/Azure/Bicep/storage/deploymentFile.bicep` — add `containerRegistryName` output
- Modify: `infra/Azure/Bicep/configuration/deploymentFile.bicep` — add `keyVaultName`, `appConfigurationName` outputs
- Modify: `infra/Azure/Bicep/configuration/appConfiguration.bicep` — add `appConfigurationName` output

**Step 1: Read each module to verify existing outputs**

**Step 2: Add missing outputs**

In `storage/deploymentFile.bicep` — ensure all these exist:
```bicep
output storageAccountName string = storageAccountDeployment.outputs.storageAccountName
output containerRegistryName string = containerRegistryDeployment.outputs.containerRegistryName
output sqlServerName string = sqlServerDeployment.outputs.sqlServerName
output cosmosAccountName string = noSqlServerDeployment.outputs.noSqlServerName
```

In `configuration/deploymentFile.bicep`:
```bicep
output keyVaultName string = keyVaultDeployment.outputs.mainKeyVaultName
output appConfigurationName string = appConfigurationDeployment.outputs.appConfigurationName
```

In `configuration/appConfiguration.bicep`:
```bicep
output appConfigurationName string = appConfiguration.name
```

**Step 3: Commit**

```bash
git add infra/Azure/Bicep/storage/ infra/Azure/Bicep/configuration/
git commit -m "feat(infra): add resource name outputs to all modules for RBAC scoping"
```

---

## Task 10: Create Resource-Scoped RBAC Modules

This is the core architectural change. Create one RBAC module per resource type, each scoping assignments to the specific resource. All files go directly into `rbac/`.

**Files:**
- Create: `infra/Azure/Bicep/rbac/storage-rbac.bicep`
- Create: `infra/Azure/Bicep/rbac/container-registry-rbac.bicep`
- Create: `infra/Azure/Bicep/rbac/key-vault-rbac.bicep`
- Create: `infra/Azure/Bicep/rbac/app-configuration-rbac.bicep`
- Create: `infra/Azure/Bicep/rbac/sql-server-rbac.bicep`
- Create: `infra/Azure/Bicep/rbac/cosmos-db-rbac.bicep`
- Create: `infra/Azure/Bicep/rbac/openai-rbac.bicep`
- Create: `infra/Azure/Bicep/rbac/websites-rbac.bicep`

**Design Pattern (all modules follow this):**
1. Takes the resource name as a parameter
2. Uses `existing` keyword to reference the resource
3. Takes principal IDs of identities that need access
4. Creates role assignments with `scope: <resource>` (NOT resource group)
5. Uses `guid(resource.id, principalId, roleDefinitionId)` for deterministic names
6. Imports role GUIDs from `types/roles.type.bicep`

**Step 1: Create `storage-rbac.bicep`**

Assigns to the storage account:
- Frontend: BlobDataReader, BlobDataContributor (uploads), QueueDataReader, TableDataReader
- Backend: BlobDataOwner (superset — no need for both Contributor and Owner), QueueDataContributor, TableDataContributor
- Infrastructure: BlobDataReader, QueueDataReader, TableDataReader

**Step 2: Create `container-registry-rbac.bicep`**

Assigns to the container registry:
- Frontend: AcrPull (no AcrRead — Pull implies Read)
- Backend: AcrPull
- Infrastructure: AcrPush, AcrPull (no Contributor — Push+Pull is sufficient for CI/CD)

**Step 3: Create `key-vault-rbac.bicep`**

Assigns to the Key Vault:
- Backend: KeyVaultSecretsUser (NOT Contributor — runtime only needs to read secrets)
- Infrastructure: KeyVaultSecretsUser, KeyVaultReader

**Step 4: Create `app-configuration-rbac.bicep`**

Assigns to the App Configuration store:
- Frontend: AppConfigurationDataReader
- Backend: AppConfigurationDataOwner (needs read + write)
- Infrastructure: AppConfigurationDataReader

**Step 5: Create `sql-server-rbac.bicep`**

Assigns to the SQL Server:
- Backend: SqlDbContributor

**Step 6: Create `cosmos-db-rbac.bicep`**

Assigns to the Cosmos DB account:
- Backend: CosmosDbDataOperator

**Step 7: Create `openai-rbac.bicep`**

Assigns to the OpenAI account:
- Backend: CognitiveServicesOpenAiUser only (NOT Contributor — only needs inference)

**Step 8: Create `websites-rbac.bicep`**

Assigns per web app (uses loop over app names):
- Infrastructure: WebsiteContributor scoped to each individual web app

**Step 9: Commit**

```bash
git add infra/Azure/Bicep/rbac/
git commit -m "feat(infra): create resource-scoped RBAC modules for all Azure resources"
```

---

## Task 11: Rewire Facade and Delete Old RBAC Files

Replace the old standalone RBAC module with resource-scoped RBAC calls. Delete old files directly.

**Files:**
- Modify: `infra/Azure/Bicep/facade.bicep`
- Delete: `infra/Azure/Bicep/rbac/frontend-uami-rbac.bicep`
- Delete: `infra/Azure/Bicep/rbac/backend-uami-rbac.bicep`
- Delete: `infra/Azure/Bicep/rbac/infrastructure-uami-rbac.bicep`
- Delete: `infra/Azure/Bicep/rbac/deploymentFile.bicep`

**Step 1: Read `facade.bicep`**

**Step 2: Remove the `rbacDeployment` module call**

**Step 3: Add resource-scoped RBAC calls after each resource is created**

```bicep
// Storage RBAC (after storage is deployed)
module storageRbac 'rbac/storage-rbac.bicep' = {
  name: 'storageRbac-${resourceDeploymentDate}'
  params: {
    storageAccountName: storageDeployment.outputs.storageAccountName
    frontendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[0].principalId
    backendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[1].principalId
    infrastructurePrincipalId: identitiesDeployment.outputs.managedIdentitiesList[2].principalId
  }
}

module containerRegistryRbac 'rbac/container-registry-rbac.bicep' = {
  name: 'containerRegistryRbac-${resourceDeploymentDate}'
  params: {
    containerRegistryName: storageDeployment.outputs.containerRegistryName
    frontendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[0].principalId
    backendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[1].principalId
    infrastructurePrincipalId: identitiesDeployment.outputs.managedIdentitiesList[2].principalId
  }
}

module sqlServerRbac 'rbac/sql-server-rbac.bicep' = {
  name: 'sqlServerRbac-${resourceDeploymentDate}'
  params: {
    sqlServerName: storageDeployment.outputs.sqlServerName
    backendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[1].principalId
  }
}

module cosmosDbRbac 'rbac/cosmos-db-rbac.bicep' = {
  name: 'cosmosDbRbac-${resourceDeploymentDate}'
  params: {
    cosmosAccountName: storageDeployment.outputs.cosmosAccountName
    backendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[1].principalId
  }
}

module keyVaultRbac 'rbac/key-vault-rbac.bicep' = {
  name: 'keyVaultRbac-${resourceDeploymentDate}'
  params: {
    keyVaultName: configurationDeployment.outputs.keyVaultName
    backendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[1].principalId
    infrastructurePrincipalId: identitiesDeployment.outputs.managedIdentitiesList[2].principalId
  }
}

module appConfigRbac 'rbac/app-configuration-rbac.bicep' = {
  name: 'appConfigRbac-${resourceDeploymentDate}'
  params: {
    appConfigurationName: configurationDeployment.outputs.appConfigurationName
    frontendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[0].principalId
    backendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[1].principalId
    infrastructurePrincipalId: identitiesDeployment.outputs.managedIdentitiesList[2].principalId
  }
}

module openAiRbac 'rbac/openai-rbac.bicep' = {
  name: 'openAiRbac-${resourceDeploymentDate}'
  params: {
    openAiAccountName: aiDeployment.outputs.openAiName
    backendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[1].principalId
  }
}

module websitesRbac 'rbac/websites-rbac.bicep' = {
  name: 'websitesRbac-${resourceDeploymentDate}'
  params: {
    webAppNames: [
      websiteDeployment.outputs.mainWebsiteName
      websiteDeployment.outputs.apiWebsiteName
      websiteDeployment.outputs.devWebsiteName
    ]
    infrastructurePrincipalId: identitiesDeployment.outputs.managedIdentitiesList[2].principalId
  }
}
```

**Step 4: Remove `rbacDeployment` from `dependsOn` on `storageDeployment`**

The storage module no longer waits for RG-level RBAC. Instead, RBAC modules depend on resource modules via parameter references.

**Step 5: Update the facade header comment with the new deployment order**

**Step 6: Delete old RBAC files directly**

```bash
git rm infra/Azure/Bicep/rbac/frontend-uami-rbac.bicep infra/Azure/Bicep/rbac/backend-uami-rbac.bicep infra/Azure/Bicep/rbac/infrastructure-uami-rbac.bicep infra/Azure/Bicep/rbac/deploymentFile.bicep
```

**Step 7: Commit**

```bash
git add infra/Azure/Bicep/facade.bicep
git commit -m "refactor(infra): migrate to resource-scoped RBAC, delete old RG-scoped files"
```

### RBAC Migration Summary

| Old (RG-scoped) | New (Resource-scoped) | Change |
|---|---|---|
| Frontend Storage Blob Reader | `storage-rbac.bicep` | Scoped to storage account |
| Frontend Storage Queue Reader | `storage-rbac.bicep` | Scoped to storage account |
| Frontend Storage Table Reader | `storage-rbac.bicep` | Scoped to storage account |
| Frontend App Config Reader | `app-configuration-rbac.bicep` | Scoped to App Config |
| Frontend Storage Blob Contributor | `storage-rbac.bicep` | Scoped to storage account |
| Frontend ACR Pull | `container-registry-rbac.bicep` | Scoped to ACR |
| Frontend ACR Read | **REMOVED** | Redundant — Pull implies Read |
| Backend Storage Blob Contributor | **REMOVED** | Redundant — Data Owner is superset |
| Backend Storage Blob Data Owner | `storage-rbac.bicep` | Scoped to storage account |
| Backend Storage Queue Contributor | `storage-rbac.bicep` | Scoped to storage account |
| Backend Storage Table Contributor | `storage-rbac.bicep` | Scoped to storage account |
| Backend SQL DB Contributor | `sql-server-rbac.bicep` | Scoped to SQL Server |
| Backend NoSQL DB Operator | `cosmos-db-rbac.bicep` | Scoped to Cosmos DB |
| Backend App Config Contributor | `app-configuration-rbac.bicep` | Scoped to App Config (as DataOwner) |
| Backend Key Vault Contributor | **DOWNGRADED** to Secrets User | Scoped to Key Vault |
| Backend Key Vault Secrets Contributor | **DOWNGRADED** to Secrets User | Scoped to Key Vault |
| Backend OpenAI Contributor | **REMOVED** | Only User needed for inference |
| Backend OpenAI User | `openai-rbac.bicep` | Scoped to OpenAI account |
| Backend ACR Pull | `container-registry-rbac.bicep` | Scoped to ACR |
| Backend ACR Read | **REMOVED** | Redundant — Pull implies Read |
| Infra Storage Blob Reader | `storage-rbac.bicep` | Scoped to storage account |
| Infra Storage Queue Reader | `storage-rbac.bicep` | Scoped to storage account |
| Infra Storage Table Reader | `storage-rbac.bicep` | Scoped to storage account |
| Infra App Config Reader | `app-configuration-rbac.bicep` | Scoped to App Config |
| Infra Key Vault Reader | `key-vault-rbac.bicep` | Scoped to Key Vault |
| Infra Key Vault Secrets Reader | `key-vault-rbac.bicep` (as Secrets User) | Scoped to Key Vault |
| Infra ACR Read | **REMOVED** | Redundant — Push implies Read |
| Infra ACR Pull | `container-registry-rbac.bicep` | Scoped to ACR |
| Infra ACR Push | `container-registry-rbac.bicep` | Scoped to ACR |
| Infra ACR Contributor | **REMOVED** | Push+Pull is sufficient |
| Infra Website Contributor | `websites-rbac.bicep` | Scoped per web app |

**Net reduction:** 28 RG-scoped assignments → 23 resource-scoped assignments (5 redundant + 3 overly broad removed)

---

## Task 12: Migrate to .bicepparam Files

**Files:**
- Create: `infra/Azure/Bicep/main.bicepparam`

**Step 1: Read `main.parameters.json`**

**Step 2: Create `main.bicepparam`**

```bicep
using 'main.bicep'

param resourceGroupName = 'arolariu-rg'
param resourceGroupLocation = 'swedencentral'
param resourceGroupAuthor = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
```

**Step 3: Commit**

```bash
git add infra/Azure/Bicep/main.bicepparam
git commit -m "feat(infra): add .bicepparam file for typed parameter declarations"
```

---

## Task 13: Update Documentation

**Files:**
- Modify: `infra/Azure/Bicep/README.md`
- Modify: `infra/Azure/Bicep/rbac/README.md`

**Step 1: Read both READMEs**

**Step 2: Update `rbac/README.md`**

Document:
- The resource-scoped RBAC architecture
- How to add a new role assignment (always scope to the specific resource)
- The role reduction (28 → 23)
- Cross-reference to `types/roles.type.bicep`

**Step 3: Update the main `README.md`**

Document:
- Updated deployment order (RBAC runs after resources, not before)
- .bicepparam migration
- Linter configuration updates
- Security hardening changes

**Step 4: Commit**

```bash
git add infra/Azure/Bicep/README.md infra/Azure/Bicep/rbac/README.md
git commit -m "docs(infra): update documentation for resource-scoped RBAC architecture"
```

---

## Task 14: Final Verification

**Step 1: Run full Bicep build**

Run: `az bicep build --file infra/Azure/Bicep/main.bicep --stdout > /dev/null`
Expected: Build succeeds with no errors

**Step 2: Run Bicep lint**

Run: `az bicep lint --file infra/Azure/Bicep/main.bicep`
Expected: No errors (warnings acceptable)

**Step 3: Verify no orphaned files**

Check that all `.bicep` files under `infra/Azure/Bicep/` are referenced by at least one module.

**Step 4: Review the complete diff**

Run: `git diff main --stat`

---

## Summary: Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| RBAC scope | Resource group (all 28) | Individual resource (23) |
| Redundant roles | 5 | 0 |
| Overly broad roles | 3 (KV Contributor, OpenAI Contributor, ACR Contributor) | 0 |
| WAF managed rules | 0 (empty — WAF is a no-op) | DRS 2.1 + Bot Manager 1.1 |
| Origin TLS verification | Disabled | Enabled |
| Health probe interval | 100s | 30s |
| Storage public blob access | Enabled | Disabled |
| Storage shared key access | Enabled | Disabled |
| ACR admin user | Enabled | Disabled |
| Cosmos DB local auth | Enabled | Disabled |
| OpenAI output | Leaks entire resource object | Safe individual outputs |
| App Insights InstrumentationKey | Exposed (deprecated) | Removed |
| Grafana integration | Empty (disconnected) | Connected to workspace |
| Linter rules | 12 rules | 28 rules (security=error) |
| Parameter format | JSON | .bicepparam |
| Role GUID duplication | 3 files | 1 shared type file |

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Changing RBAC scope creates new assignments alongside old ones | `guid()` seed changes from `resourceGroup().id` to `resource.id` — new assignments are created. Clean up old RG-scoped assignments via Portal/CLI after verifying access works. |
| `allowSharedKeyAccess: false` breaks tools using connection strings | Ensure all access uses managed identity. Storage Explorer and AzCopy support Azure AD auth. |
| `adminUserEnabled: false` on ACR breaks Docker CLI login | Use `az acr login` with Azure AD (already supported). CI/CD uses managed identity. |
| `disableLocalAuth: true` on Cosmos DB breaks connection string auth | Backend already uses managed identity via RBAC. No code changes needed. |
| WAF DRS 2.1 may block legitimate requests | Monitor WAF logs after deployment. Add custom exclusion rules for known false positives. |
