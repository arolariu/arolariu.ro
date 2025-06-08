targetScope = 'resourceGroup'

metadata description = 'This template will create the necessary Azure Key Vault resources for arolariu.ro'
metadata author = 'Alexandru-Razvan Olariu'

import { identity } from '../types/identity.type.bicep'
param identities identity[]

@description('The name of the Azure Key Vault resource.')
param keyVaultName string

@description('The location for the Azure Key Vault resource.')
param keyVaultLocation string = resourceGroup().location

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

// Common tags for all resources
var commonTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: resourceDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'configuration-keyvault'
  costCenter: 'infrastructure'
  owner: 'Alexandru-Razvan Olariu'
  project: 'arolariu.ro'
  version: '2.0.0'
  criticality: 'high'
  dataClassification: 'confidential'
  backup: 'required'
  resourceType: 'Key Vault'
}

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
  tags: commonTags
}

var keyVaultSecretNames = [
  'ConfigurationStore' // The configuration store connection string
  'jwt-secret' // The JWT secret for the authentication service

  'AzureOptions-StorageAccountConnectionString'
  'AzureOptions-SqlConnectionString'
  'AzureOptions-NoSqlConnectionString'
  'AzureOptions-CognitiveServicesKey'
  'AzureOptions-OpenAIKey'

  // SQL Server credentials (production only)
  'sql-admin-username'
  'sql-admin-password'
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
