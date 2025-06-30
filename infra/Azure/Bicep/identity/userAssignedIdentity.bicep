targetScope = 'resourceGroup'

metadata description = 'This template will create three user assigned managed identities: Front-End, Back-End, Infrastructure'
metadata author = 'Alexandru-Razvan Olariu'

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
    id: userAssignedManagedIdentities[identity].id
  }
]
