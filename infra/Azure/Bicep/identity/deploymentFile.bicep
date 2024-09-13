targetScope = 'resourceGroup'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

@description('The prefix to use for the names of the resources.')
param resourceConventionPrefix string

var managedIdentitiesNamePrefix = '${resourceConventionPrefix}-uami'

module managedIdentities 'userAssignedIdentity.bicep' = {
  scope: resourceGroup()
  name: 'managedIdentitiesDeployment-${resourceDeploymentDate}'
  params: { userAssignedManagedIdentityNamePrefix: managedIdentitiesNamePrefix }
}

module federatedIdentities 'federatedIdentity.bicep' = {
  scope: resourceGroup()
  name: 'federatedIdentitiesDeployment-${resourceDeploymentDate}'
  params: { infrastructureManagedIdentity: managedIdentities.outputs.userAssignedManagedIdentities[2] }
}

import { identity } from '../types/identity.type.bicep'
output managedIdentitiesList identity[] = managedIdentities.outputs.userAssignedManagedIdentities
