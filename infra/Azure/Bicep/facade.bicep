targetScope = 'resourceGroup'

metadata description = 'This file acts a facade that will be called by the main bicep file. This file contains all module deployments (compute, storage, identity, etc.). This file is responsible for deploying all the modules.'

metadata author = 'Alexandru-Razvan Olariu'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

@description('The location for the resources.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param resourceLocation string

var resourceConventionPrefix = substring(uniqueString(resourceDeploymentDate), 0, 6)

module identitiesDeployment 'identity/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'identitiesDeployment-${resourceDeploymentDate}'
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
  }
}

module networkDeployment 'network/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'networkDeployment-${resourceDeploymentDate}'
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
    mainWebsiteHostname: websiteDeployment.outputs.mainWebsiteUrl
    apiWebsiteHostname: websiteDeployment.outputs.apiWebsiteUrl
    devWebsiteHostname: websiteDeployment.outputs.devWebsiteUrl
    docsWebsiteHostname: websiteDeployment.outputs.docsWebsiteUrl
  }
}

module configurationDeployment 'configuration/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'configurationDeployment-${resourceDeploymentDate}'
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
    identities: identitiesDeployment.outputs.managedIdentitiesList
  }
}

module observabilityDeployment 'observability/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'observabilityDeployment-${resourceDeploymentDate}'
  dependsOn: [identitiesDeployment, configurationDeployment]
  params: { resourceConventionPrefix: resourceConventionPrefix }
}

module storageDeployment 'storage/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'storageDeployment-${resourceDeploymentDate}'
  dependsOn: [identitiesDeployment] // Storage needs identities for RBAC
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
  }
}

module computeDeployment 'compute/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'computeDeployment-${resourceDeploymentDate}'
  dependsOn: [identitiesDeployment] // Compute needs identities for RBAC
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
  }
}

module websiteDeployment 'sites/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'websiteDeployment-${resourceDeploymentDate}'
  dependsOn: [
    identitiesDeployment // Websites need managed identities
    computeDeployment // Websites need app service plans
    storageDeployment // Websites need storage
    configurationDeployment // Websites need configuration
    observabilityDeployment // Websites need monitoring
  ]
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    productionAppPlanId: computeDeployment.outputs.productionAppPlanId
    developmentAppPlanId: computeDeployment.outputs.developmentAppPlanId
    managedIdentityFrontendId: identitiesDeployment.outputs.managedIdentitiesList[0].id
    managedIdentityBackendId: identitiesDeployment.outputs.managedIdentitiesList[1].id
  }
}
