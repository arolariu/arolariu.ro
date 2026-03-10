targetScope = 'resourceGroup'

// =====================================================================================
// Application Insights — Resource-Scoped RBAC Role Assignments
// =====================================================================================
// Assigns Monitoring Metrics Publisher to managed identities so they can push
// traces, metrics, and logs to Application Insights via Azure Monitor OTel exporters
// using token-based (Entra ID) authentication.
//
// Assigned Roles (per identity):
// - Frontend UAMI:       Monitoring Metrics Publisher
// - Backend UAMI:        Monitoring Metrics Publisher
// - Infrastructure UAMI: Monitoring Metrics Publisher
// =====================================================================================

metadata description = 'Resource-scoped RBAC role assignments for Application Insights, granting Monitoring Metrics Publisher to managed identities.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '1.0.0'

import {
  monitoringMetricsPublisher
} from '../constants/roles.bicep'

// -------------------------------------------------------------------------------------
// Parameters
// -------------------------------------------------------------------------------------

@description('Name of the existing Application Insights resource.')
param appInsightsName string

@description('Principal ID of the frontend managed identity.')
param frontendPrincipalId string

@description('Principal ID of the backend managed identity.')
param backendPrincipalId string

@description('Principal ID of the infrastructure managed identity.')
param infrastructurePrincipalId string

// -------------------------------------------------------------------------------------
// Existing Resource Reference
// -------------------------------------------------------------------------------------

resource appInsights 'Microsoft.Insights/components@2020-02-02' existing = {
  name: appInsightsName
}

// =====================================================================================
// Role Assignments
// =====================================================================================

var principals = [
  { id: frontendPrincipalId, label: 'frontend' }
  { id: backendPrincipalId, label: 'backend' }
  { id: infrastructurePrincipalId, label: 'infrastructure' }
]

resource metricsPublisher 'Microsoft.Authorization/roleAssignments@2022-04-01' = [
  for principal in principals: {
    scope: appInsights
    name: guid(appInsights.id, principal.id, monitoringMetricsPublisher)
    properties: {
      roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', monitoringMetricsPublisher)
      principalId: principal.id
      principalType: 'ServicePrincipal'
      description: '${principal.label}: Monitoring Metrics Publisher on Application Insights'
    }
  }
]
