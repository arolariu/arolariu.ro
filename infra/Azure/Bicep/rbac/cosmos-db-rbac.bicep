targetScope = 'resourceGroup'

metadata description = 'Native Cosmos NoSQL data-contributor access scoped to the primary application database.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '1.0.0'

import {
  cosmosDbSqlDataContributor
} from '../constants/roles.bicep'

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

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2026-03-15' existing = {
  name: cosmosAccountName
}

// =====================================================================================
// Backend Role Assignments
// =====================================================================================

resource backendCosmosDataContributor 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2026-03-15' = {
  parent: cosmosAccount
  name: guid(cosmosAccount.id, backendPrincipalId, cosmosDbSqlDataContributor, '/dbs/primary')
  properties: {
    roleDefinitionId: '${cosmosAccount.id}/sqlRoleDefinitions/${cosmosDbSqlDataContributor}'
    principalId: backendPrincipalId
    scope: '${cosmosAccount.id}/dbs/primary'
  }
}
