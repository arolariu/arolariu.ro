targetScope = 'resourceGroup'

metadata description = 'RBAC module deployment file that manages resource group level role assignments for managed identities'
metadata author = 'Alexandru-Razvan Olariu'

import { identity } from '../types/identity.type.bicep'

@description('Array of managed identities that need RBAC assignments')
param managedIdentities identity[]

@description('The date when the deployment is executed.')
param resourceDeploymentDate string

// Built-in role definition IDs for Azure RBAC
var roleDefinitions = {
  // Storage roles
  storageBlobDataReader: 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b'
  storageBlobDataContributor: 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
  storageAccountContributor: '17d1049b-9a84-46fb-8f53-869881c3d3ab'

  // SQL roles
  sqlDbContributor: '9b7fa17d-e63e-47b0-bb0a-15c516ac86ec'

  // Cosmos DB roles
  cosmosDbDataContributor: '00000000-0000-0000-0000-000000000002' // Built-in data contributor role

  // General management roles
  contributor: 'b24988ac-6180-42a0-ab88-20f7382dd24c'
}

// Frontend Identity RBAC - Storage Blob Data Reader
resource frontendStorageRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, managedIdentities[0].id, roleDefinitions.storageBlobDataReader)
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      roleDefinitions.storageBlobDataReader
    )
    principalId: managedIdentities[0].id
    principalType: 'ServicePrincipal'
    description: 'Frontend identity access to storage blob data (read-only)'
  }
}

// Backend Identity RBAC - Multiple roles
resource backendStorageRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, managedIdentities[1].id, roleDefinitions.storageBlobDataContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      roleDefinitions.storageBlobDataContributor
    )
    principalId: managedIdentities[1].id
    principalType: 'ServicePrincipal'
    description: 'Backend identity access to storage blob data (read/write)'
  }
}

resource backendSqlRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, managedIdentities[1].id, roleDefinitions.sqlDbContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      roleDefinitions.sqlDbContributor
    )
    principalId: managedIdentities[1].id
    principalType: 'ServicePrincipal'
    description: 'Backend identity access to SQL databases'
  }
}

// Infrastructure Identity RBAC - Storage Account Contributor
resource infrastructureStorageRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, managedIdentities[2].id, roleDefinitions.storageAccountContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      roleDefinitions.storageAccountContributor
    )
    principalId: managedIdentities[2].id
    principalType: 'ServicePrincipal'
    description: 'Infrastructure identity access to storage account management'
  }
}

// Output the role assignment details for reference
output roleAssignments object = {
  frontend: {
    storageReader: frontendStorageRoleAssignment.id
  }
  backend: {
    storageContributor: backendStorageRoleAssignment.id
    sqlContributor: backendSqlRoleAssignment.id
  }
  infrastructure: {
    storageAccountContributor: infrastructureStorageRoleAssignment.id
  }
}
