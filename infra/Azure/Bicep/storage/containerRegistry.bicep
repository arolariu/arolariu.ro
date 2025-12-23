// =====================================================================================
// Azure Container Registry (ACR) - Container Image Repository
// =====================================================================================
// This module provisions an Azure Container Registry for storing and managing
// Docker container images. ACR serves as the central image repository for:
// - Frontend container images (Next.js application)
// - Backend container images (.NET API application)
// - Base images and build cache layers
//
// SKU Selection: Basic
// - Suitable for development and low-traffic scenarios
// - 10 GB storage included
// - Consider Premium tier for production with:
//   - Geo-replication
//   - Content trust
//   - Private endpoints
//
// Authentication:
// - Azure AD authentication enabled (azureADAuthenticationAsArmPolicy)
// - Admin user enabled for legacy tooling compatibility
// - RBAC-based access via managed identities (see rbac/*.bicep)
//
// Security Configuration:
// - Anonymous pull disabled (anonymousPullEnabled: false)
// - Azure Services bypass enabled for trusted service access
// - Public network access enabled (consider private endpoints for production)
//
// CI/CD Integration:
// - GitHub Actions pushes images via Infrastructure UAMI
// - App Services pull images via Frontend/Backend UAMIs
//
// See: rbac/infrastructure-uami-rbac.bicep (push access)
// See: rbac/backend-uami-rbac.bicep (pull access)
// See: rbac/frontend-uami-rbac.bicep (pull access)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Azure Container Registry with Azure AD authentication and RBAC'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

@description('The name of the Azure Container Registry.')
@minLength(5)
@maxLength(50)
param containerRegistryName string

@description('The location for the Azure Container Registry resource.')
param containerRegistryLocation string

@description('The date when the deployment is executed.')
param containerRegistryDeploymentDate string

// Common tags for all resources
import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: containerRegistryDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'storage'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2025-11-01' = {
  name: containerRegistryName
  location: containerRegistryLocation
  sku: { name: 'Basic' }
  properties: {
    adminUserEnabled: true
    policies: {
      quarantinePolicy: { status: 'Disabled' }
      trustPolicy: { status: 'Disabled' }
      retentionPolicy: { status: 'Disabled' }
      exportPolicy: { status: 'Enabled' }
      azureADAuthenticationAsArmPolicy: { status: 'Enabled' }
    }
    encryption: { status: 'Disabled' }
    dataEndpointEnabled: false
    publicNetworkAccess: 'Enabled'
    networkRuleBypassOptions: 'AzureServices'
    networkRuleBypassAllowedForTasks: false
    zoneRedundancy: 'Disabled'
    anonymousPullEnabled: false
  }
  tags: union(commonTags, {
    displayName: 'Container Registry'
  })
}

// Outputs
output containerRegistryName string = containerRegistry.name
output containerRegistryId string = containerRegistry.id
output containerRegistryLoginServer string = containerRegistry.properties.loginServer
output containerRegistryResourceId string = containerRegistry.id
