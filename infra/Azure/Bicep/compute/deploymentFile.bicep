targetScope = 'resourceGroup'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

@description('The prefix to use for the names of the resources.')
param resourceConventionPrefix string

module appServicePlansDeployment 'appServicePlans.bicep' = {
  scope: resourceGroup()
  name: 'appServicePlansDeployment-${resourceDeploymentDate}'
  params: { appServicePlanPrefix: resourceConventionPrefix }
}

output productionAppPlanId string = appServicePlansDeployment.outputs.productionAppPlanId
output developmentAppPlanId string = appServicePlansDeployment.outputs.developmentAppPlanId
