// =====================================================================================
// Observability Deployment Orchestrator - Monitoring and Telemetry Infrastructure
// =====================================================================================
// This orchestrator module deploys the complete observability stack for the
// arolariu.ro platform. It implements a comprehensive monitoring solution following
// OpenTelemetry principles (see RFC 1001 and RFC 2002 in docs/rfc/).
//
// Deployed Resources:
// - Log Analytics Workspace (central log aggregation and query engine)
// - Application Insights (APM, distributed tracing, and metrics)
// - Managed Grafana (visualization dashboards and alerting)
//
// Deployment Order (dependencies):
// 1. Log Analytics Workspace (base data sink)
// 2. Application Insights (depends on workspace ID)
// 3. Managed Grafana (depends on both for data sources)
//
// Integration Points:
// - All App Services emit telemetry to Application Insights
// - Azure resources send diagnostic logs to Log Analytics
// - Grafana dashboards query both for unified visualization
//
// Security Notes:
// - Log Analytics uses workspace-based authentication
// - Connection strings are stored in Key Vault (see configuration/)
// - Grafana uses managed identity for data source access
//
// See: RFC 1001 (Frontend OpenTelemetry)
// See: RFC 2002 (Backend OpenTelemetry)
// See: sites/*.bicep (App Services consume connection strings)
// =====================================================================================

metadata description = 'Observability orchestrator deploying Log Analytics, Application Insights, and Grafana'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

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

module managedGrafanaDeployment 'grafana.bicep' = {
  scope: resourceGroup()
  name: 'managedGrafanaDeployment-${resourceDeploymentDate}'
  dependsOn: [applicationInsightsDeployment, logAnalyticsWorkspaceDeployment]
  params: {
    managedGrafanaName: '${resourceConventionPrefix}-grafana'
    managedGrafanaLocation: resourceLocation
    managedGrafanaDeploymentDate: resourceDeploymentDate
  }
}

output logAnalyticsWorkspaceId string = logAnalyticsWorkspaceDeployment.outputs.logAnalyticsWorkspaceId

output appInsightsConnectionString string = applicationInsightsDeployment.outputs.applicationInsightsConnectionString
output appInsightsInstrumentationKey string = applicationInsightsDeployment.outputs.applicationInsightsInstrumentationKey
