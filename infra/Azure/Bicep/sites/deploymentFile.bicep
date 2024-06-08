targetScope = 'resourceGroup'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

@description('The ID of the production app service plan.')
param productionAppPlanId string

@description('The ID of the development app service plan.')
param developmentAppPlanId string

param managedIdentityBackendId string
param managedIdentityFrontendId string
param managedIdentityInfraId string

module apiWebsiteDeployment 'api-arolariu-ro.bicep' = {
  name: 'apiWebsiteDeployment-${resourceDeploymentDate}'
  params: {
    apiWebsiteIdentityId: managedIdentityBackendId
    apiWebsitePlanId: productionAppPlanId
  }
  scope: resourceGroup()
}

module mainWebsiteDeployment 'arolariu-ro.bicep' = {
  name: 'mainWebsiteDeployment-${resourceDeploymentDate}'
  scope: resourceGroup()
  params: {
    productionAppPlanId: productionAppPlanId
    mainWebsiteIdentityId: managedIdentityFrontendId
  }
}

module devWebsiteDeployment 'dev-arolariu-ro.bicep' = {
  name: 'devWebsiteDeployment-${resourceDeploymentDate}'
  scope: resourceGroup()
  params: {
    developmentAppPlanId: developmentAppPlanId
  }
}

module docsWebsiteDeployment 'docs-arolariu-ro.bicep' = {
  name: 'docsWebsiteDeployment-${resourceDeploymentDate}'
  scope: resourceGroup()
}
