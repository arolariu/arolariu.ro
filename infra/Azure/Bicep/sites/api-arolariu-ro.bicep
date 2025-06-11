targetScope = 'resourceGroup'

metadata description = 'This template will create the api.arolariu.ro app service site.'
metadata author = 'Alexandru-Razvan Olariu'

param apiWebsitePlanId string
param apiWebsiteLocation string
param apiWebsiteIdentityId string
param apiWebsiteDeploymentDate string

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
  tags: union(commonTags, {
    displayName: 'API Website'
  })
}

output apiWebsiteUrl string = apiWebsite.properties.defaultHostName
