targetScope = 'resourceGroup'

metadata description = 'This template deploys Azure Container Registry with enterprise-grade security and governance features.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The name of the Azure Container Registry.')
@minLength(5)
@maxLength(50)
param containerRegistryName string

@description('The location for the Azure Container Registry resource.')
param containerRegistryLocation string = resourceGroup().location

@description('Resource tags for governance and cost tracking.')
param tags object = {}

// Enhanced tags combining common tags with resource-specific tags
var enhancedTags = union(tags, {
  resourceType: 'Container Registry'
})

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
  tags: enhancedTags
}

// Outputs
output containerRegistryName string = containerRegistry.name
output containerRegistryId string = containerRegistry.id
output containerRegistryLoginServer string = containerRegistry.properties.loginServer
output containerRegistryResourceId string = containerRegistry.id
