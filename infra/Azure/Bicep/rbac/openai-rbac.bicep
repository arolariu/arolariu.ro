targetScope = 'resourceGroup'

// =====================================================================================
// Azure AI — Resource-Scoped RBAC Role Assignments
// =====================================================================================
// This module assigns Azure RBAC roles scoped directly to Azure AI (Cognitive Services)
// account resources. Assignments are scoped to the account (not the resource group)
// for least privilege. Role GUIDs are imported from the shared constants file.
//
// Assigned Roles:
// - Backend on OpenAI account: Cognitive Services OpenAI User
// - Backend on AI Foundry account: Cognitive Services User (Document Intelligence)
// - Backend on AI Foundry account: Azure AI User
// =====================================================================================

metadata description = 'Resource-scoped RBAC role assignments for Azure AI accounts, granting inference access to the backend managed identity.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

import {
  azureAiUser
  cognitiveServicesOpenAiUser
  cognitiveServicesUser
} from '../constants/roles.bicep'

// -------------------------------------------------------------------------------------
// Parameters
// -------------------------------------------------------------------------------------

@description('The name of the existing Azure OpenAI (Cognitive Services) account to scope role assignments to.')
param openAiAccountName string

@description('The name of the existing Azure AI Foundry (AIServices) account to scope role assignments to.')
param aiFoundryAccountName string

@description('Principal ID of the backend managed identity.')
param backendPrincipalId string

// -------------------------------------------------------------------------------------
// Existing Resource References
// -------------------------------------------------------------------------------------

resource openAiAccount 'Microsoft.CognitiveServices/accounts@2025-10-01-preview' existing = {
  name: openAiAccountName
}

resource aiFoundryAccount 'Microsoft.CognitiveServices/accounts@2025-10-01-preview' existing = {
  name: aiFoundryAccountName
}

// =====================================================================================
// Backend Role Assignments — OpenAI Account
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

// =====================================================================================
// Backend Role Assignments — AI Foundry Account (Document Intelligence + AI Services)
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

// Grants the backend Azure AI User access for AI Foundry inference operations
resource backendAiFoundryAiUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: aiFoundryAccount
  name: guid(aiFoundryAccount.id, backendPrincipalId, azureAiUser)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', azureAiUser)
    principalId: backendPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Backend: Azure AI User for AI Foundry inference operations'
  }
}
