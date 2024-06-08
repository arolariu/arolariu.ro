targetScope = 'resourceGroup'

metadata description = 'This template will deploy an Azure App Configuration resource.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The name of the App Configuration resource.')
param appConfigurationName string

@description('The back-end identity to assign to the App Configuration resource.')
param appConfigurationBEIdentity string

@description('The front-end identity to assign to the App Configuration resource.')
param appConfigurationFEIdentity string

@description('The infrastructure identity to assign to the App Configuration resource.')
param appConfigurationInfraIdentity string

@description('The location for the App Configuration resource.')
param appConfigurationLocation string = resourceGroup().location

resource appConfiguration 'Microsoft.AppConfiguration/configurationStores@2023-09-01-preview' = {
  name: appConfigurationName
  location: appConfigurationLocation
  sku: { name: 'free' }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${appConfigurationBEIdentity}': {}
      '${appConfigurationFEIdentity}': {}
      '${appConfigurationInfraIdentity}': {}
    }
  }
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
    timestamp: resourceGroup().tags.timestamp
  }
}

output appConfigurationResourceId string = appConfiguration.id
