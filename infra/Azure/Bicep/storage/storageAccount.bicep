targetScope = 'resourceGroup'

metadata description = 'This template will create a new storage account.'
metadata author = 'Alexandru-Razvan Olariu'

@description('The location for the storage account resource.')
param location string = resourceGroup().location

@description('The prefix for the storage account name. The final name will be the prefix followed by "storageacc".')
param storageAccountNamePrefix string

@description('The name of the storage account.')
var storageAccuntName = '${storageAccountNamePrefix}storageacc'

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccuntName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    dnsEndpointType: 'Standard'
    defaultToOAuthAuthentication: false
    publicNetworkAccess: 'Enabled'
    allowCrossTenantReplication: false
    azureFilesIdentityBasedAuthentication: {
      directoryServiceOptions: 'AADKERB'
      defaultSharePermission: 'StorageFileDataSmbShareReader'
    }
    minimumTlsVersion: 'TLS1_1'
    allowBlobPublicAccess: true
    allowSharedKeyAccess: true
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
      ipRules: []
      virtualNetworkRules: []
    }
    supportsHttpsTrafficOnly: true
    encryption: {
      keySource: 'Microsoft.Storage'
      requireInfrastructureEncryption: true
      services: {
        blob: {
          enabled: true
          keyType: 'Account'
        }
        file: {
          enabled: true
          keyType: 'Account'
        }
      }
    }
    accessTier: 'Hot'
  }
  tags: {
    environment: 'production'
    deployment: 'bicep'
  }
  resource storageAccountBlobSettings 'blobServices@2023-05-01' = {
    name: 'default'
    properties: {
      changeFeed: { enabled: false }
      restorePolicy: { enabled: false }
      containerDeleteRetentionPolicy: { enabled: false }
      cors: {
        corsRules: [
          {
            allowedOrigins: ['arolariu.ro', 'dev.arolariu.ro']
            allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'MERGE', 'PATCH']
            allowedHeaders: ['*']
            exposedHeaders: ['*']
            maxAgeInSeconds: 3600
          }
          {
            allowedOrigins: ['http://localhost:3000']
            allowedMethods: ['GET', 'POST']
            allowedHeaders: ['*']
            exposedHeaders: ['*']
            maxAgeInSeconds: 3600
          }
        ]
      }
      deleteRetentionPolicy: {
        enabled: true
        days: 7
        allowPermanentDelete: true
      }
      isVersioningEnabled: true
      lastAccessTimeTrackingPolicy: { enable: false }
    }
  }

  resource storageAccountFileSettings 'fileServices@2023-05-01' = {
    name: 'default'
    properties: {
      shareDeleteRetentionPolicy: {
        enabled: true
        days: 7
        allowPermanentDelete: true
      }
    }
  }

  resource storageAccountQueueSettings 'queueServices@2023-05-01' = {
    name: 'default'
    properties: {}
  }

  resource storageAccountTableSettings 'tableServices@2023-05-01' = {
    name: 'default'
    properties: {}
  }
}

output storageAccountName string = storageAccount.name
