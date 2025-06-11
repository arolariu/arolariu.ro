targetScope = 'resourceGroup'

metadata description = 'This template will deploy a log analytics workspace that is used for Open Telemetry (OTel) data collection.'
metadata author = 'Alexandru-Razvan Olariu'

param logAnalyticsWorkspaceName string
param logAnalyticsWorkspaceLocation string
param logAnalyticsWorkspaceDeploymentDate string

// Import common tags
import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: logAnalyticsWorkspaceDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'observability'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2025-02-01' = {
  name: logAnalyticsWorkspaceName
  location: logAnalyticsWorkspaceLocation
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
    workspaceCapping: { dailyQuotaGb: json('3') }
    features: { enableLogAccessUsingOnlyResourcePermissions: true }
  }
  tags: union(commonTags, {
    displayName: 'Log Analytics Workspace'
  })
}

output logAnalyticsWorkspaceId string = logAnalyticsWorkspace.id
