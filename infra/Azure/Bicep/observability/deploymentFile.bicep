targetScope = 'resourceGroup'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

@description('The prefix to use for the names of the resources.')
param resourceConventionPrefix string

module logAnalyticsWorkspaceDeployment 'log-analytics.bicep' = {
  scope: resourceGroup()
  name: 'logAnalyticsWorkspaceDeployment-${resourceDeploymentDate}'
  params: { logAnalyticsWorkspaceName: '${resourceConventionPrefix}-workspace' }
}

module applicationInsightsDeployment 'application-insights.bicep' = {
  scope: resourceGroup()
  name: 'applicationInsightsDeployment-${resourceDeploymentDate}'
  dependsOn: [logAnalyticsWorkspaceDeployment]
  params: {
    applicationInsightsName: '${resourceConventionPrefix}-insights'
    applicationInsightsWorkspaceId: logAnalyticsWorkspaceDeployment.outputs.logAnalyticsWorkspaceId
  }
}

module managedGrafanaDeployment 'grafana.bicep' = {
  scope: resourceGroup()
  name: 'managedGrafanaDeployment-${resourceDeploymentDate}'
  dependsOn: [applicationInsightsDeployment, logAnalyticsWorkspaceDeployment]
  params: { managedGrafanaName: '${resourceConventionPrefix}-grafana' }
}
