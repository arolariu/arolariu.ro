targetScope = 'resourceGroup'

// =====================================================================================
// User-Assigned Managed Identities
// =====================================================================================
// This module creates three User-Assigned Managed Identities (UAMIs) for the
// arolariu.ro infrastructure. Each identity has a specific purpose and receives
// appropriate RBAC permissions via the rbac/ module.
//
// Created Identities:
// 1. Frontend Identity - Used by the Next.js website (arolariu.ro)
//    - Read-only access to storage, config
//    - ACR pull for container deployments
//
// 2. Backend Identity - Used by the .NET API (api.arolariu.ro)
//    - Full storage access, database access
//    - Azure OpenAI, Key Vault secrets
//
// 3. Infrastructure Identity - Used by GitHub Actions CI/CD
//    - Full ACR access (push/pull)
//    - Website deployment permissions
//    - Federated credentials for OIDC
//
// See: rbac/backend-uami-rbac.bicep, frontend-uami-rbac.bicep, infrastructure-uami-rbac.bicep
// =====================================================================================

metadata description = 'Creates three User-Assigned Managed Identities for Frontend, Backend, and Infrastructure workloads.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

@description('The prefix for the user assigned managed identities')
param userAssignedManagedIdentityNamePrefix string

@description('The location of the user assigned managed identities')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param userAssignedManagedIdentityLocation string

@description('The date when the deployment is executed.')
param userAssignedManagedIdentityDeploymentDate string

// Common tags for all resources
import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: userAssignedManagedIdentityDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'identity'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

var identities = [
  {
    name: '${userAssignedManagedIdentityNamePrefix}-frontend'
    location: userAssignedManagedIdentityLocation
    displayName: 'Frontend Identity'
  }
  {
    name: '${userAssignedManagedIdentityNamePrefix}-backend'
    location: userAssignedManagedIdentityLocation
    displayName: 'Backend Identity'
  }
  {
    name: '${userAssignedManagedIdentityNamePrefix}-infrastructure'
    location: userAssignedManagedIdentityLocation
    displayName: 'Infrastructure Identity'
  }
]

resource userAssignedManagedIdentities 'Microsoft.ManagedIdentity/userAssignedIdentities@2025-01-31-preview' = [
  for identity in identities: {
    name: identity.name
    location: identity.location
    tags: union(commonTags, {
      displayName: identity.displayName
      identityType: identity.displayName
    })
  }
]

import { identity } from '../types/identity.type.bicep'
output userAssignedManagedIdentities identity[] = [
  for identity in range(0, length(identities)): {
    name: identities[identity].name
    displayName: identities[identity].displayName
    resourceId: userAssignedManagedIdentities[identity].id
    principalId: userAssignedManagedIdentities[identity].properties.principalId
  }
]
