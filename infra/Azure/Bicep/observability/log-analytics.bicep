// =====================================================================================
// Azure Log Analytics Workspace - Central Log Aggregation and Query Engine
// =====================================================================================
// This module provisions a Log Analytics Workspace that serves as the central
// data sink for all observability data in the arolariu.ro platform. Log Analytics
// provides:
// - Centralized log aggregation from all Azure resources
// - KQL (Kusto Query Language) for powerful log analysis
// - Data source for Application Insights and Grafana
// - Alert rule evaluation and automation triggers
//
// Data Sources:
// - Application Insights telemetry (traces, requests, exceptions)
// - Azure resource diagnostic logs (via diagnostic settings)
// - Container logs from App Services
// - Custom application logs
//
// Pricing Model: Per-GB Ingestion (PerGB2018)
// - Pay only for data ingested
// - First 5 GB/month included in Azure subscription
// - Daily quota set to 3 GB to prevent cost overruns
//
// Retention Policy:
// - 30-day retention (default)
// - Consider extending for compliance requirements
// - Archived data can be exported to storage for long-term retention
//
// Access Configuration:
// - Public ingestion enabled (Azure resources send logs over internet)
// - Public query enabled (Log Analytics UI accessible)
// - Resource-based permissions enabled for fine-grained access
//
// See: observability/application-insights.bicep (uses this workspace)
// See: observability/grafana.bicep (queries this workspace)
// See: RFC 1001, RFC 2002 (OpenTelemetry integration)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Log Analytics Workspace for OpenTelemetry data collection'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

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
