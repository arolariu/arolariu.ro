targetScope = 'resourceGroup'

@description('The date when the deployment is executed.')
param resourceDeploymentDate string = utcNow()

@description('The prefix to use for the names of the resources.')
param resourceConventionPrefix string

param managedIdentityBackendId string
param managedIdentityFrontendId string
param managedIdentityInfraId string

module logAnalyticsWorkspaceDeployment 'log-analytics.bicep' = {
  name: 'logAnalyticsWorkspaceDeployment-${resourceDeploymentDate}'
  scope: resourceGroup()
  params: {
    logAnalyticsWorkspaceName: '${resourceConventionPrefix}-workspace'
    logAnalyticsWorkspaceBackendIdentity: managedIdentityBackendId
  }
}

module applicationInsightsDeployment 'application-insights.bicep' = {
  name: 'applicationInsightsDeployment-${resourceDeploymentDate}'
  scope: resourceGroup()
  dependsOn: [logAnalyticsWorkspaceDeployment]
  params: {
    applicationInsightsName: '${resourceConventionPrefix}-insights'
    applicationInsightsWorkspaceId: logAnalyticsWorkspaceDeployment.outputs.logAnalyticsWorkspaceId
  }
}

module managedGrafanaDeployment 'grafana.bicep' = {
  name: 'managedGrafanaDeployment-${resourceDeploymentDate}'
  scope: resourceGroup()
  dependsOn: [applicationInsightsDeployment, logAnalyticsWorkspaceDeployment]
  params: {
    managedGrafanaName: '${resourceConventionPrefix}-grafana'
    managedGrafanaBackendIdentity: managedIdentityBackendId
    managedGrafanaFrontendIdentity: managedIdentityFrontendId
    managedGrafanaInfrastructureIdentity: managedIdentityInfraId
  }
}
