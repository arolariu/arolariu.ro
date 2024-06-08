targetScope = 'resourceGroup'

metadata description = 'This template will create the necessary Azure Key Vault resources for arolariu.ro'
metadata author = 'Alexandru-Razvan Olariu'

@description('The name of the Azure Key Vault resource.')
param keyVaultName string

@description('The location for the Azure Key Vault resource.')
param keyVaultLocation string = resourceGroup().location

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: keyVaultLocation
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    createMode: 'default'
    publicNetworkAccess: 'enabled'
    provisioningState: 'Succeeded'
    vaultUri: 'https://${keyVaultName}${environment().suffixes.keyvaultDns}'
    accessPolicies: []
  }
  tags: {
    environment: 'production'
    deployment: 'bicep'
    timestamp: resourceGroup().tags.timestamp
  }
}

output mainKeyVaultUri string = keyVault.properties.vaultUri
output mainKeyVaultResourceId string = keyVault.id
output mainKeyVaultName string = keyVault.name
