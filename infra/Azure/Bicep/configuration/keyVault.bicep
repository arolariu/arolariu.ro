targetScope = 'resourceGroup'

metadata description = 'This template will create the necessary Azure Key Vault resources for arolariu.ro'
metadata author = 'Alexandru-Razvan Olariu'

@description('The name of the Azure Key Vault resource.')
param keyVaultName string

@description('The location for the Azure Key Vault resource.')
param keyVaultLocation string

@description('The date when the deployment is executed.')
param keyVaultDeploymentDate string

// Common tags for all resources
import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: keyVaultDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'configuration-keyvault'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

resource keyVault 'Microsoft.KeyVault/vaults@2024-04-01-preview' = {
  name: keyVaultName
  location: keyVaultLocation
  properties: {
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true
    enablePurgeProtection: true
    enableRbacAuthorization: true
    enableSoftDelete: true
    networkAcls: {}
    publicNetworkAccess: 'enabled'
    sku: { family: 'A', name: 'standard' }
    softDeleteRetentionInDays: 90
    tenantId: subscription().tenantId
    vaultUri: 'https://${keyVaultName}${environment().suffixes.keyvaultDns}'
  }
  tags: union(commonTags, {
    displayName: 'Key Vault'
    resourceType: 'Key Vault'
  })
}

var secrets = loadJsonContent('keyVault.json')
resource keyVaultSecrets 'Microsoft.KeyVault/vaults/secrets@2024-04-01-preview' = [
  for secret in secrets.items: {
    parent: keyVault
    name: secret.name
    properties: {
      value: secret.value
      attributes: { enabled: true }
    }
  }
]

output mainKeyVaultUri string = keyVault.properties.vaultUri
output mainKeyVaultResourceId string = keyVault.id
output mainKeyVaultName string = keyVault.name
