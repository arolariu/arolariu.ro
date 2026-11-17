targetScope = 'resourceGroup'

// =====================================================================================
// Key Vault — Resource-Scoped RBAC Role Assignments
// =====================================================================================
// This module assigns Azure RBAC roles scoped directly to an Azure Key Vault resource.
// Assignments are scoped to the vault (not the resource group) for least privilege.
// Role GUIDs are imported from the shared constants file (constants/roles.bicep).
//
// Assigned Roles:
// - Backend: Key Vault Secrets User
// - Infrastructure: Key Vault Secrets Officer, Key Vault Reader
// =====================================================================================

metadata description = 'Resource-scoped RBAC role assignments for the Key Vault, granting secret read access to backend and infrastructure managed identities.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '1.0.0'

import {
  keyVaultSecretsUser
  keyVaultSecretsOfficer
  keyVaultReader
} from '../constants/roles.bicep'

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

resource keyVault 'Microsoft.KeyVault/vaults@2026-05-15' existing = {
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

// The infrastructure identity retains scoped secret management after bootstrap.
resource infrastructureSecretsOfficer 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  name: guid(keyVault.id, infrastructurePrincipalId, keyVaultSecretsOfficer)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsOfficer)
    principalId: infrastructurePrincipalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure: permanent scoped secret management'
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
