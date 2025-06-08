targetScope = 'resourceGroup'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

@description('The prefix to use for the names of the resources.')
@minLength(1)
@maxLength(20)
param resourceConventionPrefix string

@description('The location for the app service plans.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param location string = 'swedencentral'

module appServicePlansDeployment 'appServicePlans.bicep' = {
  scope: resourceGroup()
  name: 'appServicePlansDeployment-${resourceDeploymentDate}'
  params: {
    appServicePlanPrefix: resourceConventionPrefix
    appServicePlanLocation: location
  }
}

output productionAppPlanId string = appServicePlansDeployment.outputs.productionAppPlanId
output developmentAppPlanId string = appServicePlansDeployment.outputs.developmentAppPlanId
