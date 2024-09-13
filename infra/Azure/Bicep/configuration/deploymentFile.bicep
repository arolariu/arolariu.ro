targetScope = 'resourceGroup'

import { identity } from '../types/identity.type.bicep'
param identities identity[]

@description('The prefix to use for the names of the resources.')
param resourceConventionPrefix string

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

var keyVaultName = '${resourceConventionPrefix}-kv'
var appConfigurationName = '${resourceConventionPrefix}-appconfig'

module keyVaultDeployment 'keyVault.bicep' = {
  scope: resourceGroup()
  name: 'keyVaultDeployment-${resourceDeploymentDate}'
  params: { keyVaultName: keyVaultName, identities: identities }
}

module appConfigurationDeployment 'appConfiguration.bicep' = {
  scope: resourceGroup()
  name: 'appConfigurationDeployment-${resourceDeploymentDate}'
  params: { appConfigurationName: appConfigurationName }
}
