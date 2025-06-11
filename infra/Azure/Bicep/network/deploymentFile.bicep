targetScope = 'resourceGroup'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string

@description('The location for the resources.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param resourceLocation string

@description('The prefix to use for the names of the resources.')
param resourceConventionPrefix string

@description('The hostname of the main production website.')
param mainWebsiteHostname string

@description('The hostname of the API website.')
param apiWebsiteHostname string

@description('The hostname of the development website.')
param devWebsiteHostname string

@description('The hostname of the documentation website.')
param docsWebsiteHostname string

var azureFrontDoorName = '${resourceConventionPrefix}-afd'
var dnsZoneName = 'arolariu.ro'

module azureFrontDoorDeployment 'azureFrontDoor.bicep' = {
  scope: resourceGroup()
  name: 'azureFrontDoorDeployment-${resourceDeploymentDate}'
  params: {
    frontDoorName: azureFrontDoorName
    frontDoorDeploymentDate: resourceDeploymentDate
    mainWebsiteHostname: mainWebsiteHostname
  }
}

module dnsZoneDeployment 'dnsZone.bicep' = {
  scope: resourceGroup()
  name: 'dnsZoneDeployment-${resourceDeploymentDate}'
  params: {
    dnsZoneName: dnsZoneName
    frontDoorProductionFqdn: azureFrontDoorDeployment.outputs.frontDoorProductionFqdn
    apiWebsiteHostname: apiWebsiteHostname
    devWebsiteHostname: devWebsiteHostname
    docsWebsiteHostname: docsWebsiteHostname
  }
}

// Output the Front Door details for reference
output frontDoorProductionFqdn string = azureFrontDoorDeployment.outputs.frontDoorProductionFqdn
output frontDoorCdnFqdn string = azureFrontDoorDeployment.outputs.frontDoorCdnFqdn
output frontDoorProfileId string = azureFrontDoorDeployment.outputs.frontDoorProfileId
