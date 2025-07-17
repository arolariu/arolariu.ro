targetScope = 'resourceGroup'

metadata description = 'This file acts as a deployment file for binding resources'
metadata author = 'Alexandru-Razvan Olariu'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string

@description('The location for the resources.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param resourceLocation string

@description('The prefix to use for the names of the resources.')
param resourceConventionPrefix string

@description('The name of the Azure DNS Zone resource.')
param dnsZoneName string

@description('The development app service farm plan ID.')
param devWebsiteAppServicePlanId string

@description('The production app service farm plan ID.')
param prodWebsiteAppServicePlanId string

@description('The hostname of the API website.')
param apiWebsiteHostname string

@description('The hostname of the development website.')
param devWebsiteHostname string

@description('The hostname of the documentation website.')
param docsWebsiteHostname string

@description('The hostname of the cv website.')
param cvWebsiteHostname string

@description('The hostname of the production website.')
param prodWebsiteHostname string

module devWebsiteBindings 'dev-arolariu-ro-bindings.bicep' = {
  scope: resourceGroup()
  name: 'devWebsiteBindings-${resourceDeploymentDate}'
  params: {
    dnsZoneName: dnsZoneName
    devWebsiteHostname: devWebsiteHostname
    devWebsiteLocation: resourceLocation
    devWebsiteAppServicePlanId: devWebsiteAppServicePlanId
    devWebsiteDeploymentDate: resourceDeploymentDate
  }
}

module apiWebsiteBindings 'api-arolariu-ro-bindings.bicep' = {
  scope: resourceGroup()
  name: 'apiWebsiteBindings-${resourceDeploymentDate}'
  params: {
    dnsZoneName: dnsZoneName
    apiWebsiteHostname: apiWebsiteHostname
    apiWebsiteLocation: resourceLocation
    apiWebsiteAppServicePlanId: devWebsiteAppServicePlanId
    apiWebsiteDeploymentDate: resourceDeploymentDate
  }
}

module docsWebsiteBindings 'docs-arolariu-ro-bindings.bicep' = {
  scope: resourceGroup()
  name: 'docsWebsiteBindings-${resourceDeploymentDate}'
  params: {
    dnsZoneName: dnsZoneName
    docsWebsiteHostname: docsWebsiteHostname
  }
}

module cvWebsiteBindings 'cv-arolariu-ro-bindings.bicep' = {
  scope: resourceGroup()
  name: 'cvWebsiteBindings-${resourceDeploymentDate}'
  params: {
    dnsZoneName: dnsZoneName
    cvWebsiteHostname: cvWebsiteHostname
  }
}
