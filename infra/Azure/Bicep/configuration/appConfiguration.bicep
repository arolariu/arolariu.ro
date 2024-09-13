targetScope = 'resourceGroup'

metadata description = 'This template will deploy an Azure App Configuration resource.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The name of the App Configuration resource.')
param appConfigurationName string

@description('The location for the App Configuration resource.')
param appConfigurationLocation string = resourceGroup().location

resource appConfiguration 'Microsoft.AppConfiguration/configurationStores@2023-09-01-preview' = {
  name: appConfigurationName
  location: appConfigurationLocation
  sku: { name: 'free' }
  properties: {
    createMode: 'Default'
    disableLocalAuth: false
    enablePurgeProtection: false // the free SKU does not support purge protection
    softDeleteRetentionInDays: 0 // the free SKU does not support soft delete
    dataPlaneProxy: {
      authenticationMode: 'Local'
      privateLinkDelegation: 'Disabled'
    }
  }
  tags: {
    environment: 'PRODUCTION'
    deployment: 'Bicep'
  }
}

output appConfigurationResourceId string = appConfiguration.id
