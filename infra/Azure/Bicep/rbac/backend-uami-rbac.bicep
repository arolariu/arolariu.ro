targetScope = 'resourceGroup'

// =====================================================================================
// Backend Managed Identity RBAC Role Assignments
// =====================================================================================
// This module assigns Azure RBAC roles to the backend User-Assigned Managed Identity.
// These roles enable the backend API to access Azure resources without storing secrets.
//
// Assigned Roles:
// - Storage: Blob Contributor, Blob Data Owner, Queue Contributor, Table Contributor
// - Database: SQL DB Contributor, NoSQL (Cosmos DB) Operator
// - Configuration: App Configuration Contributor, Key Vault Contributor/Secrets
// - AI: Azure OpenAI Contributor and User
// - Container Registry: ACR Pull and Read
//
// Security: All assignments follow the principle of least privilege.
// =====================================================================================

metadata description = 'RBAC role assignments for the backend managed identity, enabling secure access to Azure resources via managed identity authentication.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

import { identity } from '../types/identity.type.bicep'

@description('The backend managed identity that will receive RBAC role assignments. Must include valid principalId.')
param backendIdentity identity

// =====================================================================================
// Role Definition GUIDs
// =====================================================================================
// These are the Azure built-in role definition IDs used for RBAC assignments.
// Reference: https://learn.microsoft.com/azure/role-based-access-control/built-in-roles
// =====================================================================================
var roleDefinitions = {
  // -------------------------------------------------------------------------------------
  // Storage Roles - Enable backend to read/write blobs, queues, and tables
  // -------------------------------------------------------------------------------------
  storageBlobContributor: 'ba92f5b4-2d11-453d-a403-e96b0029c9fe' // Read, write, delete blobs
  storageBlobDataOwner: 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b' // Full blob data access + ACL
  storageQueueContributor: '974c5e8b-45b9-4653-ba55-5f855dd0fb88' // Queue message operations
  storageTableContributor: '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3' // Table entity operations

  // -------------------------------------------------------------------------------------
  // Database Roles - Enable backend to manage SQL and Cosmos DB
  // -------------------------------------------------------------------------------------
  sqlDbContributor: '9b7fa17d-e63e-47b0-bb0a-15c516ac86ec' // SQL database management
  noSqlDbOperator: '230815da-be43-4aae-9cb4-875f7bd000aa' // Cosmos DB data plane operations

  // -------------------------------------------------------------------------------------
  // Configuration Roles - Enable backend to read app config and secrets
  // -------------------------------------------------------------------------------------
  appConfigContributor: 'fe86443c-f201-4fc4-9d2a-ac61149fbda0' // App Configuration read/write
  keyVaultContributor: 'f25e0fa2-a7c8-4377-a976-54943a77a395' // Key Vault management
  keyVaultSecretsContributor: 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7' // Key Vault secrets CRUD

  // -------------------------------------------------------------------------------------
  // AI Roles - Enable backend to use Azure OpenAI services
  // -------------------------------------------------------------------------------------
  openAiContributor: 'a001fd3d-188f-4b5d-821b-7da978bf7442' // OpenAI resource management
  openAiUser: '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd' // OpenAI API inference calls

  // -------------------------------------------------------------------------------------
  // Container Registry Roles - Enable backend to pull container images
  // -------------------------------------------------------------------------------------
  acrPull: '7f951dda-4ed3-4680-a7ca-43fe172d538d' // Pull images from ACR
  acrRead: 'b93aa761-3e63-49ed-ac28-beffa264f7ac' // Read ACR metadata
}

// Grants read, write, and delete access to blob containers and data
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

// Grants full ownership of blob data including ACL management for data access control
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

// Grants access to send, receive, peek, and delete queue messages for async processing
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

// Grants access to table storage for entity CRUD operations
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

// Grants contributor access to Azure SQL databases for schema and data operations
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

// Grants data plane operator access to Cosmos DB for document CRUD operations
resource backendNoSqlDbOperatorRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, backendIdentity.principalId, roleDefinitions.noSqlDbOperator)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitions.noSqlDbOperator)
    principalId: backendIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Backend managed identity access to NoSQL Database management'
  }
}

// Grants read/write access to Azure App Configuration key-values and feature flags
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

// Grants contributor access to Azure OpenAI for resource management operations
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

// Grants user-level access to Azure OpenAI for API inference calls (chat, embeddings, etc.)
resource backendOpenAiUserRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, backendIdentity.principalId, roleDefinitions.openAiUser)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitions.openAiUser)
    principalId: backendIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Backend managed identity access to OpenAI user operations'
  }
}

// Grants contributor access to Key Vault for vault management operations
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

// Grants secrets contributor access to Key Vault for secret CRUD operations
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

// Grants pull access to Azure Container Registry for downloading container images
resource backendAcrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, backendIdentity.principalId, roleDefinitions.acrPull)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitions.acrPull)
    principalId: backendIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Backend managed identity access to Azure Container Registry (pull)'
  }
}

// Grants read access to Azure Container Registry for reading repository and image metadata
resource backendAcrReadRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, backendIdentity.principalId, roleDefinitions.acrRead)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitions.acrRead)
    principalId: backendIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Backend managed identity access to Azure Container Registry (read)'
  }
}
