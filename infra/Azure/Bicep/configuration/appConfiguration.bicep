targetScope = 'resourceGroup'

metadata description = 'This template will deploy an Azure App Configuration resource.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The prefix to use for the App Configuration name.')
param appConfigurationNamePrefix string

@description('The location for the App Configuration resource.')
param appConfigurationLocation string = resourceGroup().location

@description('The name of the App Configuration resource.')
var appConfigurationName = '${appConfigurationNamePrefix}-config-store'

resource appConfiguration 'Microsoft.AppConfiguration/configurationStores@2023-09-01-preview' = {
  name: appConfigurationName
  location: appConfigurationLocation
  sku: { name: 'free' }
  identity: { type: 'SystemAssigned' }
  properties: {
    createMode: 'Default'
    disableLocalAuth: false
    softDeleteRetentionInDays: 0 // the free SKU does not support soft delete
    enablePurgeProtection: false // the free SKU does not support purge protection
    dataPlaneProxy: {
      authenticationMode: 'Local'
      privateLinkDelegation: 'Disabled'
    }
  }
  tags: {
    environment: 'production'
    deployment: 'bicep'
  }
}
