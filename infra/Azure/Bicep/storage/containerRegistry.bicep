targetScope = 'resourceGroup'

metadata description = 'This template deploys Azure Container Registry with enterprise-grade security and governance features.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The name of the Azure Container Registry.')
@minLength(5)
@maxLength(50)
param containerRegistryName string

@description('The location for the Azure Container Registry resource.')
param containerRegistryLocation string

@description('The date when the deployment is executed.')
param containerRegistryDeploymentDate string

// Common tags for all resources
import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: containerRegistryDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'storage'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2025-04-01' = {
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
    }
    encryption: { status: 'Disabled' }
    dataEndpointEnabled: false
    publicNetworkAccess: 'Enabled'
    networkRuleBypassOptions: 'AzureServices'
    zoneRedundancy: 'Disabled'
    anonymousPullEnabled: false
  }
  tags: union(commonTags, {
    displayName: 'Container Registry'
  })
}

// Outputs
output containerRegistryName string = containerRegistry.name
output containerRegistryId string = containerRegistry.id
output containerRegistryLoginServer string = containerRegistry.properties.loginServer
output containerRegistryResourceId string = containerRegistry.id
