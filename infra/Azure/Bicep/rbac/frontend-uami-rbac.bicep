targetScope = 'resourceGroup'

// =====================================================================================
// Frontend Managed Identity RBAC Role Assignments
// =====================================================================================
// This module assigns Azure RBAC roles to the frontend User-Assigned Managed Identity.
// These roles enable the Next.js frontend to access Azure resources securely.
//
// Assigned Roles:
// - Storage: Blob Reader, Queue Reader, Table Reader, Blob Contributor (for uploads)
// - Configuration: App Configuration Reader
// - Container Registry: ACR Pull and Read
//
// Security: Frontend uses read-only access where possible (least privilege).
// The only write access is Blob Contributor for user-uploaded content (invoices).
// =====================================================================================

metadata description = 'RBAC role assignments for the frontend managed identity, enabling secure read access to Azure resources with minimal write permissions.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

import { identity } from '../types/identity.type.bicep'

@description('The frontend managed identity that will receive RBAC role assignments. Must include valid principalId.')
param frontendIdentity identity

// =====================================================================================
// Role Definition GUIDs
// =====================================================================================
// These are the Azure built-in role definition IDs used for RBAC assignments.
// Reference: https://learn.microsoft.com/azure/role-based-access-control/built-in-roles
// =====================================================================================
var roleDefinitions = {
  // -------------------------------------------------------------------------------------
  // Reader Roles - Enable frontend to read storage data and configuration
  // -------------------------------------------------------------------------------------
  storageBlobReader: '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1' // Read blob data (CDN assets, static files)
  storageQueueReader: '19e7f393-937e-4f77-808e-94535e297925' // Read queue messages (status polling)
  storageTableReader: '76199698-9eea-4c19-bc75-cec21354c6b6' // Read table data (feature flags)
  appConfigReader: '516239f1-63e1-4d78-a4de-a74fb236a071' // Read app configuration key-values

  // -------------------------------------------------------------------------------------
  // Contributor Roles - Enable frontend to write user-uploaded content
  // -------------------------------------------------------------------------------------
  storageBlobContributor: 'ba92f5b4-2d11-453d-a403-e96b0029c9fe' // Write blobs (invoice uploads)

  // -------------------------------------------------------------------------------------
  // Container Registry Roles - Enable frontend to pull container images
  // -------------------------------------------------------------------------------------
  acrPull: '7f951dda-4ed3-4680-a7ca-43fe172d538d' // Pull images from ACR
  acrRead: 'b93aa761-3e63-49ed-ac28-beffa264f7ac' // Read ACR metadata
}

// Grants read-only access to blob storage for CDN assets and static content
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

// Grants read-only access to queue storage for status polling and notifications
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

// Grants read-only access to table storage for feature flags and metadata
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

// Grants read-only access to Azure App Configuration for feature flags and settings
resource frontendAppConfigReaderRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, frontendIdentity.principalId, roleDefinitions.appConfigReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitions.appConfigReader)
    principalId: frontendIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Frontend managed identity access to App Configuration data (read-only)'
  }
}

// Grants read/write/delete access to blob storage for user-uploaded invoice content
resource frontendStorageBlobContributorRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, frontendIdentity.principalId, roleDefinitions.storageBlobContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      roleDefinitions.storageBlobContributor
    )
    principalId: frontendIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Frontend managed identity access to storage blob data (read, write, delete)'
  }
}

// Grants pull access to Azure Container Registry for downloading container images
resource frontendAcrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, frontendIdentity.principalId, roleDefinitions.acrPull)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitions.acrPull)
    principalId: frontendIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Frontend managed identity access to Azure Container Registry (pull only)'
  }
}

// Grants read access to Azure Container Registry for reading repository and image metadata
resource frontendAcrReadRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, frontendIdentity.principalId, roleDefinitions.acrRead)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitions.acrRead)
    principalId: frontendIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Frontend managed identity access to Azure Container Registry (read-only)'
  }
}
