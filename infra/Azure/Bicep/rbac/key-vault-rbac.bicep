targetScope = 'resourceGroup'

// =====================================================================================
// Key Vault — Resource-Scoped RBAC Role Assignments
// =====================================================================================
// This module assigns Azure RBAC roles scoped directly to an Azure Key Vault resource.
// Assignments are scoped to the vault (not the resource group) for least privilege.
// Role GUIDs are imported from the shared roles type file.
//
// Assigned Roles:
// - Backend: Key Vault Secrets User
// - Infrastructure: Key Vault Secrets User, Key Vault Reader
// =====================================================================================

metadata description = 'Resource-scoped RBAC role assignments for the Key Vault, granting secret read access to backend and infrastructure managed identities.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '1.0.0'

import {
  keyVaultSecretsUser
  keyVaultReader
} from '../types/roles.type.bicep'

// -------------------------------------------------------------------------------------
// Parameters
// -------------------------------------------------------------------------------------

@description('The name of the existing Key Vault to scope role assignments to.')
param keyVaultName string

@description('Principal ID of the backend managed identity.')
param backendPrincipalId string

@description('Principal ID of the infrastructure managed identity.')
param infrastructurePrincipalId string

// -------------------------------------------------------------------------------------
// Existing Resource Reference
// -------------------------------------------------------------------------------------

resource keyVault 'Microsoft.KeyVault/vaults@2025-05-01' existing = {
  name: keyVaultName
}

// =====================================================================================
// Backend Role Assignments
// =====================================================================================

// Grants the backend read access to Key Vault secrets for application configuration
resource backendSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  name: guid(keyVault.id, backendPrincipalId, keyVaultSecretsUser)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsUser)
    principalId: backendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Backend: read secrets from key vault'
  }
}

// =====================================================================================
// Infrastructure Role Assignments
// =====================================================================================

// Grants infrastructure read access to Key Vault secrets for CI/CD deployment credentials
resource infrastructureSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  name: guid(keyVault.id, infrastructurePrincipalId, keyVaultSecretsUser)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsUser)
    principalId: infrastructurePrincipalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure: read secrets from key vault'
  }
}

// Grants infrastructure read access to Key Vault metadata for secret discovery
resource infrastructureVaultReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  name: guid(keyVault.id, infrastructurePrincipalId, keyVaultReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultReader)
    principalId: infrastructurePrincipalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure: read key vault metadata and properties'
  }
}
