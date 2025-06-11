targetScope = 'resourceGroup'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string

@description('The prefix to use for the names of the resources.')
param resourceConventionPrefix string

@description('The location for the resources.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param resourceLocation string

module logAnalyticsWorkspaceDeployment 'log-analytics.bicep' = {
  scope: resourceGroup()
  name: 'logAnalyticsWorkspaceDeployment-${resourceDeploymentDate}'
  params: {
    logAnalyticsWorkspaceLocation: resourceLocation
    logAnalyticsWorkspaceDeploymentDate: resourceDeploymentDate
    logAnalyticsWorkspaceName: '${resourceConventionPrefix}-workspace'
  }
}

module applicationInsightsDeployment 'application-insights.bicep' = {
  scope: resourceGroup()
  name: 'applicationInsightsDeployment-${resourceDeploymentDate}'
  params: {
    applicationInsightsName: '${resourceConventionPrefix}-insights'
    applicationInsightsLocation: resourceLocation
    applicationInsightsDeploymentDate: resourceDeploymentDate
    applicationInsightsWorkspaceId: logAnalyticsWorkspaceDeployment.outputs.logAnalyticsWorkspaceId
  }
}

// module managedGrafanaDeployment 'grafana.bicep' = {
//   scope: resourceGroup()
//   name: 'managedGrafanaDeployment-${resourceDeploymentDate}'
//   dependsOn: [applicationInsightsDeployment, logAnalyticsWorkspaceDeployment]
//   params: { managedGrafanaName: '${resourceConventionPrefix}-grafana' }
// }
