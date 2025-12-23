// =====================================================================================
// Azure AI Foundry - Unified AI Development Platform
// =====================================================================================
// This module provisions an Azure AI Foundry instance (formerly Azure AI Services)
// that provides a unified platform for AI development. AI Foundry includes:
// - Pre-built AI APIs (Vision, Speech, Language, Decision)
// - Project management for organizing AI workloads
// - Integrated model catalog and deployment
// - Prompt flow for building AI applications
//
// AI Project:
// - Default project: arolariu.ro
// - Projects organize resources and permissions
// - Each project can have its own model deployments and endpoints
//
// Identity Model:
// - System-assigned managed identity enabled
// - Identity is used for accessing dependent Azure resources
// - No user-assigned identity (different pattern from App Services)
//
// Available APIs (via AIServices kind):
// - Computer Vision (image analysis)
// - Form Recognizer (document understanding)
// - Language Understanding (NLU)
// - Speech Services (TTS/STT)
// - Custom models via AI Foundry portal
//
// SKU: S0 (Standard)
// - Multi-service cognitive resource
// - Pay-per-transaction pricing
//
// Network Configuration:
// - Public network access enabled
// - Default action: Allow
//
// See: ai/openai.bicep (dedicated OpenAI for GPT models)
// =====================================================================================

targetScope = 'resourceGroup'

metadata description = 'Azure AI Foundry (AIServices) with project management'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

@description('The location for the AI Foundry instance.')
@allowed(['swedencentral', 'norwayeast', 'westeurope', 'northeurope'])
param aiFoundryLocation string

@description('The date when the deployment is executed.')
param aiFoundryDeploymentDate string

@description('The name of the AI Foundry instance.')
param aiFoundryName string

import { resourceTags } from '../types/common.type.bicep'
var commonTags resourceTags = {
  environment: 'PRODUCTION'
  deploymentType: 'Bicep'
  deploymentDate: aiFoundryDeploymentDate
  deploymentAuthor: 'Alexandru-Razvan Olariu'
  module: 'ai'
  costCenter: 'infrastructure'
  project: 'arolariu.ro'
  version: '2.0.0'
}

resource aiFoundry 'Microsoft.CognitiveServices/accounts@2025-06-01' = {
  name: aiFoundryName
  location: aiFoundryLocation
  identity: { type: 'SystemAssigned' }
  sku: { name: 'S0' }
  kind: 'AIServices'
  properties: {
    apiProperties: {}
    customSubDomainName: aiFoundryName
    networkAcls: {
      defaultAction: 'Allow'
      virtualNetworkRules: []
      ipRules: []
    }
    allowProjectManagement: true
    publicNetworkAccess: 'Enabled'
    defaultProject: 'arolariu.ro'
    associatedProjects: ['arolariu.ro']
  }
  tags: union(commonTags, {
    sku: 'Standard'
  })

  resource aiProject 'projects@2025-06-01' = {
    name: 'arolariu.ro'
    location: aiFoundryLocation
    identity: { type: 'SystemAssigned' }
    properties: {
      description: 'AI project for arolariu.ro'
      displayName: 'arolariu.ro AI Project'
    }
  }
}

// Output the AI Foundry instance details
output aiFoundryId string = aiFoundry.id
output aiFoundryEndpoint string = aiFoundry.properties.endpoint
output aiProjectId string = aiFoundry::aiProject.id
