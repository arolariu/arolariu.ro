targetScope = 'resourceGroup'

metadata description = 'This template will create the dev.arolariu.ro app service site.'
metadata author = 'Alexandru-Razvan Olariu'

param devWebsiteLocation string
param developmentAppPlanId string
param devWebsiteIdentityId string

resource devWebsite 'Microsoft.Web/sites@2024-11-01' = {
  name: 'dev-arolariu-ro'
  location: devWebsiteLocation
  kind: 'app,linux,container'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${devWebsiteIdentityId}': {}
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
    serverFarmId: developmentAppPlanId
    siteConfig: {
      acrUseManagedIdentityCreds: false // Azure Container Registry managed identity is not used.
      publishingUsername: '$dev-arolariu' // Publishing username (GitHub / ACR username)
      autoHealEnabled: false
      numberOfWorkers: 1 // Number of instances (initially).
      functionAppScaleLimit: 0
      minimumElasticInstanceCount: 0 // Minimum number of instances for horizontal scaling.
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
          ipAddress: 'Any'
          tag: 'Default'
          name: 'Default'
          action: 'Allow'
          priority: 2147483647
        }
      ]
      ipSecurityRestrictionsDefaultAction: 'Allow'
      minTlsVersion: '1.1' // Minimum TLS version accepted by the server.
      nodeVersion: '22' // Minimum specified Node.js version.
      webSocketsEnabled: true // WebSockets (WSS) are enabled.
    }
  }
  tags: {
    environment: 'DEVELOPMENT'
    deployment: 'Bicep'
  }
}

output devWebsiteUrl string = devWebsite.properties.defaultHostName
