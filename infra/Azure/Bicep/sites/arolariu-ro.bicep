// =====================================================================================
// Production Website - arolariu.ro Next.js Application
// =====================================================================================
// This module provisions the production App Service that hosts the main arolariu.ro
// website. The site runs as a Linux container with Node.js 24 LTS runtime and is
// configured for enterprise-grade security and performance.
//
// Runtime Configuration:
// - Platform: Linux container (app,linux,container)
// - Runtime: Node.js 24 LTS (linuxFxVersion)
// - Container source: Azure Container Registry (via managed identity)
// - Always On: Enabled (prevents cold starts)
//
// Identity:
// - User-Assigned Managed Identity (Frontend UAMI)
// - Used for: ACR pull, Key Vault secrets, App Configuration
// - No system-assigned identity (using UAMI for consistency)
//
// Security Configuration:
// - HTTPS Only: Enforced (redirects HTTP to HTTPS)
// - FTPS: Disabled (no FTP access)
// - IP Restrictions: Only Azure Front Door allowed as origin
// - CORS: Limited to clerk.arolariu.ro, api.arolariu.ro, cdn.arolariu.ro
//
// Scaling:
// - Initial workers: 1
// - Minimum elastic instances: 1
// - Load balancing: Least Requests algorithm
// - Redundancy: None (Front Door provides global redundancy)
//
// Observability:
// - Application Insights instrumentation enabled
// - HTTP logging enabled
// - Health check path: /
//
// Deployment:
// - SCM Type: GitHub Actions
// - Container image pushed via Infrastructure UAMI
//
// See: compute/appServicePlans.bicep (hosting plan)
// See: identity/userAssignedIdentity.bicep (Frontend UAMI)
// See: network/azureFrontDoor.bicep (traffic routing)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Production arolariu.ro App Service with container deployment'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

param productionWebsiteLocation string
param productionWebsiteAppPlanId string
param productionWebsiteIdentityId string
param productionWebsiteDeploymentDate string
param appInsightsInstrumentationKey string
param appInsightsConnectionString string

// Common tags for all resources
import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: productionWebsiteDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'sites'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

resource mainWebsite 'Microsoft.Web/sites@2025-03-01' = {
  name: 'www-arolariu-ro'
  location: productionWebsiteLocation
  kind: 'app,linux,container'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${productionWebsiteIdentityId}': {}
    }
  }
  properties: {
    clientAffinityEnabled: true // Enable sticky sessions via affinity cookies.
    clientCertEnabled: false // Client certificates are not required.
    reserved: true // Reserved means Linux machine.
    hyperV: false // Hyper-V manager; not used.
    hostNamesDisabled: false
    containerSize: 0
    httpsOnly: true
    redundancyMode: 'None' // No redundancy; we use AFD and elastic horizontal scaling.
    publicNetworkAccess: 'Enabled'
    storageAccountRequired: false
    enabled: true
    serverFarmId: productionWebsiteAppPlanId
    scmSiteAlsoStopped: true
    siteConfig: {
      acrUseManagedIdentityCreds: true // Azure Container Registry managed identity is used.
      autoHealEnabled: false
      numberOfWorkers: 1 // Number of instances (initially).
      linuxFxVersion: 'NODE|24-lts' // Node.js version 24 is used.
      minimumElasticInstanceCount: 1 // Minimum number of instances for horizontal scaling.
      alwaysOn: true // The app is (should be!) always on.
      cors: {
        allowedOrigins: [
          'https://clerk.arolariu.ro'
          'https://api.arolariu.ro'
          'https://cdn.arolariu.ro'
        ]
      }
      localMySqlEnabled: false // Local MySQL is not enabled;
      ftpsState: 'Disabled' // FTPS is disabled.
      healthCheckPath: '/'
      http20Enabled: true // HTTP/2 transfer protocol is enabled.
      httpLoggingEnabled: true // HTTP logging is enabled.
      logsDirectorySizeLimit: 50 // Maximum size of the logs directory (in MB).
      detailedErrorLoggingEnabled: false // Detailed error logging is disabled for security reasons.
      scmType: 'GithubAction'
      scmIpSecurityRestrictionsDefaultAction: 'Allow'
      scmIpSecurityRestrictionsUseMain: false
      loadBalancing: 'LeastRequests' // Load balancing algorithm.
      ipSecurityRestrictions: [
        {
          ipAddress: 'AzureFrontDoor.Backend'
          action: 'Allow'
          tag: 'ServiceTag'
          priority: 100
          name: 'AzureFrontDoor'
        }
        {
          ipAddress: 'AzureCloud'
          action: 'Allow'
          tag: 'ServiceTag'
          priority: 200
          name: 'AzureCloud'
        }
        {
          ipAddress: 'AzureActiveDirectory'
          action: 'Allow'
          tag: 'ServiceTag'
          priority: 300
          name: 'AzureActiveDirectory'
        }
        {
          ipAddress: 'Any'
          action: 'Deny'
          priority: 2147483647
          name: 'Deny all'
          description: 'Deny all access'
        }
      ]
      ipSecurityRestrictionsDefaultAction: 'Deny'
      minTlsVersion: '1.2' // Minimum TLS version accepted by the server.
      nodeVersion: '24' // Minimum specified Node.js version.
      webSocketsEnabled: true // WebSockets (WSS) are enabled.
      appSettings: [
        {
          name: 'NODE_ENV'
          value: 'Production' // Environment setting for Node.js
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsightsInstrumentationKey
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsightsConnectionString
        }
        {
          name: 'ApplicationInsightsAgent_EXTENSION_VERSION'
          value: '~3'
        }
      ]
    }
  }
  tags: union(commonTags, {
    displayName: 'Main Website'
  })
}

output mainWebsiteUrl string = mainWebsite.properties.defaultHostName
output mainWebsiteName string = mainWebsite.name
