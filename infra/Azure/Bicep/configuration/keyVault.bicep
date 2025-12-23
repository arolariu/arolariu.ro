// =====================================================================================
// Azure Key Vault - Centralized Secrets Management
// =====================================================================================
// This module provisions an Azure Key Vault for secure storage of secrets,
// connection strings, API keys, and certificates. Key Vault is the single source
// of truth for all sensitive configuration data in the arolariu.ro platform.
//
// Stored Secrets (from keyVault.json):
// - Database connection strings
// - API keys for third-party services
// - Clerk authentication secrets
// - Application Insights instrumentation keys
//
// Security Configuration:
// - RBAC authorization enabled (no access policies)
// - Soft delete enabled (90-day retention)
// - Purge protection enabled (prevents permanent deletion)
// - Public network access enabled (consider private endpoints for production)
//
// Template Deployment:
// - enabledForTemplateDeployment: true allows ARM/Bicep to read secrets
// - This is required for deployments that reference Key Vault secrets
//
// Access Model:
// - All access is via Azure RBAC roles (see rbac/*.bicep)
// - Backend UAMI: Key Vault Secrets User (read secrets)
// - Frontend UAMI: Key Vault Secrets User (read secrets)
// - Infrastructure UAMI: Key Vault Secrets Officer (read/write)
//
// IMPORTANT: Secrets are loaded from keyVault.json which should contain
// placeholder values. Real secrets should be updated after deployment
// or injected via CI/CD pipeline.
//
// See: rbac/backend-uami-rbac.bicep (secret read access)
// See: rbac/infrastructure-uami-rbac.bicep (secret write access)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Azure Key Vault with RBAC authorization and soft delete protection'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

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
