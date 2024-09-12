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
    accessPolicies: []
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

output mainKeyVaultUri string = keyVault.properties.vaultUri
output mainKeyVaultResourceId string = keyVault.id
output mainKeyVaultName string = keyVault.name
