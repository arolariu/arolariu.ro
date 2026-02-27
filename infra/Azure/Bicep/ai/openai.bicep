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
// - model-router (GlobalStandard, capacity 100) — intelligent model routing
//
// Authentication:
// - Backend UAMI receives "Cognitive Services User" role via rbac/backend-uami-rbac.bicep
// - No API keys are used; all access via managed identity
// - RBAC assignments are centralized in the rbac/ module for consistency
//
// SKU: S0 (Standard)
// - Pay-as-you-go pricing based on tokens processed
// - No commitment tier (consider PTU for predictable workloads)
//
// Network Configuration:
// - Public network access enabled
// - Consider private endpoints for production
//
// See: rbac/backend-uami-rbac.bicep (OpenAI Contributor + User roles)
// See: docs/rfc/2001-domain-driven-design-architecture.md (Invoice AI)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Azure OpenAI Service with managed identity authentication'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

@description('The location for the OpenAI service.')
@allowed(['westeurope', 'swedencentral', 'norwayeast', 'northeurope'])
param openAiLocation string

@description('The date when the deployment is executed.')
param openAiDeploymentDate string

@description('The prefix to use for the names of the resources.')
param openAiConventionPrefix string

import { createTags } from '../constants/tags.bicep'
var commonTags = createTags('ai', openAiDeploymentDate)

resource openAi 'Microsoft.CognitiveServices/accounts@2025-10-01-preview' = {
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

// -------------------------------------------------------------------------------------
// Model Deployments
// -------------------------------------------------------------------------------------

resource modelRouter 'Microsoft.CognitiveServices/accounts/deployments@2025-06-01' = {
  parent: openAi
  name: 'model-router'
  sku: {
    name: 'GlobalStandard'
    capacity: 50
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'model-router'
      version: '2025-11-18'
    }
    versionUpgradeOption: 'OnceNewDefaultVersionAvailable'
    raiPolicyName: 'Microsoft.DefaultV2'
  }
}

output openAiId string = openAi.id
output openAiEndpoint string = openAi.properties.endpoint
output openAiName string = openAi.name
