targetScope = 'resourceGroup'

import { identity } from '../types/identity.type.bicep'
param identities identity[]

@description('The prefix to use for the names of the resources.')
param resourceConventionPrefix string

@description('The location for the App Configuration resource.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param resourceLocation string

@description('The date when the deployment is executed.')
param resourceDeploymentDate string

var keyVaultName = '${resourceConventionPrefix}-kv'
var appConfigurationName = '${resourceConventionPrefix}-appconfig'

module keyVaultDeployment 'keyVault.bicep' = {
  scope: resourceGroup()
  name: 'keyVaultDeployment-${resourceDeploymentDate}'
  params: {
    keyVaultName: keyVaultName
    identities: identities
    resourceDeploymentDate: resourceDeploymentDate
  }
}

module appConfigurationDeployment 'appConfiguration.bicep' = {
  scope: resourceGroup()
  name: 'appConfigurationDeployment-${resourceDeploymentDate}'
  params: {
    appConfigurationName: appConfigurationName
    appConfigurationLocation: resourceLocation
  }
}
