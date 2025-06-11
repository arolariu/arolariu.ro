targetScope = 'resourceGroup'

metadata description = 'This template will deploy an application insights resource that is connected to the api.arolariu.ro platform (back-end) and the arolariu.ro platform (front-end).'

metadata author = 'Alexandru-Razvan Olariu'

param applicationInsightsName string
param applicationInsightsLocation string
param applicationInsightsWorkspaceId string
param applicationInsightsDeploymentDate string

// Import common tags
import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: applicationInsightsDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'observability'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: applicationInsightsName
  location: applicationInsightsLocation
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Flow_Type: 'Bluefield'
    Request_Source: 'rest'
    RetentionInDays: 90
    WorkspaceResourceId: applicationInsightsWorkspaceId
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
    SamplingPercentage: 30
  }
  tags: union(commonTags, {
    displayName: 'Application Insights'
  })
}
