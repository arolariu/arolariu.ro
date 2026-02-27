targetScope = 'resourceGroup'

// =====================================================================================
// Container Registry — Resource-Scoped RBAC Role Assignments
// =====================================================================================
// This module assigns Azure RBAC roles scoped directly to an Azure Container Registry.
// Assignments are scoped to the registry (not the resource group) for least privilege.
// Role GUIDs are imported from the shared constants file (constants/roles.bicep).
//
// Assigned Roles:
// - Frontend: ACR Pull
// - Backend: ACR Pull
// - Infrastructure: ACR Push, ACR Pull
// =====================================================================================

metadata description = 'Resource-scoped RBAC role assignments for the Container Registry, granting image pull and push access to each managed identity.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '1.0.0'

import {
  acrPull
  acrPush
  acrRepositoryReader
} from '../constants/roles.bicep'

// -------------------------------------------------------------------------------------
// Parameters
// -------------------------------------------------------------------------------------

@description('The name of the existing Azure Container Registry to scope role assignments to.')
param containerRegistryName string

@description('Principal ID of the frontend managed identity.')
param frontendPrincipalId string

@description('Principal ID of the backend managed identity.')
param backendPrincipalId string

@description('Principal ID of the infrastructure managed identity.')
param infrastructurePrincipalId string

// -------------------------------------------------------------------------------------
// Existing Resource Reference
// -------------------------------------------------------------------------------------

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2025-11-01' existing = {
  name: containerRegistryName
}

// =====================================================================================
// Frontend Role Assignments
// =====================================================================================

// Grants the frontend pull access to download container images for deployment
resource frontendAcrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: containerRegistry
  name: guid(containerRegistry.id, frontendPrincipalId, acrPull)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPull)
    principalId: frontendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Frontend: pull container images from registry'
  }
}

// Grants the frontend repository list access to enumerate available images/tags for deployment
resource frontendAcrReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: containerRegistry
  name: guid(containerRegistry.id, frontendPrincipalId, acrRepositoryReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrRepositoryReader)
    principalId: frontendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Frontend: list container repositories and tags in registry'
  }
}

// =====================================================================================
// Backend Role Assignments
// =====================================================================================

// Grants the backend pull access to download container images for deployment
resource backendAcrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: containerRegistry
  name: guid(containerRegistry.id, backendPrincipalId, acrPull)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPull)
    principalId: backendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Backend: pull container images from registry'
  }
}

// Grants the backend repository list access to enumerate available images/tags for deployment
resource backendAcrReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: containerRegistry
  name: guid(containerRegistry.id, backendPrincipalId, acrRepositoryReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrRepositoryReader)
    principalId: backendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Backend: list container repositories and tags in registry'
  }
}

// =====================================================================================
// Infrastructure Role Assignments
// =====================================================================================

// Grants infrastructure push access to upload built images during CI/CD
resource infrastructureAcrPush 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: containerRegistry
  name: guid(containerRegistry.id, infrastructurePrincipalId, acrPush)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPush)
    principalId: infrastructurePrincipalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure: push container images to registry'
  }
}

// Grants infrastructure pull access to download base images during CI/CD builds
resource infrastructureAcrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: containerRegistry
  name: guid(containerRegistry.id, infrastructurePrincipalId, acrPull)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPull)
    principalId: infrastructurePrincipalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure: pull container images from registry'
  }
}

// Grants infrastructure repository list access to enumerate available images/tags during CI/CD builds
resource infrastructureAcrReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: containerRegistry
  name: guid(containerRegistry.id, infrastructurePrincipalId, acrRepositoryReader)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrRepositoryReader)
    principalId: infrastructurePrincipalId
    principalType: 'ServicePrincipal'
    description: 'Infrastructure: list container repositories and tags in registry'
  }
}
