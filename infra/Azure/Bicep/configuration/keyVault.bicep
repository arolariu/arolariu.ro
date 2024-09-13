targetScope = 'resourceGroup'

metadata description = 'This template will create the necessary Azure Key Vault resources for arolariu.ro'
metadata author = 'Alexandru-Razvan Olariu'

import { identity } from '../types/identity.type.bicep'
param identities identity[]

@description('The name of the Azure Key Vault resource.')
param keyVaultName string

@description('The location for the Azure Key Vault resource.')
param keyVaultLocation string = resourceGroup().location

var accessPolicies = [
  for identity in identities: {
    objectId: identity.id
    tenantId: subscription().tenantId
    permissions: {
      certificates: [
        'GET'
        'LIST'
        'UPDATE'
        'CREATE'
        'IMPORT'
        'DELETE'
        'RECOVER'
        'BACKUP'
        'RESTORE'
        'MANAGECONTACTS'
        'MANAGEISSUERS'
        'GETISSUERS'
        'LISTISSUERS'
        'SETISSUERS'
        'DELETEISSUERS'
      ]
      keys: [
        'GET'
        'LIST'
        'UPDATE'
        'CREATE'
        'IMPORT'
        'DELETE'
        'RECOVER'
        'BACKUP'
        'RESTORE'
        'ROTATE'
      ]
      secrets: [
        'GET'
        'LIST'
        'SET'
        'DELETE'
        'RECOVER'
        'BACKUP'
        'RESTORE'
      ]
    }
  }
]

resource keyVault 'Microsoft.KeyVault/vaults@2024-04-01-preview' = {
  name: keyVaultName
  location: keyVaultLocation
  properties: {
    accessPolicies: accessPolicies
    createMode: 'default'
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true
    enablePurgeProtection: true
    enableRbacAuthorization: false
    enableSoftDelete: true
    networkAcls: {}
    provisioningState: 'Succeeded'
    publicNetworkAccess: 'enabled'
    sku: { family: 'A', name: 'standard' }
    softDeleteRetentionInDays: 90
    tenantId: subscription().tenantId
    vaultUri: 'https://${keyVaultName}${environment().suffixes.keyvaultDns}'
  }
  tags: {
    environment: 'PRODUCTION'
    deployment: 'Bicep'
  }
}

var keyVaultSecretNames = [
  'ConfigurationStore' // The configuration store connection string
  'jwt-secret' // The JWT secret for the authentication service

  'DEV-AzureOptions-StorageAccountConnectionString'
  'PROD-AzureOptions-StorageAccountConnectionString'

  'DEV-AzureOptions-SqlConnectionString'
  'PROD-AzureOptions-SqlConnectionString'

  'DEV-AzureOptions-NoSqlConnectionString'
  'PROD-AzureOptions-NoSqlConnectionString'

  'DEV-AzureOptions-CognitiveServicesKey'
  'PROD-AzureOptions-CognitiveServicesKey'

  'DEV-AzureOptions-OpenAIKey'
  'PROD-AzureOptions-OpenAIKey'
]

resource keyVaultItems 'Microsoft.KeyVault/vaults/secrets@2024-04-01-preview' = [
  for secretName in keyVaultSecretNames: {
    parent: keyVault
    name: secretName
    properties: { attributes: { enabled: true } }
  }
]

output mainKeyVaultUri string = keyVault.properties.vaultUri
output mainKeyVaultResourceId string = keyVault.id
output mainKeyVaultName string = keyVault.name
