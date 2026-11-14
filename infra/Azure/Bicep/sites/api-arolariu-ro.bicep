// =====================================================================================
// Backend API - api.arolariu.ro .NET Application
// =====================================================================================
// This module provisions the App Service that hosts the api.arolariu.ro backend API.
// The API is a .NET 10.0 application running as a Linux container and serves as the
// central backend for all business logic and data operations.
//
// Runtime Configuration:
// - Platform: Linux container (app,linux,container)
// - Runtime: .NET Core 10.0 (linuxFxVersion)
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
// - Health check path: /health
//
// See: compute/appServicePlans.bicep (hosting plan)
// See: identity/userAssignedIdentity.bicep (Backend UAMI)
// See: rbac/backend-uami-rbac.bicep (role assignments)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Backend API api.arolariu.ro App Service with .NET 10.0'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

param apiWebsitePlanId string
param apiWebsiteLocation string
param apiWebsiteIdentityId string
param apiWebsiteIdentityClientId string
param apiWebsiteDeploymentDate string
param appInsightsConnectionString string

@description('The generated experiments application client ID used for token acquisition.')
param expEntraAppClientId string

@description('The actual container registry login server.')
param containerRegistryLoginServer string

// Import common tags
import { createTags } from '../constants/tags.bicep'
var commonTags = createTags('sites', apiWebsiteDeploymentDate)

resource apiWebsite 'Microsoft.Web/sites@2025-03-01' = {
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
      healthCheckPath: '/health'
      acrUseManagedIdentityCreds: true
      acrUserManagedIdentityID: apiWebsiteIdentityClientId
      alwaysOn: true
      numberOfWorkers: 1
      http20Enabled: true
      linuxFxVersion: 'DOTNETCORE|10.0'
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
          value: 'Production'
        }
        {
          name: 'AZURE_CLIENT_ID'
          value: apiWebsiteIdentityClientId
        }
        { name: 'AZURE_TENANT_ID', value: tenant().tenantId }
        { name: 'AZURE_SUBSCRIPTION_ID', value: subscription().subscriptionId }
        { name: 'INFRA', value: 'azure' }
        { name: 'EXP_ENTRA_APP_CLIENT_ID', value: expEntraAppClientId }
        { name: 'WEBSITES_PORT', value: '8080' }
        { name: 'ASPNETCORE_HTTP_PORTS', value: '8080' }
        { name: 'DOCKER_REGISTRY_SERVER_URL', value: 'https://${containerRegistryLoginServer}' }
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
output domainVerificationId string = apiWebsite.properties.customDomainVerificationId
