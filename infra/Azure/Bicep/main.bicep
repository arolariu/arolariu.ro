targetScope = 'subscription'

metadata description = 'This bicep file is the main entry point for any zero-touch deployment.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The name of the resource group that will contain all the resources.')
param resourceGroupName string = 'myResourceGroup'

@description('The location of the resource group that will contain all the resources.')
param resourceGroupLocation string = 'EastUS'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

@description('The prefix that will be used for all the resources.')
param resourceConventionPrefix string = 'arolariu'

resource resourceGroup 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: resourceGroupLocation
}

module managedIdentities 'identity/userAssignedIdentity.bicep' = {
  name: 'managedIdentities-${resourceDeploymentDate}'
  scope: resourceGroup
  params: {
    userAssignedManagedIdentityNamePrefix: resourceConventionPrefix
  }
}

module keyVaultDeployment 'configuration/keyVault.bicep' = {
  name: 'keyVaultDeployment-${resourceDeploymentDate}'
  scope: resourceGroup
  params: {
    keyVaultNamePrefix: resourceConventionPrefix
  }
}

module appConfigurationDeployment 'configuration/appConfiguration.bicep' = {
  name: 'appConfigurationDeployment-${resourceDeploymentDate}'
  scope: resourceGroup
  params: {
    appConfigurationNamePrefix: resourceConventionPrefix
  }
}

module storageAccountDeployment 'storage/storageAccount.bicep' = {
  name: 'storageAccountDeployment-${resourceDeploymentDate}'
  scope: resourceGroup
  params: {
    storageAccountNamePrefix: resourceConventionPrefix
  }
}

module sqlServerDeployment 'storage/sqlServer.bicep' = {
  name: 'sqlServerDeployment-${resourceDeploymentDate}'
  scope: resourceGroup
  params: {
    sqlServerNamePrefix: resourceConventionPrefix
    sqlDatabaseNamePrefix: resourceConventionPrefix
  }
}

module appPlanDeployment 'appServicePlans.bicep' = {
  name: 'appServicePlanDeployment-${resourceDeploymentDate}'
  scope: resourceGroup
  params: {
    appServicePlanPrefix: '${resourceConventionPrefix}-appserviceplan'
    appServicePlanLocation: resourceGroup.location
  }
}

module mainWebsiteDeployment 'sites/arolariu-ro.bicep' = {
  name: 'mainWebsiteDeployment-${resourceDeploymentDate}'
  scope: resourceGroup
  params: {
    productionAppPlanId: appPlanDeployment.outputs.productionAppPlanId
    location: resourceGroup.location
  }
}
