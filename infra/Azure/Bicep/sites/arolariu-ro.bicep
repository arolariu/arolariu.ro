targetScope = 'resourceGroup'

metadata description = 'This template will create the arolariu.ro app service site.'
metadata author = 'Alexandru-Razvan Olariu'

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

resource mainWebsite 'Microsoft.Web/sites@2024-11-01' = {
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
    isXenon: false // Hyper-V sandbox; not used.
    hyperV: false // Hyper-V manager; not used.
    hostNamesDisabled: false
    containerSize: 0
    httpsOnly: true
    redundancyMode: 'None' // No redundancy; we use AFD and elastic horizontal scaling.
    publicNetworkAccess: 'Enabled'
    storageAccountRequired: false
    enabled: true
    serverFarmId: productionWebsiteAppPlanId
    siteConfig: {
      acrUseManagedIdentityCreds: false // Azure Container Registry managed identity is not used.
      publishingUsername: '$arolariu' // Publishing username (GitHub / ACR username)
      autoHealEnabled: false
      numberOfWorkers: 1 // Number of instances (initially).
      functionAppScaleLimit: 0
      linuxFxVersion: 'NODE|22-lts' // Node.js version 22 is used.
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
      use32BitWorkerProcess: false // 32-bit worker process is not used; we use 64-bit.
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
      nodeVersion: '22' // Minimum specified Node.js version.
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
