// =====================================================================================
// Azure App Configuration - Centralized Application Settings
// =====================================================================================
// This module provisions an Azure App Configuration store for centralized
// management of non-sensitive application settings and feature flags.
// App Configuration provides:
// - Dynamic configuration without redeployment
// - Feature flag management for controlled rollouts
// - Configuration versioning and labeling
// - Integration with Key Vault for secret references
//
// Configuration Categories (from appConfiguration.json):
// - Application settings (URLs, timeouts, limits)
// - Feature flags (enable/disable features dynamically)
// - Environment-specific values (labeled by environment)
//
// Pricing Tier: Free
// - 10 MB storage, 1,000 requests/day
// - No soft delete or purge protection (Free tier limitation)
// - Suitable for development; consider Standard for production
//
// Authentication:
// - Local authentication DISABLED (disableLocalAuth: true)
// - All access must use Azure AD/managed identity
// - This is a security best practice to prevent credential leakage
//
// Label Convention:
// - Keys use format: {key}${label}
// - Labels enable environment-specific overrides (dev, prod)
//
// See: rbac/backend-uami-rbac.bicep (App Configuration Data Reader)
// See: rbac/frontend-uami-rbac.bicep (App Configuration Data Reader)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Azure App Configuration with managed identity authentication only'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

@description('The name of the App Configuration resource.')
param appConfigurationName string

@description('The location for the App Configuration resource.')
param appConfigurationLocation string

@description('The date when the deployment is executed.')
param appConfigurationDeploymentDate string

// Common tags for all resources
import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: appConfigurationDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'configuration-keyvault'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

resource appConfiguration 'Microsoft.AppConfiguration/configurationStores@2025-02-01-preview' = {
  name: appConfigurationName
  location: appConfigurationLocation
  sku: { name: 'free' }
  properties: {
    disableLocalAuth: true // We will explicilty connect via managed identities.
    softDeleteRetentionInDays: 0 // the free SKU does not support soft delete
    enablePurgeProtection: false // the free SKU does not support purge protection
    publicNetworkAccess: 'Enabled' // Allow public access to the App Configuration
    dataPlaneProxy: { authenticationMode: 'Pass-through' }
  }

  tags: union(commonTags, {
    displayName: 'App Configuration'
    resourceType: 'Configuration Store'
  })
}

var configs = loadJsonContent('appConfiguration.json')
resource appConfigurationKeyValues 'Microsoft.AppConfiguration/configurationStores/keyValues@2025-02-01-preview' = [
  for config in configs.items: {
    parent: appConfiguration
    name: '${config.key}$${config.label}'
    properties: { value: config.value }
  }
]

output appConfigurationResourceId string = appConfiguration.id
