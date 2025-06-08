targetScope = 'resourceGroup'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

@description('The location for the resources.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param resourceLocation string

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
    apiWebsiteLocation: resourceLocation
    apiWebsiteIdentityId: managedIdentityBackendId
    apiWebsitePlanId: productionAppPlanId
  }
}

module mainWebsiteDeployment 'arolariu-ro.bicep' = {
  scope: resourceGroup()
  name: 'mainWebsiteDeployment-${resourceDeploymentDate}'
  params: {
    mainWebsiteLocation: resourceLocation
    productionAppPlanId: productionAppPlanId
    mainWebsiteIdentityId: managedIdentityFrontendId
    resourceDeploymentDate: resourceDeploymentDate
  }
}

module devWebsiteDeployment 'dev-arolariu-ro.bicep' = {
  scope: resourceGroup()
  name: 'devWebsiteDeployment-${resourceDeploymentDate}'
  params: {
    devWebsiteLocation: resourceLocation
    developmentAppPlanId: developmentAppPlanId
    devWebsiteIdentityId: managedIdentityFrontendId
  }
}

module docsWebsiteDeployment 'docs-arolariu-ro.bicep' = {
  scope: resourceGroup()
  name: 'docsWebsiteDeployment-${resourceDeploymentDate}'
  params: {
    staticWebAppLocation: resourceLocation
  }
}
