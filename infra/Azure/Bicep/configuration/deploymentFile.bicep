targetScope = 'resourceGroup'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

@description('The prefix to use for the names of the resources.')
param resourceConventionPrefix string

param managedIdentityBackendId string
param managedIdentityFrontendId string
param managedIdentityInfraId string

var keyVaultName = '${resourceConventionPrefix}-kv'
var appConfigurationName = '${resourceConventionPrefix}-appconfig'

module keyVaultDeployment 'keyVault.bicep' = {
  name: 'keyVaultDeployment-${resourceDeploymentDate}'
  params: { keyVaultName: keyVaultName }
  scope: resourceGroup()
}

module appConfigurationDeployment 'appConfiguration.bicep' = {
  name: 'appConfigurationDeployment-${resourceDeploymentDate}'
  scope: resourceGroup()
  params: {
    appConfigurationName: appConfigurationName
    appConfigurationBEIdentity: managedIdentityBackendId
    appConfigurationFEIdentity: managedIdentityFrontendId
    appConfigurationInfraIdentity: managedIdentityInfraId
  }
}
