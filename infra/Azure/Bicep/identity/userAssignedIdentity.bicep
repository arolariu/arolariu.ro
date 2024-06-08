targetScope = 'resourceGroup'

metadata description = 'This template will create three user assigned managed identities: Front-End, Back-End, Infrastructure'
metadata author = 'Alexandru-Razvan Olariu'

@description('The prefix for the user assigned managed identities')
param userAssignedManagedIdentityNamePrefix string

@description('The location of the user assigned managed identities')
param userAssignedManagedIdentityLocation string = resourceGroup().location

var identities = [
  {
    name: '${userAssignedManagedIdentityNamePrefix}frontend'
    displayName: 'Front-End Identity'
  }
  {
    name: '${userAssignedManagedIdentityNamePrefix}backend'
    displayName: 'Back-End Identity'
  }
  {
    name: '${userAssignedManagedIdentityNamePrefix}infrastructure'
    displayName: 'Infrastructure Identity'
  }
]

resource userAssignedManagedIdentities 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' = [
  for identity in identities: {
    name: identity.name
    location: userAssignedManagedIdentityLocation
    tags: {
      displayName: identity.displayName
      environment: 'production'
      deployment: 'bicep'
      timestamp: resourceGroup().tags.timestamp
    }
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
