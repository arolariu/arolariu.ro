targetScope = 'resourceGroup'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

@description('The prefix to use for the names of the resources.')
param resourceConventionPrefix string

var managedIdentitiesNamePrefix = '${resourceConventionPrefix}-uami-'

module managedIdentities 'userAssignedIdentity.bicep' = {
  name: 'managedIdentitiesDeployment-${resourceDeploymentDate}'
  scope: resourceGroup()
  params: {
    userAssignedManagedIdentityNamePrefix: managedIdentitiesNamePrefix
  }
}

import { identity } from '../types/identity.type.bicep'
output managedIdentitiesList identity[] = managedIdentities.outputs.userAssignedManagedIdentities
