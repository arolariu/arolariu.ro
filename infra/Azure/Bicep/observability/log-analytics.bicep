targetScope = 'resourceGroup'

metadata description = 'This template will deploy a log analytics workspace that is used for Open Telemetry (OTel) data collection.'
metadata author = 'Alexandru-Razvan Olariu'

param logAnalyticsWorkspaceLocation string = resourceGroup().location
param logAnalyticsWorkspaceName string

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsWorkspaceName
  location: logAnalyticsWorkspaceLocation
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 90
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
    workspaceCapping: { dailyQuotaGb: 3 }
    features: { enableLogAccessUsingOnlyResourcePermissions: true }
  }
  tags: {
    environment: 'PRODUCTION'
    deployment: 'Bicep'
  }
}

output logAnalyticsWorkspaceId string = logAnalyticsWorkspace.id
