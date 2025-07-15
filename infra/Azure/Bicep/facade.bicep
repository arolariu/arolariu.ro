targetScope = 'resourceGroup'

metadata description = 'This file acts a facade that will be called by the main bicep file. This file contains all module deployments (compute, storage, identity, etc.). This file is responsible for deploying all the modules.'

metadata author = 'Alexandru-Razvan Olariu'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

@description('The location for the resources.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param resourceLocation string

var resourceConventionPrefix = 'q${substring(uniqueString(resourceDeploymentDate), 0, 5)}'

module identitiesDeployment 'identity/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'identitiesDeployment-${resourceDeploymentDate}'
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
  }
}

module rbacDeployment 'rbac/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'rbacDeployment-${resourceDeploymentDate}'
  params: { managedIdentities: identitiesDeployment.outputs.managedIdentitiesList }
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
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
  }
}

module storageDeployment 'storage/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'storageDeployment-${resourceDeploymentDate}'
  dependsOn: [identitiesDeployment, rbacDeployment]
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
  }
}

module computeDeployment 'compute/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'computeDeployment-${resourceDeploymentDate}'
  dependsOn: [identitiesDeployment]
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
    storageDeployment // Websites need storage
    configurationDeployment // Websites need configuration
  ]
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    appInsightsConnectionString: observabilityDeployment.outputs.appInsightsConnectionString
    appInsightsInstrumentationKey: observabilityDeployment.outputs.appInsightsInstrumentationKey
    productionAppPlanId: computeDeployment.outputs.productionAppPlanId
    developmentAppPlanId: computeDeployment.outputs.developmentAppPlanId
    managedIdentityFrontendId: identitiesDeployment.outputs.managedIdentitiesList[0].resourceId
    managedIdentityBackendId: identitiesDeployment.outputs.managedIdentitiesList[1].resourceId
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
  }
}

module aiDeployment 'ai/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'aiDeployment-${resourceDeploymentDate}'
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
    backendManagedIdentityPrincipalId: identitiesDeployment.outputs.managedIdentitiesList[1].principalId
  }
}

module bindingsDeployment 'bindings/deploymentFile.bicep' = {
  scope: resourceGroup()
  name: 'bindingsDeployment-${resourceDeploymentDate}'
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
    dnsZoneName: networkDeployment.outputs.dnsZoneName
    devWebsiteAppServicePlanId: computeDeployment.outputs.developmentAppPlanId
    prodWebsiteAppServicePlanId: computeDeployment.outputs.productionAppPlanId
    apiWebsiteHostname: websiteDeployment.outputs.apiWebsiteName
    devWebsiteHostname: websiteDeployment.outputs.devWebsiteName
    docsWebsiteHostname: websiteDeployment.outputs.docsWebsiteName
    prodWebsiteHostname: websiteDeployment.outputs.mainWebsiteName
  }
}
