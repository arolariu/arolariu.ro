// =====================================================================================
// Backend API - api.arolariu.ro .NET Application
// =====================================================================================
// This module provisions the App Service that hosts the api.arolariu.ro backend API.
// The API is a .NET 9.0 application running as a Linux container and serves as the
// central backend for all business logic and data operations.
//
// Runtime Configuration:
// - Platform: Linux container (app,linux,container)
// - Runtime: .NET Core 9.0 (linuxFxVersion)
// - Container source: Azure Container Registry (via managed identity)
// - Always On: Enabled (prevents cold starts)
//
// Identity:
// - User-Assigned Managed Identity (Backend UAMI)
// - Used for: Storage, Cosmos DB, SQL, Key Vault, App Configuration, OpenAI
// - Higher privileges than Frontend UAMI (read-write access)
//
// API Features:
// - WebSockets: Enabled (real-time communication)
// - HTTP/2: Enabled (improved performance)
// - Request Tracing: Enabled (debugging support)
//
// Security Configuration:
// - Minimum TLS 1.2 enforced
// - FTPS: Disabled (no FTP access)
// - IP restrictions can be added for Front Door only access
//
// Observability:
// - Application Insights instrumentation enabled
// - HTTP logging enabled
// - Health check path: /
//
// See: compute/appServicePlans.bicep (hosting plan)
// See: identity/userAssignedIdentity.bicep (Backend UAMI)
// See: rbac/backend-uami-rbac.bicep (role assignments)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Backend API api.arolariu.ro App Service with .NET 9.0'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

param apiWebsitePlanId string
param apiWebsiteLocation string
param apiWebsiteIdentityId string
param apiWebsiteDeploymentDate string
param appInsightsInstrumentationKey string
param appInsightsConnectionString string

// Import common tags
import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: apiWebsiteDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'sites'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

resource apiWebsite 'Microsoft.Web/sites@2024-11-01' = {
  name: 'api-arolariu-ro'
  location: apiWebsiteLocation
  kind: 'app,linux,container'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${apiWebsiteIdentityId}': {}
    }
  }
  properties: {
    enabled: true
    serverFarmId: apiWebsitePlanId
    reserved: true // reserved == linux plan
    hyperV: false
    siteConfig: {
      healthCheckPath: '/'
      acrUseManagedIdentityCreds: true
      alwaysOn: true
      numberOfWorkers: 1
      http20Enabled: true
      linuxFxVersion: 'DOTNETCORE|9.0'
      requestTracingEnabled: true
      httpLoggingEnabled: true
      logsDirectorySizeLimit: 50 // 50 MB
      detailedErrorLoggingEnabled: false
      webSocketsEnabled: true
      loadBalancing: 'LeastRequests'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2' // Minimum TLS version for secure connections
      ipSecurityRestrictions: [
        {
          ipAddress: 'Any'
          action: 'Allow'
          priority: 2147483647
          tag: 'Default'
          name: 'Allow All'
          description: 'Allow all access.'
        }
      ]
      ipSecurityRestrictionsDefaultAction: 'Deny'
      appSettings: [
        {
          name: 'ASPNETCORE_ENVIRONMENT'
          value: 'Production' // Environment setting for ASP.NET Core
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
        {
          name: 'APPLICATIONINSIGHTS_ENABLESQLQUERYCOLLECTION'
          value: 'true'
        }
      ]
    }
    scmSiteAlsoStopped: true
    clientAffinityEnabled: false
    hostNamesDisabled: false
    containerSize: 0
    httpsOnly: true
    redundancyMode: 'None'
    publicNetworkAccess: 'Enabled'
  }

  tags: union(commonTags, {
    displayName: 'API Website'
  })
}

output apiWebsiteUrl string = apiWebsite.properties.defaultHostName
output apiWebsiteName string = apiWebsite.name
