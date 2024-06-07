targetScope = 'resourceGroup'

metadata description = 'This template will create the necessary Azure Key Vault resources for arolariu.ro'
metadata author = 'Alexandru-Razvan Olariu'

@description('The prefix for the Azure Key Vault resource name.')
param keyVaultNamePrefix string

@description('The location for the Azure Key Vault resource.')
param keyVaultLocation string = resourceGroup().location

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${keyVaultNamePrefix}-kv'
  location: keyVaultLocation
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enabledForDeployment: false // we don't use Azure VMs that need to access the Key Vault at deployment time
    enabledForDiskEncryption: false // we don't use Azure Disk Encryption nor Azure VMs
    enabledForTemplateDeployment: false // we don't use Azure RM templates that need to access the Key Vault
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    createMode: 'default'
    publicNetworkAccess: 'enabled' // we don't use Azure Private Link nor Azure Private Endpoints
    provisioningState: 'Succeeded'
    vaultUri: 'https://${keyVaultNamePrefix}-kv${environment().suffixes.keyvaultDns}'
    accessPolicies: []
  }
  tags: {
    environment: 'production'
    deployment: 'bicep'
  }
}

output mainKeyVaultName string = keyVault.name
