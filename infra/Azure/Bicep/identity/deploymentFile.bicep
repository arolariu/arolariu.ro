targetScope = 'resourceGroup'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string

@description('The location for the resources.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param resourceLocation string

@description('The prefix to use for the names of the resources.')
param resourceConventionPrefix string

var managedIdentitiesNamePrefix = '${resourceConventionPrefix}-uami'

module managedIdentities 'userAssignedIdentity.bicep' = {
  scope: resourceGroup()
  name: 'managedIdentitiesDeployment-${resourceDeploymentDate}'
  params: {
    userAssignedManagedIdentityNamePrefix: managedIdentitiesNamePrefix
    userAssignedManagedIdentityLocation: resourceLocation
    userAssignedManagedIdentityDeploymentDate: resourceDeploymentDate
  }
}

module federatedIdentities 'federatedIdentity.bicep' = {
  scope: resourceGroup()
  name: 'federatedIdentitiesDeployment-${resourceDeploymentDate}'
  params: { infrastructureManagedIdentity: managedIdentities.outputs.userAssignedManagedIdentities[2] }
}

module securityGroups 'securityGroups.bicep' = {
  scope: resourceGroup()
  name: 'securityGroupsDeployment-${resourceDeploymentDate}'
  params: { identities: managedIdentities.outputs.userAssignedManagedIdentities }
}

import { identity } from '../types/identity.type.bicep'
output managedIdentitiesList identity[] = managedIdentities.outputs.userAssignedManagedIdentities
