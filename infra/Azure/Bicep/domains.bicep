targetScope = 'resourceGroup'

metadata description = 'Completes custom domains using existing platform resources without redeploying the foundation.'

@description('The stable resource namespace created by the facade.')
param resourceConventionPrefix string

@description('The location of the existing regional web applications.')
@allowed(['francecentral', 'northeurope', 'westeurope', 'swedencentral'])
param resourceLocation string

@description('The audit timestamp used for deployment names and tags.')
param resourceDeploymentDate string

resource mainWebsite 'Microsoft.Web/sites@2025-03-01' existing = {
  name: 'www-arolariu-ro'
}

resource apiWebsite 'Microsoft.Web/sites@2025-03-01' existing = {
  name: 'api-arolariu-ro'
}

resource devWebsite 'Microsoft.Web/sites@2025-03-01' existing = {
  name: 'dev-arolariu-ro'
}

resource cvWebsite 'Microsoft.Web/staticSites@2025-03-01' existing = {
  name: 'cv-arolariu-ro'
}

resource docsWebsite 'Microsoft.Web/staticSites@2025-03-01' existing = {
  name: 'docs-arolariu-ro'
}

resource dnsZone 'Microsoft.Network/dnsZones@2018-05-01' existing = {
  name: 'arolariu.ro'
}

resource frontDoor 'Microsoft.Cdn/profiles@2025-09-01-preview' existing = {
  name: '${resourceConventionPrefix}-afd'
}

resource frontDoorEndpoint 'Microsoft.Cdn/profiles/afdEndpoints@2025-09-01-preview' existing = {
  parent: frontDoor
  name: 'production'
}

module bindingsDeployment 'bindings/deploymentFile.bicep' = {
  name: 'bindingsDeployment-${resourceDeploymentDate}'
  params: {
    resourceLocation: resourceLocation
    resourceDeploymentDate: resourceDeploymentDate
    resourceConventionPrefix: resourceConventionPrefix
    dnsZoneName: dnsZone.name
    devWebsiteAppServicePlanId: devWebsite.properties.serverFarmId
    prodWebsiteAppServicePlanId: apiWebsite.properties.serverFarmId
    cvWebsiteHostname: cvWebsite.name
    apiWebsiteHostname: apiWebsite.name
    devWebsiteHostname: devWebsite.name
    docsWebsiteHostname: docsWebsite.name
    prodWebsiteHostname: mainWebsite.name
  }
}

output deploymentInfo object = {
  stage: 'domains'
  resourceGroupName: resourceGroup().name
  resourcePrefix: resourceConventionPrefix
  frontDoorEndpoint: frontDoorEndpoint.properties.hostName
  dnsZoneName: dnsZone.name
}
