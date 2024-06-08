targetScope = 'resourceGroup'

metadata description = 'This template will deploy an application insights resource that is connected to the api.arolariu.ro platform (back-end) and the arolariu.ro platform (front-end).'

metadata author = 'Alexandru-Razvan Olariu'

param applicationInsightsLocation string = resourceGroup().location
param applicationInsightsWorkspaceId string
param applicationInsightsName string

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
  tags: {
    environment: 'production'
    deployment: 'bicep'
    timestamp: resourceGroup().tags.timestamp
  }
}
