targetScope = 'resourceGroup'

// =====================================================================================
// Azure OpenAI — Resource-Scoped RBAC Role Assignments
// =====================================================================================
// This module assigns Azure RBAC roles scoped directly to an Azure OpenAI (Cognitive
// Services) account resource. Assignments are scoped to the account (not the resource
// group) for least privilege. Role GUIDs are imported from the shared roles type file.
//
// Assigned Roles:
// - Backend: Cognitive Services OpenAI User
//
// Note: The OpenAI User role grants inference access (chat completions, embeddings,
// image generation) without management-plane permissions. This follows the principle
// of least privilege — the backend only needs to call the API, not manage the resource.
// =====================================================================================

metadata description = 'Resource-scoped RBAC role assignments for the Azure OpenAI account, granting inference access to the backend managed identity.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '1.0.0'

import {
  cognitiveServicesOpenAiUser
} from '../types/roles.type.bicep'

// -------------------------------------------------------------------------------------
// Parameters
// -------------------------------------------------------------------------------------

@description('The name of the existing Azure OpenAI (Cognitive Services) account to scope role assignments to.')
param openAiAccountName string

@description('Principal ID of the backend managed identity.')
param backendPrincipalId string

// -------------------------------------------------------------------------------------
// Existing Resource Reference
// -------------------------------------------------------------------------------------

resource openAiAccount 'Microsoft.CognitiveServices/accounts@2025-06-01' existing = {
  name: openAiAccountName
}

// =====================================================================================
// Backend Role Assignments
// =====================================================================================

// Grants the backend user-level access to Azure OpenAI for API inference calls
resource backendOpenAiUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: openAiAccount
  name: guid(openAiAccount.id, backendPrincipalId, cognitiveServicesOpenAiUser)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesOpenAiUser)
    principalId: backendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Backend: OpenAI inference access on cognitive services account'
  }
}
