targetScope = 'resourceGroup'

// =====================================================================================
// Infrastructure Managed Identity RBAC Role Assignments
// =====================================================================================
// This module assigns Azure RBAC roles to the infrastructure User-Assigned Managed Identity.
// These roles enable GitHub Actions and CI/CD pipelines to manage Azure resources.
//
// Assigned Roles:
// - Storage: Blob Reader, Queue Reader, Table Reader (read-only access)
// - Configuration: App Configuration Reader, Key Vault Reader/Secrets Reader
// - Container Registry: ACR Read, Pull, Push, Contributor (full CI/CD access)
// - App Services: Website Contributor (deploy and manage web apps)
//
// Security: Infrastructure identity has elevated permissions for CI/CD operations.
// Used by GitHub Actions workflows via OIDC federated credentials.
// =====================================================================================

metadata description = 'RBAC role assignments for the infrastructure managed identity, enabling CI/CD pipelines to deploy and manage Azure resources.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

import { identity } from '../types/identity.type.bicep'

@description('The infrastructure managed identity that will receive RBAC role assignments. Must include valid principalId.')
param infrastructureIdentity identity

// =====================================================================================
// Role Definition GUIDs
// =====================================================================================
// These are the Azure built-in role definition IDs used for RBAC assignments.
// Reference: https://learn.microsoft.com/azure/role-based-access-control/built-in-roles
// =====================================================================================
var roleDefinitions = {
  // -------------------------------------------------------------------------------------
  // Reader Roles - Enable infrastructure to read storage and configuration data
  // -------------------------------------------------------------------------------------
  storageBlobReader: '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1' // Read blob data
  storageQueueReader: '19e7f393-937e-4f77-808e-94535e297925' // Read queue messages
  storageTableReader: '76199698-9eea-4c19-bc75-cec21354c6b6' // Read table data
  appConfigReader: '516239f1-63e1-4d78-a4de-a74fb236a071' // Read app configuration
  keyVaultReader: '21090545-7ca7-4776-b22c-e363652d74d2' // Read Key Vault metadata
  keyVaultSecretsReader: '4633458b-17de-408a-b874-0445c86b69e6' // Read Key Vault secrets
  acrRead: 'b93aa761-3e63-49ed-ac28-beffa264f7ac' // Read ACR metadata

  // -------------------------------------------------------------------------------------
  // Contributor Roles - Enable infrastructure to manage resources for CI/CD
  // -------------------------------------------------------------------------------------
  acrPull: '7f951dda-4ed3-4680-a7ca-43fe172d538d' // Pull images from ACR
  acrPush: '8311e382-0749-4cb8-b61a-304f252e45ec' // Push images to ACR
  acrContributor: '2efddaa5-3f1f-4df3-97df-af3f13818f4c' // Full ACR management
  websiteContributor: 'de139f84-1756-47ae-9be6-808fbbe84772' // Deploy and manage web apps
}

// Grants read-only access to blob storage for deployment artifacts
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

// Grants read-only access to queue storage for build notifications and status
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

// Grants read-only access to table storage for deployment metadata
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

// Grants read-only access to Azure App Configuration for deployment settings
resource infrastructureAppConfigReaderRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, infrastructureIdentity.principalId, roleDefinitions.appConfigReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitions.appConfigReader)
    principalId: infrastructureIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure managed identity access to App Configuration data (read-only)'
  }
}

// Grants read-only access to Key Vault metadata for secret discovery
resource infrastructureKeyVaultReaderRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, infrastructureIdentity.principalId, roleDefinitions.keyVaultReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitions.keyVaultReader)
    principalId: infrastructureIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure managed identity access to Key Vault (read-only)'
  }
}

// Grants read-only access to Key Vault secrets for deployment credentials
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

// Grants read access to Azure Container Registry for reading repository metadata
resource infrastructureAcrReadRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, infrastructureIdentity.principalId, roleDefinitions.acrRead)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitions.acrRead)
    principalId: infrastructureIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure managed identity access to Azure Container Registry (read-only)'
  }
}

// Grants pull access to Azure Container Registry for downloading base images
resource infrastructureAcrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, infrastructureIdentity.principalId, roleDefinitions.acrPull)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitions.acrPull)
    principalId: infrastructureIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure managed identity access to Azure Container Registry (pull)'
  }
}

// Grants push access to Azure Container Registry for uploading built images
resource infrastructureAcrPushRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, infrastructureIdentity.principalId, roleDefinitions.acrPush)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitions.acrPush)
    principalId: infrastructureIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure managed identity access to Azure Container Registry (push)'
  }
}

// Grants contributor access to Azure Container Registry for full management operations
resource infrastructureAcrContributorRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, infrastructureIdentity.principalId, roleDefinitions.acrContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitions.acrContributor)
    principalId: infrastructureIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure managed identity access to Azure Container Registry management'
  }
}

// Grants contributor access to Azure App Services for deploying and managing web apps
resource infrastructureWebsiteContributorRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, infrastructureIdentity.principalId, roleDefinitions.websiteContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      roleDefinitions.websiteContributor
    )
    principalId: infrastructureIdentity.principalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure managed identity access to Azure Website management'
  }
}
