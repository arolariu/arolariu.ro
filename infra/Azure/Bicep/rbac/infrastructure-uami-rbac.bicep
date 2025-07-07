targetScope = 'resourceGroup'

metadata description = 'RBAC role assignments for the infrastructure managed identity.'
metadata author = 'Alexandru-Razvan Olariu'

import { identity } from '../types/identity.type.bicep'

@description('Role definitions for infrastructure managed identities')
param infrastructureIdentity identity

// Array of RBAC role definitions that will be assigned to the infrastructure managed identity
var roleDefinitions = {
  // Reader roles:
  storageBlobReader: '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1'
  storageQueueReader: '19e7f393-937e-4f77-808e-94535e297925'
  storageTableReader: '76199698-9eea-4c19-bc75-cec21354c6b6'
  appConfigReader: '516239f1-63e1-4d78-a4de-a74fb236a071'
  keyVaultReader: '21090545-7ca7-4776-b22c-e363652d74d2'
  keyVaultSecretsReader: '4633458b-17de-408a-b874-0445c86b69e6'

  // Contributor roles:
  acrPull: '7f951dda-4ed3-4680-a7ca-43fe172d538d' // Azure Container Registry Pull
  acrPush: '8311e382-0749-4cb8-b61a-304f252e45ec' // Azure Container Registry Push
  acrContributor: '2efddaa5-3f1f-4df3-97df-af3f13818f4c' // Azure Container Registry Contributor
}

// Storage Blob Reader role assignment for infrastructure managed identity
resource infrastructureStorageBlobReaderRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, infrastructureIdentity.principalId, roleDefinitions.storageBlobReader)
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      roleDefinitions.storageBlobReader
    )
    principalId: infrastructureIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure managed identity access to storage blob data (read-only)'
  }
}

// Storage Queue Reader role assignment for infrastructure managed identity
resource infrastructureStorageQueueReaderRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, infrastructureIdentity.principalId, roleDefinitions.storageQueueReader)
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      roleDefinitions.storageQueueReader
    )
    principalId: infrastructureIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure managed identity access to storage queue data (read-only)'
  }
}

// Storage Table Reader role assignment for infrastructure managed identity
resource infrastructureStorageTableReaderRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, infrastructureIdentity.principalId, roleDefinitions.storageTableReader)
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      roleDefinitions.storageTableReader
    )
    principalId: infrastructureIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure managed identity access to storage table data (read-only)'
  }
}

// App Configuration Reader role assignment for infrastructure managed identity
resource infrastructureAppConfigReaderRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, infrastructureIdentity.principalId, roleDefinitions.appConfigReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitions.appConfigReader)
    principalId: infrastructureIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure managed identity access to App Configuration data (read-only)'
  }
}

// Key Vault Reader role assignment for infrastructure managed identity
resource infrastructureKeyVaultReaderRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, infrastructureIdentity.principalId, roleDefinitions.keyVaultReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitions.keyVaultReader)
    principalId: infrastructureIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure managed identity access to Key Vault (read-only)'
  }
}

// Key Vault Secrets Reader role assignment for infrastructure managed identity
resource infrastructureKeyVaultSecretsReaderRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, infrastructureIdentity.principalId, roleDefinitions.keyVaultSecretsReader)
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      roleDefinitions.keyVaultSecretsReader
    )
    principalId: infrastructureIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure managed identity access to Key Vault secrets (read-only)'
  }
}

// Azure Container Registry Pull role assignment for infrastructure managed identity
resource infrastructureAcrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, infrastructureIdentity.principalId, roleDefinitions.acrPull)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitions.acrPull)
    principalId: infrastructureIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure managed identity access to Azure Container Registry (pull)'
  }
}

// Azure Container Registry Push role assignment for infrastructure managed identity
resource infrastructureAcrPushRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, infrastructureIdentity.principalId, roleDefinitions.acrPush)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitions.acrPush)
    principalId: infrastructureIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure managed identity access to Azure Container Registry (push)'
  }
}

// Azure Container Registry Contributor role assignment for infrastructure managed identity
resource infrastructureAcrContributorRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, infrastructureIdentity.principalId, roleDefinitions.acrContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitions.acrContributor)
    principalId: infrastructureIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure managed identity access to Azure Container Registry management'
  }
}
