targetScope = 'resourceGroup'

metadata description = 'This template will create the api.arolariu.ro app service site.'
metadata author = 'Alexandru-Razvan Olariu'

param apiWebsiteLocation string = resourceGroup().location
param apiWebsitePlanId string
param apiWebsiteIdentityId string

resource apiWebsite 'Microsoft.Web/sites@2023-12-01' = {
  name: 'api-arolariu-ro'
  location: apiWebsiteLocation
  kind: 'app,linux'
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
    isXenon: false
    hyperV: false
    dnsConfiguration: {}
    vnetRouteAllEnabled: false
    vnetImagePullEnabled: false
    vnetContentShareEnabled: false
    vnetBackupRestoreEnabled: false
    siteConfig: {
      alwaysOn: true
      numberOfWorkers: 1
      http20Enabled: true
      functionAppScaleLimit: 0
      minimumElasticInstanceCount: 0
      linuxFxVersion: 'DOTNETCORE|8.0'
      requestTracingEnabled: true
      remoteDebuggingEnabled: false
      httpLoggingEnabled: true
      logsDirectorySizeLimit: 35 // 35 MB
      detailedErrorLoggingEnabled: false
      use32BitWorkerProcess: false
      webSocketsEnabled: true
      loadBalancing: 'LeastRequests'
      preWarmedInstanceCount: 0
      ftpsState: 'Disabled'
    }
    scmSiteAlsoStopped: false
    clientAffinityEnabled: false
    clientCertEnabled: false
    clientCertMode: 'Required'
    hostNamesDisabled: false
    containerSize: 0
    dailyMemoryTimeQuota: 0
    httpsOnly: true
    redundancyMode: 'None'
    publicNetworkAccess: 'Enabled'
    storageAccountRequired: false
    keyVaultReferenceIdentity: apiWebsiteIdentityId
  }
  tags: {
    environment: 'production'
    deployment: 'bicep'
    timestamp: resourceGroup().tags.timestamp
  }
}
