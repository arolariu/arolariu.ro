targetScope = 'resourceGroup'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

@description('The ID of the production app service plan.')
param productionAppPlanId string

@description('The ID of the development app service plan.')
param developmentAppPlanId string

param managedIdentityBackendId string
param managedIdentityFrontendId string

module apiWebsiteDeployment 'api-arolariu-ro.bicep' = {
  scope: resourceGroup()
  name: 'apiWebsiteDeployment-${resourceDeploymentDate}'
  params: {
    apiWebsiteIdentityId: managedIdentityBackendId
    apiWebsitePlanId: productionAppPlanId
  }
}

module mainWebsiteDeployment 'arolariu-ro.bicep' = {
  scope: resourceGroup()
  name: 'mainWebsiteDeployment-${resourceDeploymentDate}'
  params: {
    productionAppPlanId: productionAppPlanId
    mainWebsiteIdentityId: managedIdentityFrontendId
  }
}

module devWebsiteDeployment 'dev-arolariu-ro.bicep' = {
  scope: resourceGroup()
  name: 'devWebsiteDeployment-${resourceDeploymentDate}'
  params: {
    developmentAppPlanId: developmentAppPlanId
    devWebsiteIdentityId: managedIdentityFrontendId
  }
}

module docsWebsiteDeployment 'docs-arolariu-ro.bicep' = {
  scope: resourceGroup()
  name: 'docsWebsiteDeployment-${resourceDeploymentDate}'
}
