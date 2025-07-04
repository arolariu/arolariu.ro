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
    apiWebsitePlanId: productionAppPlanId
    apiWebsiteIdentityId: managedIdentityBackendId
    apiWebsiteDeploymentDate: resourceDeploymentDate
  }
}

module mainWebsiteDeployment 'arolariu-ro.bicep' = {
  scope: resourceGroup()
  name: 'mainWebsiteDeployment-${resourceDeploymentDate}'
  params: {
    productionWebsiteLocation: resourceLocation
    productionWebsiteAppPlanId: productionAppPlanId
    productionWebsiteIdentityId: managedIdentityFrontendId
    productionWebsiteDeploymentDate: resourceDeploymentDate
  }
}

module devWebsiteDeployment 'dev-arolariu-ro.bicep' = {
  scope: resourceGroup()
  name: 'devWebsiteDeployment-${resourceDeploymentDate}'
  params: {
    developmentWebsiteLocation: resourceLocation
    developmentWebsiteAppPlanId: developmentAppPlanId
    developmentWebsiteIdentityId: managedIdentityFrontendId
    developmentWebsiteDeploymentDate: resourceDeploymentDate
  }
}

module docsWebsiteDeployment 'docs-arolariu-ro.bicep' = {
  scope: resourceGroup()
  name: 'docsWebsiteDeployment-${resourceDeploymentDate}'
  params: {
    staticWebAppLocation: resourceLocation
    staticWebAppDeploymentDate: resourceDeploymentDate
  }
}

// Output all website URLs for DNS configuration
output mainWebsiteUrl string = mainWebsiteDeployment.outputs.mainWebsiteUrl
output apiWebsiteUrl string = apiWebsiteDeployment.outputs.apiWebsiteUrl
output devWebsiteUrl string = devWebsiteDeployment.outputs.devWebsiteUrl
output docsWebsiteUrl string = docsWebsiteDeployment.outputs.docsWebsiteUrl
