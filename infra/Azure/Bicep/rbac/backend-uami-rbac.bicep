targetScope = 'resourceGroup'

metadata description = 'RBAC role assignments for the backend managed identity.'
metadata author = 'Alexandru-Razvan Olariu'

import { identity } from '../types/identity.type.bicep'

@description('Role definitions for backend managed identities')
param backendIdentity identity

// Array of RBAC role definitions that will be assigned to the backend managed identity
var roleDefinitions = {
  // Contributor roles:
  storageBlobContributor: 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
  storageBlobDataOwner: 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b'
  storageQueueContributor: '974c5e8b-45b9-4653-ba55-5f855dd0fb88'
  storageTableContributor: '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3'
  sqlDbContributor: '9b7fa17d-e63e-47b0-bb0a-15c516ac86ec'
  appConfigContributor: 'fe86443c-f201-4fc4-9d2a-ac61149fbda0'
  openAiContributor: 'a001fd3d-188f-4b5d-821b-7da978bf7442'
  keyVaultContributor: 'f25e0fa2-a7c8-4377-a976-54943a77a395'
  keyVaultSecretsContributor: 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7'
  acrPull: '7f951dda-4ed3-4680-a7ca-43fe172d538d' // Azure Container Registry Pull
  acrRead: 'b93aa761-3e63-49ed-ac28-beffa264f7ac' // Azure Container Registry Read
}

// Storage Blob Contributor role assignment for backend managed identity
resource backendStorageBlobContributorRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, backendIdentity.principalId, roleDefinitions.storageBlobContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      roleDefinitions.storageBlobContributor
    )
    principalId: backendIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Backend managed identity access to storage blob data (read-write)'
  }
}

// Storage Blob Data Owner role assignment for backend managed identity
resource backendStorageBlobDataOwnerRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, backendIdentity.principalId, roleDefinitions.storageBlobDataOwner)
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      roleDefinitions.storageBlobDataOwner
    )
    principalId: backendIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Backend managed identity full access to storage blob data'
  }
}

// Storage Queue Contributor role assignment for backend managed identity
resource backendStorageQueueContributorRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, backendIdentity.principalId, roleDefinitions.storageQueueContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      roleDefinitions.storageQueueContributor
    )
    principalId: backendIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Backend managed identity access to storage queue data (read-write)'
  }
}

// Storage Table Contributor role assignment for backend managed identity
resource backendStorageTableContributorRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, backendIdentity.principalId, roleDefinitions.storageTableContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      roleDefinitions.storageTableContributor
    )
    principalId: backendIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Backend managed identity access to storage table data (read-write)'
  }
}

// SQL Database Contributor role assignment for backend managed identity
resource backendSqlDbContributorRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, backendIdentity.principalId, roleDefinitions.sqlDbContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      roleDefinitions.sqlDbContributor
    )
    principalId: backendIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Backend managed identity access to SQL Database management'
  }
}

// App Configuration Contributor role assignment for backend managed identity
resource backendAppConfigContributorRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, backendIdentity.principalId, roleDefinitions.appConfigContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      roleDefinitions.appConfigContributor
    )
    principalId: backendIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Backend managed identity access to App Configuration management'
  }
}

// OpenAI Contributor role assignment for backend managed identity
resource backendOpenAiContributorRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, backendIdentity.principalId, roleDefinitions.openAiContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      roleDefinitions.openAiContributor
    )
    principalId: backendIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Backend managed identity access to OpenAI management'
  }
}

// Key Vault Contributor role assignment for backend managed identity
resource backendKeyVaultContributorRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, backendIdentity.principalId, roleDefinitions.keyVaultContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      roleDefinitions.keyVaultContributor
    )
    principalId: backendIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Backend managed identity access to Key Vault management'
  }
}

// Key Vault Secrets Contributor role assignment for backend managed identity
resource backendKeyVaultSecretsContributorRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, backendIdentity.principalId, roleDefinitions.keyVaultSecretsContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      roleDefinitions.keyVaultSecretsContributor
    )
    principalId: backendIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Backend managed identity access to Key Vault secrets management'
  }
}

// Azure Container Registry Pull role assignment for backend managed identity
resource backendAcrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, backendIdentity.principalId, roleDefinitions.acrPull)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitions.acrPull)
    principalId: backendIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Backend managed identity access to Azure Container Registry (pull)'
  }
}

// Azure Container Registry Read role assignment for backend managed identity
resource backendAcrReadRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, backendIdentity.principalId, roleDefinitions.acrRead)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitions.acrRead)
    principalId: backendIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Backend managed identity access to Azure Container Registry (read)'
  }
}
