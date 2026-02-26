# Bicep IaC Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden the Bicep IaC architecture to follow industry best practices — migrate all RBAC to resource-level scoping, enforce principle of least privilege, tighten linter rules, eliminate security vulnerabilities, and add CI/CD validation.

**Architecture:** The current architecture assigns all 28 RBAC role assignments at resource-group scope and creates them before target resources exist. This plan restructures RBAC to be co-located with each resource module (AVM pattern), scoped to the individual resource. It also fixes overly broad roles, removes hardcoded credentials, and adds a 3-stage CI/CD validation pipeline.

**Tech Stack:** Azure Bicep, Azure RBAC, Azure CLI, GitHub Actions

---

## Current State Analysis

### Critical Issues Found

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | All 28 RBAC assignments at resource-group scope | High | `rbac/*.bicep` |
| 2 | Hardcoded SQL credentials in plain text | Critical | `storage/deploymentFile.bicep:76-77` |
| 3 | Backend has redundant Blob Contributor + Blob Data Owner | Medium | `rbac/backend-uami-rbac.bicep` |
| 4 | Backend has Cognitive Services Contributor (only needs User) | Medium | `rbac/backend-uami-rbac.bicep` |
| 5 | Backend has Key Vault Contributor (only needs Secrets User) | Medium | `rbac/backend-uami-rbac.bicep` |
| 6 | Infrastructure has redundant ACR Read/Pull/Push/Contributor | Medium | `rbac/infrastructure-uami-rbac.bicep` |
| 7 | Missing critical linter rules (secrets in outputs, recent APIs) | Medium | `bicepconfig.json` |
| 8 | Using JSON param files instead of .bicepparam | Low | `main.parameters.json` |
| 9 | No CI/CD lint/validate/what-if pipeline | High | `.github/workflows/` |
| 10 | Role definition GUIDs duplicated across 3 RBAC files | Low | `rbac/*.bicep` |
| 11 | Configuration module outputs no resource IDs | Medium | `configuration/deploymentFile.bicep` |
| 12 | Storage module outputs incomplete resource IDs | Medium | `storage/deploymentFile.bicep` |

### Architecture Change: RBAC Co-location

**Before (current):**
```
facade.bicep
  1. Identity → creates UAMIs
  2. RBAC → assigns ALL roles at RG scope (before resources exist!)
  3. Configuration → Key Vault, App Config
  4. Storage → Storage, DB, ACR
  ...
```

**After (target):**
```
facade.bicep
  1. Identity → creates UAMIs
  2. Configuration → Key Vault, App Config + scoped RBAC for each
  3. Storage → Storage, DB, ACR + scoped RBAC for each
  4. AI → OpenAI + scoped RBAC
  ...
  (no standalone RBAC module — each resource owns its own access)
```

Each resource module receives the `principalId` of identities that need access and creates role assignments scoped to its own resource. This follows the Azure Verified Modules (AVM) standard interface pattern.

---

## Task 1: Harden Linter Configuration

**Files:**
- Modify: `infra/Azure/Bicep/bicepconfig.json`

**Step 1: Read the current configuration**

Review the current `bicepconfig.json` to understand existing rules.

**Step 2: Update linter rules to production-grade levels**

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
        "use-recent-api-versions": {
          "level": "warning",
          "maxAllowedAgeInDays": 730
        },
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

Key changes:
- **Promoted to `error`**: `no-hardcoded-location`, `no-loc-expr-outside-params`, all security rules (`secure-params-in-nested-deploy`, `secure-secrets-in-params`, `outputs-should-not-contain-secrets`, `use-secure-value-for-secure-inputs`, `protect-commandtoexecute-secrets`, `no-explicit-any`)
- **New rules added**: `no-unused-vars`, `no-unused-existing-resources`, `no-unused-imports`, `no-deployments-resources`, `no-conflicting-metadata`, `use-parent-property`, `use-resource-symbol-reference`, `use-safe-access`, `use-stable-resource-identifiers`, `use-recent-api-versions`, `max-resources`, `max-asserts`, `prefer-unquoted-property-names`
- **Experimental**: `compileTimeImports` (enables `@export()` and `import` across files)

**Step 3: Run Bicep build to verify no false positives**

Run: `az bicep build --file infra/Azure/Bicep/main.bicep --stdout > /dev/null`
Expected: Build succeeds (warnings are OK, errors need fixing)

**Step 4: Commit**

```bash
git add infra/Azure/Bicep/bicepconfig.json
git commit -m "chore(infra): harden bicep linter rules to production-grade levels"
```

---

## Task 2: Create Shared Role Definitions Type

**Files:**
- Create: `infra/Azure/Bicep/types/roles.type.bicep`

**Step 1: Create the shared role definitions file**

This eliminates role GUID duplication across 3 RBAC files. Every role ID is defined once, with documentation.

```bicep
// =====================================================================================
// Shared Role Definition GUIDs
// =====================================================================================
// Single source of truth for all Azure built-in role definition IDs used in RBAC.
// Reference: https://learn.microsoft.com/azure/role-based-access-control/built-in-roles
//
// Usage:
//   import { builtInRoles } from '../types/roles.type.bicep'
//   var roleId = builtInRoles.storageBlobDataReader
// =====================================================================================

metadata description = 'Shared Azure built-in role definition GUIDs for RBAC assignments'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '1.0.0'

// -------------------------------------------------------------------------------------
// Storage Roles
// -------------------------------------------------------------------------------------
@export()
var storageBlobDataReader = '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1'

@export()
var storageBlobDataContributor = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'

@export()
var storageBlobDataOwner = 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b'

@export()
var storageQueueDataReader = '19e7f393-937e-4f77-808e-94535e297925'

@export()
var storageQueueDataContributor = '974c5e8b-45b9-4653-ba55-5f855dd0fb88'

@export()
var storageTableDataReader = '76199698-9eea-4c19-bc75-cec21354c6b6'

@export()
var storageTableDataContributor = '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3'

// -------------------------------------------------------------------------------------
// Container Registry Roles
// -------------------------------------------------------------------------------------
@export()
var acrPull = '7f951dda-4ed3-4680-a7ca-43fe172d538d'

@export()
var acrPush = '8311e382-0749-4cb8-b61a-304f252e45ec'

@export()
var acrContributor = '2efddaa5-3f1f-4df3-97df-af3f13818f4c'

// -------------------------------------------------------------------------------------
// Database Roles
// -------------------------------------------------------------------------------------
@export()
var sqlDbContributor = '9b7fa17d-e63e-47b0-bb0a-15c516ac86ec'

@export()
var cosmosDbDataOperator = '230815da-be43-4aae-9cb4-875f7bd000aa'

// -------------------------------------------------------------------------------------
// Configuration Roles
// -------------------------------------------------------------------------------------
@export()
var appConfigurationDataReader = '516239f1-63e1-4d78-a4de-a74fb236a071'

@export()
var appConfigurationDataOwner = 'fe86443c-f201-4fc4-9d2a-ac61149fbda0'

@export()
var keyVaultSecretsUser = '4633458b-17de-408a-b874-0445c86b69e6'

@export()
var keyVaultSecretsOfficer = 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7'

@export()
var keyVaultReader = '21090545-7ca7-4776-b22c-e363652d74d2'

// -------------------------------------------------------------------------------------
// AI Roles
// -------------------------------------------------------------------------------------
@export()
var cognitiveServicesOpenAiUser = '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'

// -------------------------------------------------------------------------------------
// Compute Roles
// -------------------------------------------------------------------------------------
@export()
var websiteContributor = 'de139f84-1756-47ae-9be6-808fbbe84772'
```

**Step 2: Commit**

```bash
git add infra/Azure/Bicep/types/roles.type.bicep
git commit -m "feat(infra): add shared role definition GUIDs type for DRY RBAC"
```

---

## Task 3: Fix Hardcoded SQL Credentials

**Files:**
- Modify: `infra/Azure/Bicep/storage/deploymentFile.bicep`
- Modify: `infra/Azure/Bicep/storage/sqlServer.bicep`
- Modify: `infra/Azure/Bicep/facade.bicep`

**Step 1: Read the current sqlServer.bicep to understand the parameter structure**

Read `infra/Azure/Bicep/storage/sqlServer.bicep` and `infra/Azure/Bicep/configuration/keyVault.bicep`.

**Step 2: Replace hardcoded credentials with Key Vault reference**

In `storage/deploymentFile.bicep`, replace the hardcoded password with a `@secure()` parameter passed from the facade, which retrieves it from Key Vault:

```bicep
// In storage/deploymentFile.bicep - remove hardcoded values:
// BEFORE:
//   sqlServerAdministratorPassword: 'TempP@ssw0rd123!'
//   sqlServerAdministratorUserName: 'sqladmin'

// AFTER: Accept secure params from parent
@secure()
@description('SQL Server administrator password. Must be provided from Key Vault or deployment pipeline.')
param sqlServerAdministratorPassword string

@description('SQL Server administrator username.')
param sqlServerAdministratorUserName string
```

In `facade.bicep`, pass the credentials as secure params. The recommended approach is:
- Option A: Use `kv.getSecret()` if Key Vault is deployed before Storage (requires reordering)
- Option B: Accept as `@secure()` parameter from the deployment pipeline (CI/CD provides from Key Vault)

Since Key Vault is deployed in the Configuration step (step 3) and Storage in step 5, Option A works:

```bicep
// In facade.bicep - reference Key Vault for SQL credentials:
resource existingKeyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: '${replace(resourceConventionPrefix, "-", "")}kv'
}

module storageDeployment 'storage/deploymentFile.bicep' = {
  // ...
  params: {
    // ...
    sqlServerAdministratorPassword: existingKeyVault.getSecret('sql-admin-password')
    sqlServerAdministratorUserName: 'sqladmin'
  }
}
```

> **Note:** The secret `sql-admin-password` must be pre-seeded in Key Vault or provided via CI/CD before the first deployment. Add it to `configuration/keyVault.json` as a placeholder.

**Step 3: Run Bicep build to verify**

Run: `az bicep build --file infra/Azure/Bicep/main.bicep --stdout > /dev/null`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add infra/Azure/Bicep/storage/deploymentFile.bicep infra/Azure/Bicep/storage/sqlServer.bicep infra/Azure/Bicep/facade.bicep
git commit -m "fix(infra): remove hardcoded SQL credentials, use Key Vault reference"
```

---

## Task 4: Add Resource ID Outputs to All Modules

Before RBAC can be scoped to individual resources, each module must output the resource IDs of the resources it creates. This task adds missing outputs.

**Files:**
- Modify: `infra/Azure/Bicep/storage/storageAccount.bicep` (add resource ID output if missing)
- Modify: `infra/Azure/Bicep/storage/containerRegistry.bicep` (add resource ID output)
- Modify: `infra/Azure/Bicep/storage/sqlServer.bicep` (add resource ID output)
- Modify: `infra/Azure/Bicep/storage/noSqlServer.bicep` (add resource ID output)
- Modify: `infra/Azure/Bicep/storage/deploymentFile.bicep` (expose all resource IDs)
- Modify: `infra/Azure/Bicep/configuration/keyVault.bicep` (add resource ID output)
- Modify: `infra/Azure/Bicep/configuration/appConfiguration.bicep` (add resource ID output)
- Modify: `infra/Azure/Bicep/configuration/deploymentFile.bicep` (expose resource IDs)
- Modify: `infra/Azure/Bicep/ai/openai.bicep` (add resource ID output)
- Modify: `infra/Azure/Bicep/ai/deploymentFile.bicep` (expose resource ID)

**Step 1: Read each resource module to check existing outputs**

Read all resource modules listed above to understand their current output structure.

**Step 2: Add resource name outputs to each leaf module**

Each leaf module (e.g., `storageAccount.bicep`) should output the resource's symbolic name so the orchestrator can create an `existing` reference. Example pattern:

```bicep
// In storageAccount.bicep — ensure these outputs exist:
output storageAccountName string = storageAccount.name
output storageAccountId string = storageAccount.id
```

```bicep
// In containerRegistry.bicep:
output containerRegistryName string = containerRegistry.name
output containerRegistryId string = containerRegistry.id
```

```bicep
// In sqlServer.bicep:
output sqlServerName string = sqlServer.name
output sqlServerId string = sqlServer.id
output sqlDatabaseName string = sqlDatabase.name
output sqlDatabaseId string = sqlDatabase.id
```

```bicep
// In noSqlServer.bicep:
output noSqlServerName string = noSqlServer.name
output noSqlServerId string = noSqlServer.id
```

```bicep
// In keyVault.bicep:
output keyVaultName string = keyVault.name
output keyVaultId string = keyVault.id
```

```bicep
// In appConfiguration.bicep:
output appConfigurationName string = appConfiguration.name
output appConfigurationId string = appConfiguration.id
```

```bicep
// In openai.bicep:
output openAiName string = openAiAccount.name
output openAiId string = openAiAccount.id
```

**Step 3: Update orchestrator deploymentFiles to expose resource names**

Each `deploymentFile.bicep` should forward the resource names upward:

```bicep
// In storage/deploymentFile.bicep — add missing outputs:
output containerRegistryName string = containerRegistryDeployment.outputs.containerRegistryName
output sqlServerName string = sqlServerDeployment.outputs.sqlServerName
output sqlDatabaseName string = sqlServerDeployment.outputs.sqlDatabaseName
output cosmosAccountName string = noSqlServerDeployment.outputs.noSqlServerName
```

```bicep
// In configuration/deploymentFile.bicep — add outputs:
output keyVaultName string = keyVaultDeployment.outputs.keyVaultName
output appConfigurationName string = appConfigurationDeployment.outputs.appConfigurationName
```

```bicep
// In ai/deploymentFile.bicep — add outputs:
output openAiName string = openAiDeployment.outputs.openAiName
```

**Step 4: Run Bicep build to verify**

Run: `az bicep build --file infra/Azure/Bicep/main.bicep --stdout > /dev/null`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add infra/Azure/Bicep/storage/ infra/Azure/Bicep/configuration/ infra/Azure/Bicep/ai/
git commit -m "feat(infra): add resource name outputs to all modules for RBAC scoping"
```

---

## Task 5: Create Resource-Scoped RBAC Module Pattern

This is the core architectural change. We create a new reusable RBAC sub-module pattern where each resource module assigns roles scoped to itself.

**Files:**
- Create: `infra/Azure/Bicep/rbac/resource-scoped/storage-rbac.bicep`
- Create: `infra/Azure/Bicep/rbac/resource-scoped/container-registry-rbac.bicep`
- Create: `infra/Azure/Bicep/rbac/resource-scoped/key-vault-rbac.bicep`
- Create: `infra/Azure/Bicep/rbac/resource-scoped/app-configuration-rbac.bicep`
- Create: `infra/Azure/Bicep/rbac/resource-scoped/sql-server-rbac.bicep`
- Create: `infra/Azure/Bicep/rbac/resource-scoped/cosmos-db-rbac.bicep`
- Create: `infra/Azure/Bicep/rbac/resource-scoped/openai-rbac.bicep`
- Create: `infra/Azure/Bicep/rbac/resource-scoped/websites-rbac.bicep`

**Design Principle:** Each resource-scoped RBAC module:
1. Takes the resource name as a parameter (uses `existing` keyword to reference the resource)
2. Takes an array of `{ principalId, roles }` assignments
3. Creates role assignments scoped to that specific resource
4. Uses `guid(resource.id, principalId, roleDefinitionId)` for deterministic names

**Step 1: Create storage-rbac.bicep**

```bicep
targetScope = 'resourceGroup'

metadata description = 'Resource-scoped RBAC for Azure Storage Account'
metadata version = '1.0.0'

import {
  storageBlobDataReader
  storageBlobDataContributor
  storageBlobDataOwner
  storageQueueDataReader
  storageQueueDataContributor
  storageTableDataReader
  storageTableDataContributor
} from '../../types/roles.type.bicep'

@description('Name of the existing storage account to scope RBAC to.')
param storageAccountName string

@description('Principal ID of the frontend managed identity.')
param frontendPrincipalId string

@description('Principal ID of the backend managed identity.')
param backendPrincipalId string

@description('Principal ID of the infrastructure managed identity.')
param infrastructurePrincipalId string

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

// -------------------------------------------------------------------------------------
// Frontend: Read access + blob contributor for uploads
// -------------------------------------------------------------------------------------
resource frontendBlobReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storageAccount
  name: guid(storageAccount.id, frontendPrincipalId, storageBlobDataReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataReader)
    principalId: frontendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Frontend: read blob data from storage account'
  }
}

resource frontendBlobContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storageAccount
  name: guid(storageAccount.id, frontendPrincipalId, storageBlobDataContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataContributor)
    principalId: frontendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Frontend: write user-uploaded invoices to blob storage'
  }
}

resource frontendQueueReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storageAccount
  name: guid(storageAccount.id, frontendPrincipalId, storageQueueDataReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageQueueDataReader)
    principalId: frontendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Frontend: read queue messages for status polling'
  }
}

resource frontendTableReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storageAccount
  name: guid(storageAccount.id, frontendPrincipalId, storageTableDataReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageTableDataReader)
    principalId: frontendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Frontend: read table data for feature flags'
  }
}

// -------------------------------------------------------------------------------------
// Backend: Data owner for blobs, contributor for queues and tables
// -------------------------------------------------------------------------------------
resource backendBlobDataOwner 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storageAccount
  name: guid(storageAccount.id, backendPrincipalId, storageBlobDataOwner)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataOwner)
    principalId: backendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Backend: full blob data access with ACL management'
  }
}

resource backendQueueContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storageAccount
  name: guid(storageAccount.id, backendPrincipalId, storageQueueDataContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageQueueDataContributor)
    principalId: backendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Backend: queue message operations for async processing'
  }
}

resource backendTableContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storageAccount
  name: guid(storageAccount.id, backendPrincipalId, storageTableDataContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageTableDataContributor)
    principalId: backendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Backend: table entity CRUD operations'
  }
}

// -------------------------------------------------------------------------------------
// Infrastructure: Read-only for deployment verification
// -------------------------------------------------------------------------------------
resource infraBlobReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storageAccount
  name: guid(storageAccount.id, infrastructurePrincipalId, storageBlobDataReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataReader)
    principalId: infrastructurePrincipalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure: read blob data for deployment verification'
  }
}

resource infraQueueReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storageAccount
  name: guid(storageAccount.id, infrastructurePrincipalId, storageQueueDataReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageQueueDataReader)
    principalId: infrastructurePrincipalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure: read queue data for deployment verification'
  }
}

resource infraTableReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storageAccount
  name: guid(storageAccount.id, infrastructurePrincipalId, storageTableDataReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageTableDataReader)
    principalId: infrastructurePrincipalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure: read table data for deployment verification'
  }
}
```

**Step 2: Create container-registry-rbac.bicep**

```bicep
targetScope = 'resourceGroup'

metadata description = 'Resource-scoped RBAC for Azure Container Registry'
metadata version = '1.0.0'

import { acrPull, acrPush, acrContributor } from '../../types/roles.type.bicep'

@description('Name of the existing container registry.')
param containerRegistryName string

@description('Principal ID of the frontend managed identity.')
param frontendPrincipalId string

@description('Principal ID of the backend managed identity.')
param backendPrincipalId string

@description('Principal ID of the infrastructure managed identity.')
param infrastructurePrincipalId string

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: containerRegistryName
}

// Frontend + Backend: Pull only
resource frontendAcrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: containerRegistry
  name: guid(containerRegistry.id, frontendPrincipalId, acrPull)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPull)
    principalId: frontendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Frontend: pull container images'
  }
}

resource backendAcrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: containerRegistry
  name: guid(containerRegistry.id, backendPrincipalId, acrPull)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPull)
    principalId: backendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Backend: pull container images'
  }
}

// Infrastructure: Push + Pull (Contributor is too broad — only needs push/pull for CI/CD)
resource infraAcrPush 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: containerRegistry
  name: guid(containerRegistry.id, infrastructurePrincipalId, acrPush)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPush)
    principalId: infrastructurePrincipalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure: push built images to ACR'
  }
}

resource infraAcrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: containerRegistry
  name: guid(containerRegistry.id, infrastructurePrincipalId, acrPull)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPull)
    principalId: infrastructurePrincipalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure: pull base images from ACR'
  }
}
```

**Step 3: Create key-vault-rbac.bicep**

```bicep
targetScope = 'resourceGroup'

metadata description = 'Resource-scoped RBAC for Azure Key Vault'
metadata version = '1.0.0'

import { keyVaultSecretsUser, keyVaultSecretsOfficer, keyVaultReader } from '../../types/roles.type.bicep'

@description('Name of the existing Key Vault.')
param keyVaultName string

@description('Principal ID of the backend managed identity.')
param backendPrincipalId string

@description('Principal ID of the infrastructure managed identity.')
param infrastructurePrincipalId string

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

// Backend: Secrets User (read secrets at runtime — NOT Contributor/Officer)
resource backendSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  name: guid(keyVault.id, backendPrincipalId, keyVaultSecretsUser)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsUser)
    principalId: backendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Backend: read secrets from Key Vault at runtime'
  }
}

// Infrastructure: Secrets User (read secrets for deployment) + Reader (discover metadata)
resource infraSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  name: guid(keyVault.id, infrastructurePrincipalId, keyVaultSecretsUser)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsUser)
    principalId: infrastructurePrincipalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure: read secrets for deployment pipelines'
  }
}

resource infraVaultReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  name: guid(keyVault.id, infrastructurePrincipalId, keyVaultReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultReader)
    principalId: infrastructurePrincipalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure: read Key Vault metadata'
  }
}
```

**Step 4: Create app-configuration-rbac.bicep**

```bicep
targetScope = 'resourceGroup'

metadata description = 'Resource-scoped RBAC for Azure App Configuration'
metadata version = '1.0.0'

import { appConfigurationDataReader, appConfigurationDataOwner } from '../../types/roles.type.bicep'

@description('Name of the existing App Configuration store.')
param appConfigurationName string

@description('Principal ID of the frontend managed identity.')
param frontendPrincipalId string

@description('Principal ID of the backend managed identity.')
param backendPrincipalId string

@description('Principal ID of the infrastructure managed identity.')
param infrastructurePrincipalId string

resource appConfiguration 'Microsoft.AppConfiguration/configurationStores@2023-03-01' existing = {
  name: appConfigurationName
}

// Frontend + Infrastructure: Reader
resource frontendConfigReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: appConfiguration
  name: guid(appConfiguration.id, frontendPrincipalId, appConfigurationDataReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', appConfigurationDataReader)
    principalId: frontendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Frontend: read app configuration settings'
  }
}

resource infraConfigReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: appConfiguration
  name: guid(appConfiguration.id, infrastructurePrincipalId, appConfigurationDataReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', appConfigurationDataReader)
    principalId: infrastructurePrincipalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure: read app configuration for deployments'
  }
}

// Backend: Data Owner (needs read + write for runtime config updates)
resource backendConfigOwner 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: appConfiguration
  name: guid(appConfiguration.id, backendPrincipalId, appConfigurationDataOwner)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', appConfigurationDataOwner)
    principalId: backendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Backend: read and write app configuration settings'
  }
}
```

**Step 5: Create sql-server-rbac.bicep**

```bicep
targetScope = 'resourceGroup'

metadata description = 'Resource-scoped RBAC for Azure SQL Server'
metadata version = '1.0.0'

import { sqlDbContributor } from '../../types/roles.type.bicep'

@description('Name of the existing SQL Server.')
param sqlServerName string

@description('Principal ID of the backend managed identity.')
param backendPrincipalId string

resource sqlServer 'Microsoft.Sql/servers@2023-08-01-preview' existing = {
  name: sqlServerName
}

// Backend: SQL DB Contributor scoped to the server
resource backendSqlContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: sqlServer
  name: guid(sqlServer.id, backendPrincipalId, sqlDbContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', sqlDbContributor)
    principalId: backendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Backend: SQL database operations'
  }
}
```

**Step 6: Create cosmos-db-rbac.bicep**

```bicep
targetScope = 'resourceGroup'

metadata description = 'Resource-scoped RBAC for Azure Cosmos DB'
metadata version = '1.0.0'

import { cosmosDbDataOperator } from '../../types/roles.type.bicep'

@description('Name of the existing Cosmos DB account.')
param cosmosAccountName string

@description('Principal ID of the backend managed identity.')
param backendPrincipalId string

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' existing = {
  name: cosmosAccountName
}

// Backend: Cosmos DB data plane operator
resource backendCosmosOperator 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: cosmosAccount
  name: guid(cosmosAccount.id, backendPrincipalId, cosmosDbDataOperator)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cosmosDbDataOperator)
    principalId: backendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Backend: Cosmos DB document CRUD operations'
  }
}
```

**Step 7: Create openai-rbac.bicep**

```bicep
targetScope = 'resourceGroup'

metadata description = 'Resource-scoped RBAC for Azure OpenAI'
metadata version = '1.0.0'

import { cognitiveServicesOpenAiUser } from '../../types/roles.type.bicep'

@description('Name of the existing Azure OpenAI account.')
param openAiAccountName string

@description('Principal ID of the backend managed identity.')
param backendPrincipalId string

resource openAiAccount 'Microsoft.CognitiveServices/accounts@2024-10-01' existing = {
  name: openAiAccountName
}

// Backend: OpenAI User only (NOT Contributor — only needs inference, not management)
resource backendOpenAiUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: openAiAccount
  name: guid(openAiAccount.id, backendPrincipalId, cognitiveServicesOpenAiUser)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesOpenAiUser)
    principalId: backendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Backend: Azure OpenAI API inference calls'
  }
}
```

**Step 8: Create websites-rbac.bicep**

```bicep
targetScope = 'resourceGroup'

metadata description = 'Resource-scoped RBAC for Azure App Services (CI/CD deployment)'
metadata version = '1.0.0'

import { websiteContributor } from '../../types/roles.type.bicep'

@description('Names of the existing web apps that the infrastructure identity can deploy to.')
param webAppNames string[]

@description('Principal ID of the infrastructure managed identity.')
param infrastructurePrincipalId string

resource webApps 'Microsoft.Web/sites@2023-12-01' existing = [
  for name in webAppNames: {
    name: name
  }
]

// Infrastructure: Website Contributor scoped per web app (not whole RG)
resource infraWebsiteContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = [
  for (name, i) in webAppNames: {
    scope: webApps[i]
    name: guid(webApps[i].id, infrastructurePrincipalId, websiteContributor)
    properties: {
      roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', websiteContributor)
      principalId: infrastructurePrincipalId
      principalType: 'ServicePrincipal'
      description: 'Infrastructure: deploy and manage ${name}'
    }
  }
]
```

**Step 9: Commit**

```bash
git add infra/Azure/Bicep/rbac/resource-scoped/
git commit -m "feat(infra): create resource-scoped RBAC modules for all Azure resources"
```

---

## Task 6: Rewire Facade to Use Resource-Scoped RBAC

Replace the old standalone RBAC module with resource-scoped RBAC calls that execute after resources are created.

**Files:**
- Modify: `infra/Azure/Bicep/facade.bicep`
- Keep (but deprecate): `infra/Azure/Bicep/rbac/deploymentFile.bicep` and sub-modules (delete after verification)

**Step 1: Read the current facade.bicep**

Review the full file to understand all module calls and output references.

**Step 2: Update facade.bicep with resource-scoped RBAC**

Replace the single `rbacDeployment` module call with individual resource-scoped RBAC calls that reference resources by name after they exist:

```bicep
// REMOVE this:
// module rbacDeployment 'rbac/deploymentFile.bicep' = { ... }

// ADD resource-scoped RBAC after each resource group is deployed:

// --- Storage RBAC (after storage is deployed) ---
module storageRbac 'rbac/resource-scoped/storage-rbac.bicep' = {
  name: 'storageRbac-${resourceDeploymentDate}'
  params: {
    storageAccountName: storageDeployment.outputs.storageAccountName
    frontendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[0].principalId
    backendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[1].principalId
    infrastructurePrincipalId: identitiesDeployment.outputs.managedIdentitiesList[2].principalId
  }
}

module containerRegistryRbac 'rbac/resource-scoped/container-registry-rbac.bicep' = {
  name: 'containerRegistryRbac-${resourceDeploymentDate}'
  params: {
    containerRegistryName: storageDeployment.outputs.containerRegistryName
    frontendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[0].principalId
    backendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[1].principalId
    infrastructurePrincipalId: identitiesDeployment.outputs.managedIdentitiesList[2].principalId
  }
}

module sqlServerRbac 'rbac/resource-scoped/sql-server-rbac.bicep' = {
  name: 'sqlServerRbac-${resourceDeploymentDate}'
  params: {
    sqlServerName: storageDeployment.outputs.sqlServerName
    backendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[1].principalId
  }
}

module cosmosDbRbac 'rbac/resource-scoped/cosmos-db-rbac.bicep' = {
  name: 'cosmosDbRbac-${resourceDeploymentDate}'
  params: {
    cosmosAccountName: storageDeployment.outputs.cosmosAccountName
    backendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[1].principalId
  }
}

// --- Configuration RBAC (after configuration is deployed) ---
module keyVaultRbac 'rbac/resource-scoped/key-vault-rbac.bicep' = {
  name: 'keyVaultRbac-${resourceDeploymentDate}'
  params: {
    keyVaultName: configurationDeployment.outputs.keyVaultName
    backendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[1].principalId
    infrastructurePrincipalId: identitiesDeployment.outputs.managedIdentitiesList[2].principalId
  }
}

module appConfigRbac 'rbac/resource-scoped/app-configuration-rbac.bicep' = {
  name: 'appConfigRbac-${resourceDeploymentDate}'
  params: {
    appConfigurationName: configurationDeployment.outputs.appConfigurationName
    frontendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[0].principalId
    backendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[1].principalId
    infrastructurePrincipalId: identitiesDeployment.outputs.managedIdentitiesList[2].principalId
  }
}

// --- AI RBAC (after AI is deployed) ---
module openAiRbac 'rbac/resource-scoped/openai-rbac.bicep' = {
  name: 'openAiRbac-${resourceDeploymentDate}'
  params: {
    openAiAccountName: aiDeployment.outputs.openAiName
    backendPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[1].principalId
  }
}

// --- Websites RBAC (after sites are deployed) ---
module websitesRbac 'rbac/resource-scoped/websites-rbac.bicep' = {
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

**Step 3: Update the dependency chain**

Remove `rbacDeployment` from `dependsOn` on `storageDeployment` (storage no longer waits for RG-level RBAC). Instead, the RBAC modules implicitly depend on the resource modules via their parameter references.

```bicep
module storageDeployment 'storage/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'storageDeployment-${resourceDeploymentDate}'
  dependsOn: [identitiesDeployment]  // Removed rbacDeployment dependency
  params: { ... }
}
```

**Step 4: Update the facade header comment to reflect new deployment order**

```
// Deployment Order (with dependencies):
// 1. Identity      → Creates managed identities (no dependencies)
// 2. Configuration → Creates Key Vault, App Config (no dependencies)
// 3. Observability → Creates monitoring resources (depends on: Identity, Configuration)
// 4. Storage       → Creates storage, databases, ACR (depends on: Identity)
// 5. Compute       → Creates App Service Plans (depends on: Identity)
// 6. Sites         → Deploys web applications (depends on: Storage, Configuration)
// 7. Network       → Creates Front Door, DNS (depends on: Sites)
// 8. Bindings      → Configures custom domains (depends on: Sites, Network)
// 9. AI            → Deploys Azure OpenAI (depends on: Configuration)
// 10. RBAC         → Resource-scoped role assignments (depends on: respective resources)
```

**Step 5: Run Bicep build**

Run: `az bicep build --file infra/Azure/Bicep/main.bicep --stdout > /dev/null`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add infra/Azure/Bicep/facade.bicep
git commit -m "refactor(infra): rewire facade to use resource-scoped RBAC instead of RG-level"
```

---

## Task 7: Delete Old Resource-Group-Scoped RBAC Files

**Files:**
- Delete: `infra/Azure/Bicep/rbac/frontend-uami-rbac.bicep`
- Delete: `infra/Azure/Bicep/rbac/backend-uami-rbac.bicep`
- Delete: `infra/Azure/Bicep/rbac/infrastructure-uami-rbac.bicep`
- Modify: `infra/Azure/Bicep/rbac/deploymentFile.bicep` (remove or keep as redirect)

**Step 1: Verify all role assignments are covered in the new modules**

Cross-reference the old files with the new resource-scoped files:

| Old (RG-scoped) | New (Resource-scoped) | Scope Change |
|---|---|---|
| Frontend Storage Blob Reader | `storage-rbac.bicep` → frontendBlobReader | Storage Account |
| Frontend Storage Queue Reader | `storage-rbac.bicep` → frontendQueueReader | Storage Account |
| Frontend Storage Table Reader | `storage-rbac.bicep` → frontendTableReader | Storage Account |
| Frontend App Config Reader | `app-configuration-rbac.bicep` → frontendConfigReader | App Configuration |
| Frontend Storage Blob Contributor | `storage-rbac.bicep` → frontendBlobContributor | Storage Account |
| Frontend ACR Pull | `container-registry-rbac.bicep` → frontendAcrPull | Container Registry |
| Frontend ACR Read | **REMOVED** (redundant — Pull implies Read access) | — |
| Backend Storage Blob Contributor | **REMOVED** (Data Owner is superset) | — |
| Backend Storage Blob Data Owner | `storage-rbac.bicep` → backendBlobDataOwner | Storage Account |
| Backend Storage Queue Contributor | `storage-rbac.bicep` → backendQueueContributor | Storage Account |
| Backend Storage Table Contributor | `storage-rbac.bicep` → backendTableContributor | Storage Account |
| Backend SQL DB Contributor | `sql-server-rbac.bicep` → backendSqlContributor | SQL Server |
| Backend NoSQL DB Operator | `cosmos-db-rbac.bicep` → backendCosmosOperator | Cosmos DB |
| Backend App Config Contributor | `app-configuration-rbac.bicep` → backendConfigOwner | App Configuration |
| Backend Key Vault Contributor | **DOWNGRADED** to Secrets User | Key Vault |
| Backend Key Vault Secrets Contributor | **DOWNGRADED** to Secrets User | Key Vault |
| Backend OpenAI Contributor | **REMOVED** (only User needed for inference) | — |
| Backend OpenAI User | `openai-rbac.bicep` → backendOpenAiUser | OpenAI |
| Backend ACR Pull | `container-registry-rbac.bicep` → backendAcrPull | Container Registry |
| Backend ACR Read | **REMOVED** (redundant — Pull implies Read) | — |
| Infra Storage Blob Reader | `storage-rbac.bicep` → infraBlobReader | Storage Account |
| Infra Storage Queue Reader | `storage-rbac.bicep` → infraQueueReader | Storage Account |
| Infra Storage Table Reader | `storage-rbac.bicep` → infraTableReader | Storage Account |
| Infra App Config Reader | `app-configuration-rbac.bicep` → infraConfigReader | App Configuration |
| Infra Key Vault Reader | `key-vault-rbac.bicep` → infraVaultReader | Key Vault |
| Infra Key Vault Secrets Reader | **UPGRADED** to Secrets User | Key Vault |
| Infra ACR Read | **REMOVED** (redundant — Push implies Read/Pull) | — |
| Infra ACR Pull | `container-registry-rbac.bicep` → infraAcrPull | Container Registry |
| Infra ACR Push | `container-registry-rbac.bicep` → infraAcrPush | Container Registry |
| Infra ACR Contributor | **REMOVED** (Push+Pull is sufficient for CI/CD) | — |
| Infra Website Contributor | `websites-rbac.bicep` → infraWebsiteContributor | Per Web App |

**Roles removed (least privilege enforcement):**
- Frontend ACR Read (covered by ACR Pull)
- Backend Blob Contributor (covered by Data Owner)
- Backend Key Vault Contributor → downgraded to Secrets User
- Backend Key Vault Secrets Contributor → downgraded to Secrets User
- Backend OpenAI Contributor (only User needed)
- Backend ACR Read (covered by ACR Pull)
- Infrastructure ACR Read (covered by Push)
- Infrastructure ACR Contributor (Push+Pull is sufficient)

**Net reduction:** 28 RG-scoped assignments → 23 resource-scoped assignments (5 redundant roles removed)

**Step 2: Delete the old RBAC files**

```bash
rm infra/Azure/Bicep/rbac/frontend-uami-rbac.bicep
rm infra/Azure/Bicep/rbac/backend-uami-rbac.bicep
rm infra/Azure/Bicep/rbac/infrastructure-uami-rbac.bicep
```

**Step 3: Update rbac/deploymentFile.bicep as a README redirect**

Replace content with a comment pointing to the new location:

```bicep
// =====================================================================================
// DEPRECATED: RBAC assignments have been moved to resource-scoped modules.
// =====================================================================================
// Old pattern: All roles assigned at resource-group scope in this directory.
// New pattern: Each resource module has its own RBAC in rbac/resource-scoped/.
//
// See: rbac/resource-scoped/*.bicep
// See: facade.bicep for orchestration of resource-scoped RBAC modules
// =====================================================================================
```

**Step 4: Commit**

```bash
git add infra/Azure/Bicep/rbac/
git commit -m "refactor(infra): remove old RG-scoped RBAC files, document migration to resource-scoped"
```

---

## Task 8: Migrate to .bicepparam Files

**Files:**
- Create: `infra/Azure/Bicep/main.bicepparam`
- Delete: `infra/Azure/Bicep/main.parameters.json` (after migration)

**Step 1: Read the current JSON parameter file**

Read `infra/Azure/Bicep/main.parameters.json`.

**Step 2: Create the .bicepparam file**

```bicep
using 'main.bicep'

param resourceGroupName = 'arolariu-rg'
param resourceGroupLocation = 'swedencentral'
param resourceGroupAuthor = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
```

**Step 3: Delete the old JSON parameter file**

```bash
rm infra/Azure/Bicep/main.parameters.json
```

**Step 4: Update the deployment command in main.bicep header comment**

```
// Deployment Command:
// az deployment sub create --location swedencentral \
//   --template-file main.bicep --parameters main.bicepparam
```

**Step 5: Commit**

```bash
git add infra/Azure/Bicep/main.bicepparam infra/Azure/Bicep/main.bicep
git rm infra/Azure/Bicep/main.parameters.json
git commit -m "refactor(infra): migrate from JSON params to .bicepparam format"
```

---

## Task 9: Add CI/CD Validation Pipeline

**Files:**
- Create: `.github/workflows/bicep-validate.yml`

**Step 1: Create the 3-stage Bicep validation workflow**

```yaml
name: Bicep Validate

on:
  pull_request:
    paths:
      - 'infra/Azure/Bicep/**'
  push:
    branches: [main, preview]
    paths:
      - 'infra/Azure/Bicep/**'

permissions:
  id-token: write
  contents: read

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Bicep CLI
        run: az bicep install

      - name: Lint all Bicep files
        run: az bicep lint --file infra/Azure/Bicep/main.bicep

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4

      - name: Install Bicep CLI
        run: az bicep install

      - name: Build (compile to ARM)
        run: az bicep build --file infra/Azure/Bicep/main.bicep --stdout > /dev/null

  validate:
    name: Validate (Preflight)
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'push'
    environment: azure-validation
    steps:
      - uses: actions/checkout@v4

      - name: Azure Login (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Validate deployment
        run: |
          az deployment sub validate \
            --location swedencentral \
            --template-file infra/Azure/Bicep/main.bicep \
            --parameters infra/Azure/Bicep/main.bicepparam

  what-if:
    name: What-If Preview
    runs-on: ubuntu-latest
    needs: validate
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    environment: azure-validation
    steps:
      - uses: actions/checkout@v4

      - name: Azure Login (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: What-If deployment preview
        run: |
          az deployment sub what-if \
            --location swedencentral \
            --template-file infra/Azure/Bicep/main.bicep \
            --parameters infra/Azure/Bicep/main.bicepparam
```

**Step 2: Commit**

```bash
git add .github/workflows/bicep-validate.yml
git commit -m "ci(infra): add 3-stage Bicep validation pipeline (lint, build, validate, what-if)"
```

---

## Task 10: Update Documentation

**Files:**
- Modify: `infra/Azure/Bicep/README.md`
- Modify: `infra/Azure/Bicep/rbac/README.md`

**Step 1: Read the current READMEs**

Read both files to understand existing documentation.

**Step 2: Update rbac/README.md to document the new pattern**

Document:
- The resource-scoped RBAC architecture pattern
- How to add a new role assignment (scope it to the specific resource)
- The role reduction (28 → 23 assignments)
- The principle of least privilege enforcement
- Cross-reference to `types/roles.type.bicep` for shared role GUIDs

**Step 3: Update the main README.md**

Document:
- Updated deployment order (no standalone RBAC step)
- CI/CD validation pipeline
- .bicepparam migration
- Linter configuration

**Step 4: Commit**

```bash
git add infra/Azure/Bicep/README.md infra/Azure/Bicep/rbac/README.md
git commit -m "docs(infra): update Bicep documentation for resource-scoped RBAC architecture"
```

---

## Task 11: Final Verification

**Step 1: Run full Bicep build**

Run: `az bicep build --file infra/Azure/Bicep/main.bicep --stdout > /dev/null`
Expected: Build succeeds with no errors

**Step 2: Verify linter passes with new rules**

Run: `az bicep lint --file infra/Azure/Bicep/main.bicep`
Expected: No errors (warnings are acceptable)

**Step 3: Verify no orphaned files**

Check that all `.bicep` files under `infra/Azure/Bicep/` are referenced by at least one module.

**Step 4: Review the complete changeset**

Run: `git diff main --stat`
Expected: See the full scope of changes for review.

---

## Summary: Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| RBAC scope | Resource group (all 28) | Individual resource (23) |
| Redundant roles | 5 (ACR Read, Blob Contributor, etc.) | 0 |
| Overly broad roles | 4 (KV Contributor, OpenAI Contributor, ACR Contributor) | 0 |
| Linter rules | 12 rules, mix of levels | 28 rules, security=error |
| Hardcoded secrets | SQL password in plain text | Key Vault reference |
| Parameter format | JSON | .bicepparam |
| Role GUID duplication | 3 files with same GUIDs | 1 shared type file |
| CI/CD validation | None | Lint → Build → Validate → What-If |
| Security posture | Moderate | Hardened (least privilege enforced) |

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Changing RBAC scope breaks existing deployments | Deploy new scoped roles first, verify access, then remove old RG-scoped roles in a separate deployment |
| `guid()` determinism changes | The `guid()` seed changes from `resourceGroup().id` to `resource.id` — new role assignments will be created alongside old ones. Clean up old assignments via Azure Portal or CLI after verification. |
| Key Vault reference timing | Key Vault must be deployed and secret seeded before Storage module runs. The `dependsOn` on configurationDeployment ensures this. |
| CI/CD pipeline requires Azure credentials | The validate and what-if stages require OIDC setup with GitHub Actions. These stages only run on push to main/preview, not on PRs. |
