targetScope = 'resourceGroup'

@description('The prefix to use for the names of the resources.')
param resourceConventionPrefix string

@description('The location for the App Configuration resource.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param resourceLocation string

@description('The date when the deployment is executed.')
param resourceDeploymentDate string

var keyVaultName = '${replace(resourceConventionPrefix, '-', '')}kv'
var appConfigurationName = '${replace(resourceConventionPrefix, '-', '')}appconfig'

module keyVaultDeployment 'keyVault.bicep' = {
  scope: resourceGroup()
  name: 'keyVaultDeployment-${resourceDeploymentDate}'
  params: {
    keyVaultName: keyVaultName
    keyVaultLocation: resourceLocation
    keyVaultDeploymentDate: resourceDeploymentDate
  }
}

module appConfigurationDeployment 'appConfiguration.bicep' = {
  scope: resourceGroup()
  name: 'appConfigurationDeployment-${resourceDeploymentDate}'
  params: {
    appConfigurationName: appConfigurationName
    appConfigurationLocation: resourceLocation
    appConfigurationDeploymentDate: resourceDeploymentDate
  }
}
