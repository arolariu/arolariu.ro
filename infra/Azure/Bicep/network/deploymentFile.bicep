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
    dnsZoneDeploymentDate: resourceDeploymentDate
    frontDoorName: azureFrontDoorName
    frontDoorProductionFqdn: azureFrontDoorDeployment.outputs.frontDoorProductionFqdn
    frontDoorApexCustomDomainValidationToken: azureFrontDoorDeployment.outputs.frontDoorApexToken
    frontDoorWwwCustomDomainValidationToken: azureFrontDoorDeployment.outputs.frontDoorWwwToken
    frontDoorCdnCustomDomainValidationToken: azureFrontDoorDeployment.outputs.frontDoorCdnToken
  }
}

// Output the Front Door details for reference
output frontDoorProductionFqdn string = azureFrontDoorDeployment.outputs.frontDoorProductionFqdn
output frontDoorCdnFqdn string = azureFrontDoorDeployment.outputs.frontDoorCdnFqdn
output frontDoorProfileId string = azureFrontDoorDeployment.outputs.frontDoorProfileId

// Output the DNS Zone name for reference
output dnsZoneName string = dnsZoneDeployment.outputs.dnsZoneName
