targetScope = 'resourceGroup'

metadata description = 'This template will deploy an Azure App Configuration resource running on the free SKU.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The name of the App Configuration resource.')
param appConfigurationName string

@description('The location for the App Configuration resource.')
param appConfigurationLocation string

resource appConfiguration 'Microsoft.AppConfiguration/configurationStores@2024-06-15-preview' = {
  name: appConfigurationName
  location: appConfigurationLocation
  sku: { name: 'free' }
  properties: {
    createMode: 'Default'
    disableLocalAuth: true // We will explicilty connect via managed identities.
    enablePurgeProtection: false // the free SKU does not support purge protection
    softDeleteRetentionInDays: 0 // the free SKU does not support soft delete
    publicNetworkAccess: 'Enabled' // Allow public access to the App Configuration
    dataPlaneProxy: {
      authenticationMode: 'Pass-through'
      privateLinkDelegation: 'Disabled'
    }
  }
  tags: {
    environment: 'PRODUCTION'
    deployment: 'Bicep'
  }
}

output appConfigurationResourceId string = appConfiguration.id
