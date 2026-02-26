targetScope = 'resourceGroup'

// =====================================================================================
// SQL Server — Resource-Scoped RBAC Role Assignments
// =====================================================================================
// This module assigns Azure RBAC roles scoped directly to an Azure SQL Server resource.
// Assignments are scoped to the SQL server (not the resource group) for least privilege.
// Role GUIDs are imported from the shared roles type file.
//
// Assigned Roles:
// - Backend: SQL DB Contributor
//
// Note: Data-plane access (SQL authentication) is managed separately via Azure AD
// integration and contained database users. This module handles control-plane RBAC only.
// =====================================================================================

metadata description = 'Resource-scoped RBAC role assignments for the SQL Server, granting database contributor access to the backend managed identity.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '1.0.0'

import {
  sqlDbContributor
} from '../types/roles.type.bicep'

// -------------------------------------------------------------------------------------
// Parameters
// -------------------------------------------------------------------------------------

@description('The name of the existing SQL Server to scope role assignments to.')
param sqlServerName string

@description('Principal ID of the backend managed identity.')
param backendPrincipalId string

// -------------------------------------------------------------------------------------
// Existing Resource Reference
// -------------------------------------------------------------------------------------

resource sqlServer 'Microsoft.Sql/servers@2024-11-01-preview' existing = {
  name: sqlServerName
}

// =====================================================================================
// Backend Role Assignments
// =====================================================================================

// Grants the backend contributor access to SQL databases for schema and data management
resource backendSqlContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: sqlServer
  name: guid(sqlServer.id, backendPrincipalId, sqlDbContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', sqlDbContributor)
    principalId: backendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Backend: SQL database contributor access on SQL server'
  }
}
