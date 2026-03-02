// =====================================================================================
// Exp Service - exp.arolariu.ro Configuration Proxy
// =====================================================================================
// This module provisions the Azure Function App that hosts the exp.arolariu.ro
// configuration proxy service. The service acts as a centralized configuration
// gateway, reading from Azure App Configuration + Key Vault and exposing
// values via REST API to the frontend and backend services.
//
// Runtime Configuration:
// - Platform: Azure Functions v4 Python 3.12
// - Kind: functionapp,linux
// - Runtime: Python 3.12 (linuxFxVersion)
// - Container deployment: Handled by GitHub Actions CI/CD pipeline
// - Serverless: Runs on development App Service Plan (cost optimization)
//
// Identity:
// - User-Assigned Managed Identity (Backend UAMI)
// - Used for: App Configuration read, Key Vault read, ACR pull
// - Shares backend identity for access to configuration stores
//
// Security:
// - Entra ID Easy Auth v2 restricts access to frontend + backend UAMIs only
// - IP restrictions: Azure services only (AzureCloud service tag)
// - No public access to configuration endpoints
// - HTTPS Only: Enforced
// - FTPS: Disabled
// - Minimum TLS 1.2 enforced
//
// Observability:
// - Application Insights instrumentation enabled
// - HTTP logging enabled
// - Health check path: /api/health
//
// See: compute/appServicePlans.bicep (hosting plan)
// See: identity/userAssignedIdentity.bicep (Backend UAMI)
// See: configuration/deploymentFile.bicep (App Configuration + Key Vault)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Azure Functions config proxy exp.arolariu.ro with Entra ID Easy Auth'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '3.0.0'

@description('The location for the experiments Function App.')
param expWebsiteLocation string

@description('The ID of the App Service Plan to deploy on.')
param expWebsitePlanId string

@description('The resource ID of the backend managed identity.')
param expWebsiteIdentityId string

@description('The client ID of the backend managed identity for AZURE_CLIENT_ID.')
param expWebsiteIdentityClientId string

@description('The deployment timestamp.')
param expWebsiteDeploymentDate string

@description('The Application Insights connection string.')
param appInsightsConnectionString string

@description('The frontend managed identity principal (object) ID - allowed caller.')
param frontendIdentityPrincipalId string

@description('The backend managed identity principal (object) ID - allowed caller.')
param backendIdentityPrincipalId string

@description('The Entra ID App Registration client ID for the exp service.')
param entraAppClientId string

@description('The storage account name for identity-based AzureWebJobsStorage.')
param storageAccountName string

@description('The Azure App Configuration store name for constructing the endpoint URL.')
param appConfigurationName string

// Import common tags
import { createTags } from '../constants/tags.bicep'
var commonTags = createTags('sites', expWebsiteDeploymentDate)

resource expWebsite 'Microsoft.Web/sites@2024-04-01' = {
  name: 'exp-arolariu-ro'
  location: expWebsiteLocation
  kind: 'functionapp,linux'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${expWebsiteIdentityId}': {}
    }
  }
  properties: {
    enabled: true
    serverFarmId: expWebsitePlanId
    reserved: true // reserved == linux plan
    hyperV: false
    siteConfig: {
      healthCheckPath: '/api/health'
      acrUseManagedIdentityCreds: true
      alwaysOn: false // cost optimization — wakes on request
      numberOfWorkers: 1
      http20Enabled: true
      linuxFxVersion: 'Python|3.12'
      requestTracingEnabled: true
      httpLoggingEnabled: true
      logsDirectorySizeLimit: 50 // 50 MB
      detailedErrorLoggingEnabled: false
      webSocketsEnabled: false // not needed for config proxy
      loadBalancing: 'LeastRequests'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      ipSecurityRestrictions: [
        {
          ipAddress: 'AzureCloud'
          action: 'Allow'
          tag: 'ServiceTag'
          priority: 100
          name: 'AzureCloud'
          description: 'Allow Azure services only.'
        }
        {
          ipAddress: 'Any'
          action: 'Deny'
          priority: 2147483647
          name: 'Deny all'
          description: 'Deny all public access.'
        }
      ]
      ipSecurityRestrictionsDefaultAction: 'Deny'
      appSettings: [
        {
          name: 'AZURE_CLIENT_ID'
          value: expWebsiteIdentityClientId
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsightsConnectionString
        }
        {
          name: 'INFRA'
          value: 'azure'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'python'
        }
        {
          name: 'AzureWebJobsStorage__accountName'
          value: storageAccountName
        }
        {
          name: 'AZURE_APPCONFIG_ENDPOINT'
          value: 'https://${appConfigurationName}.azconfig.io'
        }
        {
          name: 'EXP_CALLER_API_IDS'
          value: backendIdentityPrincipalId
        }
        {
          name: 'EXP_CALLER_WEBSITE_IDS'
          value: frontendIdentityPrincipalId
        }
        {
          name: 'EXP_CONFIG_REFRESH_INTERVAL_SECONDS'
          value: '300'
        }
      ]
    }
    scmSiteAlsoStopped: true
    clientAffinityEnabled: false
    httpsOnly: true
    redundancyMode: 'None'
    publicNetworkAccess: 'Enabled' // IP restrictions enforce access control
  }
  tags: union(commonTags, {
    displayName: 'Exp Configuration Proxy (Azure Functions)'
  })
}

// Easy Auth v2 — restrict to frontend + backend UAMIs only
resource authSettings 'Microsoft.Web/sites/config@2024-04-01' = {
  parent: expWebsite
  name: 'authsettingsV2'
  properties: {
    globalValidation: {
      requireAuthentication: true
      unauthenticatedClientAction: 'Return401'
      excludedPaths: [
        '/api/health'
        '/api/ready'
      ]
    }
    identityProviders: {
      azureActiveDirectory: {
        enabled: true
        registration: {
          clientId: entraAppClientId
          openIdIssuer: '${environment().authentication.loginEndpoint}${tenant().tenantId}/v2.0'
        }
        validation: {
          defaultAuthorizationPolicy: {
            allowedPrincipals: {
              identities: [
                frontendIdentityPrincipalId
                backendIdentityPrincipalId
              ]
            }
          }
        }
      }
    }
  }
}

output expWebsiteUrl string = expWebsite.properties.defaultHostName
output expWebsiteName string = expWebsite.name
