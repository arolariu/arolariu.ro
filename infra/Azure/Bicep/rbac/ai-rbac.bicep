targetScope = 'resourceGroup'

// =====================================================================================
// Azure AI Foundry — Resource-Scoped RBAC Role Assignments
// =====================================================================================
// This module assigns Azure RBAC roles scoped directly to the Azure AI Foundry
// (AIServices) account resource. Assignments are scoped to the account (not the
// resource group) for least privilege. Role GUIDs are imported from the shared
// constants file.
//
// Assigned Roles:
// - Backend on AI Foundry account: Cognitive Services User (Document Intelligence)
// - Backend on AI Foundry account: Azure AI User (OpenAI model-router access)
// =====================================================================================

metadata description = 'Resource-scoped RBAC role assignments for Azure AI Foundry account, granting inference access to the backend managed identity.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

import {
  azureAiUser
  cognitiveServicesUser
} from '../constants/roles.bicep'

// -------------------------------------------------------------------------------------
// Parameters
// -------------------------------------------------------------------------------------

@description('The name of the existing Azure AI Foundry (AIServices) account to scope role assignments to.')
param aiFoundryAccountName string

@description('Principal ID of the backend managed identity.')
param backendPrincipalId string

// -------------------------------------------------------------------------------------
// Existing Resource References
// -------------------------------------------------------------------------------------

resource aiFoundryAccount 'Microsoft.CognitiveServices/accounts@2025-10-01-preview' existing = {
  name: aiFoundryAccountName
}

// =====================================================================================
// Backend Role Assignments — AI Foundry Account (OpenAI + Document Intelligence)
// =====================================================================================

// Grants the backend data-plane access to Cognitive Services (Document Intelligence / Form Recognizer)
resource backendAiFoundryCognitiveUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: aiFoundryAccount
  name: guid(aiFoundryAccount.id, backendPrincipalId, cognitiveServicesUser)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesUser)
    principalId: backendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Backend: Cognitive Services User for Document Intelligence analysis on AI Foundry'
  }
}

// Grants the backend Azure AI User access for AI Foundry inference operations (OpenAI model-router)
resource backendAiFoundryAiUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: aiFoundryAccount
  name: guid(aiFoundryAccount.id, backendPrincipalId, azureAiUser)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', azureAiUser)
    principalId: backendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Backend: Azure AI User for AI Foundry inference operations (includes OpenAI model-router access)'
  }
}
