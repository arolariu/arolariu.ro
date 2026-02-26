targetScope = 'resourceGroup'

// =====================================================================================
// Cosmos DB — Resource-Scoped RBAC Role Assignments
// =====================================================================================
// This module assigns Azure RBAC roles scoped directly to a Cosmos DB account resource.
// Assignments are scoped to the Cosmos DB account (not the resource group) for least
// privilege. Role GUIDs are imported from the shared roles type file.
//
// Assigned Roles:
// - Backend: Cosmos DB Data Operator
//
// Note: The Data Operator role grants full data-plane access (read, write, delete)
// to all databases and containers within the account, which is required for the
// backend API to perform document CRUD operations.
// =====================================================================================

metadata description = 'Resource-scoped RBAC role assignments for the Cosmos DB account, granting data operator access to the backend managed identity.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '1.0.0'

import {
  cosmosDbDataOperator
} from '../types/roles.type.bicep'

// -------------------------------------------------------------------------------------
// Parameters
// -------------------------------------------------------------------------------------

@description('The name of the existing Cosmos DB account to scope role assignments to.')
param cosmosAccountName string

@description('Principal ID of the backend managed identity.')
param backendPrincipalId string

// -------------------------------------------------------------------------------------
// Existing Resource Reference
// -------------------------------------------------------------------------------------

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2025-11-01-preview' existing = {
  name: cosmosAccountName
}

// =====================================================================================
// Backend Role Assignments
// =====================================================================================

// Grants the backend data operator access to Cosmos DB for document CRUD operations
resource backendCosmosOperator 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: cosmosAccount
  name: guid(cosmosAccount.id, backendPrincipalId, cosmosDbDataOperator)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cosmosDbDataOperator)
    principalId: backendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Backend: data operator access on Cosmos DB account'
  }
}
