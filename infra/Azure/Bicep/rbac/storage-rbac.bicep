targetScope = 'resourceGroup'

// =====================================================================================
// Storage Account — Resource-Scoped RBAC Role Assignments
// =====================================================================================
// This module assigns Azure RBAC roles scoped directly to a Storage Account resource.
// Assignments are scoped to the storage account (not the resource group) for least
// privilege. Role GUIDs are imported from the shared roles type file.
//
// Assigned Roles:
// - Frontend: Blob Data Reader, Blob Data Contributor, Queue Data Reader, Table Data Reader
// - Backend: Blob Data Owner, Queue Data Contributor, Table Data Contributor
// - Infrastructure: Blob Data Reader, Queue Data Reader, Table Data Reader
// =====================================================================================

metadata description = 'Resource-scoped RBAC role assignments for the Storage Account, granting precise data-plane access to each managed identity.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '1.0.0'

import {
  storageBlobDataReader
  storageBlobDataContributor
  storageBlobDataOwner
  storageQueueDataReader
  storageQueueDataContributor
  storageTableDataReader
  storageTableDataContributor
} from '../types/roles.type.bicep'

// -------------------------------------------------------------------------------------
// Parameters
// -------------------------------------------------------------------------------------

@description('The name of the existing Storage Account to scope role assignments to.')
param storageAccountName string

@description('Principal ID of the frontend managed identity.')
param frontendPrincipalId string

@description('Principal ID of the backend managed identity.')
param backendPrincipalId string

@description('Principal ID of the infrastructure managed identity.')
param infrastructurePrincipalId string

// -------------------------------------------------------------------------------------
// Existing Resource Reference
// -------------------------------------------------------------------------------------

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

// =====================================================================================
// Frontend Role Assignments
// =====================================================================================

// Grants the frontend read access to blob data (CDN assets, static files)
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

// Grants the frontend read/write access to blob data (user-uploaded invoice images)
resource frontendBlobContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storageAccount
  name: guid(storageAccount.id, frontendPrincipalId, storageBlobDataContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataContributor)
    principalId: frontendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Frontend: contribute blob data to storage account'
  }
}

// Grants the frontend read access to queue messages (status polling)
resource frontendQueueReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storageAccount
  name: guid(storageAccount.id, frontendPrincipalId, storageQueueDataReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageQueueDataReader)
    principalId: frontendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Frontend: read queue data from storage account'
  }
}

// Grants the frontend read access to table data (feature flags, metadata)
resource frontendTableReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storageAccount
  name: guid(storageAccount.id, frontendPrincipalId, storageTableDataReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageTableDataReader)
    principalId: frontendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Frontend: read table data from storage account'
  }
}

// =====================================================================================
// Backend Role Assignments
// =====================================================================================

// Grants the backend full ownership of blob data including ACL management
resource backendBlobOwner 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storageAccount
  name: guid(storageAccount.id, backendPrincipalId, storageBlobDataOwner)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataOwner)
    principalId: backendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Backend: full blob data ownership on storage account'
  }
}

// Grants the backend read/write access to queue messages for async processing
resource backendQueueContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storageAccount
  name: guid(storageAccount.id, backendPrincipalId, storageQueueDataContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageQueueDataContributor)
    principalId: backendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Backend: contribute queue data to storage account'
  }
}

// Grants the backend read/write access to table entities for data operations
resource backendTableContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storageAccount
  name: guid(storageAccount.id, backendPrincipalId, storageTableDataContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageTableDataContributor)
    principalId: backendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Backend: contribute table data to storage account'
  }
}

// =====================================================================================
// Infrastructure Role Assignments
// =====================================================================================

// Grants infrastructure read access to blob data for deployment artifact verification
resource infrastructureBlobReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storageAccount
  name: guid(storageAccount.id, infrastructurePrincipalId, storageBlobDataReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataReader)
    principalId: infrastructurePrincipalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure: read blob data from storage account'
  }
}

// Grants infrastructure read access to queue data for build status monitoring
resource infrastructureQueueReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storageAccount
  name: guid(storageAccount.id, infrastructurePrincipalId, storageQueueDataReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageQueueDataReader)
    principalId: infrastructurePrincipalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure: read queue data from storage account'
  }
}

// Grants infrastructure read access to table data for deployment metadata
resource infrastructureTableReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storageAccount
  name: guid(storageAccount.id, infrastructurePrincipalId, storageTableDataReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageTableDataReader)
    principalId: infrastructurePrincipalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure: read table data from storage account'
  }
}
