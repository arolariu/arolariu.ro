// =====================================================================================
// Azure OpenAI Service - GPT and Language Model API
// =====================================================================================
// This module provisions an Azure OpenAI Service instance that provides access to
// OpenAI's powerful language models (GPT-4, GPT-3.5, etc.) for the arolariu.ro
// platform. Azure OpenAI is used for:
// - Invoice analysis and data extraction
// - Natural language understanding for user queries
// - Content generation and summarization
//
// Model Deployments:
// - Models are deployed separately after the account is created
// - Configure via Azure Portal or separate Bicep module
// - Consider GPT-4o for production (best balance of cost/capability)
//
// Authentication:
// - Backend UAMI receives "Cognitive Services User" role
// - No API keys are used; all access via managed identity
// - Role assignment is scoped to this specific OpenAI resource
//
// Role Assignment Details:
// - Role: Cognitive Services User (a97b65f3-24c7-4388-baec-2e87135dc908)
// - Allows: Read access to models, inference API calls
// - Does not allow: Model deployment, account management
//
// SKU: S0 (Standard)
// - Pay-as-you-go pricing based on tokens processed
// - No commitment tier (consider PTU for predictable workloads)
//
// Network Configuration:
// - Public network access enabled
// - Consider private endpoints for production
//
// See: rbac/backend-uami-rbac.bicep (additional AI roles if needed)
// See: docs/rfc/2001-domain-driven-design-architecture.md (Invoice AI)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Azure OpenAI Service with managed identity authentication'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

@description('The location for the OpenAI service.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param openAiLocation string

@description('The date when the deployment is executed.')
param openAiDeploymentDate string

@description('The prefix to use for the names of the resources.')
param openAiConventionPrefix string

@description('The backend managed identity principal id to which we will grant access to the AI services.')
param backendManagedIdentityPrincipalId string

import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: openAiDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'ai'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

resource openAi 'Microsoft.CognitiveServices/accounts@2025-04-01-preview' = {
  name: '${openAiConventionPrefix}-openai'
  location: openAiLocation
  sku: { name: 'S0' }
  kind: 'OpenAI'
  properties: {
    customSubDomainName: '${openAiConventionPrefix}-openai'
    publicNetworkAccess: 'Enabled'
  }
  tags: union(commonTags, {
    sku: 'Free Tier'
  })
}

resource openAiRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(openAi.id, backendManagedIdentityPrincipalId, 'Cognitive Services User')
  scope: openAi
  properties: {
    roleDefinitionId: resourceId('Microsoft.Authorization/roleDefinitions', 'a97b65f3-24c7-4388-baec-2e87135dc908')
    principalId: backendManagedIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

output openAiId string = openAi.id
output openAiEndpoint string = openAi.properties.endpoint
output resource object = openAi
