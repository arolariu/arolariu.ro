// =====================================================================================
// Azure Application Insights - Application Performance Monitoring (APM)
// =====================================================================================
// This module provisions Application Insights for end-to-end application
// performance monitoring and distributed tracing. Application Insights provides:
// - Automatic telemetry collection (requests, dependencies, exceptions)
// - Distributed tracing across frontend and backend services
// - Live metrics stream for real-time monitoring
// - Application map visualizing service dependencies
// - Failure analysis and smart detection alerts
//
// Connected Applications:
// - arolariu.ro (Next.js frontend)
// - api.arolariu.ro (.NET backend)
// - All Azure services emit telemetry here
//
// Workspace Mode:
// - Uses Log Analytics Workspace for data storage (not classic mode)
// - Enables unified querying across logs and metrics
// - Required for workspace-based retention and export
//
// Sampling Configuration:
// - SamplingPercentage: 30% (only 30% of telemetry is stored)
// - Reduces costs while maintaining statistical significance
// - Consider 100% for production debugging scenarios
//
// Retention:
// - 90-day retention for detailed telemetry
// - Aggregated metrics retained longer in workspace
//
// Integration Points:
// - Connection string provided to App Services for SDK initialization
// - Instrumentation key for legacy SDK compatibility (deprecated)
//
// See: sites/*.bicep (consumes connection string)
// See: RFC 1001 (Frontend OpenTelemetry)
// See: RFC 2002 (Backend OpenTelemetry)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Application Insights for APM and distributed tracing'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

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

// Output the Application Insights connection string
output applicationInsightsConnectionString string = applicationInsights.properties.ConnectionString

// Output the Application Insights instrumentation key
output applicationInsightsInstrumentationKey string = applicationInsights.properties.InstrumentationKey
