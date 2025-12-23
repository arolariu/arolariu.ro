targetScope = 'resourceGroup'

// =====================================================================================
// Configuration Module Deployment Orchestrator
// =====================================================================================
// This module orchestrates the deployment of configuration management resources
// for the arolariu.ro infrastructure, providing centralized secrets and settings.
//
// Deployed Resources:
// - Azure Key Vault (Secrets, certificates, encryption keys)
// - Azure App Configuration (Feature flags, app settings, connection strings)
//
// Architecture Pattern:
// - Key Vault stores sensitive secrets (API keys, connection strings)
// - App Configuration stores non-sensitive settings (feature flags, URLs)
// - Applications reference Key Vault secrets via App Configuration references
//
// Security:
// - Key Vault uses RBAC for access control (no access policies)
// - Soft delete and purge protection enabled
// - Managed identity authentication required
//
// See: rbac/backend-uami-rbac.bicep for configuration access permissions
// =====================================================================================

metadata description = 'Configuration module orchestrator that provisions Key Vault and App Configuration for centralized secrets and settings.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

@description('The naming prefix for resources. Used to generate consistent resource names.')
param resourceConventionPrefix string

@description('The location for the App Configuration resource.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param resourceLocation string

@description('The date when the deployment is executed.')
param resourceDeploymentDate string

var keyVaultName = '${replace(resourceConventionPrefix, '-', '')}kv'
var appConfigurationName = '${replace(resourceConventionPrefix, '-', '')}appconfig'

module keyVaultDeployment 'keyVault.bicep' = {
  scope: resourceGroup()
  name: 'keyVaultDeployment-${resourceDeploymentDate}'
  params: {
    keyVaultName: keyVaultName
    keyVaultLocation: resourceLocation
    keyVaultDeploymentDate: resourceDeploymentDate
  }
}

module appConfigurationDeployment 'appConfiguration.bicep' = {
  scope: resourceGroup()
  name: 'appConfigurationDeployment-${resourceDeploymentDate}'
  params: {
    appConfigurationName: appConfigurationName
    appConfigurationLocation: resourceLocation
    appConfigurationDeploymentDate: resourceDeploymentDate
  }
}
