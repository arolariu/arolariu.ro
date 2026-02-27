# Bicep Infrastructure Optimization Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring the Bicep IaC to enterprise-grade quality — add diagnostic settings for full observability, protect production resources with locks, centralize tag generation, remove redundant code, and add missing parameter validation.

**Architecture:** This plan builds on the hardening PR (#461) and addresses the remaining gaps found by internal audit and external best practices research. It follows the AVM (Azure Verified Modules) interface patterns for diagnostic settings, locks, and tags.

**Tech Stack:** Azure Bicep, Azure CLI

---

## Current State Assessment

| Category | Finding | Count | Severity |
|----------|---------|-------|----------|
| Missing diagnostic settings | No resources send logs to Log Analytics | 12 resources | **Critical** |
| Missing resource locks | No CanNotDelete locks on production resources | 7 resources | **Critical** |
| Redundant `scope: resourceGroup()` | Unnecessary on modules already in RG scope | 31 occurrences | Low |
| Missing `@description` on params | Some parameters lack documentation | 8 parameters | Medium |
| Duplicated tag definitions | Every module copy-pastes the same `commonTags` var | 14 modules | Low |

---

## Phase 1: Diagnostic Settings (Observability)

Every resource that supports diagnostic settings should send logs and metrics to the central Log Analytics Workspace. This is the single highest-impact gap — without it, you're blind to security events, performance issues, and access patterns.

### Task 1: Create a reusable diagnostic settings pattern

**Files:**
- Create: `infra/Azure/Bicep/constants/diagnostics.bicep`

**Step 1: Create shared diagnostic settings type**

Define the type that all modules will accept:

```bicep
metadata description = 'Shared diagnostic settings types'
metadata version = '1.0.0'

@export()
type diagnosticSettingType = {
  @description('Log Analytics Workspace resource ID')
  workspaceId: string

  @description('Enable all log categories')
  enableAllLogs: bool?

  @description('Enable all metric categories')
  enableAllMetrics: bool?
}
```

**Step 2: Commit**

```bash
git commit -m "feat(infra): add shared diagnostic settings type"
```

### Task 2: Add diagnostic settings to Key Vault

**Files:**
- Modify: `infra/Azure/Bicep/configuration/keyVault.bicep`

**Step 1: Read keyVault.bicep**

**Step 2: Add a logAnalyticsWorkspaceId parameter and diagnostic settings resource**

```bicep
@description('Log Analytics Workspace ID for diagnostic settings.')
param logAnalyticsWorkspaceId string = ''

resource keyVaultDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = if (!empty(logAnalyticsWorkspaceId)) {
  scope: keyVault
  name: '${keyVault.name}-diagnostics'
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [{ categoryGroup: 'allLogs', enabled: true }]
    metrics: [{ category: 'AllMetrics', enabled: true }]
  }
}
```

**Step 3: Wire from configuration/deploymentFile.bicep — pass the workspace ID**

**Step 4: Wire from facade.bicep — pass `observabilityDeployment.outputs.logAnalyticsWorkspaceId` to configurationDeployment**

**Step 5: Commit**

```bash
git commit -m "feat(infra): add diagnostic settings to Key Vault"
```

### Task 3: Add diagnostic settings to Storage Account

**Files:**
- Modify: `infra/Azure/Bicep/storage/storageAccount.bicep`

**Step 1: Add logAnalyticsWorkspaceId param and diagnostic settings for the storage account, blob service, queue service, and table service**

Same pattern as Key Vault — use `categoryGroup: 'allLogs'` and `category: 'AllMetrics'`.

Note: Storage sub-services (blob, file, queue, table) each need their own diagnostic settings scoped to their respective service.

**Step 2: Commit**

```bash
git commit -m "feat(infra): add diagnostic settings to Storage Account and sub-services"
```

### Task 4: Add diagnostic settings to SQL Server and databases

**Files:**
- Modify: `infra/Azure/Bicep/storage/sqlServer.bicep`

**Step 1: Add diagnostic settings to the SQL Server and both databases**

SQL Server and each database need separate diagnostic settings. Key categories:
- Server: `SQLSecurityAuditEvents`
- Databases: `SQLInsights`, `AutomaticTuning`, `QueryStoreRuntimeStatistics`, `Errors`, `Deadlocks`

**Step 2: Commit**

```bash
git commit -m "feat(infra): add diagnostic settings to SQL Server and databases"
```

### Task 5: Add diagnostic settings to Cosmos DB

**Files:**
- Modify: `infra/Azure/Bicep/storage/noSqlServer.bicep`

**Step 1: Add diagnostic settings with categories for `DataPlaneRequests`, `QueryRuntimeStatistics`, `ControlPlaneRequests`**

**Step 2: Commit**

```bash
git commit -m "feat(infra): add diagnostic settings to Cosmos DB"
```

### Task 6: Add diagnostic settings to Container Registry

**Files:**
- Modify: `infra/Azure/Bicep/storage/containerRegistry.bicep`

**Step 1: Add diagnostic settings with `ContainerRegistryLoginEvents` and `ContainerRegistryRepositoryEvents`**

**Step 2: Commit**

```bash
git commit -m "feat(infra): add diagnostic settings to Container Registry"
```

### Task 7: Add diagnostic settings to Front Door

**Files:**
- Modify: `infra/Azure/Bicep/network/azureFrontDoor.bicep`

**Step 1: Add diagnostic settings to the Front Door profile with categories: `FrontDoorAccessLog`, `FrontDoorHealthProbeLog`, `FrontDoorWebApplicationFirewallLog`**

WAF logs are especially important — they show blocked requests and false positives after DRS 2.1 is deployed.

**Step 2: Commit**

```bash
git commit -m "feat(infra): add diagnostic settings to Front Door (including WAF logs)"
```

### Task 8: Add diagnostic settings to App Configuration

**Files:**
- Modify: `infra/Azure/Bicep/configuration/appConfiguration.bicep`

**Step 1: Add diagnostic settings with `HttpRequest` and `Audit` log categories**

**Step 2: Commit**

```bash
git commit -m "feat(infra): add diagnostic settings to App Configuration"
```

### Task 9: Wire Log Analytics Workspace ID through the facade

**Files:**
- Modify: `infra/Azure/Bicep/facade.bicep`
- Modify: `infra/Azure/Bicep/storage/deploymentFile.bicep`
- Modify: `infra/Azure/Bicep/configuration/deploymentFile.bicep`
- Modify: `infra/Azure/Bicep/network/deploymentFile.bicep`

**Step 1: Pass `logAnalyticsWorkspaceId` from facade to storage, configuration, and network deployment orchestrators**

The observability module deploys first and outputs the workspace ID. Pass it to all downstream modules that need diagnostic settings.

Reorder dependencies if needed — storage and configuration must `dependsOn` observability for the workspace ID output.

**Step 2: Each orchestrator passes it down to its leaf modules**

**Step 3: Commit**

```bash
git commit -m "feat(infra): wire Log Analytics workspace ID through facade for diagnostic settings"
```

---

## Phase 2: Resource Locks (Protection)

### Task 10: Add CanNotDelete locks to critical production resources

**Files:**
- Modify: `infra/Azure/Bicep/configuration/keyVault.bicep`
- Modify: `infra/Azure/Bicep/storage/storageAccount.bicep`
- Modify: `infra/Azure/Bicep/storage/sqlServer.bicep`
- Modify: `infra/Azure/Bicep/storage/noSqlServer.bicep`
- Modify: `infra/Azure/Bicep/storage/containerRegistry.bicep`
- Modify: `infra/Azure/Bicep/observability/log-analytics.bicep`

**Step 1: Add a `enableLock` boolean parameter (default `true`) to each module**

**Step 2: Add conditional lock resource**

```bicep
resource deleteLock 'Microsoft.Authorization/locks@2020-05-01' = if (enableLock) {
  scope: keyVault
  name: '${keyVault.name}-lock'
  properties: {
    level: 'CanNotDelete'
    notes: 'Protected from accidental deletion'
  }
}
```

Apply this pattern to: Key Vault, Storage Account, SQL Server, Cosmos DB, Container Registry, Log Analytics Workspace.

**Step 3: Commit**

```bash
git commit -m "feat(infra): add CanNotDelete locks to production resources"
```

---

## Phase 3: Code Quality Cleanup

### Task 11: Remove redundant `scope: resourceGroup()` declarations

**Files:**
- All deployment orchestrator files (facade.bicep, and all `*/deploymentFile.bicep`)

**Step 1: Remove all `scope: resourceGroup()` lines from module calls where the parent file already has `targetScope = 'resourceGroup'`**

31 redundant declarations across 9 files. These are unnecessary since the scope is inherited.

**Step 2: Commit**

```bash
git commit -m "refactor(infra): remove 31 redundant scope: resourceGroup() declarations"
```

### Task 12: Add missing `@description` decorators

**Files:**
- Modify: `infra/Azure/Bicep/sites/dev-arolariu-ro.bicep`
- Modify: `infra/Azure/Bicep/sites/deploymentFile.bicep`

**Step 1: Add `@description()` to all parameters that lack it**

Missing in `dev-arolariu-ro.bicep`:
```bicep
@description('The location for the development website.')
param developmentWebsiteLocation string

@description('The ID of the development App Service Plan.')
param developmentWebsiteAppPlanId string

@description('The resource ID of the frontend managed identity.')
param developmentWebsiteIdentityId string

@description('The deployment timestamp.')
param developmentWebsiteDeploymentDate string
```

Missing in `sites/deploymentFile.bicep`:
```bicep
@description('Resource ID of the backend managed identity.')
param managedIdentityBackendId string

@description('Resource ID of the frontend managed identity.')
param managedIdentityFrontendId string

@description('Client ID of the frontend managed identity for AZURE_CLIENT_ID.')
param managedIdentityFrontendClientId string

@description('Client ID of the backend managed identity for AZURE_CLIENT_ID.')
param managedIdentityBackendClientId string
```

**Step 2: Commit**

```bash
git commit -m "docs(infra): add missing @description decorators to site parameters"
```

### Task 13: Centralize tag generation with a shared function

**Files:**
- Create: `infra/Azure/Bicep/constants/tags.bicep`
- Modify: All 14 leaf modules that define `commonTags`

**Step 1: Create `constants/tags.bicep` with an exported function**

```bicep
metadata description = 'Shared tag generation function'
metadata version = '1.0.0'

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
  version: '2.0.0'
}
```

**Step 2: Replace all 14 `var commonTags resourceTags = { ... }` blocks with:**

```bicep
import { createTags } from '../constants/tags.bicep'
var commonTags = createTags('storage', storageAccountDeploymentDate)
```

**Step 3: Commit**

```bash
git commit -m "refactor(infra): centralize tag generation into shared function"
```

---

## Phase 4: Final Verification

### Task 14: Build, lint, and review

**Step 1: Run full Bicep build**

Run: `az bicep build --file infra/Azure/Bicep/main.bicep --stdout > /dev/null`

**Step 2: Run Bicep lint**

Run: `az bicep lint --file infra/Azure/Bicep/main.bicep`

**Step 3: Verify no orphaned files**

**Step 4: Review diff**

Run: `git diff --stat`

---

## Summary

| Phase | Tasks | What it adds |
|-------|-------|-------------|
| **Phase 1: Diagnostics** | Tasks 1-9 | All 8 key resources send logs/metrics to Log Analytics |
| **Phase 2: Locks** | Task 10 | 6 production resources protected from accidental deletion |
| **Phase 3: Cleanup** | Tasks 11-13 | Remove 31 redundant lines, add 8 descriptions, centralize tags |
| **Phase 4: Verify** | Task 14 | Build + lint + review |

## Future Considerations (not in this plan)

These are valuable but lower priority — consider for a separate PR:

- **Private Endpoints** for Key Vault, Storage, SQL, Cosmos DB (significant networking complexity)
- **Deployment Stacks** with deny settings (replaces resource locks with more integrated protection)
- **PSRule validation** in CI/CD pipeline (280+ Well-Architected Framework rules)
- **Private Bicep Module Registry** (ACR-based, with semantic versioning)
- **Environment-specific .bicepparam files** (`main.dev.bicepparam`, `main.prod.bicepparam`)
- **Budget alerts** via `Microsoft.Consumption/budgets` resource

## Sources

- [AVM Bicep Interfaces](https://azure.github.io/Azure-Verified-Modules/specs/bcp/res/interfaces/)
- [Create Monitoring Resources Using Bicep](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/scenarios-monitoring)
- [Lock Your Azure Resources](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources)
- [Deployment Stacks in Bicep](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deployment-stacks)
- [User-Defined Types in Bicep](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/user-defined-data-types)
- [User-Defined Functions in Bicep](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/user-defined-functions)
- [Bicep Best Practices](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/best-practices)
- [PSRule for Azure](https://azure.github.io/PSRule.Rules.Azure/using-bicep/)
- [Azure Bicep Tagging Strategies](https://j4ni.com/blog/2025/02/10/azure-bicep-tagging-strategies/)
- [Testing Best Practices for Azure Bicep](https://rabobank.jobs/en/techblog/testing-best-practices-for-azure-bicep/)
