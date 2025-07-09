targetScope = 'resourceGroup'

metadata description = 'This template will deploy an Azure App Configuration resource running on the free SKU.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The name of the App Configuration resource.')
param appConfigurationName string

@description('The location for the App Configuration resource.')
param appConfigurationLocation string

@description('The date when the deployment is executed.')
param appConfigurationDeploymentDate string

// Common tags for all resources
import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: appConfigurationDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'configuration-keyvault'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

resource appConfiguration 'Microsoft.AppConfiguration/configurationStores@2024-06-15-preview' = {
  name: appConfigurationName
  location: appConfigurationLocation
  sku: { name: 'free' }
  properties: {
    encryption: {}
    disableLocalAuth: true // We will explicilty connect via managed identities.
    softDeleteRetentionInDays: 0 // the free SKU does not support soft delete
    enablePurgeProtection: false // the free SKU does not support purge protection
    publicNetworkAccess: 'Enabled' // Allow public access to the App Configuration
    dataPlaneProxy: {
      authenticationMode: 'Pass-through'
      privateLinkDelegation: 'Disabled'
    }
  }

  tags: union(commonTags, {
    displayName: 'App Configuration'
    resourceType: 'Configuration Store'
  })
}

var configs = loadJsonContent('appConfiguration.json')
resource appConfigurationKeyValues 'Microsoft.AppConfiguration/configurationStores/keyValues@2024-06-15-preview' = [
  for config in configs.items: {
    parent: appConfiguration
    name: config.key
    properties: {
      value: config.value
      tags: {
        label: config.label
      }
    }
  }
]

output appConfigurationResourceId string = appConfiguration.id
