targetScope = 'resourceGroup'

metadata description = 'This template will deploy the Azure Container Registry resource.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The name of the Azure Container Registry.')
param containerRegistryName string

@description('The location for the Azure Container Registry resource.')
param containerRegistryLocation string = resourceGroup().location

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: containerRegistryName
  location: containerRegistryLocation
  sku: { name: 'Basic' }
  properties: {
    adminUserEnabled: true
    policies: {
      quarantinePolicy: { status: 'Disabled' }
      trustPolicy: { status: 'Disabled' }
      retentionPolicy: { status: 'Disabled' }
      exportPolicy: { status: 'Enabled' }
      azureADAuthenticationAsArmPolicy: { status: 'Enabled' }
      softDeletePolicy: { status: 'Disabled' }
    }
    encryption: { status: 'Disabled' }
    dataEndpointEnabled: false
    publicNetworkAccess: 'Enabled'
    networkRuleBypassOptions: 'AzureServices'
    zoneRedundancy: 'Disabled'
    anonymousPullEnabled: false
    metadataSearch: 'Disabled'
  }
}
