targetScope = 'resourceGroup'

metadata description = 'RBAC role assignments for the frontend managed identity.'
metadata author = 'Alexandru-Razvan Olariu'

import { identity } from '../types/identity.type.bicep'

@description('Role definitions for frontend managed identities')
param frontendIdentity identity

// Array of RBAC role definitions that will be assigned to the frontend managed identity
var roleDefinitions = {
  // Reader roles:
  storageBlobReader: '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1'
  storageQueueReader: '19e7f393-937e-4f77-808e-94535e297925'
  storageTableReader: '76199698-9eea-4c19-bc75-cec21354c6b6'
  appConfigReader: '516239f1-63e1-4d78-a4de-a74fb236a071'
  acrPull: '7f951dda-4ed3-4680-a7ca-43fe172d538d' // Azure Container Registry Pull
}

// Storage Blob Reader role assignment for frontend managed identity
resource frontendStorageBlobReaderRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, frontendIdentity.principalId, roleDefinitions.storageBlobReader)
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      roleDefinitions.storageBlobReader
    )
    principalId: frontendIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Frontend managed identity access to storage blob data (read-only)'
  }
}

// Storage Queue Reader role assignment for frontend managed identity
resource frontendStorageQueueReaderRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, frontendIdentity.principalId, roleDefinitions.storageQueueReader)
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      roleDefinitions.storageQueueReader
    )
    principalId: frontendIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Frontend managed identity access to storage queue data (read-only)'
  }
}

// Storage Table Reader role assignment for frontend managed identity
resource frontendStorageTableReaderRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, frontendIdentity.principalId, roleDefinitions.storageTableReader)
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      roleDefinitions.storageTableReader
    )
    principalId: frontendIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Frontend managed identity access to storage table data (read-only)'
  }
}

// App Configuration Reader role assignment for frontend managed identity
resource frontendAppConfigReaderRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, frontendIdentity.principalId, roleDefinitions.appConfigReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitions.appConfigReader)
    principalId: frontendIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Frontend managed identity access to App Configuration data (read-only)'
  }
}

// Azure Container Registry Pull role assignment for frontend managed identity
resource frontendAcrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, frontendIdentity.principalId, roleDefinitions.acrPull)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitions.acrPull)
    principalId: frontendIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Frontend managed identity access to Azure Container Registry (pull only)'
  }
}
